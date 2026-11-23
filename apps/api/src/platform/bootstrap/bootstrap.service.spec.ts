import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { PlatformBootstrapService } from './bootstrap.service.js';
import { PlatformMfaService } from '../auth/platform-mfa.service.js';

describe('PlatformBootstrapService', () => {
  let service: PlatformBootstrapService;
  let mockDb: {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
  };
  let mockDatabase: { db: typeof mockDb };
  let mfaService: PlatformMfaService;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
    };
    mockDatabase = { db: mockDb };
    mfaService = new PlatformMfaService();
    service = new PlatformBootstrapService(mockDatabase as any, mfaService);
  });

  it('should successfully bootstrap a super admin when no active admin exists', async () => {
    // 1. Mock: no existing active super admin
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });

    const mockCreatedUser = {
      id: 'super-admin-uuid-1',
      email: 'admin@commonplace.co.ke',
      fullName: 'Chief Super Admin',
      status: 'ACTIVE',
      mfaEnabled: true,
    };

    // 2. Mock: insert user & audit log
    mockDb.insert
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCreatedUser]),
        }),
      })
      .mockReturnValueOnce({
        values: vi.fn().mockResolvedValue([{}]),
      });

    const result = await service.bootstrap({
      email: 'admin@commonplace.co.ke',
      fullName: 'Chief Super Admin',
      password: 'SuperSecurePassword2026!',
    });

    expect(result.platformUserId).toBe('super-admin-uuid-1');
    expect(result.email).toBe('admin@commonplace.co.ke');
    expect(result.fullName).toBe('Chief Super Admin');
    expect(result.totpSecret).toMatch(/^[A-Z2-7]{32}$/);
    expect(result.totpUri).toContain('otpauth://totp/');
    expect(result.recoveryCodes.length).toBe(8);
  });

  it('should abort and self-disable if an active platform super admin already exists', async () => {
    // Mock: existing active super admin found
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'existing-admin-id' }]),
    });

    await expect(
      service.bootstrap({
        email: 'another@commonplace.co.ke',
        fullName: 'Another Admin',
        password: 'SuperPassword123!',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject invalid email or passwords shorter than 8 characters', async () => {
    await expect(
      service.bootstrap({
        email: 'invalid-email',
        fullName: 'Test Admin',
        password: 'ValidPassword123!',
      }),
    ).rejects.toThrow('A valid email address is required');

    await expect(
      service.bootstrap({
        email: 'valid@example.com',
        fullName: 'Test Admin',
        password: 'short',
      }),
    ).rejects.toThrow('Password must be at least 8 characters long');
  });
});
