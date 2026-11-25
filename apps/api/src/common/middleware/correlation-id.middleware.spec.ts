import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CorrelationIdMiddleware } from './correlation-id.middleware.js';

// INFRA: CorrelationIdMiddleware unit tests (approved platform-scope observability requirement)

function makeMockReqRes(headers: Record<string, string> = {}) {
  const req = {
    headers,
  } as unknown as Request;

  const setHeaderMock = vi.fn();
  const res = {
    setHeader: setHeaderMock,
  } as unknown as Response;

  const next: NextFunction = vi.fn();

  return { req, res, next, setHeaderMock };
}

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
  });

  it('generates a new UUID correlation ID when no X-Correlation-ID header is present', () => {
    const { req, res, next } = makeMockReqRes();

    middleware.use(req, res, next);

    // UUID v4 pattern
    const uuid = (req as any).correlationId as string;
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(next).toHaveBeenCalledOnce();
  });

  it('preserves a valid incoming X-Correlation-ID header', () => {
    const validId = 'abc123de-1234-5678-abcd-ef0123456789';
    const { req, res, next, setHeaderMock } = makeMockReqRes({ 'x-correlation-id': validId });

    middleware.use(req, res, next);

    expect((req as any).correlationId).toBe(validId);
    expect(setHeaderMock).toHaveBeenCalledWith('X-Correlation-ID', validId);
    expect(next).toHaveBeenCalledOnce();
  });

  it('falls back to X-Request-ID header when X-Correlation-ID is absent', () => {
    const requestId = 'req-abcdef01-1234-5678-abcd-000000000001';
    const { req, res, next } = makeMockReqRes({ 'x-request-id': requestId });

    middleware.use(req, res, next);

    expect((req as any).correlationId).toBe(requestId);
  });

  it('replaces an invalid/too-short correlation ID with a generated UUID', () => {
    const { req, res, next } = makeMockReqRes({ 'x-correlation-id': 'short' });

    middleware.use(req, res, next);

    // 'short' is only 5 chars (< 8) — should be replaced
    const id = (req as any).correlationId as string;
    expect(id).not.toBe('short');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('replaces an overly long correlation ID (> 64 chars) with a generated UUID', () => {
    const longId = 'a'.repeat(65);
    const { req, res, next } = makeMockReqRes({ 'x-correlation-id': longId });

    middleware.use(req, res, next);

    const id = (req as any).correlationId as string;
    expect(id).not.toBe(longId);
    expect(id.length).toBeLessThanOrEqual(64);
  });

  it('replaces a correlation ID containing special characters with a generated UUID', () => {
    const { req, res, next } = makeMockReqRes({ 'x-correlation-id': 'invalid/id!@#$%' });

    middleware.use(req, res, next);

    const id = (req as any).correlationId as string;
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('echoes the correlation ID in the X-Correlation-ID response header', () => {
    const { req, res, next, setHeaderMock } = makeMockReqRes();

    middleware.use(req, res, next);

    const id = (req as any).correlationId as string;
    expect(setHeaderMock).toHaveBeenCalledWith('X-Correlation-ID', id);
  });
});
