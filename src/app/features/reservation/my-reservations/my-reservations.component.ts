import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

type ReservationDisplayStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED';
type ReservationPaymentStatus = 'PAID' | 'PENDING' | 'EXEMPT';

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
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly reservations = signal<ReservationCard[]>([
    {
      id: 'booking-1',
      resourceName: 'Salle des Fetes',
      status: 'CONFIRMED',
      reservationDate: '2026-04-15',
      startTime: '14:00',
      endTime: '23:00',
      amountEuros: 350,
      depositEuros: 200,
      paymentStatus: 'PAID',
      comment: "Gala annuel de l'association",
      createdAt: '2026-03-10T00:00:00',
      timeline: [
        { label: 'Demande envoyee', date: '10 mars 2026 a 01:00', completed: true },
        { label: 'Validation administrative', date: '11 mars 2026 a 09:20', completed: true },
        { label: 'Paiement enregistre', date: '12 mars 2026 a 14:05', completed: true },
      ],
    },
    {
      id: 'booking-2',
      resourceName: 'Barnums x5',
      status: 'PENDING',
      reservationDate: '2026-05-02',
      startTime: '08:30',
      endTime: '18:00',
      amountEuros: 120,
      depositEuros: 0,
      paymentStatus: 'PENDING',
      comment: 'Materiel pour la fete de quartier',
      createdAt: '2026-03-28T10:30:00',
      timeline: [
        { label: 'Demande envoyee', date: '28 mars 2026 a 11:30', completed: true },
        { label: 'Instruction en cours', date: 'En attente', completed: false },
        { label: 'Paiement a regler', date: 'Apres validation', completed: false },
      ],
    },
  ]);
  readonly expandedReservationId = signal<string | null>('booking-1');

  readonly displayName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : 'Utilisateur';
  });

  trackByReservationId(_index: number, reservation: ReservationCard): string {
    return reservation.id;
  }

  toggleTimeline(reservationId: string): void {
    this.expandedReservationId.update(current =>
      current === reservationId ? null : reservationId
    );
  }

  cancelReservation(reservationId: string): void {
    this.reservations.update(reservations =>
      reservations.map(reservation =>
        reservation.id === reservationId ? { ...reservation, status: 'CANCELLED' } : reservation
      )
    );
  }

  isExpanded(reservationId: string): boolean {
    return this.expandedReservationId() === reservationId;
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
}
