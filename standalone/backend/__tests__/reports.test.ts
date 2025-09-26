import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../server.js');

import { prisma } from '../server.js';
import { reportRoutes } from '../routes/reports.js';
import { buildTestApp, TEST_ADMIN, TEST_TECH, authHeaders } from './helpers.js';

describe('Report Routes', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(reportRoutes, '/reports');
  });

  // ── GET /reports/summary ──────────────────────────────────────────

  describe('GET /reports/summary', () => {
    it('should return summary for admin', async () => {
      (prisma.labWorkOrder.count as any).mockResolvedValue(42);
      (prisma.labWorkOrder.groupBy as any).mockResolvedValue([
        { status: 'draft', _count: { status: 10 } },
        { status: 'delivered', _count: { status: 32 } },
      ]);
      (prisma.labWorkOrder.aggregate as any).mockResolvedValue({
        _sum: { totalPrice: 1500000 },
      });
      (prisma.labInvoice.groupBy as any).mockResolvedValue([
        { status: 'paid', _count: { status: 20 }, _sum: { totalAmount: 1000000 } },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/reports/summary',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.totalOrders).toBe(42);
      expect(body.totalRevenue).toBe(1500000);
      expect(body.ordersByStatus).toHaveLength(2);
      expect(body.invoicesByStatus).toHaveLength(1);
    });

    it('should apply date range filters', async () => {
      (prisma.labWorkOrder.count as any).mockResolvedValue(0);
      (prisma.labWorkOrder.groupBy as any).mockResolvedValue([]);
      (prisma.labWorkOrder.aggregate as any).mockResolvedValue({ _sum: { totalPrice: 0 } });
      (prisma.labInvoice.groupBy as any).mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/reports/summary?from=2025-01-01&to=2025-12-31',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(prisma.labWorkOrder.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should reject non-admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/reports/summary',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── GET /reports/by-doctor ────────────────────────────────────────

  describe('GET /reports/by-doctor', () => {
    it('should return per-doctor stats', async () => {
      (prisma.labWorkOrder.groupBy as any).mockResolvedValue([
        { doctorPartnerId: 'DP001', _count: { workOrderId: 15 }, _sum: { totalPrice: 500000 } },
        { doctorPartnerId: 'DP002', _count: { workOrderId: 8 }, _sum: { totalPrice: 200000 } },
      ]);
      (prisma.doctorPartner.findMany as any).mockResolvedValue([
        { doctorPartnerId: 'DP001', doctorName: 'Dr. Nagy', clinicName: 'Nagy Dental' },
        { doctorPartnerId: 'DP002', doctorName: 'Dr. Kis', clinicName: null },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/reports/by-doctor',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(2);
      expect(body[0].doctorName).toBe('Dr. Nagy');
      expect(body[0].orderCount).toBe(15);
      expect(body[0].totalRevenue).toBe(500000);
    });

    it('should reject non-admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/reports/by-doctor',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── GET /reports/monthly ──────────────────────────────────────────

  describe('GET /reports/monthly', () => {
    it('should return monthly breakdown', async () => {
      (prisma.labWorkOrder.findMany as any).mockResolvedValue([
        { createdAt: new Date('2025-03-15'), totalPrice: 50000, status: 'delivered' },
        { createdAt: new Date('2025-03-20'), totalPrice: 30000, status: 'delivered' },
        { createdAt: new Date('2025-06-10'), totalPrice: 25000, status: 'ready' },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/reports/monthly?year=2025',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.year).toBe(2025);
      expect(body.months).toHaveLength(12);
      expect(body.months[2].orderCount).toBe(2); // March (index 2)
      expect(body.months[2].revenue).toBe(80000);
      expect(body.months[5].orderCount).toBe(1); // June (index 5)
    });

    it('should use current year if not specified', async () => {
      (prisma.labWorkOrder.findMany as any).mockResolvedValue([]);

      const res = await app.inject({
        method: 'GET',
        url: '/reports/monthly',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().year).toBe(new Date().getFullYear());
    });

    it('should reject non-admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/reports/monthly',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
