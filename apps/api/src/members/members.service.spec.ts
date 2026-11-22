import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MembersService } from './members.service.js';

describe('MembersService (MEM-1, MEM-4)', () => {
  let service: MembersService;
  let mockDb: any;
  let mockTx: any;
  let mockIdentity: any;
  let mockIdentityLookup: any;
  let mockPasswordService: any;
  let mockMemberIdentifier: any;

  const tenantId = 'e296b387-0f39-459b-8393-e13e9a09fe2d';
  const memberId = 'm1111111-1111-1111-1111-111111111111';
  const otherMemberId = 'm2222222-2222-2222-2222-222222222222';
  const actorId = 'a1111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    mockTx = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };

    mockDb = {
      withTenant: vi.fn(async (tId: string, cb: any) => cb(mockTx)),
    };

    mockIdentity = {
      normalizeEmail: vi.fn((e: string) => e.toLowerCase().trim()),
      normalizePhone: vi.fn((p: string) => p.trim()),
    };

    mockIdentityLookup = {
      findIdentity: vi.fn().mockResolvedValue([]),
      syncIdentityInTransaction: vi.fn().mockResolvedValue(undefined),
    };

    mockPasswordService = {
      hash: vi.fn().mockResolvedValue('hashed-password'),
    };

    mockMemberIdentifier = {
      encrypt: vi.fn((val: string) => `enc-${val}`),
      hash: vi.fn((val: string) => `hash-${val}`),
    };

    service = new MembersService(
      mockDb as any,
      mockIdentity as any,
      mockIdentityLookup as any,
      mockPasswordService as any,
      mockMemberIdentifier as any,
    );
  });

  // ─── MEM-1: Profile lookup & details ───────────────────────────────────────
  describe('MEM-1: getMemberById', () => {
    it('throws NotFoundException when member is not found', async () => {
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            leftJoin: vi.fn().mockReturnValueOnce({
              leftJoin: vi.fn().mockReturnValueOnce({
                where: vi.fn().mockReturnValueOnce({
                  limit: vi.fn().mockResolvedValueOnce([]),
                }),
              }),
            }),
          }),
        }),
      });

      await expect(service.getMemberById(tenantId, memberId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns member detail with active loans count and fine balance', async () => {
      const mockMemberRow = {
        id: memberId,
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+254712345678',
        role: 'MEMBER',
        status: 'ACTIVE',
        admissionNumber: 'ADM-001',
        memberTypeId: 'mt-1',
        memberTypeName: 'Standard Student',
        groupId: null,
        groupName: null,
      };

      // 1. Member query
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            leftJoin: vi.fn().mockReturnValueOnce({
              leftJoin: vi.fn().mockReturnValueOnce({
                where: vi.fn().mockReturnValueOnce({
                  limit: vi.fn().mockResolvedValueOnce([mockMemberRow]),
                }),
              }),
            }),
          }),
        }),
      });

      // 2. Loans count query
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([{ activeLoans: 2 }]),
        }),
      });

      // 3. Fines balance query
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([{ balance: 1500 }]),
        }),
      });

      const result = await service.getMemberById(tenantId, memberId);
      expect(result.fullName).toBe('Jane Doe');
      expect(result.admissionNumber).toBe('ADM-001');
      expect(result.activeLoansCount).toBe(2);
      expect(result.fineBalanceMinorUnits).toBe(1500);
      expect(result.fineBalanceKes).toBe(15);
    });
  });

  // ─── MEM-1: Profile Update & Uniqueness Validation ─────────────────────────
  describe('MEM-1: updateMember', () => {
    it('throws ConflictException if admission number is already taken by another member', async () => {
      // 1. Find existing member
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([
                {
                  id: memberId,
                  admissionNumber: 'ADM-OLD',
                },
              ]),
            }),
          }),
        }),
      });

      // 2. Duplicate admission number check -> returns duplicate
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 'other-profile' }]),
          }),
        }),
      });

      await expect(
        service.updateMember(tenantId, actorId, memberId, {
          admissionNumber: 'ADM-DUPLICATE',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('updates member details and logs audit event', async () => {
      // 1. Existing member
      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([
                {
                  id: memberId,
                  email: 'old@example.com',
                  phone: '+254700000000',
                  admissionNumber: 'ADM-001',
                },
              ]),
            }),
          }),
        }),
      });

      // 2. Users update
      mockTx.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      // 3. Member profile update
      mockTx.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      // 4. Audit log insert
      mockTx.insert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValueOnce([]),
      });

      // 5. getMemberById reload
      vi.spyOn(service, 'getMemberById').mockResolvedValueOnce({
        id: memberId,
        fullName: 'Updated Name',
        admissionNumber: 'ADM-001',
      } as any);

      const result = await service.updateMember(tenantId, actorId, memberId, {
        fullName: 'Updated Name',
      });

      expect(result.fullName).toBe('Updated Name');
      expect(mockTx.insert).toHaveBeenCalledTimes(1); // Audit log
    });
  });

  // ─── MEM-4: Borrowing History Authorization & Fetching ────────────────────
  describe('MEM-4: getBorrowingHistory', () => {
    it('throws ForbiddenException when a patron tries to view another patron history', async () => {
      await expect(
        service.getBorrowingHistory(tenantId, otherMemberId, memberId, 'MEMBER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a member to view their own borrowing history', async () => {
      const mockLoans = [
        {
          id: 'loan-1',
          bookTitle: 'Blossoms of the Savannah',
          copyBarcode: 'BC-001',
          status: 'ACTIVE',
        },
      ];

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            innerJoin: vi.fn().mockReturnValueOnce({
              where: vi.fn().mockReturnValueOnce({
                orderBy: vi.fn().mockResolvedValueOnce(mockLoans),
              }),
            }),
          }),
        }),
      });

      const history = await service.getBorrowingHistory(
        tenantId,
        memberId,
        memberId,
        'MEMBER',
      );
      expect(history).toEqual(mockLoans);
    });

    it('allows a librarian to view any member borrowing history', async () => {
      const mockLoans = [
        {
          id: 'loan-2',
          bookTitle: 'A Doll House',
          copyBarcode: 'BC-002',
          status: 'RETURNED',
        },
      ];

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            innerJoin: vi.fn().mockReturnValueOnce({
              where: vi.fn().mockReturnValueOnce({
                orderBy: vi.fn().mockResolvedValueOnce(mockLoans),
              }),
            }),
          }),
        }),
      });

      const history = await service.getBorrowingHistory(
        tenantId,
        otherMemberId,
        actorId,
        'LIBRARIAN',
      );
      expect(history).toEqual(mockLoans);
    });
  });
});
