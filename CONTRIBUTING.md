# Contributing

## Scope and source of truth

Work on v1.0 MVP only until the pilot is complete and reviewed. The v1.0 MVP Requirements document and approved decisions in `DECISIONS.md` are authoritative. Do not silently add features, change requirements, alter the schema or change the stack.

Every task, test and commit should reference the relevant requirement ID(s), such as `AUTH-1` or `CIR-3`.

## Development workflow

- Work in small, end-to-end vertical slices.
- Keep changes focused on one requirement group.
- **ORM Standard**: All normal application CRUD queries must use **Drizzle ORM** query-builder syntax (`tx.select()`, `tx.insert()`, `tx.update()`, `tx.delete()`). Handwritten raw SQL for ordinary application CRUD is strictly prohibited. The only approved exceptions are `DatabaseService.withTenant()` (`set_config('app.tenant_id')`) and the three restricted SECURITY DEFINER functions in `identity_private`.
- Add migrations for approved schema changes (`drizzle-kit generate`); never rewrite or edit an already-applied migration.
- Add business-rule, boundary, and permission tests.
- Enforce authorization on the server via `AccessTokenGuard` and `RolesGuard`.
- Preserve PostgreSQL Row-Level Security (RLS) and transaction-local tenant context (`DatabaseService.withTenant()`). Never trust a client-supplied `tenantId`.
- Keep secrets in environment variables (documented in `.env.example`).
- Maintain project documentation: update `PROGRESS.md`, `DECISIONS.md`, and relevant `docs/` specifications as part of the definition of done.

## Before requesting review

Run the applicable checks:

```bash
# 1. Static type checking across all workspace projects
pnpm typecheck

# 2. Package unit tests (fast, in-memory mocks)
pnpm test

# 3. API Controller E2E tests (Supertest HTTP and guard verification)
pnpm --filter @lms/api exec vitest run --config ./vitest.config.e2e.ts test/auth.controller.e2e-spec.ts test/users.controller.e2e-spec.ts

# 4. Database integration tests (requires live local PostgreSQL test container)
pnpm --filter @lms/api test:integration

# 5. Production builds
pnpm build
```

Database integration tests require the configured local PostgreSQL test environment with `lms_app` and `lms_migrator` roles.

Update `PROGRESS.md` with verification evidence. Record material approved technical/product decisions in `DECISIONS.md`. Do not mark a requirement complete based only on schema or scaffold work.

## Pull requests

Use the repository pull request template. Include requirement IDs, a concise explanation, verification evidence, migration/security/privacy impact and any remaining gaps.

The intended branching model is short-lived requirement branches and reviewed pull requests into `main`. Branch protection and CI enforcement must be configured and verified in GitHub separately; this document does not claim they are active.
