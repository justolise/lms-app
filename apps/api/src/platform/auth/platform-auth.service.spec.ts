import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PlatformAuthService } from './platform-auth.service.js';
import { PlatformMfaService } from './platform-mfa.service.js';
import { PlatformSessionService } from './platform-session.service.js';
import { PlatformTokenService } from './platform-token.service.js';

describe('PlatformAuthService', () => {
  let service: PlatformAuthService;
  let mockDb: {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockDatabase: { db: typeof mockDb };
  let tokenService: PlatformTokenService;
  let sessionService: PlatformSessionService;
  let mfaService: PlatformMfaService;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };
    mockDatabase = { db: mockDb };
    tokenService = new PlatformTokenService();
    sessionService = new PlatformSessionService(mockDatabase as any);
    mfaService = new PlatformMfaService();

    service = new PlatformAuthService(
      mockDatabase as any,
      tokenService,
      sessionService,
      mfaService,
    );
  });

  describe('login', () => {
    it('should return mfaRequired=true with temp token when user has MFA enabled', async () => {
      const passwordHash = await argon2.hash('SecretAdminPass123!', {
        type: argon2.argon2id,
      });

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'admin-1',
            email: 'admin@commonplace.co.ke',
            fullName: 'Chief Admin',
            passwordHash,
            status: 'ACTIVE',
            mfaEnabled: true,
          },
        ]),
      });

      const result = await service.login({
        email: 'admin@commonplace.co.ke',
        password: 'SecretAdminPass123!',
      });

      expect(result.mfaRequired).toBe(true);
      if (result.mfaRequired) {
        expect(result.tempToken).toBeDefined();
        const verified = await tokenService.verifyTempMfaToken(result.tempToken);
        expect(verified.platformUserId).toBe('admin-1');
      }
    });

    it('should reject invalid password', async () => {
      const passwordHash = await argon2.hash('CorrectPassword!', {
        type: argon2.argon2id,
      });

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'admin-1',
            email: 'admin@commonplace.co.ke',
            passwordHash,
            status: 'ACTIVE',
          },
        ]),
      });

      await expect(
        service.login({
          email: 'admin@commonplace.co.ke',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyMfa', () => {
    it('should verify TOTP code successfully and issue full tokens', async () => {
      const totpSecret = mfaService.generateTotpSecret();
      const encryptedSecret = mfaService.encryptSecret(totpSecret);
      const validCode = mfaService.generateTotp(totpSecret);

      const tempToken = await tokenService.signTempMfaToken({
        platformUserId: 'admin-1',
        email: 'admin@commonplace.co.ke',
        role: 'PLATFORM_SUPER_ADMIN',
        mfaPending: true,
      });

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'admin-1',
            email: 'admin@commonplace.co.ke',
            fullName: 'Chief Admin',
            status: 'ACTIVE',
            mfaSecretEncrypted: encryptedSecret,
            mfaRecoveryCodesHash: [],
          },
        ]),
      });

      // Session creation mock
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{}]),
      });
      // Audit and user update mock
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{}]),
      });

      const result = await service.verifyMfa(
        { code: validCode },
        tempToken,
        '127.0.0.1',
      );

      expect(result.mfaRequired).toBe(false);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('admin@commonplace.co.ke');
    });

    it('should reject invalid 6-digit TOTP code', async () => {
      const totpSecret = mfaService.generateTotpSecret();
      const encryptedSecret = mfaService.encryptSecret(totpSecret);

      const tempToken = await tokenService.signTempMfaToken({
        platformUserId: 'admin-1',
        email: 'admin@commonplace.co.ke',
        role: 'PLATFORM_SUPER_ADMIN',
        mfaPending: true,
      });

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'admin-1',
            email: 'admin@commonplace.co.ke',
            status: 'ACTIVE',
            mfaSecretEncrypted: encryptedSecret,
          },
        ]),
      });

      await expect(
        service.verifyMfa({ code: '000000' }, tempToken),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
