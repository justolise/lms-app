import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { IdentityModule } from './identity/identity.module.js';
import { PasswordModule } from './password/password.module.js';
import { TokenModule } from './token/token.module.js';

@Module({
  imports: [DatabaseModule, IdentityModule, PasswordModule, TokenModule],
})
export class AuthModule {}
