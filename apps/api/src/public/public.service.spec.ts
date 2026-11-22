import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PublicService } from './public.service.js';

describe('PublicService', () => {
  let service: PublicService;
  let mockDb: any;
  let mockTx: any;
  let mockDatabaseService: any;

  beforeEach(() => {
    mockTx = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };

    mockDatabaseService = {
      db: {
        select: vi.fn(),
        insert: vi.fn(),
      },
      withTenant: vi.fn((_tenantId: string, cb: any) => cb(mockTx)),
    };

    service = new PublicService(mockDatabaseService as any);
  });

  // ─── Slug & Tenant Resolution ─────────────────────────────────────────────

  describe('resolveTenantBySlug', () => {
    it('resolves active library tenant by lowercase library code slug', async () => {
      const mockTenant = {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Nairobi Community Library',
        libraryCode: 'NAIROBI-COMMUNITY',
        status: 'ACTIVE',
      };

      const chain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockTenant]),
      };
      mockDatabaseService.db.select.mockReturnValue(chain);

      const result = await service.resolveTenantBySlug('nairobi-community');

      expect(result).toEqual({
        id: mockTenant.id,
        name: mockTenant.name,
        slug: 'nairobi-community',
        libraryCode: 'NAIROBI-COMMUNITY',
      });
    });

    it('throws BadRequestException if resolved tenant is not active', async () => {
      const mockTenant = {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Suspended Branch',
        libraryCode: 'SUSPENDED-01',
        status: 'SUSPENDED',
      };

      const chain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockTenant]),
      };
      mockDatabaseService.db.select.mockReturnValue(chain);

      await expect(
        service.resolveTenantBySlug('suspended-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('falls back to first active tenant if slug is undefined or default', async () => {
      const mockTenant = {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Default Test Library',
        libraryCode: 'TEST-LIB',
        status: 'ACTIVE',
      };

      const chain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockTenant]),
      };
      mockDatabaseService.db.select.mockReturnValue(chain);

      const result = await service.resolveTenantBySlug(undefined);

      expect(result.id).toBe(mockTenant.id);
      expect(result.libraryCode).toBe('TEST-LIB');
    });

    it('throws NotFoundException if no active library exists', async () => {
      const chain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDatabaseService.db.select.mockReturnValue(chain);

      await expect(
        service.resolveTenantBySlug('nonexistent-library'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Public Catalogue Search & Availability (Decision 2.4) ─────────────────

  describe('getPublicCatalogue availability calculation', () => {
    const tenantMock = {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Mombasa School Library',
      libraryCode: 'MOMBASA-SCHOOL',
      status: 'ACTIVE',
    };

    beforeEach(() => {
      const tenantChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([tenantMock]),
      };
      mockDatabaseService.db.select.mockReturnValue(tenantChain);
    });

    it('labels "AVAILABLE" when at least one circulating copy is available', async () => {
      const mockBooks = [
        {
          id: 'book-1',
          title: 'The River Between',
          subtitle: null,
          authors: ["Ngũgĩ wa Thiong'o"],
          isbn13: '9780435905484',
          publisher: 'Heinemann',
          publishedYear: 1965,
          language: 'en',
          format: 'BOOK',
          coverUrl: null,
          callNumber: '823.914 NGU',
          shelfLocation: 'AF-LIT-01',
          subjects: ['Kenyan Literature'],
          circulatingCount: 2,
          availableCount: 1, // 1 available, 1 on loan
        },
      ];

      const selectChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockBooks),
      };

      const countChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      };

      mockTx.select
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(countChain);

      const result = await service.getPublicCatalogue('mombasa-school', {
        page: 1,
        limit: 24,
      });

      expect(result.items[0].availabilityStatus).toBe('AVAILABLE');
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('labels "ON_LOAN" when circulating copies exist but none are available', async () => {
      const mockBooks = [
        {
          id: 'book-2',
          title: 'Things Fall Apart',
          subtitle: null,
          authors: ['Chinua Achebe'],
          circulatingCount: 3,
          availableCount: 0, // all 3 circulating copies are on loan
        },
      ];

      const selectChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockBooks),
      };

      const countChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      };

      mockTx.select
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(countChain);

      const result = await service.getPublicCatalogue('mombasa-school', {
        page: 1,
        limit: 24,
      });

      expect(result.items[0].availabilityStatus).toBe('ON_LOAN');
    });

    it('hides availability label (null) when circulating copies count is 0', async () => {
      const mockBooks = [
        {
          id: 'book-3',
          title: 'Lost / Reference Only Book',
          subtitle: null,
          authors: ['Anonymous'],
          circulatingCount: 0, // All copies are lost, damaged, withdrawn, or in repair
          availableCount: 0,
        },
      ];

      const selectChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockBooks),
      };

      const countChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      };

      mockTx.select
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(countChain);

      const result = await service.getPublicCatalogue('mombasa-school', {
        page: 1,
        limit: 24,
      });

      // Section 2.4: Must be null so frontend hides availability badge
      expect(result.items[0].availabilityStatus).toBeNull();
    });
  });

  // ─── Public Membership Enquiry ────────────────────────────────────────────

  describe('submitMembershipEnquiry', () => {
    it('creates a tenant-scoped enquiry with status PENDING and dispatches confirmation', async () => {
      const mockTenant = {
        id: '44444444-4444-4444-4444-444444444444',
        name: 'Kisumu Public Library',
        libraryCode: 'KISUMU-PUBLIC',
        status: 'ACTIVE',
      };

      const tenantChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockTenant]),
      };
      mockDatabaseService.db.select.mockReturnValue(tenantChain);

      const insertChain: any = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'new-enquiry-uuid' }]),
      };
      mockTx.insert.mockReturnValue(insertChain);

      const result = await service.submitMembershipEnquiry('kisumu-public', {
        fullName: 'Grace Ochieng',
        email: 'grace@example.com',
        phone: '+254712345678',
        memberType: 'STUDENT',
        organization: 'Maseno University',
        notes: 'Literature student researching poetry',
      });

      expect(result.enquiryId).toBe('new-enquiry-uuid');
      expect(result.status).toBe('PENDING');
      expect(result.libraryName).toBe('Kisumu Public Library');
      expect(result.emailDispatched).toBe(true);

      // Verify tenantId was assigned by backend
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenant.id,
          fullName: 'Grace Ochieng',
          email: 'grace@example.com',
          status: 'PENDING',
        }),
      );
    });
  });
});
