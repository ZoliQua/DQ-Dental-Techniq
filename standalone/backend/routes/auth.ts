import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { prisma, createId } from '../server.js';

// ─── Password hashing (scrypt, same pattern as main project) ──────

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      resolve(salt + ':' + derived.toString('hex'));
    });
  });
}

function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(key, 'hex'), derived));
    });
  });
}

function createToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const SESSION_TTL_DAYS = parseInt(process.env.AUTH_SESSION_TTL_DAYS || '14', 10);

// ─── Routes ────────────────────────────────────────────────────────

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login
  app.post('/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password required' });
    }

    const user = await prisma.labUser.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const token = createToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    await prisma.authSession.create({
      data: {
        sessionId: createId('LS'),
        tokenHash: hashToken(token),
        userId: user.userId,
        expiresAt,
        userAgent: request.headers['user-agent'] || null,
        ipAddress: request.ip,
      },
    });

    return {
      token,
      user: {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  });

  // POST /auth/register (admin only, or first user)
  app.post('/register', async (request, reply) => {
    const { email, password, fullName, role } = request.body as {
      email: string;
      password: string;
      fullName: string;
      role?: string;
    };

    if (!email || !password || !fullName) {
      return reply.code(400).send({ error: 'Email, password, and fullName required' });
    }

    // Check if this is the first user (auto-admin)
    const userCount = await prisma.labUser.count();
    const isFirstUser = userCount === 0;

    // If not first user, require admin auth
    if (!isFirstUser) {
      if (!request.currentUser || request.currentUser.role !== 'admin') {
        return reply.code(403).send({ error: 'Only admins can create users' });
      }
    }

    const existing = await prisma.labUser.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.labUser.create({
      data: {
        userId: createId('LU'),
        email,
        fullName,
        passwordHash,
        role: isFirstUser ? 'admin' : (role as any) || 'technician',
      },
    });

    // Auto-login for first user
    if (isFirstUser) {
      const token = createToken();
      const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

      await prisma.authSession.create({
        data: {
          sessionId: createId('LS'),
          tokenHash: hashToken(token),
          userId: user.userId,
          expiresAt,
          userAgent: request.headers['user-agent'] || null,
          ipAddress: request.ip,
        },
      });

      return {
        token,
        user: {
          userId: user.userId,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      };
    }

    return {
      user: {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  });

  // POST /auth/logout
  app.post('/logout', async (request, reply) => {
    if (!request.sessionId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    await prisma.authSession.update({
      where: { sessionId: request.sessionId },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  });

  // GET /auth/me
  app.get('/me', async (request, reply) => {
    if (!request.currentUser) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    return { user: request.currentUser };
  });
}
