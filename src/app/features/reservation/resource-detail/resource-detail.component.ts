import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';

import { RessourcesService } from '../../../core/api/api/ressources.service';
import { ResourceDto } from '../../../core/api/model/resourceDto';
import { AuthService } from '../../../core/auth/auth.service';
import {
  ReservationPricingGroup,
  resolveResourcePricing,
} from '../catalogue/resource-pricing.utils';
import {
  getResourceAvailability,
  getResourceCharacteristics,
  getResourceCoverTheme,
  getResourceDisplayName,
  getResourceTypeLabel,
  ResourceCoverTheme,
} from '../catalogue/resource-presentation.utils';

interface ResourceDetailViewModel {
  id: string;
  name: string;
  description: string;
  typeLabel: string;
  coverTheme: ResourceCoverTheme;
  capacityLabel: string;
  priceLabel: string;
  priceHint: string;
  depositLabel: string;
  depositPill: string;
  depositHint: string;
  availability: string[];
  characteristics: string[];
}

@Component({
  selector: 'app-resource-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './resource-detail.component.html',
  styleUrl: './resource-detail.component.scss',
})
export class ResourceDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly ressourcesService = inject(RessourcesService);
  private readonly authService = inject(AuthService);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly resource = signal<ResourceDto | null>(null);
  /** Tarification groupée : pas encore fournie par l’API (ex-mock JSON). */
  readonly userGroups = signal<ReservationPricingGroup[]>([]);
  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  readonly resourceDetail = computed<ResourceDetailViewModel | null>(() => {
    const resource = this.resource();
    if (!resource) {
      return null;
    }

    const pricing = resolveResourcePricing(resource, this.currentUser(), this.userGroups());
    const resourceId = String(resource.id ?? '');
    const capacityLabel =
      resource.capacity && resource.capacity > 0
        ? `${resource.capacity} personnes`
        : 'Lot complet disponible';
    const priceLabel =
      pricing.finalPriceCents === 0 ? 'Gratuit' : `${pricing.finalPriceCents / 100}EUR`;
    const priceHint = this.isAuthenticated()
      ? pricing.discountLabel
        ? `${pricing.discountLabel} applique automatiquement a votre profil.`
        : 'Tarif applique selon votre profil et vos groupes.'
      : 'Connectez-vous pour voir votre tarif selon votre profil et vos groupes.';
    const depositPill = pricing.isDepositExempt ? 'Exoneree' : 'A deposer';
    const depositHint = pricing.isDepositExempt
      ? 'Cette caution est prise en charge par votre exoneration actuelle.'
      : 'Cette caution est remboursable apres restitution. Elle peut etre exoneree selon votre situation ou votre groupe.';

    return {
      id: resourceId,
      name: getResourceDisplayName(resource),
      description: resource.description ?? 'Description indisponible.',
      typeLabel: getResourceTypeLabel(resource.resourceType),
      coverTheme: getResourceCoverTheme(resourceId),
      capacityLabel,
      priceLabel,
      priceHint,
      depositLabel: `${Math.round((resource.depositAmountCents ?? 0) / 100)}EUR`,
      depositPill,
      depositHint,
      availability: getResourceAvailability(resource),
      characteristics: getResourceCharacteristics(resource),
    };
  });

  constructor() {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(),
        map(params => params.get('id')),
        switchMap(resourceId => {
          this.loading.set(true);
          this.errorMessage.set(null);
          this.resource.set(null);

          if (!resourceId) {
            return of(null);
          }

          return this.ressourcesService.getResourceById(resourceId, 'body', false, {
            transferCache: false,
          });
        })
      )
      .subscribe({
        next: resource => {
          if (!resource) {
            this.errorMessage.set("Cette ressource n'existe pas.");
          } else {
            this.resource.set(resource);
            this.errorMessage.set(null);
          }

          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.message || 'Impossible de charger le detail de la ressource.'
          );
          this.loading.set(false);
        },
      });
  }

  logout(): void {
    this.authService.logout();
  }
}
