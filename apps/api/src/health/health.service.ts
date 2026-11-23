import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';

export interface LivenessResult {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

export interface ReadinessResult {
  status: 'ok' | 'down';
  checks: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
  timestamp: string;
  error?: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Liveness Probe: Confirms the process is running and the Node.js event loop responds.
   */
  checkLiveness(): LivenessResult {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness Probe: Validates connectivity to essential backing dependencies (PostgreSQL, Redis).
   */
  async checkReadiness(): Promise<ReadinessResult> {
    let dbStatus: 'up' | 'down' = 'down';
    let redisStatus: 'up' | 'down' = 'down';
    let errorMessage: string | undefined;

    // 1. Check PostgreSQL pool connectivity
    try {
      await this.database.db.execute(sql`SELECT 1`);
      dbStatus = 'up';
    } catch (err) {
      errorMessage = `Database unreachable: ${(err as Error).message}`;
      this.logger.error(errorMessage);
    }

    // 2. Check Redis connectivity
    try {
      await this.redisService.ping();
      redisStatus = 'up';
    } catch (err) {
      const msg = `Redis unreachable: ${(err as Error).message}`;
      errorMessage = errorMessage ? `${errorMessage}; ${msg}` : msg;
      this.logger.error(msg);
    }

    const isHealthy = dbStatus === 'up' && redisStatus === 'up';

    const result: ReadinessResult = {
      status: isHealthy ? 'ok' : 'down',
      checks: {
        database: dbStatus,
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
      ...(errorMessage ? { error: errorMessage } : {}),
    };

    if (!isHealthy) {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
