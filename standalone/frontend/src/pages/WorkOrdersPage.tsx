import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { StatusBadge } from '../components/StatusBadge';

const ALL_STATUSES = ['draft', 'sent', 'in_progress', 'ready', 'delivered', 'accepted', 'revision', 'cancelled'];

export function WorkOrdersPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
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

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : '—';
  const formatCurrency = (n: number | null, cur: string) =>
    n != null ? new Intl.NumberFormat('hu-HU', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n) : '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.workOrders.title}</h1>
        <button onClick={() => navigate('/work-orders/new')}
          className="px-4 py-2 bg-dental-600 hover:bg-dental-700 text-white font-medium rounded-lg text-sm transition-colors">
          {t.workOrders.newOrder}
        </button>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            !filterStatus ? 'bg-dental-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
          }`}
          onClick={() => setFilterStatus('')}
        >
          {t.common.all} ({orders.length})
        </button>
        {ALL_STATUSES.filter((s) => statusCounts[s]).map((s) => (
          <button key={s}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterStatus === s ? 'bg-dental-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
            onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
          >
            {t.statuses[s as keyof typeof t.statuses]} ({statusCounts[s]})
          </button>
        ))}
      </div>

      <input type="text"
        className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500"
        placeholder={t.workOrders.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <p className="text-gray-500 py-8 text-center">{t.common.loading}</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">{t.workOrders.noOrders}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.workOrders.orderNumber}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.workOrders.patient}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.workOrders.doctor}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.workOrders.status}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.workOrders.deadline}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.workOrders.total}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((order) => {
                  const isOverdue = order.requestedDeadline && !['delivered', 'accepted', 'cancelled'].includes(order.status) && new Date(order.requestedDeadline) < new Date();
                  return (
                    <tr key={order.workOrderId}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${order.status === 'cancelled' ? 'opacity-50' : ''}`}
                      onClick={() => navigate(`/work-orders/${order.workOrderId}`)}>
                      <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                        {order.workOrderNumber}
                        {order.priority === 'urgent' && (
                          <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 text-xs rounded font-sans">
                            {t.workOrders.urgent}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{order.patient?.lastName} {order.patient?.firstName}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{order.doctorPartner?.doctorName}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className={`px-4 py-3 text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                        {formatDate(order.requestedDeadline)}
                        {isOverdue && <span className="ml-1 text-xs">{t.workOrders.overdue}</span>}
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
