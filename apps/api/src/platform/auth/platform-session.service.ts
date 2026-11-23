import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  platformSessions,
  platformUsers,
} from '../../database/schema.js';
import { PLATFORM_REFRESH_TOKEN_LIFETIME_MS } from './constants/platform-auth.constants.js';

export interface CreatedPlatformSession {
  sessionId: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface PlatformRefreshOutcome {
  newSessionId: string;
  newRefreshToken: string;
  platformUserId: string;
  email: string;
  fullName: string;
}

@Injectable()
export class PlatformSessionService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Generates a random refresh token string: 'platform.<base64url>'
   */
  private generateRefreshToken(): string {
    return `platform.${randomBytes(32).toString('base64url')}`;
  }

  /**
   * Hashes the refresh token with SHA-256 for persistent database storage.
   */
  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Creates a stateful platform session record.
   */
  async createSession(
    platformUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<CreatedPlatformSession> {
    const sessionId = randomUUID();
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + PLATFORM_REFRESH_TOKEN_LIFETIME_MS);

    await this.database.db.insert(platformSessions).values({
      id: sessionId,
      platformUserId,
      refreshTokenHash,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      expiresAt,
    });

    return { sessionId, refreshToken, expiresAt };
  }

  /**
   * Rotates a platform refresh token, detecting reuse and invalidating sessions if compromised.
   */
  async refreshSession(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PlatformRefreshOutcome> {
    if (!refreshToken || !refreshToken.startsWith('platform.')) {
      throw new UnauthorizedException('Invalid or expired platform refresh token');
    }

    const tokenHash = this.hashRefreshToken(refreshToken);
    const now = new Date();

    // 1. Look up the session by refresh token hash
    const [sessionRecord] = await this.database.db
      .select({
        id: platformSessions.id,
        platformUserId: platformSessions.platformUserId,
        expiresAt: platformSessions.expiresAt,
        revokedAt: platformSessions.revokedAt,
        replacedBySessionId: platformSessions.replacedBySessionId,
      })
      .from(platformSessions)
      .where(eq(platformSessions.refreshTokenHash, tokenHash))
      .limit(1);

    if (!sessionRecord) {
      throw new UnauthorizedException('Invalid or expired platform refresh token');
    }

    // 2. Token Reuse Detection: If token is already revoked or replaced, revoke all sessions
    if (sessionRecord.revokedAt || sessionRecord.replacedBySessionId) {
      await this.revokeAllUserSessions(sessionRecord.platformUserId);
      throw new UnauthorizedException(
        'Session revocation triggered due to suspected token reuse',
      );
    }

    // 3. Expiry check
    if (sessionRecord.expiresAt <= now) {
      throw new UnauthorizedException('Platform refresh token has expired');
    }

    // 4. Fetch the platform user profile
    const [user] = await this.database.db
      .select({
        id: platformUsers.id,
        email: platformUsers.email,
        fullName: platformUsers.fullName,
        status: platformUsers.status,
      })
      .from(platformUsers)
      .where(eq(platformUsers.id, sessionRecord.platformUserId))
      .limit(1);

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Platform administrator account is suspended or invalid');
    }

    // 5. Rotate session: create new session and link replacedBySessionId
    const newSession = await this.createSession(
      user.id,
      ipAddress,
      userAgent,
    );

    await this.database.db
      .update(platformSessions)
      .set({
        revokedAt: now,
        replacedBySessionId: newSession.sessionId,
      })
      .where(eq(platformSessions.id, sessionRecord.id));

    return {
      newSessionId: newSession.sessionId,
      newRefreshToken: newSession.refreshToken,
      platformUserId: user.id,
      email: user.email,
      fullName: user.fullName,
    };
  }

  /**
   * Revokes a specific platform session (logout).
   */
  async revokeSession(sessionId: string, platformUserId?: string): Promise<void> {
    const conditions = platformUserId
      ? and(
          eq(platformSessions.id, sessionId),
          eq(platformSessions.platformUserId, platformUserId),
          isNull(platformSessions.revokedAt),
        )
      : and(
          eq(platformSessions.id, sessionId),
          isNull(platformSessions.revokedAt),
        );

    await this.database.db
      .update(platformSessions)
      .set({ revokedAt: new Date() })
      .where(conditions);
  }

  /**
   * Revokes all active sessions for a given platform user.
   */
  async revokeAllUserSessions(platformUserId: string): Promise<void> {
    await this.database.db
      .update(platformSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(platformSessions.platformUserId, platformUserId),
          isNull(platformSessions.revokedAt),
        ),
      );
  }

  /**
   * Lists active sessions for a platform user.
   */
  async listUserSessions(platformUserId: string) {
    const now = new Date();
    return this.database.db
      .select({
        id: platformSessions.id,
        ipAddress: platformSessions.ipAddress,
        userAgent: platformSessions.userAgent,
        createdAt: platformSessions.createdAt,
        expiresAt: platformSessions.expiresAt,
      })
      .from(platformSessions)
      .where(
        and(
          eq(platformSessions.platformUserId, platformUserId),
          isNull(platformSessions.revokedAt),
          gt(platformSessions.expiresAt, now),
        ),
      )
      .orderBy(desc(platformSessions.createdAt));
  }
}
