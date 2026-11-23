import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const correlationId: string | undefined =
      (request as any).correlationId ||
      (request.headers['x-correlation-id'] as string | undefined) ||
      undefined;

    // For HttpExceptions, extract the structured response body from NestJS
    const rawResponse = isHttpException ? exception.getResponse() : undefined;

    if (!isHttpException) {
      // Securely log unexpected runtime exception without leaking stack to client
      const err = exception as Error;
      this.logger.error(
        `[corr=${correlationId || 'none'}] Unhandled exception on ${request.method} ${request.url}: ${err?.message || String(exception)}`,
        err?.stack,
      );
    }

    const meta = {
      statusCode: status,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    let errorPayload: Record<string, unknown>;

    if (typeof rawResponse === 'object' && rawResponse !== null) {
      errorPayload = { ...meta, ...(rawResponse as Record<string, unknown>) };
    } else if (typeof rawResponse === 'string') {
      errorPayload = { ...meta, message: rawResponse };
    } else {
      errorPayload = { ...meta, message: 'Internal server error' };
    }

    response.status(status).json(errorPayload);
  }
}
