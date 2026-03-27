export interface BlackoutPeriodDto {
  id: string;
  resourceId: string | null;
  resourceName: string | null;
  dateFrom: string;
  dateTo: string;
  reason: string;
  createdByName: string;
}

export interface CreateBlackoutDto {
  resourceId: string | null;
  dateFrom: string;
  dateTo: string;
  reason: string;
}
