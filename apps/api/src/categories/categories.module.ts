import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { TokenModule } from '../auth/token/token.module.js';
import { SessionModule } from '../auth/session/session.module.js';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [DatabaseModule, TokenModule, SessionModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, AccessTokenGuard, RolesGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {}
