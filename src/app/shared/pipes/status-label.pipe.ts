import { Pipe, PipeTransform } from '@angular/core';
import { ReservationStatus } from '../../core/api/models/reservation.model';
import { PaymentStatus } from '../../core/api/models/payment.model';
import { AccountStatus } from '../../core/auth/auth.model';

type KnownStatus = ReservationStatus | PaymentStatus | AccountStatus | string;

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  CANCELLED: 'Annulée',
  REJECTED: 'Refusée',
  COMPLETED: 'Terminée',
  WAITLISTED: "Liste d'attente",
  DEPOSIT_PENDING: 'Caution en attente',
  DEPOSIT_PAID: 'Caution versée',
  EXEMPT: 'Exempté',
  WAIVED: 'Caution levée',
  REFUNDED: 'Remboursée',
  PENDING_VALIDATION: 'En attente de validation',
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  SUSPENDED: 'Suspendu',
};

@Pipe({ name: 'statusLabel', standalone: true })
export class StatusLabelPipe implements PipeTransform {
  transform(value: KnownStatus | null | undefined): string {
    if (!value) return '';
    return STATUS_LABELS[value] ?? value;
  }
}
