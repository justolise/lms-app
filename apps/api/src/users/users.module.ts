import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { IdentityModule } from '../auth/identity/identity.module.js';
import { PasswordModule } from '../auth/password/password.module.js';
import { TokenModule } from '../auth/token/token.module.js';
import { SessionModule } from '../auth/session/session.module.js';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

import { UsersController } from './users.controller.js';
import { ProfileController } from './profile.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [
    DatabaseModule,
    IdentityModule,
    PasswordModule,
    TokenModule,
    SessionModule,
  ],
  controllers: [UsersController, ProfileController],
  providers: [UsersService, AccessTokenGuard, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
