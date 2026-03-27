export type PaymentStatus = 'DEPOSIT_PENDING' | 'DEPOSIT_PAID' | 'EXEMPT' | 'WAIVED' | 'REFUNDED';

export interface PaymentDto {
  id: string;
  reservationId: string;
  userId: string;
  userFullName: string;
  amount: number;
  status: PaymentStatus;
  exemptionReason?: string;
  paidAt?: string;
  updatedAt: string;
  updatedBy?: string;
  history: PaymentHistoryEntry[];
}

export interface PaymentHistoryEntry {
  id: string;
  fromStatus: PaymentStatus;
  toStatus: PaymentStatus;
  reason?: string;
  changedBy: string;
  changedAt: string;
}

export interface UpdatePaymentStatusRequest {
  status: PaymentStatus;
  reason?: string;
}
