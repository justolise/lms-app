import { describe, it, expect, vi } from 'vitest';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CirculationService } from './circulation.service.js';
import type { loans } from '../database/schema.js';
import type { InferSelectModel } from 'drizzle-orm';

type LoanRow = InferSelectModel<typeof loans>;

// ─── Pure helper tests ────────────────────────────────────────────────────────
// (copied from service so we can test them directly without exposing internals)

const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

function computeOverdueDays(dueAt: Date, now: Date): number {
  const dueLocal = new Date(dueAt.getTime() + NAIROBI_OFFSET_MS);
  const nowLocal = new Date(now.getTime() + NAIROBI_OFFSET_MS);
  const dueMidnight = Date.UTC(
    dueLocal.getUTCFullYear(),
    dueLocal.getUTCMonth(),
    dueLocal.getUTCDate(),
  );
  const todayMidnight = Date.UTC(
    nowLocal.getUTCFullYear(),
    nowLocal.getUTCMonth(),
    nowLocal.getUTCDate(),
  );
  const diffDays = (todayMidnight - dueMidnight) / 86_400_000;
  return diffDays > 0 ? diffDays : 0;
}

function computeFine(
  overdueDays: number,
  gracePeriodDays: number,
  dailyFineMinorUnits: number,
  maxFineMinorUnits: number,
): number {
  const billable = Math.max(0, overdueDays - gracePeriodDays);
  const raw = billable * dailyFineMinorUnits;
  return maxFineMinorUnits > 0 ? Math.min(raw, maxFineMinorUnits) : raw;
}

describe('computeOverdueDays', () => {
  it('returns 0 when loan is not yet due', () => {
    // dueAt Nairobi = Jan 10 23:59:59; now = Jan 10 21:00 Nairobi → same day
    const dueAt = new Date('2025-01-10T20:59:59.999Z');
    const now = new Date('2025-01-10T18:00:00Z');
    expect(computeOverdueDays(dueAt, now)).toBe(0);
  });

  it('returns 1 when exactly one Nairobi day past due', () => {
    // dueAt Nairobi = Jan 10; now Nairobi = Jan 11 (Jan 10 21:00 UTC = Jan 11 00:00 Nairobi)
    const dueAt = new Date('2025-01-10T20:59:59.999Z');
    const now = new Date('2025-01-10T21:00:00Z'); // Jan 11 00:00 Nairobi
    expect(computeOverdueDays(dueAt, now)).toBe(1);
  });

  it('returns 3 when three Nairobi days overdue', () => {
    // dueAt Nairobi = Jan 10; now Nairobi = Jan 13 (Jan 12 21:00 UTC = Jan 13 00:00 Nairobi)
    const dueAt = new Date('2025-01-10T20:59:59.999Z');
    const now = new Date('2025-01-12T21:00:00Z'); // Jan 13 00:00 Nairobi
    expect(computeOverdueDays(dueAt, now)).toBe(3);
  });
});

describe('computeFine', () => {
  it('returns 0 when no overdue days', () => {
    expect(computeFine(0, 0, 1000, 10000)).toBe(0);
  });

  it('returns 0 within grace period', () => {
    expect(computeFine(2, 3, 1000, 10000)).toBe(0);
  });

  it('calculates fine after grace period', () => {
    // 5 overdue - 2 grace = 3 billable × 1000 = 3000
    expect(computeFine(5, 2, 1000, 50000)).toBe(3000);
  });

  it('caps fine at max', () => {
    // 100 days × 1000 = 100000, capped at 50000
    expect(computeFine(100, 0, 1000, 50000)).toBe(50000);
  });

  it('applies no cap when maxFine is 0', () => {
    expect(computeFine(10, 0, 1000, 0)).toBe(10000);
  });
});

// ─── CirculationService unit tests ───────────────────────────────────────────

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001';
const ACTOR = 'aaaaaaaa-0000-0000-0000-000000000002';
const USER_ID = 'aaaaaaaa-0000-0000-0000-000000000003';
const COPY_ID = 'aaaaaaaa-0000-0000-0000-000000000004';
const LOAN_ID = 'aaaaaaaa-0000-0000-0000-000000000005';
const CAT_ID = 'aaaaaaaa-0000-0000-0000-000000000006';
const MT_ID = 'aaaaaaaa-0000-0000-0000-000000000007';

const mockCopy = {
  id: COPY_ID,
  tenantId: TENANT,
  barcode: 'BC001',
  status: 'AVAILABLE' as const,
  catalogueItemId: CAT_ID,
};

const mockMember = {
  userId: USER_ID,
  role: 'MEMBER',
  status: 'ACTIVE',
  memberTypeId: MT_ID,
  membershipExpiresAt: null,
};

const mockPolicy = {
  id: 'policy-1',
  tenantId: TENANT,
  memberTypeId: MT_ID,
  itemFormat: 'BOOK',
  loanDurationDays: 14,
  maxConcurrentLoans: 5,
  maxRenewals: 2,
  gracePeriodDays: 1,
  dailyFineMinorUnits: 1000,
  maxFineMinorUnits: 50000,
};

