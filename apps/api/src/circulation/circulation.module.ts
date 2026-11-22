import { Module } from '@nestjs/common';
import { CirculationController } from './circulation.controller.js';
import { CirculationService } from './circulation.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { TokenModule } from '../auth/token/token.module.js';
import { SessionModule } from '../auth/session/session.module.js';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [DatabaseModule, TokenModule, SessionModule],
  controllers: [CirculationController],
  providers: [CirculationService, AccessTokenGuard, RolesGuard],
  exports: [CirculationService],
})
export class CirculationModule {}
