import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface.js';
import { MemberTypesService } from './member-types.service.js';
import {
  CreateLoanPolicyDto,
  CreateMemberTypeDto,
  UpdateLoanPolicyDto,
  UpdateMemberTypeDto,
} from './dto/member-type.dto.js';
import { MemberTypeIdParamDto, PolicyIdParamDto } from './dto/member-type-params.dto.js';

@Controller(['member-types', 'api/member-types'])
@UseGuards(AccessTokenGuard, RolesGuard)
export class MemberTypesController {
  constructor(private readonly memberTypesService: MemberTypesService) {}

  // ─── Member Type endpoints ──────────────────────────────────

  @Post()
  @Roles('ADMIN')
  async create(
    @Body() dto: CreateMemberTypeDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { tenantId, userId } = request.user;
    return this.memberTypesService.create(tenantId, userId, dto);
  }

  @Get()
  @Roles('ADMIN', 'LIBRARIAN')
  async list(@Req() request: AuthenticatedRequest) {
    const { tenantId } = request.user;
    return this.memberTypesService.list(tenantId);
  }

  @Get(':memberTypeId')
  @Roles('ADMIN')
  async getById(
    @Param() params: MemberTypeIdParamDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { tenantId } = request.user;
    return this.memberTypesService.getById(tenantId, params.memberTypeId);
  }

  @Patch(':memberTypeId')
  @Roles('ADMIN')
  async update(
    @Param() params: MemberTypeIdParamDto,
    @Body() dto: UpdateMemberTypeDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { tenantId, userId } = request.user;
    return this.memberTypesService.update(
      tenantId,
      userId,
      params.memberTypeId,
      dto,
    );
  }

  // ─── Loan Policy endpoints ─────────────────────────────────

  @Post(':memberTypeId/policies')
  @Roles('ADMIN')
  async createPolicy(
    @Param() params: MemberTypeIdParamDto,
    @Body() dto: CreateLoanPolicyDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { tenantId, userId } = request.user;
    return this.memberTypesService.createPolicy(
      tenantId,
      userId,
      params.memberTypeId,
      dto,
    );
  }

  @Patch(':memberTypeId/policies/:policyId')
  @Roles('ADMIN')
  async updatePolicy(
    @Param() params: PolicyIdParamDto,
    @Body() dto: UpdateLoanPolicyDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { tenantId, userId } = request.user;
    return this.memberTypesService.updatePolicy(
      tenantId,
      userId,
      params.memberTypeId,
      params.policyId,
      dto,
    );
  }

  @Delete(':memberTypeId/policies/:policyId')
  @Roles('ADMIN')
  async deletePolicy(
    @Param() params: PolicyIdParamDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { tenantId, userId } = request.user;
    return this.memberTypesService.deletePolicy(
      tenantId,
      userId,
      params.memberTypeId,
      params.policyId,
    );
  }
}
