import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { ResourceDto } from '../../../core/api/models/resource.model';
import { UserProfile } from '../../../core/auth/auth.model';
import { AuthService } from '../../../core/auth/auth.service';
import { CatalogueResourcesService } from './catalogue-resources.service';
import { ReservationPricingGroup, resolveResourcePricing } from './resource-pricing.utils';
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
  source: ResourceDto;
}

@Component({
  selector: 'app-catalogue',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './catalogue.component.html',
  styleUrl: './catalogue.component.scss',
})
export class CatalogueComponent {
  private readonly http = inject(HttpClient);
  private readonly catalogueResourcesService = inject(CatalogueResourcesService);
  private readonly authService = inject(AuthService);

  readonly familyFilter = signal<ResourceFamilyFilter>('ALL');
  readonly selectedFeatures = signal<FeatureFilter[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly userGroups = signal<ReservationPricingGroup[]>([]);

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
    effect(
      () => {
        this.loadCurrentUserGroups(this.currentUser());
      },
      { allowSignalWrites: true }
    );

    this.catalogueResourcesService
      .getResources()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: response => {
          this.resources.set(
            response.content
              .map(resource => this.mapResource(resource))
          );
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.message || 'Impossible de charger le catalogue.');
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

  resetFilters(): void {
    this.familyFilter.set('ALL');
    this.selectedFeatures.set([]);
  }

  isFeatureSelected(feature: FeatureFilter): boolean {
    return this.selectedFeatures().includes(feature);
  }

  hasActiveFilters(): boolean {
    return this.familyFilter() !== 'ALL' || this.selectedFeatures().length > 0;
  }

  featureLabel(feature: FeatureFilter): string {
    return getFeatureLabel(feature);
  }

  getPriceLabel(resource: CatalogueResource): string {
    const pricing = resolveResourcePricing(resource.source, this.currentUser(), this.userGroups());
    return pricing.finalPriceCents === 0
      ? 'Gratuit'
      : this.formatPrice(pricing.finalPriceCents / 100);
  }

  showPriceSuffix(resource: CatalogueResource): boolean {
    const pricing = resolveResourcePricing(resource.source, this.currentUser(), this.userGroups());
    return pricing.finalPriceCents > 0;
  }

  getDepositLabel(resource: CatalogueResource): string {
    return this.formatPrice(resource.depositAmount);
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
      source: resource,
    };
  }

  private loadCurrentUserGroups(user: UserProfile | null): void {
    if (!user?.groupIds.length) {
      this.userGroups.set([]);
      return;
    }

    this.userGroups.set([]);

    this.http
      .get<ReservationPricingGroup[]>('/assets/mocks/api/groups.get.json')
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: groups => {
          this.userGroups.set(groups.filter(group => user.groupIds.includes(group.id)));
        },
        error: () => {
          this.userGroups.set([]);
        },
      });
  }

  private formatPrice(amount: number): string {
    return `${amount} EUR`;
  }
}
