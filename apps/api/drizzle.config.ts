import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

if (process.env.NODE_ENV !== 'production') {
  config({
    path: '../../.env',
    override: false,
  });
}

if (!process.env.MIGRATION_DATABASE_URL) {
  throw new Error('MIGRATION_DATABASE_URL is missing from the environment');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.MIGRATION_DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
