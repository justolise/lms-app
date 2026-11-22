import { Module } from '@nestjs/common';
import { SessionModule } from '../auth/session/session.module.js';
import { TokenModule } from '../auth/token/token.module.js';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [DatabaseModule, TokenModule, SessionModule],
  controllers: [ReportsController],
  providers: [ReportsService, AccessTokenGuard, RolesGuard],
  exports: [ReportsService],
})
export class ReportsModule {}
