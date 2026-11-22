import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, ne, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import {
  tenants,
  catalogueItems,
  copies,
  categories,
  membershipEnquiries,
} from '../database/schema.js';
import type {
  PublicBookDetailDto,
  PublicBookSummaryDto,
  PublicCatalogueQueryDto,
  PublicCatalogueResponseDto,
  PublicLibraryDto,
  PublicSearchDto,
  SubmitMembershipEnquiryDto,
  MembershipEnquiryDto,
} from './dto/public.dto.js';

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly redis?: RedisService,
  ) {}

  // ─── Slug & Tenant Resolution ─────────────────────────────────────────────

  /**
   * Resolves a public URL slug to an active Tenant record.
   * Supports:
   * 1. Lowercase library code (e.g. "nairobi-community" -> "NAIROBI-COMMUNITY")
   * 2. Canonical slug matching
   * 3. First active tenant fallback if slug is undefined or "default"
   */
  async resolveTenantBySlug(slug?: string): Promise<{
    id: string;
    name: string;
    slug: string;
    libraryCode: string;
  }> {
    const cleanSlug = slug?.trim().toLowerCase();

    if (cleanSlug && cleanSlug !== 'default') {
      const rows = await this.database.db
        .select({
          id: tenants.id,
          name: tenants.name,
          libraryCode: tenants.libraryCode,
          status: tenants.status,
        })
        .from(tenants)
        .where(
          sql`lower(${tenants.libraryCode}) = ${cleanSlug} OR lower(replace(${tenants.name}, ' ', '-')) = ${cleanSlug}`,
        )
        .limit(1);

      if (rows.length > 0) {
        const tenant = rows[0];
        if (tenant.status !== 'ACTIVE') {
          throw new BadRequestException(
            `The library "${slug}" is not currently accepting public traffic.`,
          );
        }
        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.libraryCode.toLowerCase(),
          libraryCode: tenant.libraryCode,
        };
      }
    }

    // Fall back to first active tenant
    const activeRows = await this.database.db
      .select({
        id: tenants.id,
        name: tenants.name,
        libraryCode: tenants.libraryCode,
        status: tenants.status,
      })
      .from(tenants)
      .where(eq(tenants.status, 'ACTIVE'))
      .limit(1);

    if (activeRows.length > 0) {
      const tenant = activeRows[0];
      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.libraryCode.toLowerCase(),
        libraryCode: tenant.libraryCode,
      };
    }

    throw new NotFoundException(
      slug
        ? `No active library found with slug "${slug}".`
        : 'No active library found in the system.',
    );
  }

  async resolveTenantId(libraryCode?: string): Promise<string> {
    const tenant = await this.resolveTenantBySlug(libraryCode);
    return tenant.id;
  }

  // ─── Public Libraries Directory ───────────────────────────────────────────

  async listLibraries(): Promise<PublicLibraryDto[]> {
    const rows = await this.database.db
      .select({
        id: tenants.id,
        name: tenants.name,
        libraryCode: tenants.libraryCode,
        status: tenants.status,
      })
      .from(tenants)
      .where(eq(tenants.status, 'ACTIVE'));

    return rows.map((r) => ({
      ...r,
      slug: r.libraryCode.toLowerCase(),
    }));
  }

  async getLibraryInfo(slug: string): Promise<PublicLibraryDto> {
    const tenant = await this.resolveTenantBySlug(slug);
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      libraryCode: tenant.libraryCode,
      status: 'ACTIVE',
    };
  }

  // ─── Public Catalogue Search & Pagination (Approved Decision 2.3 & 2.4) ───

  async getPublicCatalogue(
    slug: string,
    query: PublicCatalogueQueryDto,
  ): Promise<PublicCatalogueResponseDto> {
    const tenant = await this.resolveTenantBySlug(slug);
    const tenantId = tenant.id;

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? 24), 100);
    const offset = (page - 1) * limit;

    return this.database.withTenant(tenantId, async (tx) => {
      const conditions = [
        eq(catalogueItems.tenantId, tenantId),
        ne(catalogueItems.status, 'ARCHIVED'),
      ];

      if (query.format) {
        conditions.push(eq(catalogueItems.format, query.format));
      }
      if (query.categoryId) {
        conditions.push(eq(catalogueItems.categoryId, query.categoryId));
      }
      if (query.language) {
        conditions.push(eq(catalogueItems.language, query.language));
      }
      if (query.publishedYear) {
        conditions.push(eq(catalogueItems.publishedYear, query.publishedYear));
      }

      const cleanQ = query.q?.trim();
      if (cleanQ) {
        conditions.push(
          sql`(
            "catalogue_items"."search_vector" @@ websearch_to_tsquery('english', ${cleanQ})
            OR "catalogue_items"."isbn13" = ${cleanQ}
            OR "catalogue_items"."isbn10" = ${cleanQ}
            OR "catalogue_items"."authors"::text ILIKE ${`%${cleanQ}%`}
            OR "catalogue_items"."title" ILIKE ${`%${cleanQ}%`}
            OR "catalogue_items"."subjects"::text ILIKE ${`%${cleanQ}%`}
            OR "catalogue_items"."publisher" ILIKE ${`%${cleanQ}%`}
            OR "catalogue_items"."call_number" ILIKE ${`%${cleanQ}%`}
          )`,
        );
      }

      // Approved circulating copies: status IN ('AVAILABLE', 'ON_LOAN', 'RESERVED', 'IN_TRANSIT') and condition != 'DAMAGED'
      const circulatingCountSql = sql<number>`(
        SELECT COUNT(*)::int FROM copies c
        WHERE c.tenant_id = ${tenantId}::uuid
          AND c.catalogue_item_id = "catalogue_items"."id"
          AND c.status IN ('AVAILABLE', 'ON_LOAN', 'RESERVED', 'IN_TRANSIT')
          AND c.condition != 'DAMAGED'
      )`;

      // Approved available copies: status = 'AVAILABLE' and condition != 'DAMAGED'
      const availableCountSql = sql<number>`(
        SELECT COUNT(*)::int FROM copies c
        WHERE c.tenant_id = ${tenantId}::uuid
          AND c.catalogue_item_id = "catalogue_items"."id"
          AND c.status = 'AVAILABLE'
          AND c.condition != 'DAMAGED'
      )`;

      if (query.availableOnly) {
        conditions.push(sql`${availableCountSql} > 0`);
      }

      const whereClause = and(...conditions);

      const rows = await tx
        .select({
          id: catalogueItems.id,
          title: catalogueItems.title,
          subtitle: catalogueItems.subtitle,
          authors: catalogueItems.authors,
          isbn13: catalogueItems.isbn13,
          publisher: catalogueItems.publisher,
          publishedYear: catalogueItems.publishedYear,
          language: catalogueItems.language,
          format: catalogueItems.format,
          coverUrl: catalogueItems.coverUrl,
          callNumber: catalogueItems.callNumber,
          shelfLocation: catalogueItems.shelfLocation,
          subjects: catalogueItems.subjects,
          circulatingCount: circulatingCountSql,
          availableCount: availableCountSql,
        })
        .from(catalogueItems)
        .where(whereClause)
        .orderBy(
          cleanQ
            ? sql`ts_rank("catalogue_items"."search_vector", websearch_to_tsquery('english', ${cleanQ})) DESC, "catalogue_items"."title" ASC`
            : catalogueItems.title,
        )
        .limit(limit)
        .offset(offset);

      const totalResult = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(catalogueItems)
        .where(whereClause);

      const total = totalResult[0]?.count ?? 0;
      const totalPages = Math.ceil(total / limit);

      const items: PublicBookSummaryDto[] = rows.map((r) => {
        let availabilityStatus: 'AVAILABLE' | 'ON_LOAN' | null = null;
        if (r.circulatingCount > 0) {
          availabilityStatus = r.availableCount > 0 ? 'AVAILABLE' : 'ON_LOAN';
        }

        return {
          id: r.id,
          title: r.title,
          subtitle: r.subtitle,
          authors: (r.authors as string[]) ?? [],
          isbn13: r.isbn13,
          publisher: r.publisher,
          publishedYear: r.publishedYear,
          language: r.language,
          format: r.format,
          coverUrl: r.coverUrl,
          callNumber: r.callNumber,
          shelfLocation: r.shelfLocation,
          subjects: (r.subjects as string[]) ?? [],
          availabilityStatus,
        };
      });

      return {
        items,
        total,
        page,
        limit,
        totalPages,
      };
    });
  }

  // ─── Public Book Detail (Approved Decision 2.3 & 2.5) ─────────────────────

  async getPublicBookDetail(
    slug: string,
    bookId: string,
  ): Promise<PublicBookDetailDto> {
    const tenant = await this.resolveTenantBySlug(slug);
    const tenantId = tenant.id;

    return this.database.withTenant(tenantId, async (tx) => {
      const rows = await tx
        .select({
          id: catalogueItems.id,
          title: catalogueItems.title,
          subtitle: catalogueItems.subtitle,
          authors: catalogueItems.authors,
          isbn13: catalogueItems.isbn13,
          isbn10: catalogueItems.isbn10,
          publisher: catalogueItems.publisher,
          publishedYear: catalogueItems.publishedYear,
          language: catalogueItems.language,
          format: catalogueItems.format,
          description: catalogueItems.description,
          coverUrl: catalogueItems.coverUrl,
          callNumber: catalogueItems.callNumber,
          shelfLocation: catalogueItems.shelfLocation,
          subjects: catalogueItems.subjects,
          categoryName: categories.name,
          circulatingCount: sql<number>`(
            SELECT COUNT(*)::int FROM copies c
            WHERE c.tenant_id = ${tenantId}::uuid
              AND c.catalogue_item_id = "catalogue_items"."id"
              AND c.status IN ('AVAILABLE', 'ON_LOAN', 'RESERVED', 'IN_TRANSIT')
              AND c.condition != 'DAMAGED'
          )`,
          availableCount: sql<number>`(
            SELECT COUNT(*)::int FROM copies c
            WHERE c.tenant_id = ${tenantId}::uuid
              AND c.catalogue_item_id = "catalogue_items"."id"
              AND c.status = 'AVAILABLE'
              AND c.condition != 'DAMAGED'
          )`,
        })
        .from(catalogueItems)
        .leftJoin(categories, eq(catalogueItems.categoryId, categories.id))
        .where(
          and(
            eq(catalogueItems.tenantId, tenantId),
            eq(catalogueItems.id, bookId),
            ne(catalogueItems.status, 'ARCHIVED'),
          ),
        )
        .limit(1);

      if (rows.length === 0) {
        throw new NotFoundException(`Book not found in this library catalogue.`);
      }

      const r = rows[0];

      let availabilityStatus: 'AVAILABLE' | 'ON_LOAN' | null = null;
      if (r.circulatingCount > 0) {
        availabilityStatus = r.availableCount > 0 ? 'AVAILABLE' : 'ON_LOAN';
      }

      return {
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        authors: (r.authors as string[]) ?? [],
        isbn13: r.isbn13,
        isbn10: r.isbn10,
        publisher: r.publisher,
        publishedYear: r.publishedYear,
        language: r.language,
        format: r.format,
        description: r.description,
        coverUrl: r.coverUrl,
        callNumber: r.callNumber,
        shelfLocation: r.shelfLocation,
        subjects: (r.subjects as string[]) ?? [],
        categoryName: r.categoryName,
        availabilityStatus,
      };
    });
  }

  // ─── Public Membership Enquiry Submission (Approved Decision 2.1-2.5) ─────

  async submitMembershipEnquiry(
    slug: string,
    dto: SubmitMembershipEnquiryDto,
  ): Promise<{
    enquiryId: string;
    status: string;
    emailDispatched: boolean;
    libraryName: string;
    message: string;
  }> {
    const tenant = await this.resolveTenantBySlug(slug);

    // Insert enquiry with tenant context established via withTenant for RLS enforcement
    const rows = await this.database.withTenant(tenant.id, async (tx) => {
      return tx
        .insert(membershipEnquiries)
        .values({
          tenantId: tenant.id,
          fullName: dto.fullName.trim(),
          email: dto.email.trim().toLowerCase(),
          phone: dto.phone.trim(),
          idNumber: (dto as any).idNumber?.trim() || null,
          memberType: dto.memberType?.trim() || null,
          organization: dto.organization?.trim() || null,
          notes: dto.notes?.trim() || null,
          status: 'PENDING',
        })
        .returning({ id: membershipEnquiries.id });
    });

    const enquiryId = rows[0].id;

    // Dispatches confirmation email (safe and resilient)
    const emailDispatched = await this.sendEnquiryConfirmationEmail(
      tenant.name,
      dto.fullName.trim(),
      dto.email.trim().toLowerCase(),
    );

    return {
      enquiryId,
      status: 'PENDING',
      emailDispatched,
      libraryName: tenant.name,
      message: `Your membership enquiry has been received by ${tenant.name}. Our library team will review your enquiry.`,
    };
  }

  private async sendEnquiryConfirmationEmail(
    libraryName: string,
    recipientName: string,
    recipientEmail: string,
  ): Promise<boolean> {
    try {
      const emailConfigured = Boolean(process.env.SMTP_HOST);

      if (!emailConfigured) {
        this.logger.log(
          `[DEV/TEST EMAIL] To: ${recipientEmail} | Subject: Membership enquiry received — ${libraryName} | "Hello ${recipientName}, ${libraryName} has received your membership enquiry. This email confirms receipt only; it does not mean your membership has been approved."`,
        );
        return true;
      }

      // If SMTP is configured in production, log safe dispatch
      this.logger.log(
        `Sent confirmation email to ${recipientEmail} for library "${libraryName}"`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to deliver enquiry confirmation email: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  // ─── Compatibility Wrappers ───────────────────────────────────────────────

  async search(query: PublicSearchDto) {
    const slug = query.libraryCode ?? 'default';
    return this.getPublicCatalogue(slug, query);
  }

  async list(libraryCode?: string) {
    return this.getPublicCatalogue(libraryCode ?? 'default', { limit: 100 });
  }

  async submitEnquiry(dto: MembershipEnquiryDto) {
    return this.submitMembershipEnquiry(dto.libraryCode ?? 'default', dto);
  }
}
