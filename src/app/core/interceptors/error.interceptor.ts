import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { JwtService } from '../auth/jwt.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const jwtService = inject(JwtService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:
          // Session invalide : nettoyer les jetons. Ne pas forcer /login pour `/api/auth/me`
          // (évite de concurrencer la navigation post-connexion ; AuthService gère l’échec).
          if (req.headers.has('Authorization')) {
            jwtService.clearTokens();
            const isMe = req.url.includes('/api/auth/me');
            if (!isMe) {
              router.navigate(['/login']);
            }
          }
          break;

        case 403:
          // Laisser le formulaire de réservation afficher l'erreur (groupe / droits).
          if (!req.url.includes('/api/reservations')) {
            router.navigate(['/unauthorized']);
          }
          break;

        case 409:
          break;

        case 422:
          break;

        case 500:
          break;
      }

      return throwError(() => error);
    })
  );
};
