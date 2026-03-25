import {
  LoginRequest,
  LoginResponse,
  RegisterResponse
} from './auth.model';

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

export const MOCK_REGISTER_RESPONSE: RegisterResponse = {
  id: 'u001',
  email: 'jean.dupont@gmail.com',
  firstName: 'Jean',
  lastName: 'Dupont',
  accountType: 'AUTONOMOUS',
  status: 'ACTIVE'
};

export function isMockLoginValid(payload: LoginRequest): boolean {
  return (
    payload.email === 'jean.dupont@gmail.com' &&
    payload.password === 'MonMotDePasse123!'
  );
}

export function isMockRegisterEmailAlreadyExists(email: string): boolean {
  return email === 'jean.dupont@gmail.com';
}