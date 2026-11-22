import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { PublicService } from './public.service.js';
import {
  MembershipEnquiryDto,
  PublicSearchDto,
} from './dto/public.dto.js';

/**
 * Public endpoints — no authentication required.
 *
 * Per DECISIONS.md:
 *   "GUEST is anonymous — public catalogue search and availability do not require authentication."
 *   "No public self-registration; accounts are provisioned by authorised staff."
 *
 * The membership enquiry form collects patron contact info for staff review.
 */
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // ─── Libraries list ───────────────────────────────────────────────────────

  /**
   * GET /public/libraries
   * List active library branches/tenants for public selection.
   */
  @Get('libraries')
  async listLibraries() {
    return this.publicService.listLibraries();
  }

  // ─── Catalogue ────────────────────────────────────────────────────────────

  /**
   * GET /public/catalogue?libraryCode=SCHOOL-01&q=...
   * Public catalogue browse — no auth guard.
   */
  @Get('catalogue')
  async search(@Query() query: PublicSearchDto) {
    return this.publicService.search(query);
  }

  /**
   * GET /public/catalogue/list?libraryCode=SCHOOL-01
   * Full catalogue list for a library — no auth guard.
   */
  @Get('catalogue/list')
  async list(@Query('libraryCode') libraryCode: string) {
    return this.publicService.list(libraryCode);
  }

  // ─── Membership enquiry ───────────────────────────────────────────────────

  /**
   * POST /public/membership-enquiry
   * Accepts patron contact details for staff review.
   * Rate-limited: 3 submissions per minute per IP.
   */
  @Post('membership-enquiry')
  async submitEnquiry(@Body() dto: MembershipEnquiryDto) {
    return this.publicService.submitEnquiry(dto);
  }
}
