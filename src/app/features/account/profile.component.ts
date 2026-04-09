import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

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
  icon?: 'reservation' | 'list' | 'group';
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;
  readonly isAdmin = computed(() => this.authService.isAdmin());

  readonly displayName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : 'Utilisateur';
  });

  readonly roleSummary = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return this.mapRoleLabel(undefined);
    }
    if (user.membershipRoles.length === 0) {
      return this.mapRoleLabel(user.role);
    }
    return user.membershipRoles.map(r => this.mapRoleLabel(r)).join(' · ');
  });
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
    const adminRoute = this.authService.getAdminEntryPath();
    const adminLabel = this.authService.getAdminNavLabel();
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
        route: '/account/affiliation-request',
        variant: 'secondary',
        icon: 'group',
      },
      {
        label: adminLabel,
        route: adminRoute,
        variant: 'secondary',
        adminOnly: true,
      },
    ];

    return actions.filter(action => !action.adminOnly || this.isAdmin());
  });

  constructor() {
    this.route.fragment.subscribe(fragment => {
      if (fragment === 'exemptions') {
        void this.router.navigateByUrl('/account/affiliation-request');
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  private mapRoleLabel(role?: UserRole): string {
    switch (role) {
      case 'SUPERADMIN':
        return 'Super administrateur';
      case 'SECRETARY_ADMIN':
      case 'DELEGATE_ADMIN':
      case 'ADMIN_SUPPORT':
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
