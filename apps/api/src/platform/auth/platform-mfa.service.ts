import { BadRequestException, Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import * as argon2 from 'argon2';
import type { HashOptions } from 'argon2';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const CIPHER_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

@Injectable()
export class PlatformMfaService {
  private readonly encryptionKey: Buffer;

  constructor() {
    this.encryptionKey = this.loadEncryptionKey();
  }

  private loadEncryptionKey(): Buffer {
    const rawKey =
      process.env.PLATFORM_MFA_ENCRYPTION_KEY ||
      process.env.MEMBER_IDENTIFIER_ENCRYPTION_KEY;

    if (!rawKey) {
      // In development/test environments, create a deterministic fallback if not set
      if (process.env.NODE_ENV !== 'production') {
        return Buffer.alloc(32, 'platform_mfa_dev_fallback_key_32');
      }
      throw new Error(
        'PLATFORM_MFA_ENCRYPTION_KEY or MEMBER_IDENTIFIER_ENCRYPTION_KEY is required',
      );
    }

    const key = Buffer.from(rawKey, 'base64');
    if (key.length !== 32) {
      throw new Error('MFA encryption key must be a base64-encoded 32-byte key');
    }
    return key;
  }

  /**
   * Encodes a Buffer into RFC 4648 Base32 string.
   */
  encodeBase32(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
  }

  /**
   * Decodes an RFC 4648 Base32 string back to Buffer.
   */
  decodeBase32(base32Str: string): Buffer {
    const cleanStr = base32Str.toUpperCase().replace(/[\s=-]/g, '');
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < cleanStr.length; i++) {
      const idx = BASE32_ALPHABET.indexOf(cleanStr[i]);
      if (idx === -1) {
        throw new BadRequestException(`Invalid Base32 character: ${cleanStr[i]}`);
      }

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }

  /**
   * Generates a cryptographically random 20-byte Base32 TOTP secret.
   */
  generateTotpSecret(): string {
    const buffer = randomBytes(20);
    return this.encodeBase32(buffer);
  }

  /**
   * Computes an RFC 6238 TOTP token for a given Base32 secret and timestamp.
   */
  generateTotp(secretBase32: string, timestampMs = Date.now()): string {
    const secretBuffer = this.decodeBase32(secretBase32);
    const counter = Math.floor(timestampMs / 1000 / TOTP_STEP_SECONDS);

    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter), 0);

    const hmac = createHmac('sha1', secretBuffer)
      .update(counterBuffer)
      .digest();

    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = binary % 10 ** TOTP_DIGITS;
    return otp.toString().padStart(TOTP_DIGITS, '0');
  }

  /**
   * Validates a candidate TOTP token against a secret with +/- 1 time step tolerance (skew).
   */
  verifyTotp(
    secretBase32: string,
    candidateToken: string,
    timestampMs = Date.now(),
  ): boolean {
    const normalizedCandidate = candidateToken.trim();
    if (!/^\d{6}$/.test(normalizedCandidate)) {
      return false;
    }

    const candidateBuffer = Buffer.from(normalizedCandidate, 'utf8');

    // Test steps: t - 1, t, t + 1 (covering +/- 30 seconds)
    const windowOffsets = [-TOTP_STEP_SECONDS * 1000, 0, TOTP_STEP_SECONDS * 1000];

    for (const offset of windowOffsets) {
      const expectedToken = this.generateTotp(
        secretBase32,
        timestampMs + offset,
      );
      const expectedBuffer = Buffer.from(expectedToken, 'utf8');

      if (
        candidateBuffer.length === expectedBuffer.length &&
        timingSafeEqual(candidateBuffer, expectedBuffer)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Constructs standard Key URI for QR code generation (Google Authenticator, Authy, etc.).
   */
  getOtpAuthUri(email: string, secretBase32: string): string {
    const issuer = 'Commonplace Platform';
    const label = `${issuer}:${email.trim()}`;
    return `otpauth://totp/${encodeURIComponent(label)}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Encrypts the TOTP secret using AES-256-GCM before saving to database.
   */
  encryptSecret(secretBase32: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(CIPHER_ALGORITHM, this.encryptionKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(secretBase32, 'utf8'),
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

  /**
   * Decrypts the stored AES-256-GCM encrypted TOTP secret.
   */
  decryptSecret(encryptedPayload: string): string {
    const [version, ivStr, tagStr, dataStr, ...extra] =
      encryptedPayload.split('.');

    if (
      version !== 'v1' ||
      !ivStr ||
      !tagStr ||
      !dataStr ||
      extra.length > 0
    ) {
      throw new BadRequestException('Invalid encrypted MFA secret format');
    }

    try {
      const iv = Buffer.from(ivStr, 'base64url');
      const authTag = Buffer.from(tagStr, 'base64url');
      const encryptedData = Buffer.from(dataStr, 'base64url');

      if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid IV or auth tag length');
      }

      const decipher = createDecipheriv(
        CIPHER_ALGORITHM,
        this.encryptionKey,
        iv,
      );
      decipher.setAuthTag(authTag);

      return Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new BadRequestException('Failed to decrypt MFA secret');
    }
  }

  /**
   * Generates 8 random emergency recovery codes (e.g., 'A1B2-C3D4-E5F6')
   * and their corresponding Argon2id hashes.
   */
  async generateRecoveryCodes(): Promise<{
    plaintextCodes: string[];
    hashedCodes: string[];
  }> {
    const plaintextCodes: string[] = [];
    const hashPromises: Promise<string>[] = [];

    const argonOptions: HashOptions =
      process.env.NODE_ENV === 'test'
        ? { type: argon2.argon2id, memoryCost: 1024, timeCost: 1 }
        : { type: argon2.argon2id };

    for (let i = 0; i < 8; i++) {
      const raw = randomBytes(6).toString('hex').toUpperCase();
      const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
      plaintextCodes.push(code);
      hashPromises.push(argon2.hash(code, argonOptions));
    }

    const hashedCodes = await Promise.all(hashPromises);
    return { plaintextCodes, hashedCodes };
  }

  /**
   * Verifies an emergency recovery code against an array of stored Argon2id hashes.
   * Returns index of the matching code or -1 if none match.
   */
  async verifyRecoveryCode(
    candidateCode: string,
    hashedCodes: string[],
  ): Promise<number> {
    const normalized = candidateCode.trim().toUpperCase();

    for (let i = 0; i < hashedCodes.length; i++) {
      try {
        const isMatch = await argon2.verify(hashedCodes[i], normalized);
        if (isMatch) {
          return i;
        }
      } catch {
        // Continue to check other hashes
      }
    }

    return -1;
  }
}
