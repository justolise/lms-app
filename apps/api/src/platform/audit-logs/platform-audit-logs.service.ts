import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';

export interface ListAuditLogsQuery {
  scope?: 'ALL' | 'PLATFORM' | 'TENANT';
  action?: string;
  entityType?: string;
  actorId?: string;
  tenantId?: string;
  limit?: number;
  offset?: number;
}

export interface PlatformAuditLogItem {
  id: string;
  source: 'PLATFORM' | 'TENANT';
  tenantId: string | null;
  tenantName?: string | null;
  tenantSlug?: string | null;
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
    role?: string;
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
    const scope = query.scope ?? 'ALL';

    // Build unified dynamic SQL across platform_audit_logs and tenant audit_logs
    const actionFilter = query.action?.trim() || null;
    const entityTypeFilter = query.entityType?.trim() || null;
    const actorIdFilter = query.actorId?.trim() || null;
    const tenantIdFilter = query.tenantId?.trim() || null;

    // 1. Total count query
    const countSql = sql`
      WITH unified_logs AS (
        SELECT 
          p.id, 
          'PLATFORM'::text AS source,
          NULL::uuid AS tenant_id,
          p.actor_id,
          p.action,
          p.entity_type,
          p.created_at
        FROM platform_audit_logs p
        WHERE (${scope} = 'ALL' OR ${scope} = 'PLATFORM')
          AND (${tenantIdFilter}::uuid IS NULL)
          AND (${actionFilter}::text IS NULL OR p.action = ${actionFilter})
          AND (${entityTypeFilter}::text IS NULL OR p.entity_type = ${entityTypeFilter})
          AND (${actorIdFilter}::uuid IS NULL OR p.actor_id = ${actorIdFilter}::uuid)
        UNION ALL
        SELECT 
          a.id, 
          'TENANT'::text AS source,
          a.tenant_id,
          a.actor_id,
          a.action,
          a.entity_type,
          a.created_at
        FROM audit_logs a
        WHERE (${scope} = 'ALL' OR ${scope} = 'TENANT')
          AND (${tenantIdFilter}::uuid IS NULL OR a.tenant_id = ${tenantIdFilter}::uuid)
          AND (${actionFilter}::text IS NULL OR a.action = ${actionFilter})
          AND (${entityTypeFilter}::text IS NULL OR a.entity_type = ${entityTypeFilter})
          AND (${actorIdFilter}::uuid IS NULL OR a.actor_id = ${actorIdFilter}::uuid)
      )
      SELECT COUNT(*)::int AS total FROM unified_logs
    `;

    const countResult = await this.database.db.execute<{ total: number }>(countSql);
    const total = Number(countResult.rows[0]?.total ?? 0);

    // 2. Paginated rows query
    const rowsSql = sql`
      WITH unified_logs AS (
        SELECT 
          p.id, 
          'PLATFORM'::text AS source,
          NULL::uuid AS tenant_id,
          NULL::text AS tenant_name,
          NULL::text AS tenant_slug,
          p.actor_id,
          pu.email AS actor_email,
          pu.full_name AS actor_full_name,
          'PLATFORM_SUPER_ADMIN'::text AS actor_role,
          p.action,
          p.entity_type,
          p.entity_id::text AS entity_id,
          p.ip_address::text AS ip_address,
          p.user_agent,
          p.metadata,
          p.created_at
        FROM platform_audit_logs p
        LEFT JOIN platform_users pu ON p.actor_id = pu.id
        WHERE (${scope} = 'ALL' OR ${scope} = 'PLATFORM')
          AND (${tenantIdFilter}::uuid IS NULL)
          AND (${actionFilter}::text IS NULL OR p.action = ${actionFilter})
          AND (${entityTypeFilter}::text IS NULL OR p.entity_type = ${entityTypeFilter})
          AND (${actorIdFilter}::uuid IS NULL OR p.actor_id = ${actorIdFilter}::uuid)
        UNION ALL
        SELECT 
          a.id, 
          'TENANT'::text AS source,
          a.tenant_id,
          t.name AS tenant_name,
          t.slug AS tenant_slug,
          a.actor_id,
          u.email AS actor_email,
          u.full_name AS actor_full_name,
          u.role::text AS actor_role,
          a.action,
          a.entity_type,
          a.entity_id::text AS entity_id,
          NULL::text AS ip_address,
          NULL::text AS user_agent,
          a.metadata,
          a.created_at
        FROM audit_logs a
        LEFT JOIN tenants t ON a.tenant_id = t.id
        LEFT JOIN users u ON a.actor_id = u.id AND a.tenant_id = u.tenant_id
        WHERE (${scope} = 'ALL' OR ${scope} = 'TENANT')
          AND (${tenantIdFilter}::uuid IS NULL OR a.tenant_id = ${tenantIdFilter}::uuid)
          AND (${actionFilter}::text IS NULL OR a.action = ${actionFilter})
          AND (${entityTypeFilter}::text IS NULL OR a.entity_type = ${entityTypeFilter})
          AND (${actorIdFilter}::uuid IS NULL OR a.actor_id = ${actorIdFilter}::uuid)
      )
      SELECT *
      FROM unified_logs
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const rowsResult = await this.database.db.execute<{
      id: string;
      source: 'PLATFORM' | 'TENANT';
      tenant_id: string | null;
      tenant_name: string | null;
      tenant_slug: string | null;
      actor_id: string | null;
      actor_email: string | null;
      actor_full_name: string | null;
      actor_role: string | null;
      action: string;
      entity_type: string;
      entity_id: string | null;
      ip_address: string | null;
      user_agent: string | null;
      metadata: unknown;
      created_at: Date;
    }>(rowsSql);

    const items: PlatformAuditLogItem[] = rowsResult.rows.map((r) => ({
      id: r.id,
      source: r.source,
      tenantId: r.tenant_id,
      tenantName: r.tenant_name,
      tenantSlug: r.tenant_slug,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      metadata: r.metadata,
      createdAt: new Date(r.created_at),
      actor: r.actor_id
        ? {
            id: r.actor_id,
            email: r.actor_email ?? '',
            fullName: r.actor_full_name ?? '',
            role: r.actor_role ?? undefined,
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
