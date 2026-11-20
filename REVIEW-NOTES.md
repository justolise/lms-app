# Phase 1 documentation reconciliation — review notes

This reconciliation package was applied to the repository on 2026-11-20. The original root documents are preserved in .phase1-backups/.

## Existing files replaced by the apply script

- `README.md`
- `PROGRESS.md`
- `DECISIONS.md`

The script first backs up those three existing files under `.phase1-backups/<timestamp>/`. It refuses to overwrite any of the proposed new files if they already exist.

## New files

- `docs/requirements-traceability.md`
- `docs/architecture.md`
- `docs/privacy.md`
- `docs/runbook.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `.github/workflows/ci.yml`
- `.github/workflows/security.yml`
- `.github/dependabot.yml`
- `.github/pull_request_template.md`

## Important limitations / review items

1. The CI workflow deliberately runs lint, typecheck, package unit tests and builds only. API E2E/database suites are not included because the current workflow does not provision the dedicated PostgreSQL database and roles those tests require. Add them only after a reproducible CI database setup is designed and verified.
2. The security workflow runs `pnpm audit` and Semgrep Community Edition (`semgrep scan --config auto`). Semgrep provides static analysis, but comprehensive security coverage is not established; secret scanning and CodeQL are not configured.
3. The GitHub workflows have not been executed in GitHub. GitHub Actions permissions, action versions and dependency audit behaviour must be reviewed before relying on them.
4. Historical test counts in the old progress file were not re-run during preparation. The revised file labels them historical.
5. The migration files were observed in the repository, but live migration application state was not independently queried in this inspection.
6. Current `compose.yaml` starts Redis only; PostgreSQL remains separately provisioned.
7. Provider integrations, BullMQ, web tests, deployment, backups, monitoring and production security remain unverified or unimplemented.
8. `DECISIONS.md` keeps the approved architecture and product decisions while clearly distinguishing implementation records from complete workflows.
9. Requirement status is deliberately conservative: schema-only foundations are marked `doing`, not `done`, for functional requirements.

## Apply

From the user's local repository:

```bash
cd ~/projects/lms
bash /path/to/lms-phase1-reconciliation/APPLY-RECONCILIATION.sh
```

Then inspect the diff and new files before staging or committing anything. The script does not commit or push.
