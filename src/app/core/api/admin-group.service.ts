import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, delay, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import {
  AdminGroupDto,
  AdminGroupFormType,
  AdminGroupMemberDto,
  CreateAdminGroupDto,
} from './models/admin-group.model';

@Injectable({
  providedIn: 'root',
})
export class AdminGroupService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);
  private readonly useMockGroups = environment.useMockAuth;
  private readonly mockStorageKey = 'agora.mock.admin.groups';

  getGroups(): Observable<AdminGroupDto[]> {
    if (this.useMockGroups) {
      return this.getMockGroups();
    }

    return this.api
      .get<AdminGroupDto[]>('/api/admin/groups')
      .pipe(catchError(() => this.getMockGroups()));
  }

  getGroupMembers(groupId: string): Observable<AdminGroupMemberDto[]> {
    if (this.useMockGroups) {
      return this.getMockGroupMembers(groupId);
    }

    return this.api
      .get<AdminGroupMemberDto[]>(`/api/admin/groups/${groupId}/members`)
      .pipe(catchError(() => this.getMockGroupMembers(groupId)));
  }

  createGroup(
    payload: CreateAdminGroupDto,
    metadata: { groupType: AdminGroupFormType; description: string }
  ): Observable<AdminGroupDto> {
    if (this.useMockGroups) {
      return this.createMockGroup(payload, metadata);
    }

    return this.api
      .post<AdminGroupDto>('/api/admin/groups', payload)
      .pipe(catchError(() => this.createMockGroup(payload, metadata)));
  }

  private getMockGroups(): Observable<AdminGroupDto[]> {
    const stored = this.readMockGroups();
    if (stored.length > 0) {
      return of(stored).pipe(delay(120));
    }

    return this.http.get<AdminGroupDto[]>('/assets/mocks/api/admin.groups.get.json').pipe(
      map(groups => groups.map(group => this.normalizeGroup(group))),
      tap(groups => this.writeMockGroups(groups)),
      delay(120)
    );
  }

  private getMockGroupMembers(groupId: string): Observable<AdminGroupMemberDto[]> {
    return this.http
      .get<Record<string, AdminGroupMemberDto[]>>('/assets/mocks/api/admin.group-members.get.json')
      .pipe(map(response => response[groupId] ?? []));
  }

  private createMockGroup(
    payload: CreateAdminGroupDto,
    metadata: { groupType: AdminGroupFormType; description: string }
  ): Observable<AdminGroupDto> {
    return this.getMockGroups().pipe(
      map(groups => {
        const createdGroup = this.normalizeGroup({
          id: this.generateMockId(groups),
          name: payload.name,
          isPreset: false,
          canViewImmobilier: payload.canViewImmobilier,
          canBookImmobilier: payload.canBookImmobilier,
          canViewMobilier: payload.canViewMobilier,
          canBookMobilier: payload.canBookMobilier,
          discountType: payload.discountType,
          discountValue: payload.discountValue,
          discountAppliesTo: payload.discountAppliesTo,
          discountLabel: this.buildDiscountLabel(payload),
          memberCount: 0,
          description: metadata.description,
          groupType: metadata.groupType,
        });

        this.writeMockGroups([createdGroup, ...groups]);
        return createdGroup;
      }),
      delay(120)
    );
  }

  private buildDiscountLabel(payload: CreateAdminGroupDto): string {
    switch (payload.discountType) {
      case 'FULL_EXEMPT':
        return 'Exoneration totale';
      case 'PERCENTAGE':
        return `Reduction ${payload.discountValue}%`;
      case 'FIXED_AMOUNT':
        return `Remise fixe ${payload.discountValue}`;
      case 'NONE':
      default:
        return 'Plein tarif';
    }
  }

  private normalizeGroup(group: Partial<AdminGroupDto>): AdminGroupDto {
    return {
      id: group.id ?? 'g000',
      name: group.name ?? 'Groupe',
      isPreset: group.isPreset ?? false,
      canViewImmobilier: group.canViewImmobilier ?? group.canBookImmobilier ?? false,
      canBookImmobilier: group.canBookImmobilier ?? false,
      canViewMobilier: group.canViewMobilier ?? group.canBookMobilier ?? false,
      canBookMobilier: group.canBookMobilier ?? false,
      discountType: group.discountType ?? 'NONE',
      discountValue: group.discountValue ?? 0,
      discountAppliesTo: group.discountAppliesTo ?? 'ALL',
      discountLabel: group.discountLabel ?? 'Plein tarif',
      memberCount: group.memberCount ?? 0,
      description: group.description ?? '',
      groupType: group.groupType ?? 'AUTRE',
    };
  }

  private generateMockId(groups: AdminGroupDto[]): string {
    const nextNumber =
      groups
        .map(group => Number(group.id.replace(/\D/g, '')))
        .filter(value => !Number.isNaN(value))
        .reduce((max, value) => Math.max(max, value), 0) + 1;

    return `g${String(nextNumber).padStart(3, '0')}`;
  }

  private readMockGroups(): AdminGroupDto[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const raw = localStorage.getItem(this.mockStorageKey);
    if (!raw) {
      return [];
    }

    try {
      const groups = JSON.parse(raw) as AdminGroupDto[];
      return groups.map(group => this.normalizeGroup(group));
    } catch {
      localStorage.removeItem(this.mockStorageKey);
      return [];
    }
  }

  private writeMockGroups(groups: AdminGroupDto[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.mockStorageKey, JSON.stringify(groups));
  }
}
