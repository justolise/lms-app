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

export interface MemberDirectoryItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: "ACTIVE" | "SUSPENDED";
  admissionNumber: string | null;
  memberTypeId: string;
  memberTypeName: string | null;
  groupId: string | null;
  groupName: string | null;
  photoUrl: string | null;
  membershipExpiresAt: string | null;
  createdAt: string;
}

export interface MemberDetail extends MemberDirectoryItem {
  profileId: string;
  mustChangePassword: boolean;
  identifierType: string | null;
  activeLoansCount: number;
  fineBalanceMinorUnits: number;
  fineBalanceKes: number;
  updatedAt: string;
}

export interface UpdateMemberPayload {
  fullName?: string;
  email?: string;
  phone?: string;
  memberTypeId?: string;
  admissionNumber?: string;
  groupId?: string;
  photoUrl?: string;
  membershipExpiresAt?: string;
  status?: "ACTIVE" | "SUSPENDED";
}

export interface MemberLoanItem {
  id: string;
  loanId: string;
  copyId: string;
  copyBarcode: string;
  catalogueItemId: string;
  bookTitle: string;
  bookAuthor: string;
  bookFormat: string;
  loanDurationDays: number;
  maxRenewals: number;
  renewalCount: number;
  checkedOutAt: string;
  dueAt: string;
  returnedAt: string | null;
  status: "ACTIVE" | "RETURNED" | "OVERDUE" | "LOST" | "DAMAGED";
  fineMinorUnits: number | null;
  fineKes: number;
  overrideReason: string | null;
}
