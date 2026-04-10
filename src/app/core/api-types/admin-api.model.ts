/** Contrats alignés sur le backend Agora (Spring) — hors spec OpenAPI partielle. */

export type ApiReservationStatus =
  | 'PENDING_VALIDATION'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'PENDING_DOCUMENT';

export type ApiDepositStatus =
  | 'DEPOSIT_PENDING'
  | 'DEPOSIT_PAID'
  | 'EXEMPT'
  | 'WAIVED'
  | 'REFUNDED';

export type ApiPaymentMode = 'CASH' | 'CHECK';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface ReservationSummaryResponseDto {
  id: string;
  resourceName: string;
  resourceType: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  status: ApiReservationStatus;
  depositStatus: ApiDepositStatus;
  depositAmountCents: number;
  depositAmountFullCents: number;
  discountLabel?: string | null;
  createdAt: string;
}

export interface AdminDashboardStatsResponseDto {
  todayReservations: number;
  pendingDeposits: number;
  pendingDocuments: number;
  tutoredAccounts: number;
  totalGroups: number;
}

export interface AdminPatchReservationStatusRequestDto {
  status: ApiReservationStatus;
  comment?: string | null;
}

export interface AdminPatchPaymentRequestDto {
  status: ApiDepositStatus;
  amountCents: number;
  paymentMode?: ApiPaymentMode | null;
  checkNumber?: string | null;
  comment?: string | null;
}

export interface AdminPaymentRowResponseDto {
  reservationId: string;
  status: ApiDepositStatus;
  amountCents: number;
  paymentMode: ApiPaymentMode | null;
  checkNumber: string | null;
  comment: string | null;
  updatedByName: string | null;
  updatedAt: string;
}

export interface AdminPaymentHistoryEntryResponseDto {
  status: ApiDepositStatus;
  amountCents: number;
  paymentMode: ApiPaymentMode | null;
  checkNumber: string | null;
  comment: string | null;
  updatedByName: string | null;
  updatedAt: string;
}

export interface AdminUserRowDto {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  accountType: string;
  status: string;
  phone: string;
  internalRef: string | null;
  notesAdmin: string | null;
  exemptions: string[];
  createdAt: string;
}

export interface AdminUsersListResponse {
  content: AdminUserRowDto[];
  totalElements: number;
  totalPages: number;
}

export interface AdminUserGroupSnippetDto {
  id: string;
  name: string;
  discountLabel: string | null;
}

export interface AdminUserDetailResponseDto {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  accountType: string;
  status: string;
  phone: string;
  internalRef: string | null;
  notesAdmin: string | null;
  groups: AdminUserGroupSnippetDto[];
  createdAt: string;
}

export interface CreateTutoredUserRequestDto {
  firstName: string;
  lastName: string;
  birthYear?: number | null;
  phone?: string | null;
  notesAdmin?: string | null;
}

export interface AdminSupportUserDto {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  status: string;
}

export interface PromoteAdminSupportRequestDto {
  userId: string;
}

export interface ActivationStatusResponseDto {
  valid: boolean;
  targetEmail: string | null;
}

export interface ActivateAccountRequestDto {
  token: string;
  newPassword: string;
}
