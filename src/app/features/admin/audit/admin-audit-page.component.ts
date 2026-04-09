import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AdminUsersListResponse } from '../../../core/api';
import { ApiService } from '../../../core/api/api.service';

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
  /** Détails métiers (PJ, série, etc.) — pas d’IP réelle côté API pour l’instant. */
  detailsSummary: string | null;
}

/** Réponse API (cahier + back paginé). */
interface AdminAuditApiEntry {
  id: string;
  adminName: string;
  targetName: string | null;
  action: string;
  details: Record<string, unknown>;
  isImpersonation: boolean;
  performedAt: string;
}

interface AuditResponse {
  content: AdminAuditApiEntry[];
  totalElements?: number;
  totalPages?: number;
}

@Component({
  selector: 'app-admin-audit-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-audit-page.component.html',
  styleUrl: './admin-audit-page.component.scss',
})
export class AdminAuditPageComponent {
  private readonly api = inject(ApiService);
  private readonly loadAudit$ = new Subject<void>();

  readonly loading = signal(true);
  readonly entries = signal<AuditEntryDto[]>([]);
  readonly suspendedUsers = signal(0);
  readonly auditPage = signal(0);
  readonly auditPageSize = signal(25);
  readonly auditTotalPages = signal(0);
  readonly auditTotalElements = signal(0);
  readonly auditPageSizeOptions = [10, 25, 50, 100] as const;
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
      value: this.auditTotalElements(),
      tone: 'default',
    },
    {
      label: 'Validations (page)',
      value: this.entries().filter(entry => ['info', 'green', 'blue'].includes(entry.severity))
        .length,
      tone: 'green',
    },
    {
      label: 'Refus (page)',
      value: this.entries().filter(entry => ['warning', 'orange'].includes(entry.severity)).length,
      tone: 'red',
    },
    {
      label: 'Impersonations (page)',
      value: this.entries().filter(entry => entry.category === 'impersonation').length,
      tone: 'orange',
    },
    {
      label: 'Comptes suspendus',
      value: this.suspendedUsers(),
      tone: 'red',
    },
  ]);

  readonly bookingRefs = computed(() => [
    ...new Set(
      this.entries()
        .map(entry => entry.bookingRef)
        .filter((entry): entry is string => !!entry)
    ),
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
        entry.detailsSummary ?? '',
        entry.ipAddress,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  });

  constructor() {
    this.loadAudit$
      .pipe(
        switchMap(() =>
          forkJoin({
            audit: this.api
              .getJson<AuditResponse>('/api/admin/audit', {
                page: this.auditPage(),
                size: this.auditPageSize(),
              })
              .pipe(catchError(() => of<AuditResponse>({ content: [] }))),
            suspended: this.api
              .getJson<AdminUsersListResponse>('/api/admin/users', {
                page: 0,
                size: 1,
                status: 'SUSPENDED',
              })
              .pipe(catchError(() => of<AdminUsersListResponse>({}))),
          })
        ),
        takeUntilDestroyed()
      )
      .subscribe({
        next: ({ audit, suspended }) => {
          this.entries.set((audit.content ?? []).map(e => this.mapApiAuditEntry(e)));
          this.suspendedUsers.set(suspended.totalElements ?? 0);
          const tp = audit.totalPages ?? 0;
          const te = audit.totalElements ?? 0;
          this.auditTotalPages.set(tp > 0 ? tp : te > 0 ? 1 : 0);
          this.auditTotalElements.set(te);
          if (tp > 0 && this.auditPage() >= tp) {
            this.auditPage.set(tp - 1);
            this.loadAudit$.next();
            return;
          }
          this.loading.set(false);
        },
        error: () => {
          this.entries.set([]);
          this.suspendedUsers.set(0);
          this.auditTotalElements.set(0);
          this.auditTotalPages.set(0);
          this.loading.set(false);
        },
      });
    this.loading.set(true);
    this.loadAudit$.next();
  }

  private requestAuditLoad(): void {
    this.loading.set(true);
    this.loadAudit$.next();
  }

  goAuditPage(page: number): void {
    const max = Math.max(0, (this.auditTotalPages() || 1) - 1);
    const p = Math.min(Math.max(0, page), max);
    if (p === this.auditPage()) return;
    this.auditPage.set(p);
    this.requestAuditLoad();
  }

  prevAuditPage(): void {
    this.goAuditPage(this.auditPage() - 1);
  }

  nextAuditPage(): void {
    this.goAuditPage(this.auditPage() + 1);
  }

  setAuditPageSize(size: number): void {
    const s = Math.min(100, Math.max(5, size));
    if (s === this.auditPageSize()) return;
    this.auditPageSize.set(s);
    this.auditPage.set(0);
    this.requestAuditLoad();
  }

  private mapApiAuditEntry(e: AdminAuditApiEntry): AuditEntryDto {
    const action = e.action ?? '';
    let category: Exclude<AuditCategory, 'all'> = 'accounts';
    if (
      /RESERVATION|BOOKING|SLOT|DOCUMENT|PJ|RESOURCE_CREATED|RESOURCE_UPDATED|RESOURCE_DEACTIVATED/i.test(
        action
      )
    ) {
      category = 'reservations';
    } else if (/PAYMENT|DEPOSIT|CAUTION/i.test(action)) {
      category = 'payments';
    } else if (e.isImpersonation) {
      category = 'impersonation';
    } else if (/AFFILIATION|GROUP|MEMBER/i.test(action)) {
      category = 'affiliations';
    }

    const details = e.details ?? {};
    const resourceName =
      typeof details['resourceName'] === 'string' ? (details['resourceName'] as string) : null;
    const bookingRef =
      typeof details['bookingRef'] === 'string' ? (details['bookingRef'] as string) : null;
    const reservationId =
      typeof details['reservationId'] === 'string' ? (details['reservationId'] as string) : null;
    const ipRaw = details['ipAddress'];
    const ipAddress = typeof ipRaw === 'string' ? ipRaw : '—';

    const detailsSummary = this.buildDetailsSummary(details, reservationId);

    return {
      id: e.id,
      category,
      severity: e.isImpersonation ? 'orange' : 'info',
      label: action,
      actorRole: this.mapActorRole(action, e.isImpersonation),
      title: action,
      performedAt: e.performedAt,
      actorName: e.adminName ?? '—',
      targetName: e.targetName,
      bookingRef: bookingRef ?? reservationId,
      resourceName,
      ipAddress,
      detailsSummary,
    };
  }

  private mapActorRole(action: string, isImpersonation: boolean): string {
    if (isImpersonation) return 'Impersonation';
    if (/^(RESERVATION_STATUS_ADMIN|ADMIN_)/.test(action)) return 'Administrateur';
    if (/^RESOURCE_/.test(action)) return 'Administrateur';
    if (/^RESERVATION_(CREATED|SERIES_|DOCUMENT)/.test(action)) return 'Utilisateur';
    return 'Acteur';
  }

  private buildDetailsSummary(
    details: Record<string, unknown>,
    reservationId: string | null
  ): string | null {
    const parts: string[] = [];
    if (reservationId) parts.push(`réservation ${reservationId}`);
    const docId = details['reservationDocumentId'];
    if (typeof docId === 'string') parts.push(`document ${docId}`);
    const relay = details['relayChannel'];
    if (typeof relay === 'string') parts.push(`canal ${relay}`);
    const occ = details['occurrenceCount'];
    if (typeof occ === 'string' || typeof occ === 'number') parts.push(`${occ} occurrence(s)`);
    const freq = details['frequency'];
    if (typeof freq === 'string') parts.push(freq);
    if (parts.length === 0) return null;
    return parts.join(' · ');
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
