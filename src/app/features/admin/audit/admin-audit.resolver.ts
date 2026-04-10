import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminUsersListResponse } from '../../../core/api';
import { ApiService } from '../../../core/api/api.service';
import { AdminAuditRouteData, AuditResponse } from './admin-audit.models';

function clampPage(raw: string | null): number {
  const n = Number(raw ?? '0');
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function clampSize(raw: string | null): number {
  const n = Number(raw ?? '25');
  if (!Number.isFinite(n)) return 25;
  return Math.min(100, Math.max(5, Math.floor(n)));
}

/** Chargement initial et à chaque navigation : query `page`, `size` (pagination URL = source de vérité). */
export const adminAuditResolver: ResolveFn<AdminAuditRouteData> = route => {
  const api = inject(ApiService);
  const page = clampPage(route.queryParamMap.get('page'));
  const size = clampSize(route.queryParamMap.get('size'));

  return forkJoin({
    audit: api
      .getJson<AuditResponse>('/api/admin/audit', { page, size })
      .pipe(catchError(() => of<AuditResponse>({ content: [] }))),
    suspended: api
      .getJson<AdminUsersListResponse>('/api/admin/users', {
        page: 0,
        size: 1,
        status: 'SUSPENDED',
      })
      .pipe(catchError(() => of<AdminUsersListResponse>({}))),
  });
};
