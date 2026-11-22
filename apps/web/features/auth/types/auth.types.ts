import type { AuthRole } from "@/types/roles";

export type IdentifierType = "EMAIL" | "PHONE";

export interface LibraryMembership {
  tenantId: string;
  tenantName: string;
  role: AuthRole;
}

export interface LoginResponse {
  authenticated?: boolean;
  requiresLibrarySelection?: boolean;
  memberships?: LibraryMembership[];
  user?: {
    id: string;
    fullName: string;
    role: AuthRole;
    mustChangePassword?: boolean;
  };
  library?: {
    id: string;
    name: string;
  };
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface UserSession {
  id: string;
  deviceName: string | null;
  lastUsedAt: string | null;
  expiresAt: string;
  createdAt: string;
}
