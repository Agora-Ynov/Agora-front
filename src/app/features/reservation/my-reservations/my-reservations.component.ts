import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { PagedResponse } from '../../../core/api/models/paged-response.model';
import { AuthService } from '../../../core/auth/auth.service';

type ReservationStatusView = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REJECTED';
type DepositStatusView =
  | 'DEPOSIT_PENDING'
  | 'DEPOSIT_PAID'
  | 'EXEMPT'
  | 'WAIVED'
  | 'REFUNDED';

interface ReservationSummaryMock {
  id: string;
  resourceName: string;
  resourceType: 'IMMOBILIER' | 'MOBILIER';
  date: string;
  slotStart: string;
  slotEnd: string;
  status: ReservationStatusView;
  depositStatus: DepositStatusView;
  depositAmountCents: number;
  depositAmountFullCents: number;
  discountLabel: string | null;
  createdAt: string;
}

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-reservations.component.html',
  styleUrl: './my-reservations.component.scss',
})
export class MyReservationsComponent {
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);

  readonly currentUser = this.authService.currentUser;
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly reservations = signal<ReservationSummaryMock[]>([]);

  readonly displayName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : 'Utilisateur';
  });

  readonly stats = computed(() => {
    const reservations = this.reservations();

    return {
      total: reservations.length,
      pending: reservations.filter(reservation => reservation.status === 'PENDING').length,
      confirmed: reservations.filter(reservation => reservation.status === 'CONFIRMED').length,
      depositPending: reservations.filter(
        reservation => reservation.depositStatus === 'DEPOSIT_PENDING'
      ).length,
    };
  });

  constructor() {
    this.http
      .get<PagedResponse<ReservationSummaryMock>>('/assets/mocks/api/reservations.get.json')
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: response => {
          this.reservations.set(response.content);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.message || 'Impossible de charger vos reservations pour le moment.'
          );
          this.loading.set(false);
        },
      });
  }

  statusLabel(status: ReservationStatusView): string {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmee';
      case 'PENDING':
        return 'En attente';
      case 'REJECTED':
        return 'Refusee';
      case 'CANCELLED':
      default:
        return 'Annulee';
    }
  }

  depositLabel(status: DepositStatusView): string {
    switch (status) {
      case 'DEPOSIT_PENDING':
        return 'Caution a regler';
      case 'DEPOSIT_PAID':
        return 'Caution reglee';
      case 'EXEMPT':
        return 'Caution exemptee';
      case 'WAIVED':
        return 'Caution abandonnee';
      case 'REFUNDED':
      default:
        return 'Caution remboursee';
    }
  }

  formatEuros(valueCents: number): string {
    return `${Math.round(valueCents / 100)} EUR`;
  }
}
