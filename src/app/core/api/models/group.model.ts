export interface GroupDto {
  id: string;
  name: string;
  description?: string;
  managerId: string;
  managerFullName: string;
  memberIds: string[];
  memberCount: number;
  createdAt: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
}

export interface GroupMembershipRequest {
  userId: string;
}
