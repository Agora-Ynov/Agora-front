import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { PagedResponse } from '../../../core/api/models/paged-response.model';
import { ResourceDto } from '../../../core/api/models/resource.model';
import { RessourcesService } from '../../../core/api/api/ressources.service';
import { ResourceDto as OpenApiResourceDto } from '../../../core/api/model/resourceDto';

@Injectable({ providedIn: 'root' })
export class CatalogueMockService {
  private readonly ressourcesService = inject(RessourcesService);

  getResources(): Observable<PagedResponse<ResourceDto>> {
    return this.ressourcesService.getResources().pipe(
      map(response => ({
        content: (response.content ?? []).map(resource => this.toResourceModel(resource)),
        totalElements: response.totalElements ?? 0,
        totalPages: response.totalPages ?? 0,
        page: response.page ?? 0,
        size: response.size ?? 20,
      }))
    );
  }

  getResourceById(resourceId: string): Observable<ResourceDto | null> {
    return this.ressourcesService.getResourceById(resourceId).pipe(
      map(resource => (resource ? this.toResourceModel(resource) : null))
    );
  }

  private toResourceModel(resource: OpenApiResourceDto): ResourceDto {
    return {
      id: resource.id ?? '',
      name: resource.name ?? 'Ressource',
      resourceType: resource.resourceType ?? 'IMMOBILIER',
      capacity: resource.capacity ?? null,
      description: resource.description ?? null,
      depositAmountCents: resource.depositAmountCents ?? 0,
      imageUrl: resource.imageUrl ?? null,
      accessibilityTags: (resource.accessibilityTags ?? []) as ResourceDto['accessibilityTags'],
      isActive: resource.isActive ?? true,
    };
  }
}
