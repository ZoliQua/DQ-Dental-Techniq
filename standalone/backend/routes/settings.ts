import type { FastifyInstance } from 'fastify';
import { prisma, requireRole } from '../server.js';

export async function settingsRoutes(app: FastifyInstance) {
  // GET /settings/lab — get lab settings
  app.get('/lab', async (request, reply) => {
    if (!requireRole(request, reply, 'admin')) return;

    let settings = await prisma.labSettings.findUnique({ where: { id: 1 } });
    if (!settings) {
      settings = await prisma.labSettings.create({
        data: { id: 1 },
      });
    }
    return settings;
  });

  // PUT /settings/lab — update lab settings
  app.put('/lab', async (request, reply) => {
    if (!requireRole(request, reply, 'admin')) return;
    const body = request.body as any;

    const settings = await prisma.labSettings.upsert({
      where: { id: 1 },
      update: {
        labName: body.labName ?? undefined,
        address: body.address ?? undefined,
        phone: body.phone ?? undefined,
        email: body.email ?? undefined,
        taxNumber: body.taxNumber ?? undefined,
        bankAccount: body.bankAccount ?? undefined,
        notes: body.notes ?? undefined,
      },
      create: {
        id: 1,
        labName: body.labName || 'DQ Dental Techniq',
        address: body.address || null,
        phone: body.phone || null,
        email: body.email || null,
        taxNumber: body.taxNumber || null,
        bankAccount: body.bankAccount || null,
        notes: body.notes || null,
      },
    });

    return settings;
  });
}
