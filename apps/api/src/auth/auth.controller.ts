import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { SelectMembershipDto } from './dto/select-membership.dto.js';
import { SessionService } from './session/session.service.js';
import { TokenService } from './token/token.service.js';
import { OtpService } from './otp/otp.service.js';
import { AUTH_RATE_LIMITS } from './constants/auth-rate-limit.constants.js';
import { RateLimit } from '../common/decorators/rate-limit.decorator.js';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { SessionIdParamDto } from './session/dto/session-id-param.dto.js';
import type { AccessTokenPayload } from './token/dto/access-token-payload.dto.js';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface.js';
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE_MS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_MS,
  SELECTION_COOKIE,
  SELECTION_COOKIE_MAX_AGE_MS,
} from './constants/auth.constants.js';

@Controller(['auth', 'api/auth'])
export class AuthController {
  private readonly cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };

  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
  ) {}

  @Post('login')
  @RateLimit(AUTH_RATE_LIMITS.login)
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const memberships = await this.authService.verifyCredentials(
      dto.type,
      dto.identifier,
      dto.password,
    );

    if (memberships.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (memberships.length > 1) {
      const selectionToken = await this.tokenService.signLibrarySelectionToken({
        memberships: memberships.map((membership) => ({
          tenantId: membership.tenantId,
          userId: membership.userId,
        })),
      });

      response.cookie(SELECTION_COOKIE, selectionToken, {
        ...this.cookieOptions,
        path: '/api/auth/select-membership',
        maxAge: SELECTION_COOKIE_MAX_AGE_MS,
      });

      return {
        requiresLibrarySelection: true,
        memberships: memberships.map((membership) => ({
          tenantId: membership.tenantId,
          tenantName: membership.tenantName,
          role: membership.role,
        })),
      };
    }

    const membership = memberships[0];

    if (!membership) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const session = await this.sessionService.createSession({
      userId: membership.userId,
      tenantId: membership.tenantId,
      role: membership.role,
      deviceName: userAgent?.slice(0, 200),
      mustChangePassword: membership.mustChangePassword,
    });

    this.setSessionCookies(response, session);

    response.clearCookie(SELECTION_COOKIE, {
      ...this.cookieOptions,
      path: '/api/auth/select-membership',
    });

    return {
      authenticated: true,
      user: {
        id: membership.userId,
        fullName: membership.fullName,
        role: membership.role,
        mustChangePassword: Boolean(membership.mustChangePassword),
      },
      library: {
        id: membership.tenantId,
        name: membership.tenantName,
      },
      session: {
        id: session.sessionId,
        expiresAt: session.expiresAt,
      },
    };
  }

  @Post('select-membership')
  @RateLimit(AUTH_RATE_LIMITS.selectMembership)
  async selectMembership(
    @Body() dto: SelectMembershipDto,
    @Req() request: Request,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const selectionToken = this.readCookie(
      request.headers.cookie,
      SELECTION_COOKIE,
    );

    if (!selectionToken) {
      throw new UnauthorizedException(
        'Library selection has expired. Please log in again.',
      );
    }

    const selection =
      await this.tokenService.verifyLibrarySelectionToken(selectionToken);

    const selectedMembership = selection.memberships.find(
      (membership) => membership.tenantId === dto.tenantId,
    );

    if (!selectedMembership) {
      throw new BadRequestException(
        'You do not have access to the selected library',
      );
    }

    const membership = await this.authService.getActiveMembership(
      selectedMembership.userId,
      selectedMembership.tenantId,
    );

    const session = await this.sessionService.createSession({
      userId: membership.userId,
      tenantId: membership.tenantId,
      role: membership.role,
      deviceName: userAgent?.slice(0, 200),
      mustChangePassword: membership.mustChangePassword,
    });

    this.setSessionCookies(response, session);

    response.clearCookie(SELECTION_COOKIE, {
      ...this.cookieOptions,
      path: '/api/auth/select-membership',
    });

    return {
      authenticated: true,
      user: {
        id: membership.userId,
        fullName: membership.fullName,
        role: membership.role,
        mustChangePassword: Boolean(membership.mustChangePassword),
      },
      library: {
        id: membership.tenantId,
        name: membership.tenantName,
      },
      session: {
        id: session.sessionId,
        expiresAt: session.expiresAt,
      },
    };
  }

  @Post('change-password')
  @UseGuards(AccessTokenGuard)
  @RateLimit(AUTH_RATE_LIMITS.changePassword)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { userId, tenantId, sessionId } = request.user;

    await this.authService.changePassword(
      tenantId,
      userId,
      dto.currentPassword,
      dto.newPassword,
    );

    // Revoke all other active sessions for this user after password change
    await this.sessionService.revokeAllUserSessionsExcept(
      tenantId,
      userId,
      sessionId,
    );

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @Post('forgot-password')
  @RateLimit(AUTH_RATE_LIMITS.forgotPassword)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.otpService.requestPasswordReset(
      dto.type,
      dto.identifier,
      dto.tenantId,
    );
  }

  @Post('reset-password')
  @RateLimit(AUTH_RATE_LIMITS.resetPassword)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.otpService.verifyAndResetPassword(
      dto.type,
      dto.identifier,
      dto.code,
      dto.newPassword,
      dto.tenantId,
    );
  }

  @Post('refresh')
  @RateLimit(AUTH_RATE_LIMITS.refresh)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.readCookie(
      request.headers.cookie,
      REFRESH_COOKIE,
    );

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = await this.sessionService.refreshSession(refreshToken);

    this.setSessionCookies(response, session);

    return {
      authenticated: true,
      session: {
        id: session.sessionId,
        expiresAt: session.expiresAt,
      },
    };
  }

  @Post('logout')
  @UseGuards(AccessTokenGuard)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { userId, tenantId, sessionId } = request.user;

    await this.sessionService.revokeSession(tenantId, userId, sessionId);

    response.clearCookie(ACCESS_COOKIE, {
      ...this.cookieOptions,
      path: '/',
    });

    response.clearCookie(REFRESH_COOKIE, {
      ...this.cookieOptions,
      path: '/api/auth',
    });

    response.clearCookie(SELECTION_COOKIE, {
      ...this.cookieOptions,
      path: '/api/auth/select-membership',
    });

    return { authenticated: false };
  }

  @Get('sessions')
  @UseGuards(AccessTokenGuard)
  async listSessions(@Req() request: AuthenticatedRequest) {
    const { userId, tenantId } = request.user;

    return this.sessionService.listSessions(tenantId, userId);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(AccessTokenGuard)
  async revokeSession(
    @Req() request: AuthenticatedRequest,
    @Param() params: SessionIdParamDto,
  ) {
    const { userId, tenantId } = request.user;

    await this.sessionService.revokeSession(tenantId, userId, params.sessionId);

    return { revoked: true };
  }

  private setSessionCookies(
    response: Response,
    session: {
      accessToken: string;
      refreshToken: string;
    },
  ): void {
    response.cookie(ACCESS_COOKIE, session.accessToken, {
      ...this.cookieOptions,
      path: '/',
      maxAge: ACCESS_COOKIE_MAX_AGE_MS,
    });

    response.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...this.cookieOptions,
      path: '/api/auth',
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
  }

  private readCookie(
    cookieHeader: string | undefined,
    cookieName: string,
  ): string | null {
    if (!cookieHeader) {
      return null;
    }

    for (const cookie of cookieHeader.split(';')) {
      const separatorIndex = cookie.indexOf('=');

      if (separatorIndex === -1) {
        continue;
      }

      const name = cookie.slice(0, separatorIndex).trim();

      if (name !== cookieName) {
        continue;
      }

      const value = cookie.slice(separatorIndex + 1).trim();

      try {
        return decodeURIComponent(value);
      } catch {
        return null;
      }
    }

    return null;
  }
}
