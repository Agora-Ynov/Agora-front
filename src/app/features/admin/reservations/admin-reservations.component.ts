import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import {
  AdminPaymentsService,
  AdminReservationsService,
  AdminPatchPaymentRequestDto,
  AdminPatchReservationStatusRequestDto,
  ReservationSummaryResponseDto,
  AdminPaymentHistoryEntryResponseDto,
} from '../../../core/api';
import { PagedResponseReservationSummaryResponseDto } from '../../../core/api/model/pagedResponseReservationSummaryResponseDto';
import { ApiService } from '../../../core/api/api.service';

type ReservationStatus = ReservationSummaryResponseDto.StatusEnum;
type DepositStatus = ReservationSummaryResponseDto.DepositStatusEnum;

/** Filtre d'affichage : on regroupe les deux statuts « en attente » côté UI. */
type ReservationFilter = 'ALL' | 'PENDING_GROUP' | ReservationStatus;

interface AdminPaymentAuditRow {
  label: string;
  meta: string;
}

interface AdminReservationRow {
  id: string;
  resourceName: string;
  userName: string;
  userEmail: string | null;
  userPhone: string | null;
  dateLabel: string;
  startDateTimeLabel: string;
  endDateTimeLabel: string;
  status: ReservationStatus;
  depositStatus: DepositStatus;
  amountEuros: number;
  depositEuros: number;
  userComment: string;
  adminComment: string;
  createdAtLabel: string;
  discountLabel: string | null;
}

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reservations.component.html',
  styleUrl: './admin-reservations.component.scss',
})
export class AdminReservationsComponent implements OnInit {
  private readonly adminReservations = inject(AdminReservationsService);
  private readonly adminPayments = inject(AdminPaymentsService);
  private readonly api = inject(ApiService);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly filter = signal<ReservationFilter>('ALL');
  readonly feedbackMessage = signal<string>('');
  readonly selectedReservationId = signal<string | null>(null);
  readonly rejectingReservationId = signal<string | null>(null);
  readonly auditExpanded = signal(false);
  readonly paymentDraft = signal<AdminPatchPaymentRequestDto.StatusEnum>(
    AdminPatchPaymentRequestDto.StatusEnum.DepositPaid
  );
  readonly adminCommentDraft = signal('');
  readonly rejectReason = signal('');
  readonly paymentHistoryEntries = signal<AdminPaymentAuditRow[]>([]);
  readonly paymentHistoryLoaded = signal(false);

  readonly reservations = signal<AdminReservationRow[]>([]);
  readonly resPage = signal(0);
  readonly resPageSize = signal(25);
  readonly resTotalPages = signal(0);
  readonly resTotalElements = signal(0);
  readonly resPageSizeOptions = [10, 25, 50, 100] as const;

  readonly filteredReservations = computed(() => {
    const currentFilter = this.filter();
    return this.reservations().filter(r => {
      if (currentFilter === 'ALL') return true;
      if (currentFilter === 'PENDING_GROUP') {
        return (
          r.status === ReservationSummaryResponseDto.StatusEnum.PendingValidation ||
          r.status === ReservationSummaryResponseDto.StatusEnum.PendingDocument
        );
      }
      return r.status === currentFilter;
    });
  });

  readonly stats = computed(() => {
    const list = this.reservations();
    const pending = list.filter(
      r =>
        r.status === ReservationSummaryResponseDto.StatusEnum.PendingValidation ||
        r.status === ReservationSummaryResponseDto.StatusEnum.PendingDocument
    ).length;
    const confirmed = list.filter(
      r => r.status === ReservationSummaryResponseDto.StatusEnum.Confirmed
    ).length;
    const paymentsPending = list.filter(
      r => r.depositStatus === ReservationSummaryResponseDto.DepositStatusEnum.DepositPending
    ).length;
    const exemptions = list.filter(
      r =>
        r.depositStatus === ReservationSummaryResponseDto.DepositStatusEnum.Exempt ||
        r.depositStatus === ReservationSummaryResponseDto.DepositStatusEnum.Waived
    ).length;
    return { pending, confirmed, paymentsPending, exemptions };
  });

