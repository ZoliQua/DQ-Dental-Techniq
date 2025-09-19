import type { LabWorkOrderStatus } from './types';

export const ALL_STATUSES: LabWorkOrderStatus[] = [
  'draft', 'sent', 'in_progress', 'ready', 'delivered', 'accepted', 'revision', 'cancelled',
];

export const SHADE_OPTIONS = [
  'A1','A2','A3','A3.5','A4',
  'B1','B2','B3','B4',
  'C1','C2','C3','C4',
  'D2','D3','D4',
  'BL1','BL2','BL3','BL4',
];
