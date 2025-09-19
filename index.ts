// ─── Core types (shared between standalone and integrated modes) ──
export type {
  LabWorkOrderStatus,
  LabWorkOrderPriority,
  LabPartner,
  LabWorkOrder,
  LabWorkOrderItem,
  LabPartnerInput,
  LabWorkOrderInput,
  LabWorkOrderItemInput,
  LabWorkOrderStatusChange,
} from './core/types';

export { ALL_STATUSES, SHADE_OPTIONS } from './core/constants';

// ─── Shared components ───────────────────────────────────────────
export { LabWorkOrderStatusBadge } from './shared/LabWorkOrderStatusBadge';

// ─── Integrated mode (submodule in DentalQuoteCreator) ───────────
export {
  fetchLabPartners,
  createLabPartner,
  updateLabPartner,
  deleteLabPartner,
  fetchLabWorkOrders,
  fetchLabWorkOrder,
  fetchPatientLabWorkOrders,
  createLabWorkOrder,
  updateLabWorkOrder,
  changeLabWorkOrderStatus,
  deleteLabWorkOrder,
} from './integrated/api';

export { LabPartnersPage } from './integrated/pages/LabPartnersPage';
export { LabWorkOrdersPage } from './integrated/pages/LabWorkOrdersPage';
export { LabWorkOrderEditorPage } from './integrated/pages/LabWorkOrderEditorPage';
export { generateWorksheetPdf } from './integrated/components/PrintableWorksheet';
export { useLabWorkOrders } from './integrated/hooks/useLabWorkOrders';
