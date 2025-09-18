import type { FastifyInstance } from 'fastify';
import { prisma, createId, requireRole } from '../server.js';

export async function patientRoutes(app: FastifyInstance) {
  // GET /patients
  app.get('/', async (request, reply) => {
    if (!requireRole(request, reply)) return;
    const { search } = request.query as { search?: string };

    const where = search
      ? {
          OR: [
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { firstName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const patients = await prisma.labPatient.findMany({
      where,
      orderBy: { lastName: 'asc' },
      take: 100,
    });
    return patients;
  });

  // GET /patients/:id
  app.get('/:id', async (request, reply) => {
    if (!requireRole(request, reply)) return;
    const { id } = request.params as { id: string };
    const patient = await prisma.labPatient.findUnique({
      where: { patientId: id },
      include: {
        workOrders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!patient) return reply.code(404).send({ error: 'Not found' });
    return patient;
  });

  // POST /patients
  app.post('/', async (request, reply) => {
    if (!requireRole(request, reply)) return;
    const body = request.body as any;
    const patient = await prisma.labPatient.create({
      data: {
        patientId: createId('PT'),
        lastName: body.lastName,
        firstName: body.firstName,
        birthDate: body.birthDate || null,
        phone: body.phone || null,
        notes: body.notes || null,
      },
    });
    return patient;
  });

  // PUT /patients/:id
  app.put('/:id', async (request, reply) => {
    if (!requireRole(request, reply)) return;
    const { id } = request.params as { id: string };
    const body = request.body as any;
    try {
      const patient = await prisma.labPatient.update({
        where: { patientId: id },
        data: {
          lastName: body.lastName ?? undefined,
          firstName: body.firstName ?? undefined,
          birthDate: body.birthDate ?? undefined,
          phone: body.phone ?? undefined,
          notes: body.notes ?? undefined,
        },
      });
      return patient;
    } catch {
      return reply.code(404).send({ error: 'Not found' });
    }
  });
}
