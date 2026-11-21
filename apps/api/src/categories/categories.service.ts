import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service.js';
import { categories, auditLogs } from '../database/schema.js';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly database: DatabaseService) {}

  async list(tenantId: string) {
    return this.database.withTenant(tenantId, (tx) =>
      tx
        .select({
          id: categories.id,
          name: categories.name,
          description: categories.description,
          parentId: categories.parentId,
          createdAt: categories.createdAt,
          updatedAt: categories.updatedAt,
        })
        .from(categories)
        .where(eq(categories.tenantId, tenantId))
        .orderBy(categories.name),
    );
  }

  async getById(tenantId: string, categoryId: string) {
    const rows = await this.database.withTenant(tenantId, (tx) =>
      tx
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.tenantId, tenantId),
            eq(categories.id, categoryId),
          ),
        )
        .limit(1),
    );

    if (rows.length === 0) {
      throw new NotFoundException('Category not found');
    }

    return rows[0];
  }

  async create(
    tenantId: string,
    actorId: string,
    dto: CreateCategoryDto,
  ) {
    const name = dto.name.trim();

    return this.database.withTenant(tenantId, async (tx) => {
      // Uniqueness enforced by DB index but check early for a clear error.
      const existing = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(eq(categories.tenantId, tenantId), eq(categories.name, name)),
        )
        .limit(1);

      if (existing.length > 0) {
        throw new ConflictException(
          `A category named "${name}" already exists`,
        );
      }

      if (dto.parentId) {
        const parent = await tx
          .select({ id: categories.id })
          .from(categories)
          .where(
            and(
              eq(categories.tenantId, tenantId),
              eq(categories.id, dto.parentId),
            ),
          )
          .limit(1);

        if (parent.length === 0) {
          throw new NotFoundException('Parent category not found');
        }
      }

      const [row] = await tx
        .insert(categories)
        .values({
          tenantId,
          name,
          description: dto.description ?? null,
          parentId: dto.parentId ?? null,
        })
        .returning();

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'category.created',
        entityType: 'category',
        entityId: row.id,
        metadata: { name },
      });

      return row;
    });
  }

  async update(
    tenantId: string,
    actorId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ) {
    return this.database.withTenant(tenantId, async (tx) => {
      const existing = await tx
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.tenantId, tenantId),
            eq(categories.id, categoryId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        throw new NotFoundException('Category not found');
      }

      const updates: Partial<typeof categories.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (dto.name !== undefined) updates.name = dto.name.trim();
      if (dto.description !== undefined) updates.description = dto.description;
      if (dto.parentId !== undefined) {
        // Guard: prevent self-reference
        if (dto.parentId === categoryId) {
          throw new ConflictException('A category cannot be its own parent');
        }
        updates.parentId = dto.parentId;
      }

      const [row] = await tx
        .update(categories)
        .set(updates)
        .where(
          and(
            eq(categories.tenantId, tenantId),
            eq(categories.id, categoryId),
          ),
        )
        .returning();

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'category.updated',
        entityType: 'category',
        entityId: categoryId,
        metadata: { changes: dto },
      });

      return row;
    });
  }

  async delete(tenantId: string, actorId: string, categoryId: string) {
    return this.database.withTenant(tenantId, async (tx) => {
      const existing = await tx
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.tenantId, tenantId),
            eq(categories.id, categoryId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        throw new NotFoundException('Category not found');
      }

      await tx
        .delete(categories)
        .where(
          and(
            eq(categories.tenantId, tenantId),
            eq(categories.id, categoryId),
          ),
        );

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'category.deleted',
        entityType: 'category',
        entityId: categoryId,
        metadata: { name: existing[0].name },
      });

      return { success: true };
    });
  }
}
