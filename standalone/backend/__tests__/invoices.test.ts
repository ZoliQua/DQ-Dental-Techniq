import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../server.js');

import { prisma } from '../server.js';
import { invoiceRoutes } from '../routes/invoices.js';
import { buildTestApp, TEST_ADMIN, TEST_TECH, TEST_RECEP, authHeaders } from './helpers.js';

const MOCK_INVOICE = {
  invoiceId: 'IV001',
  invoiceNumber: 'INV-2025-0001',
  doctorPartnerId: 'DP001',
  status: 'draft',
  issueDate: new Date('2025-09-01'),
  dueDate: null,
  paidAt: null,
  totalAmount: 50000,
  currency: 'HUF',
  notes: null,
  createdByUserId: 'LU001',
  createdAt: new Date('2025-09-01'),
  updatedAt: new Date('2025-09-01'),
  doctorPartner: { doctorPartnerId: 'DP001', doctorName: 'Dr. Nagy' },
  items: [
    { itemId: 'II001', description: 'Crown', quantity: 1, unitPrice: 50000, totalPrice: 50000, sortOrder: 0 },
  ],
  createdBy: { userId: 'LU001', fullName: 'Admin' },
};

describe('Invoice Routes', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(invoiceRoutes, '/invoices');
  });

  // ── GET /invoices ─────────────────────────────────────────────────

  describe('GET /invoices', () => {
    it('should list invoices', async () => {
      (prisma.labInvoice.findMany as any).mockResolvedValue([MOCK_INVOICE]);

      const res = await app.inject({
        method: 'GET',
        url: '/invoices',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
    });

    it('should filter by status', async () => {
      (prisma.labInvoice.findMany as any).mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/invoices?status=paid',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(prisma.labInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'paid' }),
        }),
      );
    });

    it('should filter by doctorPartnerId', async () => {
      (prisma.labInvoice.findMany as any).mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/invoices?doctorPartnerId=DP001',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(prisma.labInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ doctorPartnerId: 'DP001' }),
        }),
      );
    });

    it('should reject unauthenticated', async () => {
      const res = await app.inject({ method: 'GET', url: '/invoices' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /invoices/:id ─────────────────────────────────────────────

  describe('GET /invoices/:id', () => {
    it('should return invoice', async () => {
      (prisma.labInvoice.findUnique as any).mockResolvedValue(MOCK_INVOICE);

      const res = await app.inject({
        method: 'GET',
        url: '/invoices/IV001',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
    });

    it('should return 404', async () => {
      (prisma.labInvoice.findUnique as any).mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/invoices/INVALID',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── POST /invoices ────────────────────────────────────────────────

  describe('POST /invoices', () => {
    it('should allow admin to create', async () => {
      (prisma.labInvoice.findFirst as any).mockResolvedValue(null);
      (prisma.labInvoice.create as any).mockResolvedValue(MOCK_INVOICE);

      const res = await app.inject({
        method: 'POST',
        url: '/invoices',
        payload: {
          doctorPartnerId: 'DP001',
          items: [{ description: 'Crown', unitPrice: 50000, quantity: 1 }],
        },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.labInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'draft',
            totalAmount: 50000,
          }),
        }),
      );
    });

    it('should allow receptionist to create', async () => {
      (prisma.labInvoice.findFirst as any).mockResolvedValue(null);
      (prisma.labInvoice.create as any).mockResolvedValue(MOCK_INVOICE);

      const res = await app.inject({
        method: 'POST',
        url: '/invoices',
        payload: {
          doctorPartnerId: 'DP001',
          items: [{ description: 'Crown', unitPrice: 50000, quantity: 1 }],
        },
        headers: authHeaders(TEST_RECEP),
      });

      expect(res.statusCode).toBe(200);
    });

    it('should reject technician', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/invoices',
        payload: { doctorPartnerId: 'DP001', items: [] },
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── PUT /invoices/:id ─────────────────────────────────────────────

  describe('PUT /invoices/:id', () => {
    it('should update invoice and replace items', async () => {
      (prisma.labInvoiceItem.deleteMany as any).mockResolvedValue({ count: 1 });
      (prisma.labInvoice.update as any).mockResolvedValue(MOCK_INVOICE);

      const res = await app.inject({
        method: 'PUT',
        url: '/invoices/IV001',
        payload: {
          doctorPartnerId: 'DP001',
          items: [{ description: 'Bridge', unitPrice: 80000, quantity: 1 }],
        },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.labInvoiceItem.deleteMany).toHaveBeenCalled();
    });

    it('should return 404 for missing invoice', async () => {
      (prisma.labInvoiceItem.deleteMany as any).mockResolvedValue({});
      (prisma.labInvoice.update as any).mockRejectedValue(new Error('Not found'));

      const res = await app.inject({
        method: 'PUT',
        url: '/invoices/INVALID',
        payload: { items: [{ description: 'X', unitPrice: 1000, quantity: 1 }] },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── PATCH /invoices/:id/status ────────────────────────────────────

  describe('PATCH /invoices/:id/status', () => {
    it('should set paidAt when status is paid', async () => {
      (prisma.labInvoice.update as any).mockResolvedValue({ ...MOCK_INVOICE, status: 'paid' });

      await app.inject({
        method: 'PATCH',
        url: '/invoices/IV001/status',
        payload: { status: 'paid' },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(prisma.labInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ paidAt: expect.any(Date) }),
        }),
      );
    });

    it('should not set paidAt for non-paid status', async () => {
      (prisma.labInvoice.update as any).mockResolvedValue({ ...MOCK_INVOICE, status: 'issued' });

      await app.inject({
        method: 'PATCH',
        url: '/invoices/IV001/status',
        payload: { status: 'issued' },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(prisma.labInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'issued' },
        }),
      );
    });

    it('should reject technician', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/invoices/IV001/status',
        payload: { status: 'issued' },
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── DELETE /invoices/:id ──────────────────────────────────────────

  describe('DELETE /invoices/:id', () => {
    it('should allow admin to delete', async () => {
      (prisma.labInvoice.delete as any).mockResolvedValue({});

      const res = await app.inject({
        method: 'DELETE',
        url: '/invoices/IV001',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
    });

    it('should reject non-admin', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/invoices/IV001',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for missing invoice', async () => {
      (prisma.labInvoice.delete as any).mockRejectedValue(new Error('Not found'));

      const res = await app.inject({
        method: 'DELETE',
        url: '/invoices/INVALID',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
