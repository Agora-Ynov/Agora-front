import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { finalize, forkJoin, of, switchMap } from 'rxjs';
import { CalendarService } from '../../core/api/calendar.service';
import { ResourceService } from '../../core/api/resource.service';
import { CalendarResponseDto } from '../../core/api/model/calendarResponseDto';
import { CalendarDayDto, CalendarSlotDto, ResourceDto } from '../../core/api/models/resource.model';
import { toDateTimeLocalValue } from '../../shared/utils/datetime-local';

interface CalendarMonthRequest {
  key: string;
  year: number;
  month: number;
}

interface WeekDayViewModel {
  isoDate: string;
  shortLabel: string;
  dayLabel: string;
  isToday: boolean;
  isPast: boolean;
  isBlackout: boolean;
  blackoutReason: string | null;
  cells: WeekCellViewModel[];
}

interface WeekCellViewModel {
  isoDate: string;
  slotStart: string;
  slotEnd: string;
  isAvailable: boolean;
  isReserved: boolean;
}

interface SelectedRange {
  date: string;
  slotStart: string;
  slotEnd: string;
}

interface TimeRowViewModel {
  label: string;
}

@Component({
  selector: 'app-availability-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './availability-calendar.component.html',
  styleUrl: './availability-calendar.component.scss',
})
export class AvailabilityCalendarComponent {
  private readonly calendarService = inject(CalendarService);
  private readonly resourceService = inject(ResourceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  /** Date locale du jour (YYYY-MM-DD), alignée avec les comparaisons ISO du back. */
  private readonly todayIso = this.toIsoDate(
    new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12, 0, 0)
  );
  private readonly dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  private readonly dayNumberFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
  private readonly fullDateFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  private readonly scheduleStartMinutes = 8 * 60;
  private readonly scheduleEndMinutes = 20 * 60;
  private readonly slotStepMinutes = 30;

  /** Nombre de lignes 30 min (doit rester aligné avec le SCSS du board). */
  readonly slotRowCount =
    (this.scheduleEndMinutes - this.scheduleStartMinutes) / this.slotStepMinutes;

  readonly currentWeekStart = signal(this.getStartOfWeek(this.fromIsoDate(this.todayIso)));
  readonly selectedResourceId = signal<string | null>(null);
  readonly resources = signal<ResourceDto[]>([]);
  readonly monthData = signal<Record<string, CalendarResponseDto>>({});
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly selectedRange = signal<SelectedRange | null>(null);

  readonly activeResources = computed(() =>
    this.resources().filter(resource => resource.isActive !== false)
  );

  readonly weekLabel = computed(() => {
    const start = this.currentWeekStart();
    const end = this.addDays(start, 6);

    return `Semaine du ${this.fullDateFormatter.format(start)} au ${this.fullDateFormatter.format(end)}`;
  });

  readonly timeRows = computed(() => {
    const rows: TimeRowViewModel[] = [];

    for (
      let minutes = this.scheduleStartMinutes;
      minutes < this.scheduleEndMinutes;
      minutes += this.slotStepMinutes
    ) {
      rows.push({
        label: `${this.formatMinutes(minutes)} - ${this.formatMinutes(minutes + this.slotStepMinutes)}`,
      });
    }

    return rows;
  });

  readonly selectionLabel = computed(() => {
    const selection = this.selectedRange();
    if (!selection) {
      return null;
    }

    return `${this.formatIsoDate(selection.date)} • ${selection.slotStart} - ${selection.slotEnd}`;
  });

  readonly weekDays = computed(() => {
    const selectedResourceId = this.selectedResourceId();

    return Array.from({ length: 7 }, (_value, index) => {
      const date = this.addDays(this.currentWeekStart(), index);
      const isoDate = this.toIsoDate(date);
      const day = this.getCalendarDay(isoDate);
      const daySlots = selectedResourceId
        ? (day?.slots?.filter(slot => slot.resourceId === selectedResourceId) ?? [])
        : [];

      return {
        isoDate,
        shortLabel: this.getWeekdayLabel(date),
        dayLabel: this.dayNumberFormatter.format(date),
        isToday: isoDate === this.todayIso,
        isPast: isoDate < this.todayIso,
        isBlackout: day?.isBlackout ?? false,
        blackoutReason: day?.blackoutReason ?? null,
        cells: this.buildDayCells(isoDate, daySlots),
      } satisfies WeekDayViewModel;
    });
  });

