import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, delay, throwError } from 'rxjs';
import { LoginRequest, LoginResponse } from './auth.model';
import { environment } from '../../../environments/environment';
import { JwtService } from './jwt.service';
import {
  MOCK_LOGIN_RESPONSE,
  isMockLoginValid
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