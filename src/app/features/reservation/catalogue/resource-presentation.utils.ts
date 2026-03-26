import {
  AccessibilityTag,
  ResourceDto,
  ResourceType,
} from '../../../core/api/models/resource.model';

export type ResourceCoverTheme =
  | 'hall'
  | 'conference'
  | 'civic'
  | 'balloons'
  | 'bouquet'
  | 'cocktail';

export const featureLabelMap: Record<AccessibilityTag, string> = {
  PMR_ACCESS: 'Acces PMR',
  PARKING: 'Parking',
  SOUND_SYSTEM: 'Sonorisation',
  PROJECTOR: 'Videoprojecteur',
  KITCHEN: 'Cuisine equipee',
  STREET_ACCESS: 'Acces rue directe',
};

const featureCompactLabelMap: Record<AccessibilityTag, string> = {
  PMR_ACCESS: 'PMR',
  PARKING: 'Parking',
  SOUND_SYSTEM: 'Sono',
  PROJECTOR: 'Projecteur',
  KITCHEN: 'Cuisine',
  STREET_ACCESS: 'Acces direct',
};

const coverThemeMap: Record<string, ResourceCoverTheme> = {
  r001: 'hall',
  r002: 'civic',
  r003: 'conference',
  r004: 'balloons',
  r005: 'bouquet',
  r006: 'cocktail',
};

const priceMap: Record<string, number> = {
  r001: 180,
  r002: 80,
  r003: 140,
  r004: 120,
  r005: 90,
  r006: 60,
};

const tagMap: Record<string, string[]> = {
  r001: ['250 places', 'Scene mobile', 'Office traiteur'],
  r002: ['20 places', 'Ecran mural', 'Wifi'],
  r003: ['80 places', 'Sonorisee', 'Loge'],
  r004: ['Pliants', 'Resistants', 'Avec baches laterales'],
  r005: ['2 enceintes', 'Table de mixage', '4 micros', '+1'],
  r006: ['Pliantes', 'Legeres', 'Faciles a transporter'],
};

const characteristicMap: Record<string, string[]> = {
  r001: ['Acces PMR', 'Parking', 'Sonorisation', 'Cuisine equipee'],
  r002: ['Videoprojecteur', 'WiFi', 'Climatisation', 'Paperboard'],
  r003: ['Parking', 'Sonorisation', 'Videoprojecteur', 'Acces rue directe'],
  r004: ['Pliants', 'Resistants', 'Montage rapide', 'Usage exterieur'],
  r005: ['2 enceintes', 'Table de mixage', '4 micros', 'Transportable'],
  r006: ['50 places assises', 'Pliantes', 'Legeres', 'Faciles a transporter'],
};

const availabilityMap: Record<string, string[]> = {
  r001: ['Semaine', 'Week-end'],
  r002: ['Semaine'],
  r003: ['Semaine', 'Evenement'],
  r004: ['Evenement'],
  r005: ['Ponctuel'],
  r006: ['Evenement'],
};

export function getFeatureLabel(feature: AccessibilityTag): string {
  return featureLabelMap[feature] ?? feature;
}

export function getFeatureCompactLabel(feature: AccessibilityTag): string {
  return featureCompactLabelMap[feature] ?? getFeatureLabel(feature);
}

export function getResourceTypeLabel(resourceType: ResourceType): string {
  return resourceType === 'IMMOBILIER' ? 'Salle' : 'Materiel';
}

export function getResourceDisplayName(resource: ResourceDto): string {
  const [name] = resource.name.split(' - ');
  return name;
}

export function getResourceCoverTheme(resourceId: string): ResourceCoverTheme {
  return coverThemeMap[resourceId] ?? 'hall';
}

export function getResourcePrice(resource: ResourceDto): number {
  const depositAmountCents = resource.depositAmountCents ?? 0;
  return priceMap[resource.id] ?? Math.round(depositAmountCents / 200);
}

export function getResourceTags(resource: ResourceDto): string[] {
  if (tagMap[resource.id]) {
    return tagMap[resource.id];
  }

  return resource.capacity ? [`${resource.capacity} places`] : ['Disponible'];
}

export function getResourceCharacteristics(resource: ResourceDto): string[] {
  return (
    characteristicMap[resource.id] ??
    resource.accessibilityTags?.map(feature => getFeatureLabel(feature)) ??
    []
  );
}

export function getResourceAvailability(resource: ResourceDto): string[] {
  return availabilityMap[resource.id] ?? ['Semaine'];
}
