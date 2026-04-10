import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/**
 * Par défaut : aligné sur {@code /api/admin/**} (SUPERADMIN, SECRETARY_ADMIN, ADMIN_SUPPORT).
 * Routes avec {@code data: { allowDelegate: true } } : aussi les délégués (console ressources, alignée sur {@code /api/resources}).
 */
export const adminGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  if (auth.canAccessFullAdminSpa()) return true;

  const allowDelegate = route.data['allowDelegate'] === true;
  if (allowDelegate && auth.canAccessDelegateResourceConsole()) return true;

  return router.createUrlTree(['/unauthorized']);
};
