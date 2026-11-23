import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import type {
  PlatformAccessTokenPayload,
  PlatformTempMfaPayload,
} from './dto/platform-auth.dto.js';
import {
  PLATFORM_ACCESS_TOKEN_EXPIRY,
  PLATFORM_TEMP_MFA_EXPIRY,
  PLATFORM_TOKEN_ALGORITHM,
  PLATFORM_TOKEN_AUDIENCE,
  PLATFORM_TOKEN_ISSUER,
} from './constants/platform-auth.constants.js';

@Injectable()
export class PlatformTokenService {
  private readonly platformSecret: Uint8Array;

  constructor() {
    this.platformSecret = this.loadSecret();
  }

  private loadSecret(): Uint8Array {
    const rawSecret =
      process.env.PLATFORM_ACCESS_TOKEN_SECRET ||
      process.env.ACCESS_TOKEN_SECRET;

    if (!rawSecret) {
      if (process.env.NODE_ENV !== 'production') {
        return new Uint8Array(Buffer.from('dGVzdC1wbGF0Zm9ybS1hY2Nlc3MtdG9rZW4tc2VjcmV0LTEyMw==', 'base64'));
      }
      throw new Error('PLATFORM_ACCESS_TOKEN_SECRET or ACCESS_TOKEN_SECRET must be configured');
    }

    const secret = Buffer.from(rawSecret, 'base64');
    if (secret.length !== 32) {
      throw new Error('Signing secret must be a base64-encoded 32-byte secret');
    }

    return new Uint8Array(secret);
  }

  /**
   * Signs a full platform access token once MFA is verified.
   */
  async signPlatformAccessToken(payload: PlatformAccessTokenPayload): Promise<string> {
    return new SignJWT({
      email: payload.email,
      fullName: payload.fullName,
      role: 'PLATFORM_SUPER_ADMIN',
      sessionId: payload.sessionId,
      mfaVerified: true,
    })
      .setProtectedHeader({
        alg: PLATFORM_TOKEN_ALGORITHM,
        typ: 'JWT',
      })
      .setSubject(payload.platformUserId)
      .setIssuer(PLATFORM_TOKEN_ISSUER)
      .setAudience(PLATFORM_TOKEN_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(PLATFORM_ACCESS_TOKEN_EXPIRY)
      .sign(this.platformSecret);
  }

  /**
   * Verifies a platform access token.
   */
  async verifyPlatformAccessToken(token: string): Promise<PlatformAccessTokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.platformSecret, {
        issuer: PLATFORM_TOKEN_ISSUER,
        audience: PLATFORM_TOKEN_AUDIENCE,
        algorithms: [PLATFORM_TOKEN_ALGORITHM],
      });

      if (
        typeof payload.sub !== 'string' ||
        typeof payload.sessionId !== 'string' ||
        payload.role !== 'PLATFORM_SUPER_ADMIN' ||
        payload.mfaVerified !== true
      ) {
        throw new Error('Invalid platform access token claims');
      }

      return {
        platformUserId: payload.sub,
        email: String(payload.email || ''),
        fullName: String(payload.fullName || ''),
        role: 'PLATFORM_SUPER_ADMIN',
        sessionId: payload.sessionId,
        mfaVerified: true,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired platform access token');
    }
  }

  /**
   * Signs a short-lived temp token when password is valid but MFA is still required.
   */
  async signTempMfaToken(payload: PlatformTempMfaPayload): Promise<string> {
    return new SignJWT({
      email: payload.email,
      role: 'PLATFORM_SUPER_ADMIN',
      mfaPending: true,
    })
      .setProtectedHeader({
        alg: PLATFORM_TOKEN_ALGORITHM,
        typ: 'JWT',
      })
      .setSubject(payload.platformUserId)
      .setIssuer(PLATFORM_TOKEN_ISSUER)
      .setAudience(PLATFORM_TOKEN_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(PLATFORM_TEMP_MFA_EXPIRY)
      .sign(this.platformSecret);
  }

  /**
   * Verifies the short-lived temp MFA token.
   */
  async verifyTempMfaToken(token: string): Promise<PlatformTempMfaPayload> {
    try {
      const { payload } = await jwtVerify(token, this.platformSecret, {
        issuer: PLATFORM_TOKEN_ISSUER,
        audience: PLATFORM_TOKEN_AUDIENCE,
        algorithms: [PLATFORM_TOKEN_ALGORITHM],
      });

      if (
        typeof payload.sub !== 'string' ||
        payload.role !== 'PLATFORM_SUPER_ADMIN' ||
        payload.mfaPending !== true
      ) {
        throw new Error('Invalid temporary MFA token');
      }

      return {
        platformUserId: payload.sub,
        email: String(payload.email || ''),
        role: 'PLATFORM_SUPER_ADMIN',
        mfaPending: true,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA session token');
    }
  }
}
