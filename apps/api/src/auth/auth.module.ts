import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { IdentityModule } from './identity/identity.module.js';
import { PasswordModule } from './password/password.module.js';
import { TokenModule } from './token/token.module.js';
import { SessionModule } from './session/session.module.js';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { OtpService } from './otp/otp.service.js';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';

@Module({
  imports: [
    DatabaseModule,
    IdentityModule,
    PasswordModule,
    TokenModule,
    SessionModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, AccessTokenGuard],
  exports: [AuthService, OtpService, AccessTokenGuard],
})
export class AuthModule {}
