import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';

export interface HeaderQuickAction {
  label: string;
  route: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss'],
})
export class HeaderComponent {
  /** Exposé au template (menu utilisateur conditionnel). */
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  currentUser = this.authService.currentUser;
  readonly isSessionActive = this.authService.isSessionActive;
  readonly isMenuOpen = signal(false);
  /** Menu compte (desktop) : fermé après navigation ou clic extérieur. */
  readonly userMenuOpen = signal(false);

  readonly homeLink = computed(() => '/');

  /** Lien « Administration » : masqué pour le staff plein périmètre (hub sur l’accueil). */
  readonly showAdminHeaderLink = computed(
    () => this.showAdminNav() && !this.authService.canAccessFullAdminSpa()
  );

  fullName = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.email || 'Mon compte';
  });

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.userMenuOpen.set(false);
        this.closeMenu();
      });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.userMenuOpen.set(false);
  }

  toggleMenu(): void {
    this.isMenuOpen.update(isOpen => !isOpen);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen.update(open => !open);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  readonly showAdminNav = computed(() => {
    if (!this.currentUser()) {
      return false;
    }
    return this.authService.canSeeAdminNavigation();
  });

  readonly showDelegationAdmin = computed(
    () => !!this.currentUser() && this.authService.hasRole('SUPERADMIN')
  );

  readonly adminQuickActions = computed<HeaderQuickAction[]>(() => {
    if (this.authService.canAccessFullAdminSpa()) {
      return [
        { label: 'Mes réservations', route: '/reservations' },
        { label: 'Utilisateurs', route: '/admin/users' },
        { label: 'Réservations', route: '/admin/reservations' },
        { label: "Journal d'audit", route: '/admin/audit' },
        { label: 'Fermetures', route: '/admin/blackouts' },
        { label: 'Ressources', route: '/admin/resources' },
        { label: 'Groupes', route: '/admin/groups' },
      ];
    }
    return [
      { label: 'Mes réservations', route: '/reservations' },
      { label: 'Ressources', route: '/admin/resources' },
    ];
  });

  readonly adminNavLink = computed(() => this.authService.getAdminEntryPath());
  readonly adminNavLabel = computed(() => this.authService.getAdminNavLabel());

  readonly isImpersonating = computed(() => this.authService.isImpersonating());
  readonly impersonationAdminEmail = computed(() => this.authService.getImpersonatedByEmail());

  logout(): void {
    this.closeMenu();
    this.closeUserMenu();
    this.authService.logout();
  }

  exitImpersonation(): void {
    this.closeMenu();
    this.closeUserMenu();
    this.authService.endImpersonation().subscribe({
      next: () => this.router.navigateByUrl(this.authService.getAdminEntryPath()),
      error: () => {
        /* session incohérente : retour login géré ailleurs si besoin */
      },
    });
  }
}
