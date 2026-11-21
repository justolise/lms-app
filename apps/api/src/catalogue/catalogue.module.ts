import { Module } from '@nestjs/common';
import { CatalogueController } from './catalogue.controller.js';
import { CatalogueService } from './catalogue.service.js';
import { CopiesService } from './copies.service.js';
import { IsbnLookupService } from './isbn-lookup.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { TokenModule } from '../auth/token/token.module.js';
import { SessionModule } from '../auth/session/session.module.js';
import { AccessTokenGuard } from '../common/guards/access-token.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [DatabaseModule, RedisModule, TokenModule, SessionModule],
  controllers: [CatalogueController],
  providers: [
    CatalogueService,
    CopiesService,
    IsbnLookupService,
    AccessTokenGuard,
    RolesGuard,
  ],
  exports: [CatalogueService, CopiesService],
})
export class CatalogueModule {}
