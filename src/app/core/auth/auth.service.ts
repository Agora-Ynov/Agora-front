import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthControllerService,
  AuthMeResponseDto,
  LoginRequestDto,
  LoginResponseDto,
  RegisterRequestDto,
  RegisterResponseDto,
} from '../api';
import { JwtService } from './jwt.service';
import { UserProfile, UserRole } from './auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);
  private readonly jwtService = inject(JwtService);
  private readonly router = inject(Router);
  private readonly authController = inject(AuthControllerService);

  private _currentUser = signal<UserProfile | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  constructor() {
    this.restoreSession();
  }

  login(email: string, password: string): Observable<LoginResponseDto> {
    const body: LoginRequestDto = { email, password };
    return this.authController.login(body).pipe(tap(response => this.saveSession(response)));
  }

  logout(): void {
    this.http
      .post(`${this.apiUrl}/api/auth/logout`, {}, { withCredentials: true })
      .pipe(catchError(() => throwError(() => null)))
      .subscribe({
        complete: () => this.clearSession(),
        error: () => this.clearSession(),
      });
  }

  register(data: RegisterRequestDto): Observable<RegisterResponseDto> {
    return this.authController.register(data);
  }

  refreshToken(): Observable<{ accessToken: string; refreshToken: string }> {
    return this.http
      .post<{
        accessToken: string;
        refreshToken: string;
      }>(`${this.apiUrl}/api/auth/refresh`, {}, { withCredentials: true })
      .pipe(tap(res => this.jwtService.setTokens(res.accessToken, res.refreshToken)));
  }

  getCurrentUser(): Observable<UserProfile> {
    const token = this.jwtService.getAccessToken();
    if (!token) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: {
              code: 'MISSING_TOKEN',
              message: "Aucun token d'authentification n'est disponible.",
            },
          })
      );
    }

    return this.authController.me().pipe(
      map(response => this.mapUserProfile(response)),
      tap(user => this._currentUser.set(user))
    );
  }

  isAuthenticated(): boolean {
    const token = this.jwtService.getAccessToken();
    return !!token && !this.jwtService.isTokenExpired(token);
  }

  hasRole(role: UserRole): boolean {
    const payload = this.jwtService.getPayload();
    return payload?.role === role;
  }

  hasAnyRole(...roles: UserRole[]): boolean {
    const payload = this.jwtService.getPayload();
    return !!payload && roles.includes(payload.role);
  }

  isAdmin(): boolean {
    return this.hasAnyRole('SECRETARY_ADMIN', 'DELEGATE_ADMIN');
  }

  isImpersonating(): boolean {
    const payload = this.jwtService.getPayload();
    return !!payload?.impersonated_by;
  }

  getAccessToken(): string | null {
    return this.jwtService.getAccessToken();
  }

  saveSession(response: LoginResponseDto): void {
    const accessToken = response.accessToken ?? '';
    if (!accessToken) {
      this._currentUser.set(null);
      return;
    }
    const refreshToken = this.jwtService.getRefreshToken() ?? '';
    this.jwtService.setTokens(accessToken, refreshToken);
    this.loadCurrentUser().subscribe({
      error: () => this._currentUser.set(null),
    });
  }

  private loadCurrentUser(): Observable<UserProfile> {
    return this.getCurrentUser();
  }

  private restoreSession(): void {
    if (this.isAuthenticated()) {
      this.loadCurrentUser().subscribe({
        error: () => this.clearSession(),
      });
    }
  }

  private clearSession(): void {
    this.jwtService.clearTokens();
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private mapUserProfile(response: AuthMeResponseDto): UserProfile {
    const tokenRole = this.jwtService.getPayload()?.role ?? 'CITIZEN';
    return {
      id: response.id ?? '',
      firstName: response.firstName ?? '',
      lastName: response.lastName ?? '',
      email: response.email ?? '',
      phone: response.phone,
      role: tokenRole,
      accountType: response.accountType === 'TUTORED' ? 'TUTORED' : 'AUTONOMOUS',
      accountStatus: response.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      exemptions: {
        association: false,
        social: false,
        mandate: false,
      },
      groupIds: (response.groups ?? []).map(group => group.id ?? '').filter(Boolean),
      createdAt: response.createdAt ?? new Date(0).toISOString(),
    };
  }
}
