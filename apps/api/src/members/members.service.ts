import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service.js';
import {
  auditLogs,
  groups,
  memberProfiles,
  memberTypes,
  membershipEnquiries,
  users,
} from '../database/schema.js';
import { IdentityLookupService } from '../auth/identity/identity-lookup.service.js';
import { IdentityService } from '../auth/identity/identity.service.js';
import { PasswordService } from '../auth/password/password.service.js';
import { CreateMemberDto } from './dto/create-member.dto.js';
import { MemberIdentifierService } from './member-identifier.service.js';

@Injectable()
export class MembersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly identity: IdentityService,
    private readonly identityLookup: IdentityLookupService,
    private readonly passwordService: PasswordService,
    private readonly memberIdentifier: MemberIdentifierService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateMemberDto) {
    const fullName = dto.fullName.trim();

    if (!fullName) {
      throw new BadRequestException('Full name is required');
    }

    if (!dto.email && !dto.phone) {
      throw new BadRequestException('At least one contact method is required');
    }

    if (Boolean(dto.identifierType) !== Boolean(dto.identifierValue)) {
      throw new BadRequestException(
        'Identifier type and identifier value must be provided together',
      );
    }

    const email = dto.email ? this.identity.normalizeEmail(dto.email) : null;
    const phone = dto.phone ? this.identity.normalizePhone(dto.phone) : null;

    // An identity may exist in another library, but not twice within this tenant.
    for (const [type, value] of [
      ['EMAIL', email],
      ['PHONE', phone],
    ] as const) {
      if (!value) continue;

      const matches = await this.identityLookup.findIdentity(type, value);

      if (matches.some((match) => match.tenantId === tenantId)) {
        throw new ConflictException(
          'A member account with these contact details already exists',
        );
      }
    }

    const temporaryPassword = randomBytes(24).toString('base64url');
    const passwordHash = await this.passwordService.hash(temporaryPassword);

    const identifierValue = dto.identifierValue?.trim() || null;
    const identifierEncrypted = identifierValue
      ? this.memberIdentifier.encrypt(identifierValue)
      : null;
    const identifierHash = identifierValue
      ? this.memberIdentifier.hash(identifierValue)
      : null;

    const membershipExpiresAt = dto.membershipExpiresAt
      ? new Date(dto.membershipExpiresAt)
      : null;

    if (membershipExpiresAt && Number.isNaN(membershipExpiresAt.getTime())) {
      throw new BadRequestException('Invalid membership expiry date');
    }

    try {
      const member = await this.database.withTenant(tenantId, async (tx) => {
        const memberTypeRows = await tx
          .select({ id: memberTypes.id })
          .from(memberTypes)
          .where(
            and(
              eq(memberTypes.id, dto.memberTypeId),
              eq(memberTypes.tenantId, tenantId),
            ),
          )
          .limit(1);

        if (!memberTypeRows[0]) {
          throw new NotFoundException(
            'Member type was not found in this library',
          );
        }

        if (dto.groupId) {
          const groupRows = await tx
            .select({ id: groups.id })
            .from(groups)
            .where(
              and(eq(groups.id, dto.groupId), eq(groups.tenantId, tenantId)),
            )
            .limit(1);

          if (!groupRows[0]) {
            throw new NotFoundException('Group was not found in this library');
          }
        }

        const userRows = await tx
          .insert(users)
          .values({
            tenantId,
            fullName,
            email,
            phone,
            passwordHash,
            role: 'MEMBER',
            status: 'ACTIVE',
            mustChangePassword: true,
          })
          .returning({ id: users.id });

        const userId = userRows[0].id;

        if (email) {
          await this.identityLookup.syncIdentityInTransaction(
            tx,
            tenantId,
            userId,
            'EMAIL',
            email,
          );
        }

        if (phone) {
          await this.identityLookup.syncIdentityInTransaction(
            tx,
            tenantId,
            userId,
            'PHONE',
            phone,
          );
        }

        const profileRows = await tx
          .insert(memberProfiles)
          .values({
            tenantId,
            userId,
            admissionNumber: dto.admissionNumber?.trim() || null,
            identifierType: dto.identifierType ?? null,
            identifierValueEncrypted: identifierEncrypted,
            identifierLookupHash: identifierHash,
            groupId: dto.groupId ?? null,
            memberTypeId: dto.memberTypeId,
            photoUrl: dto.photoUrl?.trim() || null,
            membershipExpiresAt,
          })
          .returning({ id: memberProfiles.id });

        const profileId = profileRows[0].id;

        // Never include contact details, document numbers,
        // encrypted identifiers, or temporary passwords in audit metadata.
        await tx.insert(auditLogs).values({
          tenantId,
          actorId,
          action: 'MEMBER_CREATED',
          entityType: 'MEMBER',
          entityId: profileId,
          metadata: {
            userId,
            memberTypeId: dto.memberTypeId,
            groupId: dto.groupId ?? null,
          },
        });

        return {
          userId,
          profileId,
        };
      });

      return {
        ...member,
        fullName,
        email,
        phone,
        role: 'MEMBER' as const,
        mustChangePassword: true,
        temporaryPassword,
      };
    } catch (error) {
      const databaseError = error as { code?: string };

      if (databaseError.code === '23505') {
        throw new ConflictException(
          'A member with one or more of these details already exists',
        );
      }

      throw error;
    }
  }

  async listMemberTypes(tenantId: string) {
    return this.database.withTenant(tenantId, async (tx) => {
      return tx
        .select({
          id: memberTypes.id,
          name: memberTypes.name,
        })
        .from(memberTypes)
        .where(eq(memberTypes.tenantId, tenantId));
    });
  }

  // ─── Staff Membership Enquiry Review Desk (Approved Decision 2.4 & 8) ──────

  async listEnquiries(tenantId: string, status?: string) {
    return this.database.withTenant(tenantId, async (tx) => {
      const conditions = [eq(membershipEnquiries.tenantId, tenantId)];
      if (status) {
        conditions.push(eq(membershipEnquiries.status, status));
      }

      return tx
        .select()
        .from(membershipEnquiries)
        .where(and(...conditions))
        .orderBy(desc(membershipEnquiries.createdAt));
    });
  }

  async getEnquiryById(tenantId: string, enquiryId: string) {
    return this.database.withTenant(tenantId, async (tx) => {
      const rows = await tx
        .select()
        .from(membershipEnquiries)
        .where(
          and(
            eq(membershipEnquiries.tenantId, tenantId),
            eq(membershipEnquiries.id, enquiryId),
          ),
        )
        .limit(1);

      if (rows.length === 0) {
        throw new NotFoundException(`Enquiry not found`);
      }

      return rows[0];
    });
  }

  async reviewEnquiry(
    tenantId: string,
    actorId: string,
    enquiryId: string,
    status: 'REVIEWED' | 'APPROVED' | 'REJECTED' = 'REVIEWED',
  ) {
    return this.database.withTenant(tenantId, async (tx) => {
      const rows = await tx
        .update(membershipEnquiries)
        .set({
          status,
          reviewedAt: new Date(),
          reviewedBy: actorId,
        })
        .where(
          and(
            eq(membershipEnquiries.tenantId, tenantId),
            eq(membershipEnquiries.id, enquiryId),
          ),
        )
        .returning();

      if (rows.length === 0) {
        throw new NotFoundException(`Enquiry not found`);
      }

      return rows[0];
    });
  }
}
