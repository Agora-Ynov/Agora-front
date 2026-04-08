export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'WAITLISTED';

export type RecurrenceType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface ReservationDto {
  id: string;
  resourceId: string;
  resourceName: string;
  userId?: string;
  userFullName?: string;
  guestEmail?: string;
  guestPhone?: string;
  groupId?: string;
  startDateTime: string;
  endDateTime: string;
  status: ReservationStatus;
  isRecurring: boolean;
  recurringGroupId?: string;
  attendees?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReservationRequest {
  resourceId: string;
  startDateTime: string;
  endDateTime: string;
  groupId?: string;
  attendees?: number;
  notes?: string;
}

export interface CreateGuestReservationRequest {
  resourceId: string;
  startDateTime: string;
  endDateTime: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone?: string;
  attendees?: number;
  notes?: string;
}

export interface CreateRecurringReservationRequest extends CreateReservationRequest {
  recurrenceType: RecurrenceType;
  recurrenceEndDate: string;
  recurrenceDaysOfWeek?: number[];
}

export interface ReservationFilterParams {
  status?: ReservationStatus;
  resourceId?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}
