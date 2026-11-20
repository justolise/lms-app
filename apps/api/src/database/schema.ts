import {
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// AUTH-1: Account status
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'SUSPENDED']);

// AUTH-2: Roles available within a library
// GUEST is anonymous and is not stored in this enum.
export const userRoleEnum = pgEnum('user_role', [
  'ADMIN',
  'LIBRARIAN',
  'TEACHER',
  'MEMBER',
  'PARENT',
]);

// Tenant status
export const tenantStatusEnum = pgEnum('tenant_status', [
  'ACTIVE',
  'SUSPENDED',
]);

// MEM-1: Identification document types accepted for a member.
export const memberIdentifierTypeEnum = pgEnum('member_identifier_type', [
  'NATIONAL_ID',
  'ALIEN_ID',
  'PASSPORT',
  'OTHER',
]);

// AUTH-3: Only password-reset OTPs are in scope for v1.0.
export const otpPurposeEnum = pgEnum('otp_purpose', ['PASSWORD_RESET']);

// AUTH-3: OTP delivery channel.
export const otpChannelEnum = pgEnum('otp_channel', ['EMAIL', 'SMS']);

// AUTH-1: Identity types used for cross-library account discovery.
export const identityTypeEnum = pgEnum('identity_type', ['EMAIL', 'PHONE']);

// Each library is a separate tenant.
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    name: varchar('name', { length: 200 }).notNull(),

    libraryCode: varchar('library_code', { length: 40 }).notNull().unique(),

    status: tenantStatusEnum('status').notNull().default('ACTIVE'),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'tenants_library_code_format_check',
      sql`${table.libraryCode} ~ '^[A-Z0-9-]+$'`,
    ),
  ],
);

// AUTH-1 and AUTH-2: Login accounts and roles.
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),

    fullName: varchar('full_name', { length: 200 }).notNull(),

    email: varchar('email', { length: 254 }),

    phone: varchar('phone', { length: 20 }),

    passwordHash: text('password_hash').notNull(),

    role: userRoleEnum('role').notNull(),

    status: userStatusEnum('status').notNull().default('ACTIVE'),

    emailVerifiedAt: timestamp('email_verified_at', {
      withTimezone: true,
    }),

    phoneVerifiedAt: timestamp('phone_verified_at', {
      withTimezone: true,
    }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Required for tenant-aware composite foreign keys.
    uniqueIndex('users_tenant_id_id_unique').on(table.tenantId, table.id),

    // Email uniqueness is case-insensitive within each tenant.
    uniqueIndex('users_tenant_email_unique')
      .on(table.tenantId, sql`lower(${table.email})`)
      .where(sql`${table.email} IS NOT NULL`),

    uniqueIndex('users_tenant_phone_unique')
      .on(table.tenantId, table.phone)
      .where(sql`${table.phone} IS NOT NULL`),

    index('users_tenant_role_idx').on(table.tenantId, table.role),

    check(
      'users_email_or_phone_required',
      sql`${table.email} IS NOT NULL OR ${table.phone} IS NOT NULL`,
    ),
  ],
);

// AUTH-1: HMAC-based identity lookup across libraries.
// Raw email addresses and phone numbers are never stored here.
export const userIdentityLookup = pgTable(
  'user_identity_lookup',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id').notNull(),

    userId: uuid('user_id').notNull(),

    identityType: identityTypeEnum('identity_type').notNull(),

    identityHash: varchar('identity_hash', { length: 64 }).notNull(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.id],
      name: 'user_identity_lookup_tenant_user_fk',
    }).onDelete('cascade'),

    // An identity can belong to only one account within a library.
    uniqueIndex('user_identity_lookup_tenant_identity_unique').on(
      table.tenantId,
      table.identityType,
      table.identityHash,
    ),

    // Supports identity discovery across all libraries.
    index('user_identity_lookup_discovery_idx').on(
      table.identityType,
      table.identityHash,
    ),
  ],
);

// MEM-2: Member categories used by borrowing policies.
export const memberTypes = pgTable(
  'member_types',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),

    name: varchar('name', { length: 100 }).notNull(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('member_types_tenant_id_id_unique').on(
      table.tenantId,
      table.id,
    ),

    uniqueIndex('member_types_tenant_name_unique').on(
      table.tenantId,
      table.name,
    ),
  ],
);

// MEM-1: Classes and other member groups.
export const groups = pgTable(
  'groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),

    name: varchar('name', { length: 100 }).notNull(),

    year: varchar('year', { length: 30 }),

    teacherId: uuid('teacher_id'),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('groups_tenant_id_id_unique').on(table.tenantId, table.id),

    uniqueIndex('groups_tenant_name_unique').on(table.tenantId, table.name),

    index('groups_tenant_teacher_idx').on(table.tenantId, table.teacherId),

    // A group's teacher must belong to the same library.
    foreignKey({
      name: 'groups_tenant_teacher_fk',
      columns: [table.tenantId, table.teacherId],
      foreignColumns: [users.tenantId, users.id],
    }),
  ],
);

