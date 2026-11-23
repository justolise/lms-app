import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PlatformTenantsService } from './platform-tenants.service.js';

describe('PlatformTenantsService', () => {
  let service: PlatformTenantsService;
  let mockDb: {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockDatabase: {
    db: typeof mockDb;
    withTenant: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };
    mockDatabase = {
      db: mockDb,
      withTenant: vi.fn((_id, cb) => cb(mockDb)),
    };
    service = new PlatformTenantsService(mockDatabase as any);
  });

  describe('normalizeSlug', () => {
    it('should normalize spaces and special chars to hyphens', () => {
      expect(service.normalizeSlug('Nairobi Academy High')).toBe('nairobi-academy-high');
      expect(service.normalizeSlug('Mombasa_Library 2026!')).toBe('mombasa-library-2026');
    });

    it('should reject reserved system slugs', () => {
      expect(() => service.normalizeSlug('platform')).toThrow(ConflictException);
      expect(() => service.normalizeSlug('admin')).toThrow(ConflictException);
      expect(() => service.normalizeSlug('api')).toThrow(ConflictException);
      expect(() => service.normalizeSlug('auth')).toThrow(ConflictException);
      expect(() => service.normalizeSlug('login')).toThrow(ConflictException);
      expect(() => service.normalizeSlug('libraries')).toThrow(ConflictException);
    });

    it('should reject empty or invalid slugs', () => {
      expect(() => service.normalizeSlug('')).toThrow(BadRequestException);
      expect(() => service.normalizeSlug('   ')).toThrow(BadRequestException);
      expect(() => service.normalizeSlug('---')).toThrow(BadRequestException);
    });
  });

  describe('createTenant', () => {
    it('should create a tenant with valid slug and library code', async () => {
      // 1. Slug check (none found)
      // 2. Code check (none found)
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        });

      const mockCreatedTenant = {
        id: 'tenant-uuid-1',
        name: 'Mombasa Girls Academy',
        slug: 'mombasa-girls-academy',
        libraryCode: 'MOMBASA-GIRLS',
        status: 'ACTIVE',
      };

      // 3. Insert tenant and audit log
      mockDb.insert
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockCreatedTenant]),
          }),
        })
        .mockReturnValueOnce({
          values: vi.fn().mockResolvedValue([{}]),
        });

      const result = await service.createTenant({
        name: 'Mombasa Girls Academy',
        libraryCode: 'MOMBASA-GIRLS',
      });

      expect(result.id).toBe('tenant-uuid-1');
      expect(result.slug).toBe('mombasa-girls-academy');
    });

    it('should reject duplicate slug with ConflictException', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 'existing-id' }]),
      });

      await expect(
        service.createTenant({
          name: 'Nairobi Library',
          slug: 'nairobi-lib',
          libraryCode: 'NRB-01',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateTenantStatus', () => {
    it('should revoke all tenant sessions when suspended', async () => {
      const activeTenant = {
        id: 'tenant-123',
        name: 'Test Lib',
        status: 'ACTIVE',
      };

      // Find tenant
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([activeTenant]),
      });

      // Update tenant
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { ...activeTenant, status: 'SUSPENDED' },
          ]),
        }),
      });

      // Insert audit log
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{}]),
      });

      const updated = await service.updateTenantStatus(
        'tenant-123',
        'SUSPENDED',
        'super-admin-id',
        'Non-payment of annual subscription',
      );

      expect(updated.status).toBe('SUSPENDED');
      expect(mockDatabase.withTenant).toHaveBeenCalledWith(
        'tenant-123',
        expect.any(Function),
      );
    });

    it('should throw NotFoundException for unknown tenant ID', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      await expect(
        service.updateTenantStatus('unknown-id', 'SUSPENDED'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
