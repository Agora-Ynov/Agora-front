import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError,
  combineLatest,
  finalize,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';

import { GroupsService } from '../../../core/api/groups.service';
import { ReservationDocumentsService } from '../../../core/api/api/reservationDocuments.service';
import { ReservationsService } from '../../../core/api/api/reservations.service';
import { CreateRecurringReservationRequestDto } from '../../../core/api/model/createRecurringReservationRequestDto';
import { CreateReservationRequestDto } from '../../../core/api/model/createReservationRequestDto';
import { LocalTime } from '../../../core/api/model/localTime';
import { ResourceDto } from '../../../core/api/models/resource.model';
import { ResourceService } from '../../../core/api/resource.service';
import { UserProfile } from '../../../core/auth/auth.model';
import { AuthService } from '../../../core/auth/auth.service';
import { JwtService } from '../../../core/auth/jwt.service';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import {
  parseQueryDateTimeLocalToValue,
  toDateTimeLocalValue,
} from '../../../shared/utils/datetime-local';
import { mapUserGroupsApiToPricing } from '../catalogue/group-api.mapper';
import {
  buildReservationActorOptions,
  ReservationActorOption,
  ReservationPricingGroup,
  ResolvedResourcePricing,
  resolveResourcePricing,
} from '../catalogue/resource-pricing.utils';
import { getFeatureCompactLabel } from '../catalogue/resource-presentation.utils';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, RouterLink, FileSizePipe],
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.scss',
})
export class BookingFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly resourceService = inject(ResourceService);
  private readonly reservationsApi = inject(ReservationsService);
  private readonly reservationDocumentsApi = inject(ReservationDocumentsService);
  private readonly authService = inject(AuthService);
  private readonly jwtService = inject(JwtService);
  private readonly groupsService = inject(GroupsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly resource = signal<ResourceDto | null>(null);
  /** Remises groupées : endpoint backend à venir (ex-mock JSON). */
  readonly groups = signal<ReservationPricingGroup[]>([]);
  readonly selectedActorId = signal('personal');
  readonly startDateTime = signal('');
  readonly endDateTime = signal('');
  readonly isRecurring = signal(false);
  /** Dernier jour inclus de la série (aligné sur CreateRecurringReservationRequestDto.endDate). */
  readonly recurrenceEndDate = signal('');
  readonly recurrenceFrequency = signal<CreateRecurringReservationRequestDto.FrequencyEnum>(
    CreateRecurringReservationRequestDto.FrequencyEnum.Weekly
  );
  readonly recurrenceFrequencyOptions = CreateRecurringReservationRequestDto.FrequencyEnum;
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

    const jwtRoles = this.jwtService.getEffectiveRoles();
    const primary = jwtRoles[0] ?? payload.role;
    return {
      id: payload.sub,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      role: primary,
      membershipRoles: jwtRoles.length ? jwtRoles : [primary],
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

  /** Libellé catalogue tel que renvoyé par l’API (récap, confirmation). */
  readonly recapResourceName = computed(() => {
    const resource = this.resource();
    const raw = (resource?.name ?? '').trim();
    return raw || 'Ressource';
  });

  readonly pricingSummary = computed<ResolvedResourcePricing | null>(() => {
    const resource = this.resource();
    if (!resource) {
      return null;
    }

    return resolveResourcePricing(resource, this.bookingUser(), this.groups());
  });

  readonly depositAmountCents = computed(() => this.resource()?.depositAmountCents ?? 0);
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
  /** Aligné sur ReservationServiceImpl : date strictement avant LocalDate.now() refusée. */
  readonly reservationDateInPast = computed(() => this.isReservationDateInPast());

  readonly canSubmit = computed(() => {
    const base =
      !!this.selectedOption() &&
      !!this.startDateTime() &&
      !!this.endDateTime() &&
      this.acceptTerms() &&
      !this.submitting() &&
      !this.reservationDateInPast();

    if (!base) {
      return false;
    }

    if (!this.isRecurring()) {
      return true;
    }

    const endSerie = this.recurrenceEndDate().trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endSerie)) {
      return false;
    }
    const start = this.parseDateTimeLocal(this.startDateTime());
    if (!start || endSerie < start.date) {
      return false;
    }
    return true;
  });

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

    combineLatest([toObservable(this.resource), toObservable(this.bookingUser)])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(([resource, user]) => {
          if (!resource) {
            return of(void 0);
          }
          if (!user) {
            this.groups.set([]);
            this.finalizeOptionSelection();
            return of(void 0);
          }
          return this.groupsService.getMyGroups().pipe(
            map(mapUserGroupsApiToPricing),
            tap(groups => this.groups.set(groups)),
            tap(() => this.finalizeOptionSelection()),
            catchError(() => {
              this.groups.set([]);
              this.finalizeOptionSelection();
              return of(void 0);
            })
          );
        })
      )
      .subscribe();

    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map(([params, queryParams]) => ({
          resourceId: params.get('id'),
          date: queryParams.get('date'),
          slotStart: queryParams.get('slotStart'),
          slotEnd: queryParams.get('slotEnd'),
          startDateTime: queryParams.get('startDateTime'),
          endDateTime: queryParams.get('endDateTime'),
        })),
        switchMap(({ resourceId, date, slotStart, slotEnd, startDateTime, endDateTime }) => {
          this.loading.set(true);
          this.errorMessage.set(null);
          this.resource.set(null);
          this.applyPrefilledSlot(date, slotStart, slotEnd, startDateTime, endDateTime);

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
    this.submitError.set(null);
  }

  updateStartDateTime(value: string): void {
    this.startDateTime.set(value);
    this.submitError.set(null);
  }

  updateEndDateTime(value: string): void {
    this.endDateTime.set(value);
    this.submitError.set(null);
  }

  toggleRecurring(checked: boolean): void {
    this.isRecurring.set(checked);
    this.submitError.set(null);
    if (checked) {
      const start = this.parseDateTimeLocal(this.startDateTime());
      if (start && !this.recurrenceEndDate().trim()) {
        this.recurrenceEndDate.set(this.addWeeksToIsoDate(start.date, 4));
      }
    }
  }

  updateRecurrenceEndDate(value: string): void {
    this.recurrenceEndDate.set(value);
    this.submitError.set(null);
  }

  updateRecurrenceFrequency(value: string): void {
    const v = value as CreateRecurringReservationRequestDto.FrequencyEnum;
    if (
      v === CreateRecurringReservationRequestDto.FrequencyEnum.Weekly ||
      v === CreateRecurringReservationRequestDto.FrequencyEnum.Biweekly ||
      v === CreateRecurringReservationRequestDto.FrequencyEnum.Monthly
    ) {
      this.recurrenceFrequency.set(v);
    }
    this.submitError.set(null);
  }

  updateNotes(value: string): void {
    this.notes.set(value);
    this.submitError.set(null);
  }

  toggleTerms(checked: boolean): void {
    this.acceptTerms.set(checked);
  }

  confirmReservation(): void {
    if (!this.canSubmit()) {
      return;
    }

    const resource = this.resource();
    const option = this.selectedOption();
    if (!resource?.id || !option) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    if (this.isRecurring()) {
      const recurringBody = this.buildCreateRecurringReservationRequest(resource.id);
      if (!recurringBody) {
        this.submitting.set(false);
        return;
      }

      this.reservationsApi
        .createRecurringReservations(recurringBody, 'body', false, { transferCache: false })
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          switchMap(summaries =>
            this.uploadPendingDocuments(summaries[0]?.id).pipe(map(() => summaries))
          ),
          finalize(() => this.submitting.set(false))
        )
        .subscribe({
          next: summaries => {
            const firstId = summaries[0]?.id ?? '';
            const count = summaries.length;
            const queryParams: Record<string, string> = {};
            if (firstId) {
              queryParams['created'] = firstId;
              if (count > 1) {
                queryParams['recurringCount'] = String(count);
              }
            }
            void this.router.navigate(['/reservations'], { queryParams });
          },
          error: (error: HttpErrorResponse) => {
            this.submitError.set(this.mapReservationError(error));
          },
        });
      return;
    }

    const body = this.buildCreateReservationRequest(resource.id);
    if (!body) {
      this.submitting.set(false);
      return;
    }

    this.reservationsApi
      .createReservation(body, 'body', false, { transferCache: false })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(detail => this.uploadPendingDocuments(detail.id).pipe(map(() => detail))),
        finalize(() => this.submitting.set(false))
      )
      .subscribe({
        next: detail => {
          const id = detail.id ?? '';
          void this.router.navigate(['/reservations'], {
            queryParams: id ? { created: id } : {},
          });
        },
        error: (error: HttpErrorResponse) => {
          this.submitError.set(this.mapReservationError(error));
        },
      });
  }

  openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelection(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles.set(Array.from(input.files ?? []));
  }

  private applyPrefilledSlot(
    date: string | null,
    slotStart: string | null,
    slotEnd: string | null,
    startDateTime: string | null,
    endDateTime: string | null
  ): void {
    const d = date?.trim() ?? '';
    const ss = slotStart?.trim() ?? '';
    const se = slotEnd?.trim() ?? '';

    // Priorité : date + créneaux (calendrier) → forme canonique pour datetime-local
    const fromDateSlotsStart = d && ss ? toDateTimeLocalValue(d, ss) : null;
    const fromDateSlotsEnd = d && se ? toDateTimeLocalValue(d, se) : null;

    if (fromDateSlotsStart) {
      this.startDateTime.set(fromDateSlotsStart);
    } else if (startDateTime?.trim()) {
      const parsed = parseQueryDateTimeLocalToValue(startDateTime);
      if (parsed) {
        this.startDateTime.set(parsed);
      }
    }

    if (fromDateSlotsEnd) {
      this.endDateTime.set(fromDateSlotsEnd);
    } else if (endDateTime?.trim()) {
      const parsed = parseQueryDateTimeLocalToValue(endDateTime);
      if (parsed) {
        this.endDateTime.set(parsed);
      }
    }
  }

  formatAmount(amountCents: number): string {
    return `${Math.round(amountCents / 100)}€`;
  }

  private buildCreateReservationRequest(resourceId: string): CreateReservationRequestDto | null {
    const start = this.parseDateTimeLocal(this.startDateTime());
    const end = this.parseDateTimeLocal(this.endDateTime());
    if (!start || !end) {
      this.submitError.set('Dates et heures invalides. Utilisez le selecteur date/heure complet.');
      return null;
    }

    if (start.date !== end.date) {
      this.submitError.set(
        'Pour cette etape, la reservation doit commencer et se terminer le meme jour (comme sur le calendrier).'
      );
      return null;
    }

    const todayIso = this.localDateTodayIso();
    if (start.date < todayIso) {
      this.submitError.set('La date de reservation ne peut pas etre dans le passe.');
      return null;
    }

    const startMin = start.time.hour! * 60 + start.time.minute!;
    const endMin = end.time.hour! * 60 + end.time.minute!;
    if (startMin >= endMin) {
      this.submitError.set("L'heure de fin doit etre apres l'heure de debut.");
      return null;
    }

    const purpose = this.notes().trim();
    if (purpose.length < 3) {
      this.submitError.set(
        "Precisez l'objet de la reservation (au moins 3 caracteres) dans le commentaire."
      );
      return null;
    }

    const option = this.selectedOption()!;
    const groupId = this.resolveGroupIdFromActor(option.id);

    /**
     * Le back attend des LocalTime JSON en chaîne ISO (ex. "09:00:00"). Les objets
     * { hour, minute } du client OpenAPI sérialisent en objet et provoquent HttpMessageNotReadableException.
     */
    return {
      resourceId,
      date: start.date,
      slotStart: this.toBackendLocalTimeString(start.time),
      slotEnd: this.toBackendLocalTimeString(end.time),
      purpose,
      ...(groupId ? { groupId } : {}),
    } as CreateReservationRequestDto;
  }

  private buildCreateRecurringReservationRequest(
    resourceId: string
  ): CreateRecurringReservationRequestDto | null {
    const start = this.parseDateTimeLocal(this.startDateTime());
    const end = this.parseDateTimeLocal(this.endDateTime());
    if (!start || !end) {
      this.submitError.set('Dates et heures invalides. Utilisez le selecteur date/heure complet.');
      return null;
    }

    if (start.date !== end.date) {
      this.submitError.set(
        'Pour cette etape, la reservation doit commencer et se terminer le meme jour (comme sur le calendrier).'
      );
      return null;
    }

    const todayIso = this.localDateTodayIso();
    if (start.date < todayIso) {
      this.submitError.set('La date de reservation ne peut pas etre dans le passe.');
      return null;
    }

    const startMin = start.time.hour! * 60 + start.time.minute!;
    const endMin = end.time.hour! * 60 + end.time.minute!;
    if (startMin >= endMin) {
      this.submitError.set("L'heure de fin doit etre apres l'heure de debut.");
      return null;
    }

    const purpose = this.notes().trim();
    if (purpose.length < 3) {
      this.submitError.set(
        "Precisez l'objet de la reservation (au moins 3 caracteres) dans le commentaire."
      );
      return null;
    }

    const seriesEnd = this.recurrenceEndDate().trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(seriesEnd)) {
      this.submitError.set('Indiquez une date de fin de serie valide (AAAA-MM-JJ).');
      return null;
    }
    if (seriesEnd < start.date) {
      this.submitError.set(
        'La fin de la serie doit etre le meme jour ou apres le premier creneau.'
      );
      return null;
    }

    const option = this.selectedOption()!;
    const groupId = this.resolveGroupIdFromActor(option.id);

    return {
      resourceId,
      slotStart: this.toBackendLocalTimeString(start.time),
      slotEnd: this.toBackendLocalTimeString(end.time),
      purpose,
      ...(groupId ? { groupId } : {}),
      frequency: this.recurrenceFrequency(),
      startDate: start.date,
      endDate: seriesEnd,
    } as CreateRecurringReservationRequestDto;
  }

  private uploadPendingDocuments(reservationId: string | undefined): Observable<void> {
    const id = reservationId?.trim();
    const files = this.selectedFiles();
    if (!id || !files.length) {
      return of(void 0);
    }

    return forkJoin(
      files.map(file =>
        this.reservationDocumentsApi.uploadDocument(id, 'OTHER', file, 'body', false, {
          transferCache: false,
        })
      )
    ).pipe(
      map(() => void 0),
      catchError(() => {
        this.submitError.set(
          "Reservation creee, mais l'envoi d'au moins une piece jointe a echoue. Ajoutez les fichiers depuis le detail dans Mes reservations."
        );
        return of(void 0);
      })
    );
  }

  private addWeeksToIsoDate(iso: string, weeks: number): string {
    const [y, m, day] = iso.split('-').map(Number);
    const d = new Date(y, m - 1, day, 12, 0, 0);
    d.setDate(d.getDate() + weeks * 7);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  private toBackendLocalTimeString(t: LocalTime): LocalTime {
    const h = String(t.hour ?? 0).padStart(2, '0');
    const m = String(t.minute ?? 0).padStart(2, '0');
    const s = String(t.second ?? 0).padStart(2, '0');
    return `${h}:${m}:${s}` as unknown as LocalTime;
  }

  private parseDateTimeLocal(value: string): { date: string; time: LocalTime } | null {
    if (!value?.includes('T')) {
      return null;
    }
    const [date, timePart] = value.split('T');
    const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(timePart);
    if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return null;
    }
    return {
      date,
      time: {
        hour: Number(match[1]),
        minute: Number(match[2]),
        second: match[3] !== undefined ? Number(match[3]) : 0,
      },
    };
  }

  /** Les acteurs « personal » et « council » ne passent pas de groupId API (groupe réservé aux UUID réels). */
  private resolveGroupIdFromActor(actorId: string): string | undefined {
    if (actorId === 'personal' || actorId === 'council') {
      return undefined;
    }
    return actorId;
  }

  private mapReservationError(error: HttpErrorResponse): string {
    const api = error.error as { message?: string; code?: string } | null;
    if (api?.message && typeof api.message === 'string') {
      return api.message;
    }
    switch (error.status) {
      case 409:
        return "Ce creneau n'est plus disponible. Choisissez un autre horaire.";
      case 403:
        return "Reservation refusee : verifiez les droits ou l'appartenance au groupe selectionne.";
      case 400:
        return 'Donnees invalides. Verifiez date et heures.';
      case 401:
        return 'Session expirée. Reconnectez-vous.';
      default:
        return error.message || 'Impossible de confirmer la reservation.';
    }
  }

  private finalizeOptionSelection(): void {
    const options = this.bookingOptions();

    if (!options.some(option => option.id === this.selectedActorId())) {
      this.selectedActorId.set(options[0]?.id ?? 'personal');
    }
  }

  private localDateTodayIso(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private isReservationDateInPast(): boolean {
    const start = this.parseDateTimeLocal(this.startDateTime());
    if (!start) {
      return false;
    }
    return start.date < this.localDateTodayIso();
  }
}
