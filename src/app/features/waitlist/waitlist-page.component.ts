import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { CreateWaitlistRequestDto } from '../../core/api/model/createWaitlistRequestDto';
import { WaitlistEntryResponseDto } from '../../core/api/model/waitlistEntryResponseDto';
import { WaitlistService } from '../../core/api/api/waitlist.service';
import { ResourceService } from '../../core/api/resource.service';
import { ResourceDto } from '../../core/api/models/resource.model';

@Component({
  selector: 'app-waitlist-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './waitlist-page.component.html',
  styleUrl: './waitlist-page.component.scss',
})
export class WaitlistPageComponent implements OnInit {
  private readonly waitlistApi = inject(WaitlistService);
  private readonly resourceService = inject(ResourceService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly entries = signal<WaitlistEntryResponseDto[]>([]);
  readonly resources = signal<ResourceDto[]>([]);

  enrollResourceId = '';
  enrollDate = '';
  enrollStart = '09:00';
  enrollEnd = '10:00';

  ngOnInit(): void {
    this.loadResources();
    this.reload();
  }

  private loadResources(): void {
    this.resourceService.getAll().subscribe({
      next: r => this.resources.set(r.filter(x => x.id && x.isActive !== false)),
      error: () => this.resources.set([]),
    });
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.waitlistApi
      .list('body', false, { transferCache: false })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: rows => this.entries.set(rows ?? []),
        error: () => this.error.set('Impossible de charger votre liste d\'attente.'),
      });
  }

  enroll(): void {
    if (!this.enrollResourceId || !this.enrollDate) {
      this.error.set('Ressource et date obligatoires.');
      return;
    }
    const body: CreateWaitlistRequestDto = {
      resourceId: this.enrollResourceId,
      slotDate: this.enrollDate,
      slotStart: this.enrollStart,
      slotEnd: this.enrollEnd,
    };
    this.saving.set(true);
    this.error.set(null);
    this.waitlistApi
      .enroll(body, 'body', false, { transferCache: false })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => this.reload(),
        error: () => this.error.set("Inscription impossible (creneau ou droits)."),
      });
  }

  cancelEntry(id: string | undefined): void {
    if (!id) return;
    this.waitlistApi.cancel(id, 'body', false, { transferCache: false }).subscribe({
      next: () => this.reload(),
      error: () => this.error.set('Annulation impossible.'),
    });
  }
}
