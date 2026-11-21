import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
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
        selectChain([{ id: copyId, status: 'AVAILABLE', catalogueItemId: itemId }]),
      );
      mockTx.update.mockReturnValue(
        updateChain({ id: copyId, status: 'WITHDRAWN' }),
      );
      mockTx.insert.mockReturnValue(insertChain({}));

      const result = await service.withdraw(tenantId, actorId, itemId, copyId) as { status: string };
      expect(result.status).toBe('WITHDRAWN');
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
