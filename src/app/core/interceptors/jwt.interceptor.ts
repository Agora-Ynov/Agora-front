import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { JwtService } from '../auth/jwt.service';

const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/activate',
];

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const jwtService = inject(JwtService);

  const isPublic = PUBLIC_ROUTES.some(route => req.url.includes(route));
  if (isPublic) return next(req);

  const token = jwtService.getAccessToken();
  if (!token) return next(req);

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authReq);
};
