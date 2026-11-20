import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IdentityLookupService } from './identity-lookup.service.js';
import type { IdentityService } from './identity.service.js';
import type { DatabaseService } from '../../database/database.service.js';

describe('IdentityLookupService', () => {
  const identityHash = 'a'.repeat(64);

  const identity = {
    hashIdentity: vi.fn().mockReturnValue(identityHash),
  };

  const execute = vi.fn();
  const transactionExecute = vi.fn();

  const transaction = {
    execute: transactionExecute,
  };

  const withTenant = vi.fn();

  const database = {
    db: { execute },
    withTenant,
  };

  let service: IdentityLookupService;

  beforeEach(() => {
    vi.resetAllMocks();
    identity.hashIdentity.mockReturnValue(identityHash);

    service = new IdentityLookupService(
      database as unknown as DatabaseService,
      identity as unknown as IdentityService,
    );

    withTenant.mockImplementation(
      async (
        _tenantId: string,
        callback: (tx: typeof transaction) => Promise<unknown>,
      ) => callback(transaction),
    );
  });

  describe('findIdentity', () => {
    it('should return the matching tenant and user as an array', async () => {
      const expected = {
        tenantId: '11111111-1111-4111-8111-111111111111',
        userId: '22222222-2222-4222-8222-222222222222',
      };

      execute.mockResolvedValue({ rows: [expected] });

      const result = await service.findIdentity('EMAIL', 'Olise@example.com');

      expect(identity.hashIdentity).toHaveBeenCalledWith(
        'EMAIL',
        'Olise@example.com',
      );
      expect(execute).toHaveBeenCalledOnce();
      expect(result).toEqual([expected]);
    });

    it('should return accounts from multiple libraries', async () => {
      const firstAccount = {
        tenantId: '11111111-1111-4111-8111-111111111111',
        userId: '22222222-2222-4222-8222-222222222222',
      };

      const secondAccount = {
        tenantId: '33333333-3333-4333-8333-333333333333',
        userId: '44444444-4444-4444-8444-444444444444',
      };

      execute.mockResolvedValue({
        rows: [firstAccount, secondAccount],
      });

      const result = await service.findIdentity('EMAIL', 'olise@example.com');

      expect(result).toEqual([firstAccount, secondAccount]);
      expect(result).toHaveLength(2);
    });

    it('should return an empty array when no identity matches', async () => {
      execute.mockResolvedValue({ rows: [] });

      const result = await service.findIdentity('EMAIL', 'unknown@example.com');

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      execute.mockRejectedValue(new Error('Database unavailable'));

      await expect(
        service.findIdentity('EMAIL', 'olise@example.com'),
      ).rejects.toThrow('Database unavailable');
    });
  });

  describe('syncIdentity', () => {
    it('should hash the identity and use the tenant transaction', async () => {
      await service.syncIdentity(
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        'EMAIL',
        'Olise@example.com',
      );

      expect(identity.hashIdentity).toHaveBeenCalledWith(
        'EMAIL',
        'Olise@example.com',
      );

      expect(withTenant).toHaveBeenCalledOnce();
      expect(withTenant).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
        expect.any(Function),
      );
      expect(transactionExecute).toHaveBeenCalledOnce();
    });

    it('should propagate duplicate identity errors', async () => {
      transactionExecute.mockRejectedValue(
        new Error('Identity already belongs to another user'),
      );

      await expect(
        service.syncIdentity(
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
          'EMAIL',
          'olise@example.com',
        ),
      ).rejects.toThrow('Identity already belongs to another user');
    });
  });

  describe('deleteIdentity', () => {
    it('should delete the identity within its tenant transaction', async () => {
      await service.deleteIdentity(
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        'EMAIL',
      );

      expect(withTenant).toHaveBeenCalledOnce();
      expect(transactionExecute).toHaveBeenCalledOnce();
    });

    it('should propagate database errors', async () => {
      transactionExecute.mockRejectedValue(new Error('Delete failed'));

      await expect(
        service.deleteIdentity(
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
          'EMAIL',
        ),
      ).rejects.toThrow('Delete failed');
    });
  });
});
