import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import {
  AdminExportsService,
  AdminReservationsService,
  AdminStatsService,
  ReservationSummaryResponseDto,
} from '../../../core/api';
import { AuthService } from '../../../core/auth/auth.service';

type AdminStatTone = 'warning' | 'success' | 'info' | 'violet';
type AdminStatIcon = 'clock' | 'check' | 'resource' | 'affiliation';
type AdminActionIcon =
  | 'users'
  | 'reservations'
  | 'my-reservations'
  | 'audit'
  | 'closures'
  | 'resources'
  | 'groups'
  | 'affiliations';

type ReservationStatusUi = 'confirmed' | 'pending' | 'finished';

interface AdminStatCard {
  label: string;
  value: number;
  tone: AdminStatTone;
  icon: AdminStatIcon;
}

interface AdminQuickAction {
  label: string;
  icon: AdminActionIcon;
  badgeCount?: number;
  route?: string;
}

interface RecentReservation {
  id: string;
  title: string;
  requester: string;
  date: string;
  status: ReservationStatusUi;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminStats = inject(AdminStatsService);
  private readonly adminReservations = inject(AdminReservationsService);
  private readonly adminExports = inject(AdminExportsService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly exportMessage = signal<string | null>(null);

  readonly statCards = signal<AdminStatCard[]>([]);
  readonly recentReservations = signal<RecentReservation[]>([]);

  readonly validationRate = signal(0);
  readonly appliedExemptions = signal(0);
  readonly pendingPayments = signal(0);
  readonly totalRevenueLabel = signal('—');

  readonly quickActions: AdminQuickAction[] = [
    { label: 'Mes reservations', icon: 'my-reservations', route: '/reservations' },
    { label: 'Utilisateurs', icon: 'users', route: '/admin/users' },
    { label: 'Reservations', icon: 'reservations', route: '/admin/reservations' },
    { label: "Journal d'audit", icon: 'audit', route: '/admin/audit' },
    { label: 'Fermetures', icon: 'closures', route: '/admin/blackouts' },
    { label: 'Ressources', icon: 'resources', route: '/admin/resources' },
    { label: 'Groupes', icon: 'groups', route: '/admin/groups' },
  ];

  readonly canStaffExports = computed(() => this.auth.canAccessFullAdminSpa());

  readonly exportDateFrom = signal(this.formatIsoDateDaysAgo(30));
  readonly exportDateTo = signal(this.formatIsoDate(new Date()));

  readonly dashboardDigest = signal<string[]>([]);

  ngOnInit(): void {
    this.loading.set(true);
    forkJoin({
      stats: this.adminStats
        .dashboard('body', false, { transferCache: false })
        .pipe(catchError(() => of(null))),
      recent: this.adminReservations
        .list2(undefined, undefined, undefined, undefined, 0, 5, 'body', false, {
          transferCache: false,
        })
        .pipe(catchError(() => of({ content: [] }))),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ stats, recent }) => {
          const rows = (recent.content ?? []).map(r => this.mapRecent(r));
          this.recentReservations.set(rows);

          if (!stats) {
            this.loadError.set('Statistiques indisponibles.');
            this.dashboardDigest.set([
              'Statistiques indisponibles — verifiez GET /api/admin/stats/dashboard.',
            ]);
            return;
          }

          const today = stats.todayReservations ?? 0;
          const pendingDep = stats.pendingDeposits ?? 0;
          const pendingDoc = stats.pendingDocuments ?? 0;
          const tutored = stats.tutoredAccounts ?? 0;

          this.statCards.set([
            {
              label: 'Reservations aujourd’hui',
              value: today,
              tone: 'warning',
              icon: 'clock',
            },
            {
              label: 'Cautions en attente',
              value: pendingDep,
              tone: 'success',
              icon: 'check',
            },
            {
              label: 'Dossiers / documents en attente',
              value: pendingDoc,
              tone: 'info',
              icon: 'resource',
            },
            {
              label: 'Comptes sous tutelle',
              value: tutored,
              tone: 'violet',
              icon: 'affiliation',
            },
          ]);

          const total = today + pendingDep + pendingDoc + 1;
          const validated = Math.min(100, Math.round((today / Math.max(total, 1)) * 100));
          this.validationRate.set(Number.isFinite(validated) ? validated : 0);
          this.appliedExemptions.set(0);
          this.pendingPayments.set(pendingDep);
          this.totalRevenueLabel.set('N/A');

          this.dashboardDigest.set([
            `Indicateurs (API) : ${today} reservation(s) aujourd'hui, ${pendingDep} caution(s) en attente, ${pendingDoc} dossier(s) documents, ${tutored} compte(s) sous tutelle.`,
            `Apercu reservations : ${rows.length} ligne(s) (extrait admin, max 5).`,
          ]);
        },
        error: () => {
          this.loadError.set('Chargement du tableau de bord impossible.');
        },
      });
  }

  setExportFrom(value: string): void {
    this.exportDateFrom.set(value);
  }

  setExportTo(value: string): void {
    this.exportDateTo.set(value);
  }

  downloadReservationsExport(): void {
    this.exportMessage.set(null);
    const from = this.exportDateFrom();
    const to = this.exportDateTo();
    this.adminExports
      .exportReservations(from, to, 'response', false, { transferCache: false })
      .subscribe({
        next: res => {
          const body = res.body as unknown;
          if (body == null) {
            this.exportMessage.set('Export vide.');
            return;
          }
          const blob = this.csvResponseBodyToBlob(body);
          this.triggerDownload(`reservations-${from}_${to}.csv`, blob);
        },
        error: () => this.exportMessage.set('Export reservations indisponible (droits ou plage).'),
      });
  }

  downloadPaymentsExport(): void {
    this.exportMessage.set(null);
    const from = this.exportDateFrom();
    const to = this.exportDateTo();
    this.adminExports
      .exportPayments(from, to, 'response', false, { transferCache: false })
      .subscribe({
        next: res => {
          const body = res.body as unknown;
          if (body == null) {
            this.exportMessage.set('Export vide.');
            return;
          }
          const blob = this.csvResponseBodyToBlob(body);
          this.triggerDownload(`paiements-${from}_${to}.csv`, blob);
        },
        error: () => this.exportMessage.set('Export paiements indisponible (droits ou plage).'),
      });
  }

  /** OpenAPI typote les exports CSV en Array<string> ; la reponse Http est texte ou blob selon le client. */
  private csvResponseBodyToBlob(body: unknown): Blob {
    if (body instanceof Blob) {
      return body;
    }
    if (typeof body === 'string') {
      return new Blob([body], { type: 'text/csv;charset=utf-8' });
    }
    return new Blob([], { type: 'text/csv;charset=utf-8' });
  }

  private triggerDownload(filename: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private formatIsoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private formatIsoDateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return this.formatIsoDate(d);
  }

  statusLabel(status: ReservationStatusUi): string {
    switch (status) {
      case 'confirmed':
        return 'Confirmee';
      case 'pending':
        return 'En attente';
      case 'finished':
      default:
        return 'Terminee';
    }
  }

  private mapRecent(d: ReservationSummaryResponseDto): RecentReservation {
    const st = d.status ?? ReservationSummaryResponseDto.StatusEnum.PendingValidation;
    let status: ReservationStatusUi = 'pending';
    if (st === ReservationSummaryResponseDto.StatusEnum.Confirmed) {
      status = 'confirmed';
    } else if (
      st === ReservationSummaryResponseDto.StatusEnum.Cancelled ||
      st === ReservationSummaryResponseDto.StatusEnum.Rejected
    ) {
      status = 'finished';
    }
    const dateRaw = d.date ?? '';
    const dateLabel = this.formatFrenchDate(dateRaw);
    return {
      id: d.id ?? '',
      title: d.resourceName ?? '—',
      requester: d.userName?.trim() ? d.userName : '—',
      date: dateLabel,
      status,
    };
  }

  private formatFrenchDate(isoDate: string): string {
    if (!isoDate) return '—';
    const d = new Date(isoDate + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return isoDate;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }
}
