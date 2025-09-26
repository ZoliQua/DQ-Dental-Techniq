import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../server.js');

import { prisma } from '../server.js';
import { workOrderRoutes } from '../routes/workOrders.js';
import { buildTestApp, TEST_ADMIN, TEST_TECH, authHeaders } from './helpers.js';

const MOCK_ORDER = {
  workOrderId: 'WO001',
  workOrderNumber: 'ML-2025-0001',
  patientId: 'PT001',
  doctorPartnerId: 'DP001',
  status: 'draft',
  priority: 'normal',
  toothNotation: '14-16',
  shade: 'A2',
  material: 'Zirconia',
  upperImpression: true,
  lowerImpression: false,
  bite: true,
  facebow: false,
  photos: false,
  notes: 'Test order',
  labNotes: null,
  requestedDeadline: null,
  promisedDeadline: null,
  sentAt: null,
  receivedAt: null,
  totalPrice: 50000,
  currency: 'HUF',
  externalRef: null,
  createdByUserId: 'LU001',
  createdAt: new Date('2025-09-01'),
  updatedAt: new Date('2025-09-01'),
  patient: { patientId: 'PT001', lastName: 'Kiss', firstName: 'János' },
  doctorPartner: { doctorPartnerId: 'DP001', doctorName: 'Dr. Nagy' },
  items: [
    { itemId: 'WI001', description: 'Crown', tooth: '14', quantity: 1, unitPrice: 25000, totalPrice: 25000, sortOrder: 0 },
  ],
};

describe('Work Order Routes', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(workOrderRoutes, '/work-orders');
  });

  // ── GET /work-orders ──────────────────────────────────────────────

  describe('GET /work-orders', () => {
    it('should list orders', async () => {
      (prisma.labWorkOrder.findMany as any).mockResolvedValue([MOCK_ORDER]);

      const res = await app.inject({
        method: 'GET',
        url: '/work-orders',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
    });

    it('should filter by status', async () => {
      (prisma.labWorkOrder.findMany as any).mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/work-orders?status=draft',
        headers: authHeaders(TEST_TECH),
      });

      expect(prisma.labWorkOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'draft' }),
        }),
      );
    });

    it('should filter by doctorPartnerId', async () => {
      (prisma.labWorkOrder.findMany as any).mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/work-orders?doctorPartnerId=DP001',
        headers: authHeaders(TEST_TECH),
      });

      expect(prisma.labWorkOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ doctorPartnerId: 'DP001' }),
        }),
      );
    });

    it('should reject unauthenticated', async () => {
      const res = await app.inject({ method: 'GET', url: '/work-orders' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /work-orders/:id ──────────────────────────────────────────

  describe('GET /work-orders/:id', () => {
    it('should return order', async () => {
      (prisma.labWorkOrder.findUnique as any).mockResolvedValue(MOCK_ORDER);

      const res = await app.inject({
        method: 'GET',
        url: '/work-orders/WO001',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().workOrderId).toBe('WO001');
    });

    it('should return 404', async () => {
      (prisma.labWorkOrder.findUnique as any).mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/work-orders/INVALID',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── POST /work-orders ─────────────────────────────────────────────

  describe('POST /work-orders', () => {
    it('should create order with items', async () => {
      (prisma.labWorkOrder.findFirst as any).mockResolvedValue(null);
      (prisma.labWorkOrder.create as any).mockResolvedValue(MOCK_ORDER);

      const res = await app.inject({
        method: 'POST',
        url: '/work-orders',
        payload: {
          patientId: 'PT001',
          doctorPartnerId: 'DP001',
          toothNotation: '14-16',
          shade: 'A2',
          material: 'Zirconia',
          upperImpression: true,
          bite: true,
          items: [{ description: 'Crown', tooth: '14', quantity: 1, unitPrice: 25000 }],
        },
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.labWorkOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'draft',
            items: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ description: 'Crown' }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  // ── PUT /work-orders/:id ──────────────────────────────────────────

  describe('PUT /work-orders/:id', () => {
    it('should update order and replace items', async () => {
      (prisma.labWorkOrderItem.deleteMany as any).mockResolvedValue({ count: 1 });
      (prisma.labWorkOrder.update as any).mockResolvedValue(MOCK_ORDER);

      const res = await app.inject({
        method: 'PUT',
        url: '/work-orders/WO001',
        payload: {
          notes: 'Updated notes',
          items: [{ description: 'Bridge', tooth: '14-16', quantity: 1, unitPrice: 50000 }],
        },
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.labWorkOrderItem.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { workOrderId: 'WO001' } }),
      );
    });

    it('should return 404 for missing order', async () => {
      (prisma.labWorkOrderItem.deleteMany as any).mockResolvedValue({});
      (prisma.labWorkOrder.update as any).mockRejectedValue(new Error('Not found'));

      const res = await app.inject({
        method: 'PUT',
        url: '/work-orders/INVALID',
        payload: { items: [] },
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── PATCH /work-orders/:id/status ─────────────────────────────────

  describe('PATCH /work-orders/:id/status', () => {
    it('should change status', async () => {
      (prisma.labWorkOrder.update as any).mockResolvedValue({ ...MOCK_ORDER, status: 'in_progress' });

      const res = await app.inject({
        method: 'PATCH',
        url: '/work-orders/WO001/status',
        payload: { status: 'in_progress' },
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(200);
    });

    it('should auto-set sentAt when status is sent', async () => {
      (prisma.labWorkOrder.update as any).mockResolvedValue({ ...MOCK_ORDER, status: 'sent' });

      await app.inject({
        method: 'PATCH',
        url: '/work-orders/WO001/status',
        payload: { status: 'sent' },
        headers: authHeaders(TEST_TECH),
      });

      expect(prisma.labWorkOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sentAt: expect.any(Date) }),
        }),
      );
    });

    it('should auto-set receivedAt when delivered', async () => {
      (prisma.labWorkOrder.update as any).mockResolvedValue({ ...MOCK_ORDER, status: 'delivered' });

      await app.inject({
        method: 'PATCH',
        url: '/work-orders/WO001/status',
        payload: { status: 'delivered' },
        headers: authHeaders(TEST_TECH),
      });

      expect(prisma.labWorkOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ receivedAt: expect.any(Date) }),
        }),
      );
    });

    it('should auto-set receivedAt when accepted', async () => {
      (prisma.labWorkOrder.update as any).mockResolvedValue({ ...MOCK_ORDER, status: 'accepted' });

      await app.inject({
        method: 'PATCH',
        url: '/work-orders/WO001/status',
        payload: { status: 'accepted' },
        headers: authHeaders(TEST_TECH),
      });

      expect(prisma.labWorkOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ receivedAt: expect.any(Date) }),
        }),
      );
    });
  });

  // ── DELETE /work-orders/:id ───────────────────────────────────────

  describe('DELETE /work-orders/:id', () => {
    it('should allow admin to delete', async () => {
      (prisma.labWorkOrder.delete as any).mockResolvedValue({});

      const res = await app.inject({
        method: 'DELETE',
        url: '/work-orders/WO001',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
    });

    it('should reject non-admin', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/work-orders/WO001',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for missing order', async () => {
      (prisma.labWorkOrder.delete as any).mockRejectedValue(new Error('Not found'));

      const res = await app.inject({
        method: 'DELETE',
        url: '/work-orders/INVALID',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
