import { Module } from '@nestjs/common';
import { PublicController } from './public.controller.js';
import { PublicService } from './public.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [PublicController],
  providers: [PublicService, RateLimitGuard],
  exports: [PublicService],
})
export class PublicModule {}
