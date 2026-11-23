import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlatformTenantsService } from './platform-tenants.service.js';
import {
  CreateTenantDto,
  ListTenantsQueryDto,
  UpdateTenantStatusDto,
} from './dto/platform-tenants.dto.js';
import { PlatformAuthGuard } from '../guards/platform-auth.guard.js';
import { CurrentPlatformUser } from '../decorators/current-platform-user.decorator.js';
import type { PlatformAccessTokenPayload } from '../auth/dto/platform-auth.dto.js';

@Controller(['platform/tenants', 'api/platform/tenants'])
@UseGuards(PlatformAuthGuard)
export class PlatformTenantsController {
  constructor(private readonly tenantsService: PlatformTenantsService) {}

  @Get()
  async listTenants(@Query() query: ListTenantsQueryDto) {
    return this.tenantsService.listTenants(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTenant(
    @Body() dto: CreateTenantDto,
    @CurrentPlatformUser() user: PlatformAccessTokenPayload,
  ) {
    return this.tenantsService.createTenant(dto, user.platformUserId);
  }

  @Get(':id')
  async getTenant(@Param('id') id: string) {
    return this.tenantsService.getTenant(id);
  }

  @Patch(':id/status')
  async updateTenantStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
    @CurrentPlatformUser() user: PlatformAccessTokenPayload,
  ) {
    return this.tenantsService.updateTenantStatus(
      id,
      dto.status,
      user.platformUserId,
      dto.reason,
    );
  }
}
