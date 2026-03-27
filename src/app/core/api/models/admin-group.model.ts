export type AdminGroupDiscountType = 'NONE' | 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FULL_EXEMPT';
export type AdminGroupDiscountAppliesTo = 'ALL' | 'IMMOBILIER_ONLY' | 'MOBILIER_ONLY';
export type AdminGroupMemberRole = 'MEMBER' | 'MANAGER';
export type AdminGroupFormType = 'SERVICE' | 'ASSOCIATION' | 'AUTRE';

export interface AdminGroupDto {
  id: string;
  name: string;
  isPreset: boolean;
  canViewImmobilier?: boolean;
  canBookImmobilier: boolean;
  canViewMobilier?: boolean;
  canBookMobilier: boolean;
  discountType: AdminGroupDiscountType;
  discountValue: number;
  discountAppliesTo?: AdminGroupDiscountAppliesTo;
  discountLabel?: string;
  memberCount: number;
  description?: string;
  groupType?: AdminGroupFormType;
}

export interface AdminGroupMemberDto {
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: AdminGroupMemberRole;
  joinedAt: string;
}

export interface CreateAdminGroupDto {
  name: string;
  canViewImmobilier: boolean;
  canBookImmobilier: boolean;
  canViewMobilier: boolean;
  canBookMobilier: boolean;
  discountType: AdminGroupDiscountType;
  discountValue: number;
  discountAppliesTo: AdminGroupDiscountAppliesTo;
}
