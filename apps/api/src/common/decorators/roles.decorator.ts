import { SetMetadata } from '@nestjs/common';

import type { AuthRole } from '../types/auth-role.js';
import { ROLES_KEY } from '../constants/app.constants.js';

export { ROLES_KEY };

/**
 * AUTH-2: Declares the roles permitted to access a route handler or controller.
 * Consumed by RolesGuard via the ROLES_KEY metadata key.
 *
 * @example @Roles('ADMIN', 'LIBRARIAN')
 */
export const Roles = (...roles: AuthRole[]) => SetMetadata(ROLES_KEY, roles);
