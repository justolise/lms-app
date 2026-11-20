import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import { AuthService } from '../src/auth/auth.service.js';
import { DatabaseService } from '../src/database/database.service.js';
import { IdentityService } from '../src/auth/identity/identity.service.js';
import { IdentityLookupService } from '../src/auth/identity/identity-lookup.service.js';
import { PasswordService } from '../src/auth/password/password.service.js';

describe('AuthService PostgreSQL integration (AUTH-1)', () => {
  let pool: Pool;
  let database: DatabaseService;
  let authService: AuthService;
  let identityLookup: IdentityLookupService;
  let passwordService: PasswordService;

  const tenantIds: string[] = [];

  type Account = {
    tenantId: string;
    userId: string;
  };

  async function createAccount(
    libraryName: string,
    identityType: 'EMAIL' | 'PHONE',
    identifier: string,
    password: string,
  ): Promise<Account> {
    const libraryCode = `AUTH-${randomUUID()
      .replaceAll('-', '')
      .slice(0, 12)
      .toUpperCase()}`;

    const tenantResult = await pool.query<{ id: string }>(
      `
        INSERT INTO tenants (name, library_code)
        VALUES ($1, $2)
        RETURNING id
      `,
      [libraryName, libraryCode],
    );

    const tenantId = tenantResult.rows[0].id;
    tenantIds.push(tenantId);

    const passwordHash = await passwordService.hash(password);
    const client = await pool.connect();

    let userId: string;

    try {
      await client.query('BEGIN');

      await client.query(
        `SELECT set_config('app.tenant_id', $1, true)`,
        [tenantId],
      );

      const userResult = await client.query<{ id: string }>(
        `
          INSERT INTO users (
            tenant_id,
            full_name,
            email,
            phone,
            password_hash,
            role
          )
          VALUES ($1, $2, $3, $4, $5, 'MEMBER')
          RETURNING id
        `,
        [
          tenantId,
          `AUTH Test ${libraryName}`,
          identityType === 'EMAIL' ? identifier : null,
          identityType === 'PHONE' ? '+254712345678' : null,
          passwordHash,
        ],
      );

      userId = userResult.rows[0].id;

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    await identityLookup.syncIdentity(
      tenantId,
      userId,
      identityType,
      identifier,
    );

    return { tenantId, userId };
  }

  beforeAll(async () => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Authentication tests cannot run against production');
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

    const identity = new IdentityService();
    identityLookup = new IdentityLookupService(database, identity);
    passwordService = new PasswordService();

    authService = new AuthService(
      database,
      identityLookup,
      passwordService,
    );
  });

  afterAll(async () => {
    try {
      for (const tenantId of tenantIds) {
        const client = await pool.connect();

        try {
          await client.query('BEGIN');

          await client.query(
            `SELECT set_config('app.tenant_id', $1, true)`,
            [tenantId],
          );

          await client.query(
            'DELETE FROM users WHERE tenant_id = $1',
            [tenantId],
          );

          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

        await pool.query(
          'DELETE FROM tenants WHERE id = $1',
          [tenantId],
        );
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

  it('AUTH-1: authenticates a member using email and password', async () => {
    const account = await createAccount(
      'AUTH Email Library',
      'EMAIL',
      'auth-email@example.com',
      'EmailPassword123!',
    );

    const result = await authService.verifyCredentials(
      'EMAIL',
      'AUTH-EMAIL@example.com',
      'EmailPassword123!',
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      userId: account.userId,
      tenantId: account.tenantId,
      role: 'MEMBER',
    });

    expect(result[0]).not.toHaveProperty('passwordHash');
  });

  it('AUTH-1: authenticates a member using a Kenyan phone number', async () => {
    const account = await createAccount(
      'AUTH Phone Library',
      'PHONE',
      '0712345678',
      'PhonePassword123!',
    );

    const result = await authService.verifyCredentials(
      'PHONE',
      '+254712345678',
      'PhonePassword123!',
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      userId: account.userId,
      tenantId: account.tenantId,
    });
  });

  it('AUTH-1: authenticates only the matching library when passwords differ', async () => {
    const accountA = await createAccount(
      'AUTH Shared Library A',
      'EMAIL',
      'shared-auth@example.com',
      'LibraryAPassword123!',
    );

    const accountB = await createAccount(
      'AUTH Shared Library B',
      'EMAIL',
      'shared-auth@example.com',
      'LibraryBPassword123!',
    );

    const resultA = await authService.verifyCredentials(
      'EMAIL',
      'shared-auth@example.com',
      'LibraryAPassword123!',
    );

    const resultB = await authService.verifyCredentials(
      'EMAIL',
      'shared-auth@example.com',
      'LibraryBPassword123!',
    );

    expect(resultA).toHaveLength(1);
    expect(resultA[0].tenantId).toBe(accountA.tenantId);

    expect(resultB).toHaveLength(1);
    expect(resultB[0].tenantId).toBe(accountB.tenantId);
  });

  it('AUTH-1: rejects an incorrect password', async () => {
    await createAccount(
      'AUTH Wrong Password Library',
      'EMAIL',
      'wrong-password@example.com',
      'CorrectPassword123!',
    );

    await expect(
      authService.verifyCredentials(
        'EMAIL',
        'wrong-password@example.com',
        'IncorrectPassword123!',
      ),
    ).rejects.toThrow('Invalid email/phone or password');
  });

  it('AUTH-1: returns the same generic error for an unknown identity', async () => {
    await expect(
      authService.verifyCredentials(
        'EMAIL',
        'unknown-auth@example.com',
        'SomePassword123!',
      ),
    ).rejects.toThrow('Invalid email/phone or password');
  });

  it('AUTH-1: rejects a suspended user', async () => {
    const account = await createAccount(
      'AUTH Suspended User Library',
      'EMAIL',
      'suspended-user@example.com',
      'SuspendedPassword123!',
    );

    await database.withTenant(account.tenantId, async (tx) => {
      await tx.execute(sql`
        UPDATE public.users
        SET status = 'SUSPENDED'
        WHERE id = ${account.userId}::uuid
      `);
    });

    await expect(
      authService.verifyCredentials(
        'EMAIL',
        'suspended-user@example.com',
        'SuspendedPassword123!',
      ),
    ).rejects.toThrow('Invalid email/phone or password');
  });

  it('AUTH-1: rejects a member of a suspended library', async () => {
    const account = await createAccount(
      'AUTH Suspended Library',
      'EMAIL',
      'suspended-library@example.com',
      'SuspendedLibraryPassword123!',
    );

    await pool.query(
      `
        UPDATE tenants
        SET status = 'SUSPENDED'
        WHERE id = $1
      `,
      [account.tenantId],
    );

    await expect(
      authService.verifyCredentials(
        'EMAIL',
        'suspended-library@example.com',
        'SuspendedLibraryPassword123!',
      ),
    ).rejects.toThrow('Invalid email/phone or password');
  });
});
