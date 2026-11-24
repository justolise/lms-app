import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { tenants } from '../database/schema.js';
import { NotificationsService } from './notifications.service.js';

// Lock ID for Postgres advisory lock (advisory lock 918273 for notification processing)
const NOTIFICATION_CRON_LOCK_ID = 918273;

@Injectable()
export class NotificationsSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly database: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    // Only run automatic background processing in non-test environments
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const intervalMs = Number(process.env.NOTIFICATION_SCAN_INTERVAL_MS) || 60_000; // default 1 minute
    this.logger.log(`Starting automated notifications scheduler (interval: ${intervalMs}ms)`);

    this.timer = setInterval(() => {
      this.runScheduledCycle().catch((err) => {
        this.logger.error(`Scheduled notification cycle error: ${(err as Error).message}`);
      });
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Runs a complete scan and dispatch cycle across all active tenants.
   * Uses Postgres advisory lock (Concept 33: Leader Election / Concept 38: Distributed Locks)
   * to guarantee only one node/worker processes notifications at any given time.
   */
  async runScheduledCycle(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    try {
      // 1. Try to acquire the session-level advisory lock
      const lockResult = await this.database.db.execute<{ locked: boolean }>(
        sql`SELECT pg_try_advisory_lock(${NOTIFICATION_CRON_LOCK_ID}) AS locked`,
      );

      const hasLock = lockResult.rows[0]?.locked === true;
      if (!hasLock) {
        // Another instance is already running the notification cycle
        return;
      }

      try {
        // 2. Fetch all ACTIVE tenants
        const activeTenants = await this.database.db
          .select({ id: tenants.id, name: tenants.name })
          .from(tenants)
          .where(sql`${tenants.status} = 'ACTIVE'`);

        for (const tenant of activeTenants) {
          try {
            await this.notificationsService.scanLoanReminders(tenant.id);
            await this.notificationsService.dispatchPending(tenant.id);
          } catch (tenantErr) {
            this.logger.warn(
              `Error processing notifications for tenant ${tenant.id} (${tenant.name}): ${(tenantErr as Error).message}`,
            );
          }
        }
      } finally {
        // 3. Release the advisory lock
        await this.database.db.execute(
          sql`SELECT pg_advisory_unlock(${NOTIFICATION_CRON_LOCK_ID})`,
        );
      }
    } catch (err) {
      this.logger.error(`Failed during scheduled cycle: ${(err as Error).message}`);
    } finally {
      this.isProcessing = false;
    }
  }
}
