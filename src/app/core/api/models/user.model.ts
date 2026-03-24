import { AccountStatus, AccountType, UserRole } from '../../auth/auth.model';

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  accountType: AccountType;
  accountStatus: AccountStatus;
  internalId?: string;
  exemptions: UserExemptions;
  groupIds: string[];
  tutorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserExemptions {
  association: boolean;
  social: boolean;
  mandate: boolean;
}

export interface CreateTutoredUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  tutorId: string;
  internalId?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
}
