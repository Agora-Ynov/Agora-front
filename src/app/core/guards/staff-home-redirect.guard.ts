import { CanActivateFn } from '@angular/router';

/**
 * L’accueil « / » affiche désormais un hub dédié pour le staff (voir {@link HomeComponent}).
 * Aucune redirection imposée ici.
 */
export const staffHomeRedirectGuard: CanActivateFn = () => true;
