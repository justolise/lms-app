# Local Development Runbook

This runbook covers the current local scaffold. It is not a production deployment guide.

## Prerequisites

- Node.js 22+.
- pnpm 12.21.0.
- PostgreSQL and the required `lms_app` runtime / `lms_migrator` migration roles.
- Docker Engine and Docker Compose.
- Git.

## Environment

```bash
cp .env.example .env
```

Configure the local values for:

- `DATABASE_URL`
- `MIGRATION_DATABASE_URL`
- `REDIS_URL`
- `IDENTITY_LOOKUP_HMAC_KEY`
- `ACCESS_TOKEN_SECRET`
- `LIBRARY_SELECTION_TOKEN_SECRET`
- `MEMBER_IDENTIFIER_ENCRYPTION_KEY`
- `MEMBER_IDENTIFIER_HMAC_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (Optional for local dev; OTPs log to debug console if unset)
- `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY`, `AFRICASTALKING_FROM` (Optional for local dev)

Use generated local-only secrets (see [docs/auth/environment.md](./auth/environment.md) for generation commands). Never paste `.env` values into issues, chat, logs or commits.

## Install

```bash
pnpm install
```

## Start Redis

```bash
docker compose up -d redis
docker compose ps
```

The current `compose.yaml` defines Redis only. PostgreSQL must be started and configured separately.

## Database migrations

Before migrating, confirm that `MIGRATION_DATABASE_URL` points to the intended local database and uses the migration role.

```bash
pnpm --filter @lms/api exec drizzle-kit migrate
```

Do not run development migrations against production. Do not edit an already-applied migration; create a new migration for approved schema changes.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @lms/api test:e2e
```

The root `pnpm test` runs all package unit test suites (108 tests passing).

Run API Controller E2E tests:

```bash
pnpm --filter @lms/api exec vitest run --config ./vitest.config.e2e.ts test/auth.controller.e2e-spec.ts test/users.controller.e2e-spec.ts
```

Run database integration tests with:

```bash
pnpm --filter @lms/api test:integration
```

Database integration tests require the dedicated local LMS PostgreSQL database and role setup. The integration script currently runs `test/database.e2e-spec.ts`.

## Start development servers

API:

```bash
pnpm --filter @lms/api start:dev
```

Web:

```bash
pnpm --filter @lms/web dev
```

## Troubleshooting checklist

1. Confirm PostgreSQL is reachable using the local connection configuration without printing credentials.
2. Confirm Redis is healthy with `docker compose ps`.
3. Confirm the correct runtime/migration database roles are used.
4. Confirm the intended database has the expected migration history.
5. Run typecheck and API tests before debugging application behaviour.
6. Never reset or drop a database containing data you need.

## Operational gaps

No production hosting, deployment pipeline, backup automation, restore test, monitoring or alerting configuration was found in the inspected repository. Those must be designed, approved and verified before production use. Daily backups and a tested restore are requirements, not current capabilities.
