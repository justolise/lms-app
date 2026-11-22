import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RateLimit } from '../common/decorators/rate-limit.decorator.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { PublicService } from './public.service.js';
import {
  MembershipEnquiryDto,
  PublicCatalogueQueryDto,
  PublicSearchDto,
  SubmitMembershipEnquiryDto,
} from './dto/public.dto.js';

/**
 * Public tenant-specific endpoints — no authentication required.
 *
 * Per DECISIONS.md & Master Requirements:
 * - Public catalogue browsing is isolated per tenant by library slug.
 * - Visitors can search by title, author, ISBN, and paginate through results.
 * - Approved availability labels: 'Available', 'On loan', or hidden.
 * - Confidential copy identifiers (barcodes, copy IDs, notes, loan histories) are never exposed.
 * - Membership enquiry submissions are tenant-scoped, assigned 'PENDING' status, and rate-limited.
 */
@Controller(['public', 'api/public'])
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // ─── Public Libraries Directory ───────────────────────────────────────────

  @Get('libraries')
  async listLibraries() {
    return this.publicService.listLibraries();
  }

  @Get('libraries/:slug')
  async getLibraryInfo(@Param('slug') slug: string) {
    return this.publicService.getLibraryInfo(slug);
  }

  // ─── Tenant-Specific Public Catalogue ─────────────────────────────────────

  @Get('libraries/:slug/catalogue')
  async getTenantCatalogue(
    @Param('slug') slug: string,
    @Query() query: PublicCatalogueQueryDto,
  ) {
    return this.publicService.getPublicCatalogue(slug, query);
  }

  @Get('libraries/:slug/catalogue/:bookId')
  async getTenantBookDetail(
    @Param('slug') slug: string,
    @Param('bookId') bookId: string,
  ) {
    return this.publicService.getPublicBookDetail(slug, bookId);
  }

  // ─── Tenant-Specific Public Membership Enquiry ────────────────────────────

  @Post('libraries/:slug/membership-requests')
  @UseGuards(RateLimitGuard)
  @RateLimit({ keyPrefix: 'public-enquiry', limit: 5, windowMs: 60_000 })
  async submitTenantEnquiry(
    @Param('slug') slug: string,
    @Body() dto: SubmitMembershipEnquiryDto,
  ) {
    return this.publicService.submitMembershipEnquiry(slug, dto);
  }

  // ─── Compatibility Endpoints ──────────────────────────────────────────────

  @Get('catalogue')
  async search(@Query() query: PublicSearchDto) {
    return this.publicService.search(query);
  }

  @Get('catalogue/list')
  async list(@Query('libraryCode') libraryCode?: string) {
    return this.publicService.list(libraryCode);
  }

  @Post('membership-enquiry')
  @UseGuards(RateLimitGuard)
  @RateLimit({ keyPrefix: 'public-enquiry-compat', limit: 5, windowMs: 60_000 })
  async submitEnquiry(@Body() dto: MembershipEnquiryDto) {
    return this.publicService.submitEnquiry(dto);
  }
}
