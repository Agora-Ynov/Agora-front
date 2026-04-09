import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { AdminGroupService } from '../../../core/api/admin-group.service';
import { AdminUsersListResponse } from '../../../core/api';
import { ApiService } from '../../../core/api/api.service';
import { AdminUserRowDto } from '../../../core/api/model/adminUserRowDto';
import { UpdateAdminGroupRequestDto } from '../../../core/api/model/updateAdminGroupRequestDto';
import {
  AdminGroupDto,
  AdminGroupFormType,
  AdminGroupMemberDto,
  AdminGroupDiscountAppliesTo,
  AdminGroupDiscountType,
  CreateAdminGroupDto,
} from '../../../core/api/models/admin-group.model';

type GroupIcon = 'crown' | 'service' | 'group';

interface AdminGroupCardViewModel {
  id: string;
  name: string;
  isPreset: boolean;
  badge: string;
  description: string;
  memberCount: number;
  specialRights: string[];
  highlight: string;
  icon: GroupIcon;
}

@Component({
  selector: 'app-admin-groups',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-groups.component.html',
  styleUrl: './admin-groups.component.scss',
})
export class AdminGroupsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly adminGroupService = inject(AdminGroupService);
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userSearchTrigger = new Subject<string>();

  private readonly frenchDateFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  readonly groups = signal<AdminGroupDto[]>([]);
  readonly selectedGroup = signal<AdminGroupDto | null>(null);
  readonly groupMembers = signal<AdminGroupMemberDto[]>([]);
  readonly loading = signal(true);
  readonly loadingMembers = signal(false);
  readonly isCreateModalOpen = signal(false);
  readonly isEditModalOpen = signal(false);
  readonly isCreating = signal(false);
  readonly isSavingEdit = signal(false);
  readonly memberBusy = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly memberSearchInput = signal('');
  readonly userSuggestions = signal<AdminUserRowDto[]>([]);
  readonly userSearchLoading = signal(false);
  readonly pickedUser = signal<AdminUserRowDto | null>(null);
  readonly editingGroup = signal<AdminGroupDto | null>(null);

  readonly createGroupForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    groupTypeDraft: ['Autre', [Validators.required, Validators.maxLength(80)]],
    description: ['', [Validators.maxLength(240)]],
  });

  readonly editGroupForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    canViewImmobilier: [true],
    canBookImmobilier: [true],
    canViewMobilier: [false],
    canBookMobilier: [false],
    discountType: ['NONE' as AdminGroupDiscountType],
    discountValue: [0],
    discountAppliesTo: ['ALL' as AdminGroupDiscountAppliesTo],
  });

  readonly discountTypeOptions: Array<{ value: AdminGroupDiscountType; label: string }> = [
    { value: 'NONE', label: 'Aucune remise' },
    { value: 'PERCENTAGE', label: 'Pourcentage' },
    { value: 'FIXED_AMOUNT', label: 'Montant fixe' },
    { value: 'FULL_EXEMPT', label: 'Exoneration totale' },
  ];

  readonly discountAppliesOptions: Array<{ value: AdminGroupDiscountAppliesTo; label: string }> = [
    { value: 'ALL', label: 'Toutes les ressources' },
    { value: 'IMMOBILIER_ONLY', label: 'Immobilier uniquement' },
    { value: 'MOBILIER_ONLY', label: 'Mobilier uniquement' },
  ];

  /** Liste déroulante type de groupe (sans datalist : évite la liste vide quand la valeur courante filtre tout). */
  readonly groupTypePickerOpen = signal(false);
  /** Miroir du champ pour filtrer les suggestions (le FormControl ne déclenche pas les computed). */
  readonly groupTypeDraftMirror = signal('');

  readonly groupTypeSuggestions = computed(() => {
    const presets = ['Service municipal', 'Association', 'Autre'];
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (label: string) => {
      const k = AdminGroupsComponent.normalizeTypeKey(label);
      if (!k || seen.has(k)) {
        return;
      }
      seen.add(k);
      out.push(label.trim());
    };
    for (const p of presets) {
      push(p);
    }
    const extras: string[] = [];
    for (const g of this.groups()) {
      const badge = this.getBadge(g);
      if (badge) {
        extras.push(badge.trim());
      }
    }
    extras.sort((a, b) => a.localeCompare(b, 'fr'));
    for (const e of extras) {
      push(e);
    }
    return out;
  });

  readonly visibleGroupTypeSuggestions = computed(() => {
    const q = AdminGroupsComponent.normalizeTypeKey(this.groupTypeDraftMirror());
    const all = this.groupTypeSuggestions();
    if (!q) {
      return all;
    }
    return all.filter(s => AdminGroupsComponent.normalizeTypeKey(s).includes(q));
  });

  readonly groupCards = computed<AdminGroupCardViewModel[]>(() =>
    this.groups().map(group => ({
      id: group.id,
      name: group.name,
      isPreset: group.isPreset,
      badge: this.getBadge(group),
      description: this.getDescription(group),
      memberCount: group.memberCount,
      specialRights: this.getSpecialRights(group),
      highlight: this.getHighlight(group),
      icon: this.getIcon(group),
    }))
  );

  readonly adminGroupPage = signal(0);
  readonly adminGroupPageSize = 4;

  readonly pagedGroupCards = computed(() => {
    const all = this.groupCards();
    const start = this.adminGroupPage() * this.adminGroupPageSize;
    return all.slice(start, start + this.adminGroupPageSize);
  });

  readonly adminGroupPageCount = computed(() => {
    const n = this.groupCards().length;
    return Math.max(1, Math.ceil(n / this.adminGroupPageSize));
  });

  constructor() {
    this.userSearchTrigger
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap(raw => {
          const q = raw.trim();
          if (q.length < 2) {
            this.userSuggestions.set([]);
            return of<AdminUserRowDto[]>([]);
          }
          this.userSearchLoading.set(true);
          return this.api
            .getJson<AdminUsersListResponse>('/api/admin/users', {
              page: 0,
              size: 15,
              q,
            })
            .pipe(
              map(res => res.content ?? []),
              finalize(() => this.userSearchLoading.set(false)),
              catchError(() => of([]))
            );
        }),
        takeUntilDestroyed()
      )
      .subscribe(rows => this.userSuggestions.set(rows));

    this.loadGroups();

    effect(() => {
      const locked =
        this.selectedGroup() !== null ||
        this.isEditModalOpen() ||
        this.isCreateModalOpen();
      const { documentElement: html, body } = document;
      if (locked) {
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
      } else {
        html.style.overflow = '';
        body.style.overflow = '';
      }
    });
    this.destroyRef.onDestroy(() => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    });
  }

  openMembers(groupId: string): void {
    const group = this.groups().find(item => item.id === groupId) ?? null;
    if (!group) {
      return;
    }

    this.selectedGroup.set(group);
    this.groupMembers.set([]);
    this.resetMemberPicker();
    this.loadingMembers.set(true);

    this.adminGroupService
      .getGroupMembers(groupId)
      .pipe(finalize(() => this.loadingMembers.set(false)))
      .subscribe({
        next: members => this.groupMembers.set(members),
        error: () => this.groupMembers.set([]),
      });
  }

  closeMembersModal(): void {
    this.selectedGroup.set(null);
    this.groupMembers.set([]);
    this.resetMemberPicker();
  }

  addMemberToSelectedGroup(): void {
    const group = this.selectedGroup();
    const picked = this.pickedUser();
    const userId = picked?.id ?? null;
    if (!group?.id || !userId) {
      this.errorMessage.set(
        'Choisissez un utilisateur dans les suggestions (recherche par nom, prénom ou e-mail).'
      );
      return;
    }
    this.errorMessage.set('');
    this.memberBusy.set(true);
    this.adminGroupService
      .addMember(group.id, userId)
      .pipe(finalize(() => this.memberBusy.set(false)))
      .subscribe({
        next: () => {
          this.resetMemberPicker();
          this.successMessage.set('Membre ajoute.');
          this.openMembers(group.id);
          this.loadGroups();
        },
        error: () => this.errorMessage.set("Impossible d'ajouter ce membre."),
      });
  }

  removeMemberFromSelectedGroup(member: AdminGroupMemberDto): void {
    const group = this.selectedGroup();
    if (!group?.id || !member.userId) return;
    if (!globalThis.confirm(`Retirer ${member.firstName} ${member.lastName} du groupe ?`)) {
      return;
    }
    this.memberBusy.set(true);
    this.adminGroupService
      .removeMember(group.id, member.userId)
      .pipe(finalize(() => this.memberBusy.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Membre retire.');
          this.openMembers(group.id);
          this.loadGroups();
        },
        error: () => this.errorMessage.set('Impossible de retirer ce membre.'),
      });
  }

  openEditModal(group: AdminGroupDto): void {
    if (group.isPreset) {
      this.errorMessage.set('Les groupes systeme ne peuvent pas etre modifies.');
      return;
    }
    this.editingGroup.set(group);
    this.editGroupForm.patchValue({
      name: group.name,
      canViewImmobilier: group.canViewImmobilier ?? true,
      canBookImmobilier: group.canBookImmobilier,
      canViewMobilier: group.canViewMobilier ?? false,
      canBookMobilier: group.canBookMobilier,
      discountType: group.discountType,
      discountValue: group.discountValue,
      discountAppliesTo: group.discountAppliesTo ?? 'ALL',
    });
    this.errorMessage.set('');
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingGroup.set(null);
  }

  submitEditGroup(): void {
    if (this.editGroupForm.invalid) {
      this.editGroupForm.markAllAsTouched();
      return;
    }
    const g = this.editingGroup();
    if (!g?.id) return;
    const v = this.editGroupForm.getRawValue();
    const body: UpdateAdminGroupRequestDto = {
      name: (v.name ?? '').trim(),
      canViewImmobilier: v.canViewImmobilier ?? undefined,
      canBookImmobilier: v.canBookImmobilier ?? undefined,
      canViewMobilier: v.canViewMobilier ?? undefined,
      canBookMobilier: v.canBookMobilier ?? undefined,
      discountType: v.discountType as UpdateAdminGroupRequestDto['discountType'],
      discountValue: v.discountValue ?? undefined,
      discountAppliesTo: v.discountAppliesTo as UpdateAdminGroupRequestDto['discountAppliesTo'],
    };
    this.isSavingEdit.set(true);
    this.errorMessage.set('');
    this.adminGroupService
      .updateGroup(g.id, body)
      .pipe(finalize(() => this.isSavingEdit.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Groupe mis a jour.');
          this.closeEditModal();
          this.loadGroups();
        },
        error: () => this.errorMessage.set('Impossible de mettre a jour le groupe.'),
      });
  }

  openEditByCardId(groupId: string): void {
    const g = this.groups().find(x => x.id === groupId);
    if (g) {
      this.openEditModal(g);
    }
  }

  confirmDeleteByCardId(groupId: string): void {
    const g = this.groups().find(x => x.id === groupId);
    if (g) {
      this.confirmDeleteGroup(g);
    }
  }

  confirmDeleteGroup(group: AdminGroupDto): void {
    if (group.isPreset) {
      this.errorMessage.set('Les groupes systeme ne peuvent pas etre supprimes.');
      return;
    }
    if (!globalThis.confirm(`Supprimer definitivement le groupe « ${group.name} » ?`)) {
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    this.adminGroupService
      .deleteGroup(group.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Groupe supprime.');
          this.loadGroups();
        },
        error: () => this.errorMessage.set('Suppression impossible (membres restants ou droits).'),
      });
  }

  openCreateModal(): void {
    this.createGroupForm.reset({
      name: '',
      groupTypeDraft: 'Autre',
      description: '',
    });
    this.groupTypeDraftMirror.set('Autre');
    this.groupTypePickerOpen.set(true);
    this.errorMessage.set('');
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
    this.groupTypePickerOpen.set(false);
  }

  onGroupTypeDraftInput(value: string): void {
    this.groupTypeDraftMirror.set(value);
    this.groupTypePickerOpen.set(true);
  }

  pickGroupTypeSuggestion(label: string): void {
    const v = label.trim();
    this.createGroupForm.patchValue({ groupTypeDraft: v });
    this.groupTypeDraftMirror.set(v);
    this.groupTypePickerOpen.set(false);
  }

  toggleGroupTypePicker(): void {
    this.groupTypePickerOpen.update(o => !o);
  }

  private static normalizeTypeKey(raw: string): string {
    return raw
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');
  }

  submitCreateGroup(): void {
    if (this.createGroupForm.invalid) {
      this.createGroupForm.markAllAsTouched();
      return;
    }

    const formValue = this.createGroupForm.getRawValue();
    const name = (formValue.name ?? '').trim();
    const typeDraft = (formValue.groupTypeDraft ?? '').trim();
    const preset = this.resolvePresetFromTypeInput(typeDraft);
    const apiName = preset != null || !typeDraft ? name : `${name} (${typeDraft})`.slice(0, 200);
    const groupType: AdminGroupFormType = preset ?? 'AUTRE';

    const payload = this.buildCreatePayload(apiName, groupType);

    this.isCreating.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.adminGroupService
      .createGroup(payload)
      .pipe(finalize(() => this.isCreating.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Groupe cree avec succes.');
          this.closeCreateModal();
          this.loadGroups();
        },
        error: () => {
          this.errorMessage.set('Impossible de creer le groupe.');
        },
      });
  }

  onMemberSearchInput(value: string): void {
    this.memberSearchInput.set(value);
    this.pickedUser.set(null);
    this.userSearchTrigger.next(value);
  }

  pickUserForGroup(user: AdminUserRowDto): void {
    this.pickedUser.set(user);
    this.memberSearchInput.set(this.userSuggestLabel(user));
    this.userSuggestions.set([]);
  }

  userSuggestLabel(user: AdminUserRowDto): string {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    if (name && user.email) {
      return `${name} (${user.email})`;
    }
    return name || user.email || user.id || '';
  }

  private resetMemberPicker(): void {
    this.memberSearchInput.set('');
    this.pickedUser.set(null);
    this.userSuggestions.set([]);
  }

  memberRoleLabel(role: AdminGroupMemberDto['role']): string {
    return role === 'MANAGER' ? 'Gestionnaire' : 'Membre';
  }

  formatJoinedAt(value: string): string {
    return this.frenchDateFormatter.format(new Date(value));
  }

  goToAdminGroupPage(pageIndex: number): void {
    const last = this.adminGroupPageCount() - 1;
    this.adminGroupPage.set(Math.max(0, Math.min(pageIndex, last)));
  }

  private loadGroups(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.adminGroupService
      .getGroups()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: groups => {
          this.errorMessage.set('');
          this.groups.set(groups);
          const pages = Math.max(1, Math.ceil(groups.length / this.adminGroupPageSize));
          if (this.adminGroupPage() >= pages) {
            this.adminGroupPage.set(Math.max(0, pages - 1));
          }
        },
        error: () => {
          this.groups.set([]);
          this.errorMessage.set('Impossible de charger les groupes administratifs.');
        },
      });
  }

  /**
   * Reconnaissance insensible à la casse / accents des profils Service, Association, Autre.
   * Tout autre libellé non vide → type AUTRE en base (libellé conservé dans le nom ou la catégorie affichée).
   */
  private resolvePresetFromTypeInput(raw: string): AdminGroupFormType | null {
    const t = AdminGroupsComponent.normalizeTypeKey(raw);
    if (!t) {
      return null;
    }
    if (t === 'service municipal' || t === 'service' || t.startsWith('service')) {
      return 'SERVICE';
    }
    if (t === 'association' || t.startsWith('association')) {
      return 'ASSOCIATION';
    }
    if (t === 'autre' || t === 'autres') {
      return 'AUTRE';
    }
    return null;
  }

  private getBadge(group: AdminGroupDto): string {
    if (group.groupType === 'ASSOCIATION') {
      return 'Association';
    }
    if (group.groupType === 'SERVICE') {
      return 'Service';
    }

    const lowerName = group.name.toLowerCase();

    if (lowerName.includes('conseil')) {
      return 'Conseil Municipal';
    }

    if (lowerName.includes('service') || lowerName.includes('mairie')) {
      return 'Service';
    }

    return group.isPreset ? 'Groupe systeme' : 'Groupe';
  }

  private getDescription(group: AdminGroupDto): string {
    if (group.description?.trim()) {
      return group.description;
    }

    if (group.groupType === 'ASSOCIATION') {
      return 'Association locale avec gestion collective des reservations et exonerations';
    }

    const lowerName = group.name.toLowerCase();

    if (lowerName.includes('conseil')) {
      return 'Membres elus du conseil municipal';
    }

    if (lowerName.includes('service') || lowerName.includes('mairie')) {
      return 'Personnel administratif de la collectivite';
    }

    if (group.isPreset) {
      return 'Groupe predefini de la configuration administrative';
    }

    return 'Groupe personnalise pour la gestion des droits et reservations';
  }

  private getSpecialRights(group: AdminGroupDto): string[] {
    const rights: string[] = [];

    if (group.canBookImmobilier) {
      rights.push('Reservation immobilier');
    }

    if (group.canBookMobilier) {
      rights.push('Reservation mobilier');
    }

    if (group.discountType === 'FULL_EXEMPT') {
      rights.push('Exoneration totale');
    } else if (group.discountType === 'PERCENTAGE' && group.discountValue > 0) {
      rights.push(`Reduction ${group.discountValue}%`);
    } else if (group.discountType === 'FIXED_AMOUNT' && group.discountValue > 0) {
      rights.push(`Remise fixe ${group.discountValue}`);
    }

    if (group.isPreset) {
      rights.push('Acces prioritaire');
    }

    return rights;
  }

  private getHighlight(group: AdminGroupDto): string {
    if (group.groupType === 'ASSOCIATION') {
      return "Ce groupe peut reserver au nom de l'association et beneficier d'exonerations adaptees.";
    }

    if (group.discountType === 'FULL_EXEMPT') {
      return "Ce groupe beneficie d'une exoneration totale sur les reservations.";
    }

    if (group.isPreset) {
      return 'Ce groupe fait partie de la configuration initiale et porte des droits etendus.';
    }

    return 'Ce groupe est personnalisable et peut etre ajuste selon les besoins du service.';
  }

  private getIcon(group: AdminGroupDto): GroupIcon {
    if (group.groupType === 'ASSOCIATION') {
      return 'group';
    }

    const lowerName = group.name.toLowerCase();

    if (lowerName.includes('conseil')) {
      return 'crown';
    }

    if (lowerName.includes('service') || lowerName.includes('mairie')) {
      return 'service';
    }

    return 'group';
  }

  private buildCreatePayload(name: string, groupType: AdminGroupFormType): CreateAdminGroupDto {
    switch (groupType) {
      case 'SERVICE':
        return {
          name,
          canViewImmobilier: true,
          canBookImmobilier: true,
          canViewMobilier: true,
          canBookMobilier: true,
          discountType: 'PERCENTAGE',
          discountValue: 30,
          discountAppliesTo: 'ALL',
        };
      case 'ASSOCIATION':
        return {
          name,
          canViewImmobilier: true,
          canBookImmobilier: true,
          canViewMobilier: true,
          canBookMobilier: true,
          discountType: 'FULL_EXEMPT',
          discountValue: 0,
          discountAppliesTo: 'ALL',
        };
      case 'AUTRE':
      default:
        return {
          name,
          canViewImmobilier: true,
          canBookImmobilier: true,
          canViewMobilier: false,
          canBookMobilier: false,
          discountType: 'NONE',
          discountValue: 0,
          discountAppliesTo: 'ALL',
        };
    }
  }
}
