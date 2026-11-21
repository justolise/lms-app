import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { RATE_LIMIT_KEY } from '../constants/app.constants.js';
import type { RateLimitOptions } from '../interfaces/rate-limit-options.interface.js';
import { RateLimitGuard } from '../guards/rate-limit.guard.js';

/**
 * AUTH-5: Applies per-route rate limiting. Sets the RateLimitOptions
 * metadata and activates RateLimitGuard on the decorated route handler.
 *
 * @example @RateLimit({ limit: 5, windowMs: 60_000, keyPrefix: 'auth-login' })
 */
export function RateLimit(options: RateLimitOptions) {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_KEY, options),
    UseGuards(RateLimitGuard),
  );
}
