import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { prisma, createId, requireRole } from '../server.js';

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      resolve(salt + ':' + derived.toString('hex'));
    });
  });
}

export async function userRoutes(app: FastifyInstance) {
  // GET /users — list all users (admin only)
  app.get('/', async (request, reply) => {
    if (!requireRole(request, reply, 'admin')) return;
    const users = await prisma.labUser.findMany({
      select: {
        userId: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { fullName: 'asc' },
    });
    return users;
  });

  // POST /users — create new user (admin only)
  app.post('/', async (request, reply) => {
    if (!requireRole(request, reply, 'admin')) return;
    const body = request.body as any;

    if (!body.email || !body.password || !body.fullName) {
      return reply.code(400).send({ error: 'Email, password, and fullName required' });
    }

    const existing = await prisma.labUser.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.labUser.create({
      data: {
        userId: createId('LU'),
        email: body.email,
        fullName: body.fullName,
        passwordHash,
        role: body.role || 'technician',
        isActive: body.isActive ?? true,
      },
      select: {
        userId: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    return user;
  });

  // PUT /users/:id — update user (admin only)
  app.put('/:id', async (request, reply) => {
    if (!requireRole(request, reply, 'admin')) return;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const data: any = {};
    if (body.fullName !== undefined) data.fullName = body.fullName;
    if (body.email !== undefined) data.email = body.email;
    if (body.role !== undefined) data.role = body.role;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.password) data.passwordHash = await hashPassword(body.password);

    try {
      const user = await prisma.labUser.update({
        where: { userId: id },
        data,
        select: {
          userId: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });
      return user;
    } catch {
      return reply.code(404).send({ error: 'Not found' });
    }
  });

  // DELETE /users/:id — deactivate user (admin only)
  app.delete('/:id', async (request, reply) => {
    if (!requireRole(request, reply, 'admin')) return;
    const { id } = request.params as { id: string };

    // Don't allow deleting yourself
    if (request.currentUser?.userId === id) {
      return reply.code(400).send({ error: 'Cannot delete your own account' });
    }

    try {
      await prisma.labUser.update({
        where: { userId: id },
        data: { isActive: false },
      });
      // Revoke all active sessions
      await prisma.authSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { success: true };
    } catch {
      return reply.code(404).send({ error: 'Not found' });
    }
  });
}
