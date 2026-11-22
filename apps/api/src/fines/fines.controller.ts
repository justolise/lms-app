import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface.js';
import { ListLedgerDto } from './dto/list-ledger.dto.js';
import { RecordPaymentDto } from './dto/record-payment.dto.js';
import { WaiveFineDto } from './dto/waive-fine.dto.js';
import { FinesService } from './fines.service.js';

@Controller(['fines', 'api/fines'])
@UseGuards(AccessTokenGuard, RolesGuard)
export class FinesController {
  constructor(private readonly finesService: FinesService) {}

  /**
   * Get member fine balance.
   * ADMIN/LIBRARIAN can check any patron; patrons can only check their own.
   */
  @Get('balance/:userId')
  @Roles('ADMIN', 'LIBRARIAN', 'MEMBER', 'TEACHER', 'PARENT')
  async getBalance(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    const { role, userId: actorId, tenantId } = req.user;
    const isStaff = role === 'ADMIN' || role === 'LIBRARIAN';

    if (!isStaff && actorId !== userId) {
      throw new ForbiddenException(
        'Patrons may only inspect their own fine balance',
      );
    }

    return this.finesService.getMemberBalance(tenantId, userId);
  }

  /**
   * List fine ledger entries.
   * ADMIN/LIBRARIAN can view all entries; patrons can only view their own.
   */
  @Get('ledger')
  @Roles('ADMIN', 'LIBRARIAN', 'MEMBER', 'TEACHER', 'PARENT')
  async listLedger(
    @Req() req: AuthenticatedRequest,
    @Query() dto: ListLedgerDto,
  ) {
    const { role, userId: actorId, tenantId } = req.user;
    const isStaff = role === 'ADMIN' || role === 'LIBRARIAN';

    if (!isStaff) {
      dto.userId = actorId;
    }

    return this.finesService.listLedger(tenantId, dto);
  }

  /**
   * Record a fine payment (Cash, M-Pesa, Card) with receipt generation (FIN-2, FIN-3).
   * Restricted to ADMIN and LIBRARIAN.
   */
  @Post('payments')
  @Roles('ADMIN', 'LIBRARIAN')
  async recordPayment(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.finesService.recordPayment(
      req.user.tenantId,
      req.user.userId,
      dto,
    );
  }

  /**
   * Waive a fine with required audit reason (FIN-2).
   * Restricted to ADMIN and LIBRARIAN.
   */
  @Post('waivers')
  @Roles('ADMIN', 'LIBRARIAN')
  async waiveFine(
    @Req() req: AuthenticatedRequest,
    @Body() dto: WaiveFineDto,
  ) {
    return this.finesService.waiveFine(
      req.user.tenantId,
      req.user.userId,
      dto,
    );
  }
}
