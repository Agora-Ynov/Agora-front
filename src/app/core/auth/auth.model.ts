export type UserRole =
  | 'CITIZEN'
  | 'SECRETARY_ADMIN'
  | 'DELEGATE_ADMIN'
  | 'GROUP_MANAGER'
  | 'SUPERADMIN'
  | 'ADMIN_SUPPORT';

/** Priorité d’affichage et de choix du rôle « principal » (du plus privilégié au plus faible). */
export const USER_ROLE_PRIORITY: readonly UserRole[] = [
  'SUPERADMIN',
  'SECRETARY_ADMIN',
  'DELEGATE_ADMIN',
  'GROUP_MANAGER',
  'ADMIN_SUPPORT',
  'CITIZEN',
];

export type AccountType = 'AUTONOMOUS' | 'TUTORED';

export type AccountStatus = 'PENDING_VALIDATION' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REJECTED';

export interface TokenPayload {
  sub: string;
  email: string;
  /** Rôle principal dérivé pour l’UI (priorité la plus élevée parmi les autorités). */
  role: UserRole;
  /** Claims Spring Security éventuelles (`ROLE_SECRETARY_ADMIN`, …). */
  roles?: string[];
  accountType: AccountType;
  firstName: string;
  lastName: string;
  impersonated_by?: string;
  iat: number;
  exp: number;
}

export interface LoginUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  accountType: AccountType;
  status: AccountStatus;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
}

/** Rattachement groupe tel que renvoyé par GET /api/auth/me (hors mock). */
export interface UserMembershipGroup {
  id: string;
  name: string;
  preset: boolean;
  councilPowers: boolean;
  canBookImmobilier: boolean;
  canBookMobilier: boolean;
  discountType: string;
  discountLabel: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  /**
   * Rôles métier issus de GET /api/auth/me (BDD + drapeau adminSupport), ordonnés selon {@link USER_ROLE_PRIORITY}.
   * Complète le JWT pour l’affichage (ex. délégué vs secrétaire).
   */
  membershipRoles: UserRole[];
  accountType: AccountType;
  accountStatus: AccountStatus;
  /** Promotion métier admin support (distinct du rôle JWT secrétaire). */
  adminSupport?: boolean;
  internalId?: string;
  /**
   * Dérivé des groupes / nom (pas de champs dédiés en base pour association & critère social).
   * {@link membershipGroups} est la source détaillée.
   */
  exemptions: {
    association: boolean;
    social: boolean;
    mandate: boolean;
  };
  /** Groupes issus de l’API (tarifs, pouvoir conseil). */
  membershipGroups: UserMembershipGroup[];
  groupIds: string[];
  createdAt: string;
}
