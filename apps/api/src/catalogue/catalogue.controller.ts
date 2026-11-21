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
import { CatalogueService } from './catalogue.service.js';
import { CopiesService } from './copies.service.js';
import { IsbnLookupService } from './isbn-lookup.service.js';
import {
  CatalogueItemIdParamDto,
  CreateCatalogueItemDto,
  IsbnLookupDto,
  UpdateCatalogueItemDto,
} from './dto/catalogue-item.dto.js';
import { CopyIdParamDto, CreateCopyDto, UpdateCopyDto } from './dto/copy.dto.js';

@Controller(['catalogue', 'api/catalogue'])
@UseGuards(AccessTokenGuard, RolesGuard)
export class CatalogueController {
  constructor(
    private readonly catalogueService: CatalogueService,
    private readonly copiesService: CopiesService,
    private readonly isbnLookupService: IsbnLookupService,
  ) {}

  // ─── Catalogue item endpoints ────────────────────────────────

  @Get()
  @Roles('ADMIN', 'LIBRARIAN', 'TEACHER', 'MEMBER', 'PARENT')
  async list(@Req() req: AuthenticatedRequest) {
    return this.catalogueService.list(req.user.tenantId);
  }

  @Get(':itemId')
  @Roles('ADMIN', 'LIBRARIAN', 'TEACHER', 'MEMBER', 'PARENT')
  async getById(
    @Param() params: CatalogueItemIdParamDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.catalogueService.getById(req.user.tenantId, params.itemId);
  }

  @Post()
  @Roles('ADMIN', 'LIBRARIAN')
  async create(
    @Body() dto: CreateCatalogueItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.catalogueService.create(
      req.user.tenantId,
      req.user.userId,
      dto,
    );
  }

  @Post('isbn-lookup')
  @Roles('ADMIN', 'LIBRARIAN')
  async isbnLookup(
    @Body() dto: IsbnLookupDto,
    // req only needed for auth guard context; response is metadata, not tenant data
    @Req() _req: AuthenticatedRequest,
  ) {
    return this.isbnLookupService.lookup(dto.isbn);
  }

  @Patch(':itemId')
  @Roles('ADMIN', 'LIBRARIAN')
  async update(
    @Param() params: CatalogueItemIdParamDto,
    @Body() dto: UpdateCatalogueItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.catalogueService.update(
      req.user.tenantId,
      req.user.userId,
      params.itemId,
      dto,
    );
  }

  @Delete(':itemId')
  @Roles('ADMIN')
  async archive(
    @Param() params: CatalogueItemIdParamDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.catalogueService.archive(
      req.user.tenantId,
      req.user.userId,
      params.itemId,
    );
  }

  // ─── Copy endpoints (/catalogue/:itemId/copies) ──────────────

  @Get(':itemId/copies')
  @Roles('ADMIN', 'LIBRARIAN')
  async listCopies(
    @Param() params: CatalogueItemIdParamDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.copiesService.listForItem(req.user.tenantId, params.itemId);
  }

  @Post(':itemId/copies')
  @Roles('ADMIN', 'LIBRARIAN')
  async addCopy(
    @Param() params: CatalogueItemIdParamDto,
    @Body() dto: CreateCopyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.copiesService.addCopy(
      req.user.tenantId,
      req.user.userId,
      params.itemId,
      dto,
    );
  }

  @Patch(':itemId/copies/:copyId')
  @Roles('ADMIN', 'LIBRARIAN')
  async updateCopy(
    @Param() params: CopyIdParamDto,
    @Body() dto: UpdateCopyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.copiesService.updateCopy(
      req.user.tenantId,
      req.user.userId,
      params.itemId,
      params.copyId,
      dto,
    );
  }

  @Delete(':itemId/copies/:copyId')
  @Roles('ADMIN')
  async withdrawCopy(
    @Param() params: CopyIdParamDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.copiesService.withdraw(
      req.user.tenantId,
      req.user.userId,
      params.itemId,
      params.copyId,
    );
  }
}
