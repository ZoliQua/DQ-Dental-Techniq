import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSettings } from '../../../context/SettingsContext';
import { usePatients } from '../../../hooks';
import { Button, Card, CardContent, Select } from '../../../components/common';
import { formatCurrency, formatDate, formatPatientName } from '../../../utils';
import { useLabWorkOrders } from '../hooks/useLabWorkOrders';
import { LabWorkOrderStatusBadge } from '../components/LabWorkOrderStatusBadge';
import type { LabWorkOrderStatus } from '../types';

type SortKey = 'workOrderNumber' | 'patient' | 'labPartner' | 'status' | 'deadline' | 'total' | 'createdAt';
type SortDir = 'asc' | 'desc';

const ALL_STATUSES: LabWorkOrderStatus[] = [
  'draft', 'sent', 'in_progress', 'ready', 'delivered', 'accepted', 'revision', 'cancelled',
];

export function LabWorkOrdersPage() {
  const { t } = useSettings();
  const navigate = useNavigate();
  const { patients } = usePatients();
  const { workOrders, partners, loading, loadWorkOrders, loadPartners } = useLabWorkOrders();

  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterLabPartner, setFilterLabPartner] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => { loadPartners(); }, [loadPartners]);
  useEffect(() => { loadWorkOrders(); }, [loadWorkOrders]);

  const getPatientName = (patientId: string) => {
    const p = patients.find((pt) => pt.patientId === patientId);
    return p ? formatPatientName(p.lastName, p.firstName, p.title) : patientId;
  };

  const getLabName = (labPartnerId: string) => {
    const lp = partners.find((p) => p.labPartnerId === labPartnerId);
    return lp?.labName ?? labPartnerId;
  };

  // Filter + search
  const filtered = useMemo(() => {
    let list = [...workOrders];

    if (filterStatus) {
      list = list.filter((o) => o.status === filterStatus);
    }
    if (filterLabPartner) {
      list = list.filter((o) => o.labPartnerId === filterLabPartner);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((o) => {
        const patientName = getPatientName(o.patientId).toLowerCase();
        const labName = getLabName(o.labPartnerId).toLowerCase();
        return (
          o.workOrderNumber.toLowerCase().includes(q) ||
          patientName.includes(q) ||
          labName.includes(q) ||
          (o.shade || '').toLowerCase().includes(q)
        );
      });
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'workOrderNumber':
          cmp = a.workOrderNumber.localeCompare(b.workOrderNumber);
          break;
        case 'patient':
          cmp = getPatientName(a.patientId).localeCompare(getPatientName(b.patientId));
          break;
        case 'labPartner':
          cmp = getLabName(a.labPartnerId).localeCompare(getLabName(b.labPartnerId));
          break;
        case 'status':
          cmp = ALL_STATUSES.indexOf(a.status) - ALL_STATUSES.indexOf(b.status);
          break;
        case 'deadline':
          cmp = (a.requestedDeadline || '').localeCompare(b.requestedDeadline || '');
          break;
        case 'total':
          cmp = (a.totalPrice ?? 0) - (b.totalPrice ?? 0);
          break;
        case 'createdAt':
        default:
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [workOrders, filterStatus, filterLabPartner, searchQuery, sortKey, sortDir, patients, partners]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return (
      <span className="ml-1 text-dental-500">{sortDir === 'asc' ? '▲' : '▼'}</span>
    );
  };

  // Status counts for quick filters
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of workOrders) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return counts;
  }, [workOrders]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-theme-primary">
          {t.lab?.workOrders ?? 'Munkalapok'}
        </h1>
        <Button onClick={() => navigate('/lab/new')}>
          {t.lab?.newWorkOrder ?? 'Új munkalap'}
        </Button>
      </div>

      {/* Quick status pills */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            !filterStatus
              ? 'bg-dental-600 text-white'
              : 'bg-theme-hover text-theme-secondary hover:bg-theme-tertiary'
          }`}
          onClick={() => setFilterStatus('')}
        >
          {t.common?.all ?? 'Mind'} ({workOrders.length})
        </button>
        {ALL_STATUSES.filter((s) => statusCounts[s]).map((s) => (
          <button
            key={s}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterStatus === s
                ? 'bg-dental-600 text-white'
                : 'bg-theme-hover text-theme-secondary hover:bg-theme-tertiary'
            }`}
            onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
          >
            <LabWorkOrderStatusBadge status={s} /> ({statusCounts[s]})
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            className="w-full px-3 py-2 border border-theme-secondary rounded-lg bg-theme-input text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-dental-500"
            placeholder={t.lab?.searchPlaceholder ?? 'Keresés szám, páciens, labor...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            value={filterLabPartner}
            onChange={(e) => setFilterLabPartner(e.target.value)}
            options={[
              { value: '', label: t.lab?.allLabs ?? 'Minden labor' },
              ...partners.map((p) => ({ value: p.labPartnerId, label: p.labName })),
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent noPadding>
          {loading ? (
            <p className="text-theme-secondary py-8 text-center">{t.common.loading ?? 'Betöltés...'}</p>
          ) : filtered.length === 0 ? (
            <p className="text-theme-secondary py-8 text-center">{t.lab?.noWorkOrders ?? 'Nincs munkalap.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-theme-primary">
                <thead className="bg-theme-tertiary">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-theme-tertiary uppercase cursor-pointer select-none"
                      onClick={() => toggleSort('workOrderNumber')}
                    >
                      {t.lab?.workOrderNumber ?? 'Szám'} <SortIcon col="workOrderNumber" />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-theme-tertiary uppercase cursor-pointer select-none"
                      onClick={() => toggleSort('patient')}
                    >
                      {t.lab?.patient ?? 'Páciens'} <SortIcon col="patient" />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-theme-tertiary uppercase cursor-pointer select-none"
                      onClick={() => toggleSort('labPartner')}
                    >
                      {t.lab?.labPartner ?? 'Labor'} <SortIcon col="labPartner" />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-theme-tertiary uppercase cursor-pointer select-none"
                      onClick={() => toggleSort('status')}
                    >
                      {t.lab?.status ?? 'Státusz'} <SortIcon col="status" />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-theme-tertiary uppercase cursor-pointer select-none"
                      onClick={() => toggleSort('deadline')}
                    >
                      {t.lab?.deadline ?? 'Határidő'} <SortIcon col="deadline" />
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-medium text-theme-tertiary uppercase cursor-pointer select-none"
                      onClick={() => toggleSort('total')}
                    >
                      {t.lab?.total ?? 'Összeg'} <SortIcon col="total" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-theme-tertiary uppercase">
                      {t.common.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-primary">
                  {filtered.map((order) => {
                    const isOverdue =
                      order.requestedDeadline &&
                      !['delivered', 'accepted', 'cancelled'].includes(order.status) &&
                      new Date(order.requestedDeadline) < new Date();

                    return (
                      <tr
                        key={order.workOrderId}
                        className={`hover:bg-theme-hover transition-colors cursor-pointer ${
                          order.status === 'cancelled' ? 'opacity-50' : ''
                        }`}
                        onClick={() => navigate(`/lab/${order.workOrderId}`)}
                      >
                        <td className="px-4 py-3 text-sm font-mono font-medium text-theme-primary">
                          {order.workOrderNumber}
                          {order.priority === 'urgent' && (
                            <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 text-xs rounded font-sans">
                              {t.lab?.urgent ?? 'Sürgős'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-theme-primary">
                          {getPatientName(order.patientId)}
                        </td>
                        <td className="px-4 py-3 text-sm text-theme-secondary">
                          {getLabName(order.labPartnerId)}
                        </td>
                        <td className="px-4 py-3">
                          <LabWorkOrderStatusBadge status={order.status} />
                        </td>
                        <td className={`px-4 py-3 text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-theme-secondary'}`}>
                          {order.requestedDeadline
                            ? formatDate(order.requestedDeadline)
                            : '—'}
                          {isOverdue && (
                            <span className="ml-1 text-xs">{t.lab?.overdue ?? '(lejárt)'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-theme-primary">
                          {order.totalPrice != null
                            ? formatCurrency(order.totalPrice, order.currency as 'HUF' | 'EUR')
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Link to={`/lab/${order.workOrderId}`}>
                            <Button variant="secondary" size="sm">
                              {t.common.edit}
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
