export const PLATFORM_TOKEN_ISSUER = 'commonplace-platform';
export const PLATFORM_TOKEN_AUDIENCE = 'commonplace-platform-admin';
export const PLATFORM_TOKEN_ALGORITHM = 'HS256';

export const PLATFORM_ACCESS_TOKEN_EXPIRY = '24h';
export const PLATFORM_TEMP_MFA_EXPIRY = '5m';
export const PLATFORM_REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const PLATFORM_ACCESS_COOKIE = 'lms_platform_access';
export const PLATFORM_REFRESH_COOKIE = 'lms_platform_refresh';
export const PLATFORM_TEMP_COOKIE = 'lms_platform_temp';

export const PLATFORM_ACCESS_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
export const PLATFORM_REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const PLATFORM_TEMP_COOKIE_MAX_AGE_MS = 5 * 60 * 1000;
