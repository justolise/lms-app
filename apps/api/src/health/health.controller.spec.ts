import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

// INFRA: Health controller unit tests (approved platform-scope observability requirement)

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: { checkLiveness: ReturnType<typeof vi.fn>; checkReadiness: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    healthService = {
      checkLiveness: vi.fn(),
      checkReadiness: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthService, useValue: healthService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('GET /health/live', () => {
    it('returns 200 with status ok and uptime when process is alive', () => {
      const mockResult = { status: 'ok' as const, uptime: 42, timestamp: '2026-01-01T00:00:00.000Z' };
      healthService.checkLiveness.mockReturnValue(mockResult);

      const result = controller.getLiveness();

      expect(result).toEqual(mockResult);
      expect(result.status).toBe('ok');
      expect(typeof result.uptime).toBe('number');
      expect(healthService.checkLiveness).toHaveBeenCalledOnce();
    });
  });

  describe('GET /health/ready', () => {
    it('returns 200 with all checks up when db and redis are healthy', async () => {
      const mockResult = {
        status: 'ok' as const,
        checks: { database: 'up' as const, redis: 'up' as const },
        timestamp: '2026-01-01T00:00:00.000Z',
      };
      healthService.checkReadiness.mockResolvedValue(mockResult);

      const result = await controller.getReadiness();

      expect(result).toEqual(mockResult);
      expect(result.checks.database).toBe('up');
      expect(result.checks.redis).toBe('up');
    });

    it('throws ServiceUnavailableException (503) when database is down', async () => {
      const payload = {
        status: 'down' as const,
        checks: { database: 'down' as const, redis: 'up' as const },
        timestamp: '2026-01-01T00:00:00.000Z',
        error: 'Database unreachable: connection refused',
      };
      healthService.checkReadiness.mockRejectedValue(new ServiceUnavailableException(payload));

      await expect(controller.getReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('throws ServiceUnavailableException (503) when redis is down', async () => {
      const payload = {
        status: 'down' as const,
        checks: { database: 'up' as const, redis: 'down' as const },
        timestamp: '2026-01-01T00:00:00.000Z',
        error: 'Redis unreachable: connection refused',
      };
      healthService.checkReadiness.mockRejectedValue(new ServiceUnavailableException(payload));

      await expect(controller.getReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('throws ServiceUnavailableException (503) when both db and redis are down', async () => {
      const payload = {
        status: 'down' as const,
        checks: { database: 'down' as const, redis: 'down' as const },
        timestamp: '2026-01-01T00:00:00.000Z',
        error: 'Database unreachable: timeout; Redis unreachable: timeout',
      };
      healthService.checkReadiness.mockRejectedValue(new ServiceUnavailableException(payload));

      await expect(controller.getReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
