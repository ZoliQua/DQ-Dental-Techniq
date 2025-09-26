import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../server.js');

import { prisma } from '../server.js';
import { patientRoutes } from '../routes/patients.js';
import { buildTestApp, TEST_TECH, authHeaders } from './helpers.js';

const MOCK_PATIENT = {
  patientId: 'PT001',
  lastName: 'Kiss',
  firstName: 'János',
  birthDate: '1985-03-15',
  phone: '+36201234567',
  notes: null,
};

describe('Patient Routes', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(patientRoutes, '/patients');
  });

  // ── GET /patients ─────────────────────────────────────────────────

  describe('GET /patients', () => {
    it('should list all patients', async () => {
      (prisma.labPatient.findMany as any).mockResolvedValue([MOCK_PATIENT]);

      const res = await app.inject({
        method: 'GET',
        url: '/patients',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
      expect(res.json()[0].lastName).toBe('Kiss');
    });

    it('should search by name', async () => {
      (prisma.labPatient.findMany as any).mockResolvedValue([MOCK_PATIENT]);

      const res = await app.inject({
        method: 'GET',
        url: '/patients?search=Kiss',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.labPatient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
    });

    it('should reject unauthenticated', async () => {
      const res = await app.inject({ method: 'GET', url: '/patients' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /patients/:id ─────────────────────────────────────────────

  describe('GET /patients/:id', () => {
    it('should return patient with work orders', async () => {
      (prisma.labPatient.findUnique as any).mockResolvedValue({
        ...MOCK_PATIENT,
        workOrders: [],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/patients/PT001',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().patientId).toBe('PT001');
    });

    it('should return 404 for missing patient', async () => {
      (prisma.labPatient.findUnique as any).mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/patients/INVALID',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── POST /patients ────────────────────────────────────────────────

  describe('POST /patients', () => {
    it('should create a patient', async () => {
      (prisma.labPatient.create as any).mockResolvedValue(MOCK_PATIENT);

      const res = await app.inject({
        method: 'POST',
        url: '/patients',
        payload: { lastName: 'Kiss', firstName: 'János', birthDate: '1985-03-15' },
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().lastName).toBe('Kiss');
    });
  });

  // ── PUT /patients/:id ─────────────────────────────────────────────

  describe('PUT /patients/:id', () => {
    it('should update a patient', async () => {
      (prisma.labPatient.update as any).mockResolvedValue({
        ...MOCK_PATIENT,
        phone: '+36309876543',
      });

      const res = await app.inject({
        method: 'PUT',
        url: '/patients/PT001',
        payload: { phone: '+36309876543' },
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().phone).toBe('+36309876543');
    });

    it('should return 404 for missing patient', async () => {
      (prisma.labPatient.update as any).mockRejectedValue(new Error('Not found'));

      const res = await app.inject({
        method: 'PUT',
        url: '/patients/INVALID',
        payload: { phone: 'x' },
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
