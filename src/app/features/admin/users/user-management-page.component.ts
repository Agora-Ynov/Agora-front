import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
} from 'rxjs';
import {
  AdminUsersService,
  AdminUserRowDto,
  AdminUsersListResponse,
  CreateTutoredUserRequestDto,
  ActivateAutonomousRequestDto,
  UpdateTutoredUserRequestDto,
} from '../../../core/api';
import { ApiService } from '../../../core/api/api.service';
import { AuthService } from '../../../core/auth/auth.service';

type AccountTypeFilter = 'ALL' | 'AUTONOMOUS' | 'TUTORED' | 'SUSPENDED';
type UserAccountType = 'AUTONOMOUS' | 'TUTORED';
type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VALIDATION';

@Component({
  selector: 'app-user-management-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-management-page.component.html',
  styleUrl: './user-management-page.component.scss',
})
export class UserManagementPageComponent {
  private readonly adminUsers = inject(AdminUsersService);
  private readonly api = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly feedback = signal<string | null>(null);
  readonly users = signal<AdminUserRowDto[]>([]);
  readonly searchTerm = signal('');
  readonly filter = signal<AccountTypeFilter>('ALL');
  readonly isCreateModalOpen = signal(false);
  readonly viewedUser = signal<AdminUserRowDto | null>(null);
  readonly actingUser = signal<AdminUserRowDto | null>(null);
  readonly isEditModalOpen = signal(false);
  readonly editingUser = signal<AdminUserRowDto | null>(null);
  readonly impersonateBusy = signal(false);
  readonly printBusy = signal(false);

  readonly statTotal = signal(0);
  readonly statAutonomous = signal(0);
  readonly statTutored = signal(0);
  readonly statSuspended = signal(0);

  /** Pagination liste (API plafonne size à 100). */
  readonly usersPage = signal(0);
  readonly usersPageSize = signal(20);
  readonly usersTotalPages = signal(0);
  readonly usersTotalElements = signal(0);
  readonly usersPageSizeOptions = [10, 20, 50, 100] as const;

  private readonly searchReload = new Subject<void>();
  private readonly searchSuggestTrigger = new Subject<string>();

  readonly searchSuggestions = signal<AdminUserRowDto[]>([]);
  readonly searchSuggestLoading = signal(false);
  readonly resendActivationTarget = signal<AdminUserRowDto | null>(null);
  readonly resendActivationBusy = signal(false);

  readonly createFirstName = signal('Jean');
  readonly createLastName = signal('Dupont');
  readonly createPhone = signal('06 12 34 56 78');
  readonly createBirthYear = signal<number | null>(null);
  readonly createNotesAdmin = signal('');

  readonly activateEmailDraft = signal('');
  readonly detailBusy = signal(false);

  readonly editFirstName = signal('');
  readonly editLastName = signal('');
  readonly editPhone = signal('');
  readonly editBirthYear = signal<number | null>(null);
  readonly editNotesAdmin = signal('');
  readonly editBusy = signal(false);

  readonly isCreateFormValid = computed(() => {
    const hasIdentity =
      this.createFirstName().trim().length > 0 && this.createLastName().trim().length > 0;
    return hasIdentity;
  });

  /** Liste paginée : filtre serveur via paramètre `q` (plus de filtrage client doublon). */
  readonly filteredUsers = computed(() => this.users());

  readonly adminDisplayName = computed(() => {
    const admin = this.authService.currentUser();
    return admin ? `${admin.firstName} ${admin.lastName}` : 'Administrateur';
  });

  constructor() {
    effect(() => {
      const open =
        this.isCreateModalOpen() ||
        this.viewedUser() !== null ||
        this.actingUser() !== null ||
        this.isEditModalOpen() ||
        this.resendActivationTarget() !== null;
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('agora-modal-open', open);
      }
    });

    this.searchReload.pipe(debounceTime(380), takeUntilDestroyed()).subscribe(() => {
      this.usersPage.set(0);
      this.loadUsers();
    });

    this.searchSuggestTrigger
      .pipe(
        debounceTime(220),
        distinctUntilChanged(),
        switchMap(() => {
          const q = this.searchTerm().trim();
          if (q.length < 2) {
            this.searchSuggestions.set([]);
            return of<AdminUserRowDto[]>([]);
          }
          const f = this.filter();
          const { accountType, status } = this.apiListParams(f);
          this.searchSuggestLoading.set(true);
          return this.api
            .getJson<AdminUsersListResponse>('/api/admin/users', {
              page: 0,
              size: 15,
              q,
              ...(accountType ? { accountType } : {}),
              ...(status ? { status } : {}),
            })
            .pipe(
              map(res => res.content ?? []),
              finalize(() => this.searchSuggestLoading.set(false)),
              catchError(() => of<AdminUserRowDto[]>([]))
            );
        }),
        takeUntilDestroyed()
      )
      .subscribe(rows => this.searchSuggestions.set(rows));

