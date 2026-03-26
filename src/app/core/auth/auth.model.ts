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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  accountType: AccountType;
  status: AccountStatus;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user?: LoginUserSummary;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
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
