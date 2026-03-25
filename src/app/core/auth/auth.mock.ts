import { LoginRequest, LoginResponse } from './auth.model';

export const MOCK_LOGIN_CREDENTIALS = {
  email: 'jean.dupont@gmail.com',
  password: 'MonMotDePasse123!'
};

export const MOCK_LOGIN_RESPONSE: LoginResponse = {
  accessToken: 'eyJhbGciOiJIUzI1NiJ9.mock-token',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    firstName: 'Jean',
    lastName: 'Dupont',
    accountType: 'AUTONOMOUS',
    status: 'ACTIVE'
  }
};

export function isMockLoginValid(payload: LoginRequest): boolean {
  return (
    payload.email === MOCK_LOGIN_CREDENTIALS.email &&
    payload.password === MOCK_LOGIN_CREDENTIALS.password
  );
}