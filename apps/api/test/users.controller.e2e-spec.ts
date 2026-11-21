import {
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UsersController } from '../src/users/users.controller.js';
import { ProfileController } from '../src/users/profile.controller.js';
import { UsersService } from '../src/users/users.service.js';
import { AccessTokenGuard } from '../src/auth/guards/access-token.guard.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';

describe('UsersController & ProfileController (e2e) — AUTH-2, AUTH-4, Profile, Directory, Promotion', () => {
  let app: INestApplication<App>;

  let currentUser = {
    userId: '11111111-1111-4111-8111-111111111111',
    tenantId: '22222222-2222-4222-8222-222222222222',
    role: 'ADMIN',
    sessionId: '33333333-3333-4333-8333-333333333333',
  };

  const usersServiceMock = {
    createLibrarian: vi.fn(),
    getDirectory: vi.fn(),
    getUserById: vi.fn(),
    getOwnProfile: vi.fn(),
    updateOwnProfile: vi.fn(),
    deactivateOwnAccount: vi.fn(),
    promoteLibrarian: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    currentUser = {
      userId: '11111111-1111-4111-8111-111111111111',
      tenantId: '22222222-2222-4222-8222-222222222222',
      role: 'ADMIN',
      sessionId: '33333333-3333-4333-8333-333333333333',
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [UsersController, ProfileController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        Reflector,
        RolesGuard,
      ],
    });

    const moduleFixture = await moduleBuilder
      .overrideGuard(AccessTokenGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          if (!currentUser.userId) {
            throw new UnauthorizedException('Authentication required');
          }
          req.user = currentUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  describe('POST /api/users/librarians (AUTH-4)', () => {
    it('allows ADMIN to create a librarian', async () => {
      currentUser.role = 'ADMIN';

      usersServiceMock.createLibrarian.mockResolvedValue({
        userId: 'new-lib-id',
        fullName: 'New Librarian',
        role: 'LIBRARIAN',
        mustChangePassword: true,
        temporaryPassword: 'temp-password-123',
      });

      await request(app.getHttpServer())
        .post('/api/users/librarians')
        .send({
          fullName: 'New Librarian',
          email: 'lib@example.com',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.role).toBe('LIBRARIAN');
          expect(res.body.mustChangePassword).toBe(true);
        });

      expect(usersServiceMock.createLibrarian).toHaveBeenCalled();
    });

    it('rejects LIBRARIAN or MEMBER from creating a librarian with 403', async () => {
      currentUser.role = 'LIBRARIAN';

      await request(app.getHttpServer())
        .post('/api/users/librarians')
        .send({
          fullName: 'New Librarian',
          email: 'lib@example.com',
        })
        .expect(403);

      expect(usersServiceMock.createLibrarian).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/users (Staff Directory)', () => {
    it('allows ADMIN and LIBRARIAN to list users in tenant', async () => {
      currentUser.role = 'LIBRARIAN';

      usersServiceMock.getDirectory.mockResolvedValue({
        users: [{ id: 'user-1', fullName: 'Alice' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      await request(app.getHttpServer())
        .get('/api/users?page=1&limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toHaveLength(1);
        });

      expect(usersServiceMock.getDirectory).toHaveBeenCalledWith(
        currentUser.tenantId,
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });

    it('rejects MEMBER or TEACHER from listing staff directory with 403', async () => {
      currentUser.role = 'MEMBER';

      await request(app.getHttpServer()).get('/api/users').expect(403);

      expect(usersServiceMock.getDirectory).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/users/:userId/promote (Role Promotion)', () => {
    const targetUserId = '44444444-4444-4444-8444-444444444444';

    it('allows ADMIN to promote a librarian to admin', async () => {
      currentUser.role = 'ADMIN';

      usersServiceMock.promoteLibrarian.mockResolvedValue({
        success: true,
        message: 'Librarian successfully promoted to administrator',
      });

      await request(app.getHttpServer())
        .post(`/api/users/${targetUserId}/promote`)
        .expect(201)
        .expect({
          success: true,
          message: 'Librarian successfully promoted to administrator',
        });

      expect(usersServiceMock.promoteLibrarian).toHaveBeenCalledWith(
        currentUser.tenantId,
        currentUser.userId,
        targetUserId,
      );
    });

    it('rejects LIBRARIAN from promoting anyone with 403', async () => {
      currentUser.role = 'LIBRARIAN';

      await request(app.getHttpServer())
        .post(`/api/users/${targetUserId}/promote`)
        .expect(403);

      expect(usersServiceMock.promoteLibrarian).not.toHaveBeenCalled();
    });
  });

  describe('/api/profile (Own Profile & Deactivation)', () => {
    it('allows authenticated users to view own profile', async () => {
      currentUser.role = 'MEMBER';

      usersServiceMock.getOwnProfile.mockResolvedValue({
        id: currentUser.userId,
        fullName: 'Member Name',
        role: 'MEMBER',
      });

      await request(app.getHttpServer())
        .get('/api/profile')
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(currentUser.userId);
        });

      expect(usersServiceMock.getOwnProfile).toHaveBeenCalledWith(
        currentUser.tenantId,
        currentUser.userId,
      );
    });

    it('allows authenticated users to update own permitted profile fields', async () => {
      currentUser.role = 'MEMBER';

      usersServiceMock.updateOwnProfile.mockResolvedValue({
        id: currentUser.userId,
        fullName: 'Updated Name',
      });

      await request(app.getHttpServer())
        .patch('/api/profile')
        .send({
          fullName: 'Updated Name',
        })
        .expect(200);

      expect(usersServiceMock.updateOwnProfile).toHaveBeenCalledWith(
        currentUser.tenantId,
        currentUser.userId,
        { fullName: 'Updated Name' },
      );
    });

    it('allows user to deactivate own account', async () => {
      currentUser.role = 'MEMBER';

      usersServiceMock.deactivateOwnAccount.mockResolvedValue({
        deactivated: true,
        message: 'Account has been deactivated successfully',
      });

      await request(app.getHttpServer())
        .delete('/api/profile')
        .expect(200)
        .expect({
          deactivated: true,
          message: 'Account has been deactivated successfully',
        });

      expect(usersServiceMock.deactivateOwnAccount).toHaveBeenCalledWith(
        currentUser.tenantId,
        currentUser.userId,
      );
    });
  });
});
