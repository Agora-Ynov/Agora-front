import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, finalize, map } from 'rxjs';

import { LocalTime } from '../../../core/api/model/localTime';
import { ReservationSummaryResponseDto } from '../../../core/api/model/reservationSummaryResponseDto';
import { AuthService } from '../../../core/auth/auth.service';
import { ReservationService } from '../reservation.service';

type ReservationDisplayStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED';
type ReservationPaymentStatus = 'PAID' | 'PENDING' | 'EXEMPT';
/** Statuts renvoyés par l’API (liste / détail). */
type ReservationApiStatus =
  | 'CONFIRMED'
  | 'PENDING_VALIDATION'
  | 'PENDING_DOCUMENT'
  | 'CANCELLED'
  | 'REJECTED';
type ReservationDepositStatus =
  | 'DEPOSIT_PAID'
  | 'DEPOSIT_PENDING'
  | 'DEPOSIT_EXEMPT'
  | 'EXEMPT'
  | 'REFUNDED'
  | 'WAIVED';

interface ReservationTimelineStep {
  label: string;
  date: string;
  completed: boolean;
}

interface ReservationCard {
  id: string;
  resourceName: string;
  status: ReservationDisplayStatus;
  reservationDate: string;
  startTime: string;
  endTime: string;
  amountEuros: number;
  depositEuros: number;
  paymentStatus: ReservationPaymentStatus;
  comment: string;
  createdAt: string;
  timeline: ReservationTimelineStep[];
}

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-reservations.component.html',
  styleUrl: './my-reservations.component.scss',
})
export class MyReservationsComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly reservationService = inject(ReservationService);

  readonly currentUser = this.authService.currentUser;
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly feedbackMessage = signal<string | null>(null);
  readonly reservations = signal<ReservationCard[]>([]);
  readonly expandedReservationId = signal<string | null>(null);
  readonly reservationIdToCancel = signal<string | null>(null);
  readonly cancellationInProgressId = signal<string | null>(null);

  readonly displayName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : 'Utilisateur';
  });

  constructor() {
    this.route.queryParamMap
      .pipe(
        map(q => q.toString()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.loadReservations());
  }

  trackByReservationId(_index: number, reservation: ReservationCard): string {
    return reservation.id;
  }

  reloadReservations(): void {
    this.loadReservations();
  }

  toggleTimeline(reservationId: string): void {
    this.expandedReservationId.update(current =>
      current === reservationId ? null : reservationId
    );
  }

  openCancelConfirmation(reservationId: string): void {
    if (
      this.cancellationInProgressId() ||
      this.getReservationStatus(reservationId) === 'CANCELLED'
    ) {
      return;
    }

    this.reservationIdToCancel.set(reservationId);
  }

  closeCancelConfirmation(): void {
    if (this.cancellationInProgressId()) {
      return;
    }

    this.reservationIdToCancel.set(null);
  }

  confirmCancellation(): void {
    const reservationId = this.reservationIdToCancel();
    if (!reservationId || this.cancellationInProgressId()) {
      return;
    }

    this.cancellationInProgressId.set(reservationId);
    this.feedbackMessage.set(null);

    this.reservationService
      .cancelReservation(reservationId)
      .pipe(
        finalize(() => {
          this.cancellationInProgressId.set(null);
        })
      )
      .subscribe({
        next: () => {
          this.reservations.update(reservations =>
            reservations.map(reservation =>
              reservation.id === reservationId
                ? {
                    ...reservation,
                    status: 'CANCELLED',
                    paymentStatus:
                      reservation.paymentStatus === 'PAID' ? reservation.paymentStatus : 'PENDING',
                    timeline: this.buildCancelledTimeline(reservation.timeline),
                  }
                : reservation
            )
          );
          this.feedbackMessage.set('La reservation a bien ete annulee.');
          this.reservationIdToCancel.set(null);
        },
        error: () => {
          this.feedbackMessage.set("Impossible d'annuler la reservation pour le moment.");
        },
      });
  }

  isExpanded(reservationId: string): boolean {
    return this.expandedReservationId() === reservationId;
  }

  isCancellationModalOpen(): boolean {
    return this.reservationIdToCancel() !== null;
  }

  isCancellationPending(reservationId: string): boolean {
    return this.cancellationInProgressId() === reservationId;
  }

  getReservationToCancel(): ReservationCard | null {
    const reservationId = this.reservationIdToCancel();
    return this.reservations().find(reservation => reservation.id === reservationId) ?? null;
  }

  formatReservationDate(date: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${date}T12:00:00`));
  }

  formatCreatedAt(date: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  reservationStatusLabel(status: ReservationDisplayStatus): string {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmee';
      case 'PENDING':
        return 'En attente';
      case 'CANCELLED':
      default:
        return 'Annulee';
    }
  }

  paymentStatusLabel(status: ReservationPaymentStatus): string {
    switch (status) {
      case 'PAID':
        return 'Reglee';
      case 'EXEMPT':
        return 'Exoneree';
      case 'PENDING':
      default:
        return 'A regler';
    }
  }

  private loadReservations(): void {
    const createdReservationId = this.route.snapshot.queryParamMap.get('created');
    const recurringCountRaw = this.route.snapshot.queryParamMap.get('recurringCount');
    const recurringCount = recurringCountRaw ? Number(recurringCountRaw) : 0;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.feedbackMessage.set(null);
    this.reservations.set([]);
    this.expandedReservationId.set(null);
    this.reservationIdToCancel.set(null);

    this.reservationService
      .listMyReservations(0, 50)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          const reservations = (response.content ?? []).map(item => this.mapReservation(item));
          this.reservations.set(reservations);
          const highlightId =
            createdReservationId && reservations.some(r => r.id === createdReservationId)
              ? createdReservationId
              : (reservations[0]?.id ?? null);
          this.expandedReservationId.set(highlightId);
          if (createdReservationId) {
            this.feedbackMessage.set(
              recurringCount > 1
                ? `Serie de ${recurringCount} reservations creee (meme horaire). La premiere occurrence est mise en avant ci-dessous.`
                : 'Reservation creee et confirmee. Elle apparait ci-dessous.'
            );
          }
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.message || 'Impossible de charger vos reservations pour le moment.'
          );
          this.loading.set(false);
        },
      });
  }

  private mapReservation(item: ReservationSummaryResponseDto): ReservationCard {
    const depositEuros = Math.round((item.depositAmountCents ?? 0) / 100);
    const amountEuros = Math.round(
      Math.max((item.depositAmountFullCents ?? 0) - (item.depositAmountCents ?? 0), 0) / 100
    );
    const status = (item.status ?? 'PENDING_VALIDATION') as ReservationApiStatus;

    return {
      id: item.id ?? '',
      resourceName: item.resourceName ?? '',
      status: this.toDisplayStatus(status),
      reservationDate: item.date ?? '',
      startTime: this.formatSlotTime(item.slotStart),
      endTime: this.formatSlotTime(item.slotEnd),
      amountEuros,
      depositEuros,
      paymentStatus: this.mapPaymentStatus(
        (item.depositStatus ?? 'DEPOSIT_PENDING') as ReservationDepositStatus,
        depositEuros
      ),
      comment: this.buildComment(item),
      createdAt: item.createdAt ?? '',
      timeline: this.buildTimeline(item),
    };
  }

  private toDisplayStatus(status: ReservationApiStatus): ReservationDisplayStatus {
    if (status === 'CANCELLED') {
      return 'CANCELLED';
    }
    if (status === 'CONFIRMED') {
      return 'CONFIRMED';
    }
    return 'PENDING';
  }

  private mapPaymentStatus(
    depositStatus: ReservationDepositStatus,
    depositEuros: number
  ): ReservationPaymentStatus {
    if (depositStatus === 'DEPOSIT_PAID') {
      return 'PAID';
    }

    if (depositStatus === 'DEPOSIT_EXEMPT' || depositStatus === 'EXEMPT' || depositEuros === 0) {
      return 'EXEMPT';
    }

    if (depositStatus === 'REFUNDED' || depositStatus === 'WAIVED') {
      return 'PENDING';
    }

    return 'PENDING';
  }

  private formatSlotTime(value: string | LocalTime | undefined): string {
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value === 'string') {
      return value.length >= 8 && value.includes(':') ? value.slice(0, 5) : value;
    }
    const h = value.hour ?? 0;
    const m = value.minute ?? 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private buildComment(item: ReservationSummaryResponseDto): string {
    if (item.discountLabel) {
      return `Tarification appliquee : ${item.discountLabel}`;
    }

    if (item.resourceType === ReservationSummaryResponseDto.ResourceTypeEnum.Immobilier) {
      return 'Reservation de salle en attente des prochaines etapes administratives.';
    }

    return 'Reservation de materiel en cours de traitement.';
  }

  private buildTimeline(item: ReservationSummaryResponseDto): ReservationTimelineStep[] {
    const createdAtLabel = this.formatCreatedAt(item.createdAt ?? '');
    const depositSt = item.depositStatus as ReservationDepositStatus | undefined;

    if (item.status === 'CONFIRMED') {
      return [
        { label: 'Demande envoyee', date: createdAtLabel, completed: true },
        { label: 'Validation administrative', date: 'Reservation confirmee', completed: true },
        {
          label: 'Paiement et caution',
          date:
            depositSt === 'DEPOSIT_PAID'
              ? 'Paiement enregistre'
              : depositSt === 'DEPOSIT_EXEMPT' || depositSt === 'EXEMPT'
                ? 'Aucun depot requis'
                : 'Depot a effectuer',
          completed: depositSt !== 'DEPOSIT_PENDING' && depositSt !== 'REFUNDED',
        },
      ];
    }

    if (item.status === 'CANCELLED') {
      return [
        { label: 'Demande envoyee', date: createdAtLabel, completed: true },
        { label: 'Annulation prise en compte', date: 'Reservation annulee', completed: true },
        { label: 'Cloture du dossier', date: 'Aucune action restante', completed: true },
      ];
    }

    return [
      { label: 'Demande envoyee', date: createdAtLabel, completed: true },
      { label: 'Instruction en cours', date: 'Analyse de la demande', completed: false },
      {
        label: 'Paiement et caution',
        date:
          depositSt === 'DEPOSIT_PENDING'
            ? 'En attente de validation du dossier'
            : 'Etapes a valider avec le secretariat (caution / reglement)',
        completed: false,
      },
    ];
  }

  private getReservationStatus(reservationId: string): ReservationDisplayStatus | null {
    return (
      this.reservations().find(reservation => reservation.id === reservationId)?.status ?? null
    );
  }

  private buildCancelledTimeline(timeline: ReservationTimelineStep[]): ReservationTimelineStep[] {
    const cancellationStep: ReservationTimelineStep = {
      label: 'Reservation annulee',
      date: new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
      completed: true,
    };

    return [...timeline.filter(step => step.label !== cancellationStep.label), cancellationStep];
  }
}
