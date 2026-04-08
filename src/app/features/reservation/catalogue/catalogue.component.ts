import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { RessourcesService } from '../../../core/api/api/ressources.service';
import { PagedResponseResourceDto } from '../../../core/api/model/pagedResponseResourceDto';
import { ResourceDto } from '../../../core/api/model/resourceDto';
import { AuthService } from '../../../core/auth/auth.service';
import { ReservationPricingGroup, resolveResourcePricing } from './resource-pricing.utils';
import {
  getFeatureLabel,
  getResourceCoverTheme,
  getResourceDisplayName,
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

interface CoverOverlayBadge {
  kind: 'capacity' | 'feature';
  value: string;
  title: string;
}

interface CatalogueResource {
  id: string;
  name: string;
  description: string;
  family: Exclude<ResourceFamilyFilter, 'ALL'>;
  typeLabel: string;
  /** Dégradé / illustration de secours si pas d’URL image API */
  coverTheme: ResourceCoverTheme;
  /** Photo renvoyée par l’API (`imageUrl`) — prioritaire à l’affichage */
  imageUrl: string | null;
  tags: string[];
  /** Tags d’accessibilité renvoyés par l’API (codes enum). */
  features: string[];
  /** Pastilles sur la photo (maquette catalogue). */
  overlayBadges: CoverOverlayBadge[];
  pricePerBooking: number;
  depositAmount: number;
  /** Données brutes du contrat OpenAPI (référence pour prix / détail). */
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
  private readonly ressourcesService = inject(RessourcesService);
  private readonly authService = inject(AuthService);

  readonly familyFilter = signal<ResourceFamilyFilter>('ALL');
  readonly selectedFeatures = signal<FeatureFilter[]>([]);
  readonly hasActiveFilters = computed(
    () => this.familyFilter() !== 'ALL' || this.selectedFeatures().length > 0
  );
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  /** Remises groupées : pas encore d’endpoint backend (ex-JSON mock) — tableau vide pour l’instant. */
  readonly userGroups = signal<ReservationPricingGroup[]>([]);

  private static readonly OVERLAY_FEATURE_ORDER: FeatureFilter[] = [
    'PMR_ACCESS',
    'PARKING',
    'SOUND_SYSTEM',
    'PROJECTOR',
    'KITCHEN',
    'STREET_ACCESS',
  ];

  private static readonly FEATURE_OPTIONS: FeatureOption[] = [
    { id: 'PMR_ACCESS', label: 'Accès PMR', shortLabel: 'PMR' },
    { id: 'PARKING', label: 'Parking', shortLabel: 'P' },
    { id: 'SOUND_SYSTEM', label: 'Sonorisation', shortLabel: 'Sono' },
    { id: 'PROJECTOR', label: 'Vidéoprojecteur', shortLabel: 'Vidéo' },
    { id: 'KITCHEN', label: 'Cuisine équipée', shortLabel: 'Cuisine' },
    { id: 'STREET_ACCESS', label: 'Accès rue directe', shortLabel: 'Rue' },
  ];

  readonly featureOptions = CatalogueComponent.FEATURE_OPTIONS;

  readonly resources = signal<CatalogueResource[]>([]);

  readonly filteredResources = computed(() => {
    const family = this.familyFilter();
    const selectedFeatures = this.selectedFeatures();

    return this.resources().filter(resource => {
      const matchesFamily = family === 'ALL' || resource.family === family;
      const tagCodes = resource.features;
      const matchesFeatures =
        selectedFeatures.length === 0 ||
        selectedFeatures.every(feature => tagCodes.includes(feature));

      return matchesFamily && matchesFeatures;
    });
  });

  readonly totalResources = computed(() => this.filteredResources().length);
  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  constructor() {
    this.ressourcesService
      .getResources(undefined, undefined, undefined, undefined, 0, 100, 'body', false, {
        transferCache: false,
      })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (response: PagedResponseResourceDto) => {
          const rows = response.content ?? [];
          this.resources.set(
            rows
              .filter(
                (r): r is ResourceDto & { id: string } => r.id != null && String(r.id).length > 0
              )
              .map(resource => this.mapResource(resource))
          );
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const message =
            error.status === 0
              ? "Impossible de joindre l'API (backend arrete ou mauvais port sur l'hote). Docker : verifier BACKEND_PORT dans .env (souvent 8080) et que le proxy (proxy.conf.js) utilise le meme port."
              : error.message || 'Impossible de charger le catalogue.';
          this.errorMessage.set(message);
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

  featureLabel(feature: string): string {
    return getFeatureLabel(feature);
  }

  /** Titre court (avant « — ») comme sur la maquette Figma. */
  cardTitle(resource: CatalogueResource): string {
    return getResourceDisplayName(resource.source);
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
    const id = String(resource.id);
    const description = resource.description?.trim() || 'Description indisponible.';
    const accessibilityTags = resource.accessibilityTags ?? [];
    const depositAmountCents = resource.depositAmountCents ?? 0;

    const imageUrl = resource.imageUrl?.trim() || null;
    const family = resource.resourceType === 'IMMOBILIER' ? 'ROOM' : 'EQUIPMENT';

    return {
      id,
      name: resource.name ?? 'Ressource',
      description,
      family,
      typeLabel: getResourceTypeLabel(resource.resourceType),
      coverTheme: getResourceCoverTheme(id),
      imageUrl,
      tags: getResourceTags(resource),
      features: accessibilityTags,
      overlayBadges: CatalogueComponent.buildOverlayBadges(family, resource, accessibilityTags),
      pricePerBooking: getResourcePrice(resource),
      depositAmount: Math.round(depositAmountCents / 100),
      source: resource,
    };
  }

  private static buildOverlayBadges(
    family: 'ROOM' | 'EQUIPMENT',
    resource: ResourceDto,
    accessibilityTags: string[]
  ): CoverOverlayBadge[] {
    const badges: CoverOverlayBadge[] = [];
    if (family === 'ROOM' && resource.capacity != null && resource.capacity > 0) {
      badges.push({
        kind: 'capacity',
        value: String(resource.capacity),
        title: `${resource.capacity} places`,
      });
    }
    const set = new Set(accessibilityTags);
    for (const id of CatalogueComponent.OVERLAY_FEATURE_ORDER) {
      if (!set.has(id)) {
        continue;
      }
      const opt = CatalogueComponent.FEATURE_OPTIONS.find(o => o.id === id);
      badges.push({
        kind: 'feature',
        value: opt?.shortLabel ?? id.slice(0, 3),
        title: opt?.label ?? id,
      });
      if (badges.length >= 5) {
        break;
      }
    }
    return badges;
  }

  private formatPrice(amount: number): string {
    return `${amount} EUR`;
  }
}
