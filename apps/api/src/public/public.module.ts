import { Module } from '@nestjs/common';
import { PublicController } from './public.controller.js';
import { PublicService } from './public.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { CatalogueModule } from '../catalogue/catalogue.module.js';

@Module({
  imports: [
    DatabaseModule,
    // CatalogueModule exports CatalogueService — re-used here for search and list.
    CatalogueModule,
  ],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
