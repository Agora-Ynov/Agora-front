import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ResourceDto } from '../../../core/api/models/resource.model';
import { AuthService } from '../../../core/auth/auth.service';
import { CatalogueMockService } from './catalogue-mock.service';
import {
  getFeatureLabel,
  getResourceCoverTheme,
  getResourcePrice,
  getResourceTags,
  getResourceTypeLabel,
  ResourceCoverTheme,
} from './resource-presentation.utils';

type ResourceFamilyFilter = 'ALL' | 'ROOM' | 'EQUIPMENT';
type FeatureFilter =
  | 'PMR_ACCESS'
  | 'PARKING'
  | 'SOUND_SYSTEM'
  | 'PROJECTOR'
  | 'KITCHEN'
  | 'STREET_ACCESS';

interface FeatureOption {
  id: FeatureFilter;
  label: string;
  shortLabel: string;
}

interface CatalogueResource {
  id: string;
  name: string;
  description: string;
  family: Exclude<ResourceFamilyFilter, 'ALL'>;
  typeLabel: string;
  coverTheme: ResourceCoverTheme;
  tags: string[];
  features: FeatureFilter[];
  pricePerBooking: number;
  depositAmount: number;
}

@Component({
  selector: 'app-catalogue',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './catalogue.component.html',
  styleUrl: './catalogue.component.scss',
})
export class CatalogueComponent {
  private readonly catalogueMockService = inject(CatalogueMockService);
  private readonly authService = inject(AuthService);

  readonly familyFilter = signal<ResourceFamilyFilter>('ALL');
  readonly selectedFeatures = signal<FeatureFilter[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly featureOptions: FeatureOption[] = [
    { id: 'PMR_ACCESS', label: 'Acces PMR', shortLabel: 'PMR' },
    { id: 'PARKING', label: 'Parking', shortLabel: 'P' },
    { id: 'SOUND_SYSTEM', label: 'Sonorisation', shortLabel: 'Sono' },
    { id: 'PROJECTOR', label: 'Videoprojecteur', shortLabel: 'Video' },
    { id: 'KITCHEN', label: 'Cuisine equipee', shortLabel: 'Cuisine' },
    { id: 'STREET_ACCESS', label: 'Acces rue directe', shortLabel: 'Rue' },
  ];

  readonly resources = signal<CatalogueResource[]>([]);

  readonly filteredResources = computed(() => {
    const family = this.familyFilter();
    const selectedFeatures = this.selectedFeatures();

    return this.resources().filter(resource => {
      const matchesFamily = family === 'ALL' || resource.family === family;
      const matchesFeatures =
        selectedFeatures.length === 0 ||
        selectedFeatures.every(feature => resource.features.includes(feature));

      return matchesFamily && matchesFeatures;
    });
  });

  readonly totalResources = computed(() => this.filteredResources().length);
  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  constructor() {
    this.catalogueMockService
      .getResources()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: response => {
          this.resources.set(
            response.content
              .filter(resource => resource.isActive)
              .map(resource => this.mapResource(resource))
          );
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.message || 'Impossible de charger le catalogue mock local.');
          this.loading.set(false);
        },
      });
  }

  setFamilyFilter(filter: ResourceFamilyFilter): void {
    this.familyFilter.set(filter);
  }

  toggleFeature(feature: FeatureFilter): void {
    this.selectedFeatures.update(current =>
      current.includes(feature) ? current.filter(item => item !== feature) : [...current, feature]
    );
  }

  isFeatureSelected(feature: FeatureFilter): boolean {
    return this.selectedFeatures().includes(feature);
  }

  featureLabel(feature: FeatureFilter): string {
    return getFeatureLabel(feature);
  }

  formatPrice(amount: number): string {
    return `${amount} EUR`;
  }

  logout(): void {
    this.authService.logout();
  }

  private mapResource(resource: ResourceDto): CatalogueResource {
    const description = resource.description ?? 'Description indisponible.';
    const accessibilityTags = resource.accessibilityTags ?? [];
    const depositAmountCents = resource.depositAmountCents ?? 0;

    return {
      id: resource.id,
      name: resource.name,
      description,
      family: resource.resourceType === 'IMMOBILIER' ? 'ROOM' : 'EQUIPMENT',
      typeLabel: getResourceTypeLabel(resource.resourceType),
      coverTheme: getResourceCoverTheme(resource.id),
      tags: getResourceTags(resource),
      features: accessibilityTags,
      pricePerBooking: getResourcePrice(resource),
      depositAmount: Math.round(depositAmountCents / 100),
    };
  }
}
