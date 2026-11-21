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
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';

@Module({
  imports: [
    DatabaseModule,
    IdentityModule,
    PasswordModule,
    TokenModule,
    SessionModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, AccessTokenGuard, RateLimitGuard],
  exports: [AuthService, OtpService, AccessTokenGuard, RateLimitGuard],
})
export class AuthModule {}
