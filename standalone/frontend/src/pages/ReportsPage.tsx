import { useState, useEffect } from 'react';
import { apiFetch } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

type Tab = 'summary' | 'byDoctor' | 'monthly';

interface SummaryData {
  totalOrders: number;
  ordersByStatus: { status: string; count: number }[];
  totalRevenue: number;
  invoicesByStatus: { status: string; count: number; total: number }[];
}
interface ByDoctorRow { doctorPartnerId: string; doctorName: string; clinicName: string | null; orderCount: number; totalRevenue: number; }
interface MonthlyData { year: number; months: { month: number; orderCount: number; revenue: number }[]; }

const MONTH_NAMES_HU = ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sze', 'Okt', 'Nov', 'Dec'];
const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export function ReportsPage() {
  const { t, language } = useI18n();
  const [tab, setTab] = useState<Tab>('summary');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [byDoctor, setByDoctor] = useState<ByDoctorRow[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(false);

  const monthNames = language === 'de' ? MONTH_NAMES_DE : language === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_HU;

  const loadSummary = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    apiFetch(`/reports/summary?${params}`).then(setSummary).catch(() => {}).finally(() => setLoading(false));
  };
  const loadByDoctor = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    apiFetch(`/reports/by-doctor?${params}`).then(setByDoctor).catch(() => {}).finally(() => setLoading(false));
  };
  const loadMonthly = () => {
    setLoading(true);
    apiFetch(`/reports/monthly?year=${year}`).then(setMonthly).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'summary') loadSummary();
    else if (tab === 'byDoctor') loadByDoctor();
    else loadMonthly();
  }, [tab]);

  const fmt = (n: number) => new Intl.NumberFormat('hu-HU').format(n);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.reports.title}</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['summary', 'byDoctor', 'monthly'] as Tab[]).map((tb) => (
          <button key={tb} onClick={() => setTab(tb)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === tb ? 'bg-dental-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
            {t.reports[tb]}
          </button>
        ))}
      </div>

      {/* Date filter for summary and byDoctor */}
      {(tab === 'summary' || tab === 'byDoctor') && (
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t.reports.from}</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t.reports.to}</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500" />
          </div>
          <button onClick={tab === 'summary' ? loadSummary : loadByDoctor}
            className="px-4 py-2 bg-dental-600 hover:bg-dental-700 text-white text-sm rounded-lg font-medium">{t.reports.filter}</button>
        </div>
      )}

      {/* Year filter for monthly */}
      {tab === 'monthly' && (
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t.reports.year}</label>
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500" />
          </div>
          <button onClick={loadMonthly}
            className="px-4 py-2 bg-dental-600 hover:bg-dental-700 text-white text-sm rounded-lg font-medium">{t.reports.filter}</button>
        </div>
      )}

      {loading ? <p className="text-gray-500 py-8 text-center">{t.common.loading}</p> : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Summary */}
          {tab === 'summary' && summary && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label={t.reports.totalOrders} value={String(summary.totalOrders)} />
                <StatCard label={t.reports.totalRevenue} value={`${fmt(summary.totalRevenue)} HUF`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t.nav.workOrders}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {summary.ordersByStatus.map((s) => (
                    <div key={s.status} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.status}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{s.count}</p>
                    </div>
                  ))}
                </div>
              </div>
              {summary.invoicesByStatus.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t.invoices.title}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {summary.invoicesByStatus.map((s) => (
                      <div key={s.status} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{s.status}</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{s.count}</p>
                        <p className="text-xs text-gray-500">{fmt(s.total)} HUF</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* By Doctor */}
          {tab === 'byDoctor' && (
            byDoctor.length === 0 ? <p className="text-gray-500 py-8 text-center">{t.reports.noData}</p> : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.reports.doctorName}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.reports.orderCount}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.reports.revenue}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {byDoctor.map((r) => (
                    <tr key={r.doctorPartnerId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{r.doctorName}{r.clinicName ? ` (${r.clinicName})` : ''}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{r.orderCount}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">{fmt(r.totalRevenue)} HUF</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {/* Monthly */}
          {tab === 'monthly' && monthly && (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.reports.month}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.reports.orderCount}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.reports.revenue}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {monthly.months.map((m) => (
                  <tr key={m.month} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${m.orderCount === 0 ? 'opacity-40' : ''}`}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{monthNames[m.month - 1]}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{m.orderCount}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">{fmt(m.revenue)} HUF</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
    </div>
  );
}
