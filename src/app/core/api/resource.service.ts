import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RessourcesService } from './api/ressources.service';
import { PagedResponseResourceDto } from './model/pagedResponseResourceDto';
import { ResourceDto as OpenApiResourceDto } from './model/resourceDto';
import { ResourceRequest } from './model/resourceRequest';
import {
  CreateResourceDto,
  ResourceDto,
  ResourceFormValue,
  ResourceStats,
  UpdateResourceDto,
} from './models/resource.model';

const ACCESSIBILITY_LABELS: Record<string, string> = {
  PMR_ACCESS: 'Accès PMR',
  PARKING: 'Parking',
  SOUND_SYSTEM: 'Sonorisation',
  PROJECTOR: 'Vidéoprojecteur',
  KITCHEN: 'Cuisine équipée',
  STREET_ACCESS: 'Accès rue directe',
};

@Injectable({
  providedIn: 'root',
})
export class ResourceService {
  private readonly http = inject(HttpClient);
  private readonly ressourcesService = inject(RessourcesService);

  getAll(): Observable<ResourceDto[]> {
    const root = environment.apiUrl ?? '';
    const params = new HttpParams().set('page', '0').set('size', '100');
    return this.http
      .get<PagedResponseResourceDto>(`${root}/api/resources`, {
        params,
        withCredentials: true,
      })
      .pipe(
        map(response =>
          (response.content ?? []).map(resource => this.fromOpenApiResource(resource))
        )
      );
  }

  getById(resourceId: string): Observable<ResourceDto> {
    return this.ressourcesService
      .getResourceById(resourceId)
      .pipe(map(resource => this.fromOpenApiResource(resource)));
  }

  create(payload: CreateResourceDto): Observable<ResourceDto> {
    return this.ressourcesService
      .createResource(this.toOpenApiResourceRequest(payload))
      .pipe(map(resource => this.fromOpenApiResource(resource)));
  }

  update(resourceId: string, payload: UpdateResourceDto): Observable<ResourceDto> {
    return this.ressourcesService
      .updateResource(resourceId, this.toOpenApiResourceRequest(payload))
      .pipe(map(resource => this.fromOpenApiResource(resource)));
  }

  delete(resourceId: string): Observable<void> {
    return this.ressourcesService.deleteResource(resourceId).pipe(map(() => void 0));
  }

  getStats(resources: ResourceDto[]): ResourceStats {
    const activeResources = resources.filter(resource => resource.isActive !== false);

    return {
      roomsCount: activeResources.filter(resource => resource.resourceType === 'IMMOBILIER').length,
      materialsCount: activeResources.filter(resource => resource.resourceType === 'MOBILIER')
        .length,
      totalCount: activeResources.length,
    };
  }

  buildPayload(formValue: ResourceFormValue): CreateResourceDto {
    return {
      name: formValue.name.trim(),
      resourceType: formValue.resourceType,
      description: formValue.description.trim(),
      capacity: formValue.resourceType === 'IMMOBILIER' ? formValue.capacity : null,
      imageUrl: formValue.imageUrl?.trim() || null,
      depositAmountCents: this.eurosToCents(formValue.depositAmountEuros),
      accessibilityTags: this.parseAccessibilityTags(formValue.accessibilityTagsText),
    };
  }

  toFormValue(resource: ResourceDto): ResourceFormValue {
    return {
      resourceType: resource.resourceType,
      name: resource.name,
      description: resource.description ?? '',
      capacity: resource.capacity ?? null,
      depositAmountEuros: this.centsToEuros(resource.depositAmountCents ?? 0),
      accessibilityTagsText: (resource.accessibilityTags ?? []).join(', '),
      imageUrl: resource.imageUrl ?? null,
    };
  }

  formatAccessibilityTag(tag: string): string {
    return ACCESSIBILITY_LABELS[tag] ?? tag;
  }

  fromCents(value: number | null | undefined): number {
    return Math.round((value ?? 0) / 100);
  }

  centsToEuros(value: number): number {
    return value / 100;
  }

  eurosToCents(value: number | null): number {
    return Math.round((value ?? 0) * 100);
  }

  parseAccessibilityTags(text: string): string[] {
    const allowed = Object.keys(ACCESSIBILITY_LABELS);

    return text
      .split(',')
      .map(item => item.trim().toUpperCase())
      .filter(item => allowed.includes(item));
  }

  private toOpenApiResourceRequest(
    payload: CreateResourceDto | UpdateResourceDto
  ): ResourceRequest {
    return {
      name: payload.name,
      resourceType: payload.resourceType,
      capacity: payload.capacity ?? undefined,
      description: payload.description,
      depositAmountCents: payload.depositAmountCents,
      imageUrl: payload.imageUrl ?? undefined,
      accessibilityTags: payload.accessibilityTags,
    };
  }

  private fromOpenApiResource(resource: OpenApiResourceDto): ResourceDto {
    const id = resource.id != null ? String(resource.id) : '';
    return {
      id,
      name: resource.name ?? 'Ressource',
      resourceType: (resource.resourceType ?? 'IMMOBILIER') as ResourceDto['resourceType'],
      capacity: resource.capacity ?? null,
      description: resource.description ?? null,
      depositAmountCents: resource.depositAmountCents,
      imageUrl: resource.imageUrl ?? null,
      accessibilityTags: resource.accessibilityTags ?? [],
      isActive: resource.isActive ?? true,
    };
  }
}
