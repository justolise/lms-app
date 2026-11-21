import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { IdentityService, type IdentityType } from './identity.service.js';
import type { DatabaseTransaction } from '../../database/database.service.js';

export type IdentityLookupResult = Record<string, unknown> & {
  tenantId: string;
  userId: string;
};

@Injectable()
export class IdentityLookupService {
  constructor(
    private readonly database: DatabaseService,
    private readonly identity: IdentityService,
  ) {}

  async findIdentity(
    type: IdentityType,
    value: string,
  ): Promise<IdentityLookupResult[]> {
    const identityHash = this.identity.hashIdentity(type, value);

    const result = await this.database.db.execute<IdentityLookupResult>(
      sql`
      SELECT tenant_id AS "tenantId", user_id AS "userId"
      FROM identity_private.find_user_identity(
        ${type}::public.identity_type,
        ${identityHash}
      )
    `,
    );

    return result.rows;
  }

  async syncIdentity(
    tenantId: string,
    userId: string,
    type: IdentityType,
    value: string,
  ): Promise<void> {
    await this.database.withTenant(tenantId, async (tx) => {
      await this.syncIdentityInTransaction(tx, tenantId, userId, type, value);
    });
  }

  async syncIdentityInTransaction(
    tx: DatabaseTransaction,
    tenantId: string,
    userId: string,
    type: IdentityType,
    value: string,
  ): Promise<void> {
    const identityHash = this.identity.hashIdentity(type, value);

    await tx.execute(sql`
      SELECT identity_private.sync_user_identity(
        ${tenantId}::uuid,
        ${userId}::uuid,
        ${type}::public.identity_type,
        ${identityHash}
      )
    `);
  }

  async deleteIdentity(
    tenantId: string,
    userId: string,
    type: IdentityType,
  ): Promise<void> {
    await this.database.withTenant(tenantId, async (tx) => {
      await tx.execute(sql`
        SELECT identity_private.delete_user_identity(
          ${tenantId}::uuid,
          ${userId}::uuid,
          ${type}::public.identity_type
        )
      `);
    });
  }
}
