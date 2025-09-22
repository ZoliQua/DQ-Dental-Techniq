// ─── Bridge Types — shared between standalone and integrated modes ──

/** Payload sent by clinic when submitting a work order to the lab */
export interface BridgeWorkOrderSubmit {
  externalRef: string; // clinic's internal work order ID
  patientLastName: string;
  patientFirstName: string;
  patientBirthDate?: string | null;
  doctorName: string;
  clinicName?: string | null;
  priority: 'normal' | 'urgent';
  toothNotation?: string | null;
  shade?: string | null;
  material?: string | null;
  upperImpression: boolean;
  lowerImpression: boolean;
  bite: boolean;
  facebow: boolean;
  photos: boolean;
  notes?: string | null;
  requestedDeadline?: string | null;
  currency?: string;
  items: BridgeWorkOrderItem[];
}

export interface BridgeWorkOrderItem {
  description: string;
  tooth?: string | null;
  quantity: number;
  unitPrice?: number | null;
}

/** Response returned by lab after receiving a work order */
export interface BridgeWorkOrderResponse {
  workOrderId: string;
  workOrderNumber: string;
  externalRef: string;
  status: string;
  promisedDeadline?: string | null;
  labNotes?: string | null;
  totalPrice?: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/** Status update payload (lab → clinic polling) */
export interface BridgeStatusUpdate {
  workOrderId: string;
  workOrderNumber: string;
  externalRef: string;
  status: string;
  labNotes?: string | null;
  promisedDeadline?: string | null;
  totalPrice?: number | null;
  updatedAt: string;
}

/** Lab info response */
export interface BridgeLabInfo {
  labName: string;
  apiVersion: string;
  capabilities: string[];
}
