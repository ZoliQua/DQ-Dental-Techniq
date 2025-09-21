import type { FastifyInstance } from 'fastify';
import { prisma, createId, requireRole } from '../server.js';

async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const last = await prisma.labInvoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });

  const seq = last ? parseInt(last.invoiceNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export async function invoiceRoutes(app: FastifyInstance) {
  // GET /invoices
  app.get('/', async (request, reply) => {
    if (!requireRole(request, reply)) return;
    const { status, doctorPartnerId } = request.query as {
      status?: string;
      doctorPartnerId?: string;
    };

    const where: any = {};
    if (status) where.status = status;
    if (doctorPartnerId) where.doctorPartnerId = doctorPartnerId;

    const invoices = await prisma.labInvoice.findMany({
      where,
      include: {
        doctorPartner: true,
        items: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { userId: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return invoices;
  });

  // GET /invoices/:id
  app.get('/:id', async (request, reply) => {
    if (!requireRole(request, reply)) return;
    const { id } = request.params as { id: string };
    const invoice = await prisma.labInvoice.findUnique({
      where: { invoiceId: id },
      include: {
        doctorPartner: true,
        items: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { userId: true, fullName: true } },
      },
    });
    if (!invoice) return reply.code(404).send({ error: 'Not found' });
    return invoice;
  });

  // POST /invoices
  app.post('/', async (request, reply) => {
    if (!requireRole(request, reply, 'admin', 'receptionist')) return;
    const body = request.body as any;
    const invoiceNumber = await nextInvoiceNumber();

    const items = (body.items || []).map((item: any, i: number) => ({
      itemId: createId('II'),
      workOrderId: item.workOrderId || null,
      description: item.description,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice,
      totalPrice: item.unitPrice * (item.quantity || 1),
      sortOrder: i,
    }));

    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.totalPrice,
      0,
    );

    const invoice = await prisma.labInvoice.create({
      data: {
        invoiceId: createId('IV'),
        invoiceNumber,
        doctorPartnerId: body.doctorPartnerId,
        status: 'draft',
        issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        totalAmount,
        currency: body.currency || 'HUF',
        notes: body.notes || null,
        createdByUserId: request.currentUser?.userId,
        items: { create: items },
      },
      include: {
        doctorPartner: true,
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return invoice;
  });

  // PUT /invoices/:id
  app.put('/:id', async (request, reply) => {
    if (!requireRole(request, reply, 'admin', 'receptionist')) return;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    // Delete old items and create new ones
    await prisma.labInvoiceItem.deleteMany({ where: { invoiceId: id } });

    const items = (body.items || []).map((item: any, i: number) => ({
      itemId: createId('II'),
      workOrderId: item.workOrderId || null,
      description: item.description,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice,
      totalPrice: item.unitPrice * (item.quantity || 1),
      sortOrder: i,
    }));

    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.totalPrice,
      0,
    );

    try {
      const invoice = await prisma.labInvoice.update({
        where: { invoiceId: id },
        data: {
          doctorPartnerId: body.doctorPartnerId ?? undefined,
          issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
          dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
          totalAmount,
          currency: body.currency ?? undefined,
          notes: body.notes ?? undefined,
          items: { create: items },
        },
        include: {
          doctorPartner: true,
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });
      return invoice;
    } catch {
      return reply.code(404).send({ error: 'Not found' });
    }
  });

  // PATCH /invoices/:id/status
  app.patch('/:id/status', async (request, reply) => {
    if (!requireRole(request, reply, 'admin', 'receptionist')) return;
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    const updateData: any = { status };
    if (status === 'paid') updateData.paidAt = new Date();

    try {
      const invoice = await prisma.labInvoice.update({
        where: { invoiceId: id },
        data: updateData,
        include: {
          doctorPartner: true,
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });
      return invoice;
    } catch {
      return reply.code(404).send({ error: 'Not found' });
    }
  });

  // DELETE /invoices/:id
  app.delete('/:id', async (request, reply) => {
    if (!requireRole(request, reply, 'admin')) return;
    const { id } = request.params as { id: string };
    try {
      await prisma.labInvoice.delete({ where: { invoiceId: id } });
      return { success: true };
    } catch {
      return reply.code(404).send({ error: 'Not found' });
    }
  });
}
