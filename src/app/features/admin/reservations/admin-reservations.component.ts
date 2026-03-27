import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type AdminReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
type AdminPaymentStatus =
  | 'PAID'
  | 'TO_SETTLE'
  | 'EXEMPT_GROUP'
  | 'EXEMPT_SECRETARY'
  | 'REFUNDED';
type ReservationFilter = 'ALL' | AdminReservationStatus;

interface AuditEntry {
  label: string;
  meta: string;
}

interface AdminReservation {
  id: string;
  resourceName: string;
  userName: string;
  userEmail: string | null;
  userPhone: string | null;
  date: string;
  startDateTimeLabel: string;
  endDateTimeLabel: string;
  status: AdminReservationStatus;
  paymentStatus: AdminPaymentStatus;
  amountEuros: number;
  depositEuros: number;
  userComment: string;
  adminComment: string;
  createdAtLabel: string;
  auditTrail: AuditEntry[];
}

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reservations.component.html',
  styleUrl: './admin-reservations.component.scss',
})
export class AdminReservationsComponent {
  readonly filter = signal<ReservationFilter>('ALL');
  readonly feedbackMessage = signal<string>('');
  readonly selectedReservationId = signal<string | null>(null);
  readonly rejectingReservationId = signal<string | null>(null);
  readonly auditExpanded = signal<boolean>(false);
  readonly paymentDraft = signal<AdminPaymentStatus>('PAID');
  readonly adminCommentDraft = signal<string>('');
  readonly rejectReason = signal<string>('');

