import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';

import type {
  AccessTokenPayload,
  AuthRole,
} from './dto/access-token-payload.dto.js';

import type { LibrarySelectionPayload } from './dto/library-selection-payload.dto.js';

import type { LibraryMembershipClaim } from './interfaces/token-payload.interface.js';

import {
  ACCESS_TOKEN_EXPIRY,
  LIBRARY_SELECTION_TOKEN_EXPIRY,
  TOKEN_ALGORITHM,
  TOKEN_AUDIENCE,
  TOKEN_ISSUER,
} from './token.constants.js';

@Injectable()
export class TokenService {
  private readonly accessSecret: Uint8Array;
  private readonly selectionSecret: Uint8Array;

  constructor() {
    this.accessSecret = this.loadSecret('ACCESS_TOKEN_SECRET');

    this.selectionSecret = this.loadSecret('LIBRARY_SELECTION_TOKEN_SECRET');
  }

  /**
   * Loads and validates a 32-byte Base64 signing secret.
   */
  private loadSecret(name: string): Uint8Array {
    const value = process.env[name];

    if (!value) {
      throw new Error(`${name} is not configured`);
    }

    const secret = Buffer.from(value, 'base64');

    if (secret.length !== 32 || secret.toString('base64') !== value) {
      throw new Error(
        `${name} must be valid Base64 encoding of exactly 32 bytes`,
      );
    }

    return secret;
  }

  /**
   * Creates a signed access token for an authenticated session.
   * Access tokens expire after 15 minutes.
   */
  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return new SignJWT({
      tenantId: payload.tenantId,
      role: payload.role,
      sessionId: payload.sessionId,
    })
      .setProtectedHeader({
        alg: TOKEN_ALGORITHM,
        typ: 'JWT',
      })
      .setSubject(payload.userId)
      .setIssuer(TOKEN_ISSUER)
      .setAudience(TOKEN_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_EXPIRY)
      .sign(this.accessSecret);
  }

  /**
   * Verifies an access token's signature, issuer, audience and claims.
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.accessSecret, {
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
        algorithms: [TOKEN_ALGORITHM],
      });

      if (
        typeof payload.sub !== 'string' ||
        typeof payload.tenantId !== 'string' ||
        typeof payload.sessionId !== 'string' ||
        !this.isAuthRole(payload.role)
      ) {
        throw new Error('Invalid access token claims');
      }

      return {
        userId: payload.sub,
        tenantId: payload.tenantId,
        sessionId: payload.sessionId,
        role: payload.role,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Creates a short-lived token containing verified library memberships.
   * It expires after 5 minutes.
   */
  async signLibrarySelectionToken(
    payload: LibrarySelectionPayload,
  ): Promise<string> {
    if (
      !Array.isArray(payload.memberships) ||
      payload.memberships.length === 0 ||
      !payload.memberships.every(
        (membership) =>
          typeof membership.tenantId === 'string' &&
          typeof membership.userId === 'string',
      )
    ) {
      throw new Error('At least one valid library membership is required');
    }

    return new SignJWT({
      memberships: payload.memberships,
    })
      .setProtectedHeader({
        alg: TOKEN_ALGORITHM,
        typ: 'JWT',
      })
      .setIssuer(TOKEN_ISSUER)
      .setAudience(TOKEN_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(LIBRARY_SELECTION_TOKEN_EXPIRY)
      .sign(this.selectionSecret);
  }

  /**
   * Verifies the library-selection token and returns its memberships.
   */
  async verifyLibrarySelectionToken(
    token: string,
  ): Promise<LibrarySelectionPayload> {
    try {
      const { payload } = await jwtVerify(token, this.selectionSecret, {
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
        algorithms: [TOKEN_ALGORITHM],
      });

      const memberships = payload.memberships;

      if (
        !Array.isArray(memberships) ||
        memberships.length === 0 ||
        !memberships.every(
          (membership) =>
            typeof membership === 'object' &&
            membership !== null &&
            !Array.isArray(membership) &&
            typeof membership.tenantId === 'string' &&
            typeof membership.userId === 'string',
        )
      ) {
        throw new Error('Invalid library membership claims');
      }

      return {
        memberships: memberships as LibraryMembershipClaim[],
      };
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired library selection token',
      );
    }
  }

  /**
   * Checks that a role belongs to the supported authentication role set.
   */
  private isAuthRole(value: unknown): value is AuthRole {
    return (
      value === 'ADMIN' ||
      value === 'LIBRARIAN' ||
      value === 'TEACHER' ||
      value === 'MEMBER' ||
      value === 'PARENT'
    );
  }
}
