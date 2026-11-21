import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service.js';
import { auditLogs, tenants, users } from '../database/schema.js';
import { IdentityLookupService } from './identity/identity-lookup.service.js';
import type { IdentityType } from './identity/identity.service.js';
import { PasswordService } from './password/password.service.js';
import { INVALID_CREDENTIALS_MESSAGE } from './constants/auth.constants.js';
import type { VerifiedMembership } from './interfaces/verified-membership.interface.js';

export type { VerifiedMembership };

@Injectable()
export class AuthService {
  private dummyPasswordHash?: Promise<string>;

  constructor(
    private readonly database: DatabaseService,
    private readonly identityLookup: IdentityLookupService,
    private readonly passwordService: PasswordService,
  ) {}

  async verifyCredentials(
    type: IdentityType,
    identifier: string,
    password: string,
  ): Promise<VerifiedMembership[]> {
    let candidates;

    try {
      candidates = await this.identityLookup.findIdentity(type, identifier);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
      }

      throw error;
    }

    if (candidates.length === 0) {
      const dummyHash = await this.getDummyPasswordHash();
      await this.passwordService.verify(dummyHash, password);

      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const verifiedMemberships: VerifiedMembership[] = [];

    for (const candidate of candidates) {
      const account = await this.database.withTenant(
        candidate.tenantId,
        async (tx) => {
          const rows = await tx
            .select({
              userId: users.id,
              tenantId: users.tenantId,
              tenantName: tenants.name,
              fullName: users.fullName,
              role: users.role,
              passwordHash: users.passwordHash,
              userStatus: users.status,
              tenantStatus: tenants.status,
              mustChangePassword: users.mustChangePassword,
            })
            .from(users)
            .innerJoin(tenants, eq(tenants.id, users.tenantId))
            .where(
              and(
                eq(users.id, candidate.userId),
                eq(users.tenantId, candidate.tenantId),
              ),
            )
            .limit(1);

          return rows[0];
        },
      );

      if (!account) {
        const dummyHash = await this.getDummyPasswordHash();
        await this.passwordService.verify(dummyHash, password);
        continue;
      }

      const passwordMatches = await this.passwordService.verify(
        account.passwordHash,
        password,
      );

      if (
        passwordMatches &&
        account.userStatus === 'ACTIVE' &&
        account.tenantStatus === 'ACTIVE'
      ) {
        verifiedMemberships.push({
          userId: account.userId,
          tenantId: account.tenantId,
          tenantName: account.tenantName,
          fullName: account.fullName,
          role: account.role,
          mustChangePassword: account.mustChangePassword,
        });
      }
    }

    if (verifiedMemberships.length === 0) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return verifiedMemberships;
  }

  async getActiveMembership(
    userId: string,
    tenantId: string,
  ): Promise<VerifiedMembership> {
    const membership = await this.database.withTenant(tenantId, async (tx) => {
      const rows = await tx
        .select({
          userId: users.id,
          tenantId: users.tenantId,
          tenantName: tenants.name,
          fullName: users.fullName,
          role: users.role,
          mustChangePassword: users.mustChangePassword,
        })
        .from(users)
        .innerJoin(tenants, eq(tenants.id, users.tenantId))
        .where(
          and(
            eq(users.id, userId),
            eq(users.tenantId, tenantId),
            eq(users.status, 'ACTIVE'),
            eq(tenants.status, 'ACTIVE'),
          ),
        )
        .limit(1);

      return rows[0];
    });

    if (!membership) {
      throw new UnauthorizedException(
        'The selected library membership is no longer active',
      );
    }

    return membership;
  }

  async changePassword(
    tenantId: string,
    userId: string,
    currentPassword: string | undefined,
    newPassword: string,
  ): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters long',
      );
    }

    if (currentPassword && currentPassword === newPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    await this.database.withTenant(tenantId, async (tx) => {
      const rows = await tx
        .select({
          id: users.id,
          passwordHash: users.passwordHash,
          status: users.status,
          mustChangePassword: users.mustChangePassword,
        })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
        .limit(1);

      const user = rows[0];

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User account is not active');
      }

      // If this is a regular password change (mustChangePassword is false),
      // current password is strictly required and verified.
      // If mustChangePassword is true, the user already proved possession of the
      // temporary password at login to obtain this restricted session.
      if (!user.mustChangePassword) {
        if (!currentPassword) {
          throw new BadRequestException('Current password is required');
        }

        const isValid = await this.passwordService.verify(
          user.passwordHash,
          currentPassword,
        );

        if (!isValid) {
          throw new BadRequestException('Incorrect current password');
        }
      } else if (currentPassword) {
        // If provided optionally on first login, still verify it
        const isValid = await this.passwordService.verify(
          user.passwordHash,
          currentPassword,
        );

        if (!isValid) {
          throw new BadRequestException('Incorrect current password');
        }
      }

      const newPasswordHash = await this.passwordService.hash(newPassword);

      await tx
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          mustChangePassword: false,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

      await tx.insert(auditLogs).values({
        tenantId,
        actorId: userId,
        action: 'PASSWORD_CHANGED',
        entityType: 'USER',
        entityId: userId,
      });
    });
  }

  private getDummyPasswordHash(): Promise<string> {
    this.dummyPasswordHash ??= this.passwordService.hash(
      randomBytes(32).toString('hex'),
    );

    return this.dummyPasswordHash;
  }
}
