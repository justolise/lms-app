import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UsersService } from './users.service.js';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface.js';

@Controller(['profile', 'api/profile'])
@UseGuards(AccessTokenGuard, RolesGuard)
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN', 'LIBRARIAN', 'TEACHER', 'MEMBER', 'PARENT')
  async getProfile(@Req() request: AuthenticatedRequest) {
    const { tenantId, userId } = request.user;
    return this.usersService.getOwnProfile(tenantId, userId);
  }

  @Patch()
  @Roles('ADMIN', 'LIBRARIAN', 'TEACHER', 'MEMBER', 'PARENT')
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { tenantId, userId } = request.user;
    return this.usersService.updateOwnProfile(tenantId, userId, dto);
  }

  @Delete()
  @Roles('ADMIN', 'LIBRARIAN', 'TEACHER', 'MEMBER', 'PARENT')
  async deactivateAccount(@Req() request: AuthenticatedRequest) {
    const { tenantId, userId } = request.user;
    return this.usersService.deactivateOwnAccount(tenantId, userId);
  }
}
