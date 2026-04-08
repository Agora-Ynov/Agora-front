import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
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

  private _currentUser = signal<UserProfile | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  /**
   * État de session utilisable dans les templates (signal).
   * Ne pas utiliser `computed(() => auth.isAuthenticated())` : `isAuthenticated()` n’est pas un signal,
   * le computed ne se mettrait jamais à jour.
   */
  readonly isSessionActive = computed(() => {
    const user = this._currentUser();
    this.jwtService.tokenRevision();
    if (user !== null) {
      return true;
    }
    return this.isAuthenticated();
  });

  constructor() {
    this.restoreSession();
  }

  /**
   * Connexion : enregistre les tokens puis charge le profil **avant** de compléter l’Observable.
   * HttpClient direct : le client OpenAPI généré met Accept sur le wildcard MIME et en déduit
   * responseType blob, donc le corps n’est pas parsé en objet (aperçu réseau JSON mais pas accessToken côté JS).
   */
  login(email: string, password: string): Observable<LoginResponseDto> {
    const body: LoginRequestDto = { email, password };
    return this.http
      .post<LoginResponseDto>(`${this.apiUrl}/api/auth/login`, body, {
        withCredentials: true,
        transferCache: false,
      })
      .pipe(
        switchMap(response => {
          const accessToken = this.readAccessTokenFromLogin(response);
          if (!accessToken) {
            this._currentUser.set(null);
            return throwError(
              () =>
                new HttpErrorResponse({
                  status: 401,
                  error: {
                    message: 'Réponse de connexion sans jeton d’accès.',
                  },
                })
            );
          }
          const refreshToken = this.jwtService.getRefreshToken() ?? '';
          this.jwtService.setTokens(accessToken, refreshToken);
          return this.getCurrentUser().pipe(map(() => response));
        })
      );
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
    return this.http.post<RegisterResponseDto>(`${this.apiUrl}/api/auth/register`, data, {
      withCredentials: true,
      transferCache: false,
    });
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

    // HttpClient direct : évite le client OpenAPI + cache GET par défaut (`transferCache`) qui peut
    // servir une réponse périmée / sans en-tête d’auth pour `/api/auth/me`.
    return this.http
      .get<AuthMeResponseDto>(`${this.apiUrl}/api/auth/me`, {
        withCredentials: true,
        transferCache: false,
      })
      .pipe(
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

  /** Extrait le jeton quelle que soit la casse des clés JSON (camelCase / snake_case). */
  private readAccessTokenFromLogin(response: LoginResponseDto): string {
    const raw = response as LoginResponseDto & { access_token?: string };
    const token = raw.accessToken ?? raw.access_token ?? '';
    return typeof token === 'string' ? token.trim() : '';
  }

  private restoreSession(): void {
    if (this.isAuthenticated()) {
      this.getCurrentUser().subscribe({
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
