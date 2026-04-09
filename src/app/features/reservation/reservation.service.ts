import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ReservationsService } from '../../core/api/api/reservations.service';
import { PagedResponseReservationSummaryResponseDto } from '../../core/api/model/pagedResponseReservationSummaryResponseDto';
import { ApiService } from '../../core/api/api.service';

/**
 * Liste « mes réservations » : {@link ApiService#getJson} (évite Accept générique → responseType blob).
 * Annulation : client OpenAPI (pas de corps JSON typé requis).
 */
@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private readonly reservationsApi = inject(ReservationsService);
  private readonly api = inject(ApiService);

  listMyReservations(page = 0, size = 50): Observable<PagedResponseReservationSummaryResponseDto> {
    return this.api.getJson<PagedResponseReservationSummaryResponseDto>('/api/reservations', {
      page,
      size,
    });
  }

  cancelReservation(reservationId: string): Observable<void> {
    return this.reservationsApi.cancelReservation(reservationId) as Observable<void>;
  }

  cancelRecurringSeries(recurringGroupId: string): Observable<void> {
    return this.reservationsApi.cancelRecurringSeries(recurringGroupId) as Observable<void>;
  }
}
