import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CopiesService } from './copies.service.js';

const mockTx = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

const mockDatabase = {
  withTenant: vi.fn((_, cb) => cb(mockTx)),
};

function selectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    orderBy: vi.fn().mockResolvedValue(result),
  };
}

function insertChain(result: unknown) {
  return {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([result]),
  };
}

function updateChain(result: unknown) {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([result]),
  };
}

const tenantId = 'aaaaaaaa-0000-0000-0000-000000000001';
const actorId  = 'bbbbbbbb-0000-0000-0000-000000000002';
const itemId   = 'cccccccc-0000-0000-0000-000000000003';
const copyId   = 'dddddddd-0000-0000-0000-000000000004';

describe('CopiesService', () => {
  let service: CopiesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CopiesService(mockDatabase as never);
  });

  describe('addCopy', () => {
    it('adds a copy when barcode is unique and item exists', async () => {
      const newCopy = { id: copyId, barcode: 'BC001', status: 'AVAILABLE' };
      mockTx.select
        .mockReturnValueOnce(selectChain([{ id: itemId }])) // item exists
        .mockReturnValueOnce(selectChain([]));               // barcode unique
      mockTx.insert
        .mockReturnValueOnce(insertChain(newCopy))
        .mockReturnValueOnce(insertChain({}));

      const result = await service.addCopy(tenantId, actorId, itemId, {
        barcode: 'BC001',
      });
      expect(result).toEqual(newCopy);
    });

    it('throws NotFoundException when parent item does not exist', async () => {
      mockTx.select.mockReturnValueOnce(selectChain([]));
      await expect(
        service.addCopy(tenantId, actorId, itemId, { barcode: 'BC001' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException on duplicate barcode', async () => {
      mockTx.select
        .mockReturnValueOnce(selectChain([{ id: itemId }]))
        .mockReturnValueOnce(selectChain([{ id: 'other-copy' }]));
      await expect(
        service.addCopy(tenantId, actorId, itemId, { barcode: 'BC001' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('withdraw', () => {
    it('withdraws an AVAILABLE copy', async () => {
      mockTx.select.mockReturnValueOnce(
        selectChain([{ id: copyId, barcode: 'BC001', status: 'AVAILABLE', catalogueItemId: itemId }]),
      );
      mockTx.update.mockReturnValue(
        updateChain({ id: copyId, status: 'WITHDRAWN' }),
      );
      mockTx.insert.mockReturnValue(insertChain({}));

      const result = await service.withdraw(tenantId, actorId, itemId, copyId, 'Damaged beyond repair') as { status: string };
      expect(result.status).toBe('WITHDRAWN');
      expect(mockTx.insert).toHaveBeenCalled();
    });

    it('throws ConflictException when withdrawing an ON_LOAN copy', async () => {
      mockTx.select.mockReturnValueOnce(
        selectChain([{ id: copyId, status: 'ON_LOAN', catalogueItemId: itemId }]),
      );
      await expect(
        service.withdraw(tenantId, actorId, itemId, copyId),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when copy not found', async () => {
      mockTx.select.mockReturnValueOnce(selectChain([]));
      await expect(
        service.withdraw(tenantId, actorId, itemId, copyId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus (INV-2)', () => {
    it('transitions copy status and records audit log and notes', async () => {
      mockTx.select.mockReturnValueOnce(
        selectChain([{ id: copyId, barcode: 'BC001', status: 'AVAILABLE', catalogueItemId: itemId, notes: null }]),
      );
      mockTx.update.mockReturnValue(
        updateChain({ id: copyId, status: 'LOST', notes: '[2026-11-22] LOST: Patron reported lost' }),
      );
      mockTx.insert.mockReturnValue(insertChain({}));

      const result = await service.updateStatus(tenantId, actorId, itemId, copyId, {
        status: 'LOST',
        reason: 'Patron reported lost',
      }) as { status: string };

      expect(result.status).toBe('LOST');
      expect(mockTx.update).toHaveBeenCalled();
      expect(mockTx.insert).toHaveBeenCalled();
    });

    it('returns existing copy if status is unchanged', async () => {
      mockTx.select.mockReturnValueOnce(
        selectChain([{ id: copyId, barcode: 'BC001', status: 'AVAILABLE', catalogueItemId: itemId }]),
      );

      const result = await service.updateStatus(tenantId, actorId, itemId, copyId, {
        status: 'AVAILABLE',
        reason: 'No change needed',
      }) as { status: string };

      expect(result.status).toBe('AVAILABLE');
      expect(mockTx.update).not.toHaveBeenCalled();
    });

    it('rejects empty reason with BadRequestException', async () => {
      await expect(
        service.updateStatus(tenantId, actorId, itemId, copyId, {
          status: 'LOST',
          reason: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid status transitions with ConflictException', async () => {
      mockTx.select.mockReturnValueOnce(
        selectChain([{ id: copyId, barcode: 'BC001', status: 'ON_LOAN', catalogueItemId: itemId }]),
      );

      await expect(
        service.updateStatus(tenantId, actorId, itemId, copyId, {
          status: 'RESERVED',
          reason: 'Attempted invalid transition',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('allows restoring LOST or DAMAGED copy to AVAILABLE', async () => {
      mockTx.select.mockReturnValueOnce(
        selectChain([{ id: copyId, barcode: 'BC001', status: 'LOST', catalogueItemId: itemId, notes: '[2026-11-20] LOST: Missing' }]),
      );
      mockTx.update.mockReturnValue(
        updateChain({ id: copyId, status: 'AVAILABLE' }),
      );
      mockTx.insert.mockReturnValue(insertChain({}));

      const result = await service.updateStatus(tenantId, actorId, itemId, copyId, {
        status: 'AVAILABLE',
        reason: 'Found in book drop',
      }) as { status: string };

      expect(result.status).toBe('AVAILABLE');
    });

    it('throws NotFoundException when copy does not exist', async () => {
      mockTx.select.mockReturnValueOnce(selectChain([]));

      await expect(
        service.updateStatus(tenantId, actorId, itemId, copyId, {
          status: 'LOST',
          reason: 'Lost copy',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('transition (status machine)', () => {
    it('transitions AVAILABLE → ON_LOAN', async () => {
      mockTx.select.mockReturnValueOnce(
        selectChain([{ id: copyId, status: 'AVAILABLE' }]),
      );
      mockTx.update.mockReturnValue(
        updateChain({ id: copyId, status: 'ON_LOAN' }),
      );
      mockTx.insert.mockReturnValue(insertChain({}));

      const result = await service.transition(tenantId, actorId, copyId, 'ON_LOAN') as { status: string };
      expect(result.status).toBe('ON_LOAN');
    });

    it('rejects invalid transitions (WITHDRAWN → anything)', async () => {
      mockTx.select.mockReturnValueOnce(
        selectChain([{ id: copyId, status: 'WITHDRAWN' }]),
      );
      await expect(
        service.transition(tenantId, actorId, copyId, 'AVAILABLE'),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects ON_LOAN → RESERVED (not in allowed set)', async () => {
      mockTx.select.mockReturnValueOnce(
        selectChain([{ id: copyId, status: 'ON_LOAN' }]),
      );
      await expect(
        service.transition(tenantId, actorId, copyId, 'RESERVED'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
