import { vi } from 'vitest';

function mockModel() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    upsert: vi.fn(),
  };
}

export const prisma: any = {
  labUser: mockModel(),
  authSession: mockModel(),
  labPatient: mockModel(),
  doctorPartner: mockModel(),
  labWorkOrder: mockModel(),
  labWorkOrderItem: mockModel(),
  labInvoice: mockModel(),
  labInvoiceItem: mockModel(),
  apiKey: mockModel(),
  labSettings: mockModel(),
};

let idCounter = 0;

export function createId(prefix: string): string {
  return `${prefix}test${String(++idCounter).padStart(4, '0')}`;
}

export function requireRole(request: any, reply: any, ...roles: string[]): boolean {
  if (!request.currentUser) {
    reply.code(401).send({ error: 'Unauthorized' });
    return false;
  }
  if (roles.length > 0 && !roles.includes(request.currentUser.role)) {
    reply.code(403).send({ error: 'Forbidden' });
    return false;
  }
  return true;
}
