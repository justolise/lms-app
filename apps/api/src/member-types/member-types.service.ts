import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service.js';
import {
  auditLogs,
  loanPolicies,
  memberProfiles,
  memberTypes,
} from '../database/schema.js';
import {
  CreateLoanPolicyDto,
  CreateMemberTypeDto,
  UpdateLoanPolicyDto,
  UpdateMemberTypeDto,
} from './dto/member-type.dto.js';

@Injectable()
export class MemberTypesService {
  constructor(private readonly database: DatabaseService) {}

  // ─── Member Type CRUD ───────────────────────────────────────

  async create(tenantId: string, actorId: string, dto: CreateMemberTypeDto) {
    const name = dto.name.trim();

    return this.database.withTenant(tenantId, async (tx) => {
      const existing = await tx
        .select({ id: memberTypes.id })
        .from(memberTypes)
        .where(
          and(
            eq(memberTypes.tenantId, tenantId),
            eq(memberTypes.name, name),
          ),
        )
        .limit(1);

      if (existing[0]) {
        throw new ConflictException(
          'A member type with this name already exists',
        );
      }

      const rows = await tx
        .insert(memberTypes)
        .values({
          tenantId,
          name,
          description: dto.description?.trim() || null,
        })
        .returning({
          id: memberTypes.id,
          name: memberTypes.name,
          description: memberTypes.description,
          isActive: memberTypes.isActive,
          createdAt: memberTypes.createdAt,
        });

      const memberType = rows[0];

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'MEMBER_TYPE_CREATED',
        entityType: 'MEMBER_TYPE',
        entityId: memberType.id,
        metadata: { name },
      });

      return memberType;
    });
  }

  async list(tenantId: string) {
    return this.database.withTenant(tenantId, async (tx) => {
      return tx
        .select({
          id: memberTypes.id,
          name: memberTypes.name,
          description: memberTypes.description,
          isActive: memberTypes.isActive,
          createdAt: memberTypes.createdAt,
        })
        .from(memberTypes)
        .where(eq(memberTypes.tenantId, tenantId))
        .orderBy(memberTypes.name);
    });
  }

  async getById(tenantId: string, memberTypeId: string) {
    return this.database.withTenant(tenantId, async (tx) => {
      const rows = await tx
        .select({
          id: memberTypes.id,
          name: memberTypes.name,
          description: memberTypes.description,
          isActive: memberTypes.isActive,
          createdAt: memberTypes.createdAt,
          updatedAt: memberTypes.updatedAt,
        })
        .from(memberTypes)
        .where(
          and(
            eq(memberTypes.tenantId, tenantId),
            eq(memberTypes.id, memberTypeId),
          ),
        )
        .limit(1);

      if (!rows[0]) {
        throw new NotFoundException('Member type not found');
      }

      const policies = await tx
        .select({
          id: loanPolicies.id,
          itemFormat: loanPolicies.itemFormat,
          loanDurationDays: loanPolicies.loanDurationDays,
          maxConcurrentLoans: loanPolicies.maxConcurrentLoans,
          maxRenewals: loanPolicies.maxRenewals,
          gracePeriodDays: loanPolicies.gracePeriodDays,
          dailyFineMinorUnits: loanPolicies.dailyFineMinorUnits,
          maxFineMinorUnits: loanPolicies.maxFineMinorUnits,
        })
        .from(loanPolicies)
        .where(
          and(
            eq(loanPolicies.tenantId, tenantId),
            eq(loanPolicies.memberTypeId, memberTypeId),
          ),
        )
        .orderBy(loanPolicies.itemFormat);

      return { ...rows[0], policies };
    });
  }

  async update(
    tenantId: string,
    actorId: string,
    memberTypeId: string,
    dto: UpdateMemberTypeDto,
  ) {
    return this.database.withTenant(tenantId, async (tx) => {
      const existing = await tx
        .select({ id: memberTypes.id, name: memberTypes.name })
        .from(memberTypes)
        .where(
          and(
            eq(memberTypes.tenantId, tenantId),
            eq(memberTypes.id, memberTypeId),
          ),
        )
        .limit(1);

      if (!existing[0]) {
        throw new NotFoundException('Member type not found');
      }

      const updates: Record<string, unknown> = {
        updatedAt: sql`now()`,
      };
      const changes: Record<string, unknown> = {};

      if (dto.name !== undefined) {
        const newName = dto.name.trim();

        // Check uniqueness if name is changing.
        if (newName !== existing[0].name) {
          const duplicate = await tx
            .select({ id: memberTypes.id })
            .from(memberTypes)
            .where(
              and(
                eq(memberTypes.tenantId, tenantId),
                eq(memberTypes.name, newName),
              ),
            )
            .limit(1);

          if (duplicate[0]) {
            throw new ConflictException(
              'A member type with this name already exists',
            );
          }
        }

        updates.name = newName;
        changes.name = newName;
      }

      if (dto.description !== undefined) {
        updates.description = dto.description.trim() || null;
        changes.description = updates.description;
      }

      if (dto.isActive !== undefined) {
        updates.isActive = dto.isActive;
        changes.isActive = dto.isActive;
      }

      if (Object.keys(changes).length === 0) {
        throw new BadRequestException('No fields to update');
      }

      const rows = await tx
        .update(memberTypes)
        .set(updates)
        .where(
          and(
            eq(memberTypes.tenantId, tenantId),
            eq(memberTypes.id, memberTypeId),
          ),
        )
        .returning({
          id: memberTypes.id,
          name: memberTypes.name,
          description: memberTypes.description,
          isActive: memberTypes.isActive,
          updatedAt: memberTypes.updatedAt,
        });

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'MEMBER_TYPE_UPDATED',
        entityType: 'MEMBER_TYPE',
        entityId: memberTypeId,
        metadata: changes,
      });

      return rows[0];
    });
  }

  // ─── Loan Policy CRUD ───────────────────────────────────────

  async createPolicy(
    tenantId: string,
    actorId: string,
    memberTypeId: string,
    dto: CreateLoanPolicyDto,
  ) {
    const itemFormat = dto.itemFormat.trim().toUpperCase();

    return this.database.withTenant(tenantId, async (tx) => {
      // Verify member type exists in this tenant.
      const typeRows = await tx
        .select({ id: memberTypes.id })
        .from(memberTypes)
        .where(
          and(
            eq(memberTypes.tenantId, tenantId),
            eq(memberTypes.id, memberTypeId),
          ),
        )
        .limit(1);

      if (!typeRows[0]) {
        throw new NotFoundException('Member type not found');
      }

      // Check for duplicate (member_type, item_format).
      const existing = await tx
        .select({ id: loanPolicies.id })
        .from(loanPolicies)
        .where(
          and(
            eq(loanPolicies.tenantId, tenantId),
            eq(loanPolicies.memberTypeId, memberTypeId),
            eq(loanPolicies.itemFormat, itemFormat),
          ),
        )
        .limit(1);

      if (existing[0]) {
        throw new ConflictException(
          `A loan policy for item format "${itemFormat}" already exists on this member type`,
        );
      }

      const rows = await tx
        .insert(loanPolicies)
        .values({
          tenantId,
          memberTypeId,
          itemFormat,
          loanDurationDays: dto.loanDurationDays,
          maxConcurrentLoans: dto.maxConcurrentLoans,
          maxRenewals: dto.maxRenewals,
          gracePeriodDays: dto.gracePeriodDays,
          dailyFineMinorUnits: dto.dailyFineMinorUnits,
          maxFineMinorUnits: dto.maxFineMinorUnits,
        })
        .returning({
          id: loanPolicies.id,
          itemFormat: loanPolicies.itemFormat,
          loanDurationDays: loanPolicies.loanDurationDays,
          maxConcurrentLoans: loanPolicies.maxConcurrentLoans,
          maxRenewals: loanPolicies.maxRenewals,
          gracePeriodDays: loanPolicies.gracePeriodDays,
          dailyFineMinorUnits: loanPolicies.dailyFineMinorUnits,
          maxFineMinorUnits: loanPolicies.maxFineMinorUnits,
        });

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'LOAN_POLICY_CREATED',
        entityType: 'LOAN_POLICY',
        entityId: rows[0].id,
        metadata: {
          memberTypeId,
          itemFormat,
          loanDurationDays: dto.loanDurationDays,
          maxConcurrentLoans: dto.maxConcurrentLoans,
          maxRenewals: dto.maxRenewals,
        },
      });

      return rows[0];
    });
  }

  async updatePolicy(
    tenantId: string,
    actorId: string,
    memberTypeId: string,
    policyId: string,
    dto: UpdateLoanPolicyDto,
  ) {
    return this.database.withTenant(tenantId, async (tx) => {
      const existing = await tx
        .select({ id: loanPolicies.id })
        .from(loanPolicies)
        .where(
          and(
            eq(loanPolicies.tenantId, tenantId),
            eq(loanPolicies.memberTypeId, memberTypeId),
            eq(loanPolicies.id, policyId),
          ),
        )
        .limit(1);

      if (!existing[0]) {
        throw new NotFoundException('Loan policy not found');
      }

      const updates: Record<string, unknown> = {
        updatedAt: sql`now()`,
      };
      const changes: Record<string, unknown> = {};

      for (const field of [
        'loanDurationDays',
        'maxConcurrentLoans',
        'maxRenewals',
        'gracePeriodDays',
        'dailyFineMinorUnits',
        'maxFineMinorUnits',
      ] as const) {
        if (dto[field] !== undefined) {
          updates[field] = dto[field];
          changes[field] = dto[field];
        }
      }

      if (Object.keys(changes).length === 0) {
        throw new BadRequestException('No fields to update');
      }

      const rows = await tx
        .update(loanPolicies)
        .set(updates)
        .where(
          and(
            eq(loanPolicies.tenantId, tenantId),
            eq(loanPolicies.memberTypeId, memberTypeId),
            eq(loanPolicies.id, policyId),
          ),
        )
        .returning({
          id: loanPolicies.id,
          itemFormat: loanPolicies.itemFormat,
          loanDurationDays: loanPolicies.loanDurationDays,
          maxConcurrentLoans: loanPolicies.maxConcurrentLoans,
          maxRenewals: loanPolicies.maxRenewals,
          gracePeriodDays: loanPolicies.gracePeriodDays,
          dailyFineMinorUnits: loanPolicies.dailyFineMinorUnits,
          maxFineMinorUnits: loanPolicies.maxFineMinorUnits,
          updatedAt: loanPolicies.updatedAt,
        });

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'LOAN_POLICY_UPDATED',
        entityType: 'LOAN_POLICY',
        entityId: policyId,
        metadata: { memberTypeId, ...changes },
      });

      return rows[0];
    });
  }

  async deletePolicy(
    tenantId: string,
    actorId: string,
    memberTypeId: string,
    policyId: string,
  ) {
    return this.database.withTenant(tenantId, async (tx) => {
      const existing = await tx
        .select({
          id: loanPolicies.id,
          itemFormat: loanPolicies.itemFormat,
        })
        .from(loanPolicies)
        .where(
          and(
            eq(loanPolicies.tenantId, tenantId),
            eq(loanPolicies.memberTypeId, memberTypeId),
            eq(loanPolicies.id, policyId),
          ),
        )
        .limit(1);

      if (!existing[0]) {
        throw new NotFoundException('Loan policy not found');
      }

      await tx
        .delete(loanPolicies)
        .where(
          and(
            eq(loanPolicies.tenantId, tenantId),
            eq(loanPolicies.id, policyId),
          ),
        );

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'LOAN_POLICY_DELETED',
        entityType: 'LOAN_POLICY',
        entityId: policyId,
        metadata: {
          memberTypeId,
          itemFormat: existing[0].itemFormat,
        },
      });

      return { deleted: true };
    });
  }
}
