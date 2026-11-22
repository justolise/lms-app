import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';

import { RedisService } from '../../redis/redis.service.js';
import { RATE_LIMIT_KEY } from '../constants/app.constants.js';
import type { RateLimitOptions } from '../interfaces/rate-limit-options.interface.js';

interface HttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: {
    remoteAddress?: string;
  };
}

interface HttpResponse {
  setHeader(name: string, value: string): void;
}

/**
 * AUTH-5: Sliding-window rate limiter backed by Redis.
 * Applied per-route via the @RateLimit() decorator.
 * Uses a SHA-256 hash of the client IP as the Redis key to avoid
 * storing raw addresses.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<HttpRequest>();
    const response = context.switchToHttp().getResponse<HttpResponse>();

    // In Express with 'trust proxy', request.ip is populated by Express using
    // trusted reverse proxy configuration, preventing client-spoofed X-Forwarded-For injection.
    const ip = request.ip || request.socket?.remoteAddress;

    if (!ip) {
      throw new ServiceUnavailableException(
        'Unable to determine client address',
      );
    }

    const ipHash = createHash('sha256').update(ip).digest('hex');
    const key = `rate-limit:${options.keyPrefix}:${ipHash}`;

    let result: { count: number; ttlMs: number };

    try {
      result = await this.redisService.incrementRateLimit(key, options.windowMs);
    } catch {
      throw new ServiceUnavailableException(
        'Authentication rate limiting is temporarily unavailable',
      );
    }

    if (result.count > options.limit) {
      this.logger.warn(
        `Rate limit exceeded: [prefix=${options.keyPrefix}] [ipHash=${ipHash}] [count=${result.count}/${options.limit}]`,
      );

      const retryAfterSeconds = Math.max(1, Math.ceil(result.ttlMs / 1000));

      response.setHeader('Retry-After', String(retryAfterSeconds));

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
