import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RolesGuard } from './roles.guard.js';
import { ROLES_KEY } from '../constants/app.constants.js';
import type { AccessTokenPayload } from '../../auth/token/dto/access-token-payload.dto.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const handler = vi.fn();
  const controller = vi.fn();

  const librarianUser: AccessTokenPayload = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    role: 'LIBRARIAN',
    sessionId: 'session-1',
  };

  const memberUser: AccessTokenPayload = {
    userId: 'user-2',
    tenantId: 'tenant-1',
    role: 'MEMBER',
    sessionId: 'session-2',
  };

  let getAllAndOverride: ReturnType<typeof vi.fn>;

  const createContext = (user?: AccessTokenPayload) =>
    ({
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as any;

  beforeEach(() => {
    getAllAndOverride = vi.fn();

    reflector = {
      getAllAndOverride,
    } as unknown as Reflector;

    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles are required', () => {
    getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows a user with an authorised role', () => {
    getAllAndOverride.mockReturnValue(['LIBRARIAN']);

    expect(guard.canActivate(createContext(librarianUser))).toBe(true);
  });

  it('rejects a user with an unauthorised role', () => {
    getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(() => guard.canActivate(createContext(memberUser))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects requests without an authenticated user', () => {
    getAllAndOverride.mockReturnValue(['LIBRARIAN']);

    expect(() => guard.canActivate(createContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('checks role metadata on the handler and controller', () => {
    getAllAndOverride.mockReturnValue(undefined);

    guard.canActivate(createContext());

    expect(getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      handler,
      controller,
    ]);
  });
});
