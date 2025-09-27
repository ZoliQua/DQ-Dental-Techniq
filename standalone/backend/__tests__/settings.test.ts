import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../server.js');

import { prisma } from '../server.js';
import { settingsRoutes } from '../routes/settings.js';
import { buildTestApp, TEST_ADMIN, TEST_TECH, authHeaders } from './helpers.js';

const MOCK_SETTINGS = {
  id: 1,
  labName: 'DQ Dental Techniq',
  address: 'Budapest, Fő utca 1.',
  phone: '+36201234567',
  email: 'info@dqdental.hu',
  taxNumber: '12345678-2-42',
  bankAccount: '11111111-22222222-33333333',
  notes: null,
  updatedAt: new Date('2025-09-01'),
};

describe('Settings Routes', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(settingsRoutes, '/settings');
  });

  // ── GET /settings/lab ─────────────────────────────────────────────

  describe('GET /settings/lab', () => {
    it('should return existing lab settings', async () => {
      (prisma.labSettings.findUnique as any).mockResolvedValue(MOCK_SETTINGS);

      const res = await app.inject({
        method: 'GET',
        url: '/settings/lab',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().labName).toBe('DQ Dental Techniq');
      expect(res.json().address).toBe('Budapest, Fő utca 1.');
    });

    it('should create default settings if none exist', async () => {
      (prisma.labSettings.findUnique as any).mockResolvedValue(null);
      (prisma.labSettings.create as any).mockResolvedValue({
        ...MOCK_SETTINGS,
        labName: 'DQ Dental Techniq',
        address: null,
        phone: null,
        email: null,
        taxNumber: null,
        bankAccount: null,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/settings/lab',
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.labSettings.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { id: 1 } }),
      );
    });

    it('should reject non-admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/settings/lab',
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });

    it('should reject unauthenticated', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/settings/lab',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── PUT /settings/lab ─────────────────────────────────────────────

  describe('PUT /settings/lab', () => {
    it('should update lab settings', async () => {
      const updated = { ...MOCK_SETTINGS, labName: 'New Lab Name' };
      (prisma.labSettings.upsert as any).mockResolvedValue(updated);

      const res = await app.inject({
        method: 'PUT',
        url: '/settings/lab',
        payload: {
          labName: 'New Lab Name',
          address: 'Budapest, Fő utca 1.',
          phone: '+36201234567',
          email: 'info@dqdental.hu',
          taxNumber: '12345678-2-42',
          bankAccount: '11111111-22222222-33333333',
        },
        headers: authHeaders(TEST_ADMIN),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().labName).toBe('New Lab Name');
      expect(prisma.labSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          update: expect.objectContaining({ labName: 'New Lab Name' }),
        }),
      );
    });

    it('should reject non-admin', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/settings/lab',
        payload: { labName: 'Test' },
        headers: authHeaders(TEST_TECH),
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
