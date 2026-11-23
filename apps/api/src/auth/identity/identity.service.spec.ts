import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { IdentityService } from './identity.service.js';

describe('IdentityService', () => {
  const originalSecret = process.env.IDENTITY_LOOKUP_HMAC_KEY;

  const validSecret = Buffer.from('01234567890123456789012345678901').toString(
    'base64',
  );

  let service: IdentityService;

  beforeEach(() => {
    process.env.IDENTITY_LOOKUP_HMAC_KEY = validSecret;
    service = new IdentityService();
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.IDENTITY_LOOKUP_HMAC_KEY;
    } else {
      process.env.IDENTITY_LOOKUP_HMAC_KEY = originalSecret;
    }
  });

  describe('normalizeEmail', () => {
    it('should trim whitespace and convert email to lowercase', () => {
      expect(service.normalizeEmail('  Olise@Example.COM  ')).toBe(
        'olise@example.com',
      );
    });

    it('should reject an invalid email', () => {
      expect(() => service.normalizeEmail('invalid-email')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('normalizePhone', () => {
    it('should normalize a Kenyan phone number to E.164', () => {
      expect(service.normalizePhone('0712345678')).toBe('+254712345678');
    });

    it('should accept an international phone number', () => {
      expect(service.normalizePhone('+254712345678')).toBe('+254712345678');
    });

    it('should reject an invalid phone number', () => {
      expect(() => service.normalizePhone('12345')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('hashIdentity', () => {
    it('should produce the same hash for equivalent emails', () => {
      const first = service.hashIdentity('EMAIL', 'Olise@Example.com');

      const second = service.hashIdentity('EMAIL', ' olise@example.com ');

      expect(first).toBe(second);
    });

    it('should produce the same hash for equivalent phone numbers', () => {
      const first = service.hashIdentity('PHONE', '0712345678');
      const second = service.hashIdentity('PHONE', '+254712345678');

      expect(first).toBe(second);
    });

    it('should produce different hashes for different identities', () => {
      const first = service.hashIdentity('EMAIL', 'one@example.com');
      const second = service.hashIdentity('EMAIL', 'two@example.com');

      expect(first).not.toBe(second);
    });

    it('should produce a 64-character hexadecimal hash', () => {
      const hash = service.hashIdentity('EMAIL', 'olise@example.com');

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('configuration', () => {
    it('should reject a missing HMAC secret', () => {
      delete process.env.IDENTITY_LOOKUP_HMAC_KEY;

      expect(() => new IdentityService()).toThrow(
        'IDENTITY_LOOKUP_HMAC_KEY is not configured',
      );
    });

    it('should reject an incorrectly sized HMAC secret', () => {
      process.env.IDENTITY_LOOKUP_HMAC_KEY =
        Buffer.from('short').toString('base64');

      expect(() => new IdentityService()).toThrow(
        'IDENTITY_LOOKUP_HMAC_KEY must decode to exactly 32 bytes',
      );
    });
  });
});
