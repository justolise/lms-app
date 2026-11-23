import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { SessionService } from '../src/auth/session/session.service.js';
import { TokenService } from '../src/auth/token/token.service.js';
import { OtpService } from '../src/auth/otp/otp.service.js';
import { RateLimitGuard } from '../src/common/guards/rate-limit.guard.js';
import { AccessTokenGuard } from '../src/common/guards/access-token.guard.js';

describe('AuthController (e2e) — AUTH-1 / AUTH-5', () => {
  let app: INestApplication<App>;

  const membership = {
    userId: '11111111-1111-4111-8111-111111111111',
    tenantId: '22222222-2222-4222-8222-222222222222',
    tenantName: 'Test Library',
    fullName: 'Test Member',
    role: 'MEMBER' as const,
  };

  const secondMembership = {
    ...membership,
    tenantId: '33333333-3333-4333-8333-333333333333',
    tenantName: 'Second Library',
  };

  const authServiceMock = {
    verifyCredentials: vi.fn(),
    getActiveMembership: vi.fn(),
    changePassword: vi.fn(),
  };

  const sessionServiceMock = {
    createSession: vi.fn(),
    refreshSession: vi.fn(),
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllUserSessionsExcept: vi.fn(),
  };

  const otpServiceMock = {
    requestPasswordReset: vi.fn(),
    verifyAndResetPassword: vi.fn(),
  };

  const selectionClaims = {
    memberships: [
      {
        userId: membership.userId,
        tenantId: membership.tenantId,
      },
      {
        userId: secondMembership.userId,
        tenantId: secondMembership.tenantId,
      },
    ],
  };

  const tokenServiceMock = new Proxy(
    {},
    {
      get: (_target, property) => {
        // Prevent NestJS from treating this mock as a Promise.
        if (property === 'then' || typeof property === 'symbol') {
          return undefined;
        }

        if (property === 'verifyLibrarySelectionToken') {
          return vi.fn().mockReturnValue(selectionClaims);
        }

        return vi.fn().mockReturnValue('selection-token');
      },
    },
  );

  const mockSession = {
    sessionId: '44444444-4444-4444-8444-444444444444',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    authServiceMock.verifyCredentials.mockResolvedValue([membership]);
    authServiceMock.getActiveMembership.mockResolvedValue(membership);

    sessionServiceMock.createSession.mockResolvedValue(mockSession);
    sessionServiceMock.refreshSession.mockResolvedValue(mockSession);
    sessionServiceMock.listSessions.mockResolvedValue([]);
    sessionServiceMock.revokeSession.mockResolvedValue(undefined);

    const moduleBuilder = Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
          provide: SessionService,
          useValue: sessionServiceMock,
        },
        {
          provide: TokenService,
          useValue: tokenServiceMock,
        },
        {
          provide: OtpService,
          useValue: otpServiceMock,
        },
      ],
    });

    const moduleFixture = await moduleBuilder
      .overrideGuard(AccessTokenGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();

          request.user = {
            userId: 'user-1',
            tenantId: 'tenant-1',
            sessionId: 'session-1',
          };

          return true;
        },
      })
      .overrideGuard(RateLimitGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /auth/login', () => {
    it('AUTH-1: logs in a user with one library membership', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          type: 'EMAIL',
          identifier: 'member@example.com',
          password: 'ValidPassword123!',
        })
        .expect(201);

      expect(authServiceMock.verifyCredentials).toHaveBeenCalledWith(
        'EMAIL',
        'member@example.com',
        'ValidPassword123!',
      );

      expect(sessionServiceMock.createSession).toHaveBeenCalled();

      const cookies = response.headers['set-cookie'] as unknown as string[];

      expect(cookies.some((cookie) => cookie.startsWith('access_token='))).toBe(
        true,
      );

      expect(
        cookies.some((cookie) => cookie.startsWith('refresh_token=')),
      ).toBe(true);
    });

    it('AUTH-1: requests library selection when a user has multiple memberships', async () => {
      authServiceMock.verifyCredentials.mockResolvedValue([
        membership,
        secondMembership,
      ]);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          type: 'EMAIL',
          identifier: 'member@example.com',
          password: 'ValidPassword123!',
        })
        .expect(201);

      expect(response.body.memberships).toHaveLength(2);

      expect(sessionServiceMock.createSession).not.toHaveBeenCalled();

      const cookies = response.headers['set-cookie'] as unknown as string[];

      expect(
        cookies.some((cookie) => cookie.startsWith('library_selection_token=')),
      ).toBe(true);
    });

    it('AUTH-1: rejects invalid login input', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          type: 'EMAIL',
          password: 'ValidPassword123!',
        })
        .expect(400);

      expect(authServiceMock.verifyCredentials).not.toHaveBeenCalled();
    });

    it('AUTH-1: rejects unexpected login fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          type: 'EMAIL',
          identifier: 'member@example.com',
          password: 'ValidPassword123!',
          role: 'ADMIN',
        })
        .expect(400);

      expect(authServiceMock.verifyCredentials).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/refresh', () => {
    it('AUTH-1: refreshes a session using a valid refresh cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=test-refresh-token')
        .expect(201);

      expect(sessionServiceMock.refreshSession).toHaveBeenCalledWith(
        'test-refresh-token',
      );

      expect(response.body).toMatchObject({
        authenticated: true,
        session: {
          id: mockSession.sessionId,
        },
      });

      const cookies = response.headers['set-cookie'] as unknown as string[];

      const accessCookie = cookies.find((cookie) =>
        cookie.startsWith('access_token='),
      );

      const refreshCookie = cookies.find((cookie) =>
        cookie.startsWith('refresh_token='),
      );

      expect(accessCookie).toContain('Path=/;');
      expect(accessCookie).toContain('HttpOnly');

      expect(refreshCookie).toContain('Path=/auth;');
      expect(refreshCookie).toContain('HttpOnly');
    });

    it('AUTH-1: rejects a refresh request without a refresh cookie', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);

      expect(sessionServiceMock.refreshSession).not.toHaveBeenCalled();
    });

    it('AUTH-1: rejects an invalid or expired refresh token', async () => {
      sessionServiceMock.refreshSession.mockRejectedValue(
        new UnauthorizedException('Invalid or expired refresh token'),
      );

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=invalid-refresh-token')
        .expect(401);

      expect(sessionServiceMock.refreshSession).toHaveBeenCalledWith(
        'invalid-refresh-token',
      );
    });
  });

  describe('POST /auth/select-membership', () => {
    it('AUTH-1: completes login for a selected library', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/select-membership')
        .set('Cookie', 'library_selection_token=selection-token')
        .send({
          tenantId: membership.tenantId,
        })
        .expect(201);

      expect(authServiceMock.getActiveMembership).toHaveBeenCalledWith(
        membership.userId,
        membership.tenantId,
      );

      expect(sessionServiceMock.createSession).toHaveBeenCalled();

      const cookies = response.headers['set-cookie'] as unknown as string[];

      expect(cookies.some((cookie) => cookie.startsWith('access_token='))).toBe(
        true,
      );

      expect(
        cookies.some((cookie) => cookie.startsWith('refresh_token=')),
      ).toBe(true);
    });

    it('AUTH-1: rejects a library that is not in the selection token', async () => {
      await request(app.getHttpServer())
        .post('/auth/select-membership')
        .set('Cookie', 'library_selection_token=selection-token')
        .send({
          tenantId: '55555555-5555-4555-8555-555555555555',
        })
        .expect(400);

      expect(authServiceMock.getActiveMembership).not.toHaveBeenCalled();
      expect(sessionServiceMock.createSession).not.toHaveBeenCalled();
    });

    it('AUTH-1: rejects a request without a selection token', async () => {
      await request(app.getHttpServer())
        .post('/auth/select-membership')
        .send({
          tenantId: membership.tenantId,
        })
        .expect(401);

      expect(authServiceMock.getActiveMembership).not.toHaveBeenCalled();
    });

    it('AUTH-1: rejects an invalid tenant ID', async () => {
      await request(app.getHttpServer())
        .post('/auth/select-membership')
        .set('Cookie', 'library_selection_token=selection-token')
        .send({
          tenantId: 'not-a-uuid',
        })
        .expect(400);
    });
  });

  describe('AUTH-1 / AUTH-5: session management', () => {
    it('POST /auth/logout revokes the current session and clears auth cookies', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(201)
        .expect({ authenticated: false });

      expect(sessionServiceMock.revokeSession).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'session-1',
      );

      const cookies = response.headers['set-cookie'] ?? [];

      expect(cookies).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^access_token=;/),
          expect.stringMatching(/^refresh_token=;/),
          expect.stringMatching(/^library_selection_token=;/),
        ]),
      );
    });

    it('GET /auth/sessions lists only the authenticated user sessions', async () => {
      const sessions = [
        {
          id: 'session-1',
          deviceName: 'Test browser',
        },
      ];

      sessionServiceMock.listSessions.mockResolvedValue(sessions);

      await request(app.getHttpServer())
        .get('/auth/sessions')
        .expect(200)
        .expect(sessions);

      expect(sessionServiceMock.listSessions).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
      );
    });

    it('DELETE /auth/sessions/:sessionId revokes the requested session', async () => {
      const sessionId = '11111111-1111-4111-8111-111111111111';

      await request(app.getHttpServer())
        .delete(`/auth/sessions/${sessionId}`)
        .expect(200)
        .expect({ revoked: true });

      expect(sessionServiceMock.revokeSession).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        sessionId,
      );
    });

    it('DELETE /auth/sessions/:sessionId rejects an invalid UUID', async () => {
      await request(app.getHttpServer())
        .delete('/auth/sessions/not-a-uuid')
        .expect(400);

      expect(sessionServiceMock.revokeSession).not.toHaveBeenCalled();
    });

    it('POST /auth/change-password changes password and revokes other sessions', async () => {
      authServiceMock.changePassword = vi.fn().mockResolvedValue(undefined);
      sessionServiceMock.revokeAllUserSessionsExcept = vi.fn().mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post('/auth/change-password')
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        })
        .expect(201)
        .expect({
          success: true,
          message: 'Password changed successfully',
        });

      expect(authServiceMock.changePassword).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'OldPassword123!',
        'NewPassword123!',
      );
      expect(sessionServiceMock.revokeAllUserSessionsExcept).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'session-1',
      );
    });

    it('POST /auth/forgot-password requests OTP password reset', async () => {
      otpServiceMock.requestPasswordReset.mockResolvedValue({
        message: 'If an account exists, a reset code has been sent.',
      });

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          type: 'EMAIL',
          identifier: 'user@example.com',
        })
        .expect(201)
        .expect({
          message: 'If an account exists, a reset code has been sent.',
        });

      expect(otpServiceMock.requestPasswordReset).toHaveBeenCalledWith(
        'EMAIL',
        'user@example.com',
        undefined,
      );
    });

    it('POST /auth/reset-password verifies OTP and resets password', async () => {
      otpServiceMock.verifyAndResetPassword.mockResolvedValue({
        success: true,
        message: 'Password has been reset successfully',
      });

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          type: 'EMAIL',
          identifier: 'user@example.com',
          code: '123456',
          newPassword: 'BrandNewPassword123!',
        })
        .expect(201)
        .expect({
          success: true,
          message: 'Password has been reset successfully',
        });

      expect(otpServiceMock.verifyAndResetPassword).toHaveBeenCalledWith(
        'EMAIL',
        'user@example.com',
        '123456',
        'BrandNewPassword123!',
        undefined,
      );
    });
  });
});

