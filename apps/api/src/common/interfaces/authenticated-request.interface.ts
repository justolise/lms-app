import type { Request } from 'express';

import type { AccessTokenPayload } from '../../auth/token/dto/access-token-payload.dto.js';

/**
 * Extends the Express Request with the authenticated user payload
 * attached by AccessTokenGuard after successful JWT verification.
 */
export type AuthenticatedRequest = Request & {
  user: AccessTokenPayload;
};
