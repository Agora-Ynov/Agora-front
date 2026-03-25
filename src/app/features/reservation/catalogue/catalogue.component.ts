import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ResourceDto } from '../../../core/api/models/resource.model';
import { CatalogueMockService } from './catalogue-mock.service';

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
  coverTheme: 'hall' | 'conference' | 'civic' | 'balloons' | 'bouquet' | 'cocktail';
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
    return this.featureOptions.find(option => option.id === feature)?.label ?? feature;
  }

  formatPrice(amount: number): string {
    return `${amount} EUR`;
  }

  private mapResource(resource: ResourceDto): CatalogueResource {
    return {
      id: resource.id,
      name: resource.name,
      description: resource.description,
      family: resource.resourceType === 'IMMOBILIER' ? 'ROOM' : 'EQUIPMENT',
      typeLabel: resource.resourceType === 'IMMOBILIER' ? 'Salle' : 'Materiel',
      coverTheme: this.resolveCoverTheme(resource.id),
      tags: this.resolveTags(resource),
      features: resource.accessibilityTags,
      pricePerBooking: this.resolvePrice(resource),
      depositAmount: Math.round(resource.depositAmountCents / 100),
    };
  }

  private resolveCoverTheme(resourceId: string): CatalogueResource['coverTheme'] {
    const coverThemeMap: Record<string, CatalogueResource['coverTheme']> = {
      r001: 'hall',
      r002: 'civic',
      r003: 'conference',
      r004: 'balloons',
      r005: 'bouquet',
      r006: 'cocktail',
    };

    return coverThemeMap[resourceId] ?? 'hall';
  }

  private resolvePrice(resource: ResourceDto): number {
    const priceMap: Record<string, number> = {
      r001: 180,
      r002: 75,
      r003: 140,
      r004: 120,
      r005: 90,
      r006: 60,
    };

    return priceMap[resource.id] ?? Math.round(resource.depositAmountCents / 200);
  }

  private resolveTags(resource: ResourceDto): string[] {
    const tagMap: Record<string, string[]> = {
      r001: ['250 places', 'Scene mobile', 'Office traiteur'],
      r002: ['20 places', 'Ecran mural', 'Wifi'],
      r003: ['80 places', 'Sonorisee', 'Loge'],
      r004: ['Pliants', 'Resistants', 'Avec baches laterales'],
      r005: ['2 enceintes', 'Table de mixage', '4 micros', '+1'],
      r006: ['Pliantes', 'Legeres', 'Faciles a transporter'],
    };

    if (tagMap[resource.id]) {
      return tagMap[resource.id];
    }

    return resource.capacity ? [`${resource.capacity} places`] : ['Disponible'];
  }
}
