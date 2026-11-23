# Business Rules (v1.0 MVP) — APPROVED & IMPLEMENTED

Covers CIR-1 to 5, CIR-9, HLD-1 to 3, FIN-1 and 2, NOT-1 and 2. All rules are fully verified in automated test suites and live database services.

## Time

- Timezone is `Africa/Nairobi`; stored in UTC. **[decide]** A loan is due at 23:59:59 local time on the due day (due date = checkout day + loan_days, counted in calendar days).
- A loan is overdue from 00:00 the next local day.

## Checkout (CIR-1, 4, 5)

Checkout succeeds only if all hold:

1. Copy status is `available`, or `on_hold` and its ready hold belongs to this member (checkout then fulfils the hold). Copies that are `lost`, `damaged`, `withdrawn`, `in_repair` or on loan can never be checked out.
2. Member is active (not suspended or archived) and membership not expired.
3. Member's outstanding fine balance is below the configured threshold.
4. Member's current loans are below the `max_items` of their policy (member type + item format).
5. Policy exists for the member type and item format; otherwise checkout is refused with a clear message (no silent default).

Blocks 2 and 3 can be overridden by a librarian or admin with a mandatory reason, logged in `audit_logs` and on the loan. **[decide]** Block 4 (max items) and block 1 cannot be overridden in v1.0.

A repeated request with the same idempotency key returns the original result and never creates a second loan.

## Return (CIR-2, CIR-9)

- Return closes the loan, computes the fine (below) and posts a ledger charge if greater than zero.
- If waiting holds exist for the title, the copy becomes `on_hold` and the first hold (FIFO) becomes `ready`; otherwise the copy becomes `available`.
- Returning a copy flagged damaged sets status `damaged` with a reason and an optional charge entered by the librarian.
- Marking a copy `lost` closes the loan and posts a replacement charge. **[decide]** The amount is entered by the librarian at that moment (the schema has no price field; adding `replacement_cost` to works is a possible change I would propose first). If a lost copy is later found, it becomes `available`; the charge stays unless the librarian waives it.

## Renewal (CIR-3)

Renewal is allowed only if: renewals used < `max_renewals`; no hold is waiting on the title; member is active, not expired, and below the fine threshold (block 3 above); the copy is not lost. **[decide]** New due date = renewal day + `loan_days` (end of day), not extended from the old due date. **[decide]** An already-overdue loan may be renewed only if the above hold; the accrued fine stays and is posted when the item is finally returned.

## Fines (FIN-1, FIN-2)

- Fine days = whole local calendar days late, minus `grace_days`, never below 0. **[decide]** All calendar days count, including weekends and closed days (no holiday calendar in v1.0).
- Fine = fine days × `amount_per_day`, limited to `cap_amount` per loan if a cap is set. Rule is chosen by item format.
- Charges post at return or when marked lost (not nightly). Accruing amounts for unreturned loans are shown live on the member profile, not stored.
- The ledger is append-only: `charge`, `payment`, `waiver`. Balance = charges - payments - waivers. Partial payments are allowed. Waivers require a reason and are audited. Payments generate a receipt number (FIN-3, P1).

## Holds (HLD-1, 2, 3)

- A hold can be placed only on a title that has no available copy. One active hold per member per title. A member who currently has the title on loan cannot place a hold on it.
- Queue order is FIFO by hold creation time.
- When a copy becomes available and a waiting hold exists, the hold becomes `ready` with `expires_at` = now + `hold_expiry_hours` (**[decide]** default 72 hours, configurable). The member is notified immediately.
- If the ready hold expires, it becomes `expired` and the next waiting hold gets the copy; if none, the copy becomes `available`.
- A member can cancel their own hold; a librarian can cancel any hold. Cancelling a ready hold passes the copy to the next in queue.
- If a copy is lost or withdrawn while a hold is ready on it, the hold goes back to `waiting` at its original queue position and is matched to the next available copy.

## Notifications (NOT-1, 2)

- Due soon: **[decide]** 2 days before due. Overdue: the day after due, then every 7 days. Hold ready: immediately. Fine posted: at return.
- Channel: email and SMS, according to the contact details on the member profile. **[decide]** SMS is not sent between 20:00 and 07:00 local time; it is queued until morning.
- Each notification has a dedupe key, so retries never send duplicates. Failed sends are retried with backoff and the final status is recorded.
- Messages contain no borrowing details beyond the book title and date.
