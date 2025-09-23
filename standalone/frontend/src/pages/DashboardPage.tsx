import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { StatusBadge } from '../components/StatusBadge';

interface OrderStats {
  total: number;
  draft: number;
  inProgress: number;
  ready: number;
  overdue: number;
}

interface InvoiceStats {
  draft: number;
  issued: number;
  paid: number;
  unpaidTotal: number;
  paidTotal: number;
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  issued: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function DashboardPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [orderStats, setOrderStats] = useState<OrderStats>({ total: 0, draft: 0, inProgress: 0, ready: 0, overdue: 0 });
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats>({ draft: 0, issued: 0, paid: 0, unpaidTotal: 0, paidTotal: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  useEffect(() => {
    // Load work orders
    apiFetch('/work-orders')
      .then((orders: any[]) => {
        const now = new Date();
        setOrderStats({
          total: orders.length,
          draft: orders.filter((o) => o.status === 'draft').length,
          inProgress: orders.filter((o) => o.status === 'in_progress').length,
          ready: orders.filter((o) => o.status === 'ready').length,
          overdue: orders.filter(
            (o) => o.requestedDeadline && !['delivered', 'accepted', 'cancelled'].includes(o.status) && new Date(o.requestedDeadline) < now,
          ).length,
        });
        setRecentOrders(orders.slice(0, 5));

        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcoming = orders
          .filter((o) => o.requestedDeadline && !['delivered', 'accepted', 'cancelled'].includes(o.status) && new Date(o.requestedDeadline) <= weekFromNow && new Date(o.requestedDeadline) >= now)
          .sort((a: any, b: any) => new Date(a.requestedDeadline).getTime() - new Date(b.requestedDeadline).getTime());
        setUpcomingDeadlines(upcoming.slice(0, 5));
      })
      .catch(() => {});

    // Load invoices
    apiFetch('/invoices')
      .then((invoices: any[]) => {
        const draftInv = invoices.filter((i) => i.status === 'draft');
        const issuedInv = invoices.filter((i) => i.status === 'issued');
        const paidInv = invoices.filter((i) => i.status === 'paid');
        setInvoiceStats({
          draft: draftInv.length,
          issued: issuedInv.length,
          paid: paidInv.length,
          unpaidTotal: issuedInv.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0),
          paidTotal: paidInv.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0),
        });
        setRecentInvoices(invoices.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  const formatDate = (d: string) => new Date(d).toLocaleDateString();
  const fmt = (n: number) => new Intl.NumberFormat('hu-HU').format(n);
  const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const invoiceStatusLabel = (s: string) => {
    const map: Record<string, string> = { draft: t.invoices.statusDraft, issued: t.invoices.statusIssued, paid: t.invoices.statusPaid, cancelled: t.invoices.statusCancelled };
    return map[s] || s;
  };

  const orderStatCards = [
    { label: t.dashboard.totalOrders, value: orderStats.total, color: 'bg-dental-50 text-dental-700 dark:bg-dental-900/30 dark:text-dental-300', filter: '' },
    { label: t.dashboard.draft, value: orderStats.draft, color: 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300', filter: 'draft' },
    { label: t.dashboard.inProgress, value: orderStats.inProgress, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', filter: 'in_progress' },
    { label: t.dashboard.ready, value: orderStats.ready, color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300', filter: 'ready' },
    { label: t.dashboard.overdue, value: orderStats.overdue, color: orderStats.overdue > 0 ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300', filter: 'overdue' },
  ];

  const invoiceStatCards = [
    { label: t.dashboard.invoicesDraft, value: String(invoiceStats.draft), color: 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    { label: t.dashboard.invoicesIssued, value: String(invoiceStats.issued), color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    { label: t.dashboard.unpaidTotal, value: `${fmt(invoiceStats.unpaidTotal)} HUF`, color: invoiceStats.unpaidTotal > 0 ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    { label: t.dashboard.revenue, value: `${fmt(invoiceStats.paidTotal)} HUF`, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.dashboard.title}</h1>
        <button onClick={() => navigate('/work-orders/new')}
          className="px-4 py-2 bg-dental-600 hover:bg-dental-700 text-white font-medium rounded-lg text-sm transition-colors">
          {t.workOrders.newOrder}
        </button>
      </div>

      {/* Work order stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {orderStatCards.map((card) => (
          <button key={card.label} onClick={() => card.filter && navigate(`/work-orders?status=${card.filter}`)}
            className={`rounded-xl p-4 text-left transition-shadow hover:shadow-md ${card.color}`}>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm mt-1 opacity-80">{card.label}</p>
          </button>
        ))}
      </div>

      {/* Invoice stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {invoiceStatCards.map((card) => (
          <button key={card.label} onClick={() => navigate('/invoices')}
            className={`rounded-xl p-4 text-left transition-shadow hover:shadow-md ${card.color}`}>
            <p className="text-xl font-bold">{card.value}</p>
            <p className="text-sm mt-1 opacity-80">{card.label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent work orders */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t.dashboard.recentOrders}</h2>
            <Link to="/work-orders" className="text-sm text-dental-600 hover:text-dental-700 font-medium">
              {t.dashboard.viewAll}
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">{t.dashboard.noOrders}</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentOrders.map((order) => (
                <button key={order.workOrderId} onClick={() => navigate(`/work-orders/${order.workOrderId}`)}
                  className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left">
                  <div className="min-w-0">
                    <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{order.workOrderNumber}</span>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 truncate">
                      {order.patient?.lastName} {order.patient?.firstName}
                    </span>
                  </div>
                  <StatusBadge status={order.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming deadlines */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t.dashboard.upcomingDeadlines}</h2>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">—</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {upcomingDeadlines.map((order) => {
                const days = daysUntil(order.requestedDeadline);
                return (
                  <button key={order.workOrderId} onClick={() => navigate(`/work-orders/${order.workOrderId}`)}
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left">
                    <div className="min-w-0">
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{order.workOrderNumber}</span>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        {order.patient?.lastName} {order.patient?.firstName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium ${days <= 1 ? 'text-red-600' : days <= 3 ? 'text-orange-600' : 'text-gray-600 dark:text-gray-400'}`}>
                        {formatDate(order.requestedDeadline)}
                        {days === 0 && ` (${t.dashboard.today})`}
                        {days === 1 && ` (${t.dashboard.tomorrow})`}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent invoices */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t.dashboard.recentInvoices}</h2>
            <Link to="/invoices" className="text-sm text-dental-600 hover:text-dental-700 font-medium">
              {t.dashboard.viewAll}
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">{t.dashboard.noInvoices}</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentInvoices.map((inv: any) => (
                <button key={inv.invoiceId} onClick={() => navigate('/invoices')}
                  className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left">
                  <div className="min-w-0">
                    <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{inv.invoiceNumber}</span>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 truncate">
                      {inv.doctorPartner?.doctorName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{fmt(inv.totalAmount)} HUF</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status] || ''}`}>
                      {invoiceStatusLabel(inv.status)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
