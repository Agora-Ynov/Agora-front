export type UserRole = 'CITIZEN' | 'SECRETARY_ADMIN' | 'DELEGATE_ADMIN' | 'GROUP_MANAGER';

export type AccountType = 'AUTONOMOUS' | 'TUTORED';

export type AccountStatus = 'PENDING_VALIDATION' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REJECTED';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
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

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  accountType: AccountType;
  accountStatus: AccountStatus;
  internalId?: string;
  exemptions: {
    association: boolean;
    social: boolean;
    mandate: boolean;
  };
  groupIds: string[];
  createdAt: string;
}
