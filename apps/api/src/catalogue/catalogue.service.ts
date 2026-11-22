import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { and, eq, ne, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { catalogueItems, auditLogs, copies } from '../database/schema.js';
import {
  CreateCatalogueItemDto,
  SearchCatalogueDto,
  UpdateCatalogueItemDto,
} from './dto/catalogue-item.dto.js';

@Injectable()
export class CatalogueService {
  constructor(
    private readonly database: DatabaseService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  private cacheKey(tenantId: string) {
    return `cache:catalogue:${tenantId}`;
  }

  private async invalidateCache(tenantId: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(this.cacheKey(tenantId));
      } catch {
        // Non-blocking
      }
    }
  }

  async list(tenantId: string) {
    if (this.redis) {
      const cached = await this.redis.get<unknown[]>(this.cacheKey(tenantId));
      if (cached) return cached;
    }

    const rows = await this.database.withTenant(tenantId, (tx) =>
      tx
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
          categoryId: catalogueItems.categoryId,
          subjects: catalogueItems.subjects,
          status: catalogueItems.status,
          createdAt: catalogueItems.createdAt,
          updatedAt: catalogueItems.updatedAt,
          // Availability: count of AVAILABLE copies
          availableCopies: sql<number>`(
            SELECT COUNT(*)::int FROM copies c
            WHERE c.tenant_id = ${tenantId}::uuid
              AND c.catalogue_item_id = "catalogue_items"."id"
              AND c.status = 'AVAILABLE'
          )`,
          totalCopies: sql<number>`(
            SELECT COUNT(*)::int FROM copies c
            WHERE c.tenant_id = ${tenantId}::uuid
              AND c.catalogue_item_id = "catalogue_items"."id"
          )`,
        })
        .from(catalogueItems)
        .where(eq(catalogueItems.tenantId, tenantId))
        .orderBy(catalogueItems.title),
    );

    if (this.redis) {
      await this.redis.set(this.cacheKey(tenantId), rows, 120);
    }

    return rows;
  }

  async search(tenantId: string, params: SearchCatalogueDto) {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const offset = Math.max(params.offset ?? 0, 0);

    return this.database.withTenant(tenantId, async (tx) => {
      const conditions = [
        eq(catalogueItems.tenantId, tenantId),
        ne(catalogueItems.status, 'ARCHIVED'),
      ];

      if (params.format) {
        conditions.push(eq(catalogueItems.format, params.format));
      }
      if (params.categoryId) {
        conditions.push(eq(catalogueItems.categoryId, params.categoryId));
      }
      if (params.language) {
        conditions.push(eq(catalogueItems.language, params.language));
      }
      if (params.publishedYear) {
        conditions.push(eq(catalogueItems.publishedYear, params.publishedYear));
      }

      const cleanQ = params.q?.trim();
      if (cleanQ) {
        conditions.push(
          sql`(
            "catalogue_items"."search_vector" @@ websearch_to_tsquery('english', ${cleanQ})
            OR "catalogue_items"."isbn13" = ${cleanQ}
            OR "catalogue_items"."isbn10" = ${cleanQ}
            OR "catalogue_items"."authors"::text ILIKE ${`%${cleanQ}%`}
            OR "catalogue_items"."subjects"::text ILIKE ${`%${cleanQ}%`}
            OR "catalogue_items"."publisher" ILIKE ${`%${cleanQ}%`}
            OR "catalogue_items"."call_number" ILIKE ${`%${cleanQ}%`}
          )`,
        );
      }

      if (params.availableOnly) {
        conditions.push(
          sql`(
            SELECT COUNT(*)::int FROM copies c
            WHERE c.tenant_id = ${tenantId}::uuid
              AND c.catalogue_item_id = "catalogue_items"."id"
              AND c.status = 'AVAILABLE'
          ) > 0`,
        );
      }

      const whereClause = and(...conditions);

      const items = await tx
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
          categoryId: catalogueItems.categoryId,
          subjects: catalogueItems.subjects,
          status: catalogueItems.status,
          createdAt: catalogueItems.createdAt,
          updatedAt: catalogueItems.updatedAt,
          availableCopies: sql<number>`(
            SELECT COUNT(*)::int FROM copies c
            WHERE c.tenant_id = ${tenantId}::uuid
              AND c.catalogue_item_id = "catalogue_items"."id"
              AND c.status = 'AVAILABLE'
          )`,
          totalCopies: sql<number>`(
            SELECT COUNT(*)::int FROM copies c
            WHERE c.tenant_id = ${tenantId}::uuid
              AND c.catalogue_item_id = "catalogue_items"."id"
          )`,
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

      return {
        items,
        total,
        limit,
        offset,
      };
    });
  }

  async getById(tenantId: string, itemId: string) {
    const rows = await this.database.withTenant(tenantId, async (tx) => {
      const items = await tx
        .select()
        .from(catalogueItems)
        .where(
          and(
            eq(catalogueItems.tenantId, tenantId),
            eq(catalogueItems.id, itemId),
          ),
        )
        .limit(1);

      if (items.length === 0) return null;

      const copiesList = await tx
        .select({
          id: copies.id,
          barcode: copies.barcode,
          condition: copies.condition,
          status: copies.status,
          shelfLocation: copies.shelfLocation,
          acquiredAt: copies.acquiredAt,
          notes: copies.notes,
        })
        .from(copies)
        .where(
          and(
            eq(copies.tenantId, tenantId),
            eq(copies.catalogueItemId, itemId),
          ),
        )
        .orderBy(copies.barcode);

      return { ...items[0], copies: copiesList };
    });

    if (!rows) throw new NotFoundException('Catalogue item not found');
    return rows;
  }

  async create(
    tenantId: string,
    actorId: string,
    dto: CreateCatalogueItemDto,
  ) {
    const result = await this.database.withTenant(tenantId, async (tx) => {
      if (dto.isbn13) {
        const dup = await tx
          .select({ id: catalogueItems.id })
          .from(catalogueItems)
          .where(
            and(
              eq(catalogueItems.tenantId, tenantId),
              eq(catalogueItems.isbn13, dto.isbn13),
            ),
          )
          .limit(1);

        if (dup.length > 0) {
          throw new ConflictException(
            `A catalogue item with ISBN-13 ${dto.isbn13} already exists`,
          );
        }
      }

      const [row] = await tx
        .insert(catalogueItems)
        .values({
          tenantId,
          title: dto.title,
          subtitle: dto.subtitle ?? null,
          authors: (dto.authors ?? []) as string[],
          isbn13: dto.isbn13 ?? null,
          isbn10: dto.isbn10 ?? null,
          publisher: dto.publisher ?? null,
          publishedYear: dto.publishedYear ?? null,
          language: dto.language ?? 'en',
          format: dto.format ?? 'BOOK',
          description: dto.description ?? null,
          coverUrl: dto.coverUrl ?? null,
          callNumber: dto.callNumber ?? null,
          shelfLocation: dto.shelfLocation ?? null,
          categoryId: dto.categoryId ?? null,
          subjects: (dto.subjects ?? []) as string[],
          createdBy: actorId,
        })
        .returning();

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'catalogue.created',
        entityType: 'catalogue_item',
        entityId: row.id,
        metadata: { title: row.title, isbn13: row.isbn13 },
      });

      return row;
    });

    await this.invalidateCache(tenantId);
    return result;
  }

  async update(
    tenantId: string,
    actorId: string,
    itemId: string,
    dto: UpdateCatalogueItemDto,
  ) {
    const result = await this.database.withTenant(tenantId, async (tx) => {
      const existing = await tx
        .select({ id: catalogueItems.id })
        .from(catalogueItems)
        .where(
          and(
            eq(catalogueItems.tenantId, tenantId),
            eq(catalogueItems.id, itemId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        throw new NotFoundException('Catalogue item not found');
      }

      if (dto.isbn13) {
        const dup = await tx
          .select({ id: catalogueItems.id })
          .from(catalogueItems)
          .where(
            and(
              eq(catalogueItems.tenantId, tenantId),
              eq(catalogueItems.isbn13, dto.isbn13),
            ),
          )
          .limit(1);

        if (dup.length > 0 && dup[0].id !== itemId) {
          throw new ConflictException(
            `Another catalogue item already has ISBN-13 ${dto.isbn13}`,
          );
        }
      }

      const updates: Partial<typeof catalogueItems.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (dto.title !== undefined) updates.title = dto.title;
      if (dto.subtitle !== undefined) updates.subtitle = dto.subtitle;
      if (dto.authors !== undefined) updates.authors = dto.authors as string[];
      if (dto.isbn13 !== undefined) updates.isbn13 = dto.isbn13;
      if (dto.isbn10 !== undefined) updates.isbn10 = dto.isbn10;
      if (dto.publisher !== undefined) updates.publisher = dto.publisher;
      if (dto.publishedYear !== undefined) updates.publishedYear = dto.publishedYear;
      if (dto.language !== undefined) updates.language = dto.language;
      if (dto.format !== undefined) updates.format = dto.format;
      if (dto.description !== undefined) updates.description = dto.description;
      if (dto.coverUrl !== undefined) updates.coverUrl = dto.coverUrl;
      if (dto.callNumber !== undefined) updates.callNumber = dto.callNumber;
      if (dto.shelfLocation !== undefined) updates.shelfLocation = dto.shelfLocation;
      if (dto.categoryId !== undefined) updates.categoryId = dto.categoryId;
      if (dto.subjects !== undefined) updates.subjects = dto.subjects as string[];

      const [row] = await tx
        .update(catalogueItems)
        .set(updates)
        .where(
          and(
            eq(catalogueItems.tenantId, tenantId),
            eq(catalogueItems.id, itemId),
          ),
        )
        .returning();

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'catalogue.updated',
        entityType: 'catalogue_item',
        entityId: itemId,
        metadata: { changes: Object.keys(dto) },
      });

      return row;
    });

    await this.invalidateCache(tenantId);
    return result;
  }

  async archive(tenantId: string, actorId: string, itemId: string) {
    const result = await this.database.withTenant(tenantId, async (tx) => {
      const existing = await tx
        .select({ id: catalogueItems.id, status: catalogueItems.status })
        .from(catalogueItems)
        .where(
          and(
            eq(catalogueItems.tenantId, tenantId),
            eq(catalogueItems.id, itemId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        throw new NotFoundException('Catalogue item not found');
      }

      if (existing[0].status === 'ARCHIVED') {
        throw new ConflictException('Catalogue item is already archived');
      }

      const [row] = await tx
        .update(catalogueItems)
        .set({ status: 'ARCHIVED', updatedAt: new Date() })
        .where(
          and(
            eq(catalogueItems.tenantId, tenantId),
            eq(catalogueItems.id, itemId),
          ),
        )
        .returning({ id: catalogueItems.id, status: catalogueItems.status });

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'catalogue.archived',
        entityType: 'catalogue_item',
        entityId: itemId,
      });

      return row;
    });

    await this.invalidateCache(tenantId);
    return result;
  }
}
