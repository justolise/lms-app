/**
 * AUTH-1 / AUTH-3 / AUTH-5: Cookie names, max-ages and other
 * authentication-specific constants shared across AuthController and guards.
 */

/** Cookie name for the short-lived access JWT (15 minutes). */
export const ACCESS_COOKIE = 'access_token';

/** Cookie name for the long-lived refresh token (7 days). */
export const REFRESH_COOKIE = 'refresh_token';

/** Cookie name for the multi-library selection token (5 minutes). */
export const SELECTION_COOKIE = 'library_selection_token';

/** Access cookie max-age in milliseconds: 15 minutes. */
export const ACCESS_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;

/** Refresh cookie max-age in milliseconds: 7 days. */
export const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Library selection cookie max-age in milliseconds: 5 minutes. */
export const SELECTION_COOKIE_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Generic error message for failed login attempts.
 * Identical text is returned for all failure modes (bad credentials,
 * no account, suspended account) to prevent user enumeration (AUTH-1).
 */
export const INVALID_CREDENTIALS_MESSAGE =
  'Invalid email/phone or password' as const;

/**
 * AUTH-1: Endpoints that remain accessible when mustChangePassword is true.
 * These are the only routes accessible to first-login accounts before they
 * have changed their temporary password (AUTH-4 / AUTH-1).
 */
export const MUST_CHANGE_PASSWORD_ALLOWED_ENDPOINTS = [
  '/auth/change-password',
  '/api/auth/change-password',
  '/auth/logout',
  '/api/auth/logout',
  '/auth/sessions',
  '/api/auth/sessions',
] as const;
