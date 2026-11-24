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

  private isConnected = false;

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
      this.isConnected = false;
      this.logger.error(`Redis connection error: ${error.message}`);
    });

    this.client.on('connect', () => {
      this.isConnected = true;
    });
  }

  async onModuleInit(): Promise<void> {
    const isStrict = process.env.REDIS_STRICT_STARTUP === 'true';

    try {
      await this.client.connect();
      const response = await this.client.ping();

      if (response !== 'PONG') {
        throw new Error('Redis health check failed');
      }

      this.isConnected = true;
      this.logger.log('Redis connection established');
    } catch (err) {
      this.isConnected = false;

      if (isStrict) {
        throw err;
      }

      this.logger.warn(
        `Redis is unavailable at startup (${(err as Error).message}). Operating in degraded/cache-bypassed mode.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'ready') {
      await this.client.quit();
      return;
    }

    this.client.disconnect();
  }

  get isReady(): boolean {
    return this.client.status === 'ready' || this.isConnected;
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

  // ─── Generic Caching API ────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady) {
      return null;
    }

    try {
      const raw = await this.client.get(key);
      if (!raw) {
        return null;
      }

      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    } catch (err) {
      this.logger.warn(`Redis get failed for key "${key}": ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.isReady) {
      return;
    }

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err) {
      this.logger.warn(`Redis set failed for key "${key}": ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`Redis del failed for key "${key}": ${(err as Error).message}`);
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } while (cursor !== '0');
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.client.exists(key);
    return exists === 1;
  }
}
