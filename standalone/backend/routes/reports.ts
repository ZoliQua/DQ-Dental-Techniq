import type { FastifyInstance } from 'fastify';
import { prisma, requireRole } from '../server.js';

export async function reportRoutes(app: FastifyInstance) {
  // GET /reports/summary — overall lab summary for a date range
  app.get('/summary', async (request, reply) => {
    if (!requireRole(request, reply, 'admin')) return;
    const { from, to } = request.query as { from?: string; to?: string };

    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const [totalOrders, ordersByStatus, totalRevenue, invoicesByStatus] = await Promise.all([
      prisma.labWorkOrder.count({ where }),
      prisma.labWorkOrder.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      prisma.labWorkOrder.aggregate({
        where,
        _sum: { totalPrice: true },
      }),
      prisma.labInvoice.groupBy({
        by: ['status'],
        where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {},
        _count: { status: true },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalOrders,
      ordersByStatus: ordersByStatus.map((g) => ({
        status: g.status,
        count: g._count.status,
      })),
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      invoicesByStatus: invoicesByStatus.map((g) => ({
        status: g.status,
        count: g._count.status,
        total: g._sum.totalAmount || 0,
      })),
    };
  });

  // GET /reports/by-doctor — revenue per doctor partner
  app.get('/by-doctor', async (request, reply) => {
    if (!requireRole(request, reply, 'admin')) return;
    const { from, to } = request.query as { from?: string; to?: string };

    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const result = await prisma.labWorkOrder.groupBy({
      by: ['doctorPartnerId'],
      where,
      _count: { workOrderId: true },
      _sum: { totalPrice: true },
    });

    // Get partner names
    const partnerIds = result.map((r) => r.doctorPartnerId);
    const partners = await prisma.doctorPartner.findMany({
      where: { doctorPartnerId: { in: partnerIds } },
      select: { doctorPartnerId: true, doctorName: true, clinicName: true },
    });
    const partnerMap = new Map(partners.map((p) => [p.doctorPartnerId, p]));

    return result.map((r) => ({
      doctorPartnerId: r.doctorPartnerId,
      doctorName: partnerMap.get(r.doctorPartnerId)?.doctorName || '—',
      clinicName: partnerMap.get(r.doctorPartnerId)?.clinicName || null,
      orderCount: r._count.workOrderId,
      totalRevenue: r._sum.totalPrice || 0,
    }));
  });

  // GET /reports/monthly — monthly breakdown
  app.get('/monthly', async (request, reply) => {
    if (!requireRole(request, reply, 'admin')) return;
    const { year } = request.query as { year?: string };
    const y = parseInt(year || String(new Date().getFullYear()), 10);

    const orders = await prisma.labWorkOrder.findMany({
      where: {
        createdAt: {
          gte: new Date(`${y}-01-01`),
          lt: new Date(`${y + 1}-01-01`),
        },
      },
      select: { createdAt: true, totalPrice: true, status: true },
    });

    const months: { month: number; orderCount: number; revenue: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthOrders = orders.filter(
        (o) => o.createdAt.getMonth() + 1 === m,
      );
      months.push({
        month: m,
        orderCount: monthOrders.length,
        revenue: monthOrders.reduce((s, o) => s + (o.totalPrice || 0), 0),
      });
    }

    return { year: y, months };
  });
}
