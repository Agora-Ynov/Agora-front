import { ResourceDto } from '../../../core/api/models/resource.model';
import { normalizeCentsInput } from '../../../core/api/resource-cents.util';

export type ResourceCoverTheme =
  | 'hall'
  | 'conference'
  | 'civic'
  | 'balloons'
  | 'bouquet'
  | 'cocktail';

const COVER_THEMES: ResourceCoverTheme[] = [
  'hall',
  'conference',
  'civic',
  'balloons',
  'bouquet',
  'cocktail',
];

export const featureLabelMap: Record<string, string> = {
  PMR_ACCESS: 'Accès PMR',
  PARKING: 'Parking',
  SOUND_SYSTEM: 'Sonorisation',
  PROJECTOR: 'Vidéoprojecteur',
  KITCHEN: 'Cuisine équipée',
  STREET_ACCESS: 'Accès rue directe',
};

const featureCompactLabelMap: Record<string, string> = {
  PMR_ACCESS: 'PMR',
  PARKING: 'Parking',
  SOUND_SYSTEM: 'Sono',
  PROJECTOR: 'Projecteur',
  KITCHEN: 'Cuisine',
  STREET_ACCESS: 'Acces direct',
};

export function getFeatureLabel(feature: string): string {
  return featureLabelMap[feature] ?? feature;
}

export function getFeatureCompactLabel(feature: string): string {
  return featureCompactLabelMap[feature] ?? getFeatureLabel(feature);
}

export function getResourceTypeLabel(
  resourceType: ResourceDto['resourceType'] | undefined | null
): string {
  if (resourceType === 'IMMOBILIER') {
    return 'Salle';
  }
  return 'Materiel';
}

export function getResourceDisplayName(resource: ResourceDto): string {
  const raw = (resource.name ?? '').trim();
  if (!raw) {
    return 'Ressource';
  }
  const separators = [' — ', ' – ', ' - ', ' —', ' –', ' -'];
  for (const sep of separators) {
    const i = raw.indexOf(sep);
    if (i > 0) {
      return raw.slice(0, i).trim();
    }
  }
  return raw;
}

/** Déterministe à partir de l’id (pas de liste mock r001…). */
export function getResourceCoverTheme(resourceId: string): ResourceCoverTheme {
  let hash = 0;
  for (let i = 0; i < resourceId.length; i++) {
    hash = (hash << 5) - hash + resourceId.charCodeAt(i);
    hash |= 0;
  }
  return COVER_THEMES[Math.abs(hash) % COVER_THEMES.length];
}

/** Tarif de location en euros (hors remises groupe) ; 0 si inconnu ou gratuit selon `rentalPriceCents`. */
export function getResourcePrice(resource: ResourceDto): number {
  const c = normalizeCentsInput(resource.rentalPriceCents);
  if (c == null) {
    return 0;
  }
  return c / 100;
}

export function getResourceTags(resource: ResourceDto): string[] {
  if (resource.capacity != null && resource.capacity > 0) {
    return [`${resource.capacity} places`];
  }
  return ['Materiel'];
}

export function getResourceCharacteristics(resource: ResourceDto): string[] {
  return (resource.accessibilityTags ?? []).map(tag => getFeatureLabel(tag));
}

/** Pas de plages horaires dans le DTO ressource : l’écran renvoie vers le calendrier. */
export function getResourceAvailability(_resource: ResourceDto): string[] {
  return [];
}

/*
 * Anciennes données statiques (mock) — conservées en référence si l’API enrichit le catalogue :
 *
 * const tagMap: Record<string, string[]> = { r001: [...], ... };
 * const priceMap: Record<string, number> = { ... };
 * const characteristicMap: Record<string, string[]> = { ... };
 * const availabilityMap: Record<string, string[]> = { ... };
 */
