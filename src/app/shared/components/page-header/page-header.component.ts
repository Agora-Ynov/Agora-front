import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss'],
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  currentUser = this.authService.currentUser;
  readonly isSessionActive = this.authService.isSessionActive;
  homeLink = computed(() => '/');
  readonly isMenuOpen = signal(false);

  fullName = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.email || 'Mon compte';
  });

  toggleMenu(): void {
    this.isMenuOpen.update(isOpen => !isOpen);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  readonly showAdminNav = computed(() => {
    if (!this.currentUser()) {
      return false;
    }
    return this.authService.canSeeAdminNavigation();
  });

  /** Superadmin : utilisateur chargé (évite d’afficher le lien sur JWT / état transitoire seul). */
  readonly showSuperadminNav = computed(
    () => !!this.currentUser() && this.authService.hasRole('SUPERADMIN')
  );
  readonly adminNavLink = computed(() => this.authService.getAdminEntryPath());
  readonly adminNavLabel = computed(() => this.authService.getAdminNavLabel());

  readonly isImpersonating = computed(() => this.authService.isImpersonating());
  readonly impersonationAdminEmail = computed(() => this.authService.getImpersonatedByEmail());

  logout(): void {
    this.closeMenu();
    this.authService.logout();
  }

  exitImpersonation(): void {
    this.closeMenu();
    this.authService.endImpersonation().subscribe({
      next: () => this.router.navigateByUrl(this.authService.getAdminEntryPath()),
      error: () => {
        /* session incohérente : retour login géré ailleurs si besoin */
      },
    });
  }
}
