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
    const mockCountRows = [{ total: 1 }];
    const mockDataRows = [
      {
        id: 'log-1',
        source: 'PLATFORM',
        tenant_id: null,
        tenant_name: null,
        tenant_slug: null,
        actor_id: 'admin-1',
        actor_email: 'super@platform.local',
        actor_full_name: 'Super Administrator',
        actor_role: 'PLATFORM_SUPER_ADMIN',
        action: 'TENANT_CREATED',
        entity_type: 'TENANT',
        entity_id: 'tenant-123',
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        metadata: { name: 'Test Library' },
        created_at: new Date('2026-01-01T00:00:00Z'),
      },
    ];

    let callCount = 0;
    mockDb.execute = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        rows: callCount === 1 ? mockCountRows : mockDataRows,
      });
    });

    const result = await service.listAuditLogs({ limit: 10, offset: 0 });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].action).toBe('TENANT_CREATED');
    expect(result.items[0].actor?.email).toBe('super@platform.local');
  });
});
