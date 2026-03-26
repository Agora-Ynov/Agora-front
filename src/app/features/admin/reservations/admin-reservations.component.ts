import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';

type AdminReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
type AdminPaymentStatus =
  | 'PAID'
  | 'TO_SETTLE'
  | 'EXEMPT_GROUP'
  | 'EXEMPT_SECRETARY'
  | 'REFUNDED';
type ReservationFilter = 'ALL' | AdminReservationStatus;

interface AdminReservation {
  id: string;
  resourceName: string;
  userName: string;
  userEmail: string | null;
  date: string;
  status: AdminReservationStatus;
  paymentStatus: AdminPaymentStatus;
  amountEuros: number;
  depositEuros: number;
}

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-reservations.component.html',
  styleUrl: './admin-reservations.component.scss',
})
export class AdminReservationsComponent {
  readonly filter = signal<ReservationFilter>('ALL');
  readonly feedbackMessage = signal<string>('');

  readonly reservations = signal<AdminReservation[]>([
    {
      id: 'booking-1',
      resourceName: 'Salle des Fetes',
      userName: 'Sophie Bernard',
      userEmail: 'user@example.fr',
      date: '15/04/2026',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      amountEuros: 350,
      depositEuros: 200,
    },
    {
      id: 'booking-2',
      resourceName: 'Salle de Reunion',
      userName: 'Pierre Durand',
      userEmail: 'pierre.durand@email.fr',
      date: '30/03/2026',
      status: 'PENDING',
      paymentStatus: 'TO_SETTLE',
      amountEuros: 80,
      depositEuros: 50,
    },
    {
      id: 'booking-3',
      resourceName: 'Barnums (x5)',
      userName: 'Marie Laurent',
      userEmail: 'marie.l@email.fr',
      date: '01/05/2026',
      status: 'CONFIRMED',
      paymentStatus: 'EXEMPT_GROUP',
      amountEuros: 0,
      depositEuros: 0,
    },
    {
      id: 'booking-4',
      resourceName: 'Salle Associative',
      userName: 'Robert Petit',
      userEmail: null,
      date: '20/04/2026',
      status: 'PENDING',
      paymentStatus: 'EXEMPT_SECRETARY',
      amountEuros: 45,
      depositEuros: 0,
    },
    {
      id: 'booking-5',
      resourceName: 'Sono portable',
      userName: 'Thomas Girard',
      userEmail: 'thomas.girard@email.fr',
      date: '08/04/2026',
      status: 'CANCELLED',
      paymentStatus: 'REFUNDED',
      amountEuros: 90,
      depositEuros: 50,
    },
  ]);

  readonly filteredReservations = computed(() => {
    const currentFilter = this.filter();

    return this.reservations().filter(reservation => {
      return currentFilter === 'ALL' || reservation.status === currentFilter;
    });
  });

  readonly stats = computed(() => {
    const reservations = this.reservations();

    return {
      pending: reservations.filter(reservation => reservation.status === 'PENDING').length,
      confirmed: reservations.filter(reservation => reservation.status === 'CONFIRMED').length,
      paymentsPending: reservations.filter(reservation => reservation.paymentStatus === 'TO_SETTLE')
        .length,
      exemptions: reservations.filter(reservation =>
        ['EXEMPT_GROUP', 'EXEMPT_SECRETARY'].includes(reservation.paymentStatus)
      ).length,
    };
  });

  readonly tabs = computed(() => [
    { id: 'ALL' as ReservationFilter, label: 'Toutes', count: this.reservations().length },
    { id: 'PENDING' as ReservationFilter, label: 'En attente', count: this.stats().pending },
    { id: 'CONFIRMED' as ReservationFilter, label: 'Confirmees', count: this.stats().confirmed },
    {
      id: 'CANCELLED' as ReservationFilter,
      label: 'Annulees',
      count: this.reservations().filter(reservation => reservation.status === 'CANCELLED').length,
    },
    {
      id: 'COMPLETED' as ReservationFilter,
      label: 'Terminees',
      count: this.reservations().filter(reservation => reservation.status === 'COMPLETED').length,
    },
  ]);

  setFilter(filter: ReservationFilter): void {
    this.filter.set(filter);
  }

  viewReservation(reservation: AdminReservation): void {
    this.feedbackMessage.set(`Reservation ${reservation.id} prete a afficher.`);
  }

  confirmReservation(reservationId: string): void {
    this.updateReservation(reservationId, { status: 'CONFIRMED' });
    this.feedbackMessage.set('Reservation confirmee avec succes.');
  }

  rejectReservation(reservationId: string): void {
    this.updateReservation(reservationId, { status: 'CANCELLED', paymentStatus: 'REFUNDED' });
    this.feedbackMessage.set('Reservation refusee avec succes.');
  }

  paymentLabel(paymentStatus: AdminPaymentStatus): string {
    switch (paymentStatus) {
      case 'PAID':
        return 'Reglee';
      case 'TO_SETTLE':
        return 'A regler';
      case 'EXEMPT_GROUP':
        return 'Dispensee (exo.)';
      case 'EXEMPT_SECRETARY':
        return 'Dispensee (secretaire)';
      case 'REFUNDED':
      default:
        return 'Remboursee';
    }
  }

  statusLabel(status: AdminReservationStatus): string {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmee';
      case 'PENDING':
        return 'En attente';
      case 'COMPLETED':
        return 'Terminee';
      case 'CANCELLED':
      default:
        return 'Annulee';
    }
  }

  trackByReservationId(_index: number, reservation: AdminReservation): string {
    return reservation.id;
  }

  private updateReservation(
    reservationId: string,
    changes: Partial<Pick<AdminReservation, 'status' | 'paymentStatus'>>
  ): void {
    this.reservations.update(reservations =>
      reservations.map(reservation =>
        reservation.id === reservationId ? { ...reservation, ...changes } : reservation
      )
    );
  }
}
