import { describe, expect, it } from 'vitest';
import { PlatformTokenService } from './platform-token.service.js';

describe('PlatformTokenService', () => {
  const service = new PlatformTokenService();

  it('should sign and verify a platform access token', async () => {
    const payload = {
      platformUserId: 'super-admin-uuid-123',
      email: 'admin@commonplace.co.ke',
      fullName: 'Platform Admin',
      role: 'PLATFORM_SUPER_ADMIN' as const,
      sessionId: 'session-uuid-456',
      mfaVerified: true,
    };

    const token = await service.signPlatformAccessToken(payload);
    expect(typeof token).toBe('string');

    const verified = await service.verifyPlatformAccessToken(token);
    expect(verified.platformUserId).toBe(payload.platformUserId);
    expect(verified.email).toBe(payload.email);
    expect(verified.role).toBe('PLATFORM_SUPER_ADMIN');
    expect(verified.sessionId).toBe(payload.sessionId);
    expect(verified.mfaVerified).toBe(true);
  });

  it('should sign and verify a temporary MFA token', async () => {
    const payload = {
      platformUserId: 'super-admin-uuid-123',
      email: 'admin@commonplace.co.ke',
      role: 'PLATFORM_SUPER_ADMIN' as const,
      mfaPending: true as const,
    };

    const tempToken = await service.signTempMfaToken(payload);
    expect(typeof tempToken).toBe('string');

    const verified = await service.verifyTempMfaToken(tempToken);
    expect(verified.platformUserId).toBe(payload.platformUserId);
    expect(verified.email).toBe(payload.email);
    expect(verified.mfaPending).toBe(true);
  });

  it('should reject invalid or tampered platform access tokens', async () => {
    await expect(
      service.verifyPlatformAccessToken('invalid-token-string'),
    ).rejects.toThrow('Invalid or expired platform access token');
  });

  it('should reject invalid or tampered temporary MFA tokens', async () => {
    await expect(
      service.verifyTempMfaToken('invalid-temp-token'),
    ).rejects.toThrow('Invalid or expired MFA session token');
  });
});
