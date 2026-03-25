export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'IMPERSONATE_START'
  | 'IMPERSONATE_END'
  | 'RESERVATION_CREATE'
  | 'RESERVATION_CANCEL'
  | 'RESERVATION_STATUS_CHANGE'
  | 'PAYMENT_STATUS_CHANGE'
  | 'USER_APPROVE'
  | 'USER_REJECT'
  | 'USER_SUSPEND'
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_DELETE';

export interface AuditLogDto {
  id: string;
  action: AuditAction;
  performedBy: string;
  targetUserId?: string;
  targetResourceId?: string;
  details?: Record<string, string>;
  ipAddress?: string;
  timestamp: string;
}

export interface AuditFilterParams {
  action?: AuditAction;
  performedBy?: string;
  targetUserId?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}
