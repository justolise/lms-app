import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service.js';
import {
  auditLogs,
  catalogueItems,
  copies,
  fineEntries,
  groups,
  loans,
  memberProfiles,
  memberTypes,
  membershipEnquiries,
  users,
} from '../database/schema.js';
import { IdentityLookupService } from '../auth/identity/identity-lookup.service.js';
import { IdentityService } from '../auth/identity/identity.service.js';
import { PasswordService } from '../auth/password/password.service.js';
import { CreateMemberDto } from './dto/create-member.dto.js';
import { ListMembersDto } from './dto/list-members.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
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

  // ─── MEM-1: Member Profile Directory, Details & Update ─────────────────────

  async listMembers(tenantId: string, dto: ListMembersDto) {
    return this.database.withTenant(tenantId, async (tx) => {
      const conditions = [
        eq(users.tenantId, tenantId),
        eq(users.role, 'MEMBER'),
      ];

      if (dto.status) {
        conditions.push(eq(users.status, dto.status));
      }
      if (dto.memberTypeId) {
        conditions.push(eq(memberProfiles.memberTypeId, dto.memberTypeId));
      }
      if (dto.groupId) {
        conditions.push(eq(memberProfiles.groupId, dto.groupId));
      }
      if (dto.search && dto.search.trim()) {
        const term = `%${dto.search.trim()}%`;
        conditions.push(
          or(
            ilike(users.fullName, term),
            ilike(users.email, term),
            ilike(users.phone, term),
            ilike(memberProfiles.admissionNumber, term),
          )!,
        );
      }

      const rows = await tx
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          role: users.role,
          status: users.status,
          admissionNumber: memberProfiles.admissionNumber,
          memberTypeId: memberProfiles.memberTypeId,
          memberTypeName: memberTypes.name,
          groupId: memberProfiles.groupId,
          groupName: groups.name,
          photoUrl: memberProfiles.photoUrl,
          membershipExpiresAt: memberProfiles.membershipExpiresAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .innerJoin(
          memberProfiles,
          and(
            eq(memberProfiles.tenantId, users.tenantId),
            eq(memberProfiles.userId, users.id),
          ),
        )
        .leftJoin(
          memberTypes,
          and(
            eq(memberTypes.tenantId, users.tenantId),
            eq(memberTypes.id, memberProfiles.memberTypeId),
          ),
        )
        .leftJoin(
          groups,
          and(
            eq(groups.tenantId, users.tenantId),
            eq(groups.id, memberProfiles.groupId),
          ),
        )
        .where(and(...conditions))
        .orderBy(desc(users.createdAt))
        .limit(dto.limit)
        .offset(dto.offset);

      return rows;
    });
  }

  async getMemberById(tenantId: string, memberId: string) {
    return this.database.withTenant(tenantId, async (tx) => {
      const [row] = await tx
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          role: users.role,
          status: users.status,
          mustChangePassword: users.mustChangePassword,
          profileId: memberProfiles.id,
          admissionNumber: memberProfiles.admissionNumber,
          identifierType: memberProfiles.identifierType,
          memberTypeId: memberProfiles.memberTypeId,
          memberTypeName: memberTypes.name,
          groupId: memberProfiles.groupId,
          groupName: groups.name,
          photoUrl: memberProfiles.photoUrl,
          membershipExpiresAt: memberProfiles.membershipExpiresAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .innerJoin(
          memberProfiles,
          and(
            eq(memberProfiles.tenantId, users.tenantId),
            eq(memberProfiles.userId, users.id),
          ),
        )
        .leftJoin(
          memberTypes,
          and(
            eq(memberTypes.tenantId, users.tenantId),
            eq(memberTypes.id, memberProfiles.memberTypeId),
          ),
        )
        .leftJoin(
          groups,
          and(
            eq(groups.tenantId, users.tenantId),
            eq(groups.id, memberProfiles.groupId),
          ),
        )
        .where(and(eq(users.tenantId, tenantId), eq(users.id, memberId)))
        .limit(1);

      if (!row) {
        throw new NotFoundException('Member not found');
      }

      // Aggregate active loans count
      const [loansCount] = await tx
        .select({
          activeLoans: sql<number>`count(*)::int`,
        })
        .from(loans)
        .where(
          and(
            eq(loans.tenantId, tenantId),
            eq(loans.userId, memberId),
            eq(loans.status, 'ACTIVE'),
          ),
        );

      // Aggregate fine balance
      const [fineRow] = await tx
        .select({
          balance: sql<number>`coalesce(sum(case when ${fineEntries.entryType} = 'CHARGE' then ${fineEntries.amountMinorUnits} else 0 end) - sum(case when ${fineEntries.entryType} in ('PAYMENT', 'WAIVER') then ${fineEntries.amountMinorUnits} else 0 end), 0)::int`,
        })
        .from(fineEntries)
        .where(
          and(
            eq(fineEntries.tenantId, tenantId),
            eq(fineEntries.userId, memberId),
          ),
        );

      const fineBalanceMinorUnits = Number(fineRow?.balance) || 0;

      return {
        ...row,
        activeLoansCount: Number(loansCount?.activeLoans) || 0,
        fineBalanceMinorUnits,
        fineBalanceKes: fineBalanceMinorUnits / 100,
      };
    });
  }

  async updateMember(
    tenantId: string,
    actorId: string,
    memberId: string,
    dto: UpdateMemberDto,
  ) {
    return this.database.withTenant(tenantId, async (tx) => {
      // 1. Verify member exists in tenant
      const [existing] = await tx
        .select({
          id: users.id,
          role: users.role,
          email: users.email,
          phone: users.phone,
          profileId: memberProfiles.id,
          admissionNumber: memberProfiles.admissionNumber,
        })
        .from(users)
        .innerJoin(
          memberProfiles,
          and(
            eq(memberProfiles.tenantId, users.tenantId),
            eq(memberProfiles.userId, users.id),
          ),
        )
        .where(and(eq(users.tenantId, tenantId), eq(users.id, memberId)))
        .limit(1);

      if (!existing) {
        throw new NotFoundException('Member not found');
      }

      // 2. Validate admission number uniqueness within tenant (MEM-1)
      if (
        dto.admissionNumber !== undefined &&
        dto.admissionNumber.trim() !== '' &&
        dto.admissionNumber.trim() !== existing.admissionNumber
      ) {
        const [duplicateAdmission] = await tx
          .select({ id: memberProfiles.id })
          .from(memberProfiles)
          .where(
            and(
              eq(memberProfiles.tenantId, tenantId),
              eq(memberProfiles.admissionNumber, dto.admissionNumber.trim()),
              ne(memberProfiles.userId, memberId),
            ),
          )
          .limit(1);

        if (duplicateAdmission) {
          throw new ConflictException(
            'A member with this admission number already exists in this library',
          );
        }
      }

      // 3. Validate member type if changing
      if (dto.memberTypeId) {
        const [mt] = await tx
          .select({ id: memberTypes.id })
          .from(memberTypes)
          .where(
            and(
              eq(memberTypes.tenantId, tenantId),
              eq(memberTypes.id, dto.memberTypeId),
            ),
          )
          .limit(1);
        if (!mt) {
          throw new NotFoundException('Member type not found in this library');
        }
      }

      // 4. Validate group if changing
      if (dto.groupId) {
        const [g] = await tx
          .select({ id: groups.id })
          .from(groups)
          .where(
            and(eq(groups.tenantId, tenantId), eq(groups.id, dto.groupId)),
          )
          .limit(1);
        if (!g) {
          throw new NotFoundException('Group not found in this library');
        }
      }

      // 5. Contact validation & identity sync
      const newEmail = dto.email ? this.identity.normalizeEmail(dto.email) : undefined;
      const newPhone = dto.phone ? this.identity.normalizePhone(dto.phone) : undefined;

      if (newEmail && newEmail !== existing.email) {
        const matches = await this.identityLookup.findIdentity('EMAIL', newEmail);
        if (matches.some((m) => m.tenantId === tenantId && m.userId !== memberId)) {
          throw new ConflictException('A member with this email already exists in this library');
        }
        await this.identityLookup.syncIdentityInTransaction(
          tx,
          tenantId,
          memberId,
          'EMAIL',
          newEmail,
        );
      }

      if (newPhone && newPhone !== existing.phone) {
        const matches = await this.identityLookup.findIdentity('PHONE', newPhone);
        if (matches.some((m) => m.tenantId === tenantId && m.userId !== memberId)) {
          throw new ConflictException('A member with this phone number already exists in this library');
        }
        await this.identityLookup.syncIdentityInTransaction(
          tx,
          tenantId,
          memberId,
          'PHONE',
          newPhone,
        );
      }

      const now = new Date();

      // 6. Update user
      const userUpdates: Record<string, unknown> = { updatedAt: now };
      if (dto.fullName) userUpdates.fullName = dto.fullName.trim();
      if (newEmail !== undefined) userUpdates.email = newEmail;
      if (newPhone !== undefined) userUpdates.phone = newPhone;
      if (dto.status) userUpdates.status = dto.status;

      await tx
        .update(users)
        .set(userUpdates)
        .where(and(eq(users.tenantId, tenantId), eq(users.id, memberId)));

      // 7. Update profile
      const profileUpdates: Record<string, unknown> = { updatedAt: now };
      if (dto.admissionNumber !== undefined) {
        profileUpdates.admissionNumber = dto.admissionNumber.trim() || null;
      }
      if (dto.memberTypeId) profileUpdates.memberTypeId = dto.memberTypeId;
      if (dto.groupId !== undefined) profileUpdates.groupId = dto.groupId || null;
      if (dto.photoUrl !== undefined) profileUpdates.photoUrl = dto.photoUrl?.trim() || null;
      if (dto.membershipExpiresAt !== undefined) {
        profileUpdates.membershipExpiresAt = dto.membershipExpiresAt
          ? new Date(dto.membershipExpiresAt)
          : null;
      }

      await tx
        .update(memberProfiles)
        .set(profileUpdates)
        .where(
          and(
            eq(memberProfiles.tenantId, tenantId),
            eq(memberProfiles.userId, memberId),
          ),
        );

      // 8. Audit log (MEM-1)
      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'MEMBER_UPDATED',
        entityType: 'MEMBER',
        entityId: memberId,
        metadata: {
          updatedFields: Object.keys(dto),
        },
      });

      return this.getMemberById(tenantId, memberId);
    });
  }

  // ─── MEM-4: Borrowing History & Current Loans ──────────────────────────────

  async getBorrowingHistory(
    tenantId: string,
    targetUserId: string,
    actorId: string,
    actorRole: string,
  ) {
    const isStaff = actorRole === 'ADMIN' || actorRole === 'LIBRARIAN';
    if (!isStaff && actorId !== targetUserId) {
      throw new ForbiddenException(
        'Cannot inspect borrowing history belonging to another patron',
      );
    }

    return this.database.withTenant(tenantId, async (tx) => {
      const rows = await tx
        .select({
          id: loans.id,
          loanId: loans.id,
          copyId: loans.copyId,
          copyBarcode: copies.barcode,
          catalogueItemId: loans.catalogueItemId,
          bookTitle: catalogueItems.title,
          bookAuthor: sql<string>`array_to_string(${catalogueItems.authors}, ', ')`,
          bookFormat: catalogueItems.format,
          loanDurationDays: loans.loanDurationDays,
          maxRenewals: loans.maxRenewals,
          renewalCount: loans.renewalCount,
          checkedOutAt: loans.checkedOutAt,
          dueAt: loans.dueAt,
          returnedAt: loans.returnedAt,
          status: loans.status,
          fineMinorUnits: loans.fineMinorUnits,
          fineKes: sql<number>`coalesce(${loans.fineMinorUnits}::numeric / 100, 0)`,
          overrideReason: loans.overrideReason,
        })
        .from(loans)
        .innerJoin(
          catalogueItems,
          and(
            eq(catalogueItems.tenantId, loans.tenantId),
            eq(catalogueItems.id, loans.catalogueItemId),
          ),
        )
        .innerJoin(
          copies,
          and(
            eq(copies.tenantId, loans.tenantId),
            eq(copies.id, loans.copyId),
          ),
        )
        .where(
          and(
            eq(loans.tenantId, tenantId),
            eq(loans.userId, targetUserId),
          ),
        )
        .orderBy(desc(loans.checkedOutAt));

      return rows;
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
