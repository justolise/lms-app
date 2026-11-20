import { describe, it, expect, beforeEach } from 'vitest';
import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe('hash()', () => {
    it('should generate a password hash', async () => {
      const hash = await passwordService.hash('MySecurePassword123!');

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('MySecurePassword123!');
    });

    it('should generate different hashes for the same password', async () => {
      const firstHash = await passwordService.hash('MySecurePassword123!');
      const secondHash = await passwordService.hash('MySecurePassword123!');

      expect(firstHash).not.toBe(secondHash);
    });
  });

  describe('verify()', () => {
    it('should accept the correct password', async () => {
      const hash = await passwordService.hash('MySecurePassword123!');

      const result = await passwordService.verify(hash, 'MySecurePassword123!');

      expect(result).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const hash = await passwordService.hash('MySecurePassword123!');

      const result = await passwordService.verify(hash, 'WrongPassword123!');

      expect(result).toBe(false);
    });

    it('should reject a malformed password hash', async () => {
      const result = await passwordService.verify(
        'this-is-not-a-valid-hash',
        'MySecurePassword123!',
      );

      expect(result).toBe(false);
    });
  });
});
