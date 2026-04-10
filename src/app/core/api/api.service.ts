import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(
    path: string,
    params?: Record<string, string | number | boolean | string[]>
  ): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`, {
      params: this.buildParams(params),
      withCredentials: true,
    });
  }

  /**
   * GET avec Accept application/json : le client OpenAPI utilise souvent un Accept générique
   * et force responseType blob, ce qui empêche d'exploiter le corps comme objet typé.
   */
  getJson<T>(
    path: string,
    params?: Record<string, string | number | boolean | string[]>
  ): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`, {
      params: this.buildParams(params),
      withCredentials: true,
      transferCache: false,
      headers: { Accept: 'application/json' },
    });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body, { withCredentials: true });
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, body, { withCredentials: true });
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.base}${path}`, body, { withCredentials: true });
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`, { withCredentials: true });
  }

  postFormData<T>(path: string, formData: FormData): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, formData, { withCredentials: true });
  }

  private buildParams(
    params?: Record<string, string | number | boolean | string[] | undefined | null>
  ): HttpParams {
    if (!params) return new HttpParams();
    let out = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === undefined || item === null || String(item) === '') continue;
          out = out.append(key, String(item));
        }
      } else {
        out = out.set(key, String(value));
      }
    }
    return out;
  }
}
