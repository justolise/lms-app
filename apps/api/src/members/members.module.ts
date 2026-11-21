import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { IdentityModule } from '../auth/identity/identity.module.js';
import { PasswordModule } from '../auth/password/password.module.js';
import { TokenModule } from '../auth/token/token.module.js';
import { SessionModule } from '../auth/session/session.module.js';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

import { MemberIdentifierService } from './member-identifier.service.js';
import { MembersController } from './members.controller.js';
import { MembersService } from './members.service.js';

@Module({
  imports: [
    DatabaseModule,
    IdentityModule,
    PasswordModule,
    TokenModule,
    SessionModule,
  ],
  controllers: [MembersController],
  providers: [
    MembersService,
    MemberIdentifierService,
    AccessTokenGuard,
    RolesGuard,
  ],
})
export class MembersModule {}
