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
    mustChangePassword: false,
  };

  let selectRows: any[] = [];
  let updateRows: any[] = [];
  let insertRows: any[] = [];
  let throwDbError: Error | null = null;

  const createQueryChain = (getRows: () => any[]) => {
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
        if (throwDbError) {
          return Promise.reject(throwDbError).then(onfulfilled, onrejected);
        }
        return Promise.resolve(getRows()).then(onfulfilled, onrejected);
      },
    };
    return chain;
  };

  const tx = {
    select: vi.fn(() => createQueryChain(() => selectRows)),
    update: vi.fn(() => createQueryChain(() => updateRows)),
    insert: vi.fn(() => createQueryChain(() => insertRows)),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
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
    throwDbError = null;
    selectRows = [account];
    updateRows = [];
    insertRows = [];

    database.withTenant.mockImplementation(
      async (
        _tenantId: string,
        callback: (transaction: never) => Promise<unknown>,
      ) => callback(tx as never),
    );

    authService = new AuthService(
      database as unknown as DatabaseService,
      identityLookup as unknown as IdentityLookupService,
      passwordService as unknown as PasswordService,
    );

    identityLookup.findIdentity.mockResolvedValue([
      { userId: account.userId, tenantId: account.tenantId },
    ]);

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
        mustChangePassword: false,
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
    selectRows = [{ ...account, userStatus: 'SUSPENDED' }];

    await expect(
      authService.verifyCredentials(
        'EMAIL',
        'jane@example.com',
        'CorrectPassword123!',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject users belonging to suspended libraries', async () => {
    selectRows = [{ ...account, tenantStatus: 'SUSPENDED' }];

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

    let callCount = 0;
    database.withTenant.mockImplementation(async (_tenantId, callback) => {
      callCount++;
      if (callCount === 1) {
        selectRows = [account];
      } else {
        selectRows = [
          {
            ...account,
            userId: 'user-2',
            tenantId: 'tenant-2',
            tenantName: 'Eastside Library',
          },
        ];
      }
      return callback(tx as never);
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
    throwDbError = new Error('Database connection failed');

    await expect(
      authService.verifyCredentials(
        'EMAIL',
        'jane@example.com',
        'CorrectPassword123!',
      ),
    ).rejects.toThrow('Database connection failed');
  });

  describe('changePassword', () => {
    it('successfully changes password and updates mustChangePassword to false', async () => {
      selectRows = [{ id: 'user-1', passwordHash: 'old-hash', status: 'ACTIVE' }];
      passwordService.verify.mockResolvedValue(true);
      passwordService.hash.mockResolvedValue('new-argon2-hash');

      await authService.changePassword(
        'tenant-1',
        'user-1',
        'CurrentPassword123!',
        'NewStrongPassword456!',
      );

      expect(tx.update).toHaveBeenCalled();
      expect(tx.insert).toHaveBeenCalled();
    });

    it('successfully changes password on first login without providing currentPassword', async () => {
      selectRows = [
        {
          id: 'user-1',
          passwordHash: 'temp-hash',
          status: 'ACTIVE',
          mustChangePassword: true,
        },
      ];
      passwordService.hash.mockResolvedValue('new-argon2-hash');

      await authService.changePassword(
        'tenant-1',
        'user-1',
        undefined,
        'NewStrongPassword456!',
      );

      expect(tx.update).toHaveBeenCalled();
      expect(tx.insert).toHaveBeenCalled();
    });

    it('rejects if current password is incorrect on regular password change', async () => {
      selectRows = [{ id: 'user-1', passwordHash: 'old-hash', status: 'ACTIVE' }];
      passwordService.verify.mockResolvedValue(false);

      await expect(
        authService.changePassword(
          'tenant-1',
          'user-1',
          'WrongCurrentPassword!',
          'NewStrongPassword456!',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if new password is too short', async () => {
      await expect(
        authService.changePassword(
          'tenant-1',
          'user-1',
          'CurrentPassword123!',
          'short',
        ),
      ).rejects.toThrow('New password must be at least 8 characters long');
    });

    it('rejects if new password is the same as current password', async () => {
      await expect(
        authService.changePassword(
          'tenant-1',
          'user-1',
          'CurrentPassword123!',
          'CurrentPassword123!',
        ),
      ).rejects.toThrow('New password must be different from the current password');
    });
  });
});
