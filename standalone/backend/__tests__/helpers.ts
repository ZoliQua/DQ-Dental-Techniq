import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

export const TEST_ADMIN = {
  userId: 'LUadmin1',
  email: 'admin@test.com',
  fullName: 'Admin User',
  role: 'admin',
};

export const TEST_TECH = {
  userId: 'LUtech1',
  email: 'tech@test.com',
  fullName: 'Tech User',
  role: 'technician',
};

export const TEST_RECEP = {
  userId: 'LUrecep1',
  email: 'recep@test.com',
  fullName: 'Receptionist User',
  role: 'receptionist',
};

export async function buildTestApp(
  plugin: (app: FastifyInstance) => Promise<void>,
  prefix: string,
): Promise<FastifyInstance> {
  const app = Fastify();

  app.decorateRequest('currentUser', undefined);
  app.decorateRequest('sessionId', undefined);

  app.addHook('preHandler', async (request) => {
    const testUser = request.headers['x-test-user'] as string;
    if (testUser) {
      try {
        request.currentUser = JSON.parse(testUser);
        request.sessionId = 'test-session-id';
      } catch {
        // ignore parse errors
      }
    }
  });

  await app.register(plugin, { prefix });
  return app;
}

export function authHeaders(user: typeof TEST_ADMIN): Record<string, string> {
  return { 'x-test-user': JSON.stringify(user) };
}
