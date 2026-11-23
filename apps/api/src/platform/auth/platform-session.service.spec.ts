import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { PlatformSessionService } from './platform-session.service.js';

describe('PlatformSessionService', () => {
  let service: PlatformSessionService;
  let mockDb: {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockDatabase: { db: typeof mockDb };

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };
    mockDatabase = { db: mockDb };
    service = new PlatformSessionService(mockDatabase as any);
  });

  it('should create a platform session with hashed refresh token', async () => {
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue([{}]),
    });

    const result = await service.createSession('user-uuid-1', '127.0.0.1', 'Vitest Agent');

    expect(result.sessionId).toBeDefined();
    expect(result.refreshToken.startsWith('platform.')).toBe(true);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('should refresh a valid platform session and rotate tokens', async () => {
    const validSession = {
      id: 'session-123',
      platformUserId: 'user-123',
      expiresAt: new Date(Date.now() + 100_000),
      revokedAt: null,
      replacedBySessionId: null,
    };

    const activeUser = {
      id: 'user-123',
      email: 'admin@commonplace.co.ke',
      fullName: 'Super Admin',
      status: 'ACTIVE',
    };

    // 1. Session lookup
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([validSession]),
      })
      // 2. User lookup
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([activeUser]),
      });

    // 3. Insert new session
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue([{}]),
    });

    // 4. Update old session
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{}]),
    });

    const outcome = await service.refreshSession('platform.dummyrefreshtoken1234567890123456');

    expect(outcome.platformUserId).toBe('user-123');
    expect(outcome.newSessionId).toBeDefined();
    expect(outcome.newRefreshToken.startsWith('platform.')).toBe(true);
  });

  it('should trigger revocation of all sessions on token reuse', async () => {
    const reusedSession = {
      id: 'session-reused',
      platformUserId: 'compromised-user',
      expiresAt: new Date(Date.now() + 100_000),
      revokedAt: new Date(Date.now() - 1000), // Already revoked!
      replacedBySessionId: 'session-replacement',
    };

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([reusedSession]),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{}]),
    });

    await expect(
      service.refreshSession('platform.reusedtoken'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject refresh tokens with invalid prefix', async () => {
    await expect(
      service.refreshSession('invalid-prefix-token'),
    ).rejects.toThrow('Invalid or expired platform refresh token');
  });
});
