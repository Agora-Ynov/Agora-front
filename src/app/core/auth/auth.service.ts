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
import {
  AccountStatus,
  UserMembershipGroup,
  UserProfile,
  UserRole,
  USER_ROLE_PRIORITY,
} from './auth.model';

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
      .pipe(switchMap(response => this.establishSessionFromLoginResponse(response)));
  }

  /**
   * Après activation de compte (POST /api/auth/activate) : enregistre l’access token puis charge /me.
   */
  establishSessionFromLoginResponse(response: LoginResponseDto): Observable<LoginResponseDto> {
    const accessToken = this.readAccessTokenFromLogin(response);
    if (!accessToken) {
      this._currentUser.set(null);
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: {
              message: 'Réponse sans jeton d’accès.',
            },
          })
      );
    }
    const refreshToken = this.jwtService.getRefreshToken() ?? '';
    this.jwtService.setTokens(accessToken, refreshToken);
    return this.getCurrentUser().pipe(map(() => response));
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
    return this.jwtService.getEffectiveRoles().includes(role);
  }

  hasAnyRole(...roles: UserRole[]): boolean {
    const effective = this.jwtService.getEffectiveRoles();
    return roles.some(r => effective.includes(r));
  }

  /**
   * Accès aux écrans sous `/api/admin/**` (dashboard, résas, utilisateurs, audit…).
   * Exclut le délégué — périmètre réduit côté cahier.
   */
  canAccessFullAdminSpa(): boolean {
    return this.hasAnyRole('SUPERADMIN', 'SECRETARY_ADMIN', 'ADMIN_SUPPORT');
  }

  /** CRUD ressources (`/api/resources` POST/PUT/DELETE) : secrétaire, superadmin, support + délégué. */
  canAccessDelegateResourceConsole(): boolean {
    return this.hasRole('DELEGATE_ADMIN');
  }

  /** Entrée de menu « administration » : session valide + au moins une zone staff accessible. */
  canSeeAdminNavigation(): boolean {
    if (!this.isAuthenticated()) {
      return false;
    }
    return this.canAccessFullAdminSpa() || this.canAccessDelegateResourceConsole();
  }

  getAdminEntryPath(): string {
    if (this.canAccessFullAdminSpa()) {
      return '/';
    }
    if (this.canAccessDelegateResourceConsole()) {
      return '/admin/resources';
    }
    return '/';
  }

  getAdminNavLabel(): string {
    if (this.canAccessFullAdminSpa()) {
      return 'Tableau de bord';
    }
    if (this.canAccessDelegateResourceConsole()) {
      return 'Gestion des ressources';
    }
    return 'Administration';
  }

  /**
   * Compatibilité : « admin » pour la navigation = spa admin complète ou console ressources délégué.
   */
  isAdmin(): boolean {
    return this.canSeeAdminNavigation();
  }

  getImpersonatedByEmail(): string | null {
    return this.jwtService.getPayload()?.impersonated_by ?? null;
  }

  isImpersonating(): boolean {
    const payload = this.jwtService.getPayload();
    return !!payload?.impersonated_by;
  }

  /**
   * Active la session usager (JWT court) après {@link AdminUsersService#impersonate}.
   */
  startImpersonation(accessToken: string): Observable<UserProfile> {
    this.jwtService.enterImpersonation(accessToken);
    return this.getCurrentUser();
  }

  /**
   * Restaure le jeton admin si une sauvegarde existe (fin d'impersonation).
   */
  endImpersonation(): Observable<UserProfile> {
    if (!this.jwtService.exitImpersonation()) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'Aucune session administrateur à restaurer.' },
          })
      );
    }
    return this.getCurrentUser();
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
    const jwtOrdered = this.jwtService.getEffectiveRoles();
    const jwtPrimary = jwtOrdered[0] ?? 'CITIZEN';

    const roleSet = new Set<UserRole>();
    for (const r of response.roles ?? []) {
      const mapped = this.mapAuthMeRoleEnum(String(r));
      if (mapped) {
        roleSet.add(mapped);
      }
    }
    if (response.adminSupport === true) {
      roleSet.add('ADMIN_SUPPORT');
    }

    const membershipRoles = USER_ROLE_PRIORITY.filter(r => roleSet.has(r));
    const primaryRole = membershipRoles[0] ?? jwtPrimary;

    const membershipGroups: UserMembershipGroup[] = (response.groups ?? []).map(group => {
      const name = (group.name ?? '').trim() || 'Groupe';
      return {
        id: group.id ?? '',
        name,
        preset: group.isPreset === true,
        councilPowers: group.councilPowers === true,
        canBookImmobilier: group.canBookImmobilier === true,
        canBookMobilier: group.canBookMobilier === true,
        discountType: group.discountType ?? 'NONE',
        discountLabel: (group.discountLabel ?? '').trim() || 'Plein tarif',
      };
    });

    const mandate = membershipGroups.some(g => g.councilPowers);
    const association = membershipGroups.some(g => /association/i.test(g.name));
    const social = membershipGroups.some(g => /habitant/i.test(g.name));

    return {
      id: response.id ?? '',
      firstName: response.firstName ?? '',
      lastName: response.lastName ?? '',
      email: response.email ?? '',
      phone: response.phone,
      role: primaryRole,
      membershipRoles,
      accountType: response.accountType === 'TUTORED' ? 'TUTORED' : 'AUTONOMOUS',
      accountStatus: this.mapAccountStatusFromApi(response.status),
      adminSupport: response.adminSupport === true,
      exemptions: {
        association,
        social,
        mandate,
      },
      membershipGroups,
      groupIds: membershipGroups.map(g => g.id).filter(Boolean),
      createdAt: response.createdAt ?? new Date(0).toISOString(),
    };
  }

  private mapAuthMeRoleEnum(value: string): UserRole | null {
    switch (value) {
      case 'CITIZEN':
        return 'CITIZEN';
      case 'SUPERADMIN':
        return 'SUPERADMIN';
      case 'SECRETARY_ADMIN':
        return 'SECRETARY_ADMIN';
      case 'DELEGATE_ADMIN':
        return 'DELEGATE_ADMIN';
      case 'GROUP_MANAGER':
        return 'GROUP_MANAGER';
      default:
        return null;
    }
  }

  private mapAccountStatusFromApi(status?: string): AccountStatus {
    switch (status) {
      case 'ACTIVE':
        return 'ACTIVE';
      case 'DELETED':
        return 'INACTIVE';
      case 'PENDING_VALIDATION':
        return 'PENDING_VALIDATION';
      case 'SUSPENDED':
        return 'SUSPENDED';
      case 'REJECTED':
        return 'REJECTED';
      case 'INACTIVE':
        return 'INACTIVE';
      default:
        return 'INACTIVE';
    }
  }
}
