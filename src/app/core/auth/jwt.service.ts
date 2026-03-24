import { Injectable } from '@angular/core';
import { TokenPayload } from './auth.model';

const ACCESS_TOKEN_KEY = 'agora_access_token';
const REFRESH_TOKEN_KEY = 'agora_refresh_token';

@Injectable({ providedIn: 'root' })
export class JwtService {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  decodeToken(token: string): TokenPayload | null {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded) as TokenPayload;
    } catch {
      return null;
    }
  }

  getPayload(): TokenPayload | null {
    const token = this.getAccessToken();
    if (!token) return null;
    return this.decodeToken(token);
  }

  isTokenExpired(token?: string): boolean {
    const t = token ?? this.getAccessToken();
    if (!t) return true;
    const payload = this.decodeToken(t);
    if (!payload) return true;
    return payload.exp * 1000 < Date.now();
  }
}
