/**
 * AGORA API — ligne « mes réservations » (liste paginée).
 * Aligné sur ReservationListItemDto côté backend ; régénérer via openapi:generate quand le contrat change.
 */
import { LocalTime } from './localTime';

export interface ReservationListItemDto {
  id?: string;
  resourceName?: string;
  resourceType?: ReservationListItemDto.ResourceTypeEnum;
  date?: string;
  slotStart?: string | LocalTime;
  slotEnd?: string | LocalTime;
  status?: ReservationListItemDto.StatusEnum;
  depositStatus?: ReservationListItemDto.DepositStatusEnum;
  depositAmountCents?: number;
  depositAmountFullCents?: number;
  discountLabel?: string;
  createdAt?: string;
}

export namespace ReservationListItemDto {
  export const ResourceTypeEnum = {
    Immobilier: 'IMMOBILIER',
    Mobilier: 'MOBILIER',
  } as const;
  export type ResourceTypeEnum = (typeof ResourceTypeEnum)[keyof typeof ResourceTypeEnum];

  export const StatusEnum = {
    PendingValidation: 'PENDING_VALIDATION',
    Confirmed: 'CONFIRMED',
    Cancelled: 'CANCELLED',
    Rejected: 'REJECTED',
    PendingDocument: 'PENDING_DOCUMENT',
  } as const;
  export type StatusEnum = (typeof StatusEnum)[keyof typeof StatusEnum];

  export const DepositStatusEnum = {
    DepositPending: 'DEPOSIT_PENDING',
    DepositPaid: 'DEPOSIT_PAID',
    Exempt: 'EXEMPT',
    Waived: 'WAIVED',
    Refunded: 'REFUNDED',
  } as const;
  export type DepositStatusEnum = (typeof DepositStatusEnum)[keyof typeof DepositStatusEnum];
}
