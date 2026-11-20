import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Pool, type PoolClient } from 'pg';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

let pool: Pool;
let client: PoolClient | undefined;

type UserInput = {
  email?: string | null;
  phone?: string | null;
  role?: string;
};

async function setTenantContext(tenantId: string): Promise<void> {
  await client!.query(`SELECT set_config('app.tenant_id', $1, true)`, [
    tenantId,
  ]);
}

async function createTenant(name: string): Promise<string> {
  const result = await client!.query<{ id: string }>(
    `INSERT INTO tenants (name, library_code)
     VALUES ($1, $2)
     RETURNING id`,
    [name, `TEST-${randomUUID().slice(0, 8).toUpperCase()}`],
  );

  return result.rows[0].id;
}

async function createMemberType(
  tenantId: string,
  name = 'Student',
): Promise<string> {
  await setTenantContext(tenantId);
  const result = await client!.query<{ id: string }>(
    `INSERT INTO member_types (tenant_id, name)
     VALUES ($1, $2)
     RETURNING id`,
    [tenantId, name],
  );

  return result.rows[0].id;
}

async function createUser(
  tenantId: string,
  input: UserInput = {},
): Promise<string> {
  await setTenantContext(tenantId);
  const result = await client!.query<{ id: string }>(
    `INSERT INTO users (
       tenant_id,
       full_name,
       email,
       phone,
       password_hash,
       role
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      tenantId,
      'Test Member',
      input.email ?? null,
      input.phone ?? null,
      'test-only-password-hash',
      input.role ?? 'MEMBER',
    ],
  );

  return result.rows[0].id;
}

async function createMemberProfile(input: {
  tenantId: string;
  userId: string;
  memberTypeId: string;
  admissionNumber?: string | null;
  groupId?: string | null;
  identifierType?: string | null;
  identifierValueEncrypted?: string | null;
  identifierLookupHash?: string | null;
}): Promise<string> {
  await setTenantContext(input.tenantId);
  const result = await client!.query<{ id: string }>(
    `INSERT INTO member_profiles (
       tenant_id,
       user_id,
       admission_number,
       identifier_type,
       identifier_value_encrypted,
       identifier_lookup_hash,
       group_id,
       member_type_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      input.tenantId,
      input.userId,
      input.admissionNumber ?? null,
      input.identifierType ?? null,
      input.identifierValueEncrypted ?? null,
      input.identifierLookupHash ?? null,
      input.groupId ?? null,
      input.memberTypeId,
    ],
  );

  return result.rows[0].id;
}

