import { useI18n } from '../context/I18nContext';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
  ready: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
  delivered: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200',
  accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  revision: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const label = t.statuses[status as keyof typeof t.statuses] || status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || ''}`}>
      {label}
    </span>
  );
}
