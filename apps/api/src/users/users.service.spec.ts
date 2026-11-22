import {
  ConflictException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UsersService } from './users.service.js';
import { DatabaseService } from '../database/database.service.js';
import { IdentityService } from '../auth/identity/identity.service.js';
import { IdentityLookupService } from '../auth/identity/identity-lookup.service.js';
import { PasswordService } from '../auth/password/password.service.js';
import { SessionService } from '../auth/session/session.service.js';

describe('UsersService (AUTH-4, Directory, Profile, Deactivation, Role Promotion)', () => {
  let service: UsersService;

  const tenantId = '11111111-1111-4111-8111-111111111111';
  const adminId = '22222222-2222-4222-8222-222222222222';
  const librarianId = '33333333-3333-4333-8333-333333333333';
  const memberId = '44444444-4444-4444-8444-444444444444';

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
      offset: vi.fn(() => chain),
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
  };

  const database = {
    withTenant: vi.fn(
      async (
        _tenantId: string,
        callback: (transaction: never) => Promise<unknown>,
      ) => callback(tx as never),
    ),
  } as unknown as DatabaseService;

  const identity = {
    normalizeEmail: vi.fn((e: string) => e.trim().toLowerCase()),
    normalizePhone: vi.fn((p: string) => p.trim()),
  } as unknown as IdentityService;

  const identityLookup = {
    findIdentity: vi.fn(),
    syncIdentityInTransaction: vi.fn().mockResolvedValue(undefined),
  } as unknown as IdentityLookupService;

  const passwordService = {
    hash: vi.fn().mockResolvedValue('hashed-password'),
  } as unknown as PasswordService;

  const sessionService = {
    revokeAllUserSessions: vi.fn().mockResolvedValue(undefined),
  } as unknown as SessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue = [];
    updateQueue = [];
    insertQueue = [];

    service = new UsersService(
      database,
      identity,
      identityLookup,
      passwordService,
      sessionService,
    );
  });

  describe('createLibrarian (AUTH-4)', () => {
    it('creates a librarian with temporary password and mustChangePassword = true', async () => {
      // oxlint-disable-next-line typescript/unbound-method
      vi.mocked(identityLookup.findIdentity).mockResolvedValue([]);
      insertQueue.push([{ id: librarianId }]);

      const result = await service.createLibrarian(tenantId, adminId, {
        fullName: 'New Librarian',
        email: 'librarian@example.com',
      });

      expect(result.role).toBe('LIBRARIAN');
      expect(result.mustChangePassword).toBe(true);
      expect(result.temporaryPassword).toBeDefined();
      // oxlint-disable-next-line typescript/unbound-method
      expect(passwordService.hash).toHaveBeenCalled();
      expect(tx.insert).toHaveBeenCalledTimes(2); // user + auditLog
    });

    it('rejects duplicate email in the same library', async () => {
      // oxlint-disable-next-line typescript/unbound-method
      vi.mocked(identityLookup.findIdentity).mockResolvedValue([
        { tenantId, userId: 'existing-id' },
      ]);

      await expect(
        service.createLibrarian(tenantId, adminId, {
          fullName: 'Duplicate Librarian',
          email: 'librarian@example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getDirectory', () => {
    it('returns paginated users without exposing password hashes or tokens', async () => {
      // 1. count
      selectQueue.push([{ total: 1 }]);
      // 2. users
      selectQueue.push([
        {
          id: memberId,
          fullName: 'Alice Member',
          email: 'alice@example.com',
          phone: '+254711111111',
          role: 'MEMBER',
          status: 'ACTIVE',
          createdAt: new Date(),
          admissionNumber: 'ADM-101',
          memberTypeName: 'Student',
          groupName: 'Grade 5',
        },
      ]);

      const result = await service.getDirectory(tenantId, {
        page: 1,
        limit: 10,
      });

      expect(result.total).toBe(1);
      expect(result.users).toHaveLength(1);
      expect(result.users[0]).not.toHaveProperty('passwordHash');
      expect(result.users[0].admissionNumber).toBe('ADM-101');
    });
  });

  describe('deactivateOwnAccount', () => {
    it('deactivates own member account and revokes active sessions', async () => {
      selectQueue.push([
        {
          id: memberId,
          role: 'MEMBER',
          status: 'ACTIVE',
        },
      ]);

      const result = await service.deactivateOwnAccount(tenantId, memberId);

      expect(result.deactivated).toBe(true);
      // oxlint-disable-next-line typescript/unbound-method
      expect(sessionService.revokeAllUserSessions).toHaveBeenCalledWith(
        tenantId,
        memberId,
      );
      expect(tx.update).toHaveBeenCalled();
    });

    it('prevents deactivating the last active administrator', async () => {
      // 1. target user
      selectQueue.push([
        {
          id: adminId,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      ]);
      // 2. active admins count check
      selectQueue.push([{ id: adminId }]); // only 1 admin

      await expect(
        service.deactivateOwnAccount(tenantId, adminId),
      ).rejects.toThrow('Cannot deactivate the last active administrator');
    });

    it('prevents deactivating the last active librarian', async () => {
      // 1. target user
      selectQueue.push([
        {
          id: librarianId,
          role: 'LIBRARIAN',
          status: 'ACTIVE',
        },
      ]);
      // 2. active librarians count check
      selectQueue.push([{ id: librarianId }]); // only 1 librarian

      await expect(
        service.deactivateOwnAccount(tenantId, librarianId),
      ).rejects.toThrow('Cannot deactivate the last active librarian');
    });
  });

  describe('promoteLibrarian', () => {
    it('promotes an active librarian to administrator and logs an audit record', async () => {
      selectQueue.push([
        {
          id: librarianId,
          fullName: 'Librarian One',
          role: 'LIBRARIAN',
          status: 'ACTIVE',
        },
      ]);

      const result = await service.promoteLibrarian(
        tenantId,
        adminId,
        librarianId,
      );

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('ADMIN');
      expect(tx.update).toHaveBeenCalled();
      expect(tx.insert).toHaveBeenCalled(); // auditLog
    });

    it('rejects promoting oneself', async () => {
      await expect(
        service.promoteLibrarian(tenantId, adminId, adminId),
      ).rejects.toThrow('Administrators cannot promote themselves');
    });

    it('rejects promoting a non-librarian (e.g. member)', async () => {
      selectQueue.push([
        {
          id: memberId,
          fullName: 'Member One',
          role: 'MEMBER',
          status: 'ACTIVE',
        },
      ]);

      await expect(
        service.promoteLibrarian(tenantId, adminId, memberId),
      ).rejects.toThrow('Only librarians can be promoted to administrator');
    });

    it('rejects promoting a suspended librarian', async () => {
      selectQueue.push([
        {
          id: librarianId,
          fullName: 'Librarian One',
          role: 'LIBRARIAN',
          status: 'SUSPENDED',
        },
      ]);

      await expect(
        service.promoteLibrarian(tenantId, adminId, librarianId),
      ).rejects.toThrow('Cannot promote an inactive or suspended user');
    });
  });
});
