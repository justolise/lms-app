import { createHmac } from 'node:crypto';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, sql } from 'drizzle-orm';
import argon2 from 'argon2';

import * as schema from './schema.js';

const { tenants, users, auditLogs } = schema;

export interface SeedAdminConfig {
  tenantName?: string;
  libraryCode?: string;
  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;
  adminPassword?: string;
}

export async function seedInitialAdmin(config: SeedAdminConfig = {}) {
  const tenantName = config.tenantName ?? process.env.SEED_TENANT_NAME ?? 'Test Library';
  const libraryCode = config.libraryCode ?? process.env.SEED_LIBRARY_CODE ?? 'TEST-LIB';
  const adminName = config.adminName ?? process.env.SEED_ADMIN_NAME ?? 'Test Admin';
  const adminEmail = (config.adminEmail ?? process.env.SEED_ADMIN_EMAIL ?? 'testuser@example.com').trim().toLowerCase();
  const adminPhone = config.adminPhone ?? process.env.SEED_ADMIN_PHONE ?? '+254700000001';
  const adminPassword = config.adminPassword ?? process.env.SEED_ADMIN_PASSWORD ?? 'testuser123';

  // Connect using the runtime application database connection (lms_app)
  // which has EXECUTE permissions on identity_private functions.
  const connectionString =
    process.env.DATABASE_URL || process.env.MIGRATION_DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL or MIGRATION_DATABASE_URL must be configured.');
  }

  const hmacSecret = process.env.IDENTITY_LOOKUP_HMAC_KEY;
  if (!hmacSecret) {
    throw new Error('IDENTITY_LOOKUP_HMAC_KEY must be configured to sync identity lookups.');
  }
  const hmacKey = Buffer.from(hmacSecret, 'base64');
  if (hmacKey.length !== 32) {
    throw new Error('IDENTITY_LOOKUP_HMAC_KEY must be a valid 32-byte base64-encoded string.');
  }

  console.log(`\n🌱 Seeding initial library and administrator...`);
  console.log(`Connecting to database...`);

  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });
  const db = drizzle(pool, { schema });

  try {
    // 1. Ensure Tenant Exists
    const existingTenants = await db
      .select()
      .from(tenants)
      .where(eq(tenants.libraryCode, libraryCode))
      .limit(1);

    let tenant = existingTenants[0];

    if (!tenant) {
      console.log(`Creating tenant "${tenantName}" (Code: ${libraryCode})...`);
      const inserted = await db
        .insert(tenants)
        .values({
          name: tenantName,
          libraryCode,
          status: 'ACTIVE',
        })
        .returning();
      tenant = inserted[0];
      console.log(`✅ Tenant created: ${tenant.id}`);
    } else {
      console.log(`ℹ️ Tenant "${tenant.name}" already exists: ${tenant.id}`);
    }

    // 2. Ensure Admin User Exists within Tenant
    await db.transaction(async (tx) => {
      // Establish RLS tenant context
      await tx.execute(
        sql`SELECT set_config('app.tenant_id', ${tenant.id}, true)`,
      );

      const existingUsers = await tx
        .select()
        .from(users)
        .where(
          and(
            eq(users.tenantId, tenant.id),
            eq(users.email, adminEmail),
          ),
        )
        .limit(1);

      let user = existingUsers[0];

      if (!user) {
        console.log(`Creating Admin user "${adminEmail}"...`);

        // Hash password with Argon2id per LMS security standard
        const passwordHash = await argon2.hash(adminPassword, {
          type: argon2.argon2id,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
        });

        const insertedUsers = await tx
          .insert(users)
          .values({
            tenantId: tenant.id,
            fullName: adminName,
            email: adminEmail,
            phone: adminPhone,
            passwordHash,
            role: 'ADMIN',
            status: 'ACTIVE',
            mustChangePassword: false,
          })
          .returning();

        user = insertedUsers[0];

        // 3. Sync Cross-Tenant Blinded Identity Lookups (identity_private)
        // Email lookup hash
        const emailHash = createHmac('sha256', hmacKey)
          .update(adminEmail, 'utf8')
          .digest('hex');

        await tx.execute(sql`
          SELECT identity_private.sync_user_identity(
            ${tenant.id}::uuid,
            ${user.id}::uuid,
            'EMAIL'::public.identity_type,
            ${emailHash}
          )
        `);

        // Phone lookup hash
        if (adminPhone) {
          const phoneHash = createHmac('sha256', hmacKey)
            .update(adminPhone, 'utf8')
            .digest('hex');

          await tx.execute(sql`
            SELECT identity_private.sync_user_identity(
              ${tenant.id}::uuid,
              ${user.id}::uuid,
              'PHONE'::public.identity_type,
              ${phoneHash}
            )
          `);
        }

        // 4. Audit Log
        await tx.insert(auditLogs).values({
          tenantId: tenant.id,
          actorId: user.id,
          action: 'ADMIN_SEEDED',
          entityType: 'USER',
          entityId: user.id,
        });

        console.log(`✅ Admin user created: ${user.id}`);
      } else {
        console.log(`ℹ️ Admin user "${adminEmail}" already exists: ${user.id}`);
      }

      // Ensure Default Member Type Exists within Tenant
      const existingMemberTypes = await tx
        .select()
        .from(schema.memberTypes)
        .where(
          and(
            eq(schema.memberTypes.tenantId, tenant.id),
            eq(schema.memberTypes.name, 'Standard Member'),
          ),
        )
        .limit(1);

      let defaultMemberType = existingMemberTypes[0];
      if (!defaultMemberType) {
        console.log(`Creating default member type "Standard Member"...`);
        const insertedTypes = await tx
          .insert(schema.memberTypes)
          .values({
            tenantId: tenant.id,
            name: 'Standard Member',
            description: 'Default member type for general library borrowing',
          })
          .returning();
        defaultMemberType = insertedTypes[0];
        console.log(`✅ Default member type created: ${defaultMemberType.id}`);
      } else {
        console.log(`ℹ️ Default member type already exists: ${defaultMemberType.id}`);
      }

      // Ensure Default Loan Policy Exists for the Standard Member type
      const existingPolicies = await tx
        .select()
        .from(schema.loanPolicies)
        .where(
          and(
            eq(schema.loanPolicies.tenantId, tenant.id),
            eq(schema.loanPolicies.memberTypeId, defaultMemberType.id),
            eq(schema.loanPolicies.itemFormat, 'BOOK'),
          ),
        )
        .limit(1);

      if (!existingPolicies[0]) {
        console.log(`Creating default BOOK loan policy...`);
        const insertedPolicies = await tx
          .insert(schema.loanPolicies)
          .values({
            tenantId: tenant.id,
            memberTypeId: defaultMemberType.id,
            itemFormat: 'BOOK',
            loanDurationDays: 14,
            maxConcurrentLoans: 5,
            maxRenewals: 2,
            gracePeriodDays: 0,
            dailyFineMinorUnits: 0,
            maxFineMinorUnits: 0,
          })
          .returning();
        console.log(`✅ Default loan policy created: ${insertedPolicies[0].id}`);
      } else {
        console.log(`ℹ️ Default BOOK loan policy already exists: ${existingPolicies[0].id}`);
      }

      // Ensure Sample Catalogue Items and Copies Exist
      const existingBooks = await tx
        .select({ id: schema.catalogueItems.id })
        .from(schema.catalogueItems)
        .where(eq(schema.catalogueItems.tenantId, tenant.id))
        .limit(1);

      if (existingBooks.length === 0) {
        console.log(`Creating sample categories and catalogue books...`);

        // Category
        const [catLiterature] = await tx
          .insert(schema.categories)
          .values({
            tenantId: tenant.id,
            name: 'African Literature',
            description: 'Novels, drama and poetry by African authors',
          })
          .returning();

        const [catSciences] = await tx
          .insert(schema.categories)
          .values({
            tenantId: tenant.id,
            name: 'Sciences & Mathematics',
            description: 'Core scientific textbooks and reference materials',
          })
          .returning();

        const sampleBooksData = [
          {
            title: 'The River Between',
            subtitle: 'Heinemann African Writers Series',
            authors: ["Ngũgĩ wa Thiong'o"],
            isbn13: '9780435905484',
            publisher: 'Heinemann',
            publishedYear: 1965,
            language: 'en',
            format: 'BOOK' as const,
            callNumber: '823.914 NGU',
            shelfLocation: 'AF-LIT-01',
            categoryId: catLiterature.id,
            subjects: ['Kenyan Literature', 'Colonial Period', 'Fiction'],
          },
          {
            title: 'Things Fall Apart',
            subtitle: 'The African Trilogy Book 1',
            authors: ['Chinua Achebe'],
            isbn13: '9780385474542',
            publisher: 'Anchor Books',
            publishedYear: 1958,
            language: 'en',
            format: 'BOOK' as const,
            callNumber: '823.914 ACH',
            shelfLocation: 'AF-LIT-02',
            subjects: ['Nigerian Literature', 'Classics', 'Fiction'],
          },
          {
            title: 'Blossoms of the Savannah',
            subtitle: 'Set book for literature in English',
            authors: ['Henry Ole Kulet'],
            isbn13: '9789966467348',
            publisher: 'Longhorn Publishers',
            publishedYear: 2008,
            language: 'en',
            format: 'BOOK' as const,
            callNumber: '823.914 KUL',
            shelfLocation: 'AF-LIT-03',
            categoryId: catLiterature.id,
            subjects: ['Kenyan Literature', 'Culture', 'Set Books'],
          },
          {
            title: 'Secondary Physics: Form 1 & 2',
            subtitle: 'Kenya National Curriculum',
            authors: ['Kenya Institute of Curriculum Development'],
            isbn13: '9789966250018',
            publisher: 'KLB',
            publishedYear: 2021,
            language: 'en',
            format: 'BOOK' as const,
            callNumber: '530 KICD',
            shelfLocation: 'SCI-01',
            categoryId: catSciences.id,
            subjects: ['Physics', 'Secondary Education', 'Sciences'],
          },
        ];

        let copySeq = 1;
        for (const bookData of sampleBooksData) {
          const [insertedBook] = await tx
            .insert(schema.catalogueItems)
            .values({
              tenantId: tenant.id,
              createdBy: user.id,
              ...bookData,
            })
            .returning();

          // Create 2 available copies for each book
          for (let c = 1; c <= 2; c++) {
            const barcode = `${tenant.libraryCode}-${String(copySeq++).padStart(5, '0')}`;
            await tx.insert(schema.copies).values({
              tenantId: tenant.id,
              catalogueItemId: insertedBook.id,
              barcode,
              condition: 'GOOD',
              status: 'AVAILABLE',
              shelfLocation: bookData.shelfLocation,
            });
          }
        }
        console.log(`✅ Seeded ${sampleBooksData.length} sample titles and physical copies.`);
      } else {
        console.log(`ℹ️ Catalogue books already exist for tenant: ${tenant.id}`);
      }

      console.log(`\n🎉 Seeding complete! You can now log in with:`);
      console.log(`──────────────────────────────────────────────`);
      console.log(`Tenant Name:    ${tenant.name}`);
      console.log(`Tenant ID:      ${tenant.id}`);
      console.log(`Library Code:   ${tenant.libraryCode}`);
      console.log(`Admin Email:    ${adminEmail}`);
      console.log(`Admin Phone:    ${adminPhone}`);
      console.log(`Admin Password: ${adminPassword}`);
      console.log(`Admin Role:     ADMIN`);
      console.log(`──────────────────────────────────────────────\n`);
    });
  } finally {
    await pool.end();
  }
}

// When executed directly via node/npm run
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('seed.js') || process.argv[1]?.endsWith('seed.ts')) {
  seedInitialAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
