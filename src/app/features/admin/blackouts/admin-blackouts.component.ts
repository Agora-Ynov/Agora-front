import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BlackoutService } from '../../../core/api/blackout.service';
import { ResourceService } from '../../../core/api/resource.service';
import { BlackoutPeriodDto, CreateBlackoutDto } from '../../../core/api/models/blackout.model';
import { ResourceDto } from '../../../core/api/models/resource.model';

interface BlackoutDisplayGroup {
  key: string;
  ids: string[];
  dateFrom: string;
  dateTo: string;
  reason: string;
  resourceLabels: string[];
  isGlobal: boolean;
}

@Component({
  selector: 'app-admin-blackouts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-blackouts.component.html',
  styleUrl: './admin-blackouts.component.scss',
})
export class AdminBlackoutsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly blackoutService = inject(BlackoutService);
  private readonly resourceService = inject(ResourceService);
  private readonly frenchDateFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  readonly blackouts = signal<BlackoutPeriodDto[]>([]);
  readonly resources = signal<ResourceDto[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly deletingKey = signal<string | null>(null);
  readonly isModalOpen = signal(false);
  readonly blackoutPendingDeletion = signal<BlackoutDisplayGroup | null>(null);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.fb.group({
    resourceId: [null as string | null],
    dateFrom: ['', [Validators.required]],
    dateTo: ['', [Validators.required]],
    reason: ['', [Validators.required, Validators.maxLength(160)]],
  });

  readonly activeResources = computed(() =>
    this.resources()
      .filter(resource => resource.isActive !== false)
      .sort((left, right) => left.name.localeCompare(right.name))
  );

  readonly groupedBlackouts = computed(() => {
    const resourceNameById = new Map(
      this.activeResources().map(resource => [resource.id, resource.name] as const)
    );
    const grouped = new Map<string, BlackoutDisplayGroup>();

    for (const blackout of this.blackouts()) {
      const key = `${blackout.dateFrom}|${blackout.dateTo}|${blackout.reason.trim().toLowerCase()}`;
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, {
          key,
          ids: [blackout.id],
          dateFrom: blackout.dateFrom,
          dateTo: blackout.dateTo,
          reason: blackout.reason,
          resourceLabels:
            blackout.resourceId === null
              ? ['Toutes les ressources']
              : [blackout.resourceName ?? resourceNameById.get(blackout.resourceId) ?? 'Ressource'],
          isGlobal: blackout.resourceId === null,
        });
        continue;
      }

      existing.ids.push(blackout.id);

      if (existing.isGlobal || blackout.resourceId === null) {
        existing.isGlobal = true;
        existing.resourceLabels = ['Toutes les ressources'];
        continue;
      }

      const resourceLabel =
        blackout.resourceName ?? resourceNameById.get(blackout.resourceId) ?? 'Ressource';

      if (!existing.resourceLabels.includes(resourceLabel)) {
        existing.resourceLabels = [...existing.resourceLabels, resourceLabel].sort((left, right) =>
          left.localeCompare(right)
        );
      }
    }

    return Array.from(grouped.values()).sort((left, right) => {
      const byDateFrom = left.dateFrom.localeCompare(right.dateFrom);
      if (byDateFrom !== 0) {
        return byDateFrom;
      }

      const byDateTo = left.dateTo.localeCompare(right.dateTo);
      if (byDateTo !== 0) {
        return byDateTo;
      }

      return left.reason.localeCompare(right.reason);
    });
  });

  readonly plannedCount = computed(() => this.groupedBlackouts().length);

  constructor() {
    this.loadData();
  }

  openCreateModal(): void {
    this.form.reset({
      resourceId: null,
      dateFrom: '',
      dateTo: '',
      reason: '',
    });
    this.errorMessage.set('');
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  openDeleteModal(group: BlackoutDisplayGroup): void {
    this.blackoutPendingDeletion.set(group);
    this.errorMessage.set('');
  }

  closeDeleteModal(): void {
    this.blackoutPendingDeletion.set(null);
  }

  submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    const dateFrom = formValue.dateFrom ?? '';
    const dateTo = formValue.dateTo ?? '';
    const reason = formValue.reason ?? '';

    if (dateTo < dateFrom) {
      this.errorMessage.set('La date de fin doit etre posterieure ou egale a la date de debut.');
      return;
    }

    const payload: CreateBlackoutDto = {
      resourceId: formValue.resourceId ?? null,
      dateFrom,
      dateTo,
      reason: reason.trim(),
    };

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.blackoutService
      .create(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: blackout => {
          this.blackouts.set([...this.blackouts(), blackout]);
          this.closeModal();
        },
        error: () => {
          this.errorMessage.set("Impossible d'ajouter la fermeture.");
        },
      });
  }

  confirmDeleteGroup(): void {
    const group = this.blackoutPendingDeletion();
    if (!group) {
      return;
    }

    this.deletingKey.set(group.key);
    this.errorMessage.set('');
    this.successMessage.set('');

    forkJoin(group.ids.map(blackoutId => this.blackoutService.delete(blackoutId)))
      .pipe(finalize(() => this.deletingKey.set(null)))
      .subscribe({
        next: () => {
          const idsToDelete = new Set(group.ids);
          this.blackouts.set(this.blackouts().filter(blackout => !idsToDelete.has(blackout.id)));
          this.closeDeleteModal();
          this.successMessage.set('Fermeture supprimee avec succes.');
        },
        error: () => {
          this.errorMessage.set('Impossible de supprimer cette fermeture.');
        },
      });
  }

  formatDateRange(group: BlackoutDisplayGroup): string {
    if (group.dateFrom === group.dateTo) {
      return this.formatDate(group.dateFrom);
    }

    return `Du ${this.formatDate(group.dateFrom)} au ${this.formatDate(group.dateTo)}`;
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      blackouts: this.blackoutService
        .getAll()
        .pipe(catchError(() => of([] as BlackoutPeriodDto[]))),
      resources: this.resourceService
        .getAll()
        .pipe(catchError(() => of([] as ResourceDto[]))),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ blackouts, resources }) => {
          this.blackouts.set(blackouts);
          this.resources.set(resources);
        },
        error: () => {
          this.blackouts.set([]);
          this.resources.set([]);
          this.errorMessage.set('Impossible de charger les fermetures.');
        },
      });
  }

  private formatDate(value: string): string {
    return this.frenchDateFormatter.format(new Date(`${value}T00:00:00`));
  }
}
