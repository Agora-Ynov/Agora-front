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
          // Ne rediriger vers /login que si la requête envoyait un token
          // (session expirée / token invalide). Pour les accès anonymes à des
          // endpoints protégés, on laisse le composant gérer l'erreur.
          if (req.headers.has('Authorization')) {
            jwtService.clearTokens();
            router.navigate(['/login']);
          }
          break;

        case 403:
          router.navigate(['/unauthorized']);
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
