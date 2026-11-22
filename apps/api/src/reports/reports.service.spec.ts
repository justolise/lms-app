import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsService } from './reports.service.js';

describe('ReportsService (RPT-1)', () => {
  let service: ReportsService;
  let mockDb: any;
  let mockTx: any;

  const tenantId = 'e296b387-0f39-459b-8393-e13e9a09fe2d';

  beforeEach(() => {
    mockTx = {
      select: vi.fn(),
    };

    mockDb = {
      withTenant: vi.fn(async (_tId: string, cb: any) => cb(mockTx)),
    };

    service = new ReportsService(mockDb as any);
  });

  it('aggregates dashboard counts and circulation metrics correctly', async () => {
    let callCount = 0;

    mockTx.select.mockImplementation(() => {
      callCount++;
      const currentCall = callCount;

      const chain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        // oxlint-disable-next-line unicorn/no-thenable
        then: (resolve: (val: any) => void) => {
          switch (currentCall) {
            case 1: // active loans
              resolve([{ count: 12 }]);
              break;
            case 2: // overdue loans
              resolve([{ count: 3 }]);
              break;
            case 3: // active holds
              resolve([{ count: 5 }]);
              break;
            case 4: // titles count
              resolve([{ count: 150 }]);
              break;
            case 5: // copies total & available
              resolve([{ total: 320, available: 290 }]);
              break;
            case 6: // new members
              resolve([{ count: 8 }]);
              break;
            case 7: // fines summary
              resolve([
                {
                  outstandingMinorUnits: 25000, // 250 KES
                  collectedMonthMinorUnits: 12000, // 120 KES
                },
              ]);
              break;
            case 8: // popular titles
              resolve([
                {
                  id: 'cat-1',
                  title: 'Clean Code',
                  author: 'Robert C. Martin',
                  format: 'BOOK',
                  coverUrl: 'https://example.com/cover.jpg',
                  borrowCount: 24,
                },
              ]);
              break;
            case 9: // recent loans
              resolve([
                {
                  id: 'loan-1',
                  status: 'ACTIVE',
                  checkedOutAt: new Date('2026-11-20T10:00:00Z'),
                  returnedAt: null,
                  title: 'Clean Code',
                  patronName: 'Alice Wanjiku',
                },
                {
                  id: 'loan-2',
                  status: 'RETURNED',
                  checkedOutAt: new Date('2026-11-18T10:00:00Z'),
                  returnedAt: new Date('2026-11-22T09:00:00Z'),
                  title: 'The Pragmatic Programmer',
                  patronName: 'Brian Kiprop',
                },
              ]);
              break;
            default:
              resolve([]);
          }
        },
      };

      return chain;
    });

    const result = await service.getDashboard(tenantId);

    // Verify tenant scoping
    expect(mockDb.withTenant).toHaveBeenCalledWith(tenantId, expect.any(Function));

    // Verify stats
    expect(result.stats.activeLoansCount).toBe(12);
    expect(result.stats.overdueLoansCount).toBe(3);
    expect(result.stats.activeHoldsCount).toBe(5);
    expect(result.stats.totalCatalogueTitles).toBe(150);
    expect(result.stats.totalCopiesCount).toBe(320);
    expect(result.stats.availableCopiesCount).toBe(290);
    expect(result.stats.newMembersThisMonth).toBe(8);
    expect(result.stats.outstandingFinesMinorUnits).toBe(25000);
    expect(result.stats.collectedMonthMinorUnits).toBe(12000);
    expect(result.stats.outstandingFinesKes).toBe(250);
    expect(result.stats.collectedFinesThisMonthKes).toBe(120);

    // Verify popular titles
    expect(result.popularTitles).toHaveLength(1);
    expect(result.popularTitles[0].title).toBe('Clean Code');
    expect(result.popularTitles[0].borrowCount).toBe(24);

    // Verify recent activity
    expect(result.recentActivity).toHaveLength(2);
    expect(result.recentActivity[0].type).toBe('CHECKOUT');
    expect(result.recentActivity[0].description).toBe('Borrowed "Clean Code"');
    expect(result.recentActivity[1].type).toBe('RETURN');
    expect(result.recentActivity[1].description).toBe('Returned "The Pragmatic Programmer"');
  });

  it('handles empty data gracefully with zeroes and empty arrays', async () => {
    mockTx.select.mockImplementation(() => {
      const chain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        // oxlint-disable-next-line unicorn/no-thenable
        then: (resolve: (val: any) => void) => resolve([]),
      };
      return chain;
    });

    const result = await service.getDashboard(tenantId);

    expect(result.stats.activeLoansCount).toBe(0);
    expect(result.stats.overdueLoansCount).toBe(0);
    expect(result.stats.activeHoldsCount).toBe(0);
    expect(result.stats.totalCatalogueTitles).toBe(0);
    expect(result.stats.totalCopiesCount).toBe(0);
    expect(result.stats.availableCopiesCount).toBe(0);
    expect(result.stats.newMembersThisMonth).toBe(0);
    expect(result.stats.outstandingFinesMinorUnits).toBe(0);
    expect(result.stats.collectedMonthMinorUnits).toBe(0);
    expect(result.stats.outstandingFinesKes).toBe(0);
    expect(result.stats.collectedFinesThisMonthKes).toBe(0);
    expect(result.popularTitles).toEqual([]);
    expect(result.recentActivity).toEqual([]);
  });
});
