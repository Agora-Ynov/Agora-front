import { AdminUsersListResponse } from '../../../core/api';

/** Réponse API journal d’audit (alignée sur le back). */
export interface AdminAuditApiEntry {
  id: string;
  adminName: string;
  targetName: string | null;
  action: string;
  details: Record<string, unknown>;
  isImpersonation: boolean;
  performedAt: string;
}

export type AuditResponse = {
  content?: AdminAuditApiEntry[];
  totalElements?: number;
  totalPages?: number;
};

/** Données résolues à l’entrée sur `/admin/audit` (et à chaque changement de query). */
export interface AdminAuditRouteData {
  audit: AuditResponse;
  suspended: AdminUsersListResponse;
}
