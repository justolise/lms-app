import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export type IdentityType = 'EMAIL' | 'PHONE';

@Injectable()
export class IdentityService {
  private readonly hmacKey: Buffer;

  constructor() {
    const secret = process.env.IDENTITY_LOOKUP_HMAC_KEY;

    if (!secret) {
      throw new Error('IDENTITY_LOOKUP_HMAC_KEY is not configured');
    }

    try {
      this.hmacKey = Buffer.from(secret, 'base64');
    } catch {
      throw new Error('IDENTITY_LOOKUP_HMAC_KEY must be valid base64');
    }

    if (this.hmacKey.length !== 32) {
      throw new Error(
        'IDENTITY_LOOKUP_HMAC_KEY must decode to exactly 32 bytes',
      );
    }
  }

  normalizeEmail(email: string): string {
    const normalized = email.trim().toLowerCase();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalized)) {
      throw new BadRequestException('Invalid email address');
    }

    return normalized;
  }

  normalizePhone(phone: string): string {
    const parsed = parsePhoneNumberFromString(phone, 'KE');

    if (!parsed || !parsed.isValid()) {
      throw new BadRequestException('Invalid phone number');
    }

    return parsed.number;
  }

  hashIdentity(type: IdentityType, value: string): string {
    let normalized: string;

    switch (type) {
      case 'EMAIL':
        normalized = this.normalizeEmail(value);
        break;

      case 'PHONE':
        normalized = this.normalizePhone(value);
        break;

      default:
        throw new BadRequestException('Unsupported identity type');
    }

    return createHmac('sha256', this.hmacKey)
      .update(normalized, 'utf8')
      .digest('hex');
  }
}
