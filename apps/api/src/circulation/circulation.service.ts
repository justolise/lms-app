import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service.js';
import {
  auditLogs,
  catalogueItems,
  copies,
  fineEntries,
  loanPolicies,
  loans,
  memberProfiles,
  users,
} from '../database/schema.js';
import { type FulfillHoldResult, HoldsService } from '../holds/holds.service.js';
import { RedisService } from '../redis/redis.service.js';
import type { CheckoutDto } from './dto/checkout.dto.js';
import type { ReturnLoanDto } from './dto/return-loan.dto.js';

// Africa/Nairobi is UTC+3 (no DST)
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Return the number of whole Africa/Nairobi calendar days a loan is overdue. */
function computeOverdueDays(dueAt: Date, now: Date): number {
  // Shift both timestamps to Nairobi wall-clock, then compare date portions
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
  return Math.max(diffDays , 0);
}

/** Compute the due-at timestamp: end of the due local date in Africa/Nairobi. */
function computeDueAt(checkedOutAt: Date, loanDurationDays: number): Date {
  const localCheckout = new Date(checkedOutAt.getTime() + NAIROBI_OFFSET_MS);
  // Add loan days
  const dueLocal = new Date(localCheckout);
  dueLocal.setUTCDate(dueLocal.getUTCDate() + loanDurationDays);
  // End of that local date = 23:59:59.999 Nairobi = subtract offset
  const endOfDueLocal = Date.UTC(
    dueLocal.getUTCFullYear(),
    dueLocal.getUTCMonth(),
    dueLocal.getUTCDate(),
    23,
    59,
    59,
    999,
  );
  return new Date(endOfDueLocal - NAIROBI_OFFSET_MS);
}

/** Compute fine in minor units, capped at maxFineMinorUnits. */
function computeFine(
  overdueDays: number,
  gracePeriodDays: number,
  dailyFineMinorUnits: number,
  maxFineMinorUnits: number,
): number {
  const billableDays = Math.max(0, overdueDays - gracePeriodDays);
  const rawFine = billableDays * dailyFineMinorUnits;
  return maxFineMinorUnits > 0 ? Math.min(rawFine, maxFineMinorUnits) : rawFine;
}

