import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PlatformTenantAdminsService } from './platform-tenant-admins.service.js';

describe('PlatformTenantAdminsService', () => {
  let service: PlatformTenantAdminsService;
  let mockDb: {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockTx: {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockDatabase: {
    db: typeof mockDb;
    withTenant: ReturnType<typeof vi.fn>;
  };
  let mockIdentityService: {
    normalizeEmail: ReturnType<typeof vi.fn>;
    normalizePhone: ReturnType<typeof vi.fn>;
  };
  let mockIdentityLookupService: {
    findIdentity: ReturnType<typeof vi.fn>;
    syncIdentityInTransaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };
    mockTx = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };
    mockDatabase = {
      db: mockDb,
      withTenant: vi.fn((_id, cb) => cb(mockTx)),
    };
    mockIdentityService = {
      normalizeEmail: vi.fn((e) => e.trim().toLowerCase()),
      normalizePhone: vi.fn((p) => p.trim()),
    };
    mockIdentityLookupService = {
      findIdentity: vi.fn().mockResolvedValue([]),
      syncIdentityInTransaction: vi.fn().mockResolvedValue(undefined),
    };

    service = new PlatformTenantAdminsService(
      mockDatabase as any,
      mockIdentityService as any,
      mockIdentityLookupService as any,
    );
  });

  describe('provisionTenantAdmin', () => {
    it('should provision an initial admin user inside the tenant context', async () => {
      // 1. Tenant lookup outside RLS
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 'tenant-123', name: 'Nairobi Library', status: 'ACTIVE' },
        ]),
      });

      const mockCreatedUser = {
        id: 'admin-user-id',
        tenantId: 'tenant-123',
        fullName: 'Jane Librarian',
        role: 'ADMIN',
        status: 'ACTIVE',
        mustChangePassword: true,
      };

      // 2. User insert inside withTenant
      mockTx.insert
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockCreatedUser]),
          }),
        })
        .mockReturnValueOnce({
          // Audit log inside withTenant
          values: vi.fn().mockResolvedValue([{}]),
        });

      // 3. Platform audit log outside withTenant
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{}]),
      });

      const result = await service.provisionTenantAdmin(
        'tenant-123',
        {
          email: 'jane@nairobilibrary.org',
          fullName: 'Jane Librarian',
        },
        'super-admin-id',
      );

      expect(result.userId).toBe('admin-user-id');
      expect(result.tenantId).toBe('tenant-123');
      expect(result.email).toBe('jane@nairobilibrary.org');
      expect(result.mustChangePassword).toBe(true);
      expect(result.temporaryPassword).toBeDefined();

      expect(mockDatabase.withTenant).toHaveBeenCalledWith(
        'tenant-123',
        expect.any(Function),
      );
      expect(mockIdentityLookupService.syncIdentityInTransaction).toHaveBeenCalled();
    });

    it('should reject provisioning for a suspended tenant', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 'tenant-suspended', name: 'Suspended Lib', status: 'SUSPENDED' },
        ]),
      });

      await expect(
        service.provisionTenantAdmin('tenant-suspended', {
          email: 'admin@suspended.org',
          fullName: 'Suspended Admin',
        }),
      ).rejects.toThrow('Cannot provision an administrator for a suspended tenant');
    });

    it('should reject if user already exists in this tenant', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 'tenant-123', name: 'Nairobi Library', status: 'ACTIVE' },
        ]),
      });

      mockIdentityLookupService.findIdentity.mockResolvedValue([
        { tenantId: 'tenant-123', userId: 'existing-user-id' },
      ]);

      await expect(
        service.provisionTenantAdmin('tenant-123', {
          email: 'duplicate@nairobilibrary.org',
          fullName: 'Duplicate User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('resetAdminPassword', () => {
    it('should reset admin password and revoke active sessions', async () => {
      mockTx.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 'admin-1', role: 'ADMIN' }]),
      });

      mockTx.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{}]),
      });

      mockTx.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{}]),
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{}]),
      });

      const result = await service.resetAdminPassword('tenant-123', 'admin-1', 'super-admin');

      expect(result.temporaryPassword).toBeDefined();
      expect(mockTx.update).toHaveBeenCalled();
    });
  });
});
