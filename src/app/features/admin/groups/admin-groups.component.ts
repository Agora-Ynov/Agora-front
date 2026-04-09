import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminGroupService } from '../../../core/api/admin-group.service';
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
  readonly memberUserIdDraft = signal('');
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

  readonly groupTypeSuggestions = computed(() => {
    const presets = ['Service municipal', 'Association', 'Autre'];
    const seen = new Set(presets.map(p => p.toLowerCase()));
    const extras: string[] = [];
    for (const g of this.groups()) {
      const badge = this.getBadge(g);
      const key = badge.trim().toLowerCase();
      if (badge && !seen.has(key)) {
        seen.add(key);
        extras.push(badge);
      }
    }
    extras.sort((a, b) => a.localeCompare(b, 'fr'));
    return [...presets, ...extras];
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

  constructor() {
    this.loadGroups();
  }

  openMembers(groupId: string): void {
    const group = this.groups().find(item => item.id === groupId) ?? null;
    if (!group) {
      return;
    }

    this.selectedGroup.set(group);
    this.groupMembers.set([]);
    this.memberUserIdDraft.set('');
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
    this.memberUserIdDraft.set('');
  }

  addMemberToSelectedGroup(): void {
    const group = this.selectedGroup();
    const raw = this.memberUserIdDraft().trim();
    if (!group?.id || !raw) {
      this.errorMessage.set('Saisissez un identifiant utilisateur (UUID).');
      return;
    }
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(raw)) {
      this.errorMessage.set('UUID utilisateur invalide.');
      return;
    }
    this.errorMessage.set('');
    this.memberBusy.set(true);
    this.adminGroupService
      .addMember(group.id, raw)
      .pipe(finalize(() => this.memberBusy.set(false)))
      .subscribe({
        next: () => {
          this.memberUserIdDraft.set('');
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
    this.errorMessage.set('');
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
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
    const apiName =
      preset != null || !typeDraft ? name : `${name} (${typeDraft})`.slice(0, 200);
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

  updateMemberUserIdDraft(value: string): void {
    this.memberUserIdDraft.set(value);
  }

  memberRoleLabel(role: AdminGroupMemberDto['role']): string {
    return role === 'MANAGER' ? 'Gestionnaire' : 'Membre';
  }

  formatJoinedAt(value: string): string {
    return this.frenchDateFormatter.format(new Date(value));
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
        },
        error: () => {
          this.groups.set([]);
          this.errorMessage.set('Impossible de charger les groupes administratifs.');
        },
      });
  }

  /** Aligné sur les libellés du datalist et variantes courantes. */
  private resolvePresetFromTypeInput(raw: string): AdminGroupFormType | null {
    const t = raw.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    if (!t) {
      return null;
    }
    if (t === 'service municipal' || t === 'service' || t.startsWith('service ')) {
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
