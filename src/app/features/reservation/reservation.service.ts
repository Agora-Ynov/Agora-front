import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ReservationsControllerService } from '../../core/api/api/reservationsController.service';
import { PagedResponseReservationListItemDto } from '../../core/api/model/pagedResponseReservationListItemDto';

/**
 * Réservations : délégation au client OpenAPI généré ({@link ReservationsControllerService}).
 */
@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private readonly reservationsApi = inject(ReservationsControllerService);

  listMyReservations(
    page = 0,
    size = 50
  ): Observable<PagedResponseReservationListItemDto> {
    return this.reservationsApi.listMyReservations(page, size);
  }

  cancelReservation(reservationId: string): Observable<void> {
    return this.reservationsApi.cancelReservation(reservationId) as Observable<void>;
  }
}
