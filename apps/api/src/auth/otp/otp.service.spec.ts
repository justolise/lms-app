import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OtpService } from './otp.service.js';
import { DatabaseService } from '../../database/database.service.js';
import { IdentityService } from '../identity/identity.service.js';
import { IdentityLookupService } from '../identity/identity-lookup.service.js';
import { PasswordService } from '../password/password.service.js';
import { SessionService } from '../session/session.service.js';

describe('OtpService (AUTH-3)', () => {
  let service: OtpService;

  const tenantId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const testEmail = 'user@example.com';
  const testPhone = '+254712345678';

  let selectRows: any[] = [];
  let updateRows: any[] = [];
  let insertRows: any[] = [];

  const createQueryChain = (getRows: () => any[]) => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      for: vi.fn(() => chain),
      values: vi.fn(() => chain),
      set: vi.fn(() => chain),
      returning: vi.fn(() => chain),
      then: (onfulfilled: any, onrejected: any) =>
        Promise.resolve(getRows()).then(onfulfilled, onrejected),
    };
    return chain;
  };

  const tx = {
    select: vi.fn(() => createQueryChain(() => selectRows)),
    update: vi.fn(() => createQueryChain(() => updateRows)),
    insert: vi.fn(() => createQueryChain(() => insertRows)),
  };

  const database = {
    withTenant: vi.fn(
      async (
        _tenantId: string,
        callback: (transaction: never) => Promise<unknown>,
      ) => callback(tx as never),
    ),
  } as unknown as DatabaseService;

  const identity = {
    normalizeEmail: vi.fn((e: string) => e.trim().toLowerCase()),
    normalizePhone: vi.fn((p: string) => p.trim()),
  } as unknown as IdentityService;

  const identityLookup = {
    findIdentity: vi.fn(),
  } as unknown as IdentityLookupService;

  const passwordService = {
    hash: vi.fn().mockResolvedValue('hashed-otp-or-password'),
    verify: vi.fn(),
  } as unknown as PasswordService;

  const sessionService = {
    revokeAllUserSessions: vi.fn().mockResolvedValue(undefined),
  } as unknown as SessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    selectRows = [];
    updateRows = [];
    insertRows = [];

    service = new OtpService(
      database,
      identity,
      identityLookup,
      passwordService,
      sessionService,
    );
  });

  describe('requestPasswordReset', () => {
    it('returns generic message for unknown email without disclosing account absence', async () => {
      vi.mocked(identityLookup.findIdentity).mockResolvedValue([]);

      const result = await service.requestPasswordReset('EMAIL', 'unknown@example.com');

      expect(result).toEqual({
        message: 'If an account exists, a reset code has been sent.',
      });
      expect(tx.insert).not.toHaveBeenCalled();
    });

    it('returns generic message for unknown phone without disclosing account absence', async () => {
      vi.mocked(identityLookup.findIdentity).mockResolvedValue([]);

      const result = await service.requestPasswordReset('PHONE', '+254799999999');

      expect(result).toEqual({
        message: 'If an account exists, a reset code has been sent.',
      });
      expect(tx.insert).not.toHaveBeenCalled();
    });

    it('creates OTP hash and delivers when account exists', async () => {
      vi.mocked(identityLookup.findIdentity).mockResolvedValue([
        { tenantId, userId },
      ]);

      const deliverySpy = vi.fn();
      service.setTestDeliveryHandler(deliverySpy);

      const result = await service.requestPasswordReset('EMAIL', testEmail);

      expect(result).toEqual({
        message: 'If an account exists, a reset code has been sent.',
      });
      expect(tx.insert).toHaveBeenCalled();
      expect(deliverySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'EMAIL',
          recipient: testEmail,
          code: expect.stringMatching(/^\d{6}$/),
        }),
      );
    });
  });

  describe('verifyAndResetPassword', () => {
    it('resets password and revokes all active sessions with valid OTP', async () => {
      vi.mocked(identityLookup.findIdentity).mockResolvedValue([
        { tenantId, userId },
      ]);

      selectRows = [
        {
          id: 'otp-id-1',
          codeHash: 'hashed-otp',
          attempts: 0,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      ];
      updateRows = [{ id: 'otp-id-1' }];

      vi.mocked(passwordService.verify).mockResolvedValue(true);

      const result = await service.verifyAndResetPassword(
        'EMAIL',
        testEmail,
        '123456',
        'BrandNewPassword123!',
      );

      expect(result.success).toBe(true);
      expect(sessionService.revokeAllUserSessions).toHaveBeenCalledWith(
        tenantId,
        userId,
      );
    });

    it('rejects wrong OTP and increments attempts', async () => {
      vi.mocked(identityLookup.findIdentity).mockResolvedValue([
        { tenantId, userId },
      ]);

      selectRows = [
        {
          id: 'otp-id-1',
          codeHash: 'hashed-otp',
          attempts: 2,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      ];

      vi.mocked(passwordService.verify).mockResolvedValue(false);

      await expect(
        service.verifyAndResetPassword(
          'EMAIL',
          testEmail,
          '000000',
          'BrandNewPassword123!',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(tx.update).toHaveBeenCalled();
      expect(sessionService.revokeAllUserSessions).not.toHaveBeenCalled();
    });

    it('rejects expired OTP or when no active OTP is found', async () => {
      vi.mocked(identityLookup.findIdentity).mockResolvedValue([
        { tenantId, userId },
      ]);

      selectRows = []; // Expired or none found

      await expect(
        service.verifyAndResetPassword(
          'EMAIL',
          testEmail,
          '123456',
          'BrandNewPassword123!',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects short passwords', async () => {
      await expect(
        service.verifyAndResetPassword('EMAIL', testEmail, '123456', 'short'),
      ).rejects.toThrow('New password must be at least 8 characters long');
    });
  });
});
