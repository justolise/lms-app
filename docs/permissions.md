# Permission matrix (v1.0): PROPOSED DEFAULTS, product owner to correct

✓ allowed, own = only for own records, ✗ not allowed, ? needs your decision. Enforced server-side (AUTH-2).

| Action                                         | Admin | Librarian     | Teacher | Member | Parent   | Guest |
| ---------------------------------------------- | ----- | ------------- | ------- | ------ | -------- | ----- |
| Search catalog, see availability               | ✓     | ✓             | ✓       | ✓      | ✓        | ✓     |
| Create/edit/archive titles and copies          | ✓     | ✓             | ✗       | ✗      | ✗        | ✗     |
| Mark copy lost/damaged/withdrawn (INV-2)       | ✓     | ✓             | ✗       | ✗      | ✗        | ✗     |
| Checkout, return for a member                  | ✓     | ✓             | ✗       | ✗      | ✗        | ✗     |
| Renew a loan                                   | ✓     | ✓             | ?       | ?      | ✗        | ✗     |
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
| View audit log                                 | ✓     | ✗             | ✗       | ✗      | ✗        | ✗     |
| Edit own profile and password                  | ✓     | ✓             | ✓       | ✓      | ✓        | ✗     |

## Questions behind the "?" and defaults

1. Can teachers and members renew their own loans in the portal? The PRD lists renewals (CIR-3) but not who does them. Default if you say nothing: librarian-only in v1.0.
2. Can a teacher see their class's borrowing history? The privacy rule allows "authorised staff" and linked guardians. Default: teachers see only their own history; class views arrive with v4.0 analytics.
3. Should large waivers need an admin? Default: librarian can waive any amount with a reason, and every waiver is audited.
