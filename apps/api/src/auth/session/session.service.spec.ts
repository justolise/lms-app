import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';

import { SessionService } from './session.service.js';
import { DatabaseService } from '../../database/database.service.js';
import { TokenService } from '../token/token.service.js';

describe('SessionService', () => {
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const sessionId = '33333333-3333-4333-8333-333333333333';
  const replacementId = '44444444-4444-4444-8444-444444444444';

  let selectQueue: any[][] = [];
  let updateQueue: any[][] = [];
  let insertQueue: any[][] = [];

  const createQueryChain = (queue: any[][]) => {
    const chain: any = {
      from: vi.fn(() => chain),
      innerJoin: vi.fn(() => chain),
      leftJoin: vi.fn(() => chain),
      where: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      for: vi.fn(() => chain),
      values: vi.fn(() => chain),
      set: vi.fn(() => chain),
      returning: vi.fn(() => chain),
      // oxlint-disable-next-line unicorn/no-thenable -- intentional: makes mock chain awaitable like Drizzle queries
      then: (onfulfilled: any, onrejected: any) => {
        const rows = queue.length > 0 ? queue.shift()! : [];
        return Promise.resolve(rows).then(onfulfilled, onrejected);
      },
    };
    return chain;
  };

  const tx = {
    select: vi.fn(() => createQueryChain(selectQueue)),
    update: vi.fn(() => createQueryChain(updateQueue)),
    insert: vi.fn(() => createQueryChain(insertQueue)),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  };

  const withTenant = vi.fn();

  const database = {
    withTenant,
  } as unknown as DatabaseService;

  const tokenService = {
    signAccessToken: vi.fn(),
  } as unknown as TokenService;

  let service: SessionService;

  beforeEach(() => {
    vi.resetAllMocks();
    selectQueue = [];
    updateQueue = [];
    insertQueue = [];

    withTenant.mockImplementation(
      async (
        _tenantId: string,
        callback: (transaction: never) => Promise<unknown>,
      ) => callback(tx as never),
    );

    tokenService.signAccessToken = vi.fn().mockResolvedValue('access-token');

    service = new SessionService(database, tokenService);
  });

  it('creates a session and stores its refresh-token hash', async () => {
    const result = await service.createSession({
      tenantId,
      userId,
      role: 'MEMBER',
      deviceName: 'Test browser',
    });

    expect(result.sessionId).toBeDefined();
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toMatch(
      new RegExp(`^${tenantId.replace(/-/g, '\\-')}\\.`),
    );
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    expect(withTenant).toHaveBeenCalledWith(tenantId, expect.any(Function));
    expect(tx.insert).toHaveBeenCalledOnce();
    // oxlint-disable-next-line typescript/unbound-method
    expect(tokenService.signAccessToken).toHaveBeenCalledWith({
      userId,
      tenantId,
      role: 'MEMBER',
      sessionId: result.sessionId,
      mustChangePassword: undefined,
    });
  });

  it('rotates an active refresh token', async () => {
    const originalRefreshToken = `${tenantId}.original-token`;

    // 1. Existing session
    selectQueue.push([
      {
        id: sessionId,
        tenantId,
        userId,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        replacedBySessionId: null,
        deviceName: 'Test browser',
      },
    ]);

    // 2. User record
    selectQueue.push([
      { role: 'MEMBER', status: 'ACTIVE', mustChangePassword: false },
    ]);

    const result = await service.refreshSession(originalRefreshToken);

    expect(result.sessionId).toBeDefined();
    expect(result.sessionId).not.toBe(sessionId);
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).not.toBe(originalRefreshToken);
    expect(result.refreshToken).toContain(`${tenantId}.`);

    expect(tx.select).toHaveBeenCalledTimes(2);
    expect(tx.insert).toHaveBeenCalledOnce();
    expect(tx.update).toHaveBeenCalledOnce();
  });

  it('rejects an invalid refresh token', async () => {
    await expect(
      service.refreshSession('not-a-valid-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(withTenant).not.toHaveBeenCalled();
  });

  it('revokes the replacement chain when a rotated token is replayed', async () => {
    selectQueue.push([
      {
        id: sessionId,
        tenantId,
        userId,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        replacedBySessionId: replacementId,
        deviceName: 'Test browser',
      },
    ]);

    await expect(
      service.refreshSession(`${tenantId}.replayed-token`),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(tx.update).toHaveBeenCalledOnce();
  });

  it('rejects an expired refresh token and marks its session revoked', async () => {
    selectQueue.push([
      {
        id: sessionId,
        tenantId,
        userId,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 60_000),
        replacedBySessionId: null,
        deviceName: null,
      },
    ]);

    await expect(
      service.refreshSession(`${tenantId}.expired-token`),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(tx.update).toHaveBeenCalledOnce();
  });

  it('lists only the rows returned by the tenant-scoped query', async () => {
    const sessions = [
      {
        id: sessionId,
        deviceName: 'Laptop',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      },
    ];

    selectQueue.push(sessions);

    await expect(service.listSessions(tenantId, userId)).resolves.toEqual(
      sessions,
    );

    expect(withTenant).toHaveBeenCalledWith(tenantId, expect.any(Function));
  });

  it('revokes a session belonging to the requesting user', async () => {
    updateQueue.push([{ id: sessionId }]);

    await expect(
      service.revokeSession(tenantId, userId, sessionId),
    ).resolves.toBeUndefined();

    expect(tx.update).toHaveBeenCalledOnce();
  });

  it('does not report success when the session cannot be revoked', async () => {
    updateQueue.push([]);

    await expect(
      service.revokeSession(tenantId, userId, sessionId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
