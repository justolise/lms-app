import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, desc, eq, gt, isNull, ne } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service.js';
import { sessions, users, tenants } from '../../database/schema.js';
import { TokenService } from '../token/token.service.js';
import type { AuthRole } from '../token/dto/access-token-payload.dto.js';
import { REFRESH_TOKEN_LIFETIME_MS } from '../token/token.constants.js';

import type {
  CreateSessionInput,
  CreatedSession,
  RefreshOutcome,
  SessionSummary,
} from './interfaces/session.interface.js';

const INVALID_REFRESH_TOKEN = 'Invalid or expired refresh token';

@Injectable()
export class SessionService {
  constructor(
    private readonly database: DatabaseService,
    private readonly tokenService: TokenService,
  ) {}

  async createSession(input: CreateSessionInput): Promise<CreatedSession> {
    const sessionId = randomUUID();
    const refreshToken = this.generateRefreshToken(input.tenantId);
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = this.getRefreshExpiry();

    const accessToken = await this.tokenService.signAccessToken({
      userId: input.userId,
      tenantId: input.tenantId,
      role: input.role,
      sessionId,
      mustChangePassword: input.mustChangePassword,
    });

    await this.database.withTenant(input.tenantId, async (tx) => {
      await tx.insert(sessions).values({
        id: sessionId,
        tenantId: input.tenantId,
        userId: input.userId,
        refreshTokenHash,
        expiresAt,
        deviceName: input.deviceName?.slice(0, 200) ?? null,
        lastUsedAt: new Date(),
      });
    });

    return {
      sessionId,
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  async refreshSession(refreshToken: string): Promise<CreatedSession> {
    const tenantId = this.getTenantIdFromRefreshToken(refreshToken);

    if (!tenantId) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const now = new Date();

    const outcome = await this.database.withTenant(
      tenantId,
      async (tx): Promise<RefreshOutcome> => {
        const rows = await tx
          .select({
            id: sessions.id,
            tenantId: sessions.tenantId,
            userId: sessions.userId,
            revokedAt: sessions.revokedAt,
            expiresAt: sessions.expiresAt,
            replacedBySessionId: sessions.replacedBySessionId,
            deviceName: sessions.deviceName,
          })
          .from(sessions)
          .where(
            and(
              eq(sessions.tenantId, tenantId),
              eq(sessions.refreshTokenHash, refreshTokenHash),
            ),
          )
          .limit(1)
          .for('update');

        const existing = rows[0];

        if (!existing) {
          return { status: 'invalid' };
        }

        if (existing.revokedAt) {
          if (existing.replacedBySessionId) {
            // Replay detected on previously rotated session:
            // Revoke all sessions belonging to this user to stop compromise.
            await tx
              .update(sessions)
              .set({ revokedAt: new Date() })
              .where(
                and(
                  eq(sessions.tenantId, tenantId),
                  eq(sessions.userId, existing.userId),
                  isNull(sessions.revokedAt),
                ),
              );

            return { status: 'replayed' };
          }

          return { status: 'invalid' };
        }

        if (existing.expiresAt.getTime() <= now.getTime()) {
          await tx
            .update(sessions)
            .set({ revokedAt: now })
            .where(
              and(
                eq(sessions.tenantId, tenantId),
                eq(sessions.id, existing.id),
                isNull(sessions.revokedAt),
              ),
            );

          return { status: 'expired' };
        }

        const userRows = await tx
          .select({
            role: users.role,
            status: users.status,
            mustChangePassword: users.mustChangePassword,
          })
          .from(users)
          .innerJoin(tenants, eq(tenants.id, users.tenantId))
          .where(
            and(
              eq(users.tenantId, tenantId),
              eq(users.id, existing.userId),
              eq(users.status, 'ACTIVE'),
              eq(tenants.status, 'ACTIVE'),
            ),
          )
          .limit(1);

        const user = userRows[0];

        if (!user) {
          return { status: 'invalid' };
        }

        const nextSessionId = randomUUID();
        const nextRefreshToken = this.generateRefreshToken(tenantId);
        const nextRefreshTokenHash = this.hashRefreshToken(nextRefreshToken);
        const nextExpiresAt = this.getRefreshExpiry();

        const accessToken = await this.tokenService.signAccessToken({
          userId: existing.userId,
          tenantId,
          role: user.role,
          sessionId: nextSessionId,
          mustChangePassword: user.mustChangePassword,
        });

        await tx.insert(sessions).values({
          id: nextSessionId,
          tenantId,
          userId: existing.userId,
          refreshTokenHash: nextRefreshTokenHash,
          expiresAt: nextExpiresAt,
          deviceName: existing.deviceName,
          lastUsedAt: new Date(),
        });

        await tx
          .update(sessions)
          .set({
            revokedAt: new Date(),
            replacedBySessionId: nextSessionId,
            lastUsedAt: new Date(),
          })
          .where(
            and(
              eq(sessions.tenantId, tenantId),
              eq(sessions.id, existing.id),
              isNull(sessions.revokedAt),
            ),
          );

        return {
          status: 'rotated',
          session: {
            sessionId: nextSessionId,
            accessToken,
            refreshToken: nextRefreshToken,
            expiresAt: nextExpiresAt,
          },
        };
      },
    );

    if (outcome.status !== 'rotated') {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    return outcome.session;
  }

  async listSessions(
    tenantId: string,
    userId: string,
  ): Promise<SessionSummary[]> {
    return this.database.withTenant(tenantId, async (tx) => {
      const rows = await tx
        .select({
          id: sessions.id,
          deviceName: sessions.deviceName,
          createdAt: sessions.createdAt,
          lastUsedAt: sessions.lastUsedAt,
          expiresAt: sessions.expiresAt,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.tenantId, tenantId),
            eq(sessions.userId, userId),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, new Date()),
          ),
        )
        .orderBy(desc(sessions.createdAt));

      return rows;
    });
  }

  async revokeSession(
    tenantId: string,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    await this.database.withTenant(tenantId, async (tx) => {
      const rows = await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(sessions.tenantId, tenantId),
            eq(sessions.userId, userId),
            eq(sessions.id, sessionId),
            isNull(sessions.revokedAt),
          ),
        )
        .returning({ id: sessions.id });

      if (rows.length === 0) {
        throw new NotFoundException('Session not found');
      }
    });
  }

  async revokeAllUserSessions(
    tenantId: string,
    userId: string,
  ): Promise<void> {
    await this.database.withTenant(tenantId, async (tx) => {
      await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(sessions.tenantId, tenantId),
            eq(sessions.userId, userId),
            isNull(sessions.revokedAt),
          ),
        );
    });
  }

  async revokeAllUserSessionsExcept(
    tenantId: string,
    userId: string,
    excludeSessionId: string,
  ): Promise<void> {
    await this.database.withTenant(tenantId, async (tx) => {
      await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(sessions.tenantId, tenantId),
            eq(sessions.userId, userId),
            ne(sessions.id, excludeSessionId),
            isNull(sessions.revokedAt),
          ),
        );
    });
  }

  async isSessionActive(
    tenantId: string,
    userId: string,
    sessionId: string,
  ): Promise<boolean> {
    return this.database.withTenant(tenantId, async (tx) => {
      const rows = await tx
        .select({ id: sessions.id })
        .from(sessions)
        .innerJoin(
          users,
          and(
            eq(users.id, sessions.userId),
            eq(users.tenantId, sessions.tenantId),
          ),
        )
        .where(
          and(
            eq(sessions.tenantId, tenantId),
            eq(sessions.userId, userId),
            eq(sessions.id, sessionId),
            eq(users.status, 'ACTIVE'),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, new Date()),
          ),
        )
        .limit(1);

      return rows.length > 0;
    });
  }

  private generateRefreshToken(tenantId: string): string {
    return `${tenantId}.${randomBytes(32).toString('base64url')}`;
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private getRefreshExpiry(): Date {
    return new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS);
  }

  private getTenantIdFromRefreshToken(refreshToken: string): string | null {
    const tenantId = refreshToken.split('.', 1)[0];

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    return tenantId && uuidPattern.test(tenantId) ? tenantId : null;
  }
}
