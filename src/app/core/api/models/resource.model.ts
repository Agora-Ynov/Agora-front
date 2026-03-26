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
  description?: string | null;
  status?: ResourceStatus;
  capacity?: number | null;
  location?: string | null;
  imageUrl?: string | null;
  requiresDeposit?: boolean;
  depositExemptible?: boolean;
  depositAmount?: number;
  depositAmountCents?: number;
  basePriceCents?: number;
  accessibilityTags?: AccessibilityTag[];
  isActive?: boolean;
  quantity?: number | null;
  allowedRoles?: string[];
  quotaPerUser?: number;
  quotaPeriod?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  availabilityStart?: string;
  availabilityEnd?: string;
  blackoutDates?: string[];
}

export interface CreateResourceDto {
  name: string;
  resourceType: ResourceType;
  description: string;
  capacity: number | null;
  imageUrl?: string | null;
  depositAmountCents: number;
  accessibilityTags: AccessibilityTag[];
  isActive?: boolean;
  basePriceCents?: number;
  quantity?: number | null;
  depositExemptible?: boolean;
}

export interface UpdateResourceDto extends CreateResourceDto {}

export interface ResourceFormValue {
  resourceType: ResourceType;
  name: string;
  description: string;
  capacity: number | null;
  basePriceEuros: number | null;
  depositAmountEuros: number | null;
  depositExemptible: boolean;
  accessibilityTagsText: string;
  imageUrl?: string | null;
  quantity: number | null;
  isActive: boolean;
}

export interface ResourceStats {
  roomsCount: number;
  materialsCount: number;
  totalCount: number;
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
