import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { and, desc, eq, gt, isNull, lt } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service.js';
import { auditLogs, otpCodes, users } from '../../database/schema.js';
import { IdentityLookupService } from '../identity/identity-lookup.service.js';
import type { IdentityType } from '../identity/identity.service.js';
import { IdentityService } from '../identity/identity.service.js';
import { PasswordService } from '../password/password.service.js';
import { SessionService } from '../session/session.service.js';

export const OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_OTP_ATTEMPTS = 5;

export interface DeliveredOtp {
  channel: 'EMAIL' | 'SMS';
  recipient: string;
  code: string;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private testDeliveryHandler?: (delivery: DeliveredOtp) => void;

  constructor(
    private readonly database: DatabaseService,
    private readonly identity: IdentityService,
    private readonly identityLookup: IdentityLookupService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
  ) {}

  setTestDeliveryHandler(handler: (delivery: DeliveredOtp) => void): void {
    this.testDeliveryHandler = handler;
  }

  async requestPasswordReset(
    type: IdentityType,
    rawIdentifier: string,
    tenantId?: string,
  ): Promise<{ message: string }> {
    const genericResponse = {
      message: 'If an account exists, a reset code has been sent.',
    };

    let normalizedIdentifier: string;
    try {
      normalizedIdentifier =
        type === 'EMAIL'
          ? this.identity.normalizeEmail(rawIdentifier)
          : this.identity.normalizePhone(rawIdentifier);
    } catch {
      // Return generic response even for malformed inputs to avoid enumeration
      return genericResponse;
    }

    const candidates = await this.identityLookup.findIdentity(
      type,
      normalizedIdentifier,
    );

    if (candidates.length === 0) {
      return genericResponse;
    }

    const filtered = tenantId
      ? candidates.filter((c) => c.tenantId === tenantId)
      : candidates;

    if (filtered.length === 0) {
      return genericResponse;
    }

    // Process delivery for the matched candidate(s)
    for (const candidate of filtered) {
      const code = randomInt(100000, 1000000).toString();
      const codeHash = await this.passwordService.hash(code);
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
      const channel = type === 'EMAIL' ? 'EMAIL' : 'SMS';

      await this.database.withTenant(candidate.tenantId, async (tx) => {
        // Invalidate any previous unconsumed password reset OTPs for this user
        await tx
          .update(otpCodes)
          .set({ consumedAt: new Date() })
          .where(
            and(
              eq(otpCodes.tenantId, candidate.tenantId),
              eq(otpCodes.userId, candidate.userId),
              eq(otpCodes.purpose, 'PASSWORD_RESET'),
              isNull(otpCodes.consumedAt),
            ),
          );

        await tx.insert(otpCodes).values({
          tenantId: candidate.tenantId,
          userId: candidate.userId,
          purpose: 'PASSWORD_RESET',
          channel,
          codeHash,
          expiresAt,
          attempts: 0,
        });

        // Deliver the OTP
        await this.deliverOtp(
          candidate.tenantId,
          candidate.userId,
          channel,
          normalizedIdentifier,
          code,
        );
      });
    }

    return genericResponse;
  }