// MEM-1 and MEM-2: Additional details for member accounts.
export const memberProfiles = pgTable(
  'member_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id').notNull(),

    userId: uuid('user_id').notNull(),

    admissionNumber: varchar('admission_number', {
      length: 100,
    }),
    identifierType: memberIdentifierTypeEnum('identifier_type'),

    // Never store the original document number as plaintext.
    identifierValueEncrypted: text('identifier_value_encrypted'),

    // HMAC-SHA-256 digest used for duplicate detection.
    identifierLookupHash: varchar('identifier_lookup_hash', {
      length: 64,
    }),

    groupId: uuid('group_id'),

    memberTypeId: uuid('member_type_id').notNull(),

    photoUrl: text('photo_url'),

    membershipExpiresAt: timestamp('membership_expires_at', {
      withTimezone: true,
    }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('member_profiles_tenant_user_unique').on(
      table.tenantId,
      table.userId,
    ),

    uniqueIndex('member_profiles_tenant_id_id_unique').on(
      table.tenantId,
      table.id,
    ),

    uniqueIndex('member_profiles_tenant_admission_unique')
      .on(table.tenantId, table.admissionNumber)
      .where(sql`${table.admissionNumber} IS NOT NULL`),

    index('member_profiles_tenant_group_idx').on(table.tenantId, table.groupId),

    // A document number can only be registered once per library.
    uniqueIndex('member_profiles_tenant_identifier_hash_unique')
      .on(table.tenantId, table.identifierLookupHash)
      .where(sql`${table.identifierLookupHash} IS NOT NULL`),

    // All three document fields must be present together or all be empty.
    check(
      'member_profiles_identifier_fields_check',
      sql`(
        (
          ${table.identifierType} IS NULL
          AND ${table.identifierValueEncrypted} IS NULL
          AND ${table.identifierLookupHash} IS NULL
        )
        OR
        (
          ${table.identifierType} IS NOT NULL
          AND ${table.identifierValueEncrypted} IS NOT NULL
          AND ${table.identifierLookupHash} IS NOT NULL
        )
      )`,
    ),

    // The profile's user must belong to the same library.
    foreignKey({
      name: 'member_profiles_tenant_user_fk',
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.id],
    }).onDelete('cascade'),

    // The selected group must belong to the same library.
    foreignKey({
      name: 'member_profiles_tenant_group_fk',
      columns: [table.tenantId, table.groupId],
      foreignColumns: [groups.tenantId, groups.id],
    }),

    // The selected member type must belong to the same library.
    foreignKey({
      name: 'member_profiles_tenant_member_type_fk',
      columns: [table.tenantId, table.memberTypeId],
      foreignColumns: [memberTypes.tenantId, memberTypes.id],
    }),
  ],
);

// AUTH-5: A session represents one authenticated device/session.
// Refresh tokens are stored as SHA-256 hashes, never as plaintext.
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),

    userId: uuid('user_id').notNull(),

    // SHA-256 hex digest of the refresh token (64 characters).
    refreshTokenHash: varchar('refresh_token_hash', {
      length: 64,
    }).notNull(),

    expiresAt: timestamp('expires_at', {
      withTimezone: true,
    }).notNull(),

    revokedAt: timestamp('revoked_at', {
      withTimezone: true,
    }),

    // Points to the replacement session after token rotation.
    replacedBySessionId: uuid('replaced_by_session_id'),

    deviceName: varchar('device_name', { length: 200 }),

    lastUsedAt: timestamp('last_used_at', {
      withTimezone: true,
    }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('sessions_refresh_token_hash_unique').on(
      table.refreshTokenHash,
    ),

    uniqueIndex('sessions_tenant_id_id_unique').on(table.tenantId, table.id),

    index('sessions_tenant_user_idx').on(table.tenantId, table.userId),

    index('sessions_expires_at_idx').on(table.expiresAt),

    foreignKey({
      name: 'sessions_tenant_user_fk',
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.id],
    }).onDelete('cascade'),

    // A replacement session must belong to the same tenant.
    foreignKey({
      name: 'sessions_tenant_replacement_fk',
      columns: [table.tenantId, table.replacedBySessionId],
      foreignColumns: [table.tenantId, table.id],
    }),

    check(
      'sessions_expiry_after_creation_check',
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
);

// AUTH-3: One-time password-reset verification codes.
// Store only a password hash of the OTP, never the original code.
export const otpCodes = pgTable(
  'otp_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),

    userId: uuid('user_id').notNull(),

    purpose: otpPurposeEnum('purpose').notNull().default('PASSWORD_RESET'),

    channel: otpChannelEnum('channel').notNull(),

    // Password-hash output; its length depends on the hash algorithm.
    codeHash: text('code_hash').notNull(),

    expiresAt: timestamp('expires_at', {
      withTimezone: true,
    }).notNull(),

    consumedAt: timestamp('consumed_at', {
      withTimezone: true,
    }),

    attempts: integer('attempts').notNull().default(0),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('otp_codes_tenant_user_purpose_idx').on(
      table.tenantId,
      table.userId,
      table.purpose,
    ),

    index('otp_codes_expires_at_idx').on(table.expiresAt),

    foreignKey({
      name: 'otp_codes_tenant_user_fk',
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.id],
    }).onDelete('cascade'),

    check('otp_codes_attempts_nonnegative_check', sql`${table.attempts} >= 0`),

    check(
      'otp_codes_expiry_after_creation_check',
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
);

// AUTH-2, FIN-2: Security and business-action audit trail.
// Audit records are append-only for the application role.
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),

    // Nullable for system/background actions.
    actorId: uuid('actor_id'),

    action: varchar('action', { length: 100 }).notNull(),

    entityType: varchar('entity_type', { length: 100 }).notNull(),

    entityId: uuid('entity_id'),

    reason: text('reason'),

    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('audit_logs_tenant_created_idx').on(table.tenantId, table.createdAt),

    index('audit_logs_tenant_actor_created_idx').on(
      table.tenantId,
      table.actorId,
      table.createdAt,
    ),

    // An actor must belong to the same tenant as the audit record.
    foreignKey({
      name: 'audit_logs_tenant_actor_fk',
      columns: [table.tenantId, table.actorId],
      foreignColumns: [users.tenantId, users.id],
    }),
  ],
);
