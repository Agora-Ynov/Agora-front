import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { CalendarMonthDto } from './models/resource.model';

@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);
  private readonly useMockCalendar = environment.useMockAuth;

  getMonth(year: number, month: number): Observable<CalendarMonthDto> {
    if (this.useMockCalendar) {
      return this.getMockMonth(year, month);
    }

    return this.api
      .get<CalendarMonthDto>('/api/calendar', { year, month })
      .pipe(catchError(() => this.getMockMonth(year, month)));
  }

  private getMockMonth(year: number, month: number): Observable<CalendarMonthDto> {
    const monthLabel = String(month).padStart(2, '0');

    return this.http
      .get<CalendarMonthDto>(`/assets/mocks/api/calendar.${year}-${monthLabel}.get.json`)
      .pipe(catchError(() => of(this.createEmptyMonth(year, month))));
  }

  private createEmptyMonth(year: number, month: number): CalendarMonthDto {
    return {
      year,
      month,
      days: [],
    };
  }
}
