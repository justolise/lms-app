import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { DatabaseService } from '../database/database.service.js';
import { IdentityLookupService } from './identity/identity-lookup.service.js';
import { PasswordService } from './password/password.service.js';

describe('AuthService', () => {
  let authService: AuthService;

  const account = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    tenantName: 'Central Library',
    fullName: 'Jane Member',
    role: 'MEMBER' as const,
    passwordHash: 'stored-password-hash',
    userStatus: 'ACTIVE',
    tenantStatus: 'ACTIVE',
  };

  const tx = {
    execute: vi.fn(),
  };

  const database = {
    withTenant: vi.fn(
      async (
        _tenantId: string,
        callback: (transaction: never) => Promise<unknown>,
      ) => callback(tx as never),
    ),
  };

  const identityLookup = {
    findIdentity: vi.fn(),
  };

  const passwordService = {
    hash: vi.fn(),
    verify: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    authService = new AuthService(
      database as unknown as DatabaseService,
      identityLookup as unknown as IdentityLookupService,
      passwordService as unknown as PasswordService,
    );

    identityLookup.findIdentity.mockResolvedValue([
      { userId: account.userId, tenantId: account.tenantId },
    ]);

    tx.execute.mockResolvedValue({ rows: [account] });
    passwordService.verify.mockResolvedValue(true);
    passwordService.hash.mockResolvedValue('dummy-password-hash');
  });

  it('should verify valid credentials', async () => {
    const result = await authService.verifyCredentials(
      'EMAIL',
      'jane@example.com',
      'CorrectPassword123!',
    );

    expect(result).toEqual([
      {
        userId: account.userId,
        tenantId: account.tenantId,
        tenantName: account.tenantName,
        fullName: account.fullName,
        role: account.role,
      },
    ]);

    expect(database.withTenant).toHaveBeenCalledWith(
      account.tenantId,
      expect.any(Function),
    );
  });

  it('should not return the password hash', async () => {
    const result = await authService.verifyCredentials(
      'EMAIL',
      'jane@example.com',
      'CorrectPassword123!',
    );

    expect(result[0]).not.toHaveProperty('passwordHash');
  });

  it('should reject an incorrect password', async () => {
    passwordService.verify.mockResolvedValue(false);

    await expect(
      authService.verifyCredentials(
        'EMAIL',
        'jane@example.com',
        'WrongPassword123!',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should perform dummy password verification for unknown identities', async () => {
    identityLookup.findIdentity.mockResolvedValue([]);

    await expect(
      authService.verifyCredentials(
        'EMAIL',
        'unknown@example.com',
        'SomePassword123!',
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(passwordService.hash).toHaveBeenCalledOnce();
    expect(passwordService.verify).toHaveBeenCalledWith(
      'dummy-password-hash',
      'SomePassword123!',
    );
  });

  it('should reject suspended users', async () => {
    tx.execute.mockResolvedValue({
      rows: [{ ...account, userStatus: 'SUSPENDED' }],
    });

    await expect(
      authService.verifyCredentials(
        'EMAIL',
        'jane@example.com',
        'CorrectPassword123!',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject users belonging to suspended libraries', async () => {
    tx.execute.mockResolvedValue({
      rows: [{ ...account, tenantStatus: 'SUSPENDED' }],
    });

    await expect(
      authService.verifyCredentials(
        'EMAIL',
        'jane@example.com',
        'CorrectPassword123!',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should support multiple verified library memberships', async () => {
    identityLookup.findIdentity.mockResolvedValue([
      { userId: 'user-1', tenantId: 'tenant-1' },
      { userId: 'user-2', tenantId: 'tenant-2' },
    ]);

    tx.execute
      .mockResolvedValueOnce({ rows: [account] })
      .mockResolvedValueOnce({
        rows: [
          {
            ...account,
            userId: 'user-2',
            tenantId: 'tenant-2',
            tenantName: 'Eastside Library',
          },
        ],
      });

    const result = await authService.verifyCredentials(
      'EMAIL',
      'jane@example.com',
      'CorrectPassword123!',
    );

    expect(result).toHaveLength(2);
    expect(result.map((membership) => membership.tenantId)).toEqual([
      'tenant-1',
      'tenant-2',
    ]);
  });

  it('should use the same generic error for invalid identity formats', async () => {
    identityLookup.findIdentity.mockRejectedValue(
      new BadRequestException('Invalid email address'),
    );

    await expect(
      authService.verifyCredentials(
        'EMAIL',
        'not-an-email',
        'SomePassword123!',
      ),
    ).rejects.toThrow('Invalid email/phone or password');
  });

  it('should not hide database errors', async () => {
    const databaseError = new Error('Database connection failed');

    tx.execute.mockRejectedValue(databaseError);

    await expect(
      authService.verifyCredentials(
        'EMAIL',
        'jane@example.com',
        'CorrectPassword123!',
      ),
    ).rejects.toThrow('Database connection failed');
  });
});
