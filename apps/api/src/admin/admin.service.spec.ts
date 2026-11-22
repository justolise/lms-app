import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service.js';

const mockTx = {
  insert: vi.fn(),
};

const mockDb = {
  select: vi.fn(),
  update: vi.fn(),
};

const mockDatabase = {
  db: mockDb,
  withTenant: vi.fn((_, cb) => cb(mockTx)),
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

function selectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

function updateChain(result: unknown[]) {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
}

function insertChain() {
  return {
    values: vi.fn().mockResolvedValue({}),
  };
}

const tenantId = '11111111-1111-1111-1111-111111111111';
const actorId = '22222222-2222-2222-2222-222222222222';

const mockProfileRow = {
  id: tenantId,
  name: 'Nairobi Community Library',
  libraryCode: 'NBI-MAIN',
  status: 'ACTIVE',
  logoUrl: 'https://example.com/logo.png',
  email: 'library@nairobi.org',
  phone: '+254700111222',
  address: 'Kenyatta Avenue, Nairobi',
  openingHours: 'Mon-Fri: 8am-6pm',
  website: 'https://nairobi-library.org',
  description: 'Public community library serving Nairobi central.',
  borrowingRulesSummary: 'Standard loan duration is 14 days with up to 2 renewals.',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminService(
      mockDatabase as never,
      mockRedis as never,
    );
  });

  describe('getProfile', () => {
    it('returns cached profile when available in Redis', async () => {
      mockRedis.get.mockResolvedValueOnce(mockProfileRow);

      const result = await service.getProfile(tenantId);
      expect(result).toEqual(mockProfileRow);
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('queries DB on cache miss and caches result in Redis', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockDb.select.mockReturnValueOnce(selectChain([mockProfileRow]));

      const result = await service.getProfile(tenantId);
      expect(result).toEqual(mockProfileRow);
      expect(mockRedis.set).toHaveBeenCalledWith(
        `tenant:${tenantId}:profile`,
        mockProfileRow,
        300,
      );
    });

    it('throws NotFoundException when tenant is not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockDb.select.mockReturnValueOnce(selectChain([]));

      await expect(service.getProfile(tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('updates tenant profile, inserts audit log, and invalidates cache', async () => {
      mockRedis.get.mockResolvedValueOnce(mockProfileRow);

      const updatedRow = {
        ...mockProfileRow,
        name: 'Nairobi Central Regional Library',
        phone: '+254711999888',
        updatedAt: new Date(),
      };

      mockDb.update.mockReturnValueOnce(updateChain([updatedRow]));
      mockTx.insert.mockReturnValueOnce(insertChain());

      const result = await service.updateProfile(tenantId, actorId, {
        name: 'Nairobi Central Regional Library',
        phone: '+254711999888',
      });

      expect(result.name).toBe('Nairobi Central Regional Library');
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockTx.insert).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith(`tenant:${tenantId}:profile`);
      expect(mockRedis.del).toHaveBeenCalledWith('public:libraries');
      expect(mockRedis.del).toHaveBeenCalledWith('public:library:nbi-main');
    });

    it('throws NotFoundException if updating non-existent tenant', async () => {
      mockRedis.get.mockResolvedValueOnce(mockProfileRow);
      mockDb.update.mockReturnValueOnce(updateChain([]));

      await expect(
        service.updateProfile(tenantId, actorId, { name: 'New Library' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
