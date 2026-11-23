import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

export interface CorrelatedRequest extends Request {
  correlationId: string;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incomingHeader =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string);

    // Validate incoming ID (allow alphanumeric and hyphens, up to 64 chars)
    const correlationId =
      incomingHeader && /^[a-zA-Z0-9-]{8,64}$/.test(incomingHeader.trim())
        ? incomingHeader.trim()
        : randomUUID();

    (req as CorrelatedRequest).correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    next();
  }
}
