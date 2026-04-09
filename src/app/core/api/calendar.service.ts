import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CalendarResponseDto } from './model/calendarResponseDto';
import { CalendarMonthDto } from './models/resource.model';

@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  private readonly http = inject(HttpClient);

  /**
   * GET /api/calendar — appel direct (même contrat OpenAPI) pour éviter toute URL
   * mal formée via {@code configuration.basePath} (ex. chaîne "undefined" + chemin).
   *
   * @param resourceId filtre optionnel (ressource unique)
   */
  getMonth(year: number, month: number, resourceId?: string): Observable<CalendarMonthDto> {
    let params = new HttpParams().set('year', String(year)).set('month', String(month));
    if (resourceId) {
      params = params.set('resourceId', resourceId);
    }
    const root = environment.apiUrl ?? '';
    const url = `${root}/api/calendar`;
    return this.http.get<CalendarResponseDto>(url, {
      params,
      withCredentials: true,
      /** Évite le cache de transfert HTTP : grille bloquée sur d’anciennes données sans erreur visible. */
      transferCache: false,
    });
  }
}
