import { inject, Injectable } from '@angular/core';
import { map, Observable, from, switchMap } from 'rxjs';
import { PagedResponse } from '../../../core/api/models/paged-response.model';
import { ResourceDto } from '../../../core/api/models/resource.model';
import { RessourcesService } from '../../../core/api/api/ressources.service';
import { ResourceDto as OpenApiResourceDto } from '../../../core/api/model/resourceDto';

@Injectable({ providedIn: 'root' })
export class CatalogueResourcesService {
  private readonly ressourcesService = inject(RessourcesService);

  getResources(): Observable<PagedResponse<ResourceDto>> {
    return this.ressourcesService.getResources().pipe(
      switchMap(response => {
        // Vérifier si c'est un Blob et le parser
        if (response instanceof Blob) {
          return from(response.text()).pipe(
            map(text => {
              const apiResponse = JSON.parse(text);
              return this.mapResponse(apiResponse);
            })
          );
        }
        // Sinon, c'est déjà un objet
        return from([this.mapResponse(response as any)]);
      })
    );
  }

  private mapResponse(apiResponse: any): PagedResponse<ResourceDto> {
    return {
      content: (apiResponse.content ?? []).map((resource: OpenApiResourceDto) => this.toResourceModel(resource)),
      totalElements: apiResponse.totalElements ?? 0,
      totalPages: apiResponse.totalPages ?? 0,
      page: apiResponse.page ?? 0,
      size: apiResponse.size ?? 20,
    };
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

