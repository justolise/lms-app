import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PlatformAuthGuard } from '../guards/platform-auth.guard.js';
import {
  ListAuditLogsQuery,
  PlatformAuditLogsService,
} from './platform-audit-logs.service.js';

@Controller('api/platform/audit-logs')
@UseGuards(PlatformAuthGuard)
export class PlatformAuditLogsController {
  constructor(private readonly auditLogsService: PlatformAuditLogsService) {}

  @Get()
  async listLogs(
    @Query('scope') scope?: 'ALL' | 'PLATFORM' | 'TENANT',
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('actorId') actorId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const query: ListAuditLogsQuery = {
      scope,
      action,
      entityType,
      actorId,
      tenantId,
      limit: limitStr ? parseInt(limitStr, 10) : undefined,
      offset: offsetStr ? parseInt(offsetStr, 10) : undefined,
    };

    return this.auditLogsService.listAuditLogs(query);
  }
}
