import { TimeSlotDto as OpenApiTimeSlotDto } from '../model/timeSlotDto';

/** Aligné sur le backend / OpenAPI (`ResourceType`). */
export type ResourceType = 'IMMOBILIER' | 'MOBILIER';

/**
 * Tags d'équipement / accessibilité : identifiants alignés sur l'enum API.
 * Source unique pour formulaires admin et filtres catalogue.
 */
export const RESOURCE_ACCESSIBILITY_OPTIONS = [
  { id: 'PMR_ACCESS', label: 'Accès PMR' },
  { id: 'PARKING', label: 'Parking' },
  { id: 'SOUND_SYSTEM', label: 'Sonorisation' },
  { id: 'PROJECTOR', label: 'Vidéoprojecteur' },
  { id: 'KITCHEN', label: 'Cuisine équipée' },
  { id: 'STREET_ACCESS', label: 'Accès rue directe' },
] as const;

export type ResourceAccessibilityTagId = (typeof RESOURCE_ACCESSIBILITY_OPTIONS)[number]['id'];

/**
 * Ressource catalogue / admin : miroir du contrat API (`ResourceDto` généré).
 * Les champs optionnels reflètent la sérialisation JSON (absence possible).
 */
export interface ResourceDto {
  id: string;
  name: string;
  resourceType: ResourceType;
  capacity?: number | null;
  description?: string | null;
  depositAmountCents?: number;
  /** Tarif de location en centimes ; absent si non renseigné côté catalogue. */
  rentalPriceCents?: number | null;
  imageUrl?: string | null;
  /** Tags d'accessibilité (noms d'enum côté back, ex. PMR_ACCESS). */
  accessibilityTags?: string[];
  isActive?: boolean;
}

/**
 * Création / mise à jour : aligné sur `ResourceRequest` (backend).
 */
export interface CreateResourceDto {
  name: string;
  resourceType: ResourceType;
  description: string;
  capacity: number | null;
  depositAmountCents: number;
  /** Centimes ; omis ou undefined si le formulaire laisse « non renseigné ». */
  rentalPriceCents?: number;
  imageUrl?: string | null;
  accessibilityTags: string[];
}

export type UpdateResourceDto = CreateResourceDto;

/** Formulaire admin : champs UI avant mapping vers DTO. */
export interface ResourceFormValue {
  resourceType: ResourceType;
  name: string;
  description: string;
  capacity: number | null;
  depositAmountEuros: number | null;
  /** Tarif de location (EUR) ; null = non renseigné (API : pas de tarif catalogue). */
  rentalAmountEuros: number | null;
  /** Identifiants sélectionnés parmi `RESOURCE_ACCESSIBILITY_OPTIONS`. */
  accessibilityTags: string[];
  imageUrl?: string | null;
}

export interface ResourceStats {
  roomsCount: number;
  materialsCount: number;
  totalCount: number;
}

export type ResourceSlotDto = Required<OpenApiTimeSlotDto>;

/** Calendrier mensuel : alias du DTO OpenAPI (`CalendarResponseDto`). */
export type { CalendarResponseDto as CalendarMonthDto } from '../model/calendarResponseDto';
export type { CalendarDayDto } from '../model/calendarDayDto';
export type { CalendarSlotDto } from '../model/calendarSlotDto';
