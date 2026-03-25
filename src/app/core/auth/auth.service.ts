import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, delay, throwError } from 'rxjs';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse
} from './auth.model';
import { environment } from '../../../environments/environment';
import { JwtService } from './jwt.service';
import {
  MOCK_LOGIN_RESPONSE,
  MOCK_REGISTER_RESPONSE,
  isMockLoginValid,
  isMockRegisterEmailAlreadyExists
} from './auth.mock';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly authUrl = `${environment.apiUrl}/auth`;

  constructor(
    private http: HttpClient,
    private jwtService: JwtService
  ) {}

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authUrl}/login`, payload, {
      withCredentials: true
    });
  }

  loginMock(payload: LoginRequest): Observable<LoginResponse> {
    if (isMockLoginValid(payload)) {
      return of(MOCK_LOGIN_RESPONSE).pipe(delay(700));
    }

    return throwError(() => ({
      status: 401,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect.'
      }
    } as HttpErrorResponse));
  }

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.authUrl}/register`, payload, {
      withCredentials: true
    });
  }

  registerMock(payload: RegisterRequest): Observable<RegisterResponse> {
    if (isMockRegisterEmailAlreadyExists(payload.email)) {
      return throwError(() => ({
        status: 409,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Cet email est déjà associé à un compte.'
        }
      } as HttpErrorResponse));
    }

    const response: RegisterResponse = {
      ...MOCK_REGISTER_RESPONSE,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName
    };

    return of(response).pipe(delay(700));
  }

  saveSession(response: LoginResponse): void {
    this.jwtService.saveToken(response.accessToken);
    this.jwtService.saveUser(response.user);
  }

  getToken(): string | null {
    return this.jwtService.getToken();
  }

  isAuthenticated(): boolean {
    return this.jwtService.isAuthenticated();
  }

  logout(): void {
    this.jwtService.clearSession();
  }
}