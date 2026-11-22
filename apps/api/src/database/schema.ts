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
  boolean,
  date,
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

    mustChangePassword: boolean('must_change_password')
      .notNull()
      .default(false),

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

    description: text('description'),

    isActive: boolean('is_active').notNull().default(true),

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

// MEM-2, ADM-2, CIR-4, FIN-1: Loan and fine policies per (member type × item format).
export const loanPolicies = pgTable(
  'loan_policies',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),

    memberTypeId: uuid('member_type_id').notNull(),

    itemFormat: varchar('item_format', { length: 50 }).notNull().default('BOOK'),

    loanDurationDays: integer('loan_duration_days').notNull().default(14),

    maxConcurrentLoans: integer('max_concurrent_loans').notNull().default(5),

    maxRenewals: integer('max_renewals').notNull().default(2),

    gracePeriodDays: integer('grace_period_days').notNull().default(0),

    dailyFineMinorUnits: integer('daily_fine_minor_units').notNull().default(0),

    maxFineMinorUnits: integer('max_fine_minor_units').notNull().default(0),

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
    uniqueIndex('loan_policies_tenant_id_id_unique').on(
      table.tenantId,
      table.id,
    ),

    uniqueIndex('loan_policies_tenant_type_format_unique').on(
      table.tenantId,
      table.memberTypeId,
      table.itemFormat,
    ),

    foreignKey({
      name: 'loan_policies_tenant_member_type_fk',
      columns: [table.tenantId, table.memberTypeId],
      foreignColumns: [memberTypes.tenantId, memberTypes.id],
    }),

    check(
      'loan_policies_duration_positive',
      sql`${table.loanDurationDays} > 0`,
    ),

    check(
      'loan_policies_max_loans_positive',
      sql`${table.maxConcurrentLoans} > 0`,
    ),

    check(
      'loan_policies_renewals_nonnegative',
      sql`${table.maxRenewals} >= 0`,
    ),

    check(
      'loan_policies_grace_nonnegative',
      sql`${table.gracePeriodDays} >= 0`,
    ),

    check(
      'loan_policies_fine_nonnegative',
      sql`${table.dailyFineMinorUnits} >= 0`,
    ),

    check(
      'loan_policies_max_fine_nonnegative',
      sql`${table.maxFineMinorUnits} >= 0`,
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

// ─── CAT-1, CAT-5: Item format ───────────────────────────────
export const itemFormatEnum = pgEnum('item_format', [
  'BOOK',
  'PERIODICAL',
  'REFERENCE',
  'AUDIO',
  'VIDEO',
  'OTHER',
]);

// CAT-1: Catalogue record lifecycle
export const catalogueStatusEnum = pgEnum('catalogue_status', [
  'ACTIVE',
  'ARCHIVED',
]);

// CAT-4: Physical copy lifecycle
export const copyStatusEnum = pgEnum('copy_status', [
  'AVAILABLE',
  'ON_LOAN',
  'RESERVED',
  'IN_TRANSIT',
  'LOST',
  'DAMAGED',
  'WITHDRAWN',
]);

// CAT-3: Physical condition of a copy
export const copyConditionEnum = pgEnum('copy_condition', [
  'NEW',
  'GOOD',
  'FAIR',
  'POOR',
  'DAMAGED',
]);

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

// CAT-5: Hierarchical categories owned per tenant.
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),

    name: varchar('name', { length: 100 }).notNull(),

    description: text('description'),

    // Optional parent for subcategory nesting.
    parentId: uuid('parent_id'),

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
    uniqueIndex('categories_tenant_id_id_unique').on(table.tenantId, table.id),

    uniqueIndex('categories_tenant_name_unique').on(table.tenantId, table.name),

    // A sub-category's parent must belong to the same library.
    foreignKey({
      name: 'categories_tenant_parent_fk',
      columns: [table.tenantId, table.parentId],
      foreignColumns: [table.tenantId, table.id],
    }),
  ],
);

