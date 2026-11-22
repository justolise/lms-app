import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface.js';
import { ReportsService } from './reports.service.js';

@Controller(['reports', 'api/reports'])
@UseGuards(AccessTokenGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'LIBRARIAN')
  async getDashboard(@Req() request: AuthenticatedRequest) {
    const { tenantId } = request.user;
    return this.reportsService.getDashboard(tenantId);
  }
}
