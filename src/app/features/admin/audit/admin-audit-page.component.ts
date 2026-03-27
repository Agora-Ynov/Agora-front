import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

type AuditCategory =
  | 'all'
  | 'reservations'
  | 'accounts'
  | 'payments'
  | 'impersonation'
  | 'affiliations';
type AuditSeverity = 'warning' | 'info' | 'orange' | 'blue' | 'green' | 'violet';

interface AuditEntryDto {
  id: string;
  category: Exclude<AuditCategory, 'all'>;
  severity: AuditSeverity;
  label: string;
  actorRole: string;
  title: string;
  performedAt: string;
  actorName: string;
  targetName: string | null;
  bookingRef: string | null;
  resourceName: string | null;
  ipAddress: string;
}

interface AuditResponse {
  content: AuditEntryDto[];
}

interface AdminUserDto {
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VALIDATION';
}

interface AdminUsersResponse {
  content: AdminUserDto[];
}

@Component({
  selector: 'app-admin-audit-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-audit-page.component.html',
  styleUrl: './admin-audit-page.component.scss',
})
export class AdminAuditPageComponent {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  readonly loading = signal(true);
  readonly entries = signal<AuditEntryDto[]>([]);
  readonly suspendedUsers = signal(0);
  readonly searchTerm = signal('');
  readonly actorFilter = signal('Tous les acteurs');
  readonly categoryFilter = signal<AuditCategory>('all');

  readonly actorOptions = computed(() => [
    'Tous les acteurs',
    ...new Set(this.entries().map(entry => entry.actorRole)),
  ]);

  readonly tabs = computed(() => [
    { id: 'all' as AuditCategory, label: 'Tous', count: this.entries().length },
    {
      id: 'reservations' as AuditCategory,
      label: 'Reservations',
      count: this.entries().filter(entry => entry.category === 'reservations').length,
    },
    {
      id: 'accounts' as AuditCategory,
      label: 'Comptes',
      count: this.entries().filter(entry => entry.category === 'accounts').length,
    },
    {
      id: 'payments' as AuditCategory,
      label: 'Paiements',
      count: this.entries().filter(entry => entry.category === 'payments').length,
    },
    {
      id: 'impersonation' as AuditCategory,
      label: 'Impersonation',
      count: this.entries().filter(entry => entry.category === 'impersonation').length,
    },
    {
      id: 'affiliations' as AuditCategory,
      label: 'Affiliations',
      count: this.entries().filter(entry => entry.category === 'affiliations').length,
    },
  ]);

  readonly stats = computed(() => [
    {
      label: 'Total logs',
      value: this.entries().length,
      tone: 'default',
    },
    {
      label: 'Validations',
      value: this.entries().filter(entry => ['info', 'green', 'blue'].includes(entry.severity)).length,
      tone: 'green',
    },
    {
      label: 'Refus',
      value: this.entries().filter(entry => ['warning', 'orange'].includes(entry.severity)).length,
      tone: 'red',
    },
    {
      label: 'Impersonations',
      value: this.entries().filter(entry => entry.category === 'impersonation').length,
      tone: 'orange',
    },
    {
      label: 'Suspensions',
      value: this.suspendedUsers(),
      tone: 'red',
    },
  ]);

  readonly bookingRefs = computed(() => [
    ...new Set(this.entries().map(entry => entry.bookingRef).filter((entry): entry is string => !!entry)),
  ]);

  readonly filteredEntries = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const actor = this.actorFilter();
    const category = this.categoryFilter();

    return this.entries().filter(entry => {
      if (category !== 'all' && entry.category !== category) {
        return false;
      }

      if (actor !== 'Tous les acteurs' && entry.actorRole !== actor) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = [
        entry.label,
        entry.title,
        entry.actorName,
        entry.targetName ?? '',
        entry.bookingRef ?? '',
        entry.resourceName ?? '',
        entry.ipAddress,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  });

  constructor() {
    forkJoin({
      audit: this.http.get<AuditResponse>('/assets/mocks/api/admin.audit.get.json'),
      users: this.http.get<AdminUsersResponse>('/assets/mocks/api/admin.users.get.json'),
    })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ({ audit, users }) => {
          this.entries.set(audit.content);
          this.suspendedUsers.set(users.content.filter(user => user.status === 'SUSPENDED').length);
          this.loading.set(false);
        },
        error: () => {
          this.entries.set([]);
          this.suspendedUsers.set(0);
          this.loading.set(false);
        },
      });
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  setActorFilter(value: string): void {
    this.actorFilter.set(value);
  }

  setCategoryFilter(value: AuditCategory): void {
    this.categoryFilter.set(value);
  }

  exportCsv(): void {
    const rows = this.filteredEntries().map(entry => ({
      id: entry.id,
      categorie: entry.category,
      gravite: entry.severity,
      libelle: entry.label,
      role_acteur: entry.actorRole,
      action: entry.title,
      date_action: this.formatDate(entry.performedAt),
      acteur: entry.actorName,
      cible: entry.targetName ?? '',
      reservation: entry.bookingRef ?? '',
      ressource: entry.resourceName ?? '',
      ip_source: entry.ipAddress,
    }));

    const header = Object.keys(rows[0] ?? {
      id: '',
      categorie: '',
      gravite: '',
      libelle: '',
      role_acteur: '',
      action: '',
      date_action: '',
      acteur: '',
      cible: '',
      reservation: '',
      ressource: '',
      ip_source: '',
    });

    const csv = [
      header.join(';'),
      ...rows.map(row =>
        header
          .map(key => this.escapeCsvValue(String(row[key as keyof typeof row] ?? '')))
          .join(';'),
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = globalThis.URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `journal-audit-${date}.csv`;
    this.document.body.appendChild(link);
    link.click();
    link.remove();
    globalThis.URL.revokeObjectURL(url);
  }

  focusBooking(ref: string): void {
    this.searchTerm.set(ref);
  }

  cardClass(severity: AuditSeverity): string {
    return `audit-card--${severity}`;
  }

  iconClass(severity: AuditSeverity): string {
    return `audit-node--${severity}`;
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(value));
  }

  formatBookingRef(value: string): string {
    return value.replace(/^booking-/i, 'booking-');
  }

  private escapeCsvValue(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
  }

  categoryIcon(category: AuditCategory): 'shield' | 'calendar' | 'user' | 'card' | 'group' {
    switch (category) {
      case 'reservations':
        return 'calendar';
      case 'accounts':
        return 'user';
      case 'payments':
        return 'card';
      case 'affiliations':
        return 'group';
      case 'impersonation':
      case 'all':
      default:
        return 'shield';
    }
  }
}
