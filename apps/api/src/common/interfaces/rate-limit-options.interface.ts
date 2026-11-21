/**
 * AUTH-5: Rate limiting configuration shape applied per route via
 * the @RateLimit() decorator and enforced by RateLimitGuard.
 */
export interface RateLimitOptions {
  /** Maximum requests allowed in the window. */
  limit: number;
  /** Sliding window duration in milliseconds. */
  windowMs: number;
  /** Redis key prefix; must be unique per guarded endpoint. */
  keyPrefix: string;
}
