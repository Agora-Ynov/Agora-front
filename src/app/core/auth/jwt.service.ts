import { Injectable } from '@angular/core';
import { LoginUserSummary } from './auth.model';

@Injectable({
  providedIn: 'root'
})
export class JwtService {
  private readonly TOKEN_KEY = 'accessToken';
  private readonly USER_KEY = 'user';

  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  saveUser(user: LoginUserSummary): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getUser(): LoginUserSummary | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}