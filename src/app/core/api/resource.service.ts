import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResourcesService } from './api/resources.service';
import { PagedResponseResourceDto } from './model/pagedResponseResourceDto';
import { ResourceDto as OpenApiResourceDto } from './model/resourceDto';
import { ResourceRequest } from './model/resourceRequest';
import {
  CreateResourceDto,
  RESOURCE_ACCESSIBILITY_OPTIONS,
  ResourceDto,
  ResourceFormValue,
  ResourceStats,
  UpdateResourceDto,
} from './models/resource.model';

const ACCESSIBILITY_LABELS: Record<string, string> = Object.fromEntries(
  RESOURCE_ACCESSIBILITY_OPTIONS.map(o => [o.id, o.label])
);
const ALLOWED_ACCESSIBILITY_IDS = new Set<string>(RESOURCE_ACCESSIBILITY_OPTIONS.map(o => o.id));

@Injectable({
  providedIn: 'root',
})
export class ResourceService {
  private readonly http = inject(HttpClient);
  private readonly resourcesService = inject(ResourcesService);

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

  /**
   * Détail ressource via HttpClient (comme getAll).
   * Evite le client OpenAPI dont l'en-tête Accept generique peut forcer responseType blob (corps non JSON).
   */
  getById(resourceId: string): Observable<ResourceDto> {
    const root = environment.apiUrl ?? '';
    return this.http
      .get<OpenApiResourceDto>(`${root}/api/resources/${encodeURIComponent(resourceId)}`, {
        withCredentials: true,
        transferCache: false,
      })
      .pipe(map(resource => this.fromOpenApiResource(resource)));
  }

  create(payload: CreateResourceDto): Observable<ResourceDto> {
    return this.resourcesService
      .createResource(this.toOpenApiResourceRequest(payload))
      .pipe(map(resource => this.fromOpenApiResource(resource)));
  }

  update(resourceId: string, payload: UpdateResourceDto): Observable<ResourceDto> {
    return this.resourcesService
      .updateResource(resourceId, this.toOpenApiResourceRequest(payload))
      .pipe(map(resource => this.fromOpenApiResource(resource)));
  }

  delete(resourceId: string): Observable<void> {
    return this.resourcesService.deleteResource(resourceId).pipe(map(() => void 0));
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
    const rentalPriceCents =
      formValue.rentalAmountEuros == null
        ? undefined
        : this.eurosToCents(formValue.rentalAmountEuros);

    return {
      name: formValue.name.trim(),
      resourceType: formValue.resourceType,
      description: formValue.description.trim(),
      capacity: formValue.resourceType === 'IMMOBILIER' ? formValue.capacity : null,
      imageUrl: formValue.imageUrl?.trim() || null,
      depositAmountCents: this.eurosToCents(formValue.depositAmountEuros),
      ...(rentalPriceCents !== undefined ? { rentalPriceCents } : {}),
      accessibilityTags: this.normalizeAccessibilityTags(formValue.accessibilityTags ?? []),
    };
  }

  toFormValue(resource: ResourceDto): ResourceFormValue {
    return {
      resourceType: resource.resourceType,
      name: resource.name,
      description: resource.description ?? '',
      capacity: resource.capacity ?? null,
      depositAmountEuros: this.centsToEuros(resource.depositAmountCents ?? 0),
      rentalAmountEuros:
        resource.rentalPriceCents == null || Number.isNaN(resource.rentalPriceCents)
          ? null
          : this.centsToEuros(resource.rentalPriceCents),
      accessibilityTags: [...(resource.accessibilityTags ?? [])],
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

  /**
   * @deprecated Préférer `normalizeAccessibilityTags` ; conservé pour éventuel collage CSV.
   */
  parseAccessibilityTags(text: string): string[] {
    return this.normalizeAccessibilityTags(
      text
        .split(',')
        .map(item => item.trim().toUpperCase())
        .filter(Boolean)
    );
  }

  normalizeAccessibilityTags(tags: string[]): string[] {
    return tags.filter(id => ALLOWED_ACCESSIBILITY_IDS.has(id));
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
      rentalPriceCents: payload.rentalPriceCents,
      imageUrl: payload.imageUrl ?? undefined,
      accessibilityTags: payload.accessibilityTags,
    };
  }

  private fromOpenApiResource(resource: OpenApiResourceDto): ResourceDto {
    const raw = resource as unknown as Record<string, unknown>;
    const depositAmountCents =
      resource.depositAmountCents ??
      (typeof raw['deposit_amount_cents'] === 'number'
        ? (raw['deposit_amount_cents'] as number)
        : undefined);
    const rentalPriceCents =
      resource.rentalPriceCents ??
      (typeof raw['rental_price_cents'] === 'number'
        ? (raw['rental_price_cents'] as number)
        : typeof raw['rentalPriceCents'] === 'number'
          ? (raw['rentalPriceCents'] as number)
          : null);
    const name =
      resource.name ?? (typeof raw['name'] === 'string' ? (raw['name'] as string) : undefined);
    const isActive =
      resource.isActive ??
      (typeof raw['is_active'] === 'boolean' ? (raw['is_active'] as boolean) : undefined);
    const description =
      resource.description ??
      (typeof raw['description'] === 'string' ? (raw['description'] as string) : null);
    const imageUrl =
      resource.imageUrl ??
      (typeof raw['imageUrl'] === 'string'
        ? (raw['imageUrl'] as string)
        : typeof raw['image_url'] === 'string'
          ? (raw['image_url'] as string)
          : null);
    const tags =
      resource.accessibilityTags ??
      (Array.isArray(raw['accessibilityTags'])
        ? (raw['accessibilityTags'] as string[])
        : Array.isArray(raw['accessibility_tags'])
          ? (raw['accessibility_tags'] as string[])
          : []);

    const id = resource.id != null ? String(resource.id) : '';
    const nameTrim = (name ?? '').trim();
    return {
      id,
      name: nameTrim || 'Ressource',
      resourceType: (resource.resourceType ?? 'IMMOBILIER') as ResourceDto['resourceType'],
      capacity: resource.capacity ?? null,
      description: description ?? null,
      depositAmountCents,
      rentalPriceCents: rentalPriceCents ?? null,
      imageUrl: imageUrl ?? null,
      accessibilityTags: tags,
      isActive: isActive ?? true,
    };
  }
}
