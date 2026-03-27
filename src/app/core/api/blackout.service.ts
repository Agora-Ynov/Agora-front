import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, delay, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { BlackoutPeriodDto, CreateBlackoutDto } from './models/blackout.model';

@Injectable({
  providedIn: 'root',
})
export class BlackoutService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);
  private readonly basePath = '/api/admin/blackouts';
  private readonly mockStorageKey = 'agora.mock.blackouts';
  private readonly useMockBlackouts = environment.useMockAuth;

  getAll(): Observable<BlackoutPeriodDto[]> {
    if (this.useMockBlackouts) {
      return this.getMockBlackouts();
    }

    return this.api
      .get<BlackoutPeriodDto[]>(this.basePath)
      .pipe(catchError(() => this.getMockBlackouts()));
  }

  create(payload: CreateBlackoutDto): Observable<BlackoutPeriodDto> {
    if (this.useMockBlackouts) {
      return this.createMock(payload);
    }

    return this.api
      .post<BlackoutPeriodDto>(this.basePath, payload)
      .pipe(catchError(() => this.createMock(payload)));
  }

  delete(blackoutId: string): Observable<void> {
    if (this.useMockBlackouts) {
      return this.deleteMock(blackoutId);
    }

    return this.api
      .delete<void>(`${this.basePath}/${blackoutId}`)
      .pipe(catchError(() => this.deleteMock(blackoutId)));
  }

  private getMockBlackouts(): Observable<BlackoutPeriodDto[]> {
    const stored = this.readMockBlackouts();
    if (stored.length > 0) {
      return of(stored).pipe(delay(120));
    }

    return this.http.get<BlackoutPeriodDto[]>('/assets/mocks/api/admin.blackouts.get.json').pipe(
      map(blackouts => blackouts.map(blackout => this.normalizeBlackout(blackout))),
      tap(blackouts => this.writeMockBlackouts(blackouts)),
      delay(120)
    );
  }

  private createMock(payload: CreateBlackoutDto): Observable<BlackoutPeriodDto> {
    return this.getMockBlackouts().pipe(
      map(blackouts => {
        const nextBlackout = this.normalizeBlackout({
          id: this.generateMockId(blackouts),
          resourceId: payload.resourceId,
          resourceName: null,
          dateFrom: payload.dateFrom,
          dateTo: payload.dateTo,
          reason: payload.reason,
          createdByName: 'Marie Secretaire',
        });

        this.writeMockBlackouts([nextBlackout, ...blackouts]);
        return nextBlackout;
      }),
      delay(120)
    );
  }

  private deleteMock(blackoutId: string): Observable<void> {
    return this.getMockBlackouts().pipe(
      tap(blackouts => {
        this.writeMockBlackouts(blackouts.filter(blackout => blackout.id !== blackoutId));
      }),
      map(() => void 0),
      delay(100)
    );
  }

  private normalizeBlackout(blackout: Partial<BlackoutPeriodDto>): BlackoutPeriodDto {
    return {
      id: blackout.id ?? 'blk000',
      resourceId: blackout.resourceId ?? null,
      resourceName: blackout.resourceName ?? null,
      dateFrom: blackout.dateFrom ?? new Date().toISOString().slice(0, 10),
      dateTo: blackout.dateTo ?? blackout.dateFrom ?? new Date().toISOString().slice(0, 10),
      reason: blackout.reason?.trim() || 'Fermeture administrative',
      createdByName: blackout.createdByName ?? 'Marie Secretaire',
    };
  }

  private generateMockId(blackouts: BlackoutPeriodDto[]): string {
    const nextNumber =
      blackouts
        .map(blackout => Number(blackout.id.replace(/\D/g, '')))
        .filter(value => !Number.isNaN(value))
        .reduce((max, value) => Math.max(max, value), 0) + 1;

    return `blk${String(nextNumber).padStart(3, '0')}`;
  }

  private readMockBlackouts(): BlackoutPeriodDto[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const raw = localStorage.getItem(this.mockStorageKey);
    if (!raw) {
      return [];
    }

    try {
      const blackouts = JSON.parse(raw) as BlackoutPeriodDto[];
      return blackouts.map(blackout => this.normalizeBlackout(blackout));
    } catch {
      localStorage.removeItem(this.mockStorageKey);
      return [];
    }
  }

  private writeMockBlackouts(blackouts: BlackoutPeriodDto[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.mockStorageKey, JSON.stringify(blackouts));
  }
}
