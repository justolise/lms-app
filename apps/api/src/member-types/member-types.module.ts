import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { TokenModule } from '../auth/token/token.module.js';
import { SessionModule } from '../auth/session/session.module.js';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

import { MemberTypesController } from './member-types.controller.js';
import { MemberTypesService } from './member-types.service.js';

@Module({
  imports: [DatabaseModule, TokenModule, SessionModule],
  controllers: [MemberTypesController],
  providers: [MemberTypesService, AccessTokenGuard, RolesGuard],
  exports: [MemberTypesService],
})
export class MemberTypesModule {}