  constructor() {
    const fromSnapshot = this.route.snapshot.queryParamMap.get('resourceId');
    if (fromSnapshot?.trim()) {
      this.selectedResourceId.set(fromSnapshot.trim());
    }

    this.route.queryParamMap
      .pipe(
        map(params => params.get('resourceId')?.trim() ?? null),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(resourceId => {
        if (resourceId && resourceId !== this.selectedResourceId()) {
          this.selectResource(resourceId);
        }
      });

    this.loadWeek(this.currentWeekStart());
  }

  selectResource(resourceId: string): void {
    this.selectedResourceId.set(resourceId);
    this.selectedRange.set(null);
    this.loadWeek(this.currentWeekStart());
  }

  previousWeek(): void {
    const nextWeek = this.addDays(this.currentWeekStart(), -7);
    this.currentWeekStart.set(nextWeek);
    this.loadWeek(nextWeek);
  }

  nextWeek(): void {
    const nextWeek = this.addDays(this.currentWeekStart(), 7);
    this.currentWeekStart.set(nextWeek);
    this.loadWeek(nextWeek);
  }

  trackByResource(_index: number, resource: ResourceDto): string {
    return resource.id;
  }

  trackByDay(_index: number, day: WeekDayViewModel): string {
    return day.isoDate;
  }

  trackBySlot(_index: number, slot: WeekCellViewModel): string {
    return `${slot.isoDate}-${slot.slotStart}-${slot.slotEnd}`;
  }

  getResourceLabel(resource: ResourceDto): string {
    return resource.name
      .replace(' - Grande salle', '')
      .replace(' - Espace civic', '')
      .replace('des fetes', 'des Fetes')
      .replace('reunion', 'Reunion');
  }

  isCellSelected(day: WeekDayViewModel, cell: WeekCellViewModel): boolean {
    const selection = this.selectedRange();
    if (!selection || selection.date !== day.isoDate) {
      return false;
    }

    const cellStart = this.parseTime(cell.slotStart);
    const selectedStart = this.parseTime(selection.slotStart);
    const selectedEnd = this.parseTime(selection.slotEnd);

    return cellStart >= selectedStart && cellStart < selectedEnd;
  }

  selectCell(day: WeekDayViewModel, cell: WeekCellViewModel): void {
    if (!cell.isAvailable || day.isPast || day.isBlackout) {
      return;
    }

    const currentSelection = this.selectedRange();
    if (!currentSelection || currentSelection.date !== day.isoDate) {
      this.selectedRange.set({
        date: day.isoDate,
        slotStart: cell.slotStart,
        slotEnd: cell.slotEnd,
      });
      return;
    }

    const clickedStart = this.parseTime(cell.slotStart);
    const clickedEnd = this.parseTime(cell.slotEnd);
    const selectedStart = this.parseTime(currentSelection.slotStart);
    const selectedEnd = this.parseTime(currentSelection.slotEnd);

    if (clickedStart === selectedStart && clickedEnd === selectedEnd) {
      this.selectedRange.set(null);
      return;
    }

    if (
      clickedEnd === selectedStart &&
      this.isRangeAvailable(day, cell.slotStart, currentSelection.slotEnd)
    ) {
      this.selectedRange.set({
        date: day.isoDate,
        slotStart: cell.slotStart,
        slotEnd: currentSelection.slotEnd,
      });
      return;
    }

    if (
      clickedStart === selectedEnd &&
      this.isRangeAvailable(day, currentSelection.slotStart, cell.slotEnd)
    ) {
      this.selectedRange.set({
        date: day.isoDate,
        slotStart: currentSelection.slotStart,
        slotEnd: cell.slotEnd,
      });
      return;
    }

    if (clickedStart >= selectedStart && clickedStart < selectedEnd) {
      this.selectedRange.set({
        date: day.isoDate,
        slotStart: cell.slotStart,
        slotEnd: cell.slotEnd,
      });
      return;
    }

    this.selectedRange.set({
      date: day.isoDate,
      slotStart: cell.slotStart,
      slotEnd: cell.slotEnd,
    });
  }

  submitSelection(): void {
    const selection = this.selectedRange();
    const resourceId = this.selectedResourceId();

    if (!selection || !resourceId) {
      return;
    }

    const startDateTime = toDateTimeLocalValue(selection.date, selection.slotStart);
    const endDateTime = toDateTimeLocalValue(selection.date, selection.slotEnd);
    if (!startDateTime || !endDateTime) {
      return;
    }

    void this.router.navigate(['/catalogue', resourceId, 'reserver'], {
      queryParams: {
        date: selection.date,
        slotStart: selection.slotStart,
        slotEnd: selection.slotEnd,
        startDateTime,
        endDateTime,
      },
    });
  }

  private loadWeek(weekStart: Date): void {
    const requests = this.getMonthRequestsForWeek(weekStart);

    this.loading.set(true);
    this.errorMessage.set('');

    this.resourceService
      .getAll()
      .pipe(
        switchMap(resources => {
          const activeResources = resources.filter(resource => resource.isActive !== false);
          let resourceId = this.selectedResourceId();
          const hasSelection = activeResources.some(resource => resource.id === resourceId);

          if (!hasSelection) {
            resourceId = activeResources[0]?.id ?? null;
            this.selectedResourceId.set(resourceId);
          }

          const apiResourceId = resourceId ?? undefined;
          return forkJoin({
            resources: of(resources),
            months: forkJoin(
              requests.map(request =>
                this.calendarService.getMonth(request.year, request.month, apiResourceId)
              )
            ),
          });
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: ({ resources, months }) => {
          const nextMonths = { ...this.monthData() };

          requests.forEach((request, index) => {
            nextMonths[request.key] = months[index];
          });

          this.resources.set(resources);
          this.monthData.set(nextMonths);
          this.selectedRange.set(null);
        },
        error: () => {
          this.resources.set([]);
          this.errorMessage.set('Impossible de charger le calendrier des disponibilites.');
        },
      });
  }

  private getMonthRequestsForWeek(weekStart: Date): CalendarMonthRequest[] {
    const weekEnd = this.addDays(weekStart, 6);
    const months = [weekStart, weekEnd].map(date => ({
      key: this.toMonthKey(date.getFullYear(), date.getMonth() + 1),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    }));

    return months.filter(
      (request, index, values) => values.findIndex(value => value.key === request.key) === index
    );
  }

  private getCalendarDay(isoDate: string): CalendarDayDto | undefined {
    const date = this.fromIsoDate(isoDate);
    const month = this.monthData()[this.toMonthKey(date.getFullYear(), date.getMonth() + 1)];

    return month?.days?.find(day => day.date === isoDate);
  }

  private buildDayCells(isoDate: string, slots: CalendarSlotDto[]): WeekCellViewModel[] {
    const cells: WeekCellViewModel[] = [];

    for (
      let minutes = this.scheduleStartMinutes;
      minutes < this.scheduleEndMinutes;
      minutes += this.slotStepMinutes
    ) {
      const cellEnd = minutes + this.slotStepMinutes;
      const slotStart = this.formatMinutes(minutes);
      const slotEnd = this.formatMinutes(cellEnd);

      // Toute plage API avec isAvailable === false qui chevauche [slotStart, slotEnd) rend la demi-heure non réservable.
      // Le reste de la grille (8h–20h) reste disponible si aucune plage bloquante ne chevauche.
      const blocked = slots.some(slot => this.slotUnavailableOverlapsCell(minutes, cellEnd, slot));

      cells.push({
        isoDate,
        slotStart,
        slotEnd,
        isAvailable: !blocked,
        isReserved: blocked,
      });
    }

    return cells;
  }

  private getWeekdayLabel(date: Date): string {
    const label = this.dayFormatter.format(date).replace('.', '');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  private formatMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private formatIsoDate(value: string): string {
    return this.fullDateFormatter.format(this.fromIsoDate(value));
  }

  private parseTime(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Chevauchement semi-ouvert [cellStart, cellEnd) avec [slotStart, slotEnd) :
   * la fin exclusive du slot (ex. 10:30) ne bloque pas la demi-heure 10:30–11:00.
   */
  private slotUnavailableOverlapsCell(
    cellStartMin: number,
    cellEndMin: number,
    slot: CalendarSlotDto
  ): boolean {
    if (slot.isAvailable) {
      return false;
    }
    const start = slot.slotStart;
    const end = slot.slotEnd;
    if (!start || !end) {
      return false;
    }
    const slotStart = this.parseTime(start);
    const slotEnd = this.parseTime(end);
    return slotStart < cellEndMin && slotEnd > cellStartMin;
  }

  private isRangeAvailable(day: WeekDayViewModel, slotStart: string, slotEnd: string): boolean {
    const start = this.parseTime(slotStart);
    const end = this.parseTime(slotEnd);

    return day.cells
      .filter(cell => {
        const cellStart = this.parseTime(cell.slotStart);
        return cellStart >= start && cellStart < end;
      })
      .every(cell => cell.isAvailable);
  }

  private getStartOfWeek(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(12, 0, 0, 0);
    copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
    return copy;
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private fromIsoDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toMonthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
}
