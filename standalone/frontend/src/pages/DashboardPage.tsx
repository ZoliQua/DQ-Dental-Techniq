import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../context/AuthContext';

interface Stats {
  total: number;
  draft: number;
  inProgress: number;
  ready: number;
  overdue: number;
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, draft: 0, inProgress: 0, ready: 0, overdue: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/work-orders')
      .then((orders: any[]) => {
        const now = new Date();
        setStats({
          total: orders.length,
          draft: orders.filter((o) => o.status === 'draft').length,
          inProgress: orders.filter((o) => o.status === 'in_progress').length,
          ready: orders.filter((o) => o.status === 'ready').length,
          overdue: orders.filter(
            (o) =>
              o.requestedDeadline &&
              !['delivered', 'accepted', 'cancelled'].includes(o.status) &&
              new Date(o.requestedDeadline) < now,
          ).length,
        });
        setRecentOrders(orders.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  const statCards = [
    { label: 'Összes munkalap', value: stats.total, color: 'bg-dental-50 text-dental-700 dark:bg-dental-900/30 dark:text-dental-300' },
    { label: 'Piszkozat', value: stats.draft, color: 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    { label: 'Gyártásban', value: stats.inProgress, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    { label: 'Kész', value: stats.ready, color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    { label: 'Késésben', value: stats.overdue, color: stats.overdue > 0 ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Áttekintés</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl p-4 ${card.color}`}
          >
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm mt-1 opacity-80">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent work orders */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Legutóbbi munkalapok</h2>
          <Link
            to="/work-orders"
            className="text-sm text-dental-600 hover:text-dental-700 font-medium"
          >
            Összes megtekintése
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
            Még nincsenek munkalapok.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentOrders.map((order) => (
              <div key={order.workOrderId} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                    {order.workOrderNumber}
                  </span>
                  <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                    {order.patient?.lastName} {order.patient?.firstName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {order.doctorPartner?.doctorName}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Piszkozat',
  sent: 'Elküldve',
  in_progress: 'Gyártásban',
  ready: 'Kész',
  delivered: 'Kiszállítva',
  accepted: 'Elfogadva',
  revision: 'Javítás',
  cancelled: 'Visszavonva',
};

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

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || ''}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
