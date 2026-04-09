import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import {
  AdminReservationsService,
  AdminStatsService,
  ReservationSummaryResponseDto,
} from '../../../core/api';

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

interface NewsColumn {
  items: string[];
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

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

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
    { label: 'Affiliations', icon: 'affiliations', badgeCount: 0, route: '/admin/affiliations' },
  ];

  readonly newsColumns: NewsColumn[] = [
    {
      items: [
        'API admin : reservations, paiements, statistiques, utilisateurs',
        'Activation comptes (lien e-mail) et promotion admin support (superadmin)',
        'Statuts reservation alignes (PENDING_VALIDATION, PENDING_DOCUMENT, etc.)',
      ],
    },
    {
      items: [
        'Dashboard : indicateurs issus de GET /api/admin/stats/dashboard',
        'Liste des reservations recentes : dernieres lignes admin',
      ],
    },
  ];

  ngOnInit(): void {
    this.loading.set(true);
    forkJoin({
      stats: this.adminStats.dashboard('body', false, { transferCache: false }).pipe(
        catchError(() => of(null))
      ),
      recent: this.adminReservations
        .list2(undefined, undefined, undefined, undefined, 0, 5, 'body', false, {
          transferCache: false,
        })
        .pipe(catchError(() => of({ content: [] }))),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ stats, recent }) => {
          if (!stats) {
            this.loadError.set('Statistiques indisponibles.');
          } else {
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
          }

          const rows = (recent.content ?? []).map(r => this.mapRecent(r));
          this.recentReservations.set(rows);
        },
        error: () => {
          this.loadError.set('Chargement du tableau de bord impossible.');
        },
      });
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
      requester: '—',
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
