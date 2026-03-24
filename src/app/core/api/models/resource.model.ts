export type ResourceType = 'ROOM' | 'EQUIPMENT' | 'OUTDOOR_SPACE' | 'VEHICLE';

export type ResourceStatus = 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE';

export interface ResourceDto {
  id: string;
  name: string;
  description?: string;
  type: ResourceType;
  status: ResourceStatus;
  capacity?: number;
  location?: string;
  imageUrl?: string;
  requiresDeposit: boolean;
  depositAmount?: number;
  allowedRoles: string[];
  quotaPerUser?: number;
  quotaPeriod?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  availabilityStart?: string;
  availabilityEnd?: string;
  blackoutDates: string[];
}

export interface ResourceSlotDto {
  resourceId: string;
  date: string;
  slots: TimeSlot[];
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  reservationId?: string;
}
