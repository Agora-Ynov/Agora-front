import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-reservations.component.html',
  styles: [
    `
      :host {
        display: block;
      }

      .reservations-page {
        min-height: 100vh;
        padding: 3rem 1.5rem;
        background: linear-gradient(180deg, #f7f9fc 0%, #ffffff 100%);
      }

      .reservations-shell {
        max-width: 960px;
        margin: 0 auto;
      }

      .reservations-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 2rem;
      }

      .reservations-user {
        color: #405170;
        font-weight: 600;
      }

      .reservations-card {
        padding: 2rem;
        border: 1px solid rgba(17, 24, 39, 0.1);
        border-radius: 1.5rem;
        background: #fff;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
      }

      .reservations-card h1,
      .reservations-card p {
        margin: 0;
      }

      .reservations-card p {
        margin-top: 0.8rem;
        color: #536277;
        line-height: 1.6;
      }

      .reservations-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.8rem;
        margin-top: 1.5rem;
      }

      .reservations-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 3rem;
        padding: 0.85rem 1.2rem;
        border: 1px solid rgba(17, 24, 39, 0.12);
        border-radius: 0.95rem;
        color: #111827;
        text-decoration: none;
      }

      .reservations-link--primary {
        background: #09081a;
        color: #fff;
      }
    `,
  ],
})
export class MyReservationsComponent {
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly displayName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : 'Utilisateur';
  });
}
