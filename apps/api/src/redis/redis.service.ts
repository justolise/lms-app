import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Redis } from 'ioredis';

export interface RateLimitCounter {
  count: number;
  ttlMs: number;
}

const INCREMENT_RATE_LIMIT_SCRIPT = `
  local current = redis.call('INCR', KEYS[1])

  if current == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
  end

  local ttl = redis.call('PTTL', KEYS[1])

  return { current, ttl }
`;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error('REDIS_URL is required');
    }

    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 3) {
          return null;
        }

        return Math.min(times * 250, 1000);
      },
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();

    const response = await this.client.ping();

    if (response !== 'PONG') {
      throw new Error('Redis health check failed');
    }

    this.logger.log('Redis connection established');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'ready') {
      await this.client.quit();
      return;
    }

    this.client.disconnect();
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async incrementRateLimit(
    key: string,
    windowMs: number,
  ): Promise<RateLimitCounter> {
    if (!Number.isInteger(windowMs) || windowMs <= 0) {
      throw new Error('Rate limit window must be a positive integer');
    }

    const result = (await this.client.eval(
      INCREMENT_RATE_LIMIT_SCRIPT,
      1,
      key,
      String(windowMs),
    )) as [number, number];

    return {
      count: Number(result[0]),
      ttlMs: Math.max(0, Number(result[1])),
    };
  }
}
