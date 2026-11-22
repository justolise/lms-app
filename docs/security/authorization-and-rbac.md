# Authorization and RBAC Architecture

## Roles & Matrix
The system implements six well-defined roles across all library operations:
1. **ADMIN**: Full administrative control within the tenant library (policy configuration, staff creation, promotion, copy withdrawal, archiving).
2. **LIBRARIAN**: Operational circulation desk operations (checkout, return, renewals, hold fulfillment, catalogue item/copy management, patron registration).
3. **TEACHER**: Educational patron with elevated borrowing durations/limits. Access to personal borrowing history and self-service profile.
4. **MEMBER**: Standard student or community patron. Self-service profile, borrowing history, hold placement.
5. **PARENT**: Account for parents/guardians. Self-service profile only; child borrowing visibility deferred to v4.0.
6. **GUEST**: Anonymous public user. Read-only search and bibliographic catalogue viewing. Zero JWT/session, zero access to circulation or patron records.

## Enforcement Architecture
- **AccessTokenGuard**: Validates JWT access token, confirms active database session with `users.status = 'ACTIVE'`, and enforces first-login mandatory password change isolation.
- **RolesGuard**: Inspects route and class-level metadata populated by `@Roles(...)`. Fails closed if token role is not in the allowed list.
- **Object-Level Authorization (BOLA/IDOR Defense)**:
  - `CirculationController.listLoans`: Non-staff roles are forced to `actorId`, completely ignoring any query `userId`.
  - `HoldsController.cancelHold`: Patrons can cancel only holds where `hold.userId === actorId`.
  - `UsersController.promoteLibrarian`: Self-promotion explicitly forbidden (`actorId === targetUserId` throws 400).
  - `ProfileController`: Strict mapping to `request.user.userId`.
