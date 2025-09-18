import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../context/AuthContext';

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

const ALL_STATUSES = ['draft', 'sent', 'in_progress', 'ready', 'delivered', 'accepted', 'revision', 'cancelled'];

export function WorkOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    apiFetch('/work-orders')
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;
    return counts;
  }, [orders]);

  const filtered = useMemo(() => {
    let list = [...orders];
    if (filterStatus) list = list.filter((o) => o.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((o) =>
        o.workOrderNumber.toLowerCase().includes(q) ||
        `${o.patient?.lastName} ${o.patient?.firstName}`.toLowerCase().includes(q) ||
        (o.doctorPartner?.doctorName || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [orders, filterStatus, searchQuery]);

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('hu-HU') : '—';
  const formatCurrency = (n: number | null, cur: string) =>
    n != null ? new Intl.NumberFormat('hu-HU', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n) : '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Munkalapok</h1>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            !filterStatus ? 'bg-dental-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
          }`}
          onClick={() => setFilterStatus('')}
        >
          Mind ({orders.length})
        </button>
        {ALL_STATUSES.filter((s) => statusCounts[s]).map((s) => (
          <button
            key={s}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterStatus === s ? 'bg-dental-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
            onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
          >
            {STATUS_LABELS[s]} ({statusCounts[s]})
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500"
        placeholder="Keresés szám, páciens, orvos..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <p className="text-gray-500 py-8 text-center">Betöltés...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">Nincs munkalap.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Szám</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Páciens</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orvos</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Státusz</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Határidő</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Összeg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((order) => {
                  const isOverdue =
                    order.requestedDeadline &&
                    !['delivered', 'accepted', 'cancelled'].includes(order.status) &&
                    new Date(order.requestedDeadline) < new Date();

                  return (
                    <tr
                      key={order.workOrderId}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        order.status === 'cancelled' ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                        {order.workOrderNumber}
                        {order.priority === 'urgent' && (
                          <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 text-xs rounded font-sans">
                            Sürgős
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {order.patient?.lastName} {order.patient?.firstName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {order.doctorPartner?.doctorName}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                        {formatDate(order.requestedDeadline)}
                        {isOverdue && <span className="ml-1 text-xs">(lejárt)</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(order.totalPrice, order.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
