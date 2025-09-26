import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../server.js');

import { prisma } from '../server.js';
import { doctorPartnerRoutes } from '../routes/doctorPartners.js';
import { buildTestApp, TEST_ADMIN, TEST_TECH, TEST_RECEP, authHeaders } from './helpers.js';

const MOCK_PARTNER = {
  doctorPartnerId: 'DP001',
  doctorName: 'Dr. Nagy Péter',
  clinicName: 'Nagy Dental',
  contactName: null,
  phone: '+36201234567',
  email: 'nagy@dental.hu',
  address: 'Budapest, Kossuth u. 1.',
  taxNumber: '12345678-2-42',
  notes: null,
  isActive: true,
};

describe('Doctor Partner Routes', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(doctorPartnerRoutes, '/doctor-partners');
  });

  // ── GET /doctor-partners ──────────────────────────────────────────

  describe('GET /doctor-partners', () => {
    it('should list partners', async () => {
      (prisma.doctorPartner.findMany as any).mockResolvedValue([MOCK_PARTNER]);

      const res = await app.inject({
        method: 'GET',
        url: '/doctor-partners',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
      expect(res.json()[0].doctorName).toBe('Dr. Nagy Péter');
    });

    it('should reject unauthenticated', async () => {
      const res = await app.inject({ method: 'GET', url: '/doctor-partners' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── POST /doctor-partners ─────────────────────────────────────────

  describe('POST /doctor-partners', () => {
    it('should allow admin to create', async () => {
      (prisma.doctorPartner.create as any).mockResolvedValue(MOCK_PARTNER);

      const res = await app.inject({
        method: 'POST',
        url: '/doctor-partners',
        payload: { doctorName: 'Dr. Nagy Péter', clinicName: 'Nagy Dental' },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
    });

    it('should allow receptionist to create', async () => {
      (prisma.doctorPartner.create as any).mockResolvedValue(MOCK_PARTNER);

      const res = await app.inject({
        method: 'POST',
        url: '/doctor-partners',
        payload: { doctorName: 'Dr. Nagy Péter' },
        headers: authHeaders(TEST_RECEP),
      });

      expect(res.statusCode).toBe(200);
    });

    it('should reject technician', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/doctor-partners',
        payload: { doctorName: 'Dr. Test' },
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── PUT /doctor-partners/:id ──────────────────────────────────────

  describe('PUT /doctor-partners/:id', () => {
    it('should update partner', async () => {
      (prisma.doctorPartner.update as any).mockResolvedValue({
        ...MOCK_PARTNER,
        phone: '+36301111111',
      });

      const res = await app.inject({
        method: 'PUT',
        url: '/doctor-partners/DP001',
        payload: { doctorName: 'Dr. Nagy Péter', phone: '+36301111111' },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 for missing partner', async () => {
      (prisma.doctorPartner.update as any).mockRejectedValue(new Error('Not found'));

      const res = await app.inject({
        method: 'PUT',
        url: '/doctor-partners/INVALID',
        payload: { doctorName: 'Dr. Test' },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── DELETE /doctor-partners/:id ───────────────────────────────────

  describe('DELETE /doctor-partners/:id', () => {
    it('should allow admin to delete', async () => {
      (prisma.doctorPartner.delete as any).mockResolvedValue({});

      const res = await app.inject({
        method: 'DELETE',
        url: '/doctor-partners/DP001',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
    });

    it('should reject non-admin delete', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/doctor-partners/DP001',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for missing partner', async () => {
      (prisma.doctorPartner.delete as any).mockRejectedValue(new Error('Not found'));

      const res = await app.inject({
        method: 'DELETE',
        url: '/doctor-partners/INVALID',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
