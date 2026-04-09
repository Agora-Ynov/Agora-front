import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  RESOURCE_ACCESSIBILITY_OPTIONS,
  ResourceDto,
  ResourceFormValue,
  ResourceType,
} from '../../../core/api/models/resource.model';
import { ResourceService } from '../../../core/api/resource.service';

@Component({
  selector: 'app-resource-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './resource-management.component.html',
  styleUrls: ['./resource-management.component.scss'],
})
export class ResourceManagementComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly resourceService = inject(ResourceService);

  readonly resources = signal<ResourceDto[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isModalOpen = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly editingResourceId = signal<string | null>(null);

  readonly accessibilityOptions = RESOURCE_ACCESSIBILITY_OPTIONS;

  readonly form = this.fb.group({
    resourceType: ['IMMOBILIER' as ResourceType, [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    capacity: [null as number | null, [Validators.min(0)]],
    depositAmountEuros: [0 as number | null, [Validators.required, Validators.min(0)]],
    rentalAmountEuros: [null as number | null, [Validators.min(0)]],
    accessibilityTags: [[] as string[]],
    imageUrl: [''],
  });

  readonly stats = computed(() => this.resourceService.getStats(this.resources()));
  readonly resourceType = computed(
    () => (this.form.controls.resourceType.value ?? 'IMMOBILIER') as ResourceType
  );

  ngOnInit(): void {
    this.loadResources();
  }

  loadResources(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.resourceService
      .getAll()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: resources => {
          this.resources.set(resources);
          this.errorMessage.set('');
        },
        error: () => this.errorMessage.set('Impossible de charger les ressources.'),
      });
  }

  openCreateModal(): void {
    this.editingResourceId.set(null);
    this.errorMessage.set('');
    this.form.reset({
      resourceType: 'IMMOBILIER',
      name: '',
      description: '',
      capacity: null,
      depositAmountEuros: 0,
      rentalAmountEuros: null,
      accessibilityTags: [],
      imageUrl: '',
    });
    this.isModalOpen.set(true);
  }

  openEditModal(resource: ResourceDto): void {
    this.editingResourceId.set(resource.id);
    this.errorMessage.set('');
    const formValue = this.resourceService.toFormValue(resource);

    this.form.reset({
      resourceType: formValue.resourceType,
      name: formValue.name,
      description: formValue.description,
      capacity: formValue.capacity,
      depositAmountEuros: formValue.depositAmountEuros,
      rentalAmountEuros: formValue.rentalAmountEuros,
      accessibilityTags: [...formValue.accessibilityTags],
      imageUrl: formValue.imageUrl ?? '',
    });

    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.errorMessage.set('');
  }

  submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const formValue = this.form.getRawValue() as ResourceFormValue;
    const payload = this.resourceService.buildPayload(formValue);
    const editingId = this.editingResourceId();

    const request$ = editingId
      ? this.resourceService.update(editingId, payload)
      : this.resourceService.create(payload);

    request$.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: resource => {
        if (editingId) {
          this.resources.set(
            this.resources().map(item => (item.id === editingId ? resource : item))
          );
          this.successMessage.set('Ressource modifiee avec succes.');
        } else {
          this.resources.set([resource, ...this.resources()]);
          this.successMessage.set('Ressource creee avec succes.');
        }

        this.closeModal();
      },
      error: () => {
        this.errorMessage.set(
          editingId ? 'Impossible de modifier la ressource.' : 'Impossible de creer la ressource.'
        );
      },
    });
  }

  deleteResource(resourceId: string): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    this.resourceService.delete(resourceId).subscribe({
      next: () => {
        this.resources.set(this.resources().filter(resource => resource.id !== resourceId));
        this.successMessage.set('Ressource supprimee avec succes.');
      },
      error: () => {
        this.errorMessage.set('Impossible de supprimer la ressource.');
      },
    });
  }

  getTypeLabel(type: ResourceType): string {
    return type === 'IMMOBILIER' ? 'Salle' : 'Materiel';
  }

  getTypeIcon(type: ResourceType): string {
    return type === 'IMMOBILIER' ? 'building' : 'package';
  }

  getPriceEuros(value: number | null | undefined): number {
    return this.resourceService.fromCents(value);
  }

  hasRentalPrice(cents: number | null | undefined): boolean {
    return cents !== null && cents !== undefined;
  }

  getCapacityLabel(resource: ResourceDto): string {
    if (resource.resourceType === 'IMMOBILIER') {
      return resource.capacity ? `${resource.capacity} pers.` : 'Non renseignee';
    }
    return 'Materiel';
  }

  getFeatureLabels(resource: ResourceDto): string[] {
    return (resource.accessibilityTags ?? []).map(tag =>
      this.resourceService.formatAccessibilityTag(tag)
    );
  }

  trackByResourceId(_index: number, resource: ResourceDto): string {
    return resource.id;
  }

  get isEditing(): boolean {
    return !!this.editingResourceId();
  }

  isTagSelected(tagId: string): boolean {
    const selected = this.form.controls.accessibilityTags.value ?? [];
    return selected.includes(tagId);
  }

  toggleAccessibilityTag(tagId: string): void {
    const control = this.form.controls.accessibilityTags;
    const current = [...(control.value ?? [])];
    const i = current.indexOf(tagId);
    if (i >= 0) {
      current.splice(i, 1);
    } else {
      current.push(tagId);
    }
    control.setValue(current);
    control.markAsDirty();
  }
}
