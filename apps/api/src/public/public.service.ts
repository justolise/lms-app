import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { CatalogueService } from '../catalogue/catalogue.service.js';
import {
  tenants,
  membershipEnquiries,
} from '../database/schema.js';
import type { MembershipEnquiryDto, PublicSearchDto } from './dto/public.dto.js';

@Injectable()
export class PublicService {
  constructor(
    private readonly database: DatabaseService,
    private readonly catalogueService: CatalogueService,
  ) {}

  // ─── Resolve tenantId from libraryCode ────────────────────────────────────

  async resolveTenantId(libraryCode?: string): Promise<string> {
    if (libraryCode) {
      const rows = await this.database.db
        .select({ id: tenants.id, status: tenants.status })
        .from(tenants)
        .where(eq(tenants.libraryCode, libraryCode))
        .limit(1);

      if (rows.length > 0) {
        const tenant = rows[0];
        if (tenant.status !== 'ACTIVE') {
          throw new BadRequestException(
            `The library "${libraryCode}" is not currently accepting enquiries.`,
          );
        }
        return tenant.id;
      }
    }

    // Fall back to first active tenant if code is not provided or not found
    const active = await this.database.db
      .select({ id: tenants.id, libraryCode: tenants.libraryCode, status: tenants.status })
      .from(tenants)
      .where(eq(tenants.status, 'ACTIVE'))
      .limit(1);

    if (active.length > 0) {
      return active[0].id;
    }

    throw new NotFoundException(
      libraryCode
        ? `No library found with code "${libraryCode}". Please check the code and try again.`
        : 'No active library found in the system.',
    );
  }

  async listLibraries() {
    return this.database.db
      .select({
        id: tenants.id,
        name: tenants.name,
        libraryCode: tenants.libraryCode,
        status: tenants.status,
      })
      .from(tenants)
      .where(eq(tenants.status, 'ACTIVE'));
  }

  // ─── Public catalogue search ──────────────────────────────────────────────

  async search(query: PublicSearchDto) {
    const { libraryCode, ...searchParams } = query;
    const tenantId = await this.resolveTenantId(libraryCode);
    return this.catalogueService.search(tenantId, searchParams);
  }

  async list(libraryCode?: string) {
    const tenantId = await this.resolveTenantId(libraryCode);
    return this.catalogueService.list(tenantId);
  }

  // ─── Membership enquiry ───────────────────────────────────────────────────

  async submitEnquiry(dto: MembershipEnquiryDto) {
    const tenantId = await this.resolveTenantId(dto.libraryCode);

    // Insert without RLS tenant context — we set tenant_id explicitly.
    // The database role must have INSERT permission on membership_enquiries.
    const rows = await this.database.db
      .insert(membershipEnquiries)
      .values({
        tenantId,
        fullName: dto.fullName,
        email: dto.email ?? null,
        phone: dto.phone,
        idNumber: dto.idNumber,
        memberType: dto.memberType ?? null,
        organization: dto.organization ?? null,
        notes: dto.notes ?? null,
        status: 'PENDING',
      })
      .returning({ id: membershipEnquiries.id });

    return { enquiryId: rows[0].id, status: 'PENDING' };
  }
}
