import type { AuthRole } from '../types/auth-role.js';

/**
 * AUTH-2: Metadata key used by RolesGuard to read required roles from
 * the @Roles() decorator applied to route handlers or controllers.
 */
export const ROLES_KEY = 'roles';

/**
 * AUTH-5: Metadata key used by RateLimitGuard to read per-route rate
 * limit configuration from the @RateLimit() decorator.
 */
export const RATE_LIMIT_KEY = 'rate_limit_options';

/**
 * AUTH-2: All valid roles in the LMS v1.0 role set.
 * GUEST is not assigned to authenticated accounts; it represents the
 * anonymous public catalogue-browsing role and has no JWT or session.
 */
export const ALL_AUTHENTICATED_ROLES: AuthRole[] = [
  'ADMIN',
  'LIBRARIAN',
  'TEACHER',
  'MEMBER',
  'PARENT',
];
