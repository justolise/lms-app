import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionService } from './session/session.service.js';
import { TokenService } from './token/token.service.js';
import { OtpService } from './otp/otp.service.js';

describe('AuthController', () => {
  const membership = {
    userId: '11111111-1111-4111-8111-111111111111',
    tenantId: '22222222-2222-4222-8222-222222222222',
    tenantName: 'Central Library',
    fullName: 'Jane Member',
    role: 'MEMBER' as const,
  };

  const session = {
    sessionId: '33333333-3333-4333-8333-333333333333',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt: new Date('2026-11-28T00:00:00.000Z'),
  };

  const authService = {
    verifyCredentials: vi.fn(),
    getActiveMembership: vi.fn(),
    changePassword: vi.fn(),
  };

  const sessionService = {
    createSession: vi.fn(),
    refreshSession: vi.fn(),
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllUserSessionsExcept: vi.fn(),
  };

  const tokenService = {
    signLibrarySelectionToken: vi.fn(),
    verifyLibrarySelectionToken: vi.fn(),
  };

  const otpService = {
    requestPasswordReset: vi.fn(),
    verifyAndResetPassword: vi.fn(),
  };

  let controller: AuthController;

  let response: {
    cookie: ReturnType<typeof vi.fn>;
    clearCookie: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new AuthController(
      authService as unknown as AuthService,
      sessionService as unknown as SessionService,
      tokenService as unknown as TokenService,
      otpService as unknown as OtpService,
    );

    response = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    };

    sessionService.createSession.mockResolvedValue(session);
  });

  describe('login', () => {
    it('creates a session when the user has one library membership', async () => {
      authService.verifyCredentials.mockResolvedValue([membership]);

      const result = await controller.login(
        {
          type: 'EMAIL',
          identifier: 'jane@example.com',
          password: 'password123',
        },
        'Test Browser',
        response as unknown as Response,
      );

      expect(authService.verifyCredentials).toHaveBeenCalledWith(
        'EMAIL',
        'jane@example.com',
        'password123',
      );

      expect(sessionService.createSession).toHaveBeenCalledWith({
        userId: membership.userId,
        tenantId: membership.tenantId,
        role: membership.role,
        deviceName: 'Test Browser',
      });

      expect(response.cookie).toHaveBeenCalledTimes(2);
      expect(response.clearCookie).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        authenticated: true,
        user: {
          id: membership.userId,
          fullName: membership.fullName,
          role: membership.role,
        },
        library: {
          id: membership.tenantId,
          name: membership.tenantName,
        },
      });
    });

    it('requires library selection when the user has multiple memberships', async () => {
      const secondMembership = {
        ...membership,
        tenantId: '44444444-4444-4444-8444-444444444444',
        tenantName: 'Westlands Library',
      };

      authService.verifyCredentials.mockResolvedValue([
        membership,
        secondMembership,
      ]);

      tokenService.signLibrarySelectionToken.mockResolvedValue(
        'selection-token',
      );

      const result = await controller.login(
        {
          type: 'EMAIL',
          identifier: 'jane@example.com',
          password: 'password123',
        },
        'Test Browser',
        response as unknown as Response,
      );

      expect(tokenService.signLibrarySelectionToken).toHaveBeenCalledWith({
        memberships: [
          {
            tenantId: membership.tenantId,
            userId: membership.userId,
          },
          {
            tenantId: secondMembership.tenantId,
            userId: secondMembership.userId,
          },
        ],
      });

      expect(sessionService.createSession).not.toHaveBeenCalled();

      expect(response.cookie).toHaveBeenCalledWith(
        'library_selection_token',
        'selection-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/api/auth/select-membership',
        }),
      );

      expect(result).toMatchObject({
        requiresLibrarySelection: true,
        memberships: [
          {
            tenantId: membership.tenantId,
            tenantName: membership.tenantName,
            role: membership.role,
          },
          {
            tenantId: secondMembership.tenantId,
            tenantName: secondMembership.tenantName,
            role: secondMembership.role,
          },
        ],
      });
    });

    it('does not create a session when credential verification fails', async () => {
      authService.verifyCredentials.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(
        controller.login(
          {
            type: 'EMAIL',
            identifier: 'jane@example.com',
            password: 'wrong-password',
          },
          undefined,
          response as unknown as Response,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(sessionService.createSession).not.toHaveBeenCalled();
    });
  });

  describe('selectMembership', () => {
    const request = {
      headers: {
        cookie: 'library_selection_token=selection-token',
      },
    } as unknown as Request;

    it('creates a session for a verified library membership', async () => {
      tokenService.verifyLibrarySelectionToken.mockResolvedValue({
        memberships: [
          {
            tenantId: membership.tenantId,
            userId: membership.userId,
          },
        ],
      });

      authService.getActiveMembership.mockResolvedValue(membership);

      const result = await controller.selectMembership(
        { tenantId: membership.tenantId },
        request,
        'Test Browser',
        response as unknown as Response,
      );

      expect(authService.getActiveMembership).toHaveBeenCalledWith(
        membership.userId,
        membership.tenantId,
      );

      expect(sessionService.createSession).toHaveBeenCalledWith({
        userId: membership.userId,
        tenantId: membership.tenantId,
        role: membership.role,
        deviceName: 'Test Browser',
      });

      expect(response.cookie).toHaveBeenCalledTimes(2);
      expect(response.clearCookie).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        authenticated: true,
        library: {
          id: membership.tenantId,
          name: membership.tenantName,
        },
      });
    });

    it('rejects a library not included in the selection token', async () => {
      tokenService.verifyLibrarySelectionToken.mockResolvedValue({
        memberships: [
          {
            tenantId: membership.tenantId,
            userId: membership.userId,
          },
        ],
      });

      await expect(
        controller.selectMembership(
          { tenantId: '55555555-5555-4555-8555-555555555555' },
          request,
          undefined,
          response as unknown as Response,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(authService.getActiveMembership).not.toHaveBeenCalled();
      expect(sessionService.createSession).not.toHaveBeenCalled();
    });

    it('rejects an expired or invalid selection token', async () => {
      tokenService.verifyLibrarySelectionToken.mockRejectedValue(
        new UnauthorizedException('Invalid or expired library selection token'),
      );

      await expect(
        controller.selectMembership(
          { tenantId: membership.tenantId },
          request,
          undefined,
          response as unknown as Response,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(sessionService.createSession).not.toHaveBeenCalled();
    });

    it('rejects a request without a selection cookie', async () => {
      const requestWithoutCookie = {
        headers: {},
      } as unknown as Request;

      await expect(
        controller.selectMembership(
          { tenantId: membership.tenantId },
          requestWithoutCookie,
          undefined,
          response as unknown as Response,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(tokenService.verifyLibrarySelectionToken).not.toHaveBeenCalled();
    });
  });
});
