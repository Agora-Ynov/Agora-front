import { HttpErrorResponse } from '@angular/common/http';

/**
 * Retourne le champ `message` du corps JSON d’erreur renvoyé par l’API Agora.
 * Ne pas concaténer de texte générique : l’UI affiche uniquement ce libellé métier.
 */
export function messageFromApiError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return '';
  }
  const body = error.error;
  if (body && typeof body === 'object' && 'message' in body) {
    const msg = (body as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim().length > 0) {
      return msg.trim();
    }
  }
  return '';
}
