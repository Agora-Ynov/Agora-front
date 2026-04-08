import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';

import { RessourcesService } from '../../../core/api/api/ressources.service';
import { ResourceDto } from '../../../core/api/model/resourceDto';
import { UserProfile } from '../../../core/auth/auth.model';
import { AuthService } from '../../../core/auth/auth.service';
import { JwtService } from '../../../core/auth/jwt.service';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import {
  buildReservationActorOptions,
  ReservationActorOption,
  ReservationPricingGroup,
  ResolvedResourcePricing,
  resolveResourcePricing,
} from '../catalogue/resource-pricing.utils';
import {
  getFeatureCompactLabel,
  getResourceDisplayName,
  getResourcePrice,
} from '../catalogue/resource-presentation.utils';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, RouterLink, FileSizePipe],
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.scss',
})
export class BookingFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly ressourcesService = inject(RessourcesService);
  private readonly authService = inject(AuthService);
  private readonly jwtService = inject(JwtService);
  private readonly destroyRef = inject(DestroyRef);

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly resource = signal<ResourceDto | null>(null);
  /** Remises groupées : endpoint backend à venir (ex-mock JSON). */
  readonly groups = signal<ReservationPricingGroup[]>([]);
  readonly selectedActorId = signal('personal');
  readonly startDateTime = signal('');
  readonly endDateTime = signal('');
  readonly isRecurring = signal(false);
  readonly notes = signal('');
  readonly acceptTerms = signal(false);
  readonly selectedFiles = signal<File[]>([]);

  readonly currentUser = this.authService.currentUser;
  readonly bookingUser = computed<UserProfile | null>(() => {
    const currentUser = this.currentUser();
    if (currentUser) {
      return currentUser;
    }

    const payload = this.jwtService.getPayload();
    if (!payload) {
      return null;
    }

    return {
      id: payload.sub,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      role: payload.role,
      accountType: payload.accountType,
      accountStatus: 'ACTIVE',
      exemptions: {
        association: false,
        social: false,
        mandate: false,
      },
      groupIds: [],
      createdAt: '',
    };
  });

  readonly bookingOptions = computed<ReservationActorOption[]>(() => {
    const resource = this.resource();
    const user = this.bookingUser();

    if (!resource || !user) {
      return [];
    }

    return buildReservationActorOptions(resource, user, this.groups());
  });

  readonly selectedOption = computed(() => {
    const options = this.bookingOptions();
    return options.find(option => option.id === this.selectedActorId()) ?? options[0] ?? null;
  });

  readonly displayedName = computed(() => {
    const resource = this.resource();
    return resource ? getResourceDisplayName(resource) : 'Ressource';
  });

  readonly basePriceCents = computed(() => {
    const resource = this.resource();
    return resource ? getResourcePrice(resource) * 100 : 0;
  });

  readonly pricingSummary = computed<ResolvedResourcePricing | null>(() => {
    const resource = this.resource();
    if (!resource) {
      return null;
    }

    return resolveResourcePricing(resource, this.bookingUser(), this.groups());
  });

  readonly depositAmountCents = computed(() => this.resource()?.depositAmountCents ?? 0);
  readonly summaryTotalCents = computed(
    () => this.pricingSummary()?.finalPriceCents ?? this.basePriceCents()
  );
  readonly summaryDiscountCents = computed(() => this.pricingSummary()?.discountCents ?? 0);
  readonly summaryEquipment = computed(() =>
    (this.resource()?.accessibilityTags ?? []).map(tag => getFeatureCompactLabel(tag))
  );
  readonly activeExemptionLabel = computed(() => {
    const pricing = this.pricingSummary();
    if (!pricing?.discountLabel) {
      return null;
    }

    if (pricing.discountLabel === 'Exoneration mandat electif') {
      return 'Mandat electif (MANDATE)';
    }

    return pricing.discountLabel;
  });
  readonly canSubmit = computed(
    () =>
      !!this.selectedOption() &&
      !!this.startDateTime() &&
      !!this.endDateTime() &&
      this.acceptTerms()
  );

  constructor() {
    if (this.authService.isAuthenticated() && !this.currentUser()) {
      this.authService
        .getCurrentUser()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
        error: () => {
          this.groups.set([]);
        },
      });
    }

    effect(
      () => {
        const resource = this.resource();
        const user = this.bookingUser();

        if (!resource) {
          return;
        }

        this.loadGroupsForUser(user);
      },
      { allowSignalWrites: true }
    );

    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
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
            this.loading.set(false);
            return;
          }

          this.resource.set(resource);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.message || 'Impossible de charger le formulaire de reservation.'
          );
          this.loading.set(false);
        },
      });
  }

  selectActor(actorId: string): void {
    this.selectedActorId.set(actorId);
  }

  updateStartDateTime(value: string): void {
    this.startDateTime.set(value);
  }

  updateEndDateTime(value: string): void {
    this.endDateTime.set(value);
  }

  toggleRecurring(checked: boolean): void {
    this.isRecurring.set(checked);
  }

  updateNotes(value: string): void {
    this.notes.set(value);
  }

  toggleTerms(checked: boolean): void {
    this.acceptTerms.set(checked);
  }

  openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelection(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles.set(Array.from(input.files ?? []));
  }

  formatAmount(amountCents: number): string {
    return `${Math.round(amountCents / 100)}€`;
  }

  private loadGroupsForUser(_user: UserProfile | null): void {
    this.groups.set([]);

    this.http
      .get<ReservationPricingGroup[]>('/assets/mocks/api/groups.get.json')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: groups => {
          this.groups.set(groups.filter(group => user.groupIds.includes(group.id)));
          this.finalizeOptionSelection();
          this.loading.set(false);
        },
        error: () => {
          this.groups.set([]);
          this.finalizeOptionSelection();
          this.loading.set(false);
        },
      });
  }

  private finalizeOptionSelection(): void {
    const options = this.bookingOptions();

    if (!options.some(option => option.id === this.selectedActorId())) {
      this.selectedActorId.set(options[0]?.id ?? 'personal');
    }
  }
}
