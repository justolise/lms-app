import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RateLimitGuard } from './rate-limit.guard.js';

describe('RateLimitGuard', () => {
  const options = {
    limit: 5,
    windowMs: 60000,
    keyPrefix: 'auth-login',
  };

  const redisService = {
    incrementRateLimit: vi.fn(),
  };

  const reflector = {
    getAllAndOverride: vi.fn(),
  };

  const request: {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
    socket: {
      remoteAddress?: string;
    };
  } = {
    ip: '127.0.0.1',
    headers: {},
    socket: {
      remoteAddress: '127.0.0.1',
    },
  };

  const response = {
    setHeader: vi.fn(),
  };

  const context = {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  };

  let guard: RateLimitGuard;

  beforeEach(() => {
    vi.clearAllMocks();

    reflector.getAllAndOverride.mockReturnValue(options);

    redisService.incrementRateLimit.mockResolvedValue({
      count: 1,
      ttlMs: 60000,
    });

    request.ip = '127.0.0.1';

    guard = new RateLimitGuard(reflector as never, redisService as never);
  });

  it('allows requests within the configured limit', async () => {
    await expect(guard.canActivate(context as never)).resolves.toBe(true);

    expect(redisService.incrementRateLimit).toHaveBeenCalledOnce();
  });

  it('allows the final permitted request', async () => {
    redisService.incrementRateLimit.mockResolvedValue({
      count: 5,
      ttlMs: 30000,
    });

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
  });

  it('rejects requests exceeding the limit with HTTP 429', async () => {
    redisService.incrementRateLimit.mockResolvedValue({
      count: 6,
      ttlMs: 30000,
    });

    await expect(guard.canActivate(context as never)).rejects.toMatchObject({
      status: 429,
    });

    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '30');
  });

  it('does not apply a limit when no metadata exists', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(context as never)).resolves.toBe(true);

    expect(redisService.incrementRateLimit).not.toHaveBeenCalled();
  });

  it('fails closed when Redis is unavailable', async () => {
    redisService.incrementRateLimit.mockRejectedValue(
      new Error('Redis connection refused'),
    );

    await expect(guard.canActivate(context as never)).rejects.toMatchObject({
      status: 503,
    });
  });

  it('rejects requests when the client IP is unavailable', async () => {
    request.ip = undefined;
    request.socket.remoteAddress = undefined;

    await expect(guard.canActivate(context as never)).rejects.toMatchObject({
      status: 503,
    });
  });

  it('uses a different Redis key for a different IP', async () => {
    await guard.canActivate(context as never);

    const firstKey = redisService.incrementRateLimit.mock.calls[0][0];

    request.ip = '192.168.1.10';

    await guard.canActivate(context as never);

    const secondKey = redisService.incrementRateLimit.mock.calls[1][0];

    expect(firstKey).not.toBe(secondKey);
  });

  it('extracts client IP from request.ip when behind a trusted proxy', async () => {
    request.ip = '203.0.113.195';

    await guard.canActivate(context as never);

    const key = redisService.incrementRateLimit.mock.calls[0][0];
    expect(key).toContain('rate-limit:auth-login:');
  });
});
