import { BadRequestException, Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class MemberIdentifierService {
  private readonly encryptionKey: Buffer;
  private readonly hmacKey: Buffer;

  constructor() {
    this.encryptionKey = this.loadKey('MEMBER_IDENTIFIER_ENCRYPTION_KEY');
    this.hmacKey = this.loadKey('MEMBER_IDENTIFIER_HMAC_KEY');
  }

  private loadKey(name: string): Buffer {
    const value = process.env[name];

    if (!value) {
      throw new Error(`${name} is not configured`);
    }

    const key = Buffer.from(value, 'base64');

    if (key.length !== 32 || key.toString('base64') !== value) {
      throw new Error(`${name} must be a base64-encoded 32-byte key`);
    }

    return key;
  }

  encrypt(value: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException('Identifier cannot be empty');
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(normalized, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      'v1',
      iv.toString('base64url'),
      authTag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(value: string): string {
    const [version, ivValue, tagValue, encryptedValue, ...extra] =
      value.split('.');

    if (
      version !== 'v1' ||
      !ivValue ||
      !tagValue ||
      !encryptedValue ||
      extra.length > 0
    ) {
      throw new BadRequestException('Invalid encrypted identifier');
    }

    try {
      const iv = Buffer.from(ivValue, 'base64url');
      const authTag = Buffer.from(tagValue, 'base64url');
      const encrypted = Buffer.from(encryptedValue, 'base64url');

      if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid encryption data');
      }

      const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv);

      decipher.setAuthTag(authTag);

      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new BadRequestException('Unable to decrypt member identifier');
    }
  }

  hash(value: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException('Identifier cannot be empty');
    }

    return createHmac('sha256', this.hmacKey)
      .update(normalized, 'utf8')
      .digest('hex');
  }
}
