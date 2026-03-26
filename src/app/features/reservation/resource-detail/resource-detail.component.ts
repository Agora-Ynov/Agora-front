import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';

import { ResourceDto } from '../../../core/api/models/resource.model';
import { UserProfile } from '../../../core/auth/auth.model';
import { AuthService } from '../../../core/auth/auth.service';
import { CatalogueMockService } from '../catalogue/catalogue-mock.service';
import { ReservationPricingGroup, resolveResourcePricing } from '../catalogue/resource-pricing.utils';
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
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly catalogueMockService = inject(CatalogueMockService);
  private readonly authService = inject(AuthService);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly resource = signal<ResourceDto | null>(null);
  readonly userGroups = signal<ReservationPricingGroup[]>([]);
  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  readonly resourceDetail = computed<ResourceDetailViewModel | null>(() => {
    const resource = this.resource();
    if (!resource) {
      return null;
    }

    const pricing = resolveResourcePricing(resource, this.currentUser(), this.userGroups());
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
      id: resource.id,
      name: getResourceDisplayName(resource),
      description: resource.description ?? 'Description indisponible.',
      typeLabel: getResourceTypeLabel(resource.resourceType),
      coverTheme: getResourceCoverTheme(resource.id),
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
    effect(
      () => {
        this.loadCurrentUserGroups(this.currentUser());
      },
      { allowSignalWrites: true }
    );

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

          return this.catalogueMockService.getResourceById(resourceId);
        })
      )
      .subscribe({
        next: resource => {
          if (!resource) {
            this.errorMessage.set("Cette ressource n'existe pas dans le mock local.");
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
}
