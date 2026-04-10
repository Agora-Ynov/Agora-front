import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  switchMap,
} from 'rxjs';
import { AdminGroupService } from '../../core/api/admin-group.service';
import { ApiService } from '../../core/api/api.service';
import type {
  AdminSupportUserDto,
  PromoteAdminSupportRequestDto,
} from '../../core/api-types/admin-api.model';
import type { AdminUserRowDto } from '../../core/api/model/adminUserRowDto';
import type { AdminUsersListResponse } from '../../core/api/model/adminUsersListResponse';
import type { AdminGroupMemberDto } from '../../core/api/models/admin-group.model';

/** Aligné sur le seed back (`SeedConstants.GROUP_COUNCIL`). */
const COUNCIL_MUNICIPAL_GROUP_NAME = 'Conseillers municipaux';

@Component({
  selector: 'app-superadmin-admin-support-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './superadmin-admin-support-page.component.html',
  styleUrl: './superadmin-admin-support-page.component.scss',
})
export class SuperadminAdminSupportPageComponent implements OnDestroy {
  /** Exposé au template (libellé exact du groupe en base). */
  readonly councilGroupLabel = COUNCIL_MUNICIPAL_GROUP_NAME;

  private readonly api = inject(ApiService);
  private readonly adminGroups = inject(AdminGroupService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userLookupDebounced = new Subject<string>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly users = signal<AdminSupportUserDto[]>([]);
  readonly promoteBusy = signal(false);

  readonly councilLoading = signal(true);
  readonly councilLoadError = signal<string | null>(null);
  readonly councilMembers = signal<AdminGroupMemberDto[]>([]);
  readonly memberSearch = signal('');

  /** Recherche globale secrétariat (nom / prénom / email). */
  readonly userLookupQuery = signal('');
  readonly userLookupLoading = signal(false);
  readonly userLookupError = signal<string | null>(null);
  readonly userLookupHits = signal<AdminUserRowDto[]>([]);

  readonly revokeTarget = signal<AdminSupportUserDto | null>(null);
  readonly revokeBusy = signal(false);

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
      userId: m.userId,
      isAlreadySupport: promoted.has(m.userId),
    }));
  });

  readonly filteredLookupUsers = computed(() => {
    const promoted = this.adminSupportUserIds();
    return this.userLookupHits().map(u => ({
      user: u,
      userId: String(u.id ?? ''),
      isAlreadySupport: promoted.has(String(u.id ?? '')),
    }));
  });

  constructor() {
    effect(() => {
      if (typeof document === 'undefined') {
        return;
      }
      document.body.style.overflow = this.revokeTarget() != null ? 'hidden' : '';
    });

    this.reload();
    this.loadCouncilMembers();

    this.userLookupDebounced
      .pipe(
        debounceTime(380),
        distinctUntilChanged(),
        switchMap(q => this.fetchLookupUsers(q)),
        takeUntilDestroyed()
      )
      .subscribe(rows => this.userLookupHits.set(rows));
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  onUserLookupModelChange(value: string): void {
    this.userLookupQuery.set(value);
    this.userLookupDebounced.next(value);
  }

  private fetchLookupUsers(raw: string) {
    const q = raw.trim();
    if (q.length < 2) {
      this.userLookupError.set(null);
      return of<AdminUserRowDto[]>([]);
    }
    this.userLookupLoading.set(true);
    this.userLookupError.set(null);
    return this.api
      .getJson<AdminUsersListResponse>('/api/admin/users', { page: 0, size: 100, q })
      .pipe(
        map(res => res.content ?? []),
        finalize(() => this.userLookupLoading.set(false)),
        catchError(() => {
          this.userLookupError.set('Recherche utilisateurs impossible.');
          return of<AdminUserRowDto[]>([]);
        })
      );
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
      .getGroups()
      .pipe(
        switchMap(groups => {
          const council = (groups ?? []).find(
            g => (g.name ?? '').trim() === COUNCIL_MUNICIPAL_GROUP_NAME
          );
          if (!council?.id) {
            return of<AdminGroupMemberDto[] | null>(null);
          }
          return this.adminGroups.getGroupMembers(council.id).pipe(
            map(members => members ?? []),
            catchError(() => of<AdminGroupMemberDto[] | null>(null))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: members => {
          this.councilLoading.set(false);
          if (members === null) {
            this.councilLoadError.set(
              `Groupe « ${COUNCIL_MUNICIPAL_GROUP_NAME} » introuvable ou impossible de charger ses membres (droits serveur).`
            );
            this.councilMembers.set([]);
            return;
          }
          this.councilMembers.set(members);
        },
        error: () => {
          this.councilLoading.set(false);
          this.councilLoadError.set(
            'Impossible de charger la liste des groupes administratifs. Vérifiez votre session ou le proxy API.'
          );
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

  openRevokeFromLookupRow(row: {
    user: AdminUserRowDto;
    userId: string;
    isAlreadySupport: boolean;
  }): void {
    const u = row.user;
    this.revokeTarget.set({
      id: row.userId,
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      email: u.email ?? null,
      status: String(u.status ?? ''),
    });
  }

  openRevokeFromCouncilRow(row: {
    member: AdminGroupMemberDto;
    userId: string;
    isAlreadySupport: boolean;
  }): void {
    const m = row.member;
    this.revokeTarget.set({
      id: row.userId,
      firstName: m.firstName ?? '',
      lastName: m.lastName ?? '',
      email: m.email ?? null,
      status: '',
    });
  }

  closeRevokeModal(): void {
    this.revokeTarget.set(null);
  }

  confirmRevoke(): void {
    const u = this.revokeTarget();
    const id = u?.id?.trim();
    if (!id) {
      return;
    }
    this.error.set(null);
    this.revokeBusy.set(true);
    this.api
      .delete<void>(`/api/superadmin/admin-support/${id}`)
      .pipe(finalize(() => this.revokeBusy.set(false)))
      .subscribe({
        next: () => {
          this.closeRevokeModal();
          this.reload();
        },
        error: () => {
          this.error.set('Révocation impossible.');
          this.closeRevokeModal();
        },
      });
  }
}
