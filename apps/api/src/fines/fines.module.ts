import { Module } from '@nestjs/common';
import { SessionModule } from '../auth/session/session.module.js';
import { TokenModule } from '../auth/token/token.module.js';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { FinesController } from './fines.controller.js';
import { FinesService } from './fines.service.js';

@Module({
  imports: [DatabaseModule, TokenModule, SessionModule],
  controllers: [FinesController],
  providers: [FinesService, AccessTokenGuard, RolesGuard],
  exports: [FinesService],
})
export class FinesModule {}
