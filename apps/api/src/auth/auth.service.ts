import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { IdentityLookupService } from './identity/identity-lookup.service.js';
import type { IdentityType } from './identity/identity.service.js';
import { PasswordService } from './password/password.service.js';

const INVALID_CREDENTIALS = 'Invalid email/phone or password';

type CredentialRecord = {
  userId: string;
  tenantId: string;
  tenantName: string;
  fullName: string;
  role: 'ADMIN' | 'LIBRARIAN' | 'TEACHER' | 'MEMBER' | 'PARENT';
  passwordHash: string;
  userStatus: string;
  tenantStatus: string;
};

export type VerifiedMembership = {
  userId: string;
  tenantId: string;
  tenantName: string;
  fullName: string;
  role: CredentialRecord['role'];
};

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
        throw new UnauthorizedException(INVALID_CREDENTIALS);
      }

      throw error;
    }

    if (candidates.length === 0) {
      const dummyHash = await this.getDummyPasswordHash();
      await this.passwordService.verify(dummyHash, password);

      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const verifiedMemberships: VerifiedMembership[] = [];

    for (const candidate of candidates) {
      const account = await this.database.withTenant(
        candidate.tenantId,
        async (tx) => {
          const result = await tx.execute<CredentialRecord>(sql`
            SELECT
              u.id AS "userId",
              u.tenant_id AS "tenantId",
              t.name AS "tenantName",
              u.full_name AS "fullName",
              u.role AS "role",
              u.password_hash AS "passwordHash",
              u.status AS "userStatus",
              t.status AS "tenantStatus"
            FROM public.users u
            INNER JOIN public.tenants t
              ON t.id = u.tenant_id
            WHERE u.id = ${candidate.userId}::uuid
              AND u.tenant_id = ${candidate.tenantId}::uuid
            LIMIT 1
          `);

          return result.rows[0];
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
        });
      }
    }

    if (verifiedMemberships.length === 0) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return verifiedMemberships;
  }

  private getDummyPasswordHash(): Promise<string> {
    this.dummyPasswordHash ??= this.passwordService.hash(
      randomBytes(32).toString('hex'),
    );

    return this.dummyPasswordHash;
  }
}
