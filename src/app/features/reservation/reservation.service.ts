import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ReservationsService } from '../../core/api/api/reservations.service';
import { PagedResponseReservationSummaryResponseDto } from '../../core/api/model/pagedResponseReservationSummaryResponseDto';

/**
 * Réservations : délégation au client OpenAPI généré ({@link ReservationsService}).
 */
@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private readonly reservationsApi = inject(ReservationsService);

  listMyReservations(page = 0, size = 50): Observable<PagedResponseReservationSummaryResponseDto> {
    return this.reservationsApi.getMyReservations(undefined, page, size);
  }

  cancelReservation(reservationId: string): Observable<void> {
    return this.reservationsApi.cancelReservation(reservationId) as Observable<void>;
  }
}
