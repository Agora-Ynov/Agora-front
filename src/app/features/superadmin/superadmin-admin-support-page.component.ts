import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import type {
  AdminSupportUserDto,
  PromoteAdminSupportRequestDto,
} from '../../core/api-types/admin-api.model';

@Component({
  selector: 'app-superadmin-admin-support-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './superadmin-admin-support-page.component.html',
  styleUrl: './superadmin-admin-support-page.component.scss',
})
export class SuperadminAdminSupportPageComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly users = signal<AdminSupportUserDto[]>([]);
  readonly promoteUserId = signal('');
  readonly promoteBusy = signal(false);

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .get<AdminSupportUserDto[]>('/api/superadmin/admin-support')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: rows => {
          this.users.set(rows);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger la liste (droits ou serveur).');
          this.loading.set(false);
        },
      });
  }

  promote(): void {
    const id = this.promoteUserId().trim();
    if (!id) return;

    this.promoteBusy.set(true);
    this.error.set(null);
    const body: PromoteAdminSupportRequestDto = { userId: id };
    this.api.post<AdminSupportUserDto>('/api/superadmin/admin-support', body).subscribe({
      next: () => {
        this.promoteUserId.set('');
        this.promoteBusy.set(false);
        this.reload();
      },
      error: err => {
        this.promoteBusy.set(false);
        const msg =
          err?.error?.message ??
          (err?.status === 409
            ? 'Conflit : utilisateur déjà admin support ou indisponible.'
            : 'Promotion refusée.');
        this.error.set(typeof msg === 'string' ? msg : 'Promotion refusée.');
      },
    });
  }

  revoke(userId: string): void {
    if (!confirm('Révoquer les droits admin support pour cet utilisateur ?')) return;
    this.error.set(null);
    this.api.delete<void>(`/api/superadmin/admin-support/${userId}`).subscribe({
      next: () => this.reload(),
      error: () => this.error.set('Révocation impossible.'),
    });
  }
}