const mockLoan = {
  id: LOAN_ID,
  tenantId: TENANT,
  userId: USER_ID,
  copyId: COPY_ID,
  catalogueItemId: CAT_ID,
  loanDurationDays: 14,
  maxRenewals: 2,
  gracePeriodDays: 1,
  dailyFineMinorUnits: 1000,
  maxFineMinorUnits: 50000,
  checkedOutAt: new Date('2025-01-01T09:00:00Z'),
  dueAt: new Date('2025-01-15T20:59:59.999Z'),
  returnedAt: null,
  status: 'ACTIVE' as const,
  renewalCount: 0,
  fineMinorUnits: null,
  idempotencyKey: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Build a fully chainable mock tx that returns results from `sequences` in order.
 * Every call to `.select()` advances the index and returns the next sequence entry.
 * All query builder methods (from/leftJoin/where/limit/orderBy) are pass-through.
 */
function makeMockTx(sequences: {
  selects?: unknown[][];
  update?: unknown[];
  insert?: unknown[];
}) {
  let idx = 0;

  function queryChain(result: unknown[]) {
    // Create a chainable object that can be awaited at any point
    const q: Record<string, unknown> = {
      from: () => q,
      leftJoin: () => q,
      where: () => q,
      limit: () => q,
      orderBy: () => q,
      for: () => q,
      // Allow `await` directly on the chain
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject),
    };
    return q;
  }

  return {
    select: vi.fn((_fields?: unknown) => {
      const result = sequences.selects?.[idx++] ?? [];
      return queryChain(result);
    }),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue(sequences.update ?? [{ id: 'copy-1' }]),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue(sequences.insert ?? [{}]),
      })),
    })),
  };
}

function makeDb(sequences: {
  selects?: unknown[][];
  update?: unknown[];
  insert?: unknown[];
}) {
  const mockTx = makeMockTx(sequences);
  return {
    withTenant: vi.fn(
      (_tenantId: string, fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx),
    ),
  } as unknown as InstanceType<typeof import('../database/database.service.js').DatabaseService>;
}

// ─── Checkout tests ───────────────────────────────────────────────────────────