// CAT-1, CAT-2, CAT-5: Bibliographic catalogue records.
export const catalogueItems = pgTable(
  'catalogue_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),

    title: varchar('title', { length: 500 }).notNull(),

    subtitle: varchar('subtitle', { length: 500 }),

    // Stored as a JSON array of author name strings.
    authors: jsonb('authors').notNull().default(sql`'[]'::jsonb`),

    isbn13: varchar('isbn13', { length: 13 }),

    isbn10: varchar('isbn10', { length: 10 }),

    publisher: varchar('publisher', { length: 300 }),

    publishedYear: integer('published_year'),

    // ISO 639-1 language code, e.g. 'en', 'sw'.
    language: varchar('language', { length: 10 }).notNull().default('en'),

    format: itemFormatEnum('format').notNull().default('BOOK'),

    description: text('description'),

    coverUrl: text('cover_url'),

    // CAT-5: Dewey decimal or local call number.
    callNumber: varchar('call_number', { length: 100 }),

    // CAT-5: Physical shelf location code.
    shelfLocation: varchar('shelf_location', { length: 100 }),

    // CAT-5: Primary category.
    categoryId: uuid('category_id'),

    // CAT-5: Subject tags stored as a JSON array.
    subjects: jsonb('subjects').notNull().default(sql`'[]'::jsonb`),

    status: catalogueStatusEnum('status').notNull().default('ACTIVE'),

    // Raw payload from ISBN lookup provider.
    isbnMetadata: jsonb('isbn_metadata'),

    createdBy: uuid('created_by').notNull(),

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
    uniqueIndex('catalogue_items_tenant_id_id_unique').on(
      table.tenantId,
      table.id,
    ),

    // ISBN-13 must be unique within a tenant's catalogue.
    uniqueIndex('catalogue_items_tenant_isbn13_unique')
      .on(table.tenantId, table.isbn13)
      .where(sql`${table.isbn13} IS NOT NULL`),

    index('catalogue_items_tenant_status_idx').on(table.tenantId, table.status),

    index('catalogue_items_tenant_format_idx').on(table.tenantId, table.format),

    index('catalogue_items_tenant_category_idx').on(
      table.tenantId,
      table.categoryId,
    ),

    // The category must belong to the same library.
    foreignKey({
      name: 'catalogue_items_tenant_category_fk',
      columns: [table.tenantId, table.categoryId],
      foreignColumns: [categories.tenantId, categories.id],
    }),

    // The creator must belong to the same library.
    foreignKey({
      name: 'catalogue_items_tenant_created_by_fk',
      columns: [table.tenantId, table.createdBy],
      foreignColumns: [users.tenantId, users.id],
    }),

    check(
      'catalogue_items_published_year_range_check',
      sql`${table.publishedYear} IS NULL OR (${table.publishedYear} BETWEEN 1 AND 9999)`,
    ),
  ],
);

// CAT-3, CAT-4: Individual physical copies of a catalogue item.
export const copies = pgTable(
  'copies',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),

    catalogueItemId: uuid('catalogue_item_id').notNull(),

    // Unique barcode within the library. Never null after creation.
    barcode: varchar('barcode', { length: 100 }).notNull(),

    condition: copyConditionEnum('condition').notNull().default('GOOD'),

    status: copyStatusEnum('status').notNull().default('AVAILABLE'),

    // Overrides the item-level shelf location when set.
    shelfLocation: varchar('shelf_location', { length: 100 }),

    acquiredAt: date('acquired_at'),

    notes: text('notes'),

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
    uniqueIndex('copies_tenant_id_id_unique').on(table.tenantId, table.id),

    // Barcode must be unique within a tenant.
    uniqueIndex('copies_tenant_barcode_unique').on(
      table.tenantId,
      table.barcode,
    ),

    index('copies_tenant_status_idx').on(table.tenantId, table.status),

    index('copies_tenant_catalogue_item_idx').on(
      table.tenantId,
      table.catalogueItemId,
    ),

    // The parent catalogue item must belong to the same library.
    foreignKey({
      name: 'copies_tenant_catalogue_item_fk',
      columns: [table.tenantId, table.catalogueItemId],
      foreignColumns: [catalogueItems.tenantId, catalogueItems.id],
    }).onDelete('restrict'),
  ],
);

// ─── CIR-1 through CIR-5: Loans / Circulation ───────────────────────────────

export const loanStatusEnum = pgEnum('loan_status', [
  'ACTIVE',
  'RETURNED',
  'OVERDUE',
  'LOST',
  'DAMAGED',
]);

export const loans = pgTable(
  'loans',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),

    // Borrower — composite FK to users(tenant_id, id)
    userId: uuid('user_id').notNull(),

    // Physical copy being loaned
    copyId: uuid('copy_id').notNull(),

    // Denormalised for quick title lookup without joining
    catalogueItemId: uuid('catalogue_item_id').notNull(),

    // ── Policy snapshot at checkout (CIR-4) ──────────────────
    // Stored so policy changes don't retroactively affect active loans.
    loanDurationDays: integer('loan_duration_days').notNull(),
    maxRenewals: integer('max_renewals').notNull(),
    gracePeriodDays: integer('grace_period_days').notNull().default(0),
    dailyFineMinorUnits: integer('daily_fine_minor_units').notNull().default(0),
    maxFineMinorUnits: integer('max_fine_minor_units').notNull().default(0),

    // ── Timestamps (UTC stored; Africa/Nairobi logical) ───────
    checkedOutAt: timestamp('checked_out_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    // End of local due date in Africa/Nairobi (UTC+3)
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),

    returnedAt: timestamp('returned_at', { withTimezone: true }),

    status: loanStatusEnum('status').notNull().default('ACTIVE'),

    renewalCount: integer('renewal_count').notNull().default(0),

    // Fine computed at return/lost marking (minor units = cents/fils/etc.)
    fineMinorUnits: integer('fine_minor_units'),

    // ── CIR-5: librarian override audit ──────────────────────
    overrideReason: text('override_reason'),
    overrideActorId: uuid('override_actor_id'),

    // ── Idempotency ───────────────────────────────────────────
    idempotencyKey: varchar('idempotency_key', { length: 128 }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('loans_tenant_id_id_unique').on(table.tenantId, table.id),

    // Idempotency key must be unique per tenant (nullable — only enforced when provided)
    uniqueIndex('loans_idempotency_unique').on(
      table.tenantId,
      table.idempotencyKey,
    ),

    index('loans_tenant_user_status_idx').on(
      table.tenantId,
      table.userId,
      table.status,
    ),

    uniqueIndex('loans_tenant_copy_idx').on(table.tenantId, table.copyId),

    // Prevent multiple active loans on the identical physical copy concurrently
    uniqueIndex('loans_tenant_copy_active_unique')
      .on(table.tenantId, table.copyId)
      .where(sql`${table.status} = 'ACTIVE'`),

    index('loans_tenant_catalogue_item_idx').on(
      table.tenantId,
      table.catalogueItemId,
    ),

    // Borrower must belong to the same tenant
    foreignKey({
      name: 'loans_tenant_user_fk',
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.id],
    }).onDelete('restrict'),

    // Copy must belong to the same tenant
    foreignKey({
      name: 'loans_tenant_copy_fk',
      columns: [table.tenantId, table.copyId],
      foreignColumns: [copies.tenantId, copies.id],
    }).onDelete('restrict'),
  ],
);

