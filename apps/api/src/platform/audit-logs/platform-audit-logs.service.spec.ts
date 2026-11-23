import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import { PlatformAuditLogsService } from './platform-audit-logs.service.js';

describe('PlatformAuditLogsService', () => {
  let service: PlatformAuditLogsService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAuditLogsService,
        { provide: DatabaseService, useValue: { db: mockDb } },
      ],
    }).compile();

    service = module.get<PlatformAuditLogsService>(PlatformAuditLogsService);
  });

  it('lists audit logs with actor details and total count', async () => {
    const mockCountChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      }),
    };

    const mockRows = [
      {
        id: 'log-1',
        action: 'TENANT_CREATED',
        entityType: 'TENANT',
        entityId: 'tenant-123',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        metadata: { name: 'Test Library' },
        createdAt: new Date('2026-01-01T00:00:00Z'),
        actorId: 'admin-1',
        actorEmail: 'super@platform.local',
        actorFullName: 'Super Administrator',
      },
    ];

    const mockQueryChain = {
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockRows),
              }),
            }),
          }),
        }),
      }),
    };

    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? mockCountChain : mockQueryChain;
    });

    const result = await service.listAuditLogs({ limit: 10, offset: 0 });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].action).toBe('TENANT_CREATED');
    expect(result.items[0].actor?.email).toBe('super@platform.local');
  });
});
