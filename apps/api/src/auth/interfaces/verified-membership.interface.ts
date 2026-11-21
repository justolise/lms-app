import type { AuthRole } from '../../common/types/auth-role.js';

/**
 * AUTH-1: Shape of a verified library membership returned after
 * successful credential verification in AuthService.verifyCredentials().
 * This is an internal contract — it is never sent directly to clients.
 */
export interface VerifiedMembership {
  userId: string;
  tenantId: string;
  tenantName: string;
  fullName: string;
  role: Exclude<AuthRole, 'GUEST'>;
  mustChangePassword?: boolean;
}
