import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CalendarMonthDto } from './models/resource.model';

@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  private readonly api = inject(ApiService);

  getMonth(year: number, month: number): Observable<CalendarMonthDto> {
    return this.api.get<CalendarMonthDto>('/api/calendar', { year, month });
  }
}
