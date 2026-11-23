# Permission Matrix (v1.0 MVP)

✓ allowed, own = only for own records, ✗ not allowed. Enforced server-side via `AccessTokenGuard` and `RolesGuard` (AUTH-2).

| Action                                         | Admin | Librarian     | Teacher | Member | Parent   | Guest |
| ---------------------------------------------- | ----- | ------------- | ------- | ------ | -------- | ----- |
| Search catalog, see availability               | ✓     | ✓             | ✓       | ✓      | ✓        | ✓     |
| Create/edit/archive titles and copies          | ✓     | ✓             | ✗       | ✗      | ✗        | ✗     |
| Mark copy lost/damaged/withdrawn (INV-2)       | ✓     | ✓             | ✗       | ✗      | ✗        | ✗     |
| Checkout, return for a member                  | ✓     | ✓             | ✗       | ✗      | ✗        | ✗     |
| Renew a loan (CIR-3)                           | ✓     | ✓             | ✗       | ✗      | ✗        | ✗     |
| Override a checkout block (CIR-5), with reason | ✓     | ✓             | ✗       | ✗      | ✗        | ✗     |
| Place a hold                                   | ✓     | ✓ (on behalf) | own     | own    | ✗        | ✗     |
| Cancel a hold                                  | ✓     | ✓ (any)       | own     | own    | ✗        | ✗     |
| View borrowing history and current loans       | ✓     | ✓             | own     | own    | ✗ (v1.0) | ✗     |
| View fines                                     | ✓     | ✓             | own     | own    | ✗        | ✗     |
| Mark fine paid                                 | ✓     | ✓             | ✗       | ✗      | ✗        | ✗     |
| Waive fine, with reason (audited)              | ✓     | ✓             | ✗       | ✗      | ✗        | ✗     |
| Create/edit member accounts, suspend           | ✓     | ✓             | ✗       | ✗      | ✗        | ✗     |
| Change a user's role (audited)                 | ✓     | ✗             | ✗       | ✗      | ✗        | ✗     |
| Library profile and policy settings            | ✓     | ✗             | ✗       | ✗      | ✗        | ✗     |
| Dashboard                                      | ✓     | ✓             | ✗       | ✗      | ✗        | ✗     |
| View tenant audit logs                         | ✓     | ✗             | ✗       | ✗      | ✗        | ✗     |
| Edit own profile and password                  | ✓     | ✓             | ✓       | ✓      | ✓        | ✗     |

*Note: Platform Super Admin operations (tenant onboarding, tenant status suspension/activation, initial library admin provisioning, emergency password resets, system telemetry, and platform audit logs) operate on a dedicated plane outside tenant roles and are accessible only to authenticated Super Admins with active TOTP MFA sessions (`/platform`).*
