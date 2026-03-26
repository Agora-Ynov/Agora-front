import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type AccountTypeFilter = 'ALL' | 'AUTONOMOUS' | 'TUTORED' | 'SUSPENDED';
type UserAccountType = 'AUTONOMOUS' | 'TUTORED';
type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VALIDATION';

interface AdminUserMockDto {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  accountType: UserAccountType;
  status: UserStatus;
  phone: string;
  internalRef: string | null;
  notesAdmin: string | null;
  exemptions: string[];
  createdAt: string;
}

interface AdminUsersResponse {
  content: AdminUserMockDto[];
  totalElements: number;
  totalPages: number;
}

@Component({
  selector: 'app-user-management-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-management-page.component.html',
  styleUrl: './user-management-page.component.scss',
})
export class UserManagementPageComponent {
  private readonly http = inject(HttpClient);

  readonly loading = signal(true);
  readonly users = signal<AdminUserMockDto[]>([]);
  readonly searchTerm = signal('');
  readonly filter = signal<AccountTypeFilter>('ALL');
  readonly isCreateModalOpen = signal(false);
  readonly createAccountType = signal<UserAccountType>('AUTONOMOUS');
  readonly createFirstName = signal('Jean');
  readonly createLastName = signal('Dupont');
  readonly createEmail = signal('jean.dupont@email.fr');
  readonly createPhone = signal('06 12 34 56 78');
  readonly createAssociation = signal(false);
  readonly createSocial = signal(false);
  readonly createMandate = signal(false);
  readonly isCreateFormValid = computed(() => {
    const hasIdentity =
      this.createFirstName().trim().length > 0 && this.createLastName().trim().length > 0;
    const hasRequiredEmail =
      this.createAccountType() === 'TUTORED' || this.createEmail().trim().length > 0;

    return hasIdentity && hasRequiredEmail;
  });

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const selectedFilter = this.filter();

    return this.users().filter(user => {
      const matchesFilter =
        selectedFilter === 'ALL' ||
        (selectedFilter === 'AUTONOMOUS' && user.accountType === 'AUTONOMOUS') ||
        (selectedFilter === 'TUTORED' && user.accountType === 'TUTORED') ||
        (selectedFilter === 'SUSPENDED' && user.status === 'SUSPENDED');

      if (!matchesFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = [
        user.firstName,
        user.lastName,
        user.email ?? '',
        user.internalRef ?? '',
        user.phone,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  });

  readonly totalCount = computed(() => this.users().length);
  readonly autonomousCount = computed(
    () => this.users().filter(user => user.accountType === 'AUTONOMOUS').length
  );
  readonly tutoredCount = computed(
    () => this.users().filter(user => user.accountType === 'TUTORED').length
  );
  readonly suspendedCount = computed(
    () => this.users().filter(user => user.status === 'SUSPENDED').length
  );

  constructor() {
    this.http
      .get<AdminUsersResponse>('/assets/mocks/api/admin.users.get.json')
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: response => {
          this.users.set(response.content);
          this.loading.set(false);
        },
        error: () => {
          this.users.set([]);
          this.loading.set(false);
        },
      });
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(value: AccountTypeFilter): void {
    this.filter.set(value);
  }

  openCreateModal(): void {
    this.resetCreateForm();
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  setCreateAccountType(value: UserAccountType): void {
    this.createAccountType.set(value);
  }

  updateCreateFirstName(value: string): void {
    this.createFirstName.set(value);
  }

  updateCreateLastName(value: string): void {
    this.createLastName.set(value);
  }

  updateCreateEmail(value: string): void {
    this.createEmail.set(value);
  }

  updateCreatePhone(value: string): void {
    this.createPhone.set(value);
  }

  toggleCreateAssociation(checked: boolean): void {
    this.createAssociation.set(checked);
  }

  toggleCreateSocial(checked: boolean): void {
    this.createSocial.set(checked);
  }

  toggleCreateMandate(checked: boolean): void {
    this.createMandate.set(checked);
  }

  createUser(): void {
    if (!this.isCreateFormValid()) {
      return;
    }

    const nextId = `mock-${Date.now()}`;
    const isTutored = this.createAccountType() === 'TUTORED';
    const phone = this.createPhone().trim() || '06 00 00 00 00';
    const exemptions = [
      this.createAssociation() ? 'Asso.' : null,
      this.createSocial() ? 'Social' : null,
      this.createMandate() ? 'Mandat' : null,
    ].filter((value): value is string => Boolean(value));

    const newUser: AdminUserMockDto = {
      id: nextId,
      email: isTutored ? null : this.createEmail().trim(),
      firstName: this.createFirstName().trim(),
      lastName: this.createLastName().trim(),
      accountType: this.createAccountType(),
      status: 'ACTIVE',
      phone,
      internalRef: isTutored ? this.buildInternalRef() : null,
      notesAdmin: null,
      exemptions,
      createdAt: new Date().toISOString(),
    };

    this.users.update(users => [newUser, ...users]);
    this.closeCreateModal();
  }

  getUserLabel(user: AdminUserMockDto): string {
    return `${user.firstName} ${user.lastName}`;
  }

  getContactLabel(user: AdminUserMockDto): string {
    return user.email ?? `# ${user.internalRef}`;
  }

  getContactSubLabel(user: AdminUserMockDto): string {
    return user.email ? user.phone : `Sans email\n${user.phone}`;
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

  getRowClass(user: AdminUserMockDto): string {
    if (user.status === 'SUSPENDED') {
      return 'user-row--suspended';
    }

    if (user.accountType === 'TUTORED') {
      return 'user-row--tutored';
    }

    return '';
  }

  getExemptionLabel(user: AdminUserMockDto): string {
    return user.exemptions[0] ?? 'Aucune';
  }

  private resetCreateForm(): void {
    this.createAccountType.set('AUTONOMOUS');
    this.createFirstName.set('Jean');
    this.createLastName.set('Dupont');
    this.createEmail.set('jean.dupont@email.fr');
    this.createPhone.set('06 12 34 56 78');
    this.createAssociation.set(false);
    this.createSocial.set(false);
    this.createMandate.set(false);
  }

  private buildInternalRef(): string {
    const normalizedLastName = this.createLastName()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase()
      .slice(0, 4)
      .padEnd(4, 'X');

    const year = new Date().getFullYear().toString();
    const sequence = String(this.tutoredCount() + 1).padStart(3, '0');

    return `${normalizedLastName}-${year}-${sequence}`;
  }
}
