import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface.js';
import { AdminService } from './admin.service.js';
import { UpdateLibraryProfileDto } from './dto/library-profile.dto.js';

@Controller(['admin', 'api/admin'])
@UseGuards(AccessTokenGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('profile')
  @Roles('ADMIN', 'LIBRARIAN')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.adminService.getProfile(req.user.tenantId);
  }

  @Patch('profile')
  @Roles('ADMIN')
  async updateProfile(
    @Body() dto: UpdateLibraryProfileDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.updateProfile(
      req.user.tenantId,
      req.user.userId,
      dto,
    );
  }
}
