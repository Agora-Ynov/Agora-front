import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map, of, switchMap } from 'rxjs';

import { GroupsService } from '../../../core/api/groups.service';
import { ResourceDto } from '../../../core/api/models/resource.model';
import { ResourceService } from '../../../core/api/resource.service';
import { AuthService } from '../../../core/auth/auth.service';
import { mapUserGroupsApiToPricing } from '../catalogue/group-api.mapper';
import {
  describeRentalPriceLabel,
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
  imageUrl: string | null;
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
  private readonly resourceService = inject(ResourceService);
  private readonly authService = inject(AuthService);
  private readonly groupsService = inject(GroupsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly resource = signal<ResourceDto | null>(null);
  /** Groupes utilisateur (`GET /api/groups`). */
  readonly userGroups = signal<ReservationPricingGroup[]>([]);
  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = this.authService.isSessionActive;

  readonly resourceDetail = computed<ResourceDetailViewModel | null>(() => {
    const resource = this.resource();
    if (!resource) {
      return null;
    }

    const pricing = resolveResourcePricing(resource, this.currentUser(), this.userGroups());
    const resourceId = String(resource.id ?? '');
    const capacityLabel = (() => {
      if (resource.resourceType === 'MOBILIER') {
        return resource.capacity != null && resource.capacity > 0
          ? `${resource.capacity} unites`
          : '—';
      }
      if (resource.capacity != null && resource.capacity > 0) {
        return `${resource.capacity} personnes`;
      }
      return 'Non renseignee';
    })();
    const priceLabel = describeRentalPriceLabel(pricing, euros => `${euros}EUR`);
    const priceHint = this.isAuthenticated()
      ? pricing.discountLabel
        ? `${pricing.discountLabel} applique automatiquement a votre profil.`
        : 'Tarif applique selon votre profil et vos groupes.'
      : 'Connectez-vous pour voir votre tarif selon votre profil et vos groupes.';
    const depositPill = pricing.isDepositExempt ? 'Exoneree' : 'A deposer';
    const depositHint = pricing.isDepositExempt
      ? 'Cette caution est prise en charge par votre exoneration actuelle.'
      : 'Cette caution est remboursable apres restitution. Elle peut etre exoneree selon votre situation ou votre groupe.';

    const desc = (resource.description ?? '').trim();
    return {
      id: resourceId,
      name: getResourceDisplayName(resource),
      description: desc || 'Aucune description renseignee pour cette ressource.',
      typeLabel: getResourceTypeLabel(resource.resourceType),
      coverTheme: getResourceCoverTheme(resourceId),
      imageUrl: resource.imageUrl?.trim() ? resource.imageUrl.trim() : null,
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
    toObservable(this.authService.currentUser)
      .pipe(
        distinctUntilChanged((a, b) => a?.id === b?.id),
        switchMap(user => (user ? this.groupsService.getMyGroups() : of([]))),
        map(rows => mapUserGroupsApiToPricing(rows)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(groups => this.userGroups.set(groups));

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

          return this.resourceService.getById(resourceId);
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