    this.loadUsers();
  }

  setFilter(value: AccountTypeFilter): void {
    this.filter.set(value);
    this.usersPage.set(0);
    this.loadUsers();
    this.searchSuggestTrigger.next(this.searchTerm());
  }

  private apiListParams(filter: AccountTypeFilter): { accountType?: string; status?: string } {
    switch (filter) {
      case 'AUTONOMOUS':
        return { accountType: 'AUTONOMOUS' };
      case 'TUTORED':
        return { accountType: 'TUTORED' };
      case 'SUSPENDED':
        return { status: 'SUSPENDED' };
      default:
        return {};
    }
  }

  private loadUsers(): void {
    this.loading.set(true);
    const f = this.filter();
    const { accountType, status } = this.apiListParams(f);

    const listParams = (
      page: number,
      size: number,
      extra?: { accountType?: string; status?: string }
    ): Record<string, string | number | boolean> => ({
      page,
      size,
      ...(extra?.accountType ? { accountType: extra.accountType } : {}),
      ...(extra?.status ? { status: extra.status } : {}),
    });

    forkJoin({
      counts: forkJoin({
        total: this.api.getJson<AdminUsersListResponse>('/api/admin/users', listParams(0, 1)),
        autonomous: this.api.getJson<AdminUsersListResponse>(
          '/api/admin/users',
          listParams(0, 1, { accountType: 'AUTONOMOUS' })
        ),
        tutored: this.api.getJson<AdminUsersListResponse>(
          '/api/admin/users',
          listParams(0, 1, { accountType: 'TUTORED' })
        ),
        suspended: this.api.getJson<AdminUsersListResponse>(
          '/api/admin/users',
          listParams(0, 1, { status: 'SUSPENDED' })
        ),
      }),
      rows: this.api.getJson<AdminUsersListResponse>('/api/admin/users', {
        ...listParams(this.usersPage(), this.usersPageSize()),
        ...(accountType ? { accountType } : {}),
        ...(status ? { status } : {}),
        ...(this.searchTerm().trim() ? { q: this.searchTerm().trim() } : {}),
      }),
    }).subscribe({
      next: ({ counts, rows }) => {
        this.statTotal.set(counts.total.totalElements ?? 0);
        this.statAutonomous.set(counts.autonomous.totalElements ?? 0);
        this.statTutored.set(counts.tutored.totalElements ?? 0);
        this.statSuspended.set(counts.suspended.totalElements ?? 0);
        this.users.set(rows.content ?? []);
        const tp = rows.totalPages ?? 0;
        const te = rows.totalElements ?? 0;
        this.usersTotalPages.set(tp > 0 ? tp : te > 0 ? 1 : 0);
        this.usersTotalElements.set(te);
        if (tp > 0 && this.usersPage() >= tp) {
          this.usersPage.set(tp - 1);
          this.loadUsers();
          return;
        }
        this.loading.set(false);
      },
      error: () => {
        this.users.set([]);
        this.loading.set(false);
        this.feedback.set('Impossible de charger la liste des utilisateurs.');
      },
    });
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.searchReload.next();
    this.searchSuggestTrigger.next(value);
  }

  onSearchFocus(): void {
    this.searchSuggestTrigger.next(this.searchTerm());
  }

  pickSearchSuggestion(user: AdminUserRowDto): void {
    const q =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || (user.email ?? '');
    this.searchTerm.set(q);
    this.searchSuggestions.set([]);
    this.searchReload.next();
  }

  openResendActivationModal(user: AdminUserRowDto): void {
    this.resendActivationTarget.set(user);
  }

  closeResendActivationModal(): void {
    this.resendActivationTarget.set(null);
  }

  confirmResendActivation(): void {
    const user = this.resendActivationTarget();
    const id = user?.id;
    if (!id) {
      return;
    }
    if (!user.email?.trim()) {
      this.feedback.set(
        "Impossible : aucun e-mail sur la fiche. Utilisez d'abord « activation autonome » sur la fiche utilisateur."
      );
      this.closeResendActivationModal();
      return;
    }
    this.resendActivationBusy.set(true);
    this.adminUsers.resendActivation(id, undefined, false, { transferCache: false }).subscribe({
      next: () => {
        this.resendActivationBusy.set(false);
        this.closeResendActivationModal();
        this.feedback.set(
          'Courriel d’activation renvoyé (nouveau lien ; durée typique 72 h, envoi via la messagerie configurée, ex. Brevo).'
        );
      },
      error: (err: { error?: { message?: string; detail?: string } | string }) => {
        this.resendActivationBusy.set(false);
        const body = err?.error;
        const msg =
          typeof body === 'string'
            ? body
            : (body?.message ?? body?.detail ?? "Impossible de renvoyer l'activation.");
        this.feedback.set(typeof msg === 'string' ? msg : "Impossible de renvoyer l'activation.");
        this.closeResendActivationModal();
      },
    });
  }

  goUsersPage(page: number): void {
    const max = Math.max(0, (this.usersTotalPages() || 1) - 1);
    const p = Math.min(Math.max(0, page), max);
    if (p === this.usersPage()) return;
    this.usersPage.set(p);
    this.loadUsers();
  }

  prevUsersPage(): void {
    this.goUsersPage(this.usersPage() - 1);
  }

  nextUsersPage(): void {
    this.goUsersPage(this.usersPage() + 1);
  }

  setUsersPageSize(size: number): void {
    const s = Math.min(100, Math.max(5, size));
    if (s === this.usersPageSize()) return;
    this.usersPageSize.set(s);
    this.usersPage.set(0);
    this.loadUsers();
  }

  openCreateModal(): void {
    this.resetCreateForm();
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  openUserDetail(user: AdminUserRowDto): void {
    this.viewedUser.set(user);
    this.activateEmailDraft.set(user.email ?? '');
  }

  closeUserDetail(): void {
    this.viewedUser.set(null);
  }

  openEditTutored(user: AdminUserRowDto): void {
    if (this.rowAccountType(user) !== 'TUTORED') {
      return;
    }
    this.editingUser.set(user);
    this.editFirstName.set(user.firstName ?? '');
    this.editLastName.set(user.lastName ?? '');
    this.editPhone.set(user.phone ?? '');
    this.editBirthYear.set(null);
    this.editNotesAdmin.set(user.notesAdmin ?? '');
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingUser.set(null);
  }

  updateEditFirstName(value: string): void {
    this.editFirstName.set(value);
  }

  updateEditLastName(value: string): void {
    this.editLastName.set(value);
  }

  updateEditPhone(value: string): void {
    this.editPhone.set(value);
  }

  updateEditBirthYear(value: string): void {
    const n = parseInt(value, 10);
    this.editBirthYear.set(Number.isFinite(n) ? n : null);
  }

  updateEditNotesAdmin(value: string): void {
    this.editNotesAdmin.set(value);
  }

  submitEditTutored(): void {
    const user = this.editingUser();
    if (!user?.id) return;
    const fn = this.editFirstName().trim();
    const ln = this.editLastName().trim();
    if (!fn || !ln) {
      this.feedback.set('Prenom et nom sont obligatoires.');
      return;
    }
    const body: UpdateTutoredUserRequestDto = {
      firstName: fn,
      lastName: ln,
      phone: this.editPhone().trim() || undefined,
      birthYear: this.editBirthYear() ?? undefined,
      notesAdmin: this.editNotesAdmin().trim() || undefined,
    };
    this.editBusy.set(true);
    this.adminUsers
      .updateTutored(user.id, body, undefined, false, { transferCache: false })
      .subscribe({
        next: () => {
          this.editBusy.set(false);
          this.feedback.set('Fiche sous tutelle mise a jour.');
          this.closeEditModal();
          this.closeUserDetail();
          this.loadUsers();
        },
        error: () => {
          this.editBusy.set(false);
          this.feedback.set('Echec de la mise a jour.');
        },
      });
  }

  openActingModal(user: AdminUserRowDto): void {
    this.actingUser.set(user);
  }

  closeActingModal(): void {
    this.actingUser.set(null);
  }

  confirmActingModal(): void {
    const user = this.actingUser();
    if (!user?.id) return;
    if (!this.canImpersonate(user)) {
      this.feedback.set('Impersonation reservee aux comptes sous tutelle actifs.');
      this.closeActingModal();
      return;
    }
    this.impersonateBusy.set(true);
    this.adminUsers.impersonate(user.id, undefined, false, { transferCache: false }).subscribe({
      next: res => {
        this.impersonateBusy.set(false);
        const token = res.accessToken?.trim();
        if (!token) {
          this.feedback.set('Reponse impersonation invalide.');
          this.closeActingModal();
          return;
        }
        this.authService.startImpersonation(token).subscribe({
          next: () => {
            this.closeActingModal();
            this.closeUserDetail();
            void this.router.navigateByUrl('/');
          },
          error: () => {
            this.feedback.set('Impossible de charger le profil usager.');
            this.closeActingModal();
          },
        });
      },
      error: () => {
        this.impersonateBusy.set(false);
        this.feedback.set('Impersonation refusee (droits ou compte non eligible).');
        this.closeActingModal();
      },
    });
  }

  startImpersonationFromDetail(): void {
    const user = this.viewedUser();
    if (!user?.id || !this.canImpersonate(user)) {
      this.feedback.set('Impersonation reservee aux comptes sous tutelle actifs.');
      return;
    }
    this.impersonateBusy.set(true);
    this.adminUsers.impersonate(user.id, undefined, false, { transferCache: false }).subscribe({
      next: res => {
        this.impersonateBusy.set(false);
        const token = res.accessToken?.trim();
        if (!token) {
          this.feedback.set('Reponse impersonation invalide.');
          return;
        }
        this.authService.startImpersonation(token).subscribe({
          next: () => {
            this.closeUserDetail();
            void this.router.navigateByUrl('/');
          },
          error: () => this.feedback.set('Impossible de charger le profil usager.'),
        });
      },
      error: () => {
        this.impersonateBusy.set(false);
        this.feedback.set('Impersonation refusee (droits ou compte non eligible).');
      },
    });
  }

  canImpersonate(user: AdminUserRowDto): boolean {
    return this.rowAccountType(user) === 'TUTORED' && this.rowStatus(user) === 'ACTIVE';
  }

  downloadUserPdf(user: AdminUserRowDto): void {
    const id = user.id;
    if (!id) {
      return;
    }
    this.printBusy.set(true);
    this.adminUsers
      .printSummary(id, 'response', false, {
        transferCache: false,
        httpHeaderAccept: '*/*',
      })
      .subscribe({
        next: res => {
          this.printBusy.set(false);
          const raw = res.body as unknown;
          if (!(raw instanceof Blob)) {
            this.feedback.set('PDF vide.');
            return;
          }
          const url = URL.createObjectURL(raw);
          const a = document.createElement('a');
          a.href = url;
          a.download = `fiche-utilisateur-${id}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.printBusy.set(false);
          this.feedback.set('Impossible de generer la fiche PDF.');
        },
      });
  }

  suspendUser(user: AdminUserRowDto): void {
    const id = user.id;
    if (!id) return;
    this.detailBusy.set(true);
    this.adminUsers.suspend(id, undefined, false, { transferCache: false }).subscribe({
      next: () => {
        this.detailBusy.set(false);
        this.feedback.set('Compte suspendu.');
        this.closeUserDetail();
        this.loadUsers();
      },
      error: () => {
        this.detailBusy.set(false);
        this.feedback.set('Suspension impossible.');
      },
    });
  }

  purgeUserPermanently(user: AdminUserRowDto): void {
    const id = user.id;
    if (!id || this.detailBusy()) {
      return;
    }
    const label = this.getUserLabel(user);
    if (
      !window.confirm(
        `Supprimer définitivement « ${label} » ?\n\n` +
          `Les réservations, la file d’attente et les jetons liés seront effacés. ` +
          `Action irréversible.`
      )
    ) {
      return;
    }
    this.detailBusy.set(true);
    this.api.delete(`/api/admin/users/${encodeURIComponent(id)}`).subscribe({
      next: () => {
        this.detailBusy.set(false);
        this.feedback.set('Utilisateur supprime definitivement.');
        this.closeUserDetail();
        this.loadUsers();
      },
      error: () => {
        this.detailBusy.set(false);
        this.feedback.set(
          'Suppression impossible (superadmin, compte protege, ou erreur serveur).'
        );
      },
    });
  }

  reactivateUser(user: AdminUserRowDto): void {
    const id = user.id;
    if (!id) return;
    this.detailBusy.set(true);
    this.adminUsers.reactivate(id, undefined, false, { transferCache: false }).subscribe({
      next: () => {
        this.detailBusy.set(false);
        this.feedback.set('Compte reactive.');
        this.closeUserDetail();
        this.loadUsers();
      },
      error: () => {
        this.detailBusy.set(false);
        this.feedback.set('Reactivation impossible.');
      },
    });
  }

  createUser(): void {
    if (!this.isCreateFormValid()) {
      return;
    }

    const body: CreateTutoredUserRequestDto = {
      firstName: this.createFirstName().trim(),
      lastName: this.createLastName().trim(),
      phone: this.createPhone().trim() || undefined,
      birthYear: this.createBirthYear() ?? undefined,
      notesAdmin: this.createNotesAdmin().trim() || undefined,
    };

    this.adminUsers.createTutored(body, undefined, false, { transferCache: false }).subscribe({
      next: () => {
        this.feedback.set('Utilisateur sous tutelle cree.');
        this.closeCreateModal();
        this.loadUsers();
      },
      error: () => this.feedback.set('Echec de la creation (verifiez les droits et les donnees).'),
    });
  }

  submitActivateAutonomous(): void {
    const user = this.viewedUser();
    if (!user?.id) return;
    const email = this.activateEmailDraft().trim();
    if (!email) {
      this.feedback.set('Saisissez un e-mail valide.');
      return;
    }
    const body: ActivateAutonomousRequestDto = { email };
    this.detailBusy.set(true);
    this.adminUsers
      .activateAutonomous(user.id, body, undefined, false, { transferCache: false })
      .subscribe({
        next: () => {
          this.detailBusy.set(false);
          this.feedback.set('Activation autonome declenchee (e-mail envoye).');
          this.closeUserDetail();
          this.loadUsers();
        },
        error: () => {
          this.detailBusy.set(false);
          this.feedback.set('Echec de l’association e-mail.');
        },
      });
  }

  dismissFeedback(): void {
    this.feedback.set(null);
  }

  getUserLabel(user: AdminUserRowDto): string {
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || (user.email ?? '—');
  }

  getTypeLabel(type: UserAccountType): string {
    return type === 'AUTONOMOUS' ? 'Autonome' : 'Sous tutelle';
  }

  getStatusLabel(status: UserStatus): string {
    switch (status) {
      case 'ACTIVE':
        return 'Actif';
      case 'SUSPENDED':
        return 'Suspendu';
      case 'PENDING_VALIDATION':
      default:
        return 'En attente';
    }
  }

  getRowClass(user: AdminUserRowDto): string {
    if (this.asStatus(user.status) === 'SUSPENDED') {
      return 'user-row--suspended';
    }
    if (this.asAccountType(user.accountType) === 'TUTORED') {
      return 'user-row--tutored';
    }
    return '';
  }

  getExemptionLabel(user: AdminUserRowDto): string {
    const ex = user.exemptions;
    if (ex?.length) return ex[0] ?? 'Aucune';
    return 'Aucune';
  }

  getAccountTypeSentence(type: UserAccountType): string {
    return type === 'AUTONOMOUS' ? 'Compte autonome' : 'Compte sous tutelle';
  }

  formatCreatedAt(date: string | undefined): string {
    if (!date) return '—';
    return new Intl.DateTimeFormat('fr-FR').format(new Date(date));
  }

  rowAccountType(user: AdminUserRowDto): UserAccountType {
    return this.asAccountType(user.accountType);
  }

  rowStatus(user: AdminUserRowDto): UserStatus {
    return this.asStatus(user.status);
  }

  private asAccountType(raw: string | undefined): UserAccountType {
    return raw === 'TUTORED' ? 'TUTORED' : 'AUTONOMOUS';
  }

  private asStatus(raw: string | undefined): UserStatus {
    if (raw === 'SUSPENDED') return 'SUSPENDED';
    if (raw === 'PENDING_VALIDATION') return 'PENDING_VALIDATION';
    return 'ACTIVE';
  }

  private resetCreateForm(): void {
    this.createFirstName.set('Jean');
    this.createLastName.set('Dupont');
    this.createPhone.set('06 12 34 56 78');
    this.createBirthYear.set(null);
    this.createNotesAdmin.set('');
  }

  updateCreateFirstName(value: string): void {
    this.createFirstName.set(value);
  }

  updateCreateLastName(value: string): void {
    this.createLastName.set(value);
  }

  updateCreatePhone(value: string): void {
    this.createPhone.set(value);
  }

  updateCreateBirthYear(value: string): void {
    const n = parseInt(value, 10);
    this.createBirthYear.set(Number.isFinite(n) ? n : null);
  }

  updateCreateNotesAdmin(value: string): void {
    this.createNotesAdmin.set(value);
  }

  updateActivateEmail(value: string): void {
    this.activateEmailDraft.set(value);
  }
}
