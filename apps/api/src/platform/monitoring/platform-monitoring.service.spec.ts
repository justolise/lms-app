import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { PlatformMonitoringService } from './platform-monitoring.service.js';

describe('PlatformMonitoringService', () => {
  let service: PlatformMonitoringService;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(async () => {
    mockDb = {
      execute: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      select: vi.fn(),
    };

    mockRedis = {
      ping: vi.fn().mockResolvedValue('PONG'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformMonitoringService,
        { provide: DatabaseService, useValue: { db: mockDb } },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<PlatformMonitoringService>(PlatformMonitoringService);
  });

  it('aggregates platform stats successfully', async () => {
    // Mock tenant grouping query
    const mockFromGroupBy = vi.fn().mockReturnValue({
      groupBy: vi.fn().mockResolvedValue([
        { status: 'ACTIVE', count: 5 },
        { status: 'SUSPENDED', count: 1 },
      ]),
    });

    // Mock count queries
    const mockFromCount = vi.fn().mockResolvedValue([{ count: 42 }]);
    const mockFromLoans = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: 7 }]),
    });

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      return {
        from: (_table: any) => {
          if (selectCallCount === 1) return mockFromGroupBy();
          if (selectCallCount === 5) return mockFromLoans();
          return mockFromCount();
        },
      };
    });

    const stats = await service.getPlatformStats();

    expect(stats.system.database).toBe('up');
    expect(stats.system.redis).toBe('up');
    expect(stats.tenants.total).toBe(6);
    expect(stats.tenants.active).toBe(5);
    expect(stats.tenants.suspended).toBe(1);
    expect(stats.timestamp).toBeDefined();
  });

  it('reports database as down when ping fails', async () => {
    mockDb.execute.mockRejectedValue(new Error('Connection refused'));
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        groupBy: vi.fn().mockResolvedValue([]),
      }),
    }));

    const stats = await service.getPlatformStats();
    expect(stats.system.database).toBe('down');
  });
});
