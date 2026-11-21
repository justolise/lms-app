/**
 * AUTH-5: Rate limiting configurations for authentication endpoints.
 * Governs brute-force prevention and request throttling per client IP.
 */
export const AUTH_RATE_LIMITS = {
  login: {
    limit: 5,
    windowMs: 60_000,
    keyPrefix: 'auth-login',
  },
  selectMembership: {
    limit: 10,
    windowMs: 60_000,
    keyPrefix: 'auth-select-membership',
  },
  refresh: {
    limit: 20,
    windowMs: 60_000,
    keyPrefix: 'auth-refresh',
  },
  forgotPassword: {
    limit: 3,
    windowMs: 60_000,
    keyPrefix: 'auth-forgot-password',
  },
  resetPassword: {
    limit: 5,
    windowMs: 60_000,
    keyPrefix: 'auth-reset-password',
  },
  changePassword: {
    limit: 5,
    windowMs: 60_000,
    keyPrefix: 'auth-change-password',
  },
} as const;
