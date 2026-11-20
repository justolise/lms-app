import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

import { TokenService } from './token.service.js';

describe('TokenService', () => {
  const originalAccessSecret = process.env.ACCESS_TOKEN_SECRET;
  const originalSelectionSecret = process.env.LIBRARY_SELECTION_TOKEN_SECRET;

  const accessSecret = Buffer.from('01234567890123456789012345678901').toString(
    'base64',
  );

  const selectionSecret = Buffer.from(
    'abcdefghijklmnopqrstuvwxyz123456',
  ).toString('base64');

  let service: TokenService;

  beforeEach(() => {
    process.env.ACCESS_TOKEN_SECRET = accessSecret;
    process.env.LIBRARY_SELECTION_TOKEN_SECRET = selectionSecret;

    service = new TokenService();
  });

  afterAll(() => {
    if (originalAccessSecret === undefined) {
      delete process.env.ACCESS_TOKEN_SECRET;
    } else {
      process.env.ACCESS_TOKEN_SECRET = originalAccessSecret;
    }

    if (originalSelectionSecret === undefined) {
      delete process.env.LIBRARY_SELECTION_TOKEN_SECRET;
    } else {
      process.env.LIBRARY_SELECTION_TOKEN_SECRET = originalSelectionSecret;
    }
  });

  describe('signAccessToken()', () => {
    it('should create an access token', async () => {
      const token = await service.signAccessToken({
        userId: '11111111-1111-4111-8111-111111111111',
        tenantId: '22222222-2222-4222-8222-222222222222',
        role: 'LIBRARIAN',
        sessionId: '33333333-3333-4333-8333-333333333333',
      });

      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken()', () => {
    it('should verify a valid access token', async () => {
      const payload = {
        userId: '11111111-1111-4111-8111-111111111111',
        tenantId: '22222222-2222-4222-8222-222222222222',
        role: 'LIBRARIAN' as const,
        sessionId: '33333333-3333-4333-8333-333333333333',
      };

      const token = await service.signAccessToken(payload);

      const result = await service.verifyAccessToken(token);

      expect(result).toEqual(payload);
    });

    it('should reject an invalid token', async () => {
      await expect(
        service.verifyAccessToken('invalid.token.value'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject a token signed with another secret', async () => {
      const otherService = new TokenService();

      const token = await otherService.signAccessToken({
        userId: '11111111-1111-4111-8111-111111111111',
        tenantId: '22222222-2222-4222-8222-222222222222',
        role: 'MEMBER',
        sessionId: '33333333-3333-4333-8333-333333333333',
      });

      process.env.ACCESS_TOKEN_SECRET = Buffer.from(
        'abcdefghijklmnopqrstuvwxyz123456',
      ).toString('base64');

      const serviceWithDifferentSecret = new TokenService();

      await expect(
        serviceWithDifferentSecret.verifyAccessToken(token),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('signLibrarySelectionToken()', () => {
    it('should create a library selection token', async () => {
      const token = await service.signLibrarySelectionToken({
        memberships: [
          {
            tenantId: '22222222-2222-4222-8222-222222222222',
            userId: '11111111-1111-4111-8111-111111111111',
          },
        ],
      });

      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3);
    });

    it('should reject an empty membership list', async () => {
      await expect(
        service.signLibrarySelectionToken({ memberships: [] }),
      ).rejects.toThrow('At least one valid library membership is required');
    });
  });

  describe('verifyLibrarySelectionToken()', () => {
    it('should verify a valid selection token', async () => {
      const payload = {
        memberships: [
          {
            tenantId: '22222222-2222-4222-8222-222222222222',
            userId: '11111111-1111-4111-8111-111111111111',
          },
          {
            tenantId: '44444444-4444-4444-8444-444444444444',
            userId: '11111111-1111-4111-8111-111111111111',
          },
        ],
      };

      const token = await service.signLibrarySelectionToken(payload);

      const result = await service.verifyLibrarySelectionToken(token);

      expect(result).toEqual(payload);
    });

    it('should reject an invalid selection token', async () => {
      await expect(
        service.verifyLibrarySelectionToken('invalid.token.value'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
