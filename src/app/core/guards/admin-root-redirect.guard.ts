import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/**
 * Ancienne URL `/admin` : même périmètre que le tableau de bord désormais sur `/`.
 * Évite la combinaison interdite {@code redirectTo} + {@code canActivate} sur la même route.
 */
export const adminRootRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (!auth.canAccessFullAdminSpa()) {
    return router.createUrlTree(['/unauthorized']);
  }
  return router.createUrlTree(['/']);
};
