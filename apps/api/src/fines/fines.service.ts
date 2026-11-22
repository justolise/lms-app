import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';

import { DatabaseService } from '../database/database.service.js';
import {
  auditLogs,
  catalogueItems,
  fineEntries,
  loans,
  users,
} from '../database/schema.js';
import { ListLedgerDto } from './dto/list-ledger.dto.js';
import { RecordPaymentDto } from './dto/record-payment.dto.js';
import { WaiveFineDto } from './dto/waive-fine.dto.js';

export interface MemberFineBalance {
  userId: string;
  totalChargedMinorUnits: number;
  totalPaidMinorUnits: number;
  totalWaivedMinorUnits: number;
  balanceMinorUnits: number;
  balanceKes: number;
}

@Injectable()
export class FinesService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Compute member's current outstanding fine balance (charges - payments - waivers).
   */
  async getMemberBalance(
    tenantId: string,
    userId: string,
  ): Promise<MemberFineBalance> {
    return this.database.withTenant(tenantId, async (tx) => {
      // Confirm user exists within this tenant
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.id, userId)))
        .limit(1);

      if (!user) {
        throw new NotFoundException('Member not found');
      }

      const rows = await tx
        .select({
          entryType: fineEntries.entryType,
          total: sql<number>`coalesce(sum(${fineEntries.amountMinorUnits}), 0)`,
        })
        .from(fineEntries)
        .where(
          and(
            eq(fineEntries.tenantId, tenantId),
            eq(fineEntries.userId, userId),
          ),
        )
        .groupBy(fineEntries.entryType);

      let totalCharged = 0;
      let totalPaid = 0;
      let totalWaived = 0;

      for (const row of rows) {
        const val = Number(row.total) || 0;
        if (row.entryType === 'CHARGE') totalCharged += val;
        else if (row.entryType === 'PAYMENT') totalPaid += val;
        else if (row.entryType === 'WAIVER') totalWaived += val;
      }

      const balanceMinorUnits = Math.max(
        0,
        totalCharged - totalPaid - totalWaived,
      );

      return {
        userId,
        totalChargedMinorUnits: totalCharged,
        totalPaidMinorUnits: totalPaid,
        totalWaivedMinorUnits: totalWaived,
        balanceMinorUnits,
        balanceKes: balanceMinorUnits / 100,
      };
    });
  }

  /**
   * List append-only ledger entries with patron and item metadata.
   */
  async listLedger(tenantId: string, dto: ListLedgerDto) {
    return this.database.withTenant(tenantId, async (tx) => {
      const conditions = [eq(fineEntries.tenantId, tenantId)];

      if (dto.userId) {
        conditions.push(eq(fineEntries.userId, dto.userId));
      }
      if (dto.entryType) {
        conditions.push(eq(fineEntries.entryType, dto.entryType));
      }

      const rows = await tx
        .select({
          id: fineEntries.id,
          tenantId: fineEntries.tenantId,
          userId: fineEntries.userId,
          patronName: users.fullName,
          patronEmail: users.email,
          patronPhone: users.phone,
          loanId: fineEntries.loanId,
          bookTitle: catalogueItems.title,
          entryType: fineEntries.entryType,
          amountMinorUnits: fineEntries.amountMinorUnits,
          amountKes: sql<number>`(${fineEntries.amountMinorUnits}::numeric / 100)`,
          paymentMethod: fineEntries.paymentMethod,
          paymentReference: fineEntries.paymentReference,
          receiptNumber: fineEntries.receiptNumber,
          waiverReason: fineEntries.waiverReason,
          actorId: fineEntries.actorId,
          notes: fineEntries.notes,
          createdAt: fineEntries.createdAt,
        })
        .from(fineEntries)
        .innerJoin(
          users,
          and(
            eq(users.tenantId, fineEntries.tenantId),
            eq(users.id, fineEntries.userId),
          ),
        )
        .leftJoin(
          loans,
          and(
            eq(loans.tenantId, fineEntries.tenantId),
            eq(loans.id, fineEntries.loanId),
          ),
        )
        .leftJoin(
          catalogueItems,
          and(
            eq(catalogueItems.tenantId, fineEntries.tenantId),
            eq(catalogueItems.id, loans.catalogueItemId),
          ),
        )
        .where(and(...conditions))
        .orderBy(desc(fineEntries.createdAt))
        .limit(dto.limit)
        .offset(dto.offset);

      return rows;
    });
  }

  /**
   * Record a fine payment with unique receipt number (FIN-2, FIN-3).
   */
  async recordPayment(
    tenantId: string,
    actorId: string,
    dto: RecordPaymentDto,
  ) {
    return this.database.withTenant(tenantId, async (tx) => {
      // Validate patron exists
      const [user] = await tx
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.id, dto.userId)))
        .limit(1);

      if (!user) {
        throw new NotFoundException('Member not found');
      }

      // Check current outstanding balance
      const balance = await this.computeUserBalance(tx, tenantId, dto.userId);

      if (balance <= 0) {
        throw new BadRequestException('Patron has no outstanding fine balance');
      }

      if (dto.amountMinorUnits > balance) {
        throw new BadRequestException(
          `Payment of KES ${(dto.amountMinorUnits / 100).toFixed(2)} exceeds outstanding balance of KES ${(balance / 100).toFixed(2)}`,
        );
      }

      // Generate unique receipt number: RCP-YYYYMMDD-XXXX
      const datePart = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '');
      const randomHex = randomBytes(3).toString('hex').toUpperCase();
      const receiptNumber = `RCP-${datePart}-${randomHex}`;

      const [entry] = await tx
        .insert(fineEntries)
        .values({
          tenantId,
          userId: dto.userId,
          entryType: 'PAYMENT',
          amountMinorUnits: dto.amountMinorUnits,
          paymentMethod: dto.paymentMethod,
          paymentReference: dto.paymentReference?.trim() || null,
          receiptNumber,
          actorId,
          notes: dto.notes?.trim() || null,
        })
        .returning();

      // Audit log (FIN-2)
      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'fines.payment_recorded',
        entityType: 'fine_entry',
        entityId: entry.id,
        metadata: {
          userId: dto.userId,
          amountMinorUnits: dto.amountMinorUnits,
          paymentMethod: dto.paymentMethod,
          receiptNumber,
          newBalanceMinorUnits: balance - dto.amountMinorUnits,
        },
      });

      return {
        ...entry,
        amountKes: entry.amountMinorUnits / 100,
        receiptNumber,
        newBalanceMinorUnits: balance - dto.amountMinorUnits,
        newBalanceKes: (balance - dto.amountMinorUnits) / 100,
      };
    });
  }

  /**
   * Waive a fine with mandatory reason and audit log (FIN-2).
   */
  async waiveFine(tenantId: string, actorId: string, dto: WaiveFineDto) {
    const waiverReason = dto.waiverReason?.trim();
    if (!waiverReason || waiverReason.length < 3) {
      throw new BadRequestException('A valid waiver reason is mandatory');
    }

    return this.database.withTenant(tenantId, async (tx) => {
      // Validate patron exists
      const [user] = await tx
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.id, dto.userId)))
        .limit(1);

      if (!user) {
        throw new NotFoundException('Member not found');
      }

      // Check current outstanding balance
      const balance = await this.computeUserBalance(tx, tenantId, dto.userId);

      if (balance <= 0) {
        throw new BadRequestException(
          'Patron has no outstanding fine balance to waive',
        );
      }

      if (dto.amountMinorUnits > balance) {
        throw new BadRequestException(
          `Waiver amount of KES ${(dto.amountMinorUnits / 100).toFixed(2)} exceeds outstanding balance of KES ${(balance / 100).toFixed(2)}`,
        );
      }

      const [entry] = await tx
        .insert(fineEntries)
        .values({
          tenantId,
          userId: dto.userId,
          loanId: dto.loanId || null,
          entryType: 'WAIVER',
          amountMinorUnits: dto.amountMinorUnits,
          waiverReason,
          actorId,
          notes: dto.notes?.trim() || null,
        })
        .returning();

      // Audit log (FIN-2)
      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'fines.waived',
        entityType: 'fine_entry',
        entityId: entry.id,
        metadata: {
          userId: dto.userId,
          amountMinorUnits: dto.amountMinorUnits,
          waiverReason,
          newBalanceMinorUnits: balance - dto.amountMinorUnits,
        },
      });

      return {
        ...entry,
        amountKes: entry.amountMinorUnits / 100,
        newBalanceMinorUnits: balance - dto.amountMinorUnits,
        newBalanceKes: (balance - dto.amountMinorUnits) / 100,
      };
    });
  }

  private async computeUserBalance(
    tx: any,
    tenantId: string,
    userId: string,
  ): Promise<number> {
    const rows = await tx
      .select({
        entryType: fineEntries.entryType,
        total: sql<number>`coalesce(sum(${fineEntries.amountMinorUnits}), 0)`,
      })
      .from(fineEntries)
      .where(
        and(
          eq(fineEntries.tenantId, tenantId),
          eq(fineEntries.userId, userId),
        ),
      )
      .groupBy(fineEntries.entryType);

    let totalCharged = 0;
    let totalPaid = 0;
    let totalWaived = 0;

    for (const row of rows) {
      const val = Number(row.total) || 0;
      if (row.entryType === 'CHARGE') totalCharged += val;
      else if (row.entryType === 'PAYMENT') totalPaid += val;
      else if (row.entryType === 'WAIVER') totalWaived += val;
    }

    return Math.max(0, totalCharged - totalPaid - totalWaived);
  }
}
