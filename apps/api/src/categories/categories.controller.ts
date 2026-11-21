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
import { CategoriesService } from './categories.service.js';
import {
  CategoryIdParamDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto.js';

@Controller(['categories', 'api/categories'])
@UseGuards(AccessTokenGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Roles('ADMIN', 'LIBRARIAN', 'TEACHER', 'MEMBER', 'PARENT')
  async list(@Req() req: AuthenticatedRequest) {
    return this.categoriesService.list(req.user.tenantId);
  }

  @Get(':categoryId')
  @Roles('ADMIN', 'LIBRARIAN', 'TEACHER', 'MEMBER', 'PARENT')
  async getById(
    @Param() params: CategoryIdParamDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.categoriesService.getById(
      req.user.tenantId,
      params.categoryId,
    );
  }

  @Post()
  @Roles('ADMIN', 'LIBRARIAN')
  async create(
    @Body() dto: CreateCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.categoriesService.create(
      req.user.tenantId,
      req.user.userId,
      dto,
    );
  }

  @Patch(':categoryId')
  @Roles('ADMIN', 'LIBRARIAN')
  async update(
    @Param() params: CategoryIdParamDto,
    @Body() dto: UpdateCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.categoriesService.update(
      req.user.tenantId,
      req.user.userId,
      params.categoryId,
      dto,
    );
  }

  @Delete(':categoryId')
  @Roles('ADMIN')
  async delete(
    @Param() params: CategoryIdParamDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.categoriesService.delete(
      req.user.tenantId,
      req.user.userId,
      params.categoryId,
    );
  }
}
