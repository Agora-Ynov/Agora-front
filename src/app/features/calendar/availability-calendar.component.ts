import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { CalendarService } from '../../core/api/calendar.service';
import { ResourceService } from '../../core/api/resource.service';
import {
  CalendarDayDto,
  CalendarMonthDto,
  ResourceDto,
} from '../../core/api/models/resource.model';
import { CalendarSlotDto } from '../../core/api/model/calendarSlotDto';

type ResourceFilter = 'ALL' | string;

interface CalendarCellViewModel {
  isoDate: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isBlackout: boolean;
  isReserved: boolean;
  availableCount: number;
  blackoutReason: string | null;
}

interface OccupiedSlotPreview {
  id: string;
  resourceName: string;
  /** Ligne unique : date + horaire (données issues du calendrier API) */
  detailLine: string;
}

/** Détail affiché après clic sur une case (vue connectée = détails ; vue publique + réservé = message minimal). */
interface CalendarDayClickDetail {
  isoDate: string;
  labelDate: string;
  isBlackout: boolean;
  blackoutReason: string | null;
  hasReservedSlots: boolean;
  availableCount: number;
  /** Renseigné seulement si profil chargé : créneaux indisponibles avec ressource + horaires */
  reservedLines: string[];
}

@Component({
  selector: 'app-availability-calendar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './availability-calendar.component.html',
  styleUrl: './availability-calendar.component.scss',
})
export class AvailabilityCalendarComponent {
  private readonly calendarService = inject(CalendarService);
  private readonly resourceService = inject(ResourceService);
  private readonly authService = inject(AuthService);
  /** Date du jour (locale, ISO YYYY-MM-DD) pour la mise en évidence « aujourd'hui » */
  private readonly todayIso = AvailabilityCalendarComponent.computeTodayIso();
  private readonly monthFormatter = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  readonly currentYear = signal(new Date().getFullYear());
  readonly currentMonth = signal(new Date().getMonth() + 1);
  readonly selectedResourceId = signal<ResourceFilter>('ALL');
  readonly resources = signal<ResourceDto[]>([]);
  readonly monthData = signal<CalendarMonthDto | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  /** Jour sélectionné dans la grille (panneau détail). */
  readonly selectedDayIso = signal<string | null>(null);

  /** Profil chargé : affichage des libellés ressource / horaires ; sinon vue « publique ». */
  readonly canViewReservationDetails = computed(() => this.authService.currentUser() !== null);

  readonly activeResources = computed(() =>
    this.resources().filter(resource => resource.isActive !== false)
  );

  readonly monthLabel = computed(() => {
    const label = this.monthFormatter.format(
      new Date(this.currentYear(), this.currentMonth() - 1, 1, 12, 0, 0)
    );
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  readonly visibleCells = computed(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const mondayFirstOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(year, month - 1, 1 - mondayFirstOffset);
    const daysByIso = new Map(
      (this.monthData()?.days ?? [])
        .map(day => {
          const key = this.normalizeCalendarDayKey(day.date);
          return key ? ([key, day] as const) : null;
        })
        .filter((entry): entry is readonly [string, CalendarDayDto] => entry !== null)
    );

    return Array.from({ length: 42 }, (_value, index) => {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + index);

      const isoDate = this.toIsoDate(cellDate);
      const dayData = daysByIso.get(isoDate);
      const dayState = this.resolveDayState(dayData);

      return {
        isoDate,
        dayNumber: cellDate.getDate(),
        inCurrentMonth: cellDate.getMonth() === month - 1,
        isToday: isoDate === this.todayIso,
        isBlackout: dayState.isBlackout,
        isReserved: dayState.isReserved,
        availableCount: dayState.availableCount,
        blackoutReason: dayState.blackoutReason,
      } satisfies CalendarCellViewModel;
    });
  });

