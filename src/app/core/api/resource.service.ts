import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  catchError,
  delay,
  map,
  Observable,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { PagedResponse } from './models/paged-response.model';
import {
  AccessibilityTag,
  CreateResourceDto,
  ResourceDto,
  ResourceFormValue,
  ResourceStats,
  UpdateResourceDto,
} from './models/resource.model';

const ACCESSIBILITY_LABELS: Record<AccessibilityTag, string> = {
  PMR_ACCESS: 'Acces PMR',
  PARKING: 'Parking',
  SOUND_SYSTEM: 'Sonorisation',
  PROJECTOR: 'Videoprojecteur',
  KITCHEN: 'Cuisine equipee',
  STREET_ACCESS: 'Acces rue directe',
};

@Injectable({
  providedIn: 'root',
})
export class ResourceService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);
  private readonly basePath = '/api/resources';
  private readonly mockStorageKey = 'agora.mock.resources';
  private readonly useMockResources = environment.useMockAuth;

  getAll(): Observable<ResourceDto[]> {
    if (this.useMockResources) {
      return this.getMockResources();
    }

    return this.api
      .get<PagedResponse<ResourceDto> | ResourceDto[]>(this.basePath)
      .pipe(
        map(response => (Array.isArray(response) ? response : response.content)),
        catchError(() => this.getMockResources())
      );
  }

  getById(resourceId: string): Observable<ResourceDto> {
    if (this.useMockResources) {
      return this.getMockResources().pipe(
        map(resources => resources.find(resource => resource.id === resourceId) ?? null),
        switchMap(resource =>
          resource ? of(resource) : throwError(() => new Error('Resource not found'))
        )
      );
    }

    return this.api
      .get<ResourceDto>(`${this.basePath}/${resourceId}`)
      .pipe(
        catchError(() =>
          this.getMockResources().pipe(
            map(resources => resources.find(resource => resource.id === resourceId) ?? null),
            switchMap(resource =>
              resource ? of(resource) : throwError(() => new Error('Resource not found'))
            )
          )
        )
      );
  }

  create(payload: CreateResourceDto): Observable<ResourceDto> {
    if (this.useMockResources) {
      return this.createMock(payload);
    }

    return this.api.post<ResourceDto>(this.basePath, payload).pipe(
      catchError(() => this.createMock(payload))
    );
  }

  update(resourceId: string, payload: UpdateResourceDto): Observable<ResourceDto> {
    if (this.useMockResources) {
      return this.updateMock(resourceId, payload);
    }

    return this.api
      .put<ResourceDto>(`${this.basePath}/${resourceId}`, payload)
      .pipe(catchError(() => this.updateMock(resourceId, payload)));
  }

  delete(resourceId: string): Observable<void> {
    if (this.useMockResources) {
      return this.deleteMock(resourceId);
    }

    return this.api
      .delete<void>(`${this.basePath}/${resourceId}`)
      .pipe(catchError(() => this.deleteMock(resourceId)));
  }

  getStats(resources: ResourceDto[]): ResourceStats {
    const activeResources = resources.filter(resource => resource.isActive !== false);

    return {
      roomsCount: activeResources.filter(resource => resource.resourceType === 'IMMOBILIER').length,
      materialsCount: activeResources.filter(resource => resource.resourceType === 'MOBILIER').length,
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
      isActive: formValue.isActive,
      basePriceCents: this.eurosToCents(formValue.basePriceEuros),
      quantity: formValue.resourceType === 'MOBILIER' ? formValue.quantity : null,
      depositExemptible: formValue.depositExemptible,
    };
  }

  toFormValue(resource: ResourceDto): ResourceFormValue {
    return {
      resourceType: resource.resourceType,
      name: resource.name,
      description: resource.description ?? '',
      capacity: resource.capacity ?? null,
      basePriceEuros: this.centsToEuros(resource.basePriceCents ?? 0),
      depositAmountEuros: this.centsToEuros(resource.depositAmountCents ?? 0),
      depositExemptible: resource.depositExemptible ?? resource.requiresDeposit !== false,
      accessibilityTagsText: (resource.accessibilityTags ?? []).join(', '),
      imageUrl: resource.imageUrl ?? null,
      quantity: resource.quantity ?? null,
      isActive: resource.isActive ?? true,
    };
  }

  formatAccessibilityTag(tag: AccessibilityTag): string {
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

  parseAccessibilityTags(text: string): AccessibilityTag[] {
    const allowed = Object.keys(ACCESSIBILITY_LABELS) as AccessibilityTag[];

    return text
      .split(',')
      .map(item => item.trim().toUpperCase())
      .filter((item): item is AccessibilityTag => allowed.includes(item as AccessibilityTag));
  }

  private getMockResources(): Observable<ResourceDto[]> {
    const stored = this.readMockResources();
    if (stored.length > 0) {
      return of(stored).pipe(delay(150));
    }

    return this.http.get<PagedResponse<ResourceDto>>('/assets/mocks/api/resources.get.json').pipe(
      map(response => response.content.map(resource => this.normalizeMockResource(resource))),
      tap(resources => this.writeMockResources(resources)),
      delay(150)
    );
  }

  private createMock(payload: CreateResourceDto): Observable<ResourceDto> {
    return this.getMockResources().pipe(
      map(resources => {
        const nextResource: ResourceDto = this.normalizeMockResource({
          id: this.generateMockId(resources),
          ...payload,
        });

        this.writeMockResources([nextResource, ...resources]);
        return nextResource;
      }),
      delay(150)
    );
  }

  private updateMock(resourceId: string, payload: UpdateResourceDto): Observable<ResourceDto> {
    return this.getMockResources().pipe(
      switchMap(resources => {
        const existing = resources.find(resource => resource.id === resourceId);
        if (!existing) {
          return throwError(() => new Error('Resource not found'));
        }

        const updated: ResourceDto = this.normalizeMockResource({
          ...existing,
          ...payload,
          id: resourceId,
        });

        this.writeMockResources(
          resources.map(resource => (resource.id === resourceId ? updated : resource))
        );

        return of(updated).pipe(delay(150));
      })
    );
  }

  private deleteMock(resourceId: string): Observable<void> {
    return this.getMockResources().pipe(
      tap(resources => {
        this.writeMockResources(resources.filter(resource => resource.id !== resourceId));
      }),
      map(() => void 0),
      delay(120)
    );
  }

  private normalizeMockResource(resource: Partial<ResourceDto>): ResourceDto {
    return {
      id: resource.id ?? 'r000',
      name: resource.name ?? 'Ressource',
      resourceType: resource.resourceType ?? 'IMMOBILIER',
      description: resource.description ?? '',
      capacity: resource.resourceType === 'MOBILIER' ? null : (resource.capacity ?? null),
      imageUrl: resource.imageUrl ?? null,
      depositAmountCents: resource.depositAmountCents ?? 0,
      accessibilityTags: resource.accessibilityTags ?? [],
      isActive: resource.isActive ?? true,
      basePriceCents: resource.basePriceCents ?? this.estimateBasePrice(resource),
      quantity: resource.resourceType === 'MOBILIER' ? (resource.quantity ?? 1) : null,
      depositExemptible:
        resource.depositExemptible ?? resource.requiresDeposit !== false,
      requiresDeposit:
        resource.requiresDeposit ?? (resource.depositAmountCents ?? 0) > 0,
    };
  }

  private estimateBasePrice(resource: Partial<ResourceDto>): number {
    const depositAmountCents = resource.depositAmountCents ?? 0;
    return depositAmountCents > 0 ? Math.round(depositAmountCents / 2) : 0;
  }

  private generateMockId(resources: ResourceDto[]): string {
    const nextNumber =
      resources
        .map(resource => Number(resource.id.replace(/\D/g, '')))
        .filter(value => !Number.isNaN(value))
        .reduce((max, value) => Math.max(max, value), 0) + 1;

    return `r${String(nextNumber).padStart(3, '0')}`;
  }

  private readMockResources(): ResourceDto[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const raw = localStorage.getItem(this.mockStorageKey);
    if (!raw) {
      return [];
    }

    try {
      const resources = JSON.parse(raw) as ResourceDto[];
      return resources.map(resource => this.normalizeMockResource(resource));
    } catch {
      localStorage.removeItem(this.mockStorageKey);
      return [];
    }
  }

  private writeMockResources(resources: ResourceDto[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.mockStorageKey, JSON.stringify(resources));
  }
}
