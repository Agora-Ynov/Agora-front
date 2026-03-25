import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { PagedResponse } from '../../../core/api/models/paged-response.model';
import { ResourceDto } from '../../../core/api/models/resource.model';

@Injectable({ providedIn: 'root' })
export class CatalogueMockService {
  private readonly http = inject(HttpClient);

  getResources(): Observable<PagedResponse<ResourceDto>> {
    return this.http.get<PagedResponse<ResourceDto>>('/assets/mocks/api/resources.get.json');
  }

  getResourceById(resourceId: string): Observable<ResourceDto | null> {
    return this.getResources().pipe(
      map(response => response.content.find(resource => resource.id === resourceId) ?? null)
    );
  }
}