  readonly reservations = signal<AdminReservation[]>([
    {
      id: 'booking-1',
      resourceName: 'Salle des Fetes',
      userName: 'Sophie Bernard',
      userEmail: 'user@example.fr',
      userPhone: '06 12 34 56 78',
      date: '15/04/2026',
      startDateTimeLabel: '15 avril 2026 a 14:00',
      endDateTimeLabel: '15 avril 2026 a 23:00',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      amountEuros: 350,
      depositEuros: 200,
      userComment: "Gala annuel de l'association",
      adminComment: '',
      createdAtLabel: 'Cree le 10 mars 2026 a 01:00',
      auditTrail: [
        { label: 'Reservation confirmee', meta: 'Secretariat - 11/03/2026 09:20' },
        { label: 'Paiement enregistre', meta: 'Guichet mairie - 12/03/2026 14:35' },
      ],
    },
    {
      id: 'booking-2',
      resourceName: 'Salle de Reunion',
      userName: 'Pierre Durand',
      userEmail: 'pierre.durand@email.fr',
      userPhone: '06 88 22 14 10',
      date: '30/03/2026',
      startDateTimeLabel: '30 mars 2026 a 09:00',
      endDateTimeLabel: '30 mars 2026 a 17:00',
      status: 'PENDING',
      paymentStatus: 'TO_SETTLE',
      amountEuros: 80,
      depositEuros: 50,
      userComment: 'Reunion preparatoire annuelle',
      adminComment: '',
      createdAtLabel: 'Cree le 22 mars 2026 a 11:15',
      auditTrail: [{ label: 'Demande recue', meta: 'Portail citoyen - 22/03/2026 11:15' }],
    },
    {
      id: 'booking-3',
      resourceName: 'Barnums (x5)',
      userName: 'Marie Laurent',
      userEmail: 'marie.l@email.fr',
      userPhone: '07 11 22 33 44',
      date: '01/05/2026',
      startDateTimeLabel: '01 mai 2026 a 08:00',
      endDateTimeLabel: '01 mai 2026 a 20:00',
      status: 'CONFIRMED',
      paymentStatus: 'EXEMPT_GROUP',
      amountEuros: 0,
      depositEuros: 0,
      userComment: 'Installation pour l evenement associatif',
      adminComment: 'Exoneration groupe appliquee.',
      createdAtLabel: 'Cree le 18 mars 2026 a 16:10',
      auditTrail: [{ label: 'Exoneration appliquee', meta: 'Groupe Association - 18/03/2026' }],
    },
    {
      id: 'booking-4',
      resourceName: 'Salle Associative',
      userName: 'Robert Petit',
      userEmail: null,
      userPhone: null,
      date: '20/04/2026',
      startDateTimeLabel: '20 avril 2026 a 10:00',
      endDateTimeLabel: '20 avril 2026 a 18:00',
      status: 'PENDING',
      paymentStatus: 'EXEMPT_SECRETARY',
      amountEuros: 45,
      depositEuros: 0,
      userComment: 'Repetition hebdomadaire',
      adminComment: 'Verifier la disponibilite definitive.',
      createdAtLabel: 'Cree le 12 mars 2026 a 08:40',
      auditTrail: [{ label: 'Exoneration secretaire', meta: 'Secretariat - 12/03/2026' }],
    },
    {
      id: 'booking-5',
      resourceName: 'Sono portable',
      userName: 'Thomas Girard',
      userEmail: 'thomas.girard@email.fr',
      userPhone: '06 55 42 21 11',
      date: '08/04/2026',
      startDateTimeLabel: '08 avril 2026 a 13:00',
      endDateTimeLabel: '08 avril 2026 a 19:00',
      status: 'CANCELLED',
      paymentStatus: 'REFUNDED',
      amountEuros: 90,
      depositEuros: 50,
      userComment: 'Animation de quartier',
      adminComment: 'Reservation annulee et remboursee.',
      createdAtLabel: 'Cree le 01 mars 2026 a 12:20',
      auditTrail: [{ label: 'Remboursement effectue', meta: 'Secretariat - 05/03/2026' }],
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

  readonly selectedReservation = computed(() => {
    const reservationId = this.selectedReservationId();
    return this.reservations().find(reservation => reservation.id === reservationId) ?? null;
  });

  readonly rejectingReservation = computed(() => {
    const reservationId = this.rejectingReservationId();
    return this.reservations().find(reservation => reservation.id === reservationId) ?? null;
  });

  setFilter(filter: ReservationFilter): void {
    this.filter.set(filter);
  }

  openReservationDetails(reservation: AdminReservation): void {
    this.selectedReservationId.set(reservation.id);
    this.auditExpanded.set(false);
    this.paymentDraft.set(reservation.paymentStatus);
    this.adminCommentDraft.set(reservation.adminComment);
  }

  closeReservationDetails(): void {
    this.selectedReservationId.set(null);
    this.auditExpanded.set(false);
  }

  openRejectModal(reservation: AdminReservation): void {
    this.rejectingReservationId.set(reservation.id);
    this.rejectReason.set('');
  }

  closeRejectModal(): void {
    this.rejectingReservationId.set(null);
    this.rejectReason.set('');
  }

  confirmReservation(reservationId: string): void {
    this.updateReservation(reservationId, { status: 'CONFIRMED' });
    this.feedbackMessage.set('Reservation confirmee avec succes.');
  }

  saveReservationDetails(): void {
    const reservation = this.selectedReservation();
    if (!reservation) {
      return;
    }

    this.updateReservation(reservation.id, {
      paymentStatus: this.paymentDraft(),
      adminComment: this.adminCommentDraft().trim(),
    });

    this.feedbackMessage.set('Reservation mise a jour avec succes.');
    this.closeReservationDetails();
  }

  saveAdminComment(): void {
    const reservation = this.selectedReservation();
    if (!reservation) {
      return;
    }

    this.updateReservation(reservation.id, {
      adminComment: this.adminCommentDraft().trim(),
    });

    this.feedbackMessage.set('Commentaire interne ajoute.');
  }

  sendReminder(): void {
    const reservation = this.selectedReservation();
    if (!reservation) {
      return;
    }

    this.feedbackMessage.set(`Rappel envoye pour ${reservation.id}.`);
  }

  toggleAudit(): void {
    this.auditExpanded.update(value => !value);
  }

  rejectReservation(): void {
    const reservation = this.rejectingReservation();
    const reason = this.rejectReason().trim();

    if (!reservation || !reason) {
      return;
    }

    this.updateReservation(reservation.id, {
      status: 'CANCELLED',
      paymentStatus: reservation.depositEuros > 0 ? 'REFUNDED' : reservation.paymentStatus,
      adminComment: reason,
    });

    this.feedbackMessage.set(`Reservation ${reservation.id} refusee avec succes.`);
    this.closeRejectModal();
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

  paymentStatusOptions(): AdminPaymentStatus[] {
    return ['PAID', 'TO_SETTLE', 'EXEMPT_GROUP', 'EXEMPT_SECRETARY', 'REFUNDED'];
  }

  trackByReservationId(_index: number, reservation: AdminReservation): string {
    return reservation.id;
  }

  private updateReservation(
    reservationId: string,
    changes: Partial<Pick<AdminReservation, 'status' | 'paymentStatus' | 'adminComment'>>
  ): void {
    this.reservations.update(reservations =>
      reservations.map(reservation =>
        reservation.id === reservationId ? { ...reservation, ...changes } : reservation
      )
    );
  }
}
