import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BlackoutPeriodDto, CreateBlackoutDto } from './models/blackout.model';

@Injectable({
  providedIn: 'root',
})
export class BlackoutService {
  private readonly api = inject(ApiService);
  private readonly basePath = '/api/admin/blackouts';

  getAll(): Observable<BlackoutPeriodDto[]> {
    return this.api.get<BlackoutPeriodDto[]>(this.basePath);
  }

  create(payload: CreateBlackoutDto): Observable<BlackoutPeriodDto> {
    return this.api.post<BlackoutPeriodDto>(this.basePath, payload);
  }

  delete(blackoutId: string): Observable<void> {
    return this.api.delete<void>(`${this.basePath}/${blackoutId}`);
  }
}
