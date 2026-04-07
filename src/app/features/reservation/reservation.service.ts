import { inject, Injectable } from '@angular/core';
import { catchError, delay, Observable, of } from 'rxjs';

import { ApiService } from '../../core/api/api.service';
import { ReservationDto } from '../../core/api/models/reservation.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private readonly api = inject(ApiService);
  private readonly basePath = '/api/reservations';
  private readonly mockStorageKey = 'agora.mock.reservations';
  private readonly useMockReservations = environment.useMockAuth;

  cancelReservation(reservationId: string): Observable<void> {
    if (this.useMockReservations) {
      return this.cancelReservationMock(reservationId);
    }

    return this.api
      .delete<void>(`${this.basePath}/${reservationId}`)
      .pipe(catchError(() => this.cancelReservationMock(reservationId)));
  }

  private cancelReservationMock(reservationId: string): Observable<void> {
    const reservations = this.readMockReservations();
    if (reservations.length > 0) {
      const now = new Date().toISOString();
      const updated: ReservationDto[] = reservations.map(reservation =>
        reservation.id === reservationId
          ? { ...reservation, status: 'CANCELLED', updatedAt: now }
          : reservation
      );

      this.writeMockReservations(updated);
    }

    return of(void 0).pipe(delay(150));
  }

  private readMockReservations(): ReservationDto[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const rawValue = localStorage.getItem(this.mockStorageKey);
    if (!rawValue) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawValue);
      return Array.isArray(parsed) ? (parsed as ReservationDto[]) : [];
    } catch {
      return [];
    }
  }

  private writeMockReservations(reservations: ReservationDto[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.mockStorageKey, JSON.stringify(reservations));
  }
}
