import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PlatformAuthService } from './platform-auth.service.js';
import { PlatformSessionService } from './platform-session.service.js';
import {
  PlatformLoginDto,
  PlatformMfaVerifyDto,
  type PlatformAccessTokenPayload,
} from './dto/platform-auth.dto.js';
import {
  PLATFORM_ACCESS_COOKIE,
  PLATFORM_ACCESS_COOKIE_MAX_AGE_MS,
  PLATFORM_REFRESH_COOKIE,
  PLATFORM_REFRESH_COOKIE_MAX_AGE_MS,
  PLATFORM_TEMP_COOKIE,
  PLATFORM_TEMP_COOKIE_MAX_AGE_MS,
} from './constants/platform-auth.constants.js';
import { PlatformAuthGuard } from '../guards/platform-auth.guard.js';
import { CurrentPlatformUser } from '../decorators/current-platform-user.decorator.js';

@Controller(['platform/auth', 'api/platform/auth'])
export class PlatformAuthController {
  private readonly cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };

  constructor(
    private readonly authService: PlatformAuthService,
    private readonly sessionService: PlatformSessionService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: PlatformLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);

    if (result.mfaRequired) {
      response.cookie(PLATFORM_TEMP_COOKIE, result.tempToken, {
        ...this.cookieOptions,
        path: '/',
        maxAge: PLATFORM_TEMP_COOKIE_MAX_AGE_MS,
      });

      return {
        mfaRequired: true,
        message: 'Multi-factor authentication required',
        tempToken: result.tempToken,
      };
    }

    this.setPlatformCookies(response, result.accessToken, result.refreshToken);

    return {
      mfaRequired: false,
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMfa(
    @Body() dto: PlatformMfaVerifyDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Headers('user-agent') userAgent?: string,
  ) {
    const tempToken =
      dto.tempToken ||
      this.readCookie(request.headers.cookie, PLATFORM_TEMP_COOKIE);

    if (!tempToken) {
      throw new UnauthorizedException('MFA session expired or missing');
    }

    const ipAddress = request.ip || '127.0.0.1';
    const result = await this.authService.verifyMfa(
      dto,
      tempToken,
      ipAddress,
      userAgent,
    );

    // Clear temp MFA cookie and set platform session cookies
    response.clearCookie(PLATFORM_TEMP_COOKIE, { path: '/' });
    this.setPlatformCookies(response, result.accessToken, result.refreshToken);

    return {
      success: true,
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body('refreshToken') bodyRefreshToken?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const refreshToken =
      bodyRefreshToken ||
      this.readCookie(request.headers.cookie, PLATFORM_REFRESH_COOKIE);

    if (!refreshToken) {
      throw new UnauthorizedException('Platform refresh token missing');
    }

    const ipAddress = request.ip || '127.0.0.1';
    const tokens = await this.authService.refresh(
      refreshToken,
      ipAddress,
      userAgent,
    );

    this.setPlatformCookies(response, tokens.accessToken, tokens.refreshToken);

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  @Post('logout')
  @UseGuards(PlatformAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentPlatformUser() user: PlatformAccessTokenPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user.sessionId, user.platformUserId);

    response.clearCookie(PLATFORM_ACCESS_COOKIE, { path: '/' });
    response.clearCookie(PLATFORM_REFRESH_COOKIE, { path: '/' });
    response.clearCookie(PLATFORM_TEMP_COOKIE, { path: '/' });

    return { success: true, message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(PlatformAuthGuard)
  async getMe(@CurrentPlatformUser() user: PlatformAccessTokenPayload) {
    return this.authService.getMe(user.platformUserId);
  }

  @Get('sessions')
  @UseGuards(PlatformAuthGuard)
  async getSessions(@CurrentPlatformUser() user: PlatformAccessTokenPayload) {
    return this.sessionService.listUserSessions(user.platformUserId);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(PlatformAuthGuard)
  async revokeSession(
    @Param('sessionId') sessionId: string,
    @CurrentPlatformUser() user: PlatformAccessTokenPayload,
  ) {
    if (!sessionId) {
      throw new BadRequestException('Session ID is required');
    }
    await this.sessionService.revokeSession(sessionId, user.platformUserId);
    return { success: true, message: 'Session revoked' };
  }

  private setPlatformCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    response.cookie(PLATFORM_ACCESS_COOKIE, accessToken, {
      ...this.cookieOptions,
      path: '/',
      maxAge: PLATFORM_ACCESS_COOKIE_MAX_AGE_MS,
    });

    response.cookie(PLATFORM_REFRESH_COOKIE, refreshToken, {
      ...this.cookieOptions,
      path: '/',
      maxAge: PLATFORM_REFRESH_COOKIE_MAX_AGE_MS,
    });
  }

  private readCookie(cookieHeader: string | undefined, name: string): string | null {
    if (!cookieHeader) return null;
    const prefix = `${name}=`;
    const cookie = cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));

    if (!cookie) return null;
    const value = cookie.slice(prefix.length);
    try {
      return decodeURIComponent(value) || null;
    } catch {
      return value || null;
    }
  }
}
