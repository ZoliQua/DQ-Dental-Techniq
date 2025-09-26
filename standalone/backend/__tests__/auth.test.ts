import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';

vi.mock('../server.js');

import { prisma } from '../server.js';
import { authRoutes } from '../routes/auth.js';
import { buildTestApp, TEST_ADMIN, authHeaders } from './helpers.js';

function hashPasswordSync(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

describe('Auth Routes', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(authRoutes, '/auth');
  });

  // ── POST /auth/login ───────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const passwordHash = hashPasswordSync('password123');
      (prisma.labUser.findUnique as any).mockResolvedValue({
        userId: 'LU001', email: 'test@test.com', fullName: 'Test User',
        passwordHash, role: 'admin', isActive: true,
      });
      (prisma.authSession.create as any).mockResolvedValue({});

      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@test.com', password: 'password123' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.token).toBeDefined();
      expect(body.token).toHaveLength(64); // 32 bytes hex
      expect(body.user.email).toBe('test@test.com');
      expect(body.user.role).toBe('admin');
    });

    it('should reject missing fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@test.com' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should reject invalid email', async () => {
      (prisma.labUser.findUnique as any).mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'wrong@test.com', password: 'password123' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should reject inactive user', async () => {
      (prisma.labUser.findUnique as any).mockResolvedValue({
        userId: 'LU001', email: 'test@test.com', passwordHash: 'x:y', isActive: false,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@test.com', password: 'password123' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should reject wrong password', async () => {
      const passwordHash = hashPasswordSync('correctpassword');
      (prisma.labUser.findUnique as any).mockResolvedValue({
        userId: 'LU001', email: 'test@test.com', passwordHash, role: 'admin', isActive: true,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@test.com', password: 'wrongpassword' },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── POST /auth/register ────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('should create first user as admin with auto-login', async () => {
      (prisma.labUser.count as any).mockResolvedValue(0);
      (prisma.labUser.findUnique as any).mockResolvedValue(null);
      (prisma.labUser.create as any).mockResolvedValue({
        userId: 'LU001', email: 'first@test.com', fullName: 'First User', role: 'admin',
      });
      (prisma.authSession.create as any).mockResolvedValue({});

      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'first@test.com', password: 'password123', fullName: 'First User' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.token).toBeDefined();
      expect(body.user.role).toBe('admin');
    });

    it('should require admin for subsequent users', async () => {
      (prisma.labUser.count as any).mockResolvedValue(1);

      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'second@test.com', password: 'password123', fullName: 'Second User' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should allow admin to create subsequent user', async () => {
      (prisma.labUser.count as any).mockResolvedValue(1);
      (prisma.labUser.findUnique as any).mockResolvedValue(null);
      (prisma.labUser.create as any).mockResolvedValue({
        userId: 'LU002', email: 'second@test.com', fullName: 'Second User', role: 'technician',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'second@test.com', password: 'password123', fullName: 'Second User' },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.user.role).toBe('technician');
      expect(body.token).toBeUndefined();
    });

    it('should reject duplicate email', async () => {
      (prisma.labUser.count as any).mockResolvedValue(0);
      (prisma.labUser.findUnique as any).mockResolvedValue({ userId: 'LU001' });

      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'existing@test.com', password: 'password123', fullName: 'User' },
      });

      expect(res.statusCode).toBe(409);
    });

    it('should reject missing fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'test@test.com' },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── POST /auth/logout ─────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('should logout authenticated user', async () => {
      (prisma.authSession.update as any).mockResolvedValue({});

      const res = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
    });

    it('should reject unauthenticated logout', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/logout',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /auth/me ──────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it('should return current user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().user).toEqual(TEST_ADMIN);
    });

    it('should reject unauthenticated', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
