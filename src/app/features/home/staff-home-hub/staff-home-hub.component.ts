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

type ReservationStatusUi = 'confirmed' | 'pending' | 'finished';

interface RecentReservation {
  id: string;
  title: string;
  requester: string;
  date: string;
  status: ReservationStatusUi;
}

interface StatMini {
  label: string;
  value: number;
  tone: 'amber' | 'emerald' | 'sky' | 'violet';
}

@Component({
  selector: 'app-staff-home-hub',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './staff-home-hub.component.html',
  styleUrl: './staff-home-hub.component.scss',
})
export class StaffHomeHubComponent implements OnInit {
  private readonly adminStats = inject(AdminStatsService);
  private readonly adminReservations = inject(AdminReservationsService);
  private readonly adminExports = inject(AdminExportsService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly exportMessage = signal<string | null>(null);

  readonly statMinis = signal<StatMini[]>([]);
  readonly recentReservations = signal<RecentReservation[]>([]);

  readonly welcomeLine = computed(() => {
    const u = this.auth.currentUser();
    const name = `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim();
    return name || u?.email || 'équipe';
  });

  readonly showSuperadminTile = computed(() => this.auth.hasRole('SUPERADMIN'));

  readonly canStaffExports = computed(() => this.auth.canAccessFullAdminSpa());

  readonly exportDateFrom = signal(this.formatIsoDateDaysAgo(30));
  readonly exportDateTo = signal(this.formatIsoDate(new Date()));

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
            this.loadError.set('Indicateurs temporairement indisponibles.');
            this.statMinis.set([]);
            return;
          }

          const today = stats.todayReservations ?? 0;
          const pendingDep = stats.pendingDeposits ?? 0;
          const pendingDoc = stats.pendingDocuments ?? 0;
          const tutored = stats.tutoredAccounts ?? 0;

          this.statMinis.set([
            { label: 'Résas aujourd’hui', value: today, tone: 'amber' },
            { label: 'Cautions en attente', value: pendingDep, tone: 'emerald' },
            { label: 'Documents à traiter', value: pendingDoc, tone: 'sky' },
            { label: 'Comptes sous tutelle', value: tutored, tone: 'violet' },
          ]);
        },
        error: () => this.loadError.set('Chargement impossible.'),
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
          this.triggerDownload(`reservations-${from}_${to}.csv`, this.csvResponseBodyToBlob(body));
        },
        error: () => this.exportMessage.set('Export réservations indisponible.'),
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
          this.triggerDownload(`paiements-${from}_${to}.csv`, this.csvResponseBodyToBlob(body));
        },
        error: () => this.exportMessage.set('Export paiements indisponible.'),
      });
  }

  statusLabel(status: ReservationStatusUi): string {
    switch (status) {
      case 'confirmed':
        return 'Confirmée';
      case 'pending':
        return 'En attente';
      case 'finished':
      default:
        return 'Terminée';
    }
  }

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
