import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CreateMemberDto } from './dto/create-member.dto.js';
import { MembersService } from './members.service.js';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface.js';

@Controller(['members', 'api/members'])
@UseGuards(AccessTokenGuard, RolesGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('types')
  @Roles('ADMIN', 'LIBRARIAN')
  async listMemberTypes(@Req() request: AuthenticatedRequest) {
    const { tenantId } = request.user;
    return this.membersService.listMemberTypes(tenantId);
  }

  @Post()
  @Roles('ADMIN', 'LIBRARIAN')
  async create(
    @Body() dto: CreateMemberDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { tenantId, userId } = request.user;
    return this.membersService.create(tenantId, userId, dto);
  }

  // ─── Staff Enquiry Review Desk Endpoints ─────────────────────────────────

  @Get('enquiries')
  @Roles('ADMIN', 'LIBRARIAN')
  async listEnquiries(
    @Req() request: AuthenticatedRequest,
    @Query('status') status?: string,
  ) {
    const { tenantId } = request.user;
    return this.membersService.listEnquiries(tenantId, status);
  }

  @Get('enquiries/:id')
  @Roles('ADMIN', 'LIBRARIAN')
  async getEnquiry(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const { tenantId } = request.user;
    return this.membersService.getEnquiryById(tenantId, id);
  }

  @Patch('enquiries/:id/review')
  @Roles('ADMIN', 'LIBRARIAN')
  async reviewEnquiry(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('status') status?: 'REVIEWED' | 'APPROVED' | 'REJECTED',
  ) {
    const { tenantId, userId } = request.user;
    return this.membersService.reviewEnquiry(tenantId, userId, id, status);
  }
}
