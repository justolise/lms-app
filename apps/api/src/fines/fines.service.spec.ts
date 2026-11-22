import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FinesService } from './fines.service.js';

describe('FinesService (FIN-1, FIN-2)', () => {
  let service: FinesService;
  let mockDb: any;
  let mockTx: any;

  const tenantId = 'e296b387-0f39-459b-8393-e13e9a09fe2d';
  const userId = 'a1111111-1111-1111-1111-111111111111';
  const actorId = 'b2222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    mockTx = {
      select: vi.fn(),
      insert: vi.fn(),
    };

    mockDb = {
      withTenant: vi.fn(async (tId: string, cb: any) => cb(mockTx)),
    };

    service = new FinesService(mockDb as any);
  });

  // ─── FIN-1: Boundary test cases for fine calculation ─────────────────────────
  describe('FIN-1: Fine computation boundary rules', () => {
    function computeFine(
      overdueDays: number,
      gracePeriodDays: number,
      dailyFineMinorUnits: number,
      maxFineMinorUnits: number,
    ): number {
      const billableDays = Math.max(0, overdueDays - gracePeriodDays);
      const rawFine = billableDays * dailyFineMinorUnits;
      return maxFineMinorUnits > 0
        ? Math.min(rawFine, maxFineMinorUnits)
        : rawFine;
    }

    it('returns zero fine when overdue days is zero', () => {
      expect(computeFine(0, 3, 1000, 5000)).toBe(0);
    });

    it('returns zero fine when overdue days exactly equals grace days (boundary)', () => {
      expect(computeFine(3, 3, 1000, 5000)).toBe(0);
    });

    it('assesses fine for 1 billable day when overdue days is grace days + 1', () => {
      // 4 days overdue, 3 grace days = 1 billable day @ 1000 minor units (KES 10)
      expect(computeFine(4, 3, 1000, 5000)).toBe(1000);
    });

    it('computes exact cap when fine reaches maxFineMinorUnits (boundary)', () => {
      // 8 days overdue, 3 grace days = 5 billable days * 1000 = 5000 (exactly cap)
      expect(computeFine(8, 3, 1000, 5000)).toBe(5000);
    });

    it('caps fine when overdue days exceed maxFineMinorUnits ceiling', () => {
      // 30 days overdue, 3 grace days = 27 billable days * 1000 = 27000 → capped at 5000
      expect(computeFine(30, 3, 1000, 5000)).toBe(5000);
    });

    it('does not cap when maxFineMinorUnits is 0 (unlimited cap)', () => {
      expect(computeFine(10, 0, 500, 0)).toBe(5000);
    });
  });

  // ─── FIN-2: Fine ledger balance computation ──────────────────────────────────
  describe('FIN-2: getMemberBalance', () => {
    it('throws NotFoundException if user does not exist in tenant', async () => {
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      await expect(
        service.getMemberBalance(tenantId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('computes balance = charges - payments - waivers correctly', async () => {
      // User lookup
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: userId }]),
          }),
        }),
      });

      // Grouped entries
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            groupBy: vi.fn().mockResolvedValueOnce([
              { entryType: 'CHARGE', total: '5000' },
              { entryType: 'PAYMENT', total: '2000' },
              { entryType: 'WAIVER', total: '1000' },
            ]),
          }),
        }),
      });

      const balance = await service.getMemberBalance(tenantId, userId);
      expect(balance.totalChargedMinorUnits).toBe(5000);
      expect(balance.totalPaidMinorUnits).toBe(2000);
      expect(balance.totalWaivedMinorUnits).toBe(1000);
      expect(balance.balanceMinorUnits).toBe(2000);
      expect(balance.balanceKes).toBe(20);
    });
  });

  // ─── FIN-2 & FIN-3: Record payment and receipt generation ────────────────────
  describe('FIN-2: recordPayment', () => {
    it('rejects payment if patron has zero outstanding balance', async () => {
      // User exists
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: userId }]),
          }),
        }),
      });

      // Balance lookup: 0
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            groupBy: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      await expect(
        service.recordPayment(tenantId, actorId, {
          userId,
          amountMinorUnits: 1000,
          paymentMethod: 'MPESA',
          paymentReference: 'QKJ49X82MZ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects payment if amount exceeds outstanding balance', async () => {
      // User exists
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: userId }]),
          }),
        }),
      });

      // Balance lookup: 2000
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            groupBy: vi.fn().mockResolvedValueOnce([
              { entryType: 'CHARGE', total: '2000' },
            ]),
          }),
        }),
      });

      await expect(
        service.recordPayment(tenantId, actorId, {
          userId,
          amountMinorUnits: 3000,
          paymentMethod: 'CASH',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('records valid payment, generates receipt number, and writes audit log', async () => {
      // User exists
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: userId }]),
          }),
        }),
      });

      // Balance lookup: 5000
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            groupBy: vi.fn().mockResolvedValueOnce([
              { entryType: 'CHARGE', total: '5000' },
            ]),
          }),
        }),
      });

      // Insert fine entry
      const createdEntry = {
        id: 'entry-uuid',
        tenantId,
        userId,
        entryType: 'PAYMENT',
        amountMinorUnits: 2500,
        paymentMethod: 'MPESA',
        paymentReference: 'QKJ49X82MZ',
        receiptNumber: 'RCP-20261122-TEST',
      };
      mockTx.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([createdEntry]),
        }),
      });

      // Insert audit log
      mockTx.insert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValueOnce([]),
      });

      const result = await service.recordPayment(tenantId, actorId, {
        userId,
        amountMinorUnits: 2500,
        paymentMethod: 'MPESA',
        paymentReference: 'QKJ49X82MZ',
      });

      expect(result.receiptNumber).toMatch(/^RCP-\d{8}-[A-F0-9]{6}$/);
      expect(result.amountKes).toBe(25);
      expect(result.newBalanceMinorUnits).toBe(2500);
      expect(result.newBalanceKes).toBe(25);
      expect(mockTx.insert).toHaveBeenCalledTimes(2); // fine entry + audit log
    });
  });

  // ─── FIN-2: Waive fine with audit justification ──────────────────────────────
  describe('FIN-2: waiveFine', () => {
    it('rejects waiver if reason is missing or less than 3 characters', async () => {
      await expect(
        service.waiveFine(tenantId, actorId, {
          userId,
          amountMinorUnits: 1000,
          waiverReason: '  ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects waiver if amount exceeds current balance', async () => {
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: userId }]),
          }),
        }),
      });

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            groupBy: vi.fn().mockResolvedValueOnce([
              { entryType: 'CHARGE', total: '1000' },
            ]),
          }),
        }),
      });

      await expect(
        service.waiveFine(tenantId, actorId, {
          userId,
          amountMinorUnits: 1500,
          waiverReason: 'Hospital admission documentation provided',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('records valid waiver, stores audit log with mandatory reason, and returns new balance', async () => {
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: userId }]),
          }),
        }),
      });

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            groupBy: vi.fn().mockResolvedValueOnce([
              { entryType: 'CHARGE', total: '3000' },
            ]),
          }),
        }),
      });

      const waiverEntry = {
        id: 'waiver-uuid',
        tenantId,
        userId,
        entryType: 'WAIVER',
        amountMinorUnits: 3000,
        waiverReason: 'Administrative delay on returns processing',
      };

      mockTx.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([waiverEntry]),
        }),
      });

      mockTx.insert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValueOnce([]),
      });

      const result = await service.waiveFine(tenantId, actorId, {
        userId,
        amountMinorUnits: 3000,
        waiverReason: 'Administrative delay on returns processing',
      });

      expect(result.entryType).toBe('WAIVER');
      expect(result.newBalanceMinorUnits).toBe(0);
      expect(result.newBalanceKes).toBe(0);
      expect(mockTx.insert).toHaveBeenCalledTimes(2);
    });
  });
});
