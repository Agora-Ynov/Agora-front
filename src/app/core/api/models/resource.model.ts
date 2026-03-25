export type ResourceType = 'IMMOBILIER' | 'MOBILIER';

export type AccessibilityTag =
  | 'PMR_ACCESS'
  | 'PARKING'
  | 'SOUND_SYSTEM'
  | 'PROJECTOR'
  | 'KITCHEN'
  | 'STREET_ACCESS';

export interface ResourceDto {
  id: string;
  name: string;
  resourceType: ResourceType;
  capacity: number | null;
  description: string;
  depositAmountCents: number;
  imageUrl: string;
  accessibilityTags: AccessibilityTag[];
  isActive: boolean;
}

export interface ResourceSlotDto {
  slotStart: string;
  slotEnd: string;
  isAvailable: boolean;
}

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
