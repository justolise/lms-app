import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service.js';
import {
  auditLogs,
  groups,
  memberProfiles,
  memberTypes,
  tenants,
  users,
} from '../database/schema.js';
import { IdentityLookupService } from '../auth/identity/identity-lookup.service.js';
import { IdentityService } from '../auth/identity/identity.service.js';
import { PasswordService } from '../auth/password/password.service.js';
import { SessionService } from '../auth/session/session.service.js';
import { CreateLibrarianDto } from './dto/create-librarian.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserDirectoryQueryDto } from './dto/user-directory-query.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly identity: IdentityService,
    private readonly identityLookup: IdentityLookupService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
  ) {}

  async createLibrarian(
    tenantId: string,
    actorId: string,
    dto: CreateLibrarianDto,
  ) {
    const fullName = dto.fullName.trim();

    if (!fullName) {
      throw new BadRequestException('Full name is required');
    }

    if (!dto.email && !dto.phone) {
      throw new BadRequestException('At least one contact method is required');
    }

    const email = dto.email ? this.identity.normalizeEmail(dto.email) : null;
    const phone = dto.phone ? this.identity.normalizePhone(dto.phone) : null;

    for (const [type, value] of [
      ['EMAIL', email],
      ['PHONE', phone],
    ] as const) {
      if (!value) continue;

      const matches = await this.identityLookup.findIdentity(type, value);

      if (matches.some((match) => match.tenantId === tenantId)) {
        throw new ConflictException(
          'An account with these contact details already exists in this library',
        );
      }
    }

    const temporaryPassword = randomBytes(24).toString('base64url');
    const passwordHash = await this.passwordService.hash(temporaryPassword);

    try {
      const createdUser = await this.database.withTenant(
        tenantId,
        async (tx) => {
          const userRows = await tx
            .insert(users)
            .values({
              tenantId,
              fullName,
              email,
              phone,
              passwordHash,
              role: 'LIBRARIAN',
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

          await tx.insert(auditLogs).values({
            tenantId,
            actorId,
            action: 'LIBRARIAN_CREATED',
            entityType: 'USER',
            entityId: userId,
            metadata: {
              role: 'LIBRARIAN',
            },
          });

          return { userId };
        },
      );

      return {
        userId: createdUser.userId,
        fullName,
        email,
        phone,
        role: 'LIBRARIAN' as const,
        mustChangePassword: true,
        temporaryPassword,
      };
    } catch (error) {
      const databaseError = error as { code?: string };

      if (databaseError.code === '23505') {
        throw new ConflictException(
          'A user with these contact details already exists',
        );
      }

      throw error;
    }
  }

  async getDirectory(tenantId: string, query: UserDirectoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    return this.database.withTenant(tenantId, async (tx) => {
      const searchFilter = query.search
        ? or(
            ilike(users.fullName, `%${query.search}%`),
            ilike(users.email, `%${query.search}%`),
            ilike(users.phone, `%${query.search}%`),
            ilike(memberProfiles.admissionNumber, `%${query.search}%`),
          )
        : undefined;

      const whereClause = searchFilter
        ? and(eq(users.tenantId, tenantId), searchFilter)
        : eq(users.tenantId, tenantId);

      const countRows = await tx
        .select({ total: count() })
        .from(users)
        .leftJoin(
          memberProfiles,
          and(
            eq(memberProfiles.userId, users.id),
            eq(memberProfiles.tenantId, users.tenantId),
          ),
        )
        .where(whereClause);

      const total = Number(countRows[0]?.total ?? 0);

      const userRows = await tx
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
          admissionNumber: memberProfiles.admissionNumber,
          memberTypeName: memberTypes.name,
          groupName: groups.name,
        })
        .from(users)
        .leftJoin(
          memberProfiles,
          and(
            eq(memberProfiles.userId, users.id),
            eq(memberProfiles.tenantId, users.tenantId),
          ),
        )
        .leftJoin(
          memberTypes,
          and(
            eq(memberTypes.id, memberProfiles.memberTypeId),
            eq(memberTypes.tenantId, memberProfiles.tenantId),
          ),
        )
        .leftJoin(
          groups,
          and(
            eq(groups.id, memberProfiles.groupId),
            eq(groups.tenantId, memberProfiles.tenantId),
          ),
        )
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      const formattedUsers = userRows.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        admissionNumber: u.admissionNumber ?? undefined,
        memberType: u.memberTypeName ?? undefined,
        group: u.groupName ?? undefined,
      }));

      return {
        users: formattedUsers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    });
  }

  async getUserById(tenantId: string, targetUserId: string) {
    return this.database.withTenant(tenantId, async (tx) => {
      const rows = await tx
        .select({
          id: users.id,
          tenantId: users.tenantId,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
          tenantName: tenants.name,
          tenantLogoUrl: tenants.logoUrl,
          tenantEmail: tenants.email,
          tenantPhone: tenants.phone,
          tenantAddress: tenants.address,
          tenantOpeningHours: tenants.openingHours,
          tenantWebsite: tenants.website,
          admissionNumber: memberProfiles.admissionNumber,
          memberTypeId: memberProfiles.memberTypeId,
          memberTypeName: memberTypes.name,
          groupId: memberProfiles.groupId,
          groupName: groups.name,
          membershipExpiresAt: memberProfiles.membershipExpiresAt,
        })
        .from(users)
        .innerJoin(tenants, eq(tenants.id, users.tenantId))
        .leftJoin(
          memberProfiles,
          and(
            eq(memberProfiles.userId, users.id),
            eq(memberProfiles.tenantId, users.tenantId),
          ),
        )
        .leftJoin(
          memberTypes,
          and(
            eq(memberTypes.id, memberProfiles.memberTypeId),
            eq(memberTypes.tenantId, memberProfiles.tenantId),
          ),
        )
        .leftJoin(
          groups,
          and(
            eq(groups.id, memberProfiles.groupId),
            eq(groups.tenantId, memberProfiles.tenantId),
          ),
        )
        .where(and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)))
        .limit(1);

      const user = rows[0];

      if (!user) {
        throw new NotFoundException('User not found in this library');
      }

      return {
        id: user.id,
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        tenantLogoUrl: user.tenantLogoUrl ?? undefined,
        tenantEmail: user.tenantEmail ?? undefined,
        tenantPhone: user.tenantPhone ?? undefined,
        tenantAddress: user.tenantAddress ?? undefined,
        tenantOpeningHours: user.tenantOpeningHours ?? undefined,
        tenantWebsite: user.tenantWebsite ?? undefined,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        profile: user.admissionNumber
          ? {
              admissionNumber: user.admissionNumber,
              memberTypeId: user.memberTypeId,
              memberType: user.memberTypeName,
              groupId: user.groupId,
              group: user.groupName,
              membershipExpiresAt: user.membershipExpiresAt,
            }
          : undefined,
      };
    });
  }

  async getOwnProfile(tenantId: string, userId: string) {
    return this.getUserById(tenantId, userId);
  }

  async updateOwnProfile(
    tenantId: string,
    userId: string,
    dto: UpdateProfileDto,
  ) {
    const fullName = dto.fullName?.trim();
    const email = dto.email ? this.identity.normalizeEmail(dto.email) : undefined;
    const phone = dto.phone ? this.identity.normalizePhone(dto.phone) : undefined;

    return this.database.withTenant(tenantId, async (tx) => {
      const userRows = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
        .limit(1)
        .for('update');

      const existingUser = userRows[0];

      if (!existingUser) {
        throw new NotFoundException('User profile not found');
      }

      if (email && email !== existingUser.email) {
        const matches = await this.identityLookup.findIdentity('EMAIL', email);
        if (
          matches.some(
            (m) => m.tenantId === tenantId && m.userId !== userId,
          )
        ) {
          throw new ConflictException(
            'An account with this email already exists in this library',
          );
        }
      }

      if (phone && phone !== existingUser.phone) {
        const matches = await this.identityLookup.findIdentity('PHONE', phone);
        if (
          matches.some(
            (m) => m.tenantId === tenantId && m.userId !== userId,
          )
        ) {
          throw new ConflictException(
            'An account with this phone already exists in this library',
          );
        }
      }

      const updateData: {
        fullName?: string;
        email?: string;
        phone?: string;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };

      if (fullName) updateData.fullName = fullName;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;

      await tx
        .update(users)
        .set(updateData)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

      if (email && email !== existingUser.email) {
        await this.identityLookup.syncIdentityInTransaction(
          tx,
          tenantId,
          userId,
          'EMAIL',
          email,
        );
      }

      if (phone && phone !== existingUser.phone) {
        await this.identityLookup.syncIdentityInTransaction(
          tx,
          tenantId,
          userId,
          'PHONE',
          phone,
        );
      }

      await tx.insert(auditLogs).values({
        tenantId,
        actorId: userId,
        action: 'PROFILE_UPDATED',
        entityType: 'USER',
        entityId: userId,
      });

      return {
        id: userId,
        fullName: updateData.fullName ?? existingUser.fullName,
        email: updateData.email ?? existingUser.email,
        phone: updateData.phone ?? existingUser.phone,
        role: existingUser.role,
        status: existingUser.status,
      };
    });
  }

  async deactivateOwnAccount(tenantId: string, userId: string) {
    return this.database.withTenant(tenantId, async (tx) => {
      const userRows = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
        .limit(1)
        .for('update');

      const user = userRows[0];

      if (!user) {
        throw new NotFoundException('User account not found');
      }

      if (user.status === 'SUSPENDED') {
        throw new BadRequestException('Account is already deactivated');
      }

      // Last active admin protection
      if (user.role === 'ADMIN') {
        const activeAdmins = await tx
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.tenantId, tenantId),
              eq(users.role, 'ADMIN'),
              eq(users.status, 'ACTIVE'),
            ),
          )
          .for('update');

        if (activeAdmins.length <= 1) {
          throw new BadRequestException(
            'Cannot deactivate the last active administrator',
          );
        }
      }

      // Last active librarian protection
      if (user.role === 'LIBRARIAN') {
        const activeLibrarians = await tx
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.tenantId, tenantId),
              eq(users.role, 'LIBRARIAN'),
              eq(users.status, 'ACTIVE'),
            ),
          )
          .for('update');

        if (activeLibrarians.length <= 1) {
          throw new BadRequestException(
            'Cannot deactivate the last active librarian',
          );
        }
      }

      // Soft deactivation: set status to SUSPENDED
      await tx
        .update(users)
        .set({
          status: 'SUSPENDED',
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

      // Revoke all sessions for this user
      await this.sessionService.revokeAllUserSessions(tenantId, userId);

      await tx.insert(auditLogs).values({
        tenantId,
        actorId: userId,
        action: 'ACCOUNT_DEACTIVATED',
        entityType: 'USER',
        entityId: userId,
      });

      return {
        deactivated: true,
        message: 'Account has been deactivated successfully',
      };
    });
  }

  async promoteLibrarian(
    tenantId: string,
    actorId: string,
    targetUserId: string,
  ) {
    if (actorId === targetUserId) {
      throw new BadRequestException('Administrators cannot promote themselves');
    }

    return this.database.withTenant(tenantId, async (tx) => {
      const targetRows = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)))
        .limit(1)
        .for('update');

      const targetUser = targetRows[0];

      if (!targetUser) {
        throw new NotFoundException('User not found in this library');
      }

      if (targetUser.role !== 'LIBRARIAN') {
        throw new BadRequestException(
          'Only librarians can be promoted to administrator',
        );
      }

      if (targetUser.status !== 'ACTIVE') {
        throw new BadRequestException(
          'Cannot promote an inactive or suspended user',
        );
      }

      await tx
        .update(users)
        .set({
          role: 'ADMIN',
          updatedAt: new Date(),
        })
        .where(
          and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)),
        );

      await tx.insert(auditLogs).values({
        tenantId,
        actorId,
        action: 'ROLE_PROMOTED',
        entityType: 'USER',
        entityId: targetUserId,
        metadata: {
          oldRole: 'LIBRARIAN',
          newRole: 'ADMIN',
        },
      });

      return {
        success: true,
        message: 'Librarian successfully promoted to administrator',
        user: {
          id: targetUser.id,
          fullName: targetUser.fullName,
          role: 'ADMIN' as const,
        },
      };
    });
  }
}