@Injectable()
export class CirculationService {
  constructor(
    private readonly database: DatabaseService,
    @Optional() private readonly holdsService?: HoldsService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  private async invalidateCache(tenantId: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(`cache:catalogue:${tenantId}`);
      } catch {
        // Non-blocking
      }
    }
  }

  // ─── Checkout (CIR-1, CIR-4, CIR-5) ───────────────────────────────────────

  async checkout(
    tenantId: string,
    actorId: string,
    actorRole: string,
    dto: CheckoutDto,
  ) {
    const isLibrarian = actorRole === 'ADMIN' || actorRole === 'LIBRARIAN';

    const result = await this.database.withTenant(tenantId, async (tx) => {
      // ── Idempotency check ───────────────────────────────────
      if (dto.idempotencyKey) {
        const [existing] = await tx
          .select()
          .from(loans)
          .where(
            and(
              eq(loans.tenantId, tenantId),
              eq(loans.idempotencyKey, dto.idempotencyKey),
            ),
          )
          .limit(1);
        if (existing) return existing;
      }

      // ── Resolve copy by barcode ─────────────────────────────
      const [copy] = await tx
        .select()
        .from(copies)
        .where(
          and(eq(copies.tenantId, tenantId), eq(copies.barcode, dto.barcode)),
        )
        .limit(1)
        .for('update');

      if (!copy) throw new NotFoundException('Copy not found');

      // Hard block: copy must be AVAILABLE or RESERVED
      if (copy.status !== 'AVAILABLE' && copy.status !== 'RESERVED') {
        throw new UnprocessableEntityException(
          `Copy is not available for checkout (status: ${copy.status})`,
        );
      }

      // ── Resolve member ──────────────────────────────────────
      // memberIdentifier may be a UUID, email, or admission number
      const memberRows = await tx
        .select({
          userId: users.id,
          role: users.role,
          status: users.status,
          memberTypeId: memberProfiles.memberTypeId,
          membershipExpiresAt: memberProfiles.membershipExpiresAt,
        })
        .from(users)
        .leftJoin(
          memberProfiles,
          and(
            eq(memberProfiles.tenantId, tenantId),
            eq(memberProfiles.userId, users.id),
          ),
        )
        .where(
          and(
            eq(users.tenantId, tenantId),
            sql`(
              ${users.id}::text = ${dto.memberIdentifier}
              OR lower(${users.email}) = lower(${dto.memberIdentifier})
              OR ${memberProfiles.admissionNumber} = ${dto.memberIdentifier}
            )`,
          ),
        )
        .limit(1);

      if (!memberRows.length)
        throw new NotFoundException('Member not found');

      const member = memberRows[0];

      // If copy is RESERVED, verify that the member is the approved claimant (HLD-1)
      let claimedHoldId: string | null = null;
      if (copy.status === 'RESERVED') {
        if (!this.holdsService) {
          throw new UnprocessableEntityException(
            'Copy is on hold and holds service is not available',
          );
        }
        const claimantCheck = await this.holdsService.verifyClaimantForCheckout(
          tx,
          tenantId,
          copy.id,
          member.userId,
        );
        claimedHoldId = claimantCheck.holdId;
      }

      if (!member.memberTypeId) {
        throw new UnprocessableEntityException(
          'Member has no member type assigned',
        );
      }

      // ── Resolve loan policy (CIR-4) ─────────────────────────
      // Look up the catalogue item to get its format
      const [catalogueItem] = await tx
        .select({ format: catalogueItems.format })
        .from(catalogueItems)
        .where(
          and(
            eq(catalogueItems.tenantId, tenantId),
            eq(catalogueItems.id, copy.catalogueItemId),
          ),
        )
        .limit(1);

      if (!catalogueItem)
        throw new NotFoundException('Catalogue item not found');

      const [policy] = await tx
        .select()
        .from(loanPolicies)
        .where(
          and(
            eq(loanPolicies.tenantId, tenantId),
            eq(loanPolicies.memberTypeId, member.memberTypeId),
            eq(loanPolicies.itemFormat, catalogueItem.format),
          ),
        )
        .limit(1);

      if (!policy) {
        throw new UnprocessableEntityException(
          `No loan policy found for member type "${member.memberTypeId}" and format "${catalogueItem.format}". ` +
            'Please configure one before checking out.',
        );
      }

      // ── CIR-5 soft blocks (overridable by ADMIN/LIBRARIAN) ──
      const now = new Date();
      const softBlocks: string[] = [];

      if (member.status === 'SUSPENDED') {
        softBlocks.push('Member account is suspended');
      }

      if (
        member.membershipExpiresAt &&
        new Date(member.membershipExpiresAt) < now
      ) {
        softBlocks.push('Membership has expired');
      }

      // Check outstanding fine balance against policy threshold (CIR-5)
      const [fineSum] = await tx
        .select({
          charges: sql<number>`coalesce(sum(case when ${fineEntries.entryType} = 'CHARGE' then ${fineEntries.amountMinorUnits} else 0 end), 0)`,
          credits: sql<number>`coalesce(sum(case when ${fineEntries.entryType} in ('PAYMENT', 'WAIVER') then ${fineEntries.amountMinorUnits} else 0 end), 0)`,
        })
        .from(fineEntries)
        .where(
          and(
            eq(fineEntries.tenantId, tenantId),
            eq(fineEntries.userId, member.userId),
          ),
        );

      const fineBalance =
        (Number(fineSum?.charges) || 0) - (Number(fineSum?.credits) || 0);
      const fineThreshold =
        policy.maxFineMinorUnits > 0 ? policy.maxFineMinorUnits : 0;

      if (fineThreshold > 0 && fineBalance >= fineThreshold) {
        softBlocks.push(
          `Outstanding fine balance of KES ${(fineBalance / 100).toFixed(2)} exceeds threshold of KES ${(fineThreshold / 100).toFixed(2)}`,
        );
      }

      if (softBlocks.length > 0) {
        if (!isLibrarian) {
          throw new ForbiddenException(softBlocks.join('; '));
        }
        if (!dto.overrideReason) {
          throw new ForbiddenException(
            `Override reason required to bypass: ${softBlocks.join('; ')}`,
          );
        }
      }

      // ── Hard block: max concurrent loans (NOT overridable) ──
      const [{ activeCount }] = await tx
        .select({ activeCount: sql<number>`COUNT(*)::int` })
        .from(loans)
        .where(
          and(
            eq(loans.tenantId, tenantId),
            eq(loans.userId, member.userId),
            eq(loans.status, 'ACTIVE'),
          ),
        );

      if (activeCount >= policy.maxConcurrentLoans) {
        throw new UnprocessableEntityException(
          `Member has reached the maximum of ${policy.maxConcurrentLoans} concurrent loans`,
        );
      }

      // ── Compute due date ────────────────────────────────────
      const dueAt = computeDueAt(now, policy.loanDurationDays);

      // ── Insert loan ─────────────────────────────────────────
      const [loan] = await tx
        .insert(loans)
        .values({
          tenantId,
          userId: member.userId,
          copyId: copy.id,
          catalogueItemId: copy.catalogueItemId,
          loanDurationDays: policy.loanDurationDays,
          maxRenewals: policy.maxRenewals,
          gracePeriodDays: policy.gracePeriodDays,
          dailyFineMinorUnits: policy.dailyFineMinorUnits,
          maxFineMinorUnits: policy.maxFineMinorUnits,
          checkedOutAt: now,
          dueAt,
          status: 'ACTIVE',
          idempotencyKey: dto.idempotencyKey ?? null,
          overrideReason:
            softBlocks.length > 0 ? (dto.overrideReason ?? null) : null,
          overrideActorId:
            softBlocks.length > 0 ? actorId : null,
        })
        .returning();

      // ── Update copy status ──────────────────────────────────
      const updatedCopies = await tx
        .update(copies)
        .set({ status: 'ON_LOAN', updatedAt: now })
        .where(
          and(
            eq(copies.tenantId, tenantId),
            eq(copies.id, copy.id),
            inArray(copies.status, ['AVAILABLE', 'RESERVED']),
          ),
        )
        .returning({ id: copies.id });

      if (updatedCopies.length === 0) {
        throw new ConflictException(
          'Copy status changed concurrently; checkout cannot proceed',
        );
      }

      // ── Fulfill hold if copy was claimed (HLD-1) ─────────────
      if (claimedHoldId && this.holdsService) {
        await this.holdsService.fulfillHoldOnCheckout(
          tx,
          tenantId,
          claimedHoldId,
        );
      }

      // ── Audit log ───────────────────────────────────────────
      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'circulation.checkout',
        entityType: 'loan',
        entityId: loan.id,
        metadata: {
          copyId: copy.id,
          barcode: copy.barcode,
          userId: member.userId,
          dueAt: dueAt.toISOString(),
          overrideReason: dto.overrideReason,
        },
      });

      return loan;
    });

    await this.invalidateCache(tenantId);
    return result;
  }

  // ─── Return (CIR-2) ────────────────────────────────────────────────────────

  async returnLoan(tenantId: string, actorId: string, dto: ReturnLoanDto) {
    const result = await this.database.withTenant(tenantId, async (tx) => {
      // ── Idempotency check ───────────────────────────────────
      if (dto.idempotencyKey) {
        // A returned loan already has returnedAt set; look up by idempotency key
        const [existing] = await tx
          .select()
          .from(loans)
          .where(
            and(
              eq(loans.tenantId, tenantId),
              eq(loans.idempotencyKey, dto.idempotencyKey),
              eq(loans.status, 'RETURNED'),
            ),
          )
          .limit(1);
        if (existing) return existing;
      }

      // ── Resolve copy ────────────────────────────────────────
      const [copy] = await tx
        .select()
        .from(copies)
        .where(
          and(eq(copies.tenantId, tenantId), eq(copies.barcode, dto.barcode)),
        )
        .limit(1);

      if (!copy) throw new NotFoundException('Copy not found');

      // ── Find active loan ────────────────────────────────────
      const [loan] = await tx
        .select()
        .from(loans)
        .where(
          and(
            eq(loans.tenantId, tenantId),
            eq(loans.copyId, copy.id),
            eq(loans.status, 'ACTIVE'),
          ),
        )
        .limit(1)
        .for('update');

      if (!loan) {
        throw new NotFoundException(
          'No active loan found for this copy',
        );
      }

      const now = new Date();

      // ── Compute fine ────────────────────────────────────────
      const overdueDays = computeOverdueDays(loan.dueAt, now);
      const fineMinorUnits = computeFine(
        overdueDays,
        loan.gracePeriodDays,
        loan.dailyFineMinorUnits,
        loan.maxFineMinorUnits,
      );

      // ── Update loan ─────────────────────────────────────────
      const [returned] = await tx
        .update(loans)
        .set({
          status: 'RETURNED',
          returnedAt: now,
          fineMinorUnits,
          updatedAt: now,
          idempotencyKey: dto.idempotencyKey ?? loan.idempotencyKey,
        })
        .where(
          and(
            eq(loans.tenantId, tenantId),
            eq(loans.id, loan.id),
          ),
        )
        .returning();

      // ── Post fine charge to ledger (FIN-1, FIN-2) ───────────
      if (fineMinorUnits > 0) {
        await tx.insert(fineEntries).values({
          tenantId,
          userId: loan.userId,
          loanId: loan.id,
          entryType: 'CHARGE',
          amountMinorUnits: fineMinorUnits,
          notes: `Overdue return fine (${overdueDays} days late, ${loan.gracePeriodDays} days grace)`,
        });
      }

      // ── Process holds or update copy status (HLD-2) ─────────
      let holdResult: FulfillHoldResult = { holdFulfilled: false };
      if (this.holdsService) {
        holdResult = await this.holdsService.fulfillNextHoldOnReturn(
          tx,
          tenantId,
          loan.catalogueItemId,
          copy.id,
        );
      } else {
        await tx
          .update(copies)
          .set({ status: 'AVAILABLE', updatedAt: now })
          .where(and(eq(copies.tenantId, tenantId), eq(copies.id, copy.id)));
      }

      // ── Audit log ───────────────────────────────────────────
      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'circulation.return',
        entityType: 'loan',
        entityId: loan.id,
        metadata: {
          copyId: copy.id,
          barcode: copy.barcode,
          overdueDays,
          fineMinorUnits,
          holdFulfilled: holdResult.holdFulfilled,
        },
      });

      return {
        loan: returned,
        overdueDays,
        fineMinorUnits,
        fineKes: fineMinorUnits / 100,
        holdFulfilled: holdResult.holdFulfilled,
        claimantUserId: holdResult.claimantUserId,
        holdExpiresAt: holdResult.expiresAt,
      };
    });

    await this.invalidateCache(tenantId);
    return result;
  }

  // ─── Renew (CIR-3) ─────────────────────────────────────────────────────────

  async renew(tenantId: string, actorId: string, loanId: string) {
    return this.database.withTenant(tenantId, async (tx) => {
      // Fetch loan
      const [loan] = await tx
        .select()
        .from(loans)
        .where(
          and(
            eq(loans.tenantId, tenantId),
            eq(loans.id, loanId),
            eq(loans.status, 'ACTIVE'),
          ),
        )
        .limit(1)
        .for('update');

      if (!loan) throw new NotFoundException('Active loan not found');

      // Max renewals check
      if (loan.renewalCount >= loan.maxRenewals) {
        throw new UnprocessableEntityException(
          `Maximum renewals (${loan.maxRenewals}) reached`,
        );
      }

      // ── Block renewal if holds are waiting (CIR-3 / HLD-1) ──
      if (this.holdsService) {
        const hasHolds = await this.holdsService.hasActiveHoldsForTitle(
          tx,
          tenantId,
          loan.catalogueItemId,
        );
        if (hasHolds) {
          throw new UnprocessableEntityException(
            'Cannot renew loan: this title has pending holds waiting in queue (HLD-1)',
          );
        }
      }

      const now = new Date();
      const newDueAt = computeDueAt(loan.dueAt, loan.loanDurationDays);

      const [renewed] = await tx
        .update(loans)
        .set({
          dueAt: newDueAt,
          renewalCount: loan.renewalCount + 1,
          status: 'ACTIVE',
          updatedAt: now,
        })
        .where(
          and(
            eq(loans.tenantId, tenantId),
            eq(loans.id, loan.id),
          ),
        )
        .returning();

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'circulation.renew',
        entityType: 'loan',
        entityId: loan.id,
        metadata: {
          renewalCount: renewed.renewalCount,
          newDueAt: newDueAt.toISOString(),
        },
      });

      return renewed;
    });
  }

  // ─── List loans ────────────────────────────────────────────────────────────

  async getLoansByUser(
    tenantId: string,
    userId: string,
    statusFilter?: string,
  ) {
    return this.database.withTenant(tenantId, (tx) => {
      const conditions = [
        eq(loans.tenantId, tenantId),
        eq(loans.userId, userId),
      ];
      if (statusFilter) {
        conditions.push(eq(loans.status, statusFilter as 'ACTIVE'));
      }
      return tx
        .select({
          id: loans.id,
          tenantId: loans.tenantId,
          userId: loans.userId,
          copyId: loans.copyId,
          copyBarcode: copies.barcode,
          catalogueItemId: loans.catalogueItemId,
          bookTitle: catalogueItems.title,
          bookAuthor: sql<string>`(SELECT string_agg(val, ', ') FROM jsonb_array_elements_text(case when jsonb_typeof(${catalogueItems.authors}) = 'array' then ${catalogueItems.authors} else '[]'::jsonb end) AS t(val))`,
          bookFormat: catalogueItems.format,
          loanDurationDays: loans.loanDurationDays,
          maxRenewals: loans.maxRenewals,
          renewalCount: loans.renewalCount,
          checkedOutAt: loans.checkedOutAt,
          dueAt: loans.dueAt,
          returnedAt: loans.returnedAt,
          status: loans.status,
          fineMinorUnits: loans.fineMinorUnits,
          overrideReason: loans.overrideReason,
          createdAt: loans.createdAt,
        })
        .from(loans)
        .leftJoin(
          catalogueItems,
          and(
            eq(catalogueItems.tenantId, loans.tenantId),
            eq(catalogueItems.id, loans.catalogueItemId),
          ),
        )
        .leftJoin(
          copies,
          and(
            eq(copies.tenantId, loans.tenantId),
            eq(copies.id, loans.copyId),
          ),
        )
        .where(and(...conditions))
        .orderBy(desc(loans.checkedOutAt));
    });
  }

  async getAllLoans(tenantId: string, statusFilter?: string) {
    return this.database.withTenant(tenantId, (tx) => {
      const conditions = [eq(loans.tenantId, tenantId)];
      if (statusFilter) {
        conditions.push(eq(loans.status, statusFilter as 'ACTIVE'));
      }
      return tx
        .select({
          id: loans.id,
          tenantId: loans.tenantId,
          userId: loans.userId,
          copyId: loans.copyId,
          copyBarcode: copies.barcode,
          catalogueItemId: loans.catalogueItemId,
          bookTitle: catalogueItems.title,
          bookAuthor: sql<string>`(SELECT string_agg(val, ', ') FROM jsonb_array_elements_text(case when jsonb_typeof(${catalogueItems.authors}) = 'array' then ${catalogueItems.authors} else '[]'::jsonb end) AS t(val))`,
          bookFormat: catalogueItems.format,
          loanDurationDays: loans.loanDurationDays,
          maxRenewals: loans.maxRenewals,
          renewalCount: loans.renewalCount,
          checkedOutAt: loans.checkedOutAt,
          dueAt: loans.dueAt,
          returnedAt: loans.returnedAt,
          status: loans.status,
          fineMinorUnits: loans.fineMinorUnits,
          overrideReason: loans.overrideReason,
          createdAt: loans.createdAt,
        })
        .from(loans)
        .leftJoin(
          catalogueItems,
          and(
            eq(catalogueItems.tenantId, loans.tenantId),
            eq(catalogueItems.id, loans.catalogueItemId),
          ),
        )
        .leftJoin(
          copies,
          and(
            eq(copies.tenantId, loans.tenantId),
            eq(copies.id, loans.copyId),
          ),
        )
        .where(and(...conditions))
        .orderBy(desc(loans.checkedOutAt));
    });
  }
}