  readonly weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  /** Créneaux indisponibles du mois affiché (cohérents avec les seeds back / GET /api/calendar). */
  readonly occupiedSlotsPreview = computed((): OccupiedSlotPreview[] => {
    const data = this.monthData();
    const rid = this.selectedResourceId();
    if (!data?.days?.length) {
      return [];
    }

    const dateFmt = new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const out: OccupiedSlotPreview[] = [];
    for (const day of data.days) {
      const slots = day.slots ?? [];
      const filtered =
        rid === 'ALL' ? slots : slots.filter(s => s.resourceId === rid);
      for (const slot of filtered) {
        if (slot.isAvailable) {
          continue;
        }
        const d = day.date ? new Date(`${day.date}T12:00:00`) : new Date();
        const datePart = Number.isNaN(d.getTime()) ? (day.date ?? '') : dateFmt.format(d);
        out.push({
          id: `${day.date}-${slot.resourceId}-${slot.slotStart}`,
          resourceName: slot.resourceName ?? 'Ressource',
          detailLine: `${datePart} · ${slot.slotStart ?? '?'}–${slot.slotEnd ?? '?'}`,
        });
        if (out.length >= 8) {
          return out;
        }
      }
    }
    return out;
  });

  /** Contenu du panneau sous la grille pour le jour sélectionné. */
  readonly selectedDayPanel = computed((): CalendarDayClickDetail | null => {
    const iso = this.selectedDayIso();
    if (!iso) {
      return null;
    }
    const data = this.monthData();
    const day = data?.days?.find(d => this.normalizeCalendarDayKey(d.date) === iso);

    const dateFmt = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const d = day?.date ? new Date(`${String(day.date).slice(0, 10)}T12:00:00`) : new Date(`${iso}T12:00:00`);
    const labelDate = Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);

    if (!day) {
      return {
        isoDate: iso,
        labelDate,
        isBlackout: false,
        blackoutReason: null,
        hasReservedSlots: false,
        availableCount: 0,
        reservedLines: [],
      };
    }

    const rid = this.selectedResourceId();
    const slots = day.slots ?? [];
    const filtered: CalendarSlotDto[] =
      rid === 'ALL' ? slots : slots.filter(s => String(s.resourceId ?? '') === String(rid));

    const isBlackout = !!day.isBlackout;
    const reservedLines: string[] = [];
    for (const slot of filtered) {
      if (slot.isAvailable) {
        continue;
      }
      const name = slot.resourceName ?? 'Ressource';
      const start = slot.slotStart ?? '?';
      const end = slot.slotEnd ?? '?';
      reservedLines.push(`${name} · ${start} – ${end}`);
    }
    const hasReservedSlots = reservedLines.length > 0;
    const availableCount = filtered.filter(s => s.isAvailable).length;

    return {
      isoDate: iso,
      labelDate,
      isBlackout,
      blackoutReason: day.blackoutReason ?? null,
      hasReservedSlots,
      availableCount,
      reservedLines,
    };
  });

  constructor() {
    this.loadCalendar();
  }

  onCellClick(cell: CalendarCellViewModel, _event: Event): void {
    if (!cell.inCurrentMonth) {
      return;
    }
    const next = this.selectedDayIso() === cell.isoDate ? null : cell.isoDate;
    this.selectedDayIso.set(next);
  }

  onCellKeydown(event: KeyboardEvent, cell: CalendarCellViewModel): void {
    if (!cell.inCurrentMonth) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onCellClick(cell, event);
    }
  }

  closeDayPanel(): void {
    this.selectedDayIso.set(null);
  }

  selectResource(resourceId: ResourceFilter): void {
    this.selectedResourceId.set(resourceId);
    this.selectedDayIso.set(null);
  }

  previousMonth(): void {
    const currentMonth = this.currentMonth();
    const currentYear = this.currentYear();

    if (currentMonth === 1) {
      this.currentMonth.set(12);
      this.currentYear.set(currentYear - 1);
    } else {
      this.currentMonth.set(currentMonth - 1);
    }

    this.loadCalendar();
  }

  nextMonth(): void {
    const currentMonth = this.currentMonth();
    const currentYear = this.currentYear();

    if (currentMonth === 12) {
      this.currentMonth.set(1);
      this.currentYear.set(currentYear + 1);
    } else {
      this.currentMonth.set(currentMonth + 1);
    }

    this.loadCalendar();
  }

  getResourceLabel(resource: ResourceDto): string {
    return resource.name
      .replace(' - Grande salle', '')
      .replace(' - Espace civic', '')
      .replace('des fetes', 'des Fetes')
      .replace('reunion', 'Reunion');
  }

  trackByCellDate(_index: number, cell: CalendarCellViewModel): string {
    return cell.isoDate;
  }

  private loadCalendar(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      resources: this.resourceService.getAll().pipe(
        catchError(err => {
          if (environment.debugCalendar) {
            const httpErr = err as HttpErrorResponse;
            console.error('[Agora][Calendar] GET /api/resources a echoue — la grille utilise quand meme le calendrier.', {
              status: httpErr.status,
              url: httpErr.url,
              message: httpErr.message,
            });
          }
          return of<ResourceDto[]>([]);
        })
      ),
      month: this.calendarService.getMonth(this.currentYear(), this.currentMonth()).pipe(
        catchError(err => {
          if (environment.debugCalendar) {
            const httpErr = err as HttpErrorResponse;
            console.error('[Agora][Calendar] GET /api/calendar a echoue.', {
              status: httpErr.status,
              url: httpErr.url,
              message: httpErr.message,
            });
          }
          return of<CalendarMonthDto | null>(null);
        })
      ),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ resources, month }) => {
          if (environment.debugCalendar) {
            const days = month?.days ?? [];
            const firstKey = days[0]?.date != null ? this.normalizeCalendarDayKey(days[0].date) : null;
            // console.info (pas debug) : Chrome masque souvent « Verbose » / console.debug par défaut.
            console.info('[Agora][Calendar] charge', {
              resourcesCount: resources.length,
              monthYear: month?.year,
              monthMonth: month?.month,
              daysLength: days.length,
              firstDayKeyNormalized: firstKey,
              firstCellSample: (() => {
                const y = this.currentYear();
                const m = this.currentMonth();
                const firstDayOfMonth = new Date(y, m - 1, 1);
                const mondayFirstOffset = (firstDayOfMonth.getDay() + 6) % 7;
                const gridStart = new Date(y, m - 1, 1 - mondayFirstOffset);
                const cellDate = new Date(gridStart);
                cellDate.setDate(gridStart.getDate() + 6);
                return this.toIsoDate(cellDate);
              })(),
            });
          }

          this.resources.set(resources);
          this.monthData.set(month);
          this.selectedDayIso.set(null);
          this.errorMessage.set(month ? '' : 'Impossible de charger les jours du calendrier.');
        },
        error: () => {
          this.resources.set([]);
          this.monthData.set(null);
          this.errorMessage.set('Impossible de charger le calendrier des disponibilites.');
        },
      });
  }

  /**
   * Clef de jour alignee sur {@link #toIsoDate} : l'API peut renvoyer `2026-03-01` ou `2026-03-01T00:00:00`.
   */
  private normalizeCalendarDayKey(raw: string | number[] | undefined): string {
    if (raw == null || raw === '') {
      return '';
    }
    if (typeof raw === 'string') {
      return raw.length >= 10 ? raw.slice(0, 10) : raw;
    }
    if (Array.isArray(raw) && raw.length >= 3) {
      const y = raw[0];
      const m = raw[1];
      const d = raw[2];
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return '';
  }

  private static computeTodayIso(): string {
    const n = new Date();
    const y = n.getFullYear();
    const mo = String(n.getMonth() + 1).padStart(2, '0');
    const d = String(n.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }

  private resolveDayState(day: CalendarDayDto | undefined): {
    isBlackout: boolean;
    isReserved: boolean;
    availableCount: number;
    blackoutReason: string | null;
  } {
    if (!day) {
      return {
        isBlackout: false,
        isReserved: false,
        availableCount: 0,
        blackoutReason: null,
      };
    }

    const selectedResourceId = this.selectedResourceId();
    const slots = day.slots ?? [];
    const filteredSlots =
      selectedResourceId === 'ALL'
        ? slots
        : slots.filter(slot => slot.resourceId === selectedResourceId);

    return {
      isBlackout: !!day.isBlackout,
      isReserved: filteredSlots.some(slot => !slot.isAvailable),
      availableCount: filteredSlots.filter(slot => slot.isAvailable).length,
      blackoutReason: day.blackoutReason ?? null,
    };
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
