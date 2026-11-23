import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import type { CorrelatedRequest } from './correlation-id.middleware.js';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const url = req.originalUrl || req.url;

    // Skip verbose logging for health checks
    if (url.startsWith('/health/live')) {
      return next();
    }

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const correlationId = (req as CorrelatedRequest).correlationId || 'none';
      const statusCode = res.statusCode;

      if (process.env.NODE_ENV === 'production') {
        const logPayload = {
          timestamp: new Date().toISOString(),
          level: statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO',
          correlationId,
          method: req.method,
          path: url,
          statusCode,
          durationMs,
          ip: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
        };
        process.stdout.write(JSON.stringify(logPayload) + '\n');
      } else {
        const message = `[${req.method}] ${url} ${statusCode} - ${durationMs}ms [corr=${correlationId}]`;
        if (statusCode >= 500) {
          this.logger.error(message);
        } else if (statusCode >= 400) {
          this.logger.warn(message);
        } else {
          this.logger.log(message);
        }
      }
    });

    next();
  }
}
