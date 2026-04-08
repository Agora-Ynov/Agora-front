import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { CalendarService } from '../../core/api/calendar.service';
import { ResourceService } from '../../core/api/resource.service';
import {
  CalendarDayDto,
  CalendarMonthDto,
  ResourceDto,
} from '../../core/api/models/resource.model';

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

interface UpcomingReservationViewModel {
  id: string;
  resourceName: string;
  dateLabel: string;
  statusLabel: string;
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
  private readonly todayIso = '2026-03-27';
  private readonly monthFormatter = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  readonly currentYear = signal(2026);
  readonly currentMonth = signal(3);
  readonly selectedResourceId = signal<ResourceFilter>('ALL');
  readonly resources = signal<ResourceDto[]>([]);
  readonly monthData = signal<CalendarMonthDto | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

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
    const daysByIso = new Map((this.monthData()?.days ?? []).map(day => [day.date, day] as const));

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
  readonly upcomingReservations: UpcomingReservationViewModel[] = [
    {
      id: 'upcoming-1',
      resourceName: 'Salle des Fetes',
      dateLabel: '15 avril 2026 de 14:00 -> 23:00',
      statusLabel: 'Confirmee',
    },
    {
      id: 'upcoming-2',
      resourceName: 'Barnums (x5)',
      dateLabel: '1 mai 2026 de 08:00 -> 20:00',
      statusLabel: 'Confirmee',
    },
  ];

  constructor() {
    this.loadCalendar();
  }

  selectResource(resourceId: ResourceFilter): void {
    this.selectedResourceId.set(resourceId);
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
      resources: this.resourceService.getAll(),
      month: this.calendarService.getMonth(this.currentYear(), this.currentMonth()),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ resources, month }) => {
          this.resources.set(resources);
          this.monthData.set(month);
        },
        error: () => {
          this.resources.set([]);
          this.monthData.set(null);
          this.errorMessage.set('Impossible de charger le calendrier des disponibilites.');
        },
      });
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
    const filteredSlots =
      selectedResourceId === 'ALL'
        ? day.slots
        : day.slots.filter(slot => slot.resourceId === selectedResourceId);

    return {
      isBlackout: day.isBlackout,
      isReserved: filteredSlots.some(slot => !slot.isAvailable),
      availableCount: filteredSlots.filter(slot => slot.isAvailable).length,
      blackoutReason: day.blackoutReason,
    };
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
