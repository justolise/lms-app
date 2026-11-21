import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CreateLibrarianDto } from './dto/create-librarian.dto.js';
import { UserDirectoryQueryDto } from './dto/user-directory-query.dto.js';
import { UserIdParamDto } from './dto/user-id-param.dto.js';
import { UsersService } from './users.service.js';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface.js';

@Controller(['users', 'api/users'])
@UseGuards(AccessTokenGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('librarians')
  @Roles('ADMIN')
  async createLibrarian(
    @Body() dto: CreateLibrarianDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { tenantId, userId } = request.user;
    return this.usersService.createLibrarian(tenantId, userId, dto);
  }

  @Get()
  @Roles('ADMIN', 'LIBRARIAN')
  async getDirectory(
    @Query() query: UserDirectoryQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { tenantId } = request.user;
    return this.usersService.getDirectory(tenantId, query);
  }

  @Get(':userId')
  @Roles('ADMIN', 'LIBRARIAN')
  async getUser(
    @Param() params: UserIdParamDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { tenantId } = request.user;
    return this.usersService.getUserById(tenantId, params.userId);
  }

  @Post(':userId/promote')
  @Roles('ADMIN')
  async promoteLibrarian(
    @Param() params: UserIdParamDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { tenantId, userId } = request.user;
    return this.usersService.promoteLibrarian(tenantId, userId, params.userId);
  }
}
