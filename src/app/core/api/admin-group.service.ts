import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  AdminGroupDto,
  AdminGroupMemberDto,
  CreateAdminGroupDto,
} from './models/admin-group.model';

@Injectable({
  providedIn: 'root',
})
export class AdminGroupService {
  private readonly api = inject(ApiService);

  getGroups(): Observable<AdminGroupDto[]> {
    return this.api.get<AdminGroupDto[]>('/api/admin/groups');
  }

  getGroupMembers(groupId: string): Observable<AdminGroupMemberDto[]> {
    return this.api.get<AdminGroupMemberDto[]>(`/api/admin/groups/${groupId}/members`);
  }

  createGroup(payload: CreateAdminGroupDto): Observable<AdminGroupDto> {
    return this.api.post<AdminGroupDto>('/api/admin/groups', payload);
  }
}
