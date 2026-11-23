import { describe, expect, it } from 'vitest';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { PlatformAuthGuard } from './platform-auth.guard.js';
import { PlatformTokenService } from '../auth/platform-token.service.js';

describe('PlatformAuthGuard', () => {
  const tokenService = new PlatformTokenService();
  const guard = new PlatformAuthGuard(tokenService);

  function createMockContext(headers: Record<string, string> = {}, cookies: Record<string, string> = {}): ExecutionContext {
    const request = {
      headers,
      cookies,
      platformUser: null,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('should authenticate request with valid cookie and attach platformUser', async () => {
    const validToken = await tokenService.signPlatformAccessToken({
      platformUserId: 'admin-uuid-1',
      email: 'admin@commonplace.co.ke',
      fullName: 'Super Admin',
      role: 'PLATFORM_SUPER_ADMIN',
      sessionId: 'session-1',
      mfaVerified: true,
    });

    const ctx = createMockContext({}, { lms_platform_access: validToken });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    const req = ctx.switchToHttp().getRequest() as any;
    expect(req.platformUser.platformUserId).toBe('admin-uuid-1');
  });

  it('should authenticate request with Bearer Authorization header', async () => {
    const validToken = await tokenService.signPlatformAccessToken({
      platformUserId: 'admin-uuid-1',
      email: 'admin@commonplace.co.ke',
      fullName: 'Super Admin',
      role: 'PLATFORM_SUPER_ADMIN',
      sessionId: 'session-1',
      mfaVerified: true,
    });

    const ctx = createMockContext({ authorization: `Bearer ${validToken}` });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('should reject request missing platform token', async () => {
    const ctx = createMockContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Platform authentication required',
    );
  });

  it('should reject request with expired or invalid token', async () => {
    const ctx = createMockContext({ authorization: 'Bearer invalid.jwt.token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