export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;

// ─── HLD-1 through HLD-3: Holds & Reservations ──────────────────────────────

export const holdStatusEnum = pgEnum('hold_status', [
  'PENDING',
  'READY',
  'FULFILLED',
  'CANCELLED',
  'EXPIRED',
]);

export const holds = pgTable(
  'holds',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),

    // Member placing hold — composite FK to users(tenant_id, id)
    userId: uuid('user_id').notNull(),

    // Title on which hold is placed — composite FK to catalogue_items(tenant_id, id)
    catalogueItemId: uuid('catalogue_item_id').notNull(),

    // Assigned physical copy once ready for pickup — nullable FK to copies(tenant_id, id)
    copyId: uuid('copy_id'),

    status: holdStatusEnum('status').notNull().default('PENDING'),

    // Pickup window in hours once ready (default: 72 hours)
    pickupWindowHours: integer('pickup_window_hours').notNull().default(72),

    // Timestamps
    placedAt: timestamp('placed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    readyAt: timestamp('ready_at', { withTimezone: true }),

    expiresAt: timestamp('expires_at', { withTimezone: true }),

    fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),

    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

    cancellationReason: varchar('cancellation_reason', { length: 255 }),

    cancelledByUserId: uuid('cancelled_by_user_id'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('holds_tenant_id_id_unique').on(table.tenantId, table.id),

    // Only 1 active hold per user per title
    uniqueIndex('holds_tenant_user_title_active_unique')
      .on(table.tenantId, table.userId, table.catalogueItemId)
      .where(sql`${table.status} IN ('PENDING', 'READY')`),

    // FIFO queue index
    index('holds_queue_fifo_idx').on(
      table.tenantId,
      table.catalogueItemId,
      table.status,
      table.placedAt,
    ),

    // User's holds index
    index('holds_tenant_user_status_idx').on(
      table.tenantId,
      table.userId,
      table.status,
    ),

    // Copy claimant index
    index('holds_tenant_copy_status_idx').on(
      table.tenantId,
      table.copyId,
      table.status,
    ),

    // Foreign keys
    foreignKey({
      name: 'holds_tenant_user_fk',
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.id],
    }).onDelete('restrict'),

    foreignKey({
      name: 'holds_tenant_catalogue_item_fk',
      columns: [table.tenantId, table.catalogueItemId],
      foreignColumns: [catalogueItems.tenantId, catalogueItems.id],
    }).onDelete('restrict'),

    foreignKey({
      name: 'holds_tenant_copy_fk',
      columns: [table.tenantId, table.copyId],
      foreignColumns: [copies.tenantId, copies.id],
    }).onDelete('set null'),
  ],
);

export type Hold = typeof holds.$inferSelect;
export type NewHold = typeof holds.$inferInsert;

// ─── MEM-ENQ: Public membership enquiries ─────────────────────────────────────
// Unauthenticated patrons submit contact information requesting a library card.
// Staff review and provision accounts manually (no self-registration per DECISIONS.md).
export const membershipEnquiries = pgTable(
  'membership_enquiries',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Resolved from libraryCode at submission time — allows multi-tenant routing.
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),

    fullName: varchar('full_name', { length: 200 }).notNull(),

    email: varchar('email', { length: 254 }),

    phone: varchar('phone', { length: 30 }).notNull(),

    idNumber: varchar('id_number', { length: 50 }).notNull(),

    memberType: varchar('member_type', { length: 50 }),

    organization: varchar('organization', { length: 300 }),

    notes: text('notes'),

    // Lifecycle: PENDING → APPROVED or REJECTED by staff.
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),

    // Set when a staff member provisions the account.
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

    reviewedBy: uuid('reviewed_by'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('membership_enquiries_tenant_status_idx').on(
      table.tenantId,
      table.status,
      table.createdAt,
    ),
  ],
);

export type MembershipEnquiry = typeof membershipEnquiries.$inferSelect;
export type NewMembershipEnquiry = typeof membershipEnquiries.$inferInsert;

