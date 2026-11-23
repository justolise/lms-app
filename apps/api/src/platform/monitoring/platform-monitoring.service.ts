import { Injectable, Logger } from '@nestjs/common';
import { count, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  catalogueItems,
  copies,
  loans,
  tenants,
  users,
} from '../../database/schema.js';
import { RedisService } from '../../redis/redis.service.js';

export interface PlatformMonitoringStats {
  tenants: {
    total: number;
    active: number;
    suspended: number;
  };
  global: {
    totalUsers: number;
    totalTitles: number;
    totalCopies: number;
    activeLoans: number;
  };
  system: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    uptimeSeconds: number;
  };
  timestamp: string;
}

@Injectable()
export class PlatformMonitoringService {
  private readonly logger = new Logger(PlatformMonitoringService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  async getPlatformStats(): Promise<PlatformMonitoringStats> {
    let dbStatus: 'up' | 'down' = 'down';
    let redisStatus: 'up' | 'down' = 'down';

    // 1. Health checks
    try {
      await this.database.db.execute(sql`SELECT 1`);
      dbStatus = 'up';
    } catch (err) {
      this.logger.error(`Database check failed: ${(err as Error).message}`);
    }

    try {
      await this.redisService.ping();
      redisStatus = 'up';
    } catch (err) {
      this.logger.error(`Redis check failed: ${(err as Error).message}`);
    }

    // 2. Tenant aggregations
    let totalTenants = 0;
    let activeTenants = 0;
    let suspendedTenants = 0;

    try {
      const tenantRows = await this.database.db
        .select({
          status: tenants.status,
          count: count(),
        })
        .from(tenants)
        .groupBy(tenants.status);

      for (const row of tenantRows) {
        const c = Number(row.count);
        totalTenants += c;
        if (row.status === 'ACTIVE') {
          activeTenants += c;
        } else if (row.status === 'SUSPENDED') {
          suspendedTenants += c;
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to count tenants: ${(err as Error).message}`);
    }

    // 3. Global data aggregations (Super Admin visibility)
    let totalUsers = 0;
    let totalTitles = 0;
    let totalCopies = 0;
    let activeLoans = 0;

    try {
      const [uRes] = await this.database.db.select({ count: count() }).from(users);
      totalUsers = Number(uRes?.count ?? 0);
    } catch (err) {
      this.logger.warn(`Failed to count users: ${(err as Error).message}`);
    }

    try {
      const [cRes] = await this.database.db.select({ count: count() }).from(catalogueItems);
      totalTitles = Number(cRes?.count ?? 0);
    } catch (err) {
      this.logger.warn(`Failed to count titles: ${(err as Error).message}`);
    }

    try {
      const [cpRes] = await this.database.db.select({ count: count() }).from(copies);
      totalCopies = Number(cpRes?.count ?? 0);
    } catch (err) {
      this.logger.warn(`Failed to count copies: ${(err as Error).message}`);
    }

    try {
      const [lRes] = await this.database.db
        .select({ count: count() })
        .from(loans)
        .where(eq(loans.status, 'ACTIVE'));
      activeLoans = Number(lRes?.count ?? 0);
    } catch (err) {
      this.logger.warn(`Failed to count active loans: ${(err as Error).message}`);
    }

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
      },
      global: {
        totalUsers,
        totalTitles,
        totalCopies,
        activeLoans,
      },
      system: {
        database: dbStatus,
        redis: redisStatus,
        uptimeSeconds: Math.floor(process.uptime()),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
