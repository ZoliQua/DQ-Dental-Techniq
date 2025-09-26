import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../server.js');

import { prisma } from '../server.js';
import { userRoutes } from '../routes/users.js';
import { buildTestApp, TEST_ADMIN, TEST_TECH, authHeaders } from './helpers.js';

const MOCK_USER = {
  userId: 'LU002',
  email: 'tech@test.com',
  fullName: 'Tech User',
  role: 'technician',
  isActive: true,
  createdAt: new Date('2025-09-01'),
};

describe('User Routes', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(userRoutes, '/users');
  });

  // ── GET /users ────────────────────────────────────────────────────

  describe('GET /users', () => {
    it('should list users for admin', async () => {
      (prisma.labUser.findMany as any).mockResolvedValue([MOCK_USER]);

      const res = await app.inject({
        method: 'GET',
        url: '/users',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
    });

    it('should reject non-admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/users',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });

    it('should reject unauthenticated', async () => {
      const res = await app.inject({ method: 'GET', url: '/users' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── POST /users ───────────────────────────────────────────────────

  describe('POST /users', () => {
    it('should create user', async () => {
      (prisma.labUser.findUnique as any).mockResolvedValue(null);
      (prisma.labUser.create as any).mockResolvedValue(MOCK_USER);

      const res = await app.inject({
        method: 'POST',
        url: '/users',
        payload: { email: 'new@test.com', password: 'password123', fullName: 'New User' },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.labUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@test.com',
            fullName: 'New User',
            passwordHash: expect.any(String),
          }),
        }),
      );
    });

    it('should reject duplicate email', async () => {
      (prisma.labUser.findUnique as any).mockResolvedValue(MOCK_USER);

      const res = await app.inject({
        method: 'POST',
        url: '/users',
        payload: { email: 'tech@test.com', password: 'password123', fullName: 'Dup User' },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(409);
    });

    it('should reject missing fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/users',
        payload: { email: 'test@test.com' },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(400);
    });

    it('should reject non-admin', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/users',
        payload: { email: 'new@test.com', password: 'pass', fullName: 'Test' },
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── PUT /users/:id ────────────────────────────────────────────────

  describe('PUT /users/:id', () => {
    it('should update user', async () => {
      (prisma.labUser.update as any).mockResolvedValue({
        ...MOCK_USER,
        fullName: 'Updated Name',
      });

      const res = await app.inject({
        method: 'PUT',
        url: '/users/LU002',
        payload: { fullName: 'Updated Name' },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
    });

    it('should update password', async () => {
      (prisma.labUser.update as any).mockResolvedValue(MOCK_USER);

      await app.inject({
        method: 'PUT',
        url: '/users/LU002',
        payload: { password: 'newpassword123' },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(prisma.labUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: expect.any(String),
          }),
        }),
      );
    });

    it('should return 404 for missing user', async () => {
      (prisma.labUser.update as any).mockRejectedValue(new Error('Not found'));

      const res = await app.inject({
        method: 'PUT',
        url: '/users/INVALID',
        payload: { fullName: 'Test' },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── DELETE /users/:id ─────────────────────────────────────────────

  describe('DELETE /users/:id', () => {
    it('should deactivate user and revoke sessions', async () => {
      (prisma.labUser.update as any).mockResolvedValue({});
      (prisma.authSession.updateMany as any).mockResolvedValue({ count: 2 });

      const res = await app.inject({
        method: 'DELETE',
        url: '/users/LU002',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.labUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'LU002' },
          data: { isActive: false },
        }),
      );
      expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'LU002', revokedAt: null },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });

    it('should prevent self-deletion', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/users/LUadmin1', // Same as TEST_ADMIN.userId
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain('own account');
    });

    it('should reject non-admin', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/users/LU002',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for missing user', async () => {
      (prisma.labUser.update as any).mockRejectedValue(new Error('Not found'));

      const res = await app.inject({
        method: 'DELETE',
        url: '/users/INVALID',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
