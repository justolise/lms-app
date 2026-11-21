import type { AuthRole } from '../../../common/types/auth-role.js';

export type { AuthRole } from '../../../common/types/auth-role.js';

export interface AccessTokenPayload {
  userId: string;
  tenantId: string;
  role: AuthRole;
  sessionId: string;
  mustChangePassword?: boolean;
}