  async verifyAndResetPassword(
    type: IdentityType,
    rawIdentifier: string,
    code: string,
    newPassword: string,
    tenantId?: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters long',
      );
    }

    let normalizedIdentifier: string;
    try {
      normalizedIdentifier =
        type === 'EMAIL'
          ? this.identity.normalizeEmail(rawIdentifier)
          : this.identity.normalizePhone(rawIdentifier);
    } catch {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const candidates = await this.identityLookup.findIdentity(
      type,
      normalizedIdentifier,
    );

    if (candidates.length === 0) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const targetCandidates = tenantId
      ? candidates.filter((c) => c.tenantId === tenantId)
      : candidates;

    if (targetCandidates.length === 0) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const now = new Date();
    let resetSucceeded = false;

    for (const candidate of targetCandidates) {
      await this.database.withTenant(candidate.tenantId, async (tx) => {
        const rows = await tx
          .select({
            id: otpCodes.id,
            codeHash: otpCodes.codeHash,
            attempts: otpCodes.attempts,
            expiresAt: otpCodes.expiresAt,
          })
          .from(otpCodes)
          .where(
            and(
              eq(otpCodes.tenantId, candidate.tenantId),
              eq(otpCodes.userId, candidate.userId),
              eq(otpCodes.purpose, 'PASSWORD_RESET'),
              isNull(otpCodes.consumedAt),
              gt(otpCodes.expiresAt, now),
              lt(otpCodes.attempts, MAX_OTP_ATTEMPTS),
            ),
          )
          .orderBy(desc(otpCodes.createdAt))
          .limit(1)
          .for('update');

        const otpRecord = rows[0];

        if (!otpRecord) {
          return;
        }

        const isValid = await this.passwordService.verify(
          otpRecord.codeHash,
          code,
        );

        if (!isValid) {
          await tx
            .update(otpCodes)
            .set({ attempts: otpRecord.attempts + 1 })
            .where(
              and(
                eq(otpCodes.tenantId, candidate.tenantId),
                eq(otpCodes.id, otpRecord.id),
              ),
            );
          return;
        }

        // Atomically consume the OTP to prevent concurrent replay
        const updateResult = await tx
          .update(otpCodes)
          .set({ consumedAt: new Date() })
          .where(
            and(
              eq(otpCodes.tenantId, candidate.tenantId),
              eq(otpCodes.id, otpRecord.id),
              isNull(otpCodes.consumedAt),
            ),
          )
          .returning({ id: otpCodes.id });

        if (updateResult.length === 0) {
          // Already consumed concurrently
          return;
        }

        const newPasswordHash = await this.passwordService.hash(newPassword);

        await tx
          .update(users)
          .set({
            passwordHash: newPasswordHash,
            mustChangePassword: false,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(users.tenantId, candidate.tenantId),
              eq(users.id, candidate.userId),
            ),
          );

        // Revoke all active sessions for this user upon password reset
        await this.sessionService.revokeAllUserSessions(
          candidate.tenantId,
          candidate.userId,
        );

        await tx.insert(auditLogs).values({
          tenantId: candidate.tenantId,
          actorId: candidate.userId,
          action: 'PASSWORD_RESET_COMPLETED',
          entityType: 'USER',
          entityId: candidate.userId,
        });

        resetSucceeded = true;
      });

      if (resetSucceeded) {
        break;
      }
    }

    if (!resetSucceeded) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    return {
      success: true,
      message: 'Password has been reset successfully',
    };
  }

  private async deliverOtp(
    tenantId: string,
    userId: string,
    channel: 'EMAIL' | 'SMS',
    recipient: string,
    code: string,
  ): Promise<void> {
    if (this.testDeliveryHandler) {
      this.testDeliveryHandler({ channel, recipient, code });
      return;
    }

    const emailConfigured = Boolean(process.env.SMTP_HOST);
    const smsConfigured = Boolean(process.env.AFRICASTALKING_API_KEY);

    if (channel === 'EMAIL' && !emailConfigured) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`Email provider unconfigured. [DEV OTP EMAIL to ${recipient}]: ${code}`);
        return;
      }
      this.logger.warn(`Email provider not configured. Cannot deliver OTP.`);
      throw new ServiceUnavailableException(
        'Notification delivery provider is not configured',
      );
    }

    if (channel === 'SMS' && !smsConfigured) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`SMS provider unconfigured. [DEV OTP SMS to ${recipient}]: ${code}`);
        return;
      }
      this.logger.warn(`SMS provider not configured. Cannot deliver OTP.`);
      throw new ServiceUnavailableException(
        'Notification delivery provider is not configured',
      );
    }
  }
}
