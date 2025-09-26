import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';

vi.mock('../server.js');

import { prisma } from '../server.js';
import { externalRoutes } from '../routes/external.js';
import { buildTestApp, TEST_ADMIN, TEST_TECH, authHeaders } from './helpers.js';

const TEST_API_KEY = 'dqt_testapikey123456';
const TEST_KEY_HASH = crypto.createHash('sha256').update(TEST_API_KEY).digest('hex');

const MOCK_API_KEY_RECORD = {
  apiKeyId: 'AK001',
  name: 'Test Key',
  keyHash: TEST_KEY_HASH,
  permissions: 'work_orders',
  isActive: true,
  lastUsedAt: null,
  createdAt: new Date('2025-09-01'),
};

function apiKeyHeaders() {
  return { 'x-api-key': TEST_API_KEY };
}

describe('External Routes', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(externalRoutes, '/external');
    // Default: valid API key lookup
    (prisma.apiKey.findUnique as any).mockResolvedValue(MOCK_API_KEY_RECORD);
    // Fire-and-forget update needs to return thenable
    (prisma.apiKey.update as any).mockReturnValue({ catch: () => {} });
  });

  // ── GET /external/info ────────────────────────────────────────────

  describe('GET /external/info', () => {
    it('should return lab info without auth', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/external/info',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().apiVersion).toBe('1.0');
      expect(res.json().capabilities).toContain('work_orders');
    });
  });

  // ── POST /external/work-orders ────────────────────────────────────

  describe('POST /external/work-orders', () => {
    it('should submit work order with valid API key', async () => {
      (prisma.labWorkOrder.findFirst as any)
        .mockResolvedValueOnce(null) // duplicate check
        .mockResolvedValueOnce(null); // nextWorkOrderNumber
      (prisma.doctorPartner.findFirst as any).mockResolvedValue({ doctorPartnerId: 'DP001' });
      (prisma.labPatient.findFirst as any).mockResolvedValue({ patientId: 'PT001' });
      (prisma.labWorkOrder.create as any).mockResolvedValue({
        workOrderId: 'WO001',
        workOrderNumber: 'ML-2025-0001',
        externalRef: 'EXT-001',
        status: 'sent',
        totalPrice: 50000,
        currency: 'HUF',
        createdAt: new Date('2025-09-01'),
        updatedAt: new Date('2025-09-01'),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/external/work-orders',
        payload: {
          externalRef: 'EXT-001',
          doctorName: 'Dr. Nagy',
          patientLastName: 'Kiss',
          patientFirstName: 'János',
          items: [{ description: 'Crown', unitPrice: 50000 }],
        },
        headers: apiKeyHeaders(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().workOrderId).toBe('WO001');
      expect(res.json().externalRef).toBe('EXT-001');
    });

    it('should auto-create doctor partner if not found', async () => {
      (prisma.labWorkOrder.findFirst as any).mockResolvedValue(null);
      (prisma.doctorPartner.findFirst as any).mockResolvedValue(null);
      (prisma.doctorPartner.create as any).mockResolvedValue({ doctorPartnerId: 'DPnew' });
      (prisma.labPatient.findFirst as any).mockResolvedValue({ patientId: 'PT001' });
      (prisma.labWorkOrder.create as any).mockResolvedValue({
        workOrderId: 'WO001', workOrderNumber: 'ML-2025-0001',
        externalRef: 'EXT-002', status: 'sent', totalPrice: null, currency: 'HUF',
        createdAt: new Date(), updatedAt: new Date(),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/external/work-orders',
        payload: {
          externalRef: 'EXT-002',
          doctorName: 'Dr. New',
          clinicName: 'New Clinic',
          patientLastName: 'Kiss',
          patientFirstName: 'Anna',
        },
        headers: apiKeyHeaders(),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.doctorPartner.create).toHaveBeenCalled();
    });

    it('should reject missing required fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/external/work-orders',
        payload: { externalRef: 'EXT-001' },
        headers: apiKeyHeaders(),
      });

      expect(res.statusCode).toBe(400);
    });

    it('should reject duplicate externalRef', async () => {
      (prisma.labWorkOrder.findFirst as any).mockResolvedValue({
        workOrderId: 'WO001',
        workOrderNumber: 'ML-2025-0001',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/external/work-orders',
        payload: {
          externalRef: 'EXT-001',
          doctorName: 'Dr. Nagy',
          patientLastName: 'Kiss',
          patientFirstName: 'János',
        },
        headers: apiKeyHeaders(),
      });

      expect(res.statusCode).toBe(409);
    });

    it('should reject without API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/external/work-orders',
        payload: {
          externalRef: 'EXT-001',
          doctorName: 'Dr. Nagy',
          patientLastName: 'Kiss',
          patientFirstName: 'János',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should reject invalid API key', async () => {
      (prisma.apiKey.findUnique as any).mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/external/work-orders',
        payload: {
          externalRef: 'EXT-001',
          doctorName: 'Dr. Nagy',
          patientLastName: 'Kiss',
          patientFirstName: 'János',
        },
        headers: { 'x-api-key': 'invalid-key' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should reject inactive API key', async () => {
      (prisma.apiKey.findUnique as any).mockResolvedValue({
        ...MOCK_API_KEY_RECORD,
        isActive: false,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/external/work-orders',
        payload: {
          externalRef: 'EXT-001',
          doctorName: 'Dr. Nagy',
          patientLastName: 'Kiss',
          patientFirstName: 'János',
        },
        headers: apiKeyHeaders(),
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /external/work-orders/:id ─────────────────────────────────

  describe('GET /external/work-orders/:id', () => {
    const mockOrder = {
      workOrderId: 'WO001',
      workOrderNumber: 'ML-2025-0001',
      externalRef: 'EXT-001',
      status: 'in_progress',
      labNotes: null,
      promisedDeadline: null,
      totalPrice: 50000,
      currency: 'HUF',
      items: [{ description: 'Crown', tooth: '14', quantity: 1, unitPrice: 50000, totalPrice: 50000 }],
      createdAt: new Date('2025-09-01'),
      updatedAt: new Date('2025-09-01'),
    };

    it('should return order by ID', async () => {
      (prisma.labWorkOrder.findFirst as any).mockResolvedValue(mockOrder);

      const res = await app.inject({
        method: 'GET',
        url: '/external/work-orders/WO001',
        headers: apiKeyHeaders(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('in_progress');
      expect(res.json().items).toHaveLength(1);
    });

    it('should find by externalRef', async () => {
      (prisma.labWorkOrder.findFirst as any).mockResolvedValue(mockOrder);

      await app.inject({
        method: 'GET',
        url: '/external/work-orders/EXT-001',
        headers: apiKeyHeaders(),
      });

      expect(prisma.labWorkOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ workOrderId: 'EXT-001' }, { externalRef: 'EXT-001' }],
          },
        }),
      );
    });

    it('should return 404 for missing order', async () => {
      (prisma.labWorkOrder.findFirst as any).mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/external/work-orders/INVALID',
        headers: apiKeyHeaders(),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── GET /external/work-orders ─────────────────────────────────────

  describe('GET /external/work-orders', () => {
    it('should list external orders', async () => {
      (prisma.labWorkOrder.findMany as any).mockResolvedValue([{
        workOrderId: 'WO001',
        workOrderNumber: 'ML-2025-0001',
        externalRef: 'EXT-001',
        status: 'sent',
        labNotes: null,
        promisedDeadline: null,
        totalPrice: 50000,
        currency: 'HUF',
        updatedAt: new Date('2025-09-01'),
      }]);

      const res = await app.inject({
        method: 'GET',
        url: '/external/work-orders',
        headers: apiKeyHeaders(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
    });

    it('should filter by status', async () => {
      (prisma.labWorkOrder.findMany as any).mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/external/work-orders?status=in_progress',
        headers: apiKeyHeaders(),
      });

      expect(prisma.labWorkOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'in_progress' }),
        }),
      );
    });

    it('should filter by since date', async () => {
      (prisma.labWorkOrder.findMany as any).mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/external/work-orders?since=2025-09-01',
        headers: apiKeyHeaders(),
      });

      expect(prisma.labWorkOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            updatedAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
    });
  });

  // ── POST /external/api-keys ───────────────────────────────────────

  describe('POST /external/api-keys', () => {
    it('should allow admin to create API key', async () => {
      (prisma.apiKey.create as any).mockResolvedValue({});

      const res = await app.inject({
        method: 'POST',
        url: '/external/api-keys',
        payload: { name: 'New Key' },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().apiKey).toBeDefined();
      expect(res.json().apiKey).toMatch(/^dqt_/);
      expect(res.json().name).toBe('New Key');
    });

    it('should reject non-admin', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/external/api-keys',
        payload: { name: 'New Key' },
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });

    it('should reject missing name', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/external/api-keys',
        payload: {},
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── GET /external/api-keys ────────────────────────────────────────

  describe('GET /external/api-keys', () => {
    it('should list API keys for admin', async () => {
      (prisma.apiKey.findMany as any).mockResolvedValue([{
        apiKeyId: 'AK001',
        name: 'Test Key',
        permissions: 'work_orders',
        isActive: true,
        lastUsedAt: null,
        createdAt: new Date('2025-09-01'),
      }]);

      const res = await app.inject({
        method: 'GET',
        url: '/external/api-keys',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
    });

    it('should reject non-admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/external/api-keys',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── DELETE /external/api-keys/:id ─────────────────────────────────

  describe('DELETE /external/api-keys/:id', () => {
    it('should revoke API key for admin', async () => {
      (prisma.apiKey.update as any).mockResolvedValue({});

      const res = await app.inject({
        method: 'DELETE',
        url: '/external/api-keys/AK001',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: false },
        }),
      );
    });

    it('should reject non-admin', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/external/api-keys/AK001',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for missing key', async () => {
      (prisma.apiKey.update as any).mockRejectedValue(new Error('Not found'));

      const res = await app.inject({
        method: 'DELETE',
        url: '/external/api-keys/INVALID',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
