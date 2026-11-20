import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';
import { IdentityService } from '../src/auth/identity/identity.service.js';
import { IdentityLookupService } from '../src/auth/identity/identity-lookup.service.js';

describe('IdentityLookupService database integration (AUTH-1)', () => {
  let pool: Pool;
  let database: DatabaseService;
  let identity: IdentityService;
  let identityLookup: IdentityLookupService;

  let tenantA: string;
  let tenantB: string;

  let userA: string;
  let userB: string;
  let userA2: string;

  async function createTenant(name: string): Promise<string> {
    const libraryCode = `LMS-${randomUUID()
      .replaceAll('-', '')
      .slice(0, 12)
      .toUpperCase()}`;

    const result = await pool.query<{ id: string }>(
      `
        INSERT INTO tenants (name, library_code)
        VALUES ($1, $2)
        RETURNING id
      `,
      [name, libraryCode],
    );

    return result.rows[0].id;
  }

  async function createUser(
    tenantId: string,
    fullName: string,
    email: string,
  ): Promise<string> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [
        tenantId,
      ]);

      const result = await client.query<{ id: string }>(
        `
          INSERT INTO users (
            tenant_id,
            full_name,
            email,
            password_hash,
            role
          )
          VALUES ($1, $2, $3, $4, 'LIBRARIAN')
          RETURNING id
        `,
        [tenantId, fullName, email, 'integration-test-password-hash'],
      );

      await client.query('COMMIT');

      return result.rows[0].id;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  beforeAll(async () => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Integration tests cannot run against production');
    }

    config({
      path: resolve(process.cwd(), '../../.env'),
      override: false,
    });

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is missing');
    }

    if (!process.env.IDENTITY_LOOKUP_HMAC_KEY) {
      throw new Error('IDENTITY_LOOKUP_HMAC_KEY is missing');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
    });

    const connectionInfo = await pool.query<{
      role: string;
      database: string;
    }>(
      `
        SELECT
          current_user AS role,
          current_database() AS database
      `,
    );

    expect(connectionInfo.rows[0].role).toBe('lms_app');
    expect(connectionInfo.rows[0].database).toBe('lms');

    database = new DatabaseService();
    await database.onModuleInit();

    identity = new IdentityService();

    identityLookup = new IdentityLookupService(database, identity);

    tenantA = await createTenant('Identity Test Library A');
    tenantB = await createTenant('Identity Test Library B');

    userA = await createUser(
      tenantA,
      'Identity Test User A',
      'multi-library@example.com',
    );

    userB = await createUser(
      tenantB,
      'Identity Test User B',
      'multi-library@example.com',
    );

    userA2 = await createUser(
      tenantA,
      'Identity Test User A2',
      'second-account@example.com',
    );
  });

  afterAll(async () => {
    try {
      for (const tenantId of [tenantA, tenantB]) {
        if (!tenantId || !pool) continue;

        const client = await pool.connect();

        try {
          await client.query('BEGIN');

          await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [
            tenantId,
          ]);

          await client.query('DELETE FROM users WHERE tenant_id = $1', [
            tenantId,
          ]);

          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

        await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
      }
    } finally {
      if (database) {
        await database.onModuleDestroy();
      }

      if (pool) {
        await pool.end();
      }
    }
  });

  it('should register and find an identity in one library', async () => {
    await identityLookup.syncIdentity(
      tenantA,
      userA,
      'EMAIL',
      'single-library@example.com',
    );

    const result = await identityLookup.findIdentity(
      'EMAIL',
      'single-library@example.com',
    );

    expect(result).toEqual([
      {
        tenantId: tenantA,
        userId: userA,
      },
    ]);
  });

  it('should find the same identity across multiple libraries', async () => {
    await identityLookup.syncIdentity(
      tenantA,
      userA,
      'EMAIL',
      'multi-library@example.com',
    );

    await identityLookup.syncIdentity(
      tenantB,
      userB,
      'EMAIL',
      'multi-library@example.com',
    );

    const result = await identityLookup.findIdentity(
      'EMAIL',
      'multi-library@example.com',
    );

    expect(result).toHaveLength(2);

    expect(result).toEqual(
      expect.arrayContaining([
        {
          tenantId: tenantA,
          userId: userA,
        },
        {
          tenantId: tenantB,
          userId: userB,
        },
      ]),
    );
  });

  it('should return an empty array for an unknown identity', async () => {
    const result = await identityLookup.findIdentity(
      'EMAIL',
      'unknown-identity@example.com',
    );

    expect(result).toEqual([]);
  });

  it('should prevent one identity from belonging to two users in the same library', async () => {
    await identityLookup.syncIdentity(
      tenantA,
      userA,
      'EMAIL',
      'duplicate-test@example.com',
    );

    await expect(
      identityLookup.syncIdentity(
        tenantA,
        userA2,
        'EMAIL',
        'duplicate-test@example.com',
      ),
    ).rejects.toThrow();
  });

  it('should delete an identity lookup record', async () => {
    await identityLookup.syncIdentity(
      tenantA,
      userA,
      'EMAIL',
      'delete-test@example.com',
    );

    await identityLookup.deleteIdentity(tenantA, userA, 'EMAIL');

    const result = await identityLookup.findIdentity(
      'EMAIL',
      'delete-test@example.com',
    );

    expect(result).toEqual([]);
  });

  it('should reject identity synchronization without tenant context', async () => {
    const identityHash = identity.hashIdentity(
      'EMAIL',
      'tenant-context-test@example.com',
    );

    let caughtError: unknown;

    try {
      await database.db.execute(sql`
        SELECT identity_private.sync_user_identity(
          ${tenantA}::uuid,
          ${userA}::uuid,
          'EMAIL'::public.identity_type,
          ${identityHash}
        )
      `);
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(Error);

    const cause = (
      caughtError as Error & {
        cause?: Error;
      }
    ).cause;

    expect(cause).toBeInstanceOf(Error);
    expect(cause?.message).toMatch(/tenant context/i);
  });
});