  readonly tabs = computed(() => {
    const list = this.reservations();
    const pendingGroup = list.filter(
      r =>
        r.status === ReservationSummaryResponseDto.StatusEnum.PendingValidation ||
        r.status === ReservationSummaryResponseDto.StatusEnum.PendingDocument
    ).length;
    return [
      { id: 'ALL' as ReservationFilter, label: 'Toutes', count: list.length },
      { id: 'PENDING_GROUP' as ReservationFilter, label: 'En attente', count: pendingGroup },
      {
        id: ReservationSummaryResponseDto.StatusEnum.Confirmed,
        label: 'Confirmees',
        count: list.filter(r => r.status === ReservationSummaryResponseDto.StatusEnum.Confirmed)
          .length,
      },
      {
        id: ReservationSummaryResponseDto.StatusEnum.Cancelled,
        label: 'Annulees',
        count: list.filter(r => r.status === ReservationSummaryResponseDto.StatusEnum.Cancelled)
          .length,
      },
      {
        id: ReservationSummaryResponseDto.StatusEnum.Rejected,
        label: 'Refusees',
        count: list.filter(r => r.status === ReservationSummaryResponseDto.StatusEnum.Rejected)
          .length,
      },
    ];
  });

  readonly selectedReservation = computed(() => {
    const id = this.selectedReservationId();
    return this.reservations().find(r => r.id === id) ?? null;
  });

  readonly rejectingReservation = computed(() => {
    const id = this.rejectingReservationId();
    return this.reservations().find(r => r.id === id) ?? null;
  });

  ngOnInit(): void {
    this.reloadList();
  }

  setFilter(f: ReservationFilter): void {
    this.filter.set(f);
  }

