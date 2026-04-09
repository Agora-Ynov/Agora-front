import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, map, of, switchMap } from 'rxjs';
import { AdminGroupsService } from '../../core/api';
import { ApiService } from '../../core/api/api.service';
import type {
  AdminSupportUserDto,
  PromoteAdminSupportRequestDto,
} from '../../core/api-types/admin-api.model';
import type { AdminGroupMemberResponseDto } from '../../core/api/model/adminGroupMemberResponseDto';

/** Aligné sur le seed back (`SeedConstants.GROUP_COUNCIL`). */
const COUNCIL_MUNICIPAL_GROUP_NAME = 'Conseillers municipaux';

@Component({
  selector: 'app-superadmin-admin-support-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './superadmin-admin-support-page.component.html',
  styleUrl: './superadmin-admin-support-page.component.scss',
})
export class SuperadminAdminSupportPageComponent {
  /** Exposé au template (libellé exact du groupe en base). */
  readonly councilGroupLabel = COUNCIL_MUNICIPAL_GROUP_NAME;

  private readonly api = inject(ApiService);
  private readonly adminGroups = inject(AdminGroupsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly users = signal<AdminSupportUserDto[]>([]);
  readonly promoteBusy = signal(false);

  readonly councilLoading = signal(true);
  readonly councilLoadError = signal<string | null>(null);
  readonly councilMembers = signal<AdminGroupMemberResponseDto[]>([]);
  readonly memberSearch = signal('');

  /** Déjà promus ADMIN_SUPPORT (pour désactiver les boutons). */
  private readonly adminSupportUserIds = computed(
    () =>
      new Set(
        this.users()
          .map(u => u.id)
          .filter((id): id is string => !!id)
      )
  );

  readonly filteredCouncilMembers = computed(() => {
    const q = this.memberSearch().trim().toLowerCase();
    const promoted = this.adminSupportUserIds();
    let rows = this.councilMembers().filter(m => !!m.userId?.trim());
    if (q) {
      rows = rows.filter(m => {
        const hay = [m.firstName, m.lastName, m.email].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    return rows.map(m => ({
      member: m,
      userId: m.userId as string,
      isAlreadySupport: promoted.has(m.userId as string),
    }));
  });

  constructor() {
    this.reload();
    this.loadCouncilMembers();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .get<AdminSupportUserDto[]>('/api/superadmin/admin-support')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: rows => {
          this.users.set(Array.isArray(rows) ? rows : []);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger la liste (droits ou serveur).');
          this.loading.set(false);
        },
      });
  }

  private loadCouncilMembers(): void {
    this.councilLoading.set(true);
    this.councilLoadError.set(null);
    this.adminGroups
      .list4('body', false, { transferCache: false })
      .pipe(
        switchMap(groups => {
          const council = (groups ?? []).find(
            g => (g.name ?? '').trim() === COUNCIL_MUNICIPAL_GROUP_NAME
          );
          if (!council?.id) {
            return of<AdminGroupMemberResponseDto[] | null>(null);
          }
          return this.adminGroups
            .listMembers(council.id, 'body', false, { transferCache: false })
            .pipe(
              map(members => (members ?? []) as AdminGroupMemberResponseDto[]),
              catchError(() => of<AdminGroupMemberResponseDto[] | null>(null))
            );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: members => {
          this.councilLoading.set(false);
          if (members === null) {
            this.councilLoadError.set(
              `Groupe « ${COUNCIL_MUNICIPAL_GROUP_NAME} » introuvable ou membres inaccessibles (droits / serveur).`
            );
            this.councilMembers.set([]);
            return;
          }
          this.councilMembers.set(members);
        },
        error: () => {
          this.councilLoading.set(false);
          this.councilLoadError.set('Impossible de charger les groupes (API admin).');
          this.councilMembers.set([]);
        },
      });
  }

  promoteMember(userId: string): void {
    if (!userId?.trim() || this.promoteBusy()) return;
    this.runPromote(userId.trim());
  }

  private runPromote(userId: string): void {
    this.promoteBusy.set(true);
    this.error.set(null);
    const body: PromoteAdminSupportRequestDto = { userId };
    this.api.post<AdminSupportUserDto>('/api/superadmin/admin-support', body).subscribe({
      next: () => {
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
