import { describe, expect, it } from 'vitest';
import { PlatformMfaService } from './platform-mfa.service.js';

describe('PlatformMfaService', () => {
  const service = new PlatformMfaService();

  describe('Base32 Encoding & Decoding', () => {
    it('should correctly roundtrip encode and decode buffers', () => {
      const original = Buffer.from('Hello, World! 12345', 'utf8');
      const encoded = service.encodeBase32(original);
      const decoded = service.decodeBase32(encoded);

      expect(decoded.toString('utf8')).toBe('Hello, World! 12345');
    });

    it('should generate a 32-character Base32 secret for 20 random bytes', () => {
      const secret = service.generateTotpSecret();
      expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    });
  });

  describe('TOTP Generation & Verification (RFC 6238)', () => {
    it('should generate a 6-digit numeric token', () => {
      const secret = service.generateTotpSecret();
      const token = service.generateTotp(secret);

      expect(token).toMatch(/^\d{6}$/);
    });

    it('should verify a valid token at current timestamp', () => {
      const secret = service.generateTotpSecret();
      const now = Date.now();
      const token = service.generateTotp(secret, now);

      expect(service.verifyTotp(secret, token, now)).toBe(true);
    });

    it('should accept a token within +/- 30 seconds time skew window', () => {
      const secret = service.generateTotpSecret();
      const now = Date.now();

      // Token generated 30 seconds ago
      const tokenPast = service.generateTotp(secret, now - 30_000);
      expect(service.verifyTotp(secret, tokenPast, now)).toBe(true);

      // Token generated 30 seconds in future
      const tokenFuture = service.generateTotp(secret, now + 30_000);
      expect(service.verifyTotp(secret, tokenFuture, now)).toBe(true);
    });

    it('should reject a token older than 60 seconds (outside window)', () => {
      const secret = service.generateTotpSecret();
      const now = Date.now();
      const expiredToken = service.generateTotp(secret, now - 90_000);

      expect(service.verifyTotp(secret, expiredToken, now)).toBe(false);
    });

    it('should reject invalid or non-numeric tokens', () => {
      const secret = service.generateTotpSecret();

      expect(service.verifyTotp(secret, '12345')).toBe(false);
      expect(service.verifyTotp(secret, 'abcdef')).toBe(false);
      expect(service.verifyTotp(secret, '999999')).toBe(false);
    });

    it('should construct a valid standard otpauth URI', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const uri = service.getOtpAuthUri('admin@commonplace.co.ke', secret);

      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain('Commonplace%20Platform');
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    });
  });

  describe('AES-256-GCM Secret Encryption & Decryption', () => {
    it('should encrypt and decrypt a TOTP secret cleanly', () => {
      const originalSecret = service.generateTotpSecret();
      const encrypted = service.encryptSecret(originalSecret);

      expect(encrypted.startsWith('v1.')).toBe(true);
      expect(encrypted).not.toBe(originalSecret);

      const decrypted = service.decryptSecret(encrypted);
      expect(decrypted).toBe(originalSecret);
    });

    it('should reject corrupted encrypted payloads', () => {
      expect(() => service.decryptSecret('invalid-payload')).toThrow();
    });
  });

  describe('Emergency Backup Recovery Codes', () => {
    it('should generate 8 recovery codes and verify against Argon2 hashes', async () => {
      const { plaintextCodes, hashedCodes } =
        await service.generateRecoveryCodes();

      expect(plaintextCodes.length).toBe(8);
      expect(hashedCodes.length).toBe(8);

      for (const code of plaintextCodes) {
        expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
      }

      // Verify the 3rd code matches
      const targetCode = plaintextCodes[2];
      const matchIndex = await service.verifyRecoveryCode(
        targetCode,
        hashedCodes,
      );
      expect(matchIndex).toBe(2);

      // Verify a fake code does not match
      const fakeMatch = await service.verifyRecoveryCode(
        'FFFF-FFFF-FFFF',
        hashedCodes,
      );
      expect(fakeMatch).toBe(-1);
    }, 15000);
  });
});
