import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { AccessTokenPayload } from '../../auth/token/dto/access-token-payload.dto.js';
import { SessionService } from '../../auth/session/session.service.js';
import { TokenService } from '../../auth/token/token.service.js';
import {
  ACCESS_COOKIE,
  MUST_CHANGE_PASSWORD_ALLOWED_ENDPOINTS,
} from '../../auth/constants/auth.constants.js';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface.js';

/**
 * AUTH-1 / AUTH-2 / AUTH-5: Verifies the access JWT from the HttpOnly cookie,
 * confirms the session is still active in the database, and enforces the
 * mandatory first-login password change restriction (AUTH-4).
 *
 * On success, attaches the verified AccessTokenPayload to request.user.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { user?: AccessTokenPayload }>();

    const token = this.readAccessToken(request.headers.cookie);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.tokenService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const active = await this.sessionService.isSessionActive(
      payload.tenantId,
      payload.userId,
      payload.sessionId,
    );

    if (!active) {
      throw new UnauthorizedException('Session is no longer active');
    }

    // AUTH-4: Block routes when first-login password change is required.
    if (payload.mustChangePassword) {
      const rawPath = (request.originalUrl || request.url || '').split('?')[0];
      const isAllowed = MUST_CHANGE_PASSWORD_ALLOWED_ENDPOINTS.some(
        (allowed) => rawPath.endsWith(allowed) || rawPath.includes(allowed),
      );

      if (!isAllowed) {
        throw new ForbiddenException('Password change required on first login');
      }
    }

    request.user = payload;

    return true;
  }

  private readAccessToken(cookieHeader: string | undefined): string | null {
    if (!cookieHeader) {
      return null;
    }

    const prefix = `${ACCESS_COOKIE}=`;
    const cookie = cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));

    if (!cookie) {
      return null;
    }

    const value = cookie.slice(prefix.length);

    try {
      return decodeURIComponent(value) || null;
    } catch {
      return null;
    }
  }
}
