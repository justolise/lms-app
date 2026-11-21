import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { TokenModule } from '../token/token.module.js';
import { SessionService } from './session.service.js';

@Module({
  imports: [DatabaseModule, TokenModule],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
