export type AccountType = 'AUTONOMOUS' | 'TUTORED';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

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
  tokenType: 'Bearer';
  expiresIn: number;
  user: LoginUserSummary;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
}