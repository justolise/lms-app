import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface.js';
import type { CancelHoldDto } from './dto/cancel-hold.dto.js';
import type { CreateHoldDto } from './dto/create-hold.dto.js';
import type { HoldIdParamDto } from './dto/hold-params.dto.js';
import type { HoldsService } from './holds.service.js';

@Controller(['holds', 'api/holds'])
@UseGuards(AccessTokenGuard, RolesGuard)
export class HoldsController {
  constructor(private readonly holdsService: HoldsService) {}

  /**
   * HLD-1: Place a hold on a title with 0 available copies.
   */
  @Post()
  @Roles('ADMIN', 'LIBRARIAN', 'TEACHER', 'MEMBER', 'PARENT')
  async placeHold(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateHoldDto,
  ) {
    return this.holdsService.placeHold(
      req.user.tenantId,
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  /**
   * HLD-3: Cancel a hold.
   */
  @Delete(':holdId')
  @Roles('ADMIN', 'LIBRARIAN', 'TEACHER', 'MEMBER', 'PARENT')
  async cancelHold(
    @Req() req: AuthenticatedRequest,
    @Param() params: HoldIdParamDto,
    @Body() dto: CancelHoldDto,
  ) {
    return this.holdsService.cancelHold(
      req.user.tenantId,
      req.user.userId,
      req.user.role,
      params.holdId,
      dto.reason,
    );
  }

  /**
   * List holds.
   * Staff (ADMIN/LIBRARIAN) can filter by title or user.
   * Patrons see their own holds only.
   */
  @Get()
  @Roles('ADMIN', 'LIBRARIAN', 'TEACHER', 'MEMBER', 'PARENT')
  async listHolds(
    @Req() req: AuthenticatedRequest,
    @Query('catalogueItemId') catalogueItemId?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.holdsService.listHolds(
      req.user.tenantId,
      req.user.userId,
      req.user.role,
      catalogueItemId,
      userId,
      status,
    );
  }
}