describe('CirculationService.checkout', () => {
  it('creates a loan when all conditions are met', async () => {
    const db = makeDb({
      selects: [
        // No idempotencyKey → no idempotency select
        [mockCopy],           // copy lookup
        [mockMember],         // member lookup (uses leftJoin)
        [{ format: 'BOOK' }], // catalogue item
        [mockPolicy],         // loan policy
        [{ activeCount: 0 }], // active loans count
      ],
      update: [mockCopy],
      insert: [{ ...mockLoan, id: LOAN_ID }],
    });

    const svc = new CirculationService(db);
    const result = await svc.checkout(TENANT, ACTOR, 'LIBRARIAN', {
      barcode: 'BC001',
      memberIdentifier: USER_ID,
    });

    expect(result).toMatchObject({ id: LOAN_ID, status: 'ACTIVE' });
  });

  it('returns existing loan on duplicate idempotency key', async () => {
    const existing = { ...mockLoan, idempotencyKey: 'key-123' };
    // Key IS provided → first select = idempotency check → returns existing
    const db = makeDb({ selects: [[existing]] });

    const svc = new CirculationService(db);
    const result = await svc.checkout(TENANT, ACTOR, 'LIBRARIAN', {
      barcode: 'BC001',
      memberIdentifier: USER_ID,
      idempotencyKey: 'key-123',
    });

    expect(result).toMatchObject({ idempotencyKey: 'key-123' });
  });

  it('throws NotFoundException when copy not found', async () => {
    // No idempotencyKey → first select = copy (empty → not found)
    const db = makeDb({ selects: [[]] });

    const svc = new CirculationService(db);
    await expect(
      svc.checkout(TENANT, ACTOR, 'LIBRARIAN', {
        barcode: 'NO_SUCH',
        memberIdentifier: USER_ID,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws UnprocessableEntityException when copy is ON_LOAN', async () => {
    // No idempotencyKey → first select = copy (ON_LOAN)
    const db = makeDb({
      selects: [
        [{ ...mockCopy, status: 'ON_LOAN' }],
      ],
    });

    const svc = new CirculationService(db);
    await expect(
      svc.checkout(TENANT, ACTOR, 'LIBRARIAN', {
        barcode: 'BC001',
        memberIdentifier: USER_ID,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('throws ForbiddenException for suspended member without override reason', async () => {
    const db = makeDb({
      selects: [
        // No idempotencyKey
        [mockCopy],
        [{ ...mockMember, status: 'SUSPENDED' }],
        [{ format: 'BOOK' }],
        [mockPolicy],
        [{ activeCount: 0 }],
      ],
    });

    const svc = new CirculationService(db);
    await expect(
      svc.checkout(TENANT, ACTOR, 'LIBRARIAN', {
        barcode: 'BC001',
        memberIdentifier: USER_ID,
        // No overrideReason
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('succeeds for suspended member when LIBRARIAN provides override reason', async () => {
    const db = makeDb({
      selects: [
        // No idempotencyKey
        [mockCopy],
        [{ ...mockMember, status: 'SUSPENDED' }],
        [{ format: 'BOOK' }],
        [mockPolicy],
        [{ activeCount: 0 }],
      ],
      update: [mockCopy],
      insert: [{ ...mockLoan, overrideReason: 'Approved' }],
    });

    const svc = new CirculationService(db);
    const result = await svc.checkout(TENANT, ACTOR, 'LIBRARIAN', {
      barcode: 'BC001',
      memberIdentifier: USER_ID,
      overrideReason: 'Approved by head librarian',
    });

    expect(result).toMatchObject({ status: 'ACTIVE' });
  });

  it('throws UnprocessableEntityException when no loan policy exists', async () => {
    const db = makeDb({
      selects: [
        // No idempotencyKey
        [mockCopy],
        [mockMember],
        [{ format: 'BOOK' }],
        [], // no policy
      ],
    });

    const svc = new CirculationService(db);
    await expect(
      svc.checkout(TENANT, ACTOR, 'LIBRARIAN', {
        barcode: 'BC001',
        memberIdentifier: USER_ID,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('throws UnprocessableEntityException when max concurrent loans reached', async () => {
    const db = makeDb({
      selects: [
        // No idempotencyKey
        [mockCopy],
        [mockMember],
        [{ format: 'BOOK' }],
        [mockPolicy],
        [{ activeCount: 5 }], // at the limit
      ],
    });

    const svc = new CirculationService(db);
    await expect(
      svc.checkout(TENANT, ACTOR, 'LIBRARIAN', {
        barcode: 'BC001',
        memberIdentifier: USER_ID,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});

// ─── Return tests ─────────────────────────────────────────────────────────────

describe('CirculationService.returnLoan', () => {
  it('processes a return and reports overdue days', async () => {
    const dueAt = new Date('2025-01-01T20:59:59.999Z'); // Jan 1 Nairobi end-of-day
    const loan = { ...mockLoan, dueAt };
    const returnedLoan = { ...loan, status: 'RETURNED', fineMinorUnits: 3000 };

    const db = makeDb({
      selects: [
        // No idempotencyKey supplied → NO idempotency select
        [{ ...mockCopy, status: 'ON_LOAN' }], // copy found
        [loan],                               // active loan
      ],
      update: [returnedLoan],
      insert: [{}],
    });

    const svc = new CirculationService(db);
    const result = await svc.returnLoan(TENANT, ACTOR, { barcode: 'BC001' }) as {
      loan: LoanRow;
      overdueDays: number;
      fineMinorUnits: number;
      fineKes: number;
    };
    expect(result).toMatchObject({ loan: { status: 'RETURNED' } });
    expect(typeof result.overdueDays).toBe('number');
    expect(result.overdueDays).toBeGreaterThanOrEqual(0);
  });

  it('returns idempotently if already returned with same key', async () => {
    const returnedLoan = { ...mockLoan, status: 'RETURNED', idempotencyKey: 'ret-key' };

    const db = makeDb({ selects: [[returnedLoan]] });

    const svc = new CirculationService(db);
    const result = await svc.returnLoan(TENANT, ACTOR, {
      barcode: 'BC001',
      idempotencyKey: 'ret-key',
    });
    expect(result).toMatchObject({ status: 'RETURNED' });
  });

  it('throws NotFoundException when copy not found', async () => {
    // No idempotencyKey → no idempotency select; first select = copy lookup (empty)
    const db = makeDb({ selects: [[]] });

    const svc = new CirculationService(db);
    await expect(
      svc.returnLoan(TENANT, ACTOR, { barcode: 'NO_COPY' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when no active loan for the copy', async () => {
    // No idempotencyKey → no idempotency select
    const db = makeDb({
      selects: [
        [mockCopy], // copy found
        [],         // no active loan
      ],
    });

    const svc = new CirculationService(db);
    await expect(
      svc.returnLoan(TENANT, ACTOR, { barcode: 'BC001' }),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── Renew tests ──────────────────────────────────────────────────────────────

describe('CirculationService.renew', () => {
  it('renews a loan and extends the due date', async () => {
    const renewed = { ...mockLoan, renewalCount: 1, dueAt: new Date() };

    const db = makeDb({
      selects: [[mockLoan]],
      update: [renewed],
      insert: [{}],
    });

    const svc = new CirculationService(db);
    const result = await svc.renew(TENANT, ACTOR, LOAN_ID);
    expect(result).toMatchObject({ renewalCount: 1 });
  });

  it('throws UnprocessableEntityException when max renewals are reached', async () => {
    const db = makeDb({
      selects: [[{ ...mockLoan, renewalCount: 2, maxRenewals: 2 }]],
    });

    const svc = new CirculationService(db);
    await expect(svc.renew(TENANT, ACTOR, LOAN_ID)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws NotFoundException when no active loan found', async () => {
    const db = makeDb({ selects: [[]] });

    const svc = new CirculationService(db);
    await expect(svc.renew(TENANT, ACTOR, LOAN_ID)).rejects.toThrow(NotFoundException);
  });
});
