/**
 * AGORA API — page de réservations (liste).
 * Aligné sur PagedResponse&lt;ReservationListItemDto&gt; côté backend.
 */
import { ReservationListItemDto } from './reservationListItemDto';

export interface PagedResponseReservationListItemDto {
  content?: Array<ReservationListItemDto>;
  totalElements?: number;
  totalPages?: number;
  page?: number;
  size?: number;
}
