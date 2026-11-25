import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  platformAuditLogs,
  platformUsers,
} from '../../database/schema.js';
import { PlatformMfaService } from './platform-mfa.service.js';
import { PlatformSessionService } from './platform-session.service.js';
import { PlatformTokenService } from './platform-token.service.js';
import type {
  PlatformLoginDto,
  PlatformMfaVerifyDto,
} from './dto/platform-auth.dto.js';

export interface PlatformLoginSuccessResult {
  mfaRequired: false;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'PLATFORM_SUPER_ADMIN';
  };
}

export interface PlatformLoginMfaPendingResult {
  mfaRequired: true;
  tempToken: string;
}

export type PlatformLoginResult =
  | PlatformLoginSuccessResult
  | PlatformLoginMfaPendingResult;

@Injectable()
export class PlatformAuthService {
  private readonly logger = new Logger(PlatformAuthService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly tokenService: PlatformTokenService,
    private readonly sessionService: PlatformSessionService,
    private readonly mfaService: PlatformMfaService,
  ) {}

  /**
   * Primary login method: validates credentials and determines if MFA challenge is needed.
   */
  async login(
    dto: PlatformLoginDto,
  ): Promise<PlatformLoginResult> {
    const email = dto.email.trim().toLowerCase();

    // 1. Fetch user by email
    const [user] = await this.database.db
      .select({
        id: platformUsers.id,
        email: platformUsers.email,
        fullName: platformUsers.fullName,
        passwordHash: platformUsers.passwordHash,
        status: platformUsers.status,
        mfaEnabled: platformUsers.mfaEnabled,
      })
      .from(platformUsers)
      .where(eq(platformUsers.email, email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Invalid platform credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Platform administrator account is suspended');
    }

    // 2. Verify password with Argon2id
    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid platform credentials');
    }

    // 3. Multi-factor authentication is mandatory for all Platform Super Admins (Approved Decision 2.5)
    if (!user.mfaEnabled) {
      throw new UnauthorizedException(
        'Multi-factor authentication (MFA) is mandatory for platform administration. Please complete setup via the bootstrap procedure.',
      );
    }

    const tempToken = await this.tokenService.signTempMfaToken({
      platformUserId: user.id,
      email: user.email,
      role: 'PLATFORM_SUPER_ADMIN',
      mfaPending: true,
    });

    return {
      mfaRequired: true,
      tempToken,
    };
  }

  /**
   * Completes the MFA challenge using either a 6-digit TOTP token or an emergency backup code.
   */
  async verifyMfa(
    dto: PlatformMfaVerifyDto,
    rawTempToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PlatformLoginSuccessResult> {
    const tempPayload = await this.tokenService.verifyTempMfaToken(rawTempToken);

    // Fetch full platform user record with encrypted secret and recovery hashes
    const [user] = await this.database.db
      .select({
        id: platformUsers.id,
        email: platformUsers.email,
        fullName: platformUsers.fullName,
        status: platformUsers.status,
        mfaSecretEncrypted: platformUsers.mfaSecretEncrypted,
        mfaRecoveryCodesHash: platformUsers.mfaRecoveryCodesHash,
      })
      .from(platformUsers)
      .where(eq(platformUsers.id, tempPayload.platformUserId))
      .limit(1);

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account not found or inactive');
    }

    // A. Emergency Backup Code Verification
    if (dto.isRecoveryCode) {
      const storedHashes = Array.isArray(user.mfaRecoveryCodesHash)
        ? (user.mfaRecoveryCodesHash as string[])
        : [];

      const matchIndex = await this.mfaService.verifyRecoveryCode(
        dto.code,
        storedHashes,
      );

      if (matchIndex === -1) {
        throw new UnauthorizedException('Invalid emergency backup code');
      }

      // Consume the code (remove from array)
      const remainingHashes = [...storedHashes];
      remainingHashes.splice(matchIndex, 1);

      await this.database.db
        .update(platformUsers)
        .set({
          mfaRecoveryCodesHash: remainingHashes,
          updatedAt: new Date(),
        })
        .where(eq(platformUsers.id, user.id));

      this.logger.warn(
        `Platform Super Admin ${user.email} logged in using an emergency recovery code. Remaining codes: ${remainingHashes.length}`,
      );
    } else {
      // B. Standard RFC 6238 TOTP Verification
      if (!user.mfaSecretEncrypted) {
        throw new UnauthorizedException('MFA is not configured for this account');
      }

      const secret = this.mfaService.decryptSecret(user.mfaSecretEncrypted);
      const isTotpValid = this.mfaService.verifyTotp(secret, dto.code);

      if (!isTotpValid) {
        throw new UnauthorizedException('Invalid 6-digit verification code');
      }
    }

    // Create session upon successful MFA verification
    const session = await this.sessionService.createSession(
      user.id,
      ipAddress,
      userAgent,
    );

    const accessToken = await this.tokenService.signPlatformAccessToken({
      platformUserId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: 'PLATFORM_SUPER_ADMIN',
      sessionId: session.sessionId,
      mfaVerified: true,
    });

    await this.recordLoginSuccess(user.id, user.email, ipAddress, userAgent);

    return {
      mfaRequired: false,
      accessToken,
      refreshToken: session.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: 'PLATFORM_SUPER_ADMIN',
      },
    };
  }

  /**
   * Refreshes a platform access token using a valid refresh token.
   */
  async refresh(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const outcome = await this.sessionService.refreshSession(
      refreshToken,
      ipAddress,
      userAgent,
    );

    const accessToken = await this.tokenService.signPlatformAccessToken({
      platformUserId: outcome.platformUserId,
      email: outcome.email,
      fullName: outcome.fullName,
      role: 'PLATFORM_SUPER_ADMIN',
      sessionId: outcome.newSessionId,
      mfaVerified: true,
    });

    return {
      accessToken,
      refreshToken: outcome.newRefreshToken,
    };
  }

  /**
   * Revokes the active platform session.
   */
  async logout(sessionId: string, platformUserId: string): Promise<void> {
    await this.sessionService.revokeSession(sessionId, platformUserId);

    await this.database.db.insert(platformAuditLogs).values({
      actorId: platformUserId,
      action: 'PLATFORM_LOGOUT',
      entityType: 'PLATFORM_SESSION',
      entityId: sessionId,
    });
  }

  /**
   * Returns authenticated Platform Super Admin profile.
   */
  async getMe(platformUserId: string) {
    const [user] = await this.database.db
      .select({
        id: platformUsers.id,
        email: platformUsers.email,
        fullName: platformUsers.fullName,
        status: platformUsers.status,
        mfaEnabled: platformUsers.mfaEnabled,
        lastLoginAt: platformUsers.lastLoginAt,
        createdAt: platformUsers.createdAt,
      })
      .from(platformUsers)
      .where(eq(platformUsers.id, platformUserId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Platform user not found');
    }

    return {
      ...user,
      role: 'PLATFORM_SUPER_ADMIN' as const,
    };
  }

  private async recordLoginSuccess(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.database.db
      .update(platformUsers)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(platformUsers.id, userId));

    await this.database.db.insert(platformAuditLogs).values({
      actorId: userId,
      action: 'PLATFORM_LOGIN_SUCCESS',
      entityType: 'PLATFORM_USER',
      entityId: userId,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      metadata: { email },
    });
  }
}
