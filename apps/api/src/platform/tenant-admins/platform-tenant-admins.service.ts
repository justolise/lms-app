import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { HashOptions } from 'argon2';
import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  auditLogs,
  platformAuditLogs,
  sessions,
  tenants,
  users,
} from '../../database/schema.js';
import { IdentityService } from '../../auth/identity/identity.service.js';
import { IdentityLookupService } from '../../auth/identity/identity-lookup.service.js';
import type { ProvisionTenantAdminDto } from './dto/platform-tenant-admins.dto.js';

export interface ProvisionedAdminResult {
  userId: string;
  tenantId: string;
  email: string;
  fullName: string;
  temporaryPassword: string;
  mustChangePassword: true;
}

@Injectable()
export class PlatformTenantAdminsService {
  private readonly logger = new Logger(PlatformTenantAdminsService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly identityService: IdentityService,
    private readonly identityLookupService: IdentityLookupService,
  ) {}

  /**
   * Provisions the initial (or an additional) tenant ADMIN within the tenant boundary.
   * Creates an active user with mustChangePassword=true and synchronizes identity lookup.
   */
  async provisionTenantAdmin(
    tenantId: string,
    dto: ProvisionTenantAdminDto,
    actorId?: string,
  ): Promise<ProvisionedAdminResult> {
    // 1. Verify tenant exists and is not suspended
    const [tenant] = await this.database.db
      .select({ id: tenants.id, name: tenants.name, status: tenants.status })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException(`Tenant with id "${tenantId}" not found`);
    }

    if (tenant.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Cannot provision an administrator for a suspended tenant',
      );
    }

    // 2. Normalize credentials
    const normalizedEmail = this.identityService.normalizeEmail(dto.email);
    const normalizedPhone = dto.phone
      ? this.identityService.normalizePhone(dto.phone)
      : null;

    const temporaryPassword =
      dto.temporaryPassword ||
      dto.password ||
      randomBytes(16).toString('base64url');

    const argonOptions: HashOptions =
      process.env.NODE_ENV === 'test'
        ? { type: argon2.argon2id, memoryCost: 1024, timeCost: 1 }
        : { type: argon2.argon2id };

    const passwordHash = await argon2.hash(temporaryPassword, argonOptions);

    // 3. Execute inside tenant boundary under PostgreSQL RLS
    const createdUser = await this.database.withTenant(tenantId, async (tx) => {
      // Check for conflict on email lookup
      const existingEmail = await this.identityLookupService.findIdentity(
        'EMAIL',
        normalizedEmail,
      );

      const conflictInTenant = existingEmail.some(
        (cand) => cand.tenantId === tenantId,
      );

      if (conflictInTenant) {
        throw new ConflictException(
          `A user with email "${dto.email}" already exists in this library.`,
        );
      }

      // Insert tenant user
      const [user] = await tx
        .insert(users)
        .values({
          tenantId,
          role: 'ADMIN',
          fullName: dto.fullName.trim(),
          email: normalizedEmail,
          phone: normalizedPhone,
          status: 'ACTIVE',
          passwordHash,
          mustChangePassword: true,
        })
        .returning();

      // Sync identity lookup for email
      await this.identityLookupService.syncIdentityInTransaction(
        tx,
        tenantId,
        user.id,
        'EMAIL',
        normalizedEmail,
      );

      // Sync identity lookup for phone if provided
      if (normalizedPhone) {
        await this.identityLookupService.syncIdentityInTransaction(
          tx,
          tenantId,
          user.id,
          'PHONE',
          normalizedPhone,
        );
      }

      // Tenant audit log
      await tx.insert(auditLogs).values({
        tenantId,
        actorId: user.id,
        action: 'TENANT_ADMIN_PROVISIONED',
        entityType: 'USER',
        entityId: user.id,
        metadata: {
          provisionedBy: actorId || 'PLATFORM_SUPER_ADMIN',
          email: normalizedEmail,
        },
      });

      return user;
    });

    // 4. Platform audit log outside tenant boundary
    await this.database.db.insert(platformAuditLogs).values({
      actorId: actorId || null,
      action: 'TENANT_ADMIN_PROVISIONED',
      entityType: 'TENANT',
      entityId: tenantId,
      metadata: {
        userId: createdUser.id,
        email: normalizedEmail,
        fullName: createdUser.fullName,
      },
    });

    this.logger.log(
      `Tenant admin provisioned: tenantId=${tenantId} userId=${createdUser.id} email=${normalizedEmail}`,
    );

    return {
      userId: createdUser.id,
      tenantId,
      email: normalizedEmail,
      fullName: createdUser.fullName,
      temporaryPassword,
      mustChangePassword: true,
    };
  }

  /**
   * Lists all administrators for a specific tenant.
   */
  async listTenantAdmins(tenantId: string) {
    return this.database.withTenant(tenantId, (tx) =>
      tx
        .select({
          id: users.id,
          fullName: users.fullName,
          role: users.role,
          status: users.status,
          mustChangePassword: users.mustChangePassword,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.role, 'ADMIN'))),
    );
  }

  /**
   * Resets credentials for a tenant administrator, forcing a password change on next login.
   */
  async resetAdminPassword(
    tenantId: string,
    adminId: string,
    actorId?: string,
  ): Promise<{ temporaryPassword: string }> {
    const temporaryPassword = randomBytes(16).toString('base64url');
    const argonOptions: HashOptions =
      process.env.NODE_ENV === 'test'
        ? { type: argon2.argon2id, memoryCost: 1024, timeCost: 1 }
        : { type: argon2.argon2id };

    const passwordHash = await argon2.hash(temporaryPassword, argonOptions);

    await this.database.withTenant(tenantId, async (tx) => {
      const [admin] = await tx
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.id, adminId)))
        .limit(1);

      if (!admin || admin.role !== 'ADMIN') {
        throw new NotFoundException('Administrator account not found in this tenant');
      }

      await tx
        .update(users)
        .set({
          passwordHash,
          mustChangePassword: true,
          updatedAt: new Date(),
        })
        .where(and(eq(users.tenantId, tenantId), eq(users.id, adminId)));

      // Invalidate active sessions
      await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.tenantId, tenantId), eq(sessions.userId, adminId)));

      await tx.insert(auditLogs).values({
        tenantId,
        actorId: adminId,
        action: 'TENANT_ADMIN_PASSWORD_RESET_BY_PLATFORM',
        entityType: 'USER',
        entityId: adminId,
      });
    });

    await this.database.db.insert(platformAuditLogs).values({
      actorId: actorId || null,
      action: 'TENANT_ADMIN_PASSWORD_RESET',
      entityType: 'TENANT_ADMIN',
      entityId: adminId,
      metadata: { tenantId },
    });

    return { temporaryPassword };
  }
}
