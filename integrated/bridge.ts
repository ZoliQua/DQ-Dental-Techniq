// ─── Lab Bridge Client — connects DentalQuoteCreator to external lab ──

import type {
  BridgeWorkOrderSubmit,
  BridgeWorkOrderResponse,
  BridgeStatusUpdate,
  BridgeLabInfo,
} from '../core/bridge-types';

export interface LabBridgeConfig {
  labUrl: string;   // e.g. "https://lab.example.com" or "http://localhost:4001"
  apiKey: string;   // API key issued by the lab
}

async function bridgeFetch<T>(
  config: LabBridgeConfig,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${config.labUrl}/external${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': config.apiKey,
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Bridge request failed' }));
    throw new Error(err.error || `Bridge error: ${res.status}`);
  }

  return res.json();
}

/** Get lab info (name, API version, capabilities) — no auth required */
export async function getLabInfo(config: LabBridgeConfig): Promise<BridgeLabInfo> {
  const res = await fetch(`${config.labUrl}/external/info`);
  if (!res.ok) throw new Error('Cannot reach lab');
  return res.json();
}

/** Submit a work order to the external lab */
export function submitWorkOrder(
  config: LabBridgeConfig,
  order: BridgeWorkOrderSubmit,
): Promise<BridgeWorkOrderResponse> {
  return bridgeFetch(config, '/work-orders', {
    method: 'POST',
    body: JSON.stringify(order),
  });
}

/** Get a work order by lab ID or externalRef */
export function getWorkOrderStatus(
  config: LabBridgeConfig,
  idOrRef: string,
): Promise<BridgeWorkOrderResponse & { items?: any[] }> {
  return bridgeFetch(config, `/work-orders/${encodeURIComponent(idOrRef)}`);
}

/** List work orders (optionally filtered by last update time) */
export function listWorkOrders(
  config: LabBridgeConfig,
  opts?: { since?: string; status?: string },
): Promise<BridgeStatusUpdate[]> {
  const params = new URLSearchParams();
  if (opts?.since) params.set('since', opts.since);
  if (opts?.status) params.set('status', opts.status);
  const qs = params.toString();
  return bridgeFetch(config, `/work-orders${qs ? '?' + qs : ''}`);
}

/**
 * Poll for status updates since a given timestamp.
 * Returns only orders that changed since `since`.
 */
export function pollStatusUpdates(
  config: LabBridgeConfig,
  since: string,
): Promise<BridgeStatusUpdate[]> {
  return listWorkOrders(config, { since });
}
