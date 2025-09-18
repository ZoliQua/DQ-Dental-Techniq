import type { FastifyInstance } from 'fastify';
import { prisma, createId, requireRole } from '../server.js';

async function nextWorkOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ML-${year}-`;

  const last = await prisma.labWorkOrder.findFirst({
    where: { workOrderNumber: { startsWith: prefix } },
    orderBy: { workOrderNumber: 'desc' },
    select: { workOrderNumber: true },
  });

  const seq = last ? parseInt(last.workOrderNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export async function workOrderRoutes(app: FastifyInstance) {
  // GET /work-orders
  app.get('/', async (request, reply) => {
    if (!requireRole(request, reply)) return;
    const { status, doctorPartnerId, patientId } = request.query as {
      status?: string;
      doctorPartnerId?: string;
      patientId?: string;
    };

    const where: any = {};
    if (status) where.status = status;
    if (doctorPartnerId) where.doctorPartnerId = doctorPartnerId;
    if (patientId) where.patientId = patientId;

    const orders = await prisma.labWorkOrder.findMany({
      where,
      include: {
        patient: true,
        doctorPartner: true,
        items: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders;
  });

  // GET /work-orders/:id
  app.get('/:id', async (request, reply) => {
    if (!requireRole(request, reply)) return;
    const { id } = request.params as { id: string };
    const order = await prisma.labWorkOrder.findUnique({
      where: { workOrderId: id },
      include: {
        patient: true,
        doctorPartner: true,
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!order) return reply.code(404).send({ error: 'Not found' });
    return order;
  });

  // POST /work-orders
  app.post('/', async (request, reply) => {
    if (!requireRole(request, reply)) return;
    const body = request.body as any;
    const workOrderNumber = await nextWorkOrderNumber();

    const items = (body.items || []).map((item: any, i: number) => ({
      itemId: createId('WI'),
      description: item.description,
      tooth: item.tooth || null,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice ?? null,
      totalPrice: item.unitPrice != null ? item.unitPrice * (item.quantity || 1) : null,
      sortOrder: i,
    }));

    const totalPrice = items.reduce(
      (sum: number, item: any) => sum + (item.totalPrice || 0),
      0,
    );

    const order = await prisma.labWorkOrder.create({
      data: {
        workOrderId: createId('WO'),
        workOrderNumber,
        patientId: body.patientId,
        doctorPartnerId: body.doctorPartnerId,
        status: 'draft',
        priority: body.priority || 'normal',
        toothNotation: body.toothNotation || null,
        shade: body.shade || null,
        material: body.material || null,
        upperImpression: body.upperImpression ?? false,
        lowerImpression: body.lowerImpression ?? false,
        bite: body.bite ?? false,
        facebow: body.facebow ?? false,
        photos: body.photos ?? false,
        notes: body.notes || null,
        requestedDeadline: body.requestedDeadline ? new Date(body.requestedDeadline) : null,
        totalPrice: totalPrice || null,
        currency: body.currency || 'HUF',
        createdByUserId: request.currentUser?.userId,
        items: { create: items },
      },
      include: {
        patient: true,
        doctorPartner: true,
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return order;
  });

  // PUT /work-orders/:id
  app.put('/:id', async (request, reply) => {
    if (!requireRole(request, reply)) return;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    // Delete old items and create new ones
    await prisma.labWorkOrderItem.deleteMany({ where: { workOrderId: id } });

    const items = (body.items || []).map((item: any, i: number) => ({
      itemId: createId('WI'),
      description: item.description,
      tooth: item.tooth || null,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice ?? null,
      totalPrice: item.unitPrice != null ? item.unitPrice * (item.quantity || 1) : null,
      sortOrder: i,
    }));

    const totalPrice = items.reduce(
      (sum: number, item: any) => sum + (item.totalPrice || 0),
      0,
    );

    try {
      const order = await prisma.labWorkOrder.update({
        where: { workOrderId: id },
        data: {
          patientId: body.patientId ?? undefined,
          doctorPartnerId: body.doctorPartnerId ?? undefined,
          priority: body.priority ?? undefined,
          toothNotation: body.toothNotation ?? undefined,
          shade: body.shade ?? undefined,
          material: body.material ?? undefined,
          upperImpression: body.upperImpression ?? undefined,
          lowerImpression: body.lowerImpression ?? undefined,
          bite: body.bite ?? undefined,
          facebow: body.facebow ?? undefined,
          photos: body.photos ?? undefined,
          notes: body.notes ?? undefined,
          requestedDeadline: body.requestedDeadline ? new Date(body.requestedDeadline) : undefined,
          totalPrice: totalPrice || null,
          currency: body.currency ?? undefined,
          items: { create: items },
        },
        include: {
          patient: true,
          doctorPartner: true,
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });
      return order;
    } catch {
      return reply.code(404).send({ error: 'Not found' });
    }
  });

  // PATCH /work-orders/:id/status
  app.patch('/:id/status', async (request, reply) => {
    if (!requireRole(request, reply)) return;
    const { id } = request.params as { id: string };
    const { status, labNotes, promisedDeadline } = request.body as {
      status: string;
      labNotes?: string;
      promisedDeadline?: string;
    };

    const updateData: any = { status };
    if (labNotes !== undefined) updateData.labNotes = labNotes;
    if (promisedDeadline) updateData.promisedDeadline = new Date(promisedDeadline);

    // Auto-set timestamps based on status
    if (status === 'sent') updateData.sentAt = new Date();
    if (status === 'delivered' || status === 'accepted') updateData.receivedAt = new Date();

    try {
      const order = await prisma.labWorkOrder.update({
        where: { workOrderId: id },
        data: updateData,
        include: {
          patient: true,
          doctorPartner: true,
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });
      return order;
    } catch {
      return reply.code(404).send({ error: 'Not found' });
    }
  });

  // DELETE /work-orders/:id
  app.delete('/:id', async (request, reply) => {
    if (!requireRole(request, reply, 'admin')) return;
    const { id } = request.params as { id: string };
    try {
      await prisma.labWorkOrder.delete({ where: { workOrderId: id } });
      return { success: true };
    } catch {
      return reply.code(404).send({ error: 'Not found' });
    }
  });
}