describe('Database constraints and tenant isolation', () => {
  beforeAll(async () => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database integration tests cannot run in production');
    }

    config({
      path: resolve(process.cwd(), '../../.env'),
      override: false,
    });

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is missing; check the root .env file');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
    });

    const result = await pool.query<{
      database_name: string;
      current_user: string;
    }>(
      `SELECT
     current_database() AS database_name,
     current_user AS current_user`,
    );

    if (result.rows[0].current_user !== 'lms_app') {
      await pool.end();
      throw new Error(
        `Database tests must run as lms_app, not ${result.rows[0].current_user}`,
      );
    }

    if (result.rows[0].database_name !== 'lms') {
      await pool.end();
      throw new Error(
        `Tests must use the lms database, not ${result.rows[0].database_name}`,
      );
    }
  });

  beforeEach(async () => {
    client = await pool.connect();
    await client.query('BEGIN');
  });

  afterEach(async () => {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = undefined;
    }
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('AUTH-1: allows the same email in different libraries', async () => {
    const tenantA = await createTenant('Library A');
    const tenantB = await createTenant('Library B');

    await createUser(tenantA, { email: 'member@example.com' });
    await expect(
      createUser(tenantB, { email: 'member@example.com' }),
    ).resolves.toBeTruthy();
  });

  it('AUTH-1: rejects duplicate emails regardless of letter case within a library', async () => {
    const tenantId = await createTenant('Email Test Library');

    await createUser(tenantId, { email: 'member@example.com' });

    await expect(
      createUser(tenantId, { email: 'MEMBER@example.com' }),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('AUTH-1: rejects duplicate phone numbers within a library', async () => {
    const tenantId = await createTenant('Phone Test Library');

    await createUser(tenantId, { phone: '+254700000001' });

    await expect(
      createUser(tenantId, { phone: '+254700000001' }),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('AUTH-1: requires each account to have an email address or phone number', async () => {
    const tenantId = await createTenant('Contact Test Library');

    await expect(createUser(tenantId)).rejects.toMatchObject({ code: '23514' });
  });

  it('AUTH-2: stores only the approved tenant roles, not GUEST', async () => {
    const result = await client!.query<{ role: string }>(
      `SELECT unnest(enum_range(NULL::user_role))::text AS role`,
    );

    expect(result.rows.map((row) => row.role)).toEqual([
      'ADMIN',
      'LIBRARIAN',
      'TEACHER',
      'MEMBER',
      'PARENT',
    ]);

    const tenantId = await createTenant('Role Test Library');

    await expect(
      createUser(tenantId, {
        email: 'guest@example.com',
        role: 'GUEST',
      }),
    ).rejects.toMatchObject({ code: '22P02' });
  });

  it('AUTH-4: supports creating a member account and profile individually', async () => {
    const tenantId = await createTenant('Manual Onboarding Library');
    const memberTypeId = await createMemberType(tenantId);

    const userId = await createUser(tenantId, {
      email: 'newmember@example.com',
    });

    const profileId = await createMemberProfile({
      tenantId,
      userId,
      memberTypeId,
      admissionNumber: 'ADM-001',
    });

    expect(profileId).toBeTruthy();
  });

  it('MEM-1: allows only one member profile per user in a library', async () => {
    const tenantId = await createTenant('Profile Test Library');
    const memberTypeId = await createMemberType(tenantId);
    const userId = await createUser(tenantId, {
      email: 'profile@example.com',
    });

    await createMemberProfile({ tenantId, userId, memberTypeId });

    await expect(
      createMemberProfile({ tenantId, userId, memberTypeId }),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('MEM-1: requires all identification document fields together', async () => {
    const tenantId = await createTenant('Identifier Test Library');
    const memberTypeId = await createMemberType(tenantId);
    const userId = await createUser(tenantId, {
      email: 'identifier@example.com',
    });

    await expect(
      createMemberProfile({
        tenantId,
        userId,
        memberTypeId,
        identifierType: 'NATIONAL_ID',
      }),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('MEM-1: accepts an encrypted identification document and lookup hash', async () => {
    const tenantId = await createTenant('Document Test Library');
    const memberTypeId = await createMemberType(tenantId);
    const userId = await createUser(tenantId, {
      email: 'document@example.com',
    });

    const profileId = await createMemberProfile({
      tenantId,
      userId,
      memberTypeId,
      identifierType: 'PASSPORT',
      identifierValueEncrypted: 'test-encrypted-value',
      identifierLookupHash: 'a'.repeat(64),
    });

    expect(profileId).toBeTruthy();
  });

  it('MEM-1: rejects duplicate admission numbers within a library', async () => {
    const tenantId = await createTenant('Admission Test Library');
    const memberTypeId = await createMemberType(tenantId);

    const firstUser = await createUser(tenantId, {
      email: 'first@example.com',
    });
    const secondUser = await createUser(tenantId, {
      email: 'second@example.com',
    });

    await createMemberProfile({
      tenantId,
      userId: firstUser,
      memberTypeId,
      admissionNumber: 'ADM-100',
    });

    await expect(
      createMemberProfile({
        tenantId,
        userId: secondUser,
        memberTypeId,
        admissionNumber: 'ADM-100',
      }),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('MEM-1: rejects duplicate identification document hashes within a library', async () => {
    const tenantId = await createTenant('Document Uniqueness Library');
    const memberTypeId = await createMemberType(tenantId);

    const firstUser = await createUser(tenantId, {
      email: 'first-doc@example.com',
    });
    const secondUser = await createUser(tenantId, {
      email: 'second-doc@example.com',
    });

    const hash = 'b'.repeat(64);

    await createMemberProfile({
      tenantId,
      userId: firstUser,
      memberTypeId,
      identifierType: 'NATIONAL_ID',
      identifierValueEncrypted: 'encrypted-value-one',
      identifierLookupHash: hash,
    });

    await expect(
      createMemberProfile({
        tenantId,
        userId: secondUser,
        memberTypeId,
        identifierType: 'NATIONAL_ID',
        identifierValueEncrypted: 'encrypted-value-two',
        identifierLookupHash: hash,
      }),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('MEM-2: rejects a member type belonging to another library', async () => {
    const tenantA = await createTenant('Member Type Library A');
    const tenantB = await createTenant('Member Type Library B');

    const memberTypeB = await createMemberType(tenantB);
    const userA = await createUser(tenantA, {
      email: 'member-a@example.com',
    });

    await expect(
      createMemberProfile({
        tenantId: tenantA,
        userId: userA,
        memberTypeId: memberTypeB,
      }),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('MEM-1: rejects a group belonging to another library', async () => {
    const tenantA = await createTenant('Group Library A');
    const tenantB = await createTenant('Group Library B');

    const memberTypeA = await createMemberType(tenantA);
    const userA = await createUser(tenantA, {
      email: 'group-member@example.com',
    });

    await setTenantContext(tenantB);
    const groupResult = await client!.query<{ id: string }>(
      `INSERT INTO groups (tenant_id, name)
       VALUES ($1, $2)
       RETURNING id`,
      [tenantB, 'Class B'],
    );

    await expect(
      createMemberProfile({
        tenantId: tenantA,
        userId: userA,
        memberTypeId: memberTypeA,
        groupId: groupResult.rows[0].id,
      }),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('AUTH-5: creates a session for a user in the same library', async () => {
    const tenantId = await createTenant('Session Library');
    const userId = await createUser(tenantId, {
      email: 'session@example.com',
    });
    await setTenantContext(tenantId);
    const result = await client!.query(
      `INSERT INTO sessions (
         tenant_id, user_id, refresh_token_hash, expires_at
       )
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [tenantId, userId, 'a'.repeat(64), '2099-01-01T00:00:00Z'],
    );

    expect(result.rows[0].id).toBeDefined();
  });

  it('AUTH-5: rejects duplicate refresh token hashes', async () => {
    const tenantId = await createTenant('Duplicate Session Library');
    const firstUser = await createUser(tenantId, {
      email: 'first-session@example.com',
    });
    const secondUser = await createUser(tenantId, {
      email: 'second-session@example.com',
    });

    const hash = 'c'.repeat(64);

    await setTenantContext(tenantId);
    await client!.query(
      `INSERT INTO sessions (
         tenant_id, user_id, refresh_token_hash, expires_at
       )
       VALUES ($1, $2, $3, $4)`,
      [tenantId, firstUser, hash, '2099-01-01T00:00:00Z'],
    );

    await expect(
      client!.query(
        `INSERT INTO sessions (
           tenant_id, user_id, refresh_token_hash, expires_at
         )
         VALUES ($1, $2, $3, $4)`,
        [tenantId, secondUser, hash, '2099-01-01T00:00:00Z'],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('AUTH-5: rejects a session belonging to another library user', async () => {
    const tenantA = await createTenant('Session Library A');
    const tenantB = await createTenant('Session Library B');

    const userB = await createUser(tenantB, {
      email: 'foreign-session@example.com',
    });

    await setTenantContext(tenantA);
    await expect(
      client!.query(
        `INSERT INTO sessions (
           tenant_id, user_id, refresh_token_hash, expires_at
         )
         VALUES ($1, $2, $3, $4)`,
        [tenantA, userB, 'd'.repeat(64), '2099-01-01T00:00:00Z'],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('AUTH-5: rejects session replacement across libraries', async () => {
    const tenantA = await createTenant('Replacement Library A');
    const tenantB = await createTenant('Replacement Library B');

    const userA = await createUser(tenantA, {
      email: 'replacement-a@example.com',
    });
    const userB = await createUser(tenantB, {
      email: 'replacement-b@example.com',
    });

    await setTenantContext(tenantB);
    const sessionB = await client!.query<{ id: string }>(
      `INSERT INTO sessions (
         tenant_id, user_id, refresh_token_hash, expires_at
       )
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [tenantB, userB, 'e'.repeat(64), '2099-01-01T00:00:00Z'],
    );

    await setTenantContext(tenantA);
    await expect(
      client!.query(
        `INSERT INTO sessions (
           tenant_id, user_id, refresh_token_hash,
           expires_at, replaced_by_session_id
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          tenantA,
          userA,
          'f'.repeat(64),
          '2099-01-01T00:00:00Z',
          sessionB.rows[0].id,
        ],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('AUTH-5: rejects a session that expires before it is created', async () => {
    const tenantId = await createTenant('Expired Session Library');
    const userId = await createUser(tenantId, {
      email: 'expired-session@example.com',
    });

    await setTenantContext(tenantId);
    await expect(
      client!.query(
        `INSERT INTO sessions (
           tenant_id, user_id, refresh_token_hash, expires_at
         )
         VALUES ($1, $2, $3, $4)`,
        [tenantId, userId, 'g'.repeat(64), '2000-01-01T00:00:00Z'],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('AUTH-3: accepts EMAIL and SMS OTP channels', async () => {
    const tenantId = await createTenant('OTP Channel Library');
    const emailUser = await createUser(tenantId, {
      email: 'otp-email@example.com',
    });
    const smsUser = await createUser(tenantId, {
      phone: '+254700000001',
    });

    await setTenantContext(tenantId);
    await client!.query(
      `INSERT INTO otp_codes (
         tenant_id, user_id, purpose, channel, code_hash, expires_at
       )
       VALUES
         ($1, $2, 'PASSWORD_RESET', 'EMAIL', $3, $4),
         ($1, $5, 'PASSWORD_RESET', 'SMS', $6, $4)`,
      [
        tenantId,
        emailUser,
        'email-test-hash',
        '2099-01-01T00:00:00Z',
        smsUser,
        'sms-test-hash',
      ],
    );

    await setTenantContext(tenantId);
    const result = await client!.query(
      `SELECT id FROM otp_codes WHERE tenant_id = $1`,
      [tenantId],
    );

    expect(result.rowCount).toBe(2);
  });

  it('AUTH-3: rejects negative OTP attempts', async () => {
    const tenantId = await createTenant('OTP Attempts Library');
    const userId = await createUser(tenantId, {
      email: 'otp-attempts@example.com',
    });

    await setTenantContext(tenantId);
    await expect(
      client!.query(
        `INSERT INTO otp_codes (
           tenant_id, user_id, purpose, channel,
           code_hash, expires_at, attempts
         )
         VALUES ($1, $2, 'PASSWORD_RESET', 'EMAIL', $3, $4, -1)`,
        [tenantId, userId, 'test-otp-hash', '2099-01-01T00:00:00Z'],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('AUTH-3: rejects an OTP that expires before it is created', async () => {
    const tenantId = await createTenant('OTP Expiry Library');
    const userId = await createUser(tenantId, {
      email: 'otp-expiry@example.com',
    });

    await setTenantContext(tenantId);
    await expect(
      client!.query(
        `INSERT INTO otp_codes (
           tenant_id, user_id, purpose, channel, code_hash, expires_at
         )
         VALUES ($1, $2, 'PASSWORD_RESET', 'EMAIL', $3, $4)`,
        [tenantId, userId, 'test-otp-hash', '2000-01-01T00:00:00Z'],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('AUTH-3: rejects an OTP belonging to another library user', async () => {
    const tenantA = await createTenant('OTP Library A');
    const tenantB = await createTenant('OTP Library B');

    const userB = await createUser(tenantB, {
      email: 'foreign-otp@example.com',
    });

    await setTenantContext(tenantA);
    await expect(
      client!.query(
        `INSERT INTO otp_codes (
           tenant_id, user_id, purpose, channel, code_hash, expires_at
         )
         VALUES ($1, $2, 'PASSWORD_RESET', 'EMAIL', $3, $4)`,
        [tenantA, userB, 'foreign-otp-hash', '2099-01-01T00:00:00Z'],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('RLS: enables and forces row-level security on all tenant tables', async () => {
    const result = await client!.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = ANY($1::text[])
    `,
      [
        [
          'users',
          'groups',
          'member_types',
          'member_profiles',
          'sessions',
          'otp_codes',
        ],
      ],
    );

    expect(result.rows).toHaveLength(6);

    for (const table of result.rows) {
      expect(table.relrowsecurity, table.relname).toBe(true);
      expect(table.relforcerowsecurity, table.relname).toBe(true);
    }
  });

  it('RLS: returns no tenant records and blocks inserts without tenant context', async () => {
    const tenantId = await createTenant('No Context Library');

    await createUser(tenantId, {
      email: 'no-context@example.com',
    });

    await client!.query(`SELECT set_config('app.tenant_id', '', true)`);

    const result = await client!.query(
      `SELECT id FROM users WHERE tenant_id = $1`,
      [tenantId],
    );

    expect(result.rowCount).toBe(0);

    await expect(
      client!.query(
        `INSERT INTO users (
          tenant_id, full_name, email, password_hash, role
        )
        VALUES ($1, $2, $3, $4, $5)`,
        [
          tenantId,
          'Blocked Member',
          'blocked@example.com',
          'test-only-password-hash',
          'MEMBER',
        ],
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('RLS: prevents one tenant from reading another tenant users', async () => {
    const tenantA = await createTenant('Visibility Library A');
    const tenantB = await createTenant('Visibility Library B');

    const userA = await createUser(tenantA, {
      email: 'visible-a@example.com',
    });

    await createUser(tenantB, {
      email: 'hidden-b@example.com',
    });

    await setTenantContext(tenantA);

    const result = await client!.query<{ id: string }>(`SELECT id FROM users`);

    expect(result.rows.map((row) => row.id)).toEqual([userA]);
  });

  it('RLS: blocks cross-tenant inserts and hides cross-tenant updates', async () => {
    const tenantA = await createTenant('Write Library A');
    const tenantB = await createTenant('Write Library B');

    await createUser(tenantB, {
      email: 'protected-b@example.com',
    });

    await setTenantContext(tenantA);

    await client!.query('SAVEPOINT cross_tenant_insert');

    await expect(
      client!.query(
        `INSERT INTO users (
      tenant_id, full_name, email, password_hash, role
    )
    VALUES ($1, $2, $3, $4, $5)`,
        [
          tenantB,
          'Unauthorized Member',
          'unauthorized@example.com',
          'test-only-password-hash',
          'MEMBER',
        ],
      ),
    ).rejects.toMatchObject({ code: '42501' });

    // Recover the transaction after the expected INSERT failure.
    await client!.query('ROLLBACK TO SAVEPOINT cross_tenant_insert');
    await client!.query('RELEASE SAVEPOINT cross_tenant_insert');

    const update = await client!.query(
      `UPDATE users
   SET full_name = 'Unauthorized Update'
   WHERE tenant_id = $1`,
      [tenantB],
    );

    expect(update.rowCount).toBe(0);
  });
  it('RLS: clears transaction-local tenant context after commit', async () => {
    const secondClient = await pool.connect();

    try {
      await secondClient.query('BEGIN');

      await secondClient.query(`SELECT set_config('app.tenant_id', $1, true)`, [
        randomUUID(),
      ]);

      await secondClient.query('COMMIT');

      const result = await secondClient.query<{
        tenant_id: string | null;
      }>(`SELECT current_setting('app.tenant_id', true) AS tenant_id`);

      expect(result.rows[0].tenant_id).toBe('');
    } finally {
      secondClient.release();
    }
  });

  it('AUTH-2: enables and forces RLS on audit_logs', async () => {
    const result = await client!.query<{
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relrowsecurity, relforcerowsecurity
       FROM pg_class
       WHERE oid = 'public.audit_logs'::regclass`,
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].relrowsecurity).toBe(true);
    expect(result.rows[0].relforcerowsecurity).toBe(true);

    const policy = await client!.query<{
      policyname: string;
      qual: string;
      with_check: string;
    }>(
      `SELECT policyname, qual, with_check
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'audit_logs'`,
    );

    expect(policy.rows).toHaveLength(1);
    expect(policy.rows[0].policyname).toBe('tenant_isolation');
    expect(policy.rows[0].qual).toContain('app.tenant_id');
    expect(policy.rows[0].with_check).toContain('app.tenant_id');
  });

  it('AUTH-2: blocks audit-log reads and inserts without tenant context', async () => {
    const tenantId = await createTenant('Audit No Context Library');
    const actorId = await createUser(tenantId, {
      email: 'audit-no-context@example.com',
    });

    await client!.query(`SELECT set_config('app.tenant_id', '', true)`);

    const result = await client!.query(
      `SELECT id FROM audit_logs WHERE tenant_id = $1`,
      [tenantId],
    );

    expect(result.rowCount).toBe(0);

    await client!.query('SAVEPOINT audit_no_context_insert');

    await expect(
      client!.query(
        `INSERT INTO audit_logs (
           tenant_id, actor_id, action, entity_type
         )
         VALUES ($1, $2, $3, $4)`,
        [tenantId, actorId, 'TEST_ACTION', 'USER'],
      ),
    ).rejects.toMatchObject({ code: '42501' });

    await client!.query('ROLLBACK TO SAVEPOINT audit_no_context_insert');
  });

  it('AUTH-2: prevents reading and inserting audit logs across tenants', async () => {
    const tenantA = await createTenant('Audit Library A');
    const tenantB = await createTenant('Audit Library B');

    const actorA = await createUser(tenantA, {
      email: 'audit-a@example.com',
    });
    const actorB = await createUser(tenantB, {
      email: 'audit-b@example.com',
    });

    await setTenantContext(tenantA);
    const auditA = await client!.query<{ id: string }>(
      `INSERT INTO audit_logs (
         tenant_id, actor_id, action, entity_type
       )
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [tenantA, actorA, 'TEST_ACTION_A', 'USER'],
    );

    await setTenantContext(tenantB);
    await client!.query(
      `INSERT INTO audit_logs (
         tenant_id, actor_id, action, entity_type
       )
       VALUES ($1, $2, $3, $4)`,
      [tenantB, actorB, 'TEST_ACTION_B', 'USER'],
    );

    await setTenantContext(tenantA);

    const visibleLogs = await client!.query<{ id: string }>(
      `SELECT id FROM audit_logs`,
    );

    expect(visibleLogs.rows.map((row) => row.id)).toEqual([auditA.rows[0].id]);

    await client!.query('SAVEPOINT audit_cross_tenant_insert');

    await expect(
      client!.query(
        `INSERT INTO audit_logs (
           tenant_id, actor_id, action, entity_type
         )
         VALUES ($1, $2, $3, $4)`,
        [tenantB, actorB, 'UNAUTHORIZED_ACTION', 'USER'],
      ),
    ).rejects.toMatchObject({ code: '42501' });

    await client!.query('ROLLBACK TO SAVEPOINT audit_cross_tenant_insert');
  });

  it('FIN-2: prevents the runtime role from updating or deleting audit logs', async () => {
    const tenantId = await createTenant('Audit Append Only Library');
    const actorId = await createUser(tenantId, {
      email: 'audit-append-only@example.com',
    });

    await setTenantContext(tenantId);

    const audit = await client!.query<{ id: string }>(
      `INSERT INTO audit_logs (
         tenant_id, actor_id, action, entity_type
       )
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [tenantId, actorId, 'TEST_ACTION', 'USER'],
    );

    const permissions = await client!.query<{
      can_select: boolean;
      can_insert: boolean;
      can_update: boolean;
      can_delete: boolean;
    }>(
      `SELECT
         has_table_privilege(current_user, 'public.audit_logs', 'SELECT') AS can_select,
         has_table_privilege(current_user, 'public.audit_logs', 'INSERT') AS can_insert,
         has_table_privilege(current_user, 'public.audit_logs', 'UPDATE') AS can_update,
         has_table_privilege(current_user, 'public.audit_logs', 'DELETE') AS can_delete`,
    );

    expect(permissions.rows[0]).toEqual({
      can_select: true,
      can_insert: true,
      can_update: false,
      can_delete: false,
    });

    await client!.query('SAVEPOINT audit_update_attempt');

    await expect(
      client!.query(
        `UPDATE audit_logs
         SET action = 'MODIFIED_ACTION'
         WHERE id = $1`,
        [audit.rows[0].id],
      ),
    ).rejects.toMatchObject({ code: '42501' });

    await client!.query('ROLLBACK TO SAVEPOINT audit_update_attempt');

    await client!.query('SAVEPOINT audit_delete_attempt');

    await expect(
      client!.query(`DELETE FROM audit_logs WHERE id = $1`, [audit.rows[0].id]),
    ).rejects.toMatchObject({ code: '42501' });

    await client!.query('ROLLBACK TO SAVEPOINT audit_delete_attempt');
  });
});
