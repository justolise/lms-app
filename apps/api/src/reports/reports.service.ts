import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import {
  catalogueItems,
  copies,
  fineEntries,
  holds,
  loans,
  users,
} from '../database/schema.js';
import type { DashboardReportResponse } from './dto/dashboard-report.dto.js';

@Injectable()
export class ReportsService {
  constructor(private readonly database: DatabaseService) {}

  async getDashboard(tenantId: string): Promise<DashboardReportResponse> {
    return this.database.withTenant(tenantId, async (tx) => {
      // 1. Active loans count
      const activeLoansResult = await tx
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(loans)
        .where(and(eq(loans.tenantId, tenantId), eq(loans.status, 'ACTIVE')));
      const activeLoansCount = Number(activeLoansResult[0]?.count ?? 0);

      // 2. Overdue loans count (status = 'OVERDUE' OR status = 'ACTIVE' and dueAt < now())
      const overdueLoansResult = await tx
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(loans)
        .where(
          and(
            eq(loans.tenantId, tenantId),
            sql`(${loans.status} = 'OVERDUE' OR (${loans.status} = 'ACTIVE' AND ${loans.dueAt} < NOW()))`,
          ),
        );
      const overdueLoansCount = Number(overdueLoansResult[0]?.count ?? 0);

      // 3. Active holds count (status IN ('PENDING', 'READY'))
      const activeHoldsResult = await tx
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(holds)
        .where(
          and(
            eq(holds.tenantId, tenantId),
            inArray(holds.status, ['PENDING', 'READY']),
          ),
        );
      const activeHoldsCount = Number(activeHoldsResult[0]?.count ?? 0);

      // 4. Catalogue titles count
      const titlesResult = await tx
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(catalogueItems)
        .where(eq(catalogueItems.tenantId, tenantId));
      const totalCatalogueTitles = Number(titlesResult[0]?.count ?? 0);

      // 5. Total copies and available copies count
      const copiesResult = await tx
        .select({
          total: sql<number>`count(*)::int`,
          available: sql<number>`count(*) FILTER (WHERE ${copies.status} = 'AVAILABLE')::int`,
        })
        .from(copies)
        .where(eq(copies.tenantId, tenantId));
      const totalCopiesCount = Number(copiesResult[0]?.total ?? 0);
      const availableCopiesCount = Number(copiesResult[0]?.available ?? 0);

      // 6. New members this month
      const newMembersResult = await tx
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(users)
        .where(
          and(
            eq(users.tenantId, tenantId),
            eq(users.role, 'MEMBER'),
            sql`${users.createdAt} >= date_trunc('month', NOW())`,
          ),
        );
      const newMembersThisMonth = Number(newMembersResult[0]?.count ?? 0);

      // 7. Fines summary: outstanding unpaid and collected this month
      const finesResult = await tx
        .select({
          outstandingMinorUnits: sql<number>`coalesce(sum(case when ${fineEntries.entryType} = 'CHARGE' then ${fineEntries.amountMinorUnits} else -${fineEntries.amountMinorUnits} end), 0)::int`,
          collectedMonthMinorUnits: sql<number>`coalesce(sum(case when ${fineEntries.entryType} = 'PAYMENT' and ${fineEntries.createdAt} >= date_trunc('month', NOW()) then ${fineEntries.amountMinorUnits} else 0 end), 0)::int`,
        })
        .from(fineEntries)
        .where(eq(fineEntries.tenantId, tenantId));

      const rawOutstanding = Number(finesResult[0]?.outstandingMinorUnits ?? 0);
      const outstandingFinesMinorUnits = Math.max(0, rawOutstanding);
      const collectedMonthMinorUnits = Number(
        finesResult[0]?.collectedMonthMinorUnits ?? 0,
      );
      const outstandingFinesKes = outstandingFinesMinorUnits / 100;
      const collectedFinesThisMonthKes = collectedMonthMinorUnits / 100;

      // 8. Popular titles (top 5 most borrowed)
      const popularTitles = await tx
        .select({
          id: catalogueItems.id,
          title: catalogueItems.title,
          author: sql<string>`(SELECT string_agg(val, ', ') FROM jsonb_array_elements_text(case when jsonb_typeof(${catalogueItems.authors}) = 'array' then ${catalogueItems.authors} else '[]'::jsonb end) AS t(val))`,
          format: catalogueItems.format,
          coverUrl: catalogueItems.coverUrl,
          borrowCount: sql<number>`count(${loans.id})::int`,
        })
        .from(loans)
        .innerJoin(
          catalogueItems,
          and(
            eq(catalogueItems.tenantId, loans.tenantId),
            eq(catalogueItems.id, loans.catalogueItemId),
          ),
        )
        .where(eq(loans.tenantId, tenantId))
        .groupBy(
          catalogueItems.id,
          catalogueItems.title,
          catalogueItems.authors,
          catalogueItems.format,
          catalogueItems.coverUrl,
        )
        .orderBy(desc(sql`count(${loans.id})`))
        .limit(5);

      // 9. Recent circulation activity (latest 5 loans/returns)
      const recentLoans = await tx
        .select({
          id: loans.id,
          status: loans.status,
          checkedOutAt: loans.checkedOutAt,
          returnedAt: loans.returnedAt,
          title: catalogueItems.title,
          patronName: users.fullName,
        })
        .from(loans)
        .innerJoin(
          catalogueItems,
          and(
            eq(catalogueItems.tenantId, loans.tenantId),
            eq(catalogueItems.id, loans.catalogueItemId),
          ),
        )
        .innerJoin(
          users,
          and(eq(users.tenantId, loans.tenantId), eq(users.id, loans.userId)),
        )
        .where(eq(loans.tenantId, tenantId))
        .orderBy(desc(loans.checkedOutAt))
        .limit(5);

      const recentActivity = recentLoans.map((loan) => {
        const isReturn = Boolean(loan.returnedAt);
        return {
          id: loan.id,
          type: (isReturn ? 'RETURN' : 'CHECKOUT') as 'RETURN' | 'CHECKOUT',
          description: `${isReturn ? 'Returned' : 'Borrowed'} "${loan.title}"`,
          patronName: loan.patronName,
          timestamp: (isReturn ? loan.returnedAt : loan.checkedOutAt)?.toISOString() ?? new Date().toISOString(),
        };
      });

      return {
        stats: {
          activeLoansCount,
          overdueLoansCount,
          activeHoldsCount,
          totalCatalogueTitles,
          totalCopiesCount,
          availableCopiesCount,
          newMembersThisMonth,
          outstandingFinesMinorUnits,
          collectedMonthMinorUnits,
          outstandingFinesKes,
          collectedFinesThisMonthKes,
        },
        popularTitles: popularTitles.map((p) => ({
          ...p,
          borrowCount: Number(p.borrowCount ?? 0),
        })),
        recentActivity,
      };
    });
  }
}
