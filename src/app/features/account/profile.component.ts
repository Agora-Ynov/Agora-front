import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { AccountType, UserRole } from '../../core/auth/auth.model';

type SummaryTone = 'success' | 'warning' | 'info';
type SummaryIcon = 'check' | 'clock' | 'calendar';

interface SummaryCard {
  label: string;
  value: number;
  tone: SummaryTone;
  icon: SummaryIcon;
}

interface ExemptionStatus {
  label: string;
  active: boolean;
}

interface QuickAction {
  label: string;
  route: string;
  variant: 'primary' | 'secondary';
  icon?: 'reservation' | 'list' | 'group' | 'admin';
  fragment?: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly isAdmin = computed(() => this.authService.isAdmin());

  readonly displayName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : 'Utilisateur';
  });

  readonly roleLabel = computed(() => this.mapRoleLabel(this.currentUser()?.role));
  readonly accountTypeLabel = computed(() =>
    this.mapAccountTypeLabel(this.currentUser()?.accountType)
  );

  readonly summaryCards = computed<SummaryCard[]>(() => [
    { label: 'Reservations actives', value: 0, tone: 'success', icon: 'check' },
    { label: 'En attente', value: 0, tone: 'warning', icon: 'clock' },
    { label: 'Total reservations', value: 0, tone: 'info', icon: 'calendar' },
  ]);

  readonly exemptions = computed<ExemptionStatus[]>(() => {
    const user = this.currentUser();

    return [
      { label: 'Association', active: user?.exemptions.association ?? false },
      { label: 'Critere social', active: user?.exemptions.social ?? false },
      { label: 'Mandat electif', active: user?.exemptions.mandate ?? false },
    ];
  });

  readonly hasActiveExemption = computed(() => this.exemptions().some(item => item.active));

  readonly quickActions = computed<QuickAction[]>(() => {
    const actions: QuickAction[] = [
      {
        label: 'Nouvelle reservation',
        route: '/catalogue',
        variant: 'primary',
        icon: 'reservation',
      },
      {
        label: 'Voir mes reservations',
        route: '/reservations',
        variant: 'secondary',
        icon: 'list',
      },
      {
        label: "Demande d'affiliation",
        route: '/account',
        fragment: 'exemptions',
        variant: 'secondary',
        icon: 'group',
      },
      {
        label: 'Administration',
        route: '/admin',
        variant: 'secondary',
        icon: 'admin',
        adminOnly: true,
      },
    ];

    return actions.filter(action => !action.adminOnly || this.isAdmin());
  });

  logout(): void {
    this.authService.logout();
  }

  private mapRoleLabel(role?: UserRole): string {
    switch (role) {
      case 'SECRETARY_ADMIN':
      case 'DELEGATE_ADMIN':
        return 'Administrateur';
      case 'GROUP_MANAGER':
        return 'Responsable de groupe';
      case 'CITIZEN':
      default:
        return 'Usager';
    }
  }

  private mapAccountTypeLabel(accountType?: AccountType): string {
    switch (accountType) {
      case 'TUTORED':
        return 'Sous tutelle';
      case 'AUTONOMOUS':
      default:
        return 'Autonome';
    }
  }
}
