import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  catalogueItems,
  copies,
  loans,
  platformAuditLogs,
  sessions,
  tenants,
  users,
} from '../../database/schema.js';
import type {
  CreateTenantDto,
  ListTenantsQueryDto,
} from './dto/platform-tenants.dto.js';

export const RESERVED_SLUGS = new Set([
  'platform',
  'admin',
  'api',
  'auth',
  'www',
  'public',
  'system',
  'libraries',
  'browse',
  'login',
  'legal',
  'support',
  'dashboard',
  'settings',
  'users',
  'circulation',
  'catalogue',
  'holds',
  'fines',
  'members',
]);

@Injectable()
export class PlatformTenantsService {
  private readonly logger = new Logger(PlatformTenantsService.name);

  constructor(private readonly database: DatabaseService) {}

  /**
   * Normalizes and validates a proposed library slug.
   */
  normalizeSlug(candidate: string): string {
    const slug = candidate
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!slug) {
      throw new BadRequestException('A valid non-empty slug is required');
    }

    if (RESERVED_SLUGS.has(slug)) {
      throw new ConflictException(
        `The slug "${slug}" is a reserved system path and cannot be used for a tenant.`,
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new BadRequestException(
        'Slug must consist solely of lowercase alphanumeric characters and hyphens',
      );
    }

    return slug;
  }

  /**
   * Transactionally provisions a new library tenant with unique slug and library code.
   */
  async createTenant(dto: CreateTenantDto, actorId?: string) {
    const rawSlug = dto.slug || dto.name;
    const slug = this.normalizeSlug(rawSlug);
    const libraryCode = dto.libraryCode.trim().toUpperCase();

    // 1. Uniqueness check for slug
    const [existingSlug] = await this.database.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (existingSlug) {
      throw new ConflictException(`Tenant with slug "${slug}" already exists`);
    }

    // 2. Uniqueness check for libraryCode
    const [existingCode] = await this.database.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.libraryCode, libraryCode))
      .limit(1);

    if (existingCode) {
      throw new ConflictException(
        `Tenant with library code "${libraryCode}" already exists`,
      );
    }

    // 3. Insert tenant record
    const [newTenant] = await this.database.db
      .insert(tenants)
      .values({
        name: dto.name.trim(),
        slug,
        libraryCode,
        status: 'ACTIVE',
        email: dto.email?.trim().toLowerCase() || null,
        phone: dto.phone?.trim() || null,
        address: dto.address?.trim() || null,
        openingHours: dto.openingHours?.trim() || null,
        website: dto.website?.trim() || null,
        description: dto.description?.trim() || null,
        borrowingRulesSummary: dto.borrowingRulesSummary?.trim() || null,
        onboardingNotes: dto.onboardingNotes?.trim() || null,
      })
      .returning();

    // 4. Log platform audit event
    await this.database.db.insert(platformAuditLogs).values({
      actorId: actorId || null,
      action: 'TENANT_CREATED',
      entityType: 'TENANT',
      entityId: newTenant.id,
      metadata: {
        name: newTenant.name,
        slug: newTenant.slug,
        libraryCode: newTenant.libraryCode,
      },
    });

    this.logger.log(`Created new tenant: id=${newTenant.id} slug=${newTenant.slug}`);
    return newTenant;
  }

  /**
   * Lists tenants with pagination, search, and status filtering.
   */
  async listTenants(query: ListTenantsQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(Math.max(1, query.limit || 20), 100);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.status) {
      conditions.push(eq(tenants.status, query.status));
    }

    if (query.search) {
      const pattern = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(tenants.name, pattern),
          ilike(tenants.slug, pattern),
          ilike(tenants.libraryCode, pattern),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(tenants)
      .where(whereClause);

    const total = countResult?.count || 0;

    const items = await this.database.db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        libraryCode: tenants.libraryCode,
        status: tenants.status,
        logoUrl: tenants.logoUrl,
        email: tenants.email,
        phone: tenants.phone,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
      })
      .from(tenants)
      .where(whereClause)
      .orderBy(desc(tenants.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves full tenant details along with operational stats.
   */
  async getTenant(idOrSlug: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );

    const condition = isUuid
      ? or(eq(tenants.id, idOrSlug), eq(tenants.slug, idOrSlug))
      : eq(tenants.slug, idOrSlug.toLowerCase());

    const [tenant] = await this.database.db
      .select()
      .from(tenants)
      .where(condition)
      .limit(1);

    if (!tenant) {
      throw new NotFoundException(`Tenant "${idOrSlug}" not found`);
    }

    // Aggregate statistics across tenant scope
    const [memberCount] = await this.database.withTenant(tenant.id, (tx) =>
      tx
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.tenantId, tenant.id)),
    );

    const [copyCount] = await this.database.withTenant(tenant.id, (tx) =>
      tx
        .select({ count: sql<number>`count(*)::int` })
        .from(copies)
        .where(eq(copies.tenantId, tenant.id)),
    );

    const [loanCount] = await this.database.withTenant(tenant.id, (tx) =>
      tx
        .select({ count: sql<number>`count(*)::int` })
        .from(loans)
        .where(and(eq(loans.tenantId, tenant.id), eq(loans.status, 'ACTIVE'))),
    );

    return {
      ...tenant,
      stats: {
        totalMembers: memberCount?.count || 0,
        totalCopies: copyCount?.count || 0,
        activeLoans: loanCount?.count || 0,
      },
    };
  }

  /**
   * Transitions tenant lifecycle status between ACTIVE and SUSPENDED.
   * On suspension, instantly invalidates all active sessions for that tenant.
   */
  async updateTenantStatus(
    tenantId: string,
    status: 'ACTIVE' | 'SUSPENDED',
    actorId?: string,
    reason?: string,
  ) {
    const [existing] = await this.database.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Tenant with id "${tenantId}" not found`);
    }

    const [updated] = await this.database.db
      .update(tenants)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    // If suspended, invalidate all active patron/staff sessions under tenant RLS boundary
    if (status === 'SUSPENDED') {
      await this.database.withTenant(tenantId, async (tx) => {
        await tx
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(eq(sessions.tenantId, tenantId));
      });

      this.logger.warn(`Tenant suspended: id=${tenantId}. All active sessions revoked.`);
    }

    // Log platform audit record
    await this.database.db.insert(platformAuditLogs).values({
      actorId: actorId || null,
      action: status === 'SUSPENDED' ? 'TENANT_SUSPENDED' : 'TENANT_ACTIVATED',
      entityType: 'TENANT',
      entityId: tenantId,
      metadata: {
        previousStatus: existing.status,
        newStatus: status,
        reason: reason || null,
      },
    });

    return updated;
  }
}
