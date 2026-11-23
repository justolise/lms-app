import { Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { platformAuditLogs, platformUsers } from '../../database/schema.js';

export interface ListAuditLogsQuery {
  action?: string;
  entityType?: string;
  actorId?: string;
  limit?: number;
  offset?: number;
}

export interface PlatformAuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: Date;
  actor: {
    id: string;
    email: string;
    fullName: string;
  } | null;
}

@Injectable()
export class PlatformAuditLogsService {
  constructor(private readonly database: DatabaseService) {}

  async listAuditLogs(query: ListAuditLogsQuery): Promise<{
    items: PlatformAuditLogItem[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = Math.min(Math.max(query.limit ?? 25, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);

    const conditions = [];

    if (query.action?.trim()) {
      conditions.push(eq(platformAuditLogs.action, query.action.trim()));
    }
    if (query.entityType?.trim()) {
      conditions.push(eq(platformAuditLogs.entityType, query.entityType.trim()));
    }
    if (query.actorId?.trim()) {
      conditions.push(eq(platformAuditLogs.actorId, query.actorId.trim()));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 1. Total count
    const [countResult] = await this.database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(platformAuditLogs)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    // 2. Fetch rows joined with platformUsers for actor details
    const rows = await this.database.db
      .select({
        id: platformAuditLogs.id,
        action: platformAuditLogs.action,
        entityType: platformAuditLogs.entityType,
        entityId: platformAuditLogs.entityId,
        ipAddress: platformAuditLogs.ipAddress,
        userAgent: platformAuditLogs.userAgent,
        metadata: platformAuditLogs.metadata,
        createdAt: platformAuditLogs.createdAt,
        actorId: platformUsers.id,
        actorEmail: platformUsers.email,
        actorFullName: platformUsers.fullName,
      })
      .from(platformAuditLogs)
      .leftJoin(platformUsers, eq(platformAuditLogs.actorId, platformUsers.id))
      .where(whereClause)
      .orderBy(desc(platformAuditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const items: PlatformAuditLogItem[] = rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      metadata: r.metadata,
      createdAt: r.createdAt,
      actor: r.actorId
        ? {
            id: r.actorId,
            email: r.actorEmail!,
            fullName: r.actorFullName!,
          }
        : null,
    }));

    return {
      items,
      total,
      limit,
      offset,
    };
  }
}
