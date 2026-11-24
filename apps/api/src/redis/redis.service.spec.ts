import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const redisMocks = vi.hoisted(() => ({
  connect: vi.fn(),
  ping: vi.fn(),
  eval: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  scan: vi.fn(),
  exists: vi.fn(),
  on: vi.fn(),
  quit: vi.fn(),
  disconnect: vi.fn(),
  status: 'ready',
}));

vi.mock('ioredis', () => ({
  Redis: class {
    constructor() {
      return redisMocks;
    }
  },
}));

import { RedisService } from './redis.service.js';

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(() => {
    vi.clearAllMocks();

    redisMocks.status = 'ready';
    redisMocks.connect.mockResolvedValue(undefined);
    redisMocks.ping.mockResolvedValue('PONG');
    redisMocks.eval.mockResolvedValue([2, 45000]);
    redisMocks.quit.mockResolvedValue('OK');

    vi.stubEnv('REDIS_URL', 'redis://127.0.0.1:6379');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('constructor', () => {
    it('requires REDIS_URL', () => {
      vi.stubEnv('REDIS_URL', '');

      expect(() => new RedisService()).toThrow('REDIS_URL is required');
    });
  });

  describe('onModuleInit', () => {
    it('connects to Redis and verifies the connection', async () => {
      service = new RedisService();

      await service.onModuleInit();

      expect(redisMocks.connect).toHaveBeenCalledOnce();
      expect(redisMocks.ping).toHaveBeenCalledOnce();
    });

    it('fails when Redis does not return PONG in strict mode', async () => {
      vi.stubEnv('REDIS_STRICT_STARTUP', 'true');
      redisMocks.ping.mockResolvedValue('NOT_PONG');

      service = new RedisService();

      await expect(service.onModuleInit()).rejects.toThrow(
        'Redis health check failed',
      );
    });

    it('fails when Redis cannot connect in strict mode', async () => {
      vi.stubEnv('REDIS_STRICT_STARTUP', 'true');
      redisMocks.connect.mockRejectedValue(new Error('Connection refused'));

      service = new RedisService();

      await expect(service.onModuleInit()).rejects.toThrow(
        'Connection refused',
      );
    });

    it('logs warning and does not throw when Redis fails in resilient mode (default)', async () => {
      redisMocks.status = 'reconnecting';
      redisMocks.ping.mockResolvedValue('NOT_PONG');

      service = new RedisService();

      await expect(service.onModuleInit()).resolves.toBeUndefined();
      expect(service.isReady).toBe(false);
    });
  });

  describe('incrementRateLimit', () => {
    beforeEach(() => {
      service = new RedisService();
    });

    it('increments a counter and returns its count and TTL', async () => {
      const result = await service.incrementRateLimit('auth:login:test', 60000);

      expect(redisMocks.eval).toHaveBeenCalledOnce();

      const [script, keyCount, redisKey, window] =
        redisMocks.eval.mock.calls[0];

      expect(script).toContain("redis.call('INCR', KEYS[1])");
      expect(keyCount).toBe(1);
      expect(redisKey).toBe('auth:login:test');
      expect(window).toBe('60000');

      expect(result).toEqual({
        count: 2,
        ttlMs: 45000,
      });
    });

    it('rejects a zero or negative time window', async () => {
      await expect(
        service.incrementRateLimit('auth:login:test', 0),
      ).rejects.toThrow('Rate limit window must be a positive integer');

      await expect(
        service.incrementRateLimit('auth:login:test', -1000),
      ).rejects.toThrow('Rate limit window must be a positive integer');

      expect(redisMocks.eval).not.toHaveBeenCalled();
    });

    it('rejects a non-integer time window', async () => {
      await expect(
        service.incrementRateLimit('auth:login:test', 1000.5),
      ).rejects.toThrow('Rate limit window must be a positive integer');
    });
  });

  describe('caching operations', () => {
    beforeEach(() => {
      service = new RedisService();
    });

    it('gets and parses JSON values', async () => {
      redisMocks.get.mockResolvedValue(JSON.stringify({ foo: 'bar' }));

      const result = await service.get<{ foo: string }>('test:key');

      expect(redisMocks.get).toHaveBeenCalledWith('test:key');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('returns null when key does not exist', async () => {
      redisMocks.get.mockResolvedValue(null);

      const result = await service.get('test:missing');

      expect(result).toBeNull();
    });

    it('returns raw string when value is not JSON', async () => {
      redisMocks.get.mockResolvedValue('raw-string');

      const result = await service.get<string>('test:raw');

      expect(result).toBe('raw-string');
    });

    it('sets value with TTL', async () => {
      await service.set('test:key', { bar: 123 }, 300);

      expect(redisMocks.set).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify({ bar: 123 }),
        'EX',
        300,
      );
    });

    it('sets value without TTL', async () => {
      await service.set('test:key', 'plain-text');

      expect(redisMocks.set).toHaveBeenCalledWith('test:key', 'plain-text');
    });

    it('deletes a key', async () => {
      await service.del('test:key');

      expect(redisMocks.del).toHaveBeenCalledWith('test:key');
    });

    it('deletes keys matching a pattern using scan', async () => {
      redisMocks.scan
        .mockResolvedValueOnce(['10', ['test:1', 'test:2']])
        .mockResolvedValueOnce(['0', ['test:3']]);

      await service.delByPattern('test:*');

      expect(redisMocks.scan).toHaveBeenCalledTimes(2);
      expect(redisMocks.del).toHaveBeenCalledWith('test:1', 'test:2');
      expect(redisMocks.del).toHaveBeenCalledWith('test:3');
    });

    it('checks key existence', async () => {
      redisMocks.exists.mockResolvedValue(1);

      const exists = await service.has('test:key');

      expect(exists).toBe(true);
      expect(redisMocks.exists).toHaveBeenCalledWith('test:key');
    });
  });

  describe('onModuleDestroy', () => {
    it('closes a ready Redis connection gracefully', async () => {
      service = new RedisService();

      await service.onModuleDestroy();

      expect(redisMocks.quit).toHaveBeenCalledOnce();
      expect(redisMocks.disconnect).not.toHaveBeenCalled();
    });

    it('disconnects when Redis is not ready', async () => {
      redisMocks.status = 'connecting';

      service = new RedisService();

      await service.onModuleDestroy();

      expect(redisMocks.disconnect).toHaveBeenCalledOnce();
      expect(redisMocks.quit).not.toHaveBeenCalled();
    });
  });
});
