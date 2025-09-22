import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import { authRoutes } from './routes/auth.js';
import { doctorPartnerRoutes } from './routes/doctorPartners.js';
import { patientRoutes } from './routes/patients.js';
import { workOrderRoutes } from './routes/workOrders.js';
import { invoiceRoutes } from './routes/invoices.js';
import { reportRoutes } from './routes/reports.js';
import { userRoutes } from './routes/users.js';
import { externalRoutes } from './routes/external.js';

// ─── Prisma ────────────────────────────────────────────────────────

export const prisma = new PrismaClient();

// ─── Fastify Setup ─────────────────────────────────────────────────

const app = Fastify({ logger: true, trustProxy: true });

await app.register(cors, { origin: true, credentials: true });

// ─── Auth types ────────────────────────────────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: {
      userId: string;
      email: string;
      fullName: string;
      role: string;
    };
    sessionId?: string;
  }
}

// ─── Helper functions ──────────────────────────────────────────────

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const SESSION_TTL_DAYS = parseInt(process.env.AUTH_SESSION_TTL_DAYS || '14', 10);

export function createId(prefix: string): string {
  return prefix + crypto.randomBytes(8).toString('hex');
}

// ─── Auth Middleware ───────────────────────────────────────────────

const PUBLIC_ROUTES = ['/health', '/auth/login', '/auth/register'];

app.decorateRequest('currentUser', undefined);
app.decorateRequest('sessionId', undefined);

app.addHook('preHandler', async (request, reply) => {
  const url = request.url.split('?')[0];
  if (PUBLIC_ROUTES.some((r) => url === r || url.startsWith(r + '/'))) return;

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  const tokenHash = hashToken(token);

  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return reply.code(401).send({ error: 'Session expired' });
  }

  if (!session.user.isActive) {
    return reply.code(403).send({ error: 'Account disabled' });
  }

  request.currentUser = {
    userId: session.user.userId,
    email: session.user.email,
    fullName: session.user.fullName,
    role: session.user.role,
  };
  request.sessionId = session.sessionId;

  // Update lastSeenAt (best-effort)
  prisma.authSession.update({
    where: { sessionId: session.sessionId },
    data: { lastSeenAt: new Date() },
  }).catch(() => {});
});

// ─── Permission helper ─────────────────────────────────────────────

export function requireRole(request: any, reply: any, ...roles: string[]) {
  if (!request.currentUser) {
    reply.code(401).send({ error: 'Unauthorized' });
    return false;
  }
  if (roles.length > 0 && !roles.includes(request.currentUser.role)) {
    reply.code(403).send({ error: 'Forbidden' });
    return false;
  }
  return true;
}

// ─── Routes ────────────────────────────────────────────────────────

await app.register(authRoutes, { prefix: '/auth' });
await app.register(doctorPartnerRoutes, { prefix: '/doctor-partners' });
await app.register(patientRoutes, { prefix: '/patients' });
await app.register(workOrderRoutes, { prefix: '/work-orders' });
await app.register(invoiceRoutes, { prefix: '/invoices' });
await app.register(reportRoutes, { prefix: '/reports' });
await app.register(userRoutes, { prefix: '/users' });
await app.register(externalRoutes, { prefix: '/external' });

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Start ─────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '4001', 10);

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`DQ-Dental-Techniq standalone server running on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
