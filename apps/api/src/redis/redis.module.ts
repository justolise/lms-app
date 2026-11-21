import { Global, Module } from '@nestjs/common';

import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { RedisService } from './redis.service.js';

@Global()
@Module({
  providers: [RedisService, RateLimitGuard],
  exports: [RedisService, RateLimitGuard],
})
export class RedisModule {}
