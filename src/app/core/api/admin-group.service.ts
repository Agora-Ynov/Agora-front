import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminGroupsService } from './api/adminGroups.service';
import { AdminGroupResponseDto } from './model/adminGroupResponseDto';
import { AddGroupMemberRequestDto } from './model/addGroupMemberRequestDto';
import { AdminGroupMemberResponseDto } from './model/adminGroupMemberResponseDto';
import { CreateAdminGroupRequestDto } from './model/createAdminGroupRequestDto';
import { UpdateAdminGroupRequestDto } from './model/updateAdminGroupRequestDto';
import {
  AdminGroupDto,
  AdminGroupMemberDto,
  AdminGroupDiscountAppliesTo,
  AdminGroupDiscountType,
  CreateAdminGroupDto,
} from './models/admin-group.model';

@Injectable({
  providedIn: 'root',
})
export class AdminGroupService {
  private readonly api = inject(AdminGroupsService);
  private readonly http = inject(HttpClient);
  private readonly root = environment.apiUrl ?? '';

  /**
   * GET via HttpClient + Accept JSON : le client OpenAPI met parfois Accept sur le wildcard MIME
   * et en déduit responseType blob — le corps JSON n’est alors pas parsé en tableau.
   */
  getGroups(): Observable<AdminGroupDto[]> {
    return this.http
      .get<AdminGroupResponseDto[]>(`${this.root}/api/admin/groups`, {
        withCredentials: true,
        transferCache: false,
        headers: { Accept: 'application/json' },
      })
      .pipe(map(rows => (rows ?? []).map(r => this.mapGroup(r))));
  }

  getGroupMembers(groupId: string): Observable<AdminGroupMemberDto[]> {
    return this.http
      .get<AdminGroupMemberResponseDto[]>(`${this.root}/api/admin/groups/${groupId}/members`, {
        withCredentials: true,
        transferCache: false,
        headers: { Accept: 'application/json' },
      })
      .pipe(map(rows => (rows ?? []).map(r => this.mapMember(r))));
  }

  createGroup(payload: CreateAdminGroupDto): Observable<AdminGroupDto> {
    const body: CreateAdminGroupRequestDto = {
      name: payload.name,
      canViewImmobilier: payload.canViewImmobilier,
      canBookImmobilier: payload.canBookImmobilier,
      canViewMobilier: payload.canViewMobilier,
      canBookMobilier: payload.canBookMobilier,
      discountType: payload.discountType as CreateAdminGroupRequestDto['discountType'],
      discountValue: payload.discountValue,
      discountAppliesTo:
        payload.discountAppliesTo as CreateAdminGroupRequestDto['discountAppliesTo'],
    };
    return this.api
      .create(body, 'body', false, { transferCache: false })
      .pipe(map(r => this.mapGroup(r)));
  }

  updateGroup(groupId: string, body: UpdateAdminGroupRequestDto): Observable<AdminGroupDto> {
    return this.api
      .update(groupId, body, 'body', false, { transferCache: false })
      .pipe(map(r => this.mapGroup(r)));
  }

  deleteGroup(groupId: string): Observable<unknown> {
    return this.api._delete(groupId, 'body', false, { transferCache: false });
  }

  addMember(groupId: string, userId: string): Observable<unknown> {
    const body: AddGroupMemberRequestDto = { userId };
    return this.api.addMember(groupId, body, 'body', false, { transferCache: false });
  }

  removeMember(groupId: string, userId: string): Observable<unknown> {
    return this.api.removeMember(groupId, userId, 'body', false, { transferCache: false });
  }

  private mapGroup(r: AdminGroupResponseDto): AdminGroupDto {
    const discountType = (r.discountType ?? 'NONE') as AdminGroupDiscountType;
    const discountAppliesTo = (r.discountAppliesTo ?? 'ALL') as AdminGroupDiscountAppliesTo;
    return {
      id: r.id ?? '',
      name: r.name ?? '',
      isPreset: r.isPreset ?? false,
      canViewImmobilier: r.canViewImmobilier,
      canBookImmobilier: r.canBookImmobilier ?? false,
      canViewMobilier: r.canViewMobilier,
      canBookMobilier: r.canBookMobilier ?? false,
      discountType,
      discountValue: r.discountValue ?? 0,
      discountAppliesTo,
      discountLabel: r.discountLabel,
      memberCount: r.memberCount ?? 0,
    };
  }

  private mapMember(r: {
    userId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    joinedAt?: string;
  }): AdminGroupMemberDto {
    const roleRaw = String(r.role ?? 'MEMBER').toUpperCase();
    const role: AdminGroupMemberDto['role'] = roleRaw === 'MANAGER' ? 'MANAGER' : 'MEMBER';
    return {
      userId: r.userId ?? '',
      firstName: r.firstName ?? '',
      lastName: r.lastName ?? '',
      email: r.email ?? null,
      role,
      joinedAt: r.joinedAt ?? new Date(0).toISOString(),
    };
  }
}
