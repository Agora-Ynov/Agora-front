import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminGroupService } from '../../../core/api/admin-group.service';
import {
  AdminGroupDto,
  AdminGroupFormType,
  AdminGroupMemberDto,
  CreateAdminGroupDto,
} from '../../../core/api/models/admin-group.model';

type GroupIcon = 'crown' | 'service' | 'group';

interface AdminGroupCardViewModel {
  id: string;
  name: string;
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
  readonly isCreating = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly createGroupForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    groupType: ['AUTRE' as AdminGroupFormType, [Validators.required]],
    description: ['', [Validators.maxLength(240)]],
  });

  readonly groupTypeOptions: Array<{ value: AdminGroupFormType; label: string }> = [
    { value: 'AUTRE', label: 'Autre' },
    { value: 'SERVICE', label: 'Service municipal' },
    { value: 'ASSOCIATION', label: 'Association' },
  ];

  readonly groupCards = computed<AdminGroupCardViewModel[]>(() =>
    this.groups().map(group => ({
      id: group.id,
      name: group.name,
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
  }

  openCreateModal(): void {
    this.createGroupForm.reset({
      name: '',
      groupType: 'AUTRE',
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
    const groupType = (formValue.groupType ?? 'AUTRE') as AdminGroupFormType;

    const payload = this.buildCreatePayload(name, groupType);

    this.isCreating.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.adminGroupService
      .createGroup(payload)
      .pipe(finalize(() => this.isCreating.set(false)))
      .subscribe({
        next: createdGroup => {
          this.groups.set([createdGroup, ...this.groups()]);
          this.successMessage.set('Groupe cree avec succes.');
          this.closeCreateModal();
        },
        error: () => {
          this.errorMessage.set('Impossible de creer le groupe.');
        },
      });
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
        next: groups => this.groups.set(groups),
        error: () => {
          this.groups.set([]);
          this.errorMessage.set('Impossible de charger les groupes administratifs.');
        },
      });
  }

  private getBadge(group: AdminGroupDto): string {
    if (group.groupType === 'ASSOCIATION') {
      return 'Association';
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
      return "Ce groupe fait partie de la configuration initiale et porte des droits etendus.";
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
