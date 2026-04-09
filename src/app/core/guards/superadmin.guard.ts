import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/** Accès aux écrans `/superadmin/*` (promotion admin support) — réservé au rôle SUPERADMIN. */
export const superadminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  if (auth.hasRole('SUPERADMIN')) return true;

  return router.createUrlTree(['/unauthorized']);
};
