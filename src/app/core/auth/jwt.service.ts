import { Injectable } from '@angular/core';

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

  saveUser(user: unknown): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getUser(): unknown | null {
    const rawUser = localStorage.getItem(this.USER_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}