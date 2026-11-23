import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const connectionString =
    process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'MIGRATION_DATABASE_URL or DATABASE_URL must be set to run migrations',
    );
  }

  const pool = new pg.Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 10000,
  });

  const db = drizzle(pool);

  // In production container or dist/, drizzle folder is adjacent to dist or in root
  const migrationsFolder = path.resolve(__dirname, '../../drizzle');

  console.log(`[Auto-Migrator] Applying migrations from ${migrationsFolder}...`);
  await migrate(db, { migrationsFolder });
  console.log('[Auto-Migrator] All database migrations applied successfully.');

  await pool.end();
}

runMigrations().catch((err) => {
  console.error('[Auto-Migrator] Migration failed:', err);
  process.exit(1);
});
