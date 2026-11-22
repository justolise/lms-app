# Security Testing & Automated Verification

## Test Matrix
The application maintains a multi-layer automated security test suite:
1. **Unit Security Tests (`pnpm test`)**:
   - 22 test files, 220 unit tests verifying cryptographic hashing, token signatures, session rotation, replay detection, RLS query shapes, rate limiting, and RBAC guards.
2. **E2E Controller Tests**:
   - `test/auth.controller.e2e-spec.ts`: Full integration tests verifying login, logout, cookie attributes, session listing, password change, and replay revocation.
   - `test/users.controller.e2e-spec.ts`: Verification of directory field projection, self-promotion rejection, and account deactivation.
3. **Static Analysis & Supply-Chain Audits**:
   - `pnpm audit`: Verifies 0 high or critical vulnerabilities across production and development dependency graphs.
   - `pnpm lint`: Oxlint and Biome enforcing type-aware linting, secure coding practices, and zero unbound method leaks.
   - GitHub Actions `security.yml`: Runs Semgrep Community Edition SAST rules on every push and pull request.
