import { TimeSlotDto as OpenApiTimeSlotDto } from '../model/timeSlotDto';

/** Aligné sur le backend / OpenAPI (`ResourceType`). */
export type ResourceType = 'IMMOBILIER' | 'MOBILIER';

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
  imageUrl?: string | null;
  /** Tags d’accessibilité (noms d’enum côté back, ex. PMR_ACCESS). */
  accessibilityTags?: string[];
  isActive?: boolean;
}

/**
 * Création / mise à jour : aligné sur `ResourceRequest` (backend).
 * Pas de tarif de base ni quantité côté API pour l’instant.
 */
export interface CreateResourceDto {
  name: string;
  resourceType: ResourceType;
  description: string;
  capacity: number | null;
  depositAmountCents: number;
  imageUrl?: string | null;
  accessibilityTags: string[];
}

export type UpdateResourceDto = CreateResourceDto;

/** Formulaire admin : uniquement les champs envoyés au backend. */
export interface ResourceFormValue {
  resourceType: ResourceType;
  name: string;
  description: string;
  capacity: number | null;
  depositAmountEuros: number | null;
  accessibilityTagsText: string;
  imageUrl?: string | null;
}

export interface ResourceStats {
  roomsCount: number;
  materialsCount: number;
  totalCount: number;
}

export type ResourceSlotDto = Required<OpenApiTimeSlotDto>;

export interface CalendarSlotDto {
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  slotStart: string;
  slotEnd: string;
  isAvailable: boolean;
}

export interface CalendarDayDto {
  date: string;
  isBlackout: boolean;
  blackoutReason: string | null;
  slots: CalendarSlotDto[];
}

export interface CalendarMonthDto {
  year: number;
  month: number;
  days: CalendarDayDto[];
}

/*
 * Anciens types / champs front-only (non exposés par le backend actuel) — à réintroduire quand l’API les fournira :
 *
 * export type ResourceStatus = 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE';
 * export type AccessibilityTag = 'PMR_ACCESS' | 'PARKING' | ... ;
 * // basePriceCents, quantity, requiresDeposit, depositExemptible, quotas, blackouts embarqués, etc.
 */
