import type { FastifyInstance } from 'fastify';
import { prisma, createId, requireRole } from '../server.js';

export async function doctorPartnerRoutes(app: FastifyInstance) {
  // GET /doctor-partners
  app.get('/', async (request, reply) => {
    if (!requireRole(request, reply)) return;
    const partners = await prisma.doctorPartner.findMany({
      orderBy: { doctorName: 'asc' },
    });
    return partners;
  });

  // POST /doctor-partners
  app.post('/', async (request, reply) => {
    if (!requireRole(request, reply, 'admin', 'receptionist')) return;
    const body = request.body as any;
    const partner = await prisma.doctorPartner.create({
      data: {
        doctorPartnerId: createId('DP'),
        doctorName: body.doctorName,
        clinicName: body.clinicName || null,
        contactName: body.contactName || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        taxNumber: body.taxNumber || null,
        notes: body.notes || null,
        isActive: body.isActive ?? true,
      },
    });
    return partner;
  });

  // PUT /doctor-partners/:id
  app.put('/:id', async (request, reply) => {
    if (!requireRole(request, reply, 'admin', 'receptionist')) return;
    const { id } = request.params as { id: string };
    const body = request.body as any;
    try {
      const partner = await prisma.doctorPartner.update({
        where: { doctorPartnerId: id },
        data: {
          doctorName: body.doctorName,
          clinicName: body.clinicName ?? undefined,
          contactName: body.contactName ?? undefined,
          phone: body.phone ?? undefined,
          email: body.email ?? undefined,
          address: body.address ?? undefined,
          taxNumber: body.taxNumber ?? undefined,
          notes: body.notes ?? undefined,
          isActive: body.isActive ?? undefined,
        },
      });
      return partner;
    } catch {
      return reply.code(404).send({ error: 'Not found' });
    }
  });

  // DELETE /doctor-partners/:id
  app.delete('/:id', async (request, reply) => {
    if (!requireRole(request, reply, 'admin')) return;
    const { id } = request.params as { id: string };
    try {
      await prisma.doctorPartner.delete({ where: { doctorPartnerId: id } });
      return { success: true };
    } catch {
      return reply.code(404).send({ error: 'Not found' });
    }
  });
}
