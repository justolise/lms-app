import { Module } from '@nestjs/common';
import { SessionModule } from '../auth/session/session.module.js';
import { TokenModule } from '../auth/token/token.module.js';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [DatabaseModule, TokenModule, SessionModule],
  controllers: [AdminController],
  providers: [AdminService, AccessTokenGuard, RolesGuard],
  exports: [AdminService],
})
export class AdminModule {}
