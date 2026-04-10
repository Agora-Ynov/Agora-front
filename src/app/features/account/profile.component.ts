import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ReservationSummaryResponseDto } from '../../core/api/model/reservationSummaryResponseDto';
import { AuthService } from '../../core/auth/auth.service';
import { AccountType, UserRole } from '../../core/auth/auth.model';
import { ReservationService } from '../reservation/reservation.service';

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
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly reservationService = inject(ReservationService);
  private readonly destroyRef = inject(DestroyRef);
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

  private readonly reservationStats = signal({ active: 0, pending: 0, total: 0 });

  readonly summaryCards = computed<SummaryCard[]>(() => {
    const s = this.reservationStats();
    return [
      { label: 'Reservations actives', value: s.active, tone: 'success', icon: 'check' },
      { label: 'En attente', value: s.pending, tone: 'warning', icon: 'clock' },
      { label: 'Total reservations', value: s.total, tone: 'info', icon: 'calendar' },
    ];
  });

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
        label: "Liste d'attente",
        route: '/account/waitlist',
        variant: 'secondary',
        icon: 'list',
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

  ngOnInit(): void {
    this.reservationService
      .listMyReservations(0, 200)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          const content = page.content ?? [];
          let active = 0;
          let pending = 0;
          for (const r of content) {
            const st = r.status as ReservationSummaryResponseDto.StatusEnum | undefined;
            if (st === ReservationSummaryResponseDto.StatusEnum.Confirmed) {
              active++;
            } else if (
              st === ReservationSummaryResponseDto.StatusEnum.PendingValidation ||
              st === ReservationSummaryResponseDto.StatusEnum.PendingDocument
            ) {
              pending++;
            }
          }
          this.reservationStats.set({
            active,
            pending,
            total: content.length,
          });
        },
        error: () => this.reservationStats.set({ active: 0, pending: 0, total: 0 }),
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
