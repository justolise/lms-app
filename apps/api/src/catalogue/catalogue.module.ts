import { Module } from '@nestjs/common';
import { CatalogueController } from './catalogue.controller.js';
import { CatalogueService } from './catalogue.service.js';
import { CopiesService } from './copies.service.js';
import { IsbnLookupService } from './isbn-lookup.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { RedisModule } from '../redis/redis.module.js';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [CatalogueController],
  providers: [CatalogueService, CopiesService, IsbnLookupService],
  exports: [CatalogueService, CopiesService],
})
export class CatalogueModule {}
