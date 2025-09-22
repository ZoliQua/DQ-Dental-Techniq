import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { prisma, createId } from '../server.js';

// ─── API Key Auth ───────────────────────────────────────────────────

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function verifyApiKey(request: any, reply: any): Promise<boolean> {
  const apiKey = request.headers['x-api-key'] as string;
  if (!apiKey) {
    reply.code(401).send({ error: 'API key required (X-Api-Key header)' });
    return false;
  }

  const keyHash = hashApiKey(apiKey);
  const key = await prisma.apiKey.findUnique({ where: { keyHash } });

  if (!key || !key.isActive) {
    reply.code(401).send({ error: 'Invalid or inactive API key' });
    return false;
  }

  // Update lastUsedAt (best-effort)
  prisma.apiKey.update({
    where: { apiKeyId: key.apiKeyId },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return true;
}

// ─── Work Order Number Generator ────────────────────────────────────

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

// ─── Helper: find or create doctor partner ──────────────────────────

async function findOrCreateDoctor(doctorName: string, clinicName?: string | null): Promise<string> {
  const existing = await prisma.doctorPartner.findFirst({
    where: { doctorName, clinicName: clinicName || null },
    select: { doctorPartnerId: true },
  });
  if (existing) return existing.doctorPartnerId;

  const partner = await prisma.doctorPartner.create({
    data: {
      doctorPartnerId: createId('DP'),
      doctorName,
      clinicName: clinicName || null,
    },
  });
  return partner.doctorPartnerId;
}

// ─── Helper: find or create patient ─────────────────────────────────

async function findOrCreatePatient(
  lastName: string,
  firstName: string,
  birthDate?: string | null,
): Promise<string> {
  const where: any = { lastName, firstName };
  if (birthDate) where.birthDate = birthDate;

  const existing = await prisma.labPatient.findFirst({
    where,
    select: { patientId: true },
  });
  if (existing) return existing.patientId;

  const patient = await prisma.labPatient.create({
    data: {
      patientId: createId('LP'),
      lastName,
      firstName,
      birthDate: birthDate || null,
    },
  });
  return patient.patientId;
}

// ─── Routes ─────────────────────────────────────────────────────────

export async function externalRoutes(app: FastifyInstance) {
  // GET /external/info — lab info (no auth)
  app.get('/info', async () => ({
    labName: process.env.LAB_NAME || 'DQ Dental Techniq',
    apiVersion: '1.0',
    capabilities: ['work_orders', 'status_polling'],
  }));

  // POST /external/work-orders — submit work order from clinic
  app.post('/work-orders', async (request, reply) => {
    if (!(await verifyApiKey(request, reply))) return;

    const body = request.body as any;

    if (!body.externalRef || !body.patientLastName || !body.patientFirstName || !body.doctorName) {
      return reply.code(400).send({ error: 'externalRef, patientLastName, patientFirstName, and doctorName are required' });
    }

    // Check for duplicate
    const existing = await prisma.labWorkOrder.findFirst({
      where: { externalRef: body.externalRef },
      select: { workOrderId: true, workOrderNumber: true },
    });
    if (existing) {
      return reply.code(409).send({
        error: 'Work order with this externalRef already exists',
        workOrderId: existing.workOrderId,
        workOrderNumber: existing.workOrderNumber,
      });
    }

    const doctorPartnerId = await findOrCreateDoctor(body.doctorName, body.clinicName);
    const patientId = await findOrCreatePatient(body.patientLastName, body.patientFirstName, body.patientBirthDate);
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
        patientId,
        doctorPartnerId,
        status: 'sent',
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
        externalRef: body.externalRef,
        sentAt: new Date(),
        items: { create: items },
      },
    });

    return {
      workOrderId: order.workOrderId,
      workOrderNumber: order.workOrderNumber,
      externalRef: order.externalRef,
      status: order.status,
      totalPrice: order.totalPrice,
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  });

  // GET /external/work-orders/:id — get work order status by lab ID
  app.get('/work-orders/:id', async (request, reply) => {
    if (!(await verifyApiKey(request, reply))) return;
    const { id } = request.params as { id: string };

    const order = await prisma.labWorkOrder.findFirst({
      where: {
        OR: [{ workOrderId: id }, { externalRef: id }],
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!order) return reply.code(404).send({ error: 'Not found' });

    return {
      workOrderId: order.workOrderId,
      workOrderNumber: order.workOrderNumber,
      externalRef: order.externalRef,
      status: order.status,
      labNotes: order.labNotes,
      promisedDeadline: order.promisedDeadline?.toISOString() || null,
      totalPrice: order.totalPrice,
      currency: order.currency,
      items: order.items.map((it) => ({
        description: it.description,
        tooth: it.tooth,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  });

  // GET /external/work-orders — list work orders (with optional externalRef filter)
  app.get('/work-orders', async (request, reply) => {
    if (!(await verifyApiKey(request, reply))) return;
    const { since, status } = request.query as { since?: string; status?: string };

    const where: any = { externalRef: { not: null } };
    if (since) where.updatedAt = { gte: new Date(since) };
    if (status) where.status = status;

    const orders = await prisma.labWorkOrder.findMany({
      where,
      select: {
        workOrderId: true,
        workOrderNumber: true,
        externalRef: true,
        status: true,
        labNotes: true,
        promisedDeadline: true,
        totalPrice: true,
        currency: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    return orders.map((o) => ({
      workOrderId: o.workOrderId,
      workOrderNumber: o.workOrderNumber,
      externalRef: o.externalRef,
      status: o.status,
      labNotes: o.labNotes,
      promisedDeadline: o.promisedDeadline?.toISOString() || null,
      totalPrice: o.totalPrice,
      currency: o.currency,
      updatedAt: o.updatedAt.toISOString(),
    }));
  });

  // ─── Admin: API key management ────────────────────────────────────

  // POST /external/api-keys — create new API key (requires session auth, admin only)
  app.post('/api-keys', async (request, reply) => {
    if (!request.currentUser || request.currentUser.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin only' });
    }

    const { name } = request.body as { name: string };
    if (!name) return reply.code(400).send({ error: 'Name required' });

    const rawKey = `dqt_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = hashApiKey(rawKey);

    await prisma.apiKey.create({
      data: {
        apiKeyId: createId('AK'),
        name,
        keyHash,
      },
    });

    // Return raw key only once — it cannot be retrieved later
    return { apiKey: rawKey, name, message: 'Save this key — it cannot be shown again.' };
  });

  // GET /external/api-keys — list API keys (admin only)
  app.get('/api-keys', async (request, reply) => {
    if (!request.currentUser || request.currentUser.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin only' });
    }

    const keys = await prisma.apiKey.findMany({
      select: {
        apiKeyId: true,
        name: true,
        permissions: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return keys;
  });

  // DELETE /external/api-keys/:id — revoke API key (admin only)
  app.delete('/api-keys/:id', async (request, reply) => {
    if (!request.currentUser || request.currentUser.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin only' });
    }

    const { id } = request.params as { id: string };
    try {
      await prisma.apiKey.update({
        where: { apiKeyId: id },
        data: { isActive: false },
      });
      return { success: true };
    } catch {
      return reply.code(404).send({ error: 'Not found' });
    }
  });
}
