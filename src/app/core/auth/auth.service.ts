import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, delay, map, of, tap, throwError } from 'rxjs';
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
import {
  UserProfile,
  UserRole,
} from './auth.model';

interface MockAccount {
  password: string;
  profile: UserProfile;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private readonly useMockAuth = environment.useMockAuth;
  private readonly http = inject(HttpClient);
  private readonly jwtService = inject(JwtService);
  private readonly router = inject(Router);
  private readonly authController = inject(AuthControllerService);
  private readonly mockAccounts: Record<string, MockAccount> = {
    'jean.dupont@gmail.com': {
      password: 'MonMotDePasse123!',
      profile: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@gmail.com',
        phone: '0612345678',
        role: 'CITIZEN',
        accountType: 'AUTONOMOUS',
        accountStatus: 'ACTIVE',
        internalId: undefined,
        exemptions: {
          association: false,
          social: false,
          mandate: false,
        },
        groupIds: ['g001'],
        createdAt: '2026-01-15T09:30:00Z',
      },
    },
    'admin@agora.local': {
      password: 'AdminAgora123!',
      profile: {
        id: 'b2c3d4e5-f678-9012-abcd-ef1234567801',
        firstName: 'Marie',
        lastName: 'Dupont',
        email: 'admin@agora.local',
        phone: '0102030405',
        role: 'SECRETARY_ADMIN',
        accountType: 'AUTONOMOUS',
        accountStatus: 'ACTIVE',
        internalId: 'ADM-001',
        exemptions: {
          association: false,
          social: false,
          mandate: true,
        },
        groupIds: [],
        createdAt: '2025-11-04T08:15:00Z',
      },
    },
  };

  private _currentUser = signal<UserProfile | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  constructor() {
    this.restoreSession();
  }

  login(email: string, password: string): Observable<LoginResponseDto> {
    if (this.useMockAuth) {
      return this.loginMock({ email, password }).pipe(tap(response => this.saveSession(response)));
    }

    const body: LoginRequestDto = { email, password };
    return this.authController.login(body).pipe(tap(response => this.saveSession(response)));
  }

  logout(): void {
    if (this.useMockAuth) {
      this.clearSession();
      return;
    }

    this.http
      .post(`${this.apiUrl}/api/auth/logout`, {}, { withCredentials: true })
      .pipe(catchError(() => throwError(() => null)))
      .subscribe({
        complete: () => this.clearSession(),
        error: () => this.clearSession(),
      });
  }

  register(data: RegisterRequestDto): Observable<RegisterResponseDto> {
    if (this.useMockAuth) {
      return this.registerMock(data);
    }

    return this.authController.register(data);
  }

  refreshToken(): Observable<{ accessToken: string; refreshToken: string }> {
    return this.http
      .post<{ accessToken: string; refreshToken: string }>(
        `${this.apiUrl}/api/auth/refresh`,
        {},
        { withCredentials: true }
      )
      .pipe(tap(res => this.jwtService.setTokens(res.accessToken, res.refreshToken)));
  }

  getCurrentUser(): Observable<UserProfile> {
    if (this.useMockAuth) {
      const profile = this.getMockProfileFromSession();

      if (!profile) {
        return throwError(
          () =>
            new HttpErrorResponse({
              status: 401,
              error: {
                code: 'INVALID_SESSION',
                message: 'La session mock est invalide.',
              },
            })
        );
      }

      return of(profile).pipe(
        delay(150),
        tap(user => this._currentUser.set(user))
      );
    }

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

  loginMock(payload: LoginRequestDto): Observable<LoginResponseDto> {
    const account = this.getMockAccount(payload.email);
    if (account && this.isMockLoginValid(payload)) {
      return of(this.buildMockLoginResponse(account.profile)).pipe(delay(400));
    }

    return throwError(
      () =>
        ({
          status: 401,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email ou mot de passe incorrect.',
          },
        }) as HttpErrorResponse
    );
  }

  registerMock(payload: RegisterRequestDto): Observable<RegisterResponseDto> {
    if (this.isMockRegisterEmailAlreadyExists(payload.email)) {
      return throwError(
        () =>
          ({
            status: 409,
            error: {
              code: 'EMAIL_ALREADY_EXISTS',
              message: 'Cet email est deja associe a un compte.',
            },
          }) as HttpErrorResponse
      );
    }

    const response: RegisterResponseDto = {
      id: 'u001',
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      accountType: 'AUTONOMOUS',
      accountStatus: 'ACTIVE',
    };

    return of(response).pipe(delay(400));
  }

  saveSession(response: LoginResponseDto): void {
    const accessToken = response.accessToken ?? '';
    if (!accessToken) {
      this._currentUser.set(null);
      return;
    }
    const refreshToken = this.jwtService.getRefreshToken() ?? 'mock-refresh-token';
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

  private createMockToken(profile: UserProfile): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const payload = btoa(
      JSON.stringify({
        sub: profile.id,
        email: profile.email,
        role: profile.role,
        accountType: profile.accountType,
        firstName: profile.firstName,
        lastName: profile.lastName,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
      })
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    return `${header}.${payload}.mock-signature`;
  }

  private buildMockLoginResponse(profile: UserProfile): LoginResponseDto {
    return {
      accessToken: this.createMockToken(profile),
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        accountType: profile.accountType,
        accountStatus: profile.accountStatus === 'ACTIVE' ? 'ACTIVE' : 'DELETED',
      },
    };
  }

  private isMockLoginValid(payload: LoginRequestDto): boolean {
    const account = this.getMockAccount(payload.email);
    return !!account && payload.password === account.password;
  }

  private isMockRegisterEmailAlreadyExists(email: string): boolean {
    return !!this.getMockAccount(email);
  }

  private getMockAccount(email: string): MockAccount | undefined {
    return this.mockAccounts[email.trim().toLowerCase()];
  }

  private getMockProfileFromSession(): UserProfile | null {
    const email = this.jwtService.getPayload()?.email;
    if (!email) {
      return null;
    }

    const account = this.getMockAccount(email);
    if (!account) {
      return null;
    }

    return this.cloneMockProfile(account.profile);
  }

  private cloneMockProfile(profile: UserProfile): UserProfile {
    return {
      ...profile,
      exemptions: { ...profile.exemptions },
      groupIds: [...profile.groupIds],
    };
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
