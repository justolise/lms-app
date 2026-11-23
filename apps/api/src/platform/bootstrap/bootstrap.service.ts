import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { HashOptions } from 'argon2';
import { eq } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service.js';
import {
  platformAuditLogs,
  platformUsers,
} from '../../database/schema.js';
import { PlatformMfaService } from '../auth/platform-mfa.service.js';

export interface BootstrapInput {
  email: string;
  fullName: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface BootstrapResult {
  platformUserId: string;
  email: string;
  fullName: string;
  totpSecret: string;
  totpUri: string;
  recoveryCodes: string[];
}

@Injectable()
export class PlatformBootstrapService {
  private readonly logger = new Logger(PlatformBootstrapService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly mfaService: PlatformMfaService,
  ) {}

  /**
   * Provisions the very first Platform Super Admin account.
   * Self-disables if any active Platform Super Admin already exists in the database.
   */
  async bootstrap(input: BootstrapInput): Promise<BootstrapResult> {
    const email = input.email.trim().toLowerCase();
    const fullName = input.fullName.trim();
    const password = input.password;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('A valid email address is required');
    }

    if (!fullName) {
      throw new BadRequestException('Full name is required');
    }

    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    // 1. Idempotency & Safety Check: Ensure no active platform super admin exists
    const existing = await this.database.db
      .select({ id: platformUsers.id })
      .from(platformUsers)
      .where(eq(platformUsers.status, 'ACTIVE'))
      .limit(1);

    if (existing.length > 0) {
      throw new BadRequestException(
        'Bootstrap is disabled: An active Platform Super Admin already exists.',
      );
    }

    // 2. Hash password with Argon2id
    const argonOptions: HashOptions =
      process.env.NODE_ENV === 'test'
        ? { type: argon2.argon2id, memoryCost: 1024, timeCost: 1 }
        : { type: argon2.argon2id };

    const passwordHash = await argon2.hash(password, argonOptions);

    // 3. Generate TOTP secret and recovery codes
    const totpSecret = this.mfaService.generateTotpSecret();
    const mfaSecretEncrypted = this.mfaService.encryptSecret(totpSecret);
    const { plaintextCodes, hashedCodes } =
      await this.mfaService.generateRecoveryCodes();

    // 4. Atomically insert platform user and audit log
    const [user] = await this.database.db
      .insert(platformUsers)
      .values({
        email,
        fullName,
        passwordHash,
        status: 'ACTIVE',
        mfaSecretEncrypted,
        mfaEnabled: true,
        mfaRecoveryCodesHash: hashedCodes,
      })
      .returning();

    await this.database.db.insert(platformAuditLogs).values({
      actorId: user.id,
      action: 'PLATFORM_SUPER_ADMIN_BOOTSTRAP',
      entityType: 'PLATFORM_USER',
      entityId: user.id,
      ipAddress: input.ipAddress || '127.0.0.1',
      userAgent: input.userAgent || 'CLI-Bootstrap',
      metadata: {
        email: user.email,
        fullName: user.fullName,
      },
    });

    this.logger.log(
      `Platform Super Admin successfully bootstrapped: id=${user.id} email=${user.email}`,
    );

    return {
      platformUserId: user.id,
      email: user.email,
      fullName: user.fullName,
      totpSecret,
      totpUri: this.mfaService.getOtpAuthUri(user.email, totpSecret),
      recoveryCodes: plaintextCodes,
    };
  }
}
