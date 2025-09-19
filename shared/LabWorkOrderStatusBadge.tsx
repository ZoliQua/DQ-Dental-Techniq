import type { LabWorkOrderStatus } from '../core/types';

const STATUS_STYLES: Record<LabWorkOrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  accepted: 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100',
  revision: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const STATUS_LABELS_HU: Record<LabWorkOrderStatus, string> = {
  draft: 'Piszkozat',
  sent: 'Elküldve',
  in_progress: 'Folyamatban',
  ready: 'Elkészült',
  delivered: 'Visszaérkezett',
  accepted: 'Elfogadva',
  revision: 'Javítás',
  cancelled: 'Törölve',
};

interface Props {
  status: LabWorkOrderStatus;
  labels?: Record<string, string>;
}

export function LabWorkOrderStatusBadge({ status, labels }: Props) {
  const label = labels?.[status] ?? STATUS_LABELS_HU[status] ?? status;
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
