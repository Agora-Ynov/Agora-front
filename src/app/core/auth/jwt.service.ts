import { Injectable, signal } from '@angular/core';
import { AccountType, TokenPayload, USER_ROLE_PRIORITY, UserRole } from './auth.model';

const ACCESS_TOKEN_KEY = 'agora_access_token';
const REFRESH_TOKEN_KEY = 'agora_refresh_token';

/** Jetons admin sauvegardés pendant une session d'impersonation (onglet courant). */
const IMPERSONATION_BACKUP_ACCESS = 'agora_impersonation_admin_access';
const IMPERSONATION_BACKUP_REFRESH = 'agora_impersonation_admin_refresh';

@Injectable({ providedIn: 'root' })
export class JwtService {
  /** Incrémenté à chaque changement de tokens pour des `computed` réactifs côté UI. */
  readonly tokenRevision = signal(0);

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    this.tokenRevision.update(v => v + 1);
  }

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(IMPERSONATION_BACKUP_ACCESS);
    sessionStorage.removeItem(IMPERSONATION_BACKUP_REFRESH);
    this.tokenRevision.update(v => v + 1);
  }

  /**
   * Indique si une reprise de session admin est possible (jetons sauvegardés).
   */
  hasImpersonationAdminBackup(): boolean {
    return !!sessionStorage.getItem(IMPERSONATION_BACKUP_ACCESS);
  }

  /**
   * Remplace l'accès courant par le jeton d'impersonation en conservant le refresh,
   * après avoir sauvegardé les jetons admin dans la session du navigateur.
   */
  enterImpersonation(accessToken: string): void {
    const access = this.getAccessToken();
    const refresh = this.getRefreshToken();
    if (access) {
      sessionStorage.setItem(IMPERSONATION_BACKUP_ACCESS, access);
    }
    if (refresh) {
      sessionStorage.setItem(IMPERSONATION_BACKUP_REFRESH, refresh);
    }
    const keepRefresh = refresh ?? '';
    this.setTokens(accessToken, keepRefresh);
  }

  /**
   * Restaure les jetons admin après impersonation. Retourne false si aucune sauvegarde.
   */
  exitImpersonation(): boolean {
    const access = sessionStorage.getItem(IMPERSONATION_BACKUP_ACCESS);
    const refresh = sessionStorage.getItem(IMPERSONATION_BACKUP_REFRESH) ?? '';
    if (!access) {
      return false;
    }
    sessionStorage.removeItem(IMPERSONATION_BACKUP_ACCESS);
    sessionStorage.removeItem(IMPERSONATION_BACKUP_REFRESH);
    this.setTokens(access, refresh);
    return true;
  }

  /**
   * Rôles métier effectifs déduits du JWT (claim `roles` Spring + claim legacy `role` éventuelle).
   */
  getEffectiveRoles(): UserRole[] {
    const token = this.getAccessToken();
    if (!token) {
      return [];
    }
    const raw = this.decodeRawPayload(token);
    if (!raw) {
      return [];
    }
    const set = this.collectUserRoles(raw);
    return USER_ROLE_PRIORITY.filter(r => set.has(r));
  }

  decodeToken(token: string): TokenPayload | null {
    const raw = this.decodeRawPayload(token);
    if (!raw) {
      return null;
    }
    return this.normalizeTokenPayload(raw);
  }

  getPayload(): TokenPayload | null {
    const token = this.getAccessToken();
    if (!token) return null;
    return this.decodeToken(token);
  }

  isTokenExpired(token?: string): boolean {
    const t = token ?? this.getAccessToken();
    if (!t) return true;
    const payload = this.decodeToken(t);
    if (!payload) return true;
    return payload.exp * 1000 < Date.now();
  }

  private decodeRawPayload(token: string): Record<string, unknown> | null {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private normalizeTokenPayload(raw: Record<string, unknown>): TokenPayload {
    const rolesRaw = raw['roles'];
    const springRoles = Array.isArray(rolesRaw) ? rolesRaw.map(r => String(r)) : [];

    const set = this.collectUserRoles(raw);
    const primary = this.pickPrimaryRole(set);

    return {
      sub: String(raw['sub'] ?? ''),
      email: String(raw['email'] ?? raw['sub'] ?? ''),
      role: primary,
      roles: springRoles.length ? springRoles : undefined,
      accountType: this.parseAccountType(raw['accountType']),
      firstName: String(raw['firstName'] ?? ''),
      lastName: String(raw['lastName'] ?? ''),
      impersonated_by: raw['impersonated_by'] != null ? String(raw['impersonated_by']) : undefined,
      iat: Number(raw['iat'] ?? 0),
      exp: Number(raw['exp'] ?? 0),
    };
  }

  private collectUserRoles(raw: Record<string, unknown>): Set<UserRole> {
    const set = new Set<UserRole>();
    const rolesRaw = raw['roles'];
    if (Array.isArray(rolesRaw)) {
      for (const r of rolesRaw) {
        const mapped = this.mapSpringRoleToUserRole(String(r));
        if (mapped) {
          set.add(mapped);
        }
      }
    }
    const legacy = raw['role'];
    if (typeof legacy === 'string' && this.isUserRole(legacy)) {
      set.add(legacy);
    }
    if (set.size === 0) {
      set.add('CITIZEN');
    }
    return set;
  }

  private pickPrimaryRole(roles: Set<UserRole>): UserRole {
    for (const r of USER_ROLE_PRIORITY) {
      if (roles.has(r)) {
        return r;
      }
    }
    return 'CITIZEN';
  }

  private mapSpringRoleToUserRole(value: string): UserRole | null {
    switch (value) {
      case 'ROLE_SUPERADMIN':
      case 'SUPERADMIN':
        return 'SUPERADMIN';
      case 'ROLE_SECRETARY_ADMIN':
      case 'SECRETARY_ADMIN':
        return 'SECRETARY_ADMIN';
      case 'ROLE_DELEGATE_ADMIN':
      case 'DELEGATE_ADMIN':
        return 'DELEGATE_ADMIN';
      case 'ROLE_GROUP_MANAGER':
      case 'GROUP_MANAGER':
        return 'GROUP_MANAGER';
      case 'ROLE_ADMIN_SUPPORT':
      case 'ADMIN_SUPPORT':
        return 'ADMIN_SUPPORT';
      default:
        return null;
    }
  }

  private parseAccountType(raw: unknown): AccountType {
    if (raw === 'TUTORED') {
      return 'TUTORED';
    }
    return 'AUTONOMOUS';
  }

  private isUserRole(value: string): value is UserRole {
    return (USER_ROLE_PRIORITY as readonly string[]).includes(value) || value === 'CITIZEN';
  }
}
