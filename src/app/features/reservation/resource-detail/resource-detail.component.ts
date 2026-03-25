import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { ResourceDto } from '../../../core/api/models/resource.model';
import { AuthService } from '../../../core/auth/auth.service';
import { CatalogueMockService } from '../catalogue/catalogue-mock.service';
import {
  getResourceAvailability,
  getResourceCharacteristics,
  getResourceCoverTheme,
  getResourceDisplayName,
  getResourcePrice,
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
  depositLabel: string;
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
  private readonly catalogueMockService = inject(CatalogueMockService);
  private readonly authService = inject(AuthService);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly resource = signal<ResourceDto | null>(null);
  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  readonly resourceDetail = computed<ResourceDetailViewModel | null>(() => {
    const resource = this.resource();
    if (!resource) {
      return null;
    }

    const capacityLabel =
      resource.capacity && resource.capacity > 0
        ? `${resource.capacity} personnes`
        : 'Lot complet disponible';

    return {
      id: resource.id,
      name: getResourceDisplayName(resource),
      description: resource.description ?? 'Description indisponible.',
      typeLabel: getResourceTypeLabel(resource.resourceType),
      coverTheme: getResourceCoverTheme(resource.id),
      capacityLabel,
      priceLabel: `${getResourcePrice(resource)}EUR`,
      depositLabel: `${Math.round((resource.depositAmountCents ?? 0) / 100)}EUR`,
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
}
