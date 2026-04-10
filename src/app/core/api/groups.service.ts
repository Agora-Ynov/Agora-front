import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserGroupApiDto } from './models/user-group-api.model';

@Injectable({
  providedIn: 'root',
})
export class GroupsService {
  private readonly http = inject(HttpClient);
  private readonly root = environment.apiUrl ?? '';

  getMyGroups(): Observable<UserGroupApiDto[]> {
    return this.http.get<UserGroupApiDto[]>(`${this.root}/api/groups`, {
      withCredentials: true,
      transferCache: false,
    });
  }
}
