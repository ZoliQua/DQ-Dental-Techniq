// ─── Dental Techniq Module — Type Definitions ──────────────────────

export type LabWorkOrderStatus =
  | 'draft'
  | 'sent'
  | 'in_progress'
  | 'ready'
  | 'delivered'
  | 'accepted'
  | 'revision'
  | 'cancelled';

export type LabWorkOrderPriority = 'normal' | 'urgent';

export interface LabPartner {
  labPartnerId: string;
  labName: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LabWorkOrder {
  workOrderId: string;
  workOrderNumber: string;
  patientId: string;
  labPartnerId: string;
  doctorId?: string | null;
  quoteId?: string | null;
  status: LabWorkOrderStatus;
  priority: LabWorkOrderPriority;
  toothNotation?: string | null;
  shade?: string | null;
  material?: string | null;
  upperImpression: boolean;
  lowerImpression: boolean;
  bite: boolean;
  facebow: boolean;
  photos: boolean;
  notes?: string | null;
  labNotes?: string | null;
  requestedDeadline?: string | null;
  promisedDeadline?: string | null;
  sentAt?: string | null;
  receivedAt?: string | null;
  totalPrice?: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string | null;
  // Joined relations
  items?: LabWorkOrderItem[];
  labPartner?: LabPartner;
}

export interface LabWorkOrderItem {
  itemId: string;
  workOrderId: string;
  catalogItemId?: string | null;
  description: string;
  tooth?: string | null;
  quantity: number;
  unitPrice?: number | null;
  totalPrice?: number | null;
  sortOrder: number;
}

// ─── Form / Create / Update payloads ───────────────────────────────

export type LabPartnerInput = Omit<LabPartner, 'labPartnerId' | 'createdAt' | 'updatedAt'>;

export interface LabWorkOrderInput {
  patientId: string;
  labPartnerId: string;
  doctorId?: string | null;
  quoteId?: string | null;
  priority: LabWorkOrderPriority;
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
  items: LabWorkOrderItemInput[];
}

export interface LabWorkOrderItemInput {
  catalogItemId?: string | null;
  description: string;
  tooth?: string | null;
  quantity: number;
  unitPrice?: number | null;
}

export interface LabWorkOrderStatusChange {
  status: LabWorkOrderStatus;
  labNotes?: string | null;
  promisedDeadline?: string | null;
}
