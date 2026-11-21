import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CatalogueService } from './catalogue.service.js';

// ─── Database mock ────────────────────────────────────────────
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

describe('CatalogueService', () => {
  let service: CatalogueService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CatalogueService(mockDatabase as never, undefined);
  });

  describe('list', () => {
    it('returns catalogue items without cache', async () => {
      const rows = [{ id: itemId, title: 'Test Book' }];
      mockTx.select.mockReturnValue(selectChain(rows));
      const result = await service.list(tenantId);
      expect(result).toEqual(rows);
    });
  });

  describe('getById', () => {
    it('returns item with copies when found', async () => {
      const item = { id: itemId, title: 'Test Book', tenantId };
      const copiesList = [{ id: 'copy1', barcode: 'BC001', status: 'AVAILABLE' }];
      // first select = item, second select = copies
      mockTx.select
        .mockReturnValueOnce(selectChain([item]))
        .mockReturnValueOnce(selectChain(copiesList));

      const result = await service.getById(tenantId, itemId) as typeof item & { copies: typeof copiesList };
      expect(result.title).toBe('Test Book');
      expect(result.copies).toHaveLength(1);
    });

    it('throws NotFoundException when item not found', async () => {
      mockTx.select.mockReturnValueOnce(selectChain([]));
      await expect(service.getById(tenantId, itemId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates an item and writes an audit log', async () => {
      const newItem = { id: itemId, title: 'New Book', isbn13: '9780061965784' };
      // isbn13 dup check → empty, then insert item, then insert audit
      mockTx.select.mockReturnValueOnce(selectChain([]));
      mockTx.insert
        .mockReturnValueOnce(insertChain(newItem))
        .mockReturnValueOnce(insertChain({}));

      const result = await service.create(tenantId, actorId, {
        title: 'New Book',
        isbn13: '9780061965784',
      });
      expect(result).toEqual(newItem);
    });

    it('throws ConflictException on duplicate ISBN-13', async () => {
      mockTx.select.mockReturnValueOnce(selectChain([{ id: 'existing' }]));
      await expect(
        service.create(tenantId, actorId, {
          title: 'Duplicate',
          isbn13: '9780061965784',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates an item without ISBN without conflict check', async () => {
      const newItem = { id: itemId, title: 'No ISBN Book' };
      mockTx.insert
        .mockReturnValueOnce(insertChain(newItem))
        .mockReturnValueOnce(insertChain({}));
      const result = await service.create(tenantId, actorId, { title: 'No ISBN Book' });
      expect(result).toEqual(newItem);
    });
  });

  describe('update', () => {
    it('updates an item and writes an audit log', async () => {
      const updated = { id: itemId, title: 'Updated Book' };
      mockTx.select.mockReturnValueOnce(selectChain([{ id: itemId }]));
      mockTx.update.mockReturnValue(updateChain(updated));
      mockTx.insert.mockReturnValue(insertChain({}));

      const result = await service.update(tenantId, actorId, itemId, {
        title: 'Updated Book',
      });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when item not found', async () => {
      mockTx.select.mockReturnValueOnce(selectChain([]));
      await expect(
        service.update(tenantId, actorId, itemId, { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('archive', () => {
    it('archives an ACTIVE item', async () => {
      mockTx.select.mockReturnValueOnce(
        selectChain([{ id: itemId, status: 'ACTIVE' }]),
      );
      mockTx.update.mockReturnValue(
        updateChain({ id: itemId, status: 'ARCHIVED' }),
      );
      mockTx.insert.mockReturnValue(insertChain({}));

      const result = await service.archive(tenantId, actorId, itemId) as { status: string };
      expect(result.status).toBe('ARCHIVED');
    });

    it('throws ConflictException when already archived', async () => {
      mockTx.select.mockReturnValueOnce(
        selectChain([{ id: itemId, status: 'ARCHIVED' }]),
      );
      await expect(
        service.archive(tenantId, actorId, itemId),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when item not found', async () => {
      mockTx.select.mockReturnValueOnce(selectChain([]));
      await expect(
        service.archive(tenantId, actorId, itemId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
