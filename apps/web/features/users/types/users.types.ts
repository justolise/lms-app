export interface DirectoryUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
  admissionNumber?: string;
  memberType?: string;
  group?: string;
}

export interface DirectoryResponse {
  users: DirectoryUser[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
  profile?: {
    admissionNumber?: string;
    memberType?: string;
    group?: string;
    membershipExpiresAt?: string;
  };
}

export interface InviteLibrarianInput {
  fullName: string;
  email?: string;
  phone?: string;
}

export interface InviteLibrarianResult {
  id: string;
  fullName: string;
  email?: string;
  temporaryPassword?: string;
}

export interface UpdateProfileInput {
  fullName: string;
  email?: string;
  phone?: string;
}
