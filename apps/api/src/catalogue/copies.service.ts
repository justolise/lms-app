import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { copies, catalogueItems, auditLogs } from '../database/schema.js';
import { CreateCopyDto, UpdateCopyDto, UpdateCopyStatusDto } from './dto/copy.dto.js';

// Allowed copy status transitions (CAT-4, INV-2).
// Key = current status; value = set of allowed next statuses.
const ALLOWED_TRANSITIONS: Record<string, Set<string>> = {
  AVAILABLE:  new Set(['ON_LOAN', 'RESERVED', 'LOST', 'DAMAGED', 'WITHDRAWN']),
  ON_LOAN:    new Set(['AVAILABLE', 'LOST', 'DAMAGED']),
  RESERVED:   new Set(['ON_LOAN', 'AVAILABLE']),
  IN_TRANSIT: new Set(['AVAILABLE']),
  LOST:       new Set(['AVAILABLE', 'WITHDRAWN']),
  DAMAGED:    new Set(['AVAILABLE', 'WITHDRAWN']),
  WITHDRAWN:  new Set([]),
};

@Injectable()
export class CopiesService {
  constructor(
    private readonly database: DatabaseService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  private async invalidateCache(tenantId: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(`cache:catalogue:${tenantId}`);
      } catch {
        // Non-blocking
      }
    }
  }

  async listForItem(tenantId: string, itemId: string) {
    // Verify parent item exists
    const item = await this.database.withTenant(tenantId, (tx) =>
      tx
        .select({ id: catalogueItems.id })
        .from(catalogueItems)
        .where(
          and(
            eq(catalogueItems.tenantId, tenantId),
            eq(catalogueItems.id, itemId),
          ),
        )
        .limit(1),
    );

    if (item.length === 0) throw new NotFoundException('Catalogue item not found');

    return this.database.withTenant(tenantId, (tx) =>
      tx
        .select()
        .from(copies)
        .where(
          and(
            eq(copies.tenantId, tenantId),
            eq(copies.catalogueItemId, itemId),
          ),
        )
        .orderBy(copies.barcode),
    );
  }

  async addCopy(
    tenantId: string,
    actorId: string,
    itemId: string,
    dto: CreateCopyDto,
  ) {
    const result = await this.database.withTenant(tenantId, async (tx) => {
      // Verify parent exists
      const item = await tx
        .select({ id: catalogueItems.id })
        .from(catalogueItems)
        .where(
          and(
            eq(catalogueItems.tenantId, tenantId),
            eq(catalogueItems.id, itemId),
          ),
        )
        .limit(1);

      if (item.length === 0) throw new NotFoundException('Catalogue item not found');

      // Barcode uniqueness within tenant
      const dup = await tx
        .select({ id: copies.id })
        .from(copies)
        .where(
          and(eq(copies.tenantId, tenantId), eq(copies.barcode, dto.barcode)),
        )
        .limit(1);

      if (dup.length > 0) {
        throw new ConflictException(
          `Barcode "${dto.barcode}" is already in use`,
        );
      }

      const [row] = await tx
        .insert(copies)
        .values({
          tenantId,
          catalogueItemId: itemId,
          barcode: dto.barcode,
          condition: dto.condition ?? 'GOOD',
          shelfLocation: dto.shelfLocation ?? null,
          acquiredAt: dto.acquiredAt ?? null,
          notes: dto.notes ?? null,
        })
        .returning();

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'copy.added',
        entityType: 'copy',
        entityId: row.id,
        metadata: { barcode: dto.barcode, catalogueItemId: itemId },
      });

      return row;
    });

    await this.invalidateCache(tenantId);
    return result;
  }

  async updateCopy(
    tenantId: string,
    actorId: string,
    itemId: string,
    copyId: string,
    dto: UpdateCopyDto,
  ) {
    const result = await this.database.withTenant(tenantId, async (tx) => {
      const existing = await tx
        .select()
        .from(copies)
        .where(
          and(
            eq(copies.tenantId, tenantId),
            eq(copies.id, copyId),
            eq(copies.catalogueItemId, itemId),
          ),
        )
        .limit(1);

      if (existing.length === 0) throw new NotFoundException('Copy not found');

      const updates: Partial<typeof copies.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (dto.condition !== undefined) updates.condition = dto.condition;
      if (dto.shelfLocation !== undefined) updates.shelfLocation = dto.shelfLocation;
      if (dto.acquiredAt !== undefined) updates.acquiredAt = dto.acquiredAt;
      if (dto.notes !== undefined) updates.notes = dto.notes;

      const [row] = await tx
        .update(copies)
        .set(updates)
        .where(
          and(
            eq(copies.tenantId, tenantId),
            eq(copies.id, copyId),
          ),
        )
        .returning();

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'copy.updated',
        entityType: 'copy',
        entityId: copyId,
        metadata: { changes: Object.keys(dto) },
      });

      return row;
    });

    await this.invalidateCache(tenantId);
    return result;
  }

  async withdraw(
    tenantId: string,
    actorId: string,
    itemId: string,
    copyId: string,
    reason?: string,
  ) {
    const result = await this.database.withTenant(tenantId, async (tx) => {
      const existing = await tx
        .select()
        .from(copies)
        .where(
          and(
            eq(copies.tenantId, tenantId),
            eq(copies.id, copyId),
            eq(copies.catalogueItemId, itemId),
          ),
        )
        .limit(1);

      if (existing.length === 0) throw new NotFoundException('Copy not found');

      const current = existing[0].status;
      const allowed = ALLOWED_TRANSITIONS[current];

      if (!allowed?.has('WITHDRAWN')) {
        throw new ConflictException(
          `Cannot withdraw a copy with status "${current}"`,
        );
      }

      const withdrawReason = reason?.trim() || 'Withdrawn from circulation';
      const existingNotes = existing[0].notes ? `${existing[0].notes}\n` : '';
      const timestamp = new Date().toISOString().split('T')[0];
      const updatedNotes = `${existingNotes}[${timestamp}] WITHDRAWN: ${withdrawReason}`;

      const [row] = await tx
        .update(copies)
        .set({
          status: 'WITHDRAWN',
          notes: updatedNotes,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(copies.tenantId, tenantId),
            eq(copies.id, copyId),
          ),
        )
        .returning({ id: copies.id, status: copies.status });

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'copy.withdrawn',
        entityType: 'copy',
        entityId: copyId,
        metadata: {
          previousStatus: current,
          newStatus: 'WITHDRAWN',
          reason: withdrawReason,
          barcode: existing[0].barcode,
        },
      });

      return row;
    });

    await this.invalidateCache(tenantId);
    return result;
  }

  /**
   * INV-2: Update copy status (LOST, DAMAGED, WITHDRAWN, or restored to AVAILABLE)
   * with mandatory audit reason logging.
   */
  async updateStatus(
    tenantId: string,
    actorId: string,
    itemId: string,
    copyId: string,
    dto: UpdateCopyStatusDto,
  ) {
    const reason = dto.reason.trim();
    if (!reason) {
      throw new BadRequestException(
        'A reason is mandatory when changing copy status',
      );
    }

    const result = await this.database.withTenant(tenantId, async (tx) => {
      const existing = await tx
        .select()
        .from(copies)
        .where(
          and(
            eq(copies.tenantId, tenantId),
            eq(copies.id, copyId),
            eq(copies.catalogueItemId, itemId),
          ),
        )
        .limit(1);

      if (existing.length === 0) throw new NotFoundException('Copy not found');

      const current = existing[0].status;
      const targetStatus = dto.status;

      if (current === targetStatus) {
        return existing[0];
      }

      const allowed = ALLOWED_TRANSITIONS[current];
      if (!allowed?.has(targetStatus)) {
        throw new ConflictException(
          `Cannot transition copy from "${current}" to "${targetStatus}"`,
        );
      }

      const existingNotes = existing[0].notes ? `${existing[0].notes}\n` : '';
      const timestamp = new Date().toISOString().split('T')[0];
      const updatedNotes = `${existingNotes}[${timestamp}] ${targetStatus}: ${reason}`;

      const [row] = await tx
        .update(copies)
        .set({
          status: targetStatus as typeof copies.$inferSelect['status'],
          notes: updatedNotes,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(copies.tenantId, tenantId),
            eq(copies.id, copyId),
          ),
        )
        .returning();

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: `copy.${targetStatus.toLowerCase()}`,
        entityType: 'copy',
        entityId: copyId,
        metadata: {
          previousStatus: current,
          newStatus: targetStatus,
          reason,
          barcode: existing[0].barcode,
        },
      });

      return row;
    });

    await this.invalidateCache(tenantId);
    return result;
  }

  /**
   * Transition a copy to a new status (used by Circulation module).
   * Enforces the allowed transition matrix — throws 409 on invalid transition.
   */
  async transition(
    tenantId: string,
    actorId: string,
    copyId: string,
    toStatus: string,
    reason?: string,
  ) {
    const result = await this.database.withTenant(tenantId, async (tx) => {
      const existing = await tx
        .select()
        .from(copies)
        .where(and(eq(copies.tenantId, tenantId), eq(copies.id, copyId)))
        .limit(1);

      if (existing.length === 0) throw new NotFoundException('Copy not found');

      const current = existing[0].status;
      const allowed = ALLOWED_TRANSITIONS[current];

      if (!allowed?.has(toStatus)) {
        throw new ConflictException(
          `Cannot transition copy from "${current}" to "${toStatus}"`,
        );
      }

      const [row] = await tx
        .update(copies)
        .set({ status: toStatus as typeof copies.$inferSelect['status'], updatedAt: new Date() })
        .where(and(eq(copies.tenantId, tenantId), eq(copies.id, copyId)))
        .returning();

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'copy.status_changed',
        entityType: 'copy',
        entityId: copyId,
        metadata: { from: current, to: toStatus, reason },
      });

      return row;
    });

    await this.invalidateCache(tenantId);
    return result;
  }
}
