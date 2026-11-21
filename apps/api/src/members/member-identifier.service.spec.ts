import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MemberIdentifierService } from './member-identifier.service.js';

describe('MemberIdentifierService', () => {
  const originalEncryptionKey = process.env.MEMBER_IDENTIFIER_ENCRYPTION_KEY;
  const originalHmacKey = process.env.MEMBER_IDENTIFIER_HMAC_KEY;

  const validEncryptionKey = Buffer.alloc(32, 1).toString('base64');
  const validHmacKey = Buffer.alloc(32, 2).toString('base64');

  beforeEach(() => {
    process.env.MEMBER_IDENTIFIER_ENCRYPTION_KEY = validEncryptionKey;
    process.env.MEMBER_IDENTIFIER_HMAC_KEY = validHmacKey;
  });

  afterEach(() => {
    if (originalEncryptionKey === undefined) {
      delete process.env.MEMBER_IDENTIFIER_ENCRYPTION_KEY;
    } else {
      process.env.MEMBER_IDENTIFIER_ENCRYPTION_KEY = originalEncryptionKey;
    }

    if (originalHmacKey === undefined) {
      delete process.env.MEMBER_IDENTIFIER_HMAC_KEY;
    } else {
      process.env.MEMBER_IDENTIFIER_HMAC_KEY = originalHmacKey;
    }
  });

  it('encrypts and decrypts an identifier', () => {
    const service = new MemberIdentifierService();

    const encrypted = service.encrypt('ID-12345678');

    expect(encrypted).not.toContain('ID-12345678');
    expect(service.decrypt(encrypted)).toBe('ID-12345678');
  });

  it('produces different ciphertext for the same identifier', () => {
    const service = new MemberIdentifierService();

    const first = service.encrypt('ID-12345678');
    const second = service.encrypt('ID-12345678');

    expect(first).not.toBe(second);
    expect(service.decrypt(first)).toBe('ID-12345678');
    expect(service.decrypt(second)).toBe('ID-12345678');
  });

  it('produces the same hash for the same identifier', () => {
    const service = new MemberIdentifierService();

    const first = service.hash('ID-12345678');
    const second = service.hash('ID-12345678');

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it('trims whitespace before hashing and encryption', () => {
    const service = new MemberIdentifierService();

    expect(service.hash(' ID-12345678 ')).toBe(service.hash('ID-12345678'));

    expect(service.decrypt(service.encrypt(' ID-12345678 '))).toBe(
      'ID-12345678',
    );
  });

  it('rejects an empty identifier', () => {
    const service = new MemberIdentifierService();

    expect(() => service.encrypt('   ')).toThrow(BadRequestException);

    expect(() => service.hash('   ')).toThrow(BadRequestException);
  });

  it('rejects tampered ciphertext', () => {
    const service = new MemberIdentifierService();

    const encrypted = service.encrypt('ID-12345678');
    const parts = encrypted.split('.');

    parts[2] = parts[2]!.replace(/^./, 'A');

    expect(() => service.decrypt(parts.join('.'))).toThrow(BadRequestException);
  });

  it('rejects malformed ciphertext', () => {
    const service = new MemberIdentifierService();

    expect(() => service.decrypt('invalid-value')).toThrow(BadRequestException);
  });

  it('rejects a missing encryption key', () => {
    delete process.env.MEMBER_IDENTIFIER_ENCRYPTION_KEY;

    expect(() => new MemberIdentifierService()).toThrow(
      'MEMBER_IDENTIFIER_ENCRYPTION_KEY is not configured',
    );
  });

  it('rejects a key that is not 32 bytes', () => {
    process.env.MEMBER_IDENTIFIER_ENCRYPTION_KEY =
      Buffer.alloc(16).toString('base64');

    expect(() => new MemberIdentifierService()).toThrow(
      'MEMBER_IDENTIFIER_ENCRYPTION_KEY must be a base64-encoded 32-byte key',
    );
  });
});
