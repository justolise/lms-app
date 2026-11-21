import type { AuthRole } from '../../../common/types/auth-role.js';

export interface CreateSessionInput {
  userId: string;
  tenantId: string;
  role: AuthRole;
  deviceName?: string;
  mustChangePassword?: boolean;
}

export interface CreatedSession {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface SessionSummary extends Record<string, unknown> {
  id: string;
  deviceName: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date;
}

export interface RefreshSessionRecord extends Record<string, unknown> {
  id: string;
  tenantId: string;
  userId: string;
  revokedAt: Date | null;
  expiresAt: Date;
  replacedBySessionId: string | null;
  deviceName: string | null;
}

export interface SessionIdRecord extends Record<string, unknown> {
  id: string;
}

export type RefreshOutcome =
  | { status: 'rotated'; session: CreatedSession }
  | { status: 'replayed' }
  | { status: 'expired' }
  | { status: 'invalid' };
