import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MemberTypesService } from './member-types.service.js';
import { DatabaseService } from '../database/database.service.js';

describe('MemberTypesService (MEM-2, ADM-2)', () => {
  let service: MemberTypesService;

  const tenantId = '11111111-1111-4111-8111-111111111111';
  const actorId = '22222222-2222-4222-8222-222222222222';
  const memberTypeId = '33333333-3333-4333-8333-333333333333';
  const policyId = '44444444-4444-4444-8444-444444444444';

  let selectQueue: any[][] = [];
  let updateQueue: any[][] = [];
  let insertQueue: any[][] = [];
  let deleteQueue: any[][] = [];

  const createQueryChain = (queue: any[][]) => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      values: vi.fn(() => chain),
      set: vi.fn(() => chain),
      returning: vi.fn(() => chain),
      // oxlint-disable-next-line unicorn/no-thenable -- intentional: makes mock chain awaitable like Drizzle queries
      then: (onfulfilled: any, onrejected: any) => {
        const rows = queue.length > 0 ? queue.shift()! : [];
        return Promise.resolve(rows).then(onfulfilled, onrejected);
      },
    };
    return chain;
  };

  const tx = {
    select: vi.fn(() => createQueryChain(selectQueue)),
    update: vi.fn(() => createQueryChain(updateQueue)),
    insert: vi.fn(() => createQueryChain(insertQueue)),
    delete: vi.fn(() => createQueryChain(deleteQueue)),
  };

  const database = {
    withTenant: vi.fn(
      async (
        _tenantId: string,
        callback: (transaction: never) => Promise<unknown>,
      ) => callback(tx as never),
    ),
  };

  beforeEach(() => {
    selectQueue = [];
    updateQueue = [];
    insertQueue = [];
    deleteQueue = [];
    vi.clearAllMocks();

    service = new MemberTypesService(database as unknown as DatabaseService);
  });

  describe('create member type', () => {
    it('creates a member type successfully', async () => {
      // 1. check duplicate -> none found
      selectQueue.push([]);
      // 2. insert member_types returning row
      insertQueue.push([
        {
          id: memberTypeId,
          name: 'Student',
          description: 'High school students',
          isActive: true,
          createdAt: new Date(),
        },
      ]);
      // 3. insert audit_logs
      insertQueue.push([]);

      const result = await service.create(tenantId, actorId, {
        name: 'Student',
        description: 'High school students',
      });

      expect(result.id).toBe(memberTypeId);
      expect(result.name).toBe('Student');
    });

    it('rejects duplicate member type name in the same tenant', async () => {
      // 1. check duplicate -> found
      selectQueue.push([{ id: memberTypeId }]);

      await expect(
        service.create(tenantId, actorId, { name: 'Student' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('list member types', () => {
    it('returns member types ordered by name', async () => {
      selectQueue.push([
        { id: memberTypeId, name: 'Student', isActive: true },
        { id: '55555555-5555-5555-5555-555555555555', name: 'Teacher', isActive: true },
      ]);

      const list = await service.list(tenantId);
      expect(list).toHaveLength(2);
      expect(list[0].name).toBe('Student');
    });
  });

  describe('getById', () => {
    it('returns member type with associated loan policies', async () => {
      // 1. select member type
      selectQueue.push([
        {
          id: memberTypeId,
          name: 'Student',
          description: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      // 2. select loan policies
      selectQueue.push([
        {
          id: policyId,
          itemFormat: 'BOOK',
          loanDurationDays: 14,
          maxConcurrentLoans: 5,
          maxRenewals: 2,
          gracePeriodDays: 0,
          dailyFineMinorUnits: 1000,
          maxFineMinorUnits: 50000,
        },
      ]);

      const result = await service.getById(tenantId, memberTypeId);
      expect(result.id).toBe(memberTypeId);
      expect(result.policies).toHaveLength(1);
      expect(result.policies[0].itemFormat).toBe('BOOK');
    });

    it('throws NotFoundException if member type does not exist', async () => {
      selectQueue.push([]);

      await expect(
        service.getById(tenantId, memberTypeId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update member type', () => {
    it('updates member type details and logs audit', async () => {
      // 1. check existing
      selectQueue.push([{ id: memberTypeId, name: 'Old Student' }]);
      // 2. check duplicate name -> none
      selectQueue.push([]);
      // 3. update returning
      updateQueue.push([
        {
          id: memberTypeId,
          name: 'Junior Student',
          description: 'Grades 7-9',
          isActive: true,
          updatedAt: new Date(),
        },
      ]);
      // 4. insert audit_logs
      insertQueue.push([]);

      const result = await service.update(tenantId, actorId, memberTypeId, {
        name: 'Junior Student',
        description: 'Grades 7-9',
      });

      expect(result.name).toBe('Junior Student');
    });

    it('throws BadRequestException if no fields provided', async () => {
      selectQueue.push([{ id: memberTypeId, name: 'Student' }]);

      await expect(
        service.update(tenantId, actorId, memberTypeId, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('loan policy management', () => {
    it('creates a policy for an existing member type', async () => {
      // 1. verify member type exists
      selectQueue.push([{ id: memberTypeId }]);
      // 2. check duplicate format -> none
      selectQueue.push([]);
      // 3. insert policy returning
      insertQueue.push([
        {
          id: policyId,
          itemFormat: 'BOOK',
          loanDurationDays: 14,
          maxConcurrentLoans: 5,
          maxRenewals: 2,
          gracePeriodDays: 0,
          dailyFineMinorUnits: 0,
          maxFineMinorUnits: 0,
        },
      ]);
      // 4. insert audit log
      insertQueue.push([]);

      const result = await service.createPolicy(tenantId, actorId, memberTypeId, {
        itemFormat: 'BOOK',
        loanDurationDays: 14,
        maxConcurrentLoans: 5,
        maxRenewals: 2,
        gracePeriodDays: 0,
        dailyFineMinorUnits: 0,
        maxFineMinorUnits: 0,
      });

      expect(result.id).toBe(policyId);
      expect(result.itemFormat).toBe('BOOK');
    });

    it('rejects duplicate format policy on the same member type', async () => {
      // 1. verify member type exists
      selectQueue.push([{ id: memberTypeId }]);
      // 2. check duplicate format -> found
      selectQueue.push([{ id: policyId }]);

      await expect(
        service.createPolicy(tenantId, actorId, memberTypeId, {
          itemFormat: 'BOOK',
          loanDurationDays: 14,
          maxConcurrentLoans: 5,
          maxRenewals: 2,
          gracePeriodDays: 0,
          dailyFineMinorUnits: 0,
          maxFineMinorUnits: 0,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('updates a loan policy', async () => {
      // 1. verify policy exists
      selectQueue.push([{ id: policyId }]);
      // 2. update policy returning
      updateQueue.push([
        {
          id: policyId,
          itemFormat: 'BOOK',
          loanDurationDays: 21,
          maxConcurrentLoans: 7,
          maxRenewals: 3,
          gracePeriodDays: 1,
          dailyFineMinorUnits: 500,
          maxFineMinorUnits: 20000,
          updatedAt: new Date(),
        },
      ]);
      // 3. insert audit log
      insertQueue.push([]);

      const result = await service.updatePolicy(
        tenantId,
        actorId,
        memberTypeId,
        policyId,
        {
          loanDurationDays: 21,
          maxConcurrentLoans: 7,
        },
      );

      expect(result.loanDurationDays).toBe(21);
      expect(result.maxConcurrentLoans).toBe(7);
    });

    it('deletes a loan policy and audits deletion', async () => {
      // 1. check policy exists
      selectQueue.push([{ id: policyId, itemFormat: 'BOOK' }]);
      // 2. delete policy
      deleteQueue.push([]);
      // 3. insert audit log
      insertQueue.push([]);

      const result = await service.deletePolicy(
        tenantId,
        actorId,
        memberTypeId,
        policyId,
      );

      expect(result).toEqual({ deleted: true });
    });
  });

  describe('caching with Redis', () => {
    const redis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    let cachedService: MemberTypesService;

    beforeEach(() => {
      redis.get.mockReset();
      redis.set.mockReset();
      redis.del.mockReset();
      cachedService = new MemberTypesService(
        database as unknown as DatabaseService,
        redis as any,
      );
    });

    it('returns cached member types when available in redis', async () => {
      const cachedData = [
        { id: '1', name: 'Cached Type', description: null, isActive: true, createdAt: new Date() },
      ];
      redis.get.mockResolvedValue(cachedData);

      const result = await cachedService.list(tenantId);

      expect(redis.get).toHaveBeenCalledWith(`cache:member-types:${tenantId}`);
      expect(result).toEqual(cachedData);
      expect(database.withTenant).not.toHaveBeenCalled();
    });

    it('fetches from DB and sets cache on miss', async () => {
      redis.get.mockResolvedValue(null);
      const dbData = [
        { id: '2', name: 'DB Type', description: null, isActive: true, createdAt: new Date() },
      ];
      selectQueue.push(dbData);

      const result = await cachedService.list(tenantId);

      expect(redis.get).toHaveBeenCalledWith(`cache:member-types:${tenantId}`);
      expect(result).toEqual(dbData);
      expect(redis.set).toHaveBeenCalledWith(`cache:member-types:${tenantId}`, dbData, 300);
    });

    it('invalidates cache on member type creation', async () => {
      selectQueue.push([]); // no duplicate
      insertQueue.push([{ id: memberTypeId, name: 'New Type', description: null, isActive: true, createdAt: new Date() }]);
      insertQueue.push([]); // audit log

      await cachedService.create(tenantId, actorId, { name: 'New Type' });

      expect(redis.del).toHaveBeenCalledWith(`cache:member-types:${tenantId}`);
    });
  });
});
