import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PlatformTokenService } from '../auth/platform-token.service.js';
import { PLATFORM_ACCESS_COOKIE } from '../auth/constants/platform-auth.constants.js';
import type { PlatformAccessTokenPayload } from '../auth/dto/platform-auth.dto.js';

export interface AuthenticatedPlatformRequest extends Request {
  platformUser: PlatformAccessTokenPayload;
}

@Injectable()
export class PlatformAuthGuard implements CanActivate {
  constructor(private readonly tokenService: PlatformTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedPlatformRequest>();

    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Platform authentication required');
    }

    try {
      const payload = await this.tokenService.verifyPlatformAccessToken(token);

      if (payload.role !== 'PLATFORM_SUPER_ADMIN' || !payload.mfaVerified) {
        throw new UnauthorizedException('Unauthorized platform access');
      }

      request.platformUser = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired platform session');
    }
  }

  private extractToken(request: Request): string | null {
    // 1. Check HttpOnly cookie
    if (request.cookies && request.cookies[PLATFORM_ACCESS_COOKIE]) {
      return request.cookies[PLATFORM_ACCESS_COOKIE];
    }

    // 2. Fallback to Bearer token in Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 3. Fallback: Parse raw cookie header if cookies object is not parsed
    const rawCookie = request.headers.cookie;
    if (rawCookie) {
      const match = rawCookie
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${PLATFORM_ACCESS_COOKIE}=`));

      if (match) {
        return decodeURIComponent(match.split('=')[1]);
      }
    }

    return null;
  }
}
