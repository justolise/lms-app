import {
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { auditLogs, tenants } from '../database/schema.js';
import type {
  LibraryProfileResponseDto,
  UpdateLibraryProfileDto,
} from './dto/library-profile.dto.js';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly database: DatabaseService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  private profileCacheKey(tenantId: string): string {
    return `tenant:${tenantId}:profile`;
  }

  async getProfile(tenantId: string): Promise<LibraryProfileResponseDto> {
    if (this.redis) {
      const cached = await this.redis.get<LibraryProfileResponseDto>(
        this.profileCacheKey(tenantId),
      );
      if (cached) return cached;
    }

    const rows = await this.database.db
      .select({
        id: tenants.id,
        name: tenants.name,
        libraryCode: tenants.libraryCode,
        status: tenants.status,
        logoUrl: tenants.logoUrl,
        email: tenants.email,
        phone: tenants.phone,
        address: tenants.address,
        openingHours: tenants.openingHours,
        website: tenants.website,
        description: tenants.description,
        borrowingRulesSummary: tenants.borrowingRulesSummary,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('Library profile not found');
    }

    const profile = rows[0];

    if (this.redis) {
      await this.redis.set(this.profileCacheKey(tenantId), profile, 300);
    }

    return profile;
  }

  async updateProfile(
    tenantId: string,
    actorId: string,
    dto: UpdateLibraryProfileDto,
  ): Promise<LibraryProfileResponseDto> {
    const existing = await this.getProfile(tenantId);

    const updatePayload: Partial<typeof tenants.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updatePayload.name = dto.name.trim();
    if (dto.logoUrl !== undefined) updatePayload.logoUrl = dto.logoUrl.trim() || null;
    if (dto.email !== undefined) updatePayload.email = dto.email.trim().toLowerCase() || null;
    if (dto.phone !== undefined) updatePayload.phone = dto.phone.trim() || null;
    if (dto.address !== undefined) updatePayload.address = dto.address.trim() || null;
    if (dto.openingHours !== undefined) updatePayload.openingHours = dto.openingHours.trim() || null;
    if (dto.website !== undefined) updatePayload.website = dto.website.trim() || null;
    if (dto.description !== undefined) updatePayload.description = dto.description.trim() || null;
    if (dto.borrowingRulesSummary !== undefined) {
      updatePayload.borrowingRulesSummary = dto.borrowingRulesSummary.trim() || null;
    }

    const [updatedRow] = await this.database.db
      .update(tenants)
      .set(updatePayload)
      .where(eq(tenants.id, tenantId))
      .returning({
        id: tenants.id,
        name: tenants.name,
        libraryCode: tenants.libraryCode,
        status: tenants.status,
        logoUrl: tenants.logoUrl,
        email: tenants.email,
        phone: tenants.phone,
        address: tenants.address,
        openingHours: tenants.openingHours,
        website: tenants.website,
        description: tenants.description,
        borrowingRulesSummary: tenants.borrowingRulesSummary,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
      });

    if (!updatedRow) {
      throw new NotFoundException('Failed to update library profile: not found');
    }

    // Insert immutable audit log
    await this.database.withTenant(tenantId, async (tx) => {
      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'tenant.profile_updated',
        entityType: 'tenant',
        entityId: tenantId,
        metadata: {
          updatedFields: Object.keys(updatePayload).filter((k) => k !== 'updatedAt'),
          previousName: existing.name,
          newName: updatedRow.name,
        },
      });
    });

    // Invalidate Redis caches
    if (this.redis) {
      await this.redis.del(this.profileCacheKey(tenantId));
      await this.redis.del('public:libraries');
      await this.redis.del(`public:library:${existing.libraryCode.toLowerCase()}`);
    }

    return updatedRow;
  }
}
