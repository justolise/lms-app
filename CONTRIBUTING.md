# Contributing

## Scope and source of truth

Work on v1.0 MVP only until the pilot is complete and reviewed. The v1.0 MVP Requirements document and approved decisions in `DECISIONS.md` are authoritative. Do not silently add features, change requirements, alter the schema or change the stack.

Every task, test and commit should reference the relevant requirement ID(s), such as `AUTH-1` or `CIR-3`.

## Development workflow

- Work in small, end-to-end vertical slices.
- Keep changes focused on one requirement group.
- Add migrations for approved schema changes; never rewrite an applied migration.
- Add business-rule, boundary and permission tests.
- Enforce authorization on the server.
- Preserve tenant isolation and include `tenant_id` on tenant-owned tables.
- Keep secrets in environment variables.

## Before requesting review

Run the applicable checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @lms/api test:e2e
pnpm --filter @lms/api test:integration
pnpm build
```

Database integration tests require the configured local PostgreSQL test environment.

Update `PROGRESS.md` with evidence. Record material approved technical/product decisions in `DECISIONS.md`. Do not mark a requirement complete based only on schema or scaffold work.

## Pull requests

Use the repository pull request template. Include requirement IDs, a concise explanation, verification evidence, migration/security/privacy impact and any remaining gaps.

The intended branching model is short-lived requirement branches and reviewed pull requests into `main`. Branch protection and CI enforcement must be configured and verified in GitHub separately; this document does not claim they are active.
