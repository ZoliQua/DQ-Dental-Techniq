import { getAuthHeaders } from '../../utils/auth';
import type {
  LabPartner,
  LabPartnerInput,
  LabWorkOrder,
  LabWorkOrderInput,
  LabWorkOrderStatusChange,
} from './types';

const BASE = '/backend';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || res.statusText);
  }
  return res.json();
}

// ─── Lab Partners ───────────────────────────────────────────────────

export async function fetchLabPartners(): Promise<LabPartner[]> {
  const res = await fetch(`${BASE}/lab-partners`, { headers: getAuthHeaders() });
  return json(res);
}

export async function createLabPartner(data: LabPartnerInput): Promise<LabPartner> {
  const res = await fetch(`${BASE}/lab-partners`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function updateLabPartner(labPartnerId: string, data: Partial<LabPartnerInput>): Promise<LabPartner> {
  const res = await fetch(`${BASE}/lab-partners/${labPartnerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function deleteLabPartner(labPartnerId: string): Promise<void> {
  const res = await fetch(`${BASE}/lab-partners/${labPartnerId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete lab partner');
}

// ─── Lab Work Orders ────────────────────────────────────────────────

export async function fetchLabWorkOrders(filters?: {
  status?: string;
  patientId?: string;
  labPartnerId?: string;
}): Promise<LabWorkOrder[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.patientId) params.set('patientId', filters.patientId);
  if (filters?.labPartnerId) params.set('labPartnerId', filters.labPartnerId);
  const qs = params.toString();
  const res = await fetch(`${BASE}/lab-work-orders${qs ? '?' + qs : ''}`, { headers: getAuthHeaders() });
  return json(res);
}

export async function fetchLabWorkOrder(workOrderId: string): Promise<LabWorkOrder> {
  const res = await fetch(`${BASE}/lab-work-orders/${workOrderId}`, { headers: getAuthHeaders() });
  return json(res);
}

export async function fetchPatientLabWorkOrders(patientId: string): Promise<LabWorkOrder[]> {
  const res = await fetch(`${BASE}/lab-work-orders/patient/${patientId}`, { headers: getAuthHeaders() });
  return json(res);
}

export async function createLabWorkOrder(data: LabWorkOrderInput): Promise<LabWorkOrder> {
  const res = await fetch(`${BASE}/lab-work-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function updateLabWorkOrder(workOrderId: string, data: Partial<LabWorkOrderInput>): Promise<LabWorkOrder> {
  const res = await fetch(`${BASE}/lab-work-orders/${workOrderId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function changeLabWorkOrderStatus(workOrderId: string, data: LabWorkOrderStatusChange): Promise<LabWorkOrder> {
  const res = await fetch(`${BASE}/lab-work-orders/${workOrderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return json(res);
}

export async function deleteLabWorkOrder(workOrderId: string): Promise<void> {
  const res = await fetch(`${BASE}/lab-work-orders/${workOrderId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete work order');
}
