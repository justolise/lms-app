import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';

// ─── Database mock ────────────────────────────────────────────
const mockTx = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockDatabase = {
  withTenant: vi.fn((_, cb) => cb(mockTx)),
};

// Helper: build a fluent select chain
function selectChain(result: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    orderBy: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

function insertChain(result: unknown) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([result]),
  };
  return chain;
}

function updateChain(result: unknown) {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([result]),
  };
  return chain;
}

function deleteChain() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  };
}

const tenantId = 'aaaaaaaa-0000-0000-0000-000000000001';
const actorId  = 'bbbbbbbb-0000-0000-0000-000000000002';
const catId    = 'cccccccc-0000-0000-0000-000000000003';

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CategoriesService(mockDatabase as never);
  });

  describe('list', () => {
    it('returns all categories for the tenant', async () => {
      const rows = [{ id: catId, name: 'Fiction', parentId: null }];
      mockTx.select.mockReturnValue(selectChain(rows));
      const result = await service.list(tenantId);
      expect(result).toEqual(rows);
    });
  });

  describe('getById', () => {
    it('returns the category when found', async () => {
      const row = { id: catId, name: 'Fiction' };
      mockTx.select.mockReturnValue(selectChain([row]));
      const result = await service.getById(tenantId, catId);
      expect(result).toEqual(row);
    });

    it('throws NotFoundException when not found', async () => {
      mockTx.select.mockReturnValue(selectChain([]));
      await expect(service.getById(tenantId, catId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a category and writes an audit log', async () => {
      const newRow = { id: catId, name: 'Science Fiction', tenantId };
      // first select = uniqueness check (empty = no duplicate)
      // second insert = category
      // third insert = audit log
      mockTx.select
        .mockReturnValueOnce(selectChain([]))  // uniqueness check
      mockTx.insert
        .mockReturnValueOnce(insertChain(newRow))  // categories insert
        .mockReturnValueOnce(insertChain({}));       // audit log

      const result = await service.create(tenantId, actorId, {
        name: 'Science Fiction',
      });
      expect(result).toEqual(newRow);
    });

    it('throws ConflictException when name already exists', async () => {
      mockTx.select.mockReturnValue(selectChain([{ id: catId }]));
      await expect(
        service.create(tenantId, actorId, { name: 'Fiction' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates a category and writes an audit log', async () => {
      const updated = { id: catId, name: 'Updated' };
      mockTx.select.mockReturnValue(selectChain([{ id: catId }]));
      mockTx.update.mockReturnValue(updateChain(updated));
      mockTx.insert.mockReturnValue(insertChain({}));

      const result = await service.update(tenantId, actorId, catId, {
        name: 'Updated',
      });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when category not found', async () => {
      mockTx.select.mockReturnValue(selectChain([]));
      await expect(
        service.update(tenantId, actorId, catId, { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException on self-reference parentId', async () => {
      mockTx.select.mockReturnValue(selectChain([{ id: catId }]));
      await expect(
        service.update(tenantId, actorId, catId, { parentId: catId }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('deletes a category and writes an audit log', async () => {
      mockTx.select.mockReturnValue(
        selectChain([{ id: catId, name: 'Fiction' }]),
      );
      mockTx.delete.mockReturnValue(deleteChain());
      mockTx.insert.mockReturnValue(insertChain({}));
      const result = await service.delete(tenantId, actorId, catId);
      expect(result).toEqual({ success: true });
    });

    it('throws NotFoundException when category not found', async () => {
      mockTx.select.mockReturnValue(selectChain([]));
      await expect(
        service.delete(tenantId, actorId, catId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
