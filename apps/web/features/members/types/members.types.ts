export interface CreateMemberInput {
  fullName: string;
  email?: string;
  phone?: string;
  memberTypeId: string;
  admissionNumber?: string;
  identifierType?: "NATIONAL_ID" | "ALIEN_ID" | "PASSPORT" | "OTHER";
  identifierValue?: string;
  membershipExpiresAt?: string;
}

export interface CreateMemberResult {
  userId: string;
  profileId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: "MEMBER";
  mustChangePassword: boolean;
  temporaryPassword: string;
}

export interface MemberTypeOption {
  id: string;
  name: string;
}
