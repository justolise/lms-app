import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PlatformTenantAdminsService } from './platform-tenant-admins.service.js';
import { ProvisionTenantAdminDto } from './dto/platform-tenant-admins.dto.js';
import { PlatformAuthGuard } from '../guards/platform-auth.guard.js';
import { CurrentPlatformUser } from '../decorators/current-platform-user.decorator.js';
import type { PlatformAccessTokenPayload } from '../auth/dto/platform-auth.dto.js';

@Controller(['platform/tenants/:tenantId/admins', 'api/platform/tenants/:tenantId/admins'])
@UseGuards(PlatformAuthGuard)
export class PlatformTenantAdminsController {
  constructor(private readonly adminsService: PlatformTenantAdminsService) {}

  @Get()
  async listTenantAdmins(@Param('tenantId') tenantId: string) {
    return this.adminsService.listTenantAdmins(tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async provisionTenantAdmin(
    @Param('tenantId') tenantId: string,
    @Body() dto: ProvisionTenantAdminDto,
    @CurrentPlatformUser() user: PlatformAccessTokenPayload,
  ) {
    return this.adminsService.provisionTenantAdmin(
      tenantId,
      dto,
      user.platformUserId,
    );
  }

  @Post(':adminId/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetAdminPassword(
    @Param('tenantId') tenantId: string,
    @Param('adminId') adminId: string,
    @CurrentPlatformUser() user: PlatformAccessTokenPayload,
  ) {
    return this.adminsService.resetAdminPassword(
      tenantId,
      adminId,
      user.platformUserId,
    );
  }
}