  reloadList(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api
      .getJson<PagedResponseReservationSummaryResponseDto>('/api/admin/reservations', {
        page: this.resPage(),
        size: this.resPageSize(),
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        catchError(() => {
          this.loadError.set('Impossible de charger les reservations.');
          return of({ content: [] } as PagedResponseReservationSummaryResponseDto);
        })
      )
      .subscribe(page => {
        const rows = (page.content ?? []).map(d => this.mapDto(d));
        this.reservations.set(rows);
        const tp = page.totalPages ?? 0;
        const te = page.totalElements ?? 0;
        this.resTotalPages.set(tp > 0 ? tp : te > 0 ? 1 : 0);
        this.resTotalElements.set(te);
        if (tp > 0 && this.resPage() >= tp) {
          this.resPage.set(tp - 1);
          this.reloadList();
        }
      });
  }

  goResPage(p: number): void {
    const max = Math.max(0, (this.resTotalPages() || 1) - 1);
    const page = Math.min(Math.max(0, p), max);
    if (page === this.resPage()) return;
    this.resPage.set(page);
    this.reloadList();
  }

  prevResPage(): void {
    this.goResPage(this.resPage() - 1);
  }

  nextResPage(): void {
    this.goResPage(this.resPage() + 1);
  }

  setResPageSize(size: number): void {
    const s = Math.min(100, Math.max(5, size));
    if (s === this.resPageSize()) return;
    this.resPageSize.set(s);
    this.resPage.set(0);
    this.reloadList();
  }

  openReservationDetails(row: AdminReservationRow): void {
    this.selectedReservationId.set(row.id);
    this.auditExpanded.set(false);
    this.paymentDraft.set(this.depositToPaymentPatchEnum(row.depositStatus));
    this.adminCommentDraft.set('');
    this.paymentHistoryLoaded.set(false);
    this.paymentHistoryEntries.set([]);
    this.adminPayments
      .history(row.id, undefined, false, { transferCache: false })
      .pipe(
        catchError(() => of([] as AdminPaymentHistoryEntryResponseDto[])),
        finalize(() => this.paymentHistoryLoaded.set(true))
      )
      .subscribe(entries => {
        this.paymentHistoryEntries.set(entries.map(e => this.mapHistoryEntry(e)));
      });
  }

  closeReservationDetails(): void {
    this.selectedReservationId.set(null);
    this.auditExpanded.set(false);
  }

  openRejectModal(row: AdminReservationRow): void {
    this.rejectingReservationId.set(row.id);
    this.rejectReason.set('');
  }

  closeRejectModal(): void {
    this.rejectingReservationId.set(null);
    this.rejectReason.set('');
  }

  canConfirm(row: AdminReservationRow): boolean {
    return (
      row.status === ReservationSummaryResponseDto.StatusEnum.PendingValidation ||
      row.status === ReservationSummaryResponseDto.StatusEnum.PendingDocument
    );
  }

  confirmReservation(reservationId: string): void {
    const body: AdminPatchReservationStatusRequestDto = {
      status: AdminPatchReservationStatusRequestDto.StatusEnum.Confirmed,
    };
    this.adminReservations
      .patchStatus(reservationId, body, undefined, false, { transferCache: false })
      .subscribe({
        next: () => {
          this.feedbackMessage.set('Reservation confirmee.');
          this.reloadList();
        },
        error: () => this.feedbackMessage.set('Echec de la confirmation.'),
      });
  }

  saveReservationDetails(): void {
    const row = this.selectedReservation();
    if (!row) return;

    const paymentBody: AdminPatchPaymentRequestDto = {
      status: this.paymentDraft(),
      comment: this.adminCommentDraft().trim() || undefined,
    };

    this.adminPayments
      .patch(row.id, paymentBody, undefined, false, { transferCache: false })
      .subscribe({
        next: () => {
          this.feedbackMessage.set('Paiement / commentaire mis a jour.');
          this.closeReservationDetails();
          this.reloadList();
        },
        error: () => this.feedbackMessage.set('Echec de la mise a jour du paiement.'),
      });
  }

  saveAdminComment(): void {
    this.saveReservationDetails();
  }

  sendReminder(): void {
    this.feedbackMessage.set('Rappel : fonctionnalite non exposee par l’API pour l’instant.');
  }

  toggleAudit(): void {
    this.auditExpanded.update(v => !v);
  }

  rejectReservation(): void {
    const row = this.rejectingReservation();
    const reason = this.rejectReason().trim();
    if (!row || !reason) return;

    const body: AdminPatchReservationStatusRequestDto = {
      status: AdminPatchReservationStatusRequestDto.StatusEnum.Rejected,
      comment: reason,
    };
    this.adminReservations
      .patchStatus(row.id, body, undefined, false, { transferCache: false })
      .subscribe({
        next: () => {
          this.feedbackMessage.set('Reservation refusee.');
          this.closeRejectModal();
          this.reloadList();
        },
        error: () => this.feedbackMessage.set('Echec du refus.'),
      });
  }

  paymentDepositLabel(status: ReservationSummaryResponseDto.DepositStatusEnum): string {
    return this.paymentLabel(this.depositToPaymentPatchEnum(status));
  }

  paymentLabel(status: AdminPatchPaymentRequestDto.StatusEnum): string {
    switch (status) {
      case AdminPatchPaymentRequestDto.StatusEnum.DepositPaid:
        return 'Caution reglee';
      case AdminPatchPaymentRequestDto.StatusEnum.DepositPending:
        return 'Caution en attente';
      case AdminPatchPaymentRequestDto.StatusEnum.Exempt:
        return 'Exonere';
      case AdminPatchPaymentRequestDto.StatusEnum.Waived:
        return 'Dispense';
      case AdminPatchPaymentRequestDto.StatusEnum.Refunded:
      default:
        return 'Rembourse';
    }
  }

  statusLabel(status: ReservationStatus): string {
    switch (status) {
      case ReservationSummaryResponseDto.StatusEnum.Confirmed:
        return 'Confirmee';
      case ReservationSummaryResponseDto.StatusEnum.PendingValidation:
        return 'En validation';
      case ReservationSummaryResponseDto.StatusEnum.PendingDocument:
        return 'Document attendu';
      case ReservationSummaryResponseDto.StatusEnum.Cancelled:
        return 'Annulee';
      case ReservationSummaryResponseDto.StatusEnum.Rejected:
      default:
        return 'Refusee';
    }
  }

  statusRowPending(row: AdminReservationRow): boolean {
    return this.canConfirm(row);
  }

  paymentStatusOptions(): AdminPatchPaymentRequestDto.StatusEnum[] {
    return [
      AdminPatchPaymentRequestDto.StatusEnum.DepositPending,
      AdminPatchPaymentRequestDto.StatusEnum.DepositPaid,
      AdminPatchPaymentRequestDto.StatusEnum.Exempt,
      AdminPatchPaymentRequestDto.StatusEnum.Waived,
      AdminPatchPaymentRequestDto.StatusEnum.Refunded,
    ];
  }

  trackByReservationId(_index: number, row: AdminReservationRow): string {
    return row.id;
  }

  private mapDto(d: ReservationSummaryResponseDto): AdminReservationRow {
    const id = d.id ?? '';
    const dateRaw = d.date ?? '';
    const dateLabel = this.formatFrenchDate(dateRaw);
    const start = d.slotStart ? this.formatTime(d.slotStart) : '—';
    const end = d.slotEnd ? this.formatTime(d.slotEnd) : '—';
    const status = d.status ?? ReservationSummaryResponseDto.StatusEnum.PendingValidation;
    const depositStatus =
      d.depositStatus ?? ReservationSummaryResponseDto.DepositStatusEnum.DepositPending;
    const fullCents = d.depositAmountFullCents ?? 0;
    const depCents = d.depositAmountCents ?? 0;
    return {
      id,
      resourceName: d.resourceName ?? '—',
      userName: '—',
      userEmail: null,
      userPhone: null,
      dateLabel,
      startDateTimeLabel: `${dateLabel} a ${start}`,
      endDateTimeLabel: `${dateLabel} a ${end}`,
      status,
      depositStatus,
      amountEuros: Math.round(fullCents) / 100,
      depositEuros: Math.round(depCents) / 100,
      userComment: '',
      adminComment: '',
      createdAtLabel: d.createdAt ? this.formatCreatedAt(d.createdAt) : '',
      discountLabel: d.discountLabel ?? null,
    };
  }

  private formatTime(t: {
    hour?: number;
    minute?: number;
    second?: number;
    nano?: number;
  }): string {
    const h = t.hour ?? 0;
    const m = t.minute ?? 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private formatFrenchDate(isoDate: string): string {
    if (!isoDate) return '—';
    const d = new Date(isoDate + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return isoDate;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(d);
  }

  private formatCreatedAt(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return (
      'Cree le ' +
      new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d)
    );
  }

  /** Expose pour le template (alignement statut caution / statut PATCH paiement). */
  depositToPaymentPatchEnum(
    d: ReservationSummaryResponseDto.DepositStatusEnum
  ): AdminPatchPaymentRequestDto.StatusEnum {
    switch (d) {
      case ReservationSummaryResponseDto.DepositStatusEnum.DepositPaid:
        return AdminPatchPaymentRequestDto.StatusEnum.DepositPaid;
      case ReservationSummaryResponseDto.DepositStatusEnum.Exempt:
        return AdminPatchPaymentRequestDto.StatusEnum.Exempt;
      case ReservationSummaryResponseDto.DepositStatusEnum.Waived:
        return AdminPatchPaymentRequestDto.StatusEnum.Waived;
      case ReservationSummaryResponseDto.DepositStatusEnum.Refunded:
        return AdminPatchPaymentRequestDto.StatusEnum.Refunded;
      case ReservationSummaryResponseDto.DepositStatusEnum.DepositPending:
      default:
        return AdminPatchPaymentRequestDto.StatusEnum.DepositPending;
    }
  }

  private mapHistoryEntry(e: AdminPaymentHistoryEntryResponseDto): AdminPaymentAuditRow {
    const status = e.status ?? '';
    const when = e.updatedAt ? this.formatCreatedAt(e.updatedAt) : '';
    const by = e.updatedByName ?? '';
    return {
      label: `Paiement : ${status}`,
      meta: [by, when].filter(Boolean).join(' — '),
    };
  }
}
