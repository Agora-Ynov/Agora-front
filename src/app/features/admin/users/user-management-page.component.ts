import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  AdminUsersService,
  AdminUserRowDto,
  CreateTutoredUserRequestDto,
  ActivateAutonomousRequestDto,
  UpdateTutoredUserRequestDto,
} from '../../../core/api';
import { AuthService } from '../../../core/auth/auth.service';

type AccountTypeFilter = 'ALL' | 'AUTONOMOUS' | 'TUTORED' | 'SUSPENDED';
type UserAccountType = 'AUTONOMOUS' | 'TUTORED';
type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VALIDATION';

@Component({
  selector: 'app-user-management-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-management-page.component.html',
  styleUrl: './user-management-page.component.scss',
})
export class UserManagementPageComponent {
  private readonly adminUsers = inject(AdminUsersService);
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

  readonly statTotal = signal(0);
  readonly statAutonomous = signal(0);
  readonly statTutored = signal(0);
  readonly statSuspended = signal(0);

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

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.users();
    }
    return this.users().filter(user => {
      const haystack = [
        user.firstName ?? '',
        user.lastName ?? '',
        user.email ?? '',
        user.internalRef ?? '',
        user.phone ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  });

  readonly adminDisplayName = computed(() => {
    const admin = this.authService.currentUser();
    return admin ? `${admin.firstName} ${admin.lastName}` : 'Administrateur';
  });

  constructor() {
    this.loadUsers();
  }

  setFilter(value: AccountTypeFilter): void {
    this.filter.set(value);
    this.loadUsers();
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
    const opts = { transferCache: false } as const;

    forkJoin({
      counts: forkJoin({
        total: this.adminUsers.list1(0, 1, undefined, undefined, 'body', false, opts),
        autonomous: this.adminUsers.list1(0, 1, 'AUTONOMOUS', undefined, 'body', false, opts),
        tutored: this.adminUsers.list1(0, 1, 'TUTORED', undefined, 'body', false, opts),
        suspended: this.adminUsers.list1(0, 1, undefined, 'SUSPENDED', 'body', false, opts),
      }),
      rows: this.adminUsers.list1(0, 500, accountType, status, 'body', false, opts),
    }).subscribe({
      next: ({ counts, rows }) => {
        this.statTotal.set(counts.total.totalElements ?? 0);
        this.statAutonomous.set(counts.autonomous.totalElements ?? 0);
        this.statTutored.set(counts.tutored.totalElements ?? 0);
        this.statSuspended.set(counts.suspended.totalElements ?? 0);
        this.users.set(rows.content ?? []);
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

  resendActivation(user: AdminUserRowDto): void {
    const id = user.id;
    if (!id) return;
    this.adminUsers.resendActivation(id, undefined, false, { transferCache: false }).subscribe({
      next: () => this.feedback.set('Courriel d’activation renvoye.'),
      error: () => this.feedback.set('Impossible de renvoyer l’activation.'),
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
