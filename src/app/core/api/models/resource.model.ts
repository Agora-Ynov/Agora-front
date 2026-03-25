export type ResourceType = 'IMMOBILIER' | 'MOBILIER';

export type AccessibilityTag =
  | 'PMR_ACCESS'
  | 'PARKING'
  | 'SOUND_SYSTEM'
  | 'PROJECTOR'
  | 'KITCHEN'
  | 'STREET_ACCESS';

export type ResourceStatus = 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE';

export interface ResourceDto {
  id: string;
  name: string;
  resourceType: ResourceType;
  description?: string;
  status?: ResourceStatus;
  capacity?: number | null;
  location?: string;
  imageUrl?: string;
  requiresDeposit?: boolean;
  depositAmount?: number;
  depositAmountCents?: number;
  accessibilityTags?: AccessibilityTag[];
  isActive?: boolean;
  allowedRoles?: string[];
  quotaPerUser?: number;
  quotaPeriod?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  availabilityStart?: string;
  availabilityEnd?: string;
  blackoutDates?: string[];
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
