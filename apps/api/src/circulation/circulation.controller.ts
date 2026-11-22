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
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface.js';
import { CirculationService } from './circulation.service.js';
import { CheckoutDto } from './dto/checkout.dto.js';
import { ReturnLoanDto } from './dto/return-loan.dto.js';

@Controller(['circulation', 'api/circulation'])
@UseGuards(AccessTokenGuard, RolesGuard)
export class CirculationController {
  constructor(private readonly circulationService: CirculationService) {}

  /**
   * CIR-1: Check out a copy to a member.
   * Only ADMIN and LIBRARIAN can operate the checkout desk.
   */
  @Post('checkout')
  @Roles('ADMIN', 'LIBRARIAN')
  async checkout(@Req() req: AuthenticatedRequest, @Body() dto: CheckoutDto) {
    return this.circulationService.checkout(
      req.user.tenantId,
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  /**
   * CIR-2: Return a copy.
   * Only ADMIN and LIBRARIAN can operate the return desk.
   */
  @Post('return')
  @Roles('ADMIN', 'LIBRARIAN')
  async returnLoan(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ReturnLoanDto,
  ) {
    return this.circulationService.returnLoan(
      req.user.tenantId,
      req.user.userId,
      dto,
    );
  }

  /**
   * CIR-3: Renew an active loan.
   * Only ADMIN and LIBRARIAN can renew (per DECISIONS.md).
   */
  @Post('renew/:loanId')
  @Roles('ADMIN', 'LIBRARIAN')
  async renew(
    @Req() req: AuthenticatedRequest,
    @Param('loanId') loanId: string,
  ) {
    return this.circulationService.renew(
      req.user.tenantId,
      req.user.userId,
      loanId,
    );
  }

  /**
   * List loans. ADMIN/LIBRARIAN see all; MEMBER/TEACHER/PARENT see own loans only.
   */
  @Get('loans')
  @Roles('ADMIN', 'LIBRARIAN', 'TEACHER', 'MEMBER', 'PARENT')
  async listLoans(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    const { role, userId: actorId, tenantId } = req.user;
    const isSelfOnly =
      role !== 'ADMIN' && role !== 'LIBRARIAN';

    if (isSelfOnly) {
      return this.circulationService.getLoansByUser(tenantId, actorId, status);
    }

    if (userId) {
      return this.circulationService.getLoansByUser(tenantId, userId, status);
    }

    return this.circulationService.getAllLoans(tenantId, status);
  }
}
