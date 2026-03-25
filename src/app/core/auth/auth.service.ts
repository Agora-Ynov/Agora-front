import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, delay, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { JwtService } from './jwt.service';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UserProfile,
  UserRole,
} from './auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private readonly useMockAuth = environment.useMockAuth;

  private _currentUser = signal<UserProfile | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  constructor(
    private http: HttpClient,
    private jwtService: JwtService,
    private router: Router
  ) {
    this.restoreSession();
  }

  login(email: string, password: string): Observable<LoginResponse> {
    if (this.useMockAuth) {
      return this.loginMock({ email, password }).pipe(tap(response => this.saveSession(response)));
    }

    const body: LoginRequest = { email, password };
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/api/auth/login`, body)
      .pipe(tap(response => this.saveSession(response)));
  }

  logout(): void {
    if (this.useMockAuth) {
      this.clearSession();
      return;
    }

    this.http
      .post(`${this.apiUrl}/api/auth/logout`, {})
      .pipe(catchError(() => throwError(() => null)))
      .subscribe({
        complete: () => this.clearSession(),
        error: () => this.clearSession(),
      });
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    if (this.useMockAuth) {
      return this.registerMock(data);
    }

    return this.http.post<RegisterResponse>(`${this.apiUrl}/api/auth/register`, data);
  }

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.jwtService.getRefreshToken();
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/api/auth/refresh`, { refreshToken })
      .pipe(tap(res => this.jwtService.setTokens(res.accessToken, res.refreshToken)));
  }

  getCurrentUser(): Observable<UserProfile> {
    if (this.useMockAuth) {
      return this.http
        .get<{
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          phone?: string;
          accountType: UserProfile['accountType'];
          status: UserProfile['accountStatus'];
          groups?: Array<{ id: string }>;
          createdAt: string;
        }>('/assets/mocks/api/auth.me.get.json')
        .pipe(
          map(user => ({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: 'CITIZEN' as UserRole,
            accountType: user.accountType,
            accountStatus: user.status,
            internalId: undefined,
            exemptions: {
              association: false,
              social: false,
              mandate: false,
            },
            groupIds: user.groups?.map(group => group.id) ?? [],
            createdAt: user.createdAt,
          })),
          tap(user => this._currentUser.set(user))
        );
    }

    return this.http
      .get<UserProfile>(`${this.apiUrl}/api/auth/me`)
      .pipe(tap(user => this._currentUser.set(user)));
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

  loginMock(payload: LoginRequest): Observable<LoginResponse> {
    if (this.isMockLoginValid(payload)) {
      return of(this.buildMockLoginResponse(payload.email)).pipe(delay(400));
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

  registerMock(payload: RegisterRequest): Observable<RegisterResponse> {
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

    const response: RegisterResponse = {
      id: 'u001',
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      accountType: 'AUTONOMOUS',
      status: 'ACTIVE',
    };

    return of(response).pipe(delay(400));
  }

  saveSession(response: LoginResponse): void {
    this.jwtService.setTokens(response.accessToken, response.refreshToken ?? 'mock-refresh-token');
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

  private createMockToken(email: string): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const payload = btoa(
      JSON.stringify({
        sub: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        email,
        role: 'CITIZEN',
        accountType: 'AUTONOMOUS',
        firstName: 'Jean',
        lastName: 'Dupont',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
      })
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    return `${header}.${payload}.mock-signature`;
  }

  private buildMockLoginResponse(email: string): LoginResponse {
    return {
      accessToken: this.createMockToken(email),
      refreshToken: 'mock-refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        firstName: 'Jean',
        lastName: 'Dupont',
        accountType: 'AUTONOMOUS',
        status: 'ACTIVE',
      },
    };
  }

  private isMockLoginValid(payload: LoginRequest): boolean {
    return (
      payload.email.trim().toLowerCase() === 'jean.dupont@gmail.com' &&
      payload.password === 'MonMotDePasse123!'
    );
  }

  private isMockRegisterEmailAlreadyExists(email: string): boolean {
    return email.trim().toLowerCase() === 'jean.dupont@gmail.com';
  }
}
