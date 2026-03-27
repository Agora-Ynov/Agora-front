import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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

  currentUser = this.authService.currentUser;
  homeLink = computed(() => '/');

  fullName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : '';
  });

  logout(): void {
    this.authService.logout();
  }
}
