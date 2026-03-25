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

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
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

export interface ApiErrorResponse {
  code: string;
  message: string;
}