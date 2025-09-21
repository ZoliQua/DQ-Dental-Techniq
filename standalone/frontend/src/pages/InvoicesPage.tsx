import { useState, useEffect } from 'react';
import { apiFetch } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

interface DoctorPartner { doctorPartnerId: string; doctorName: string; clinicName: string | null; }
interface InvoiceItem { itemId: string; description: string; quantity: number; unitPrice: number; totalPrice: number; workOrderId: string | null; }
interface Invoice {
  invoiceId: string; invoiceNumber: string; doctorPartnerId: string;
  doctorPartner: DoctorPartner; status: string; issueDate: string;
  dueDate: string | null; paidAt: string | null; totalAmount: number;
  currency: string; notes: string | null; items: InvoiceItem[];
}

const emptyItem = { description: '', quantity: 1, unitPrice: 0, workOrderId: '' };
const emptyForm = { doctorPartnerId: '', issueDate: '', dueDate: '', currency: 'HUF', notes: '', items: [{ ...emptyItem }] };

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  issued: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function InvoicesPage() {
  const { t } = useI18n();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [doctors, setDoctors] = useState<DoctorPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    const qs = filterStatus ? `?status=${filterStatus}` : '';
    apiFetch(`/invoices${qs}`).then(setInvoices).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [filterStatus]);
  useEffect(() => { apiFetch('/doctor-partners').then(setDoctors).catch(() => {}); }, []);

  const openNew = () => {
    setForm({ ...emptyForm, items: [{ ...emptyItem }] });
    setEditingId(null); setModalOpen(true);
  };
  const openEdit = (inv: Invoice) => {
    setForm({
      doctorPartnerId: inv.doctorPartnerId,
      issueDate: inv.issueDate?.slice(0, 10) || '',
      dueDate: inv.dueDate?.slice(0, 10) || '',
      currency: inv.currency,
      notes: inv.notes || '',
      items: inv.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, workOrderId: it.workOrderId || '' })),
    });
    setEditingId(inv.invoiceId); setModalOpen(true);
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      items: form.items.filter((it) => it.description.trim()),
    };
    if (editingId) { await apiFetch(`/invoices/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) }); }
    else { await apiFetch('/invoices', { method: 'POST', body: JSON.stringify(payload) }); }
    setModalOpen(false); load();
  };
  const handleStatus = async (id: string, status: string) => {
    await apiFetch(`/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  };
  const handleDelete = async (id: string) => {
    if (!confirm(t.invoices.deleteConfirm)) return;
    await apiFetch(`/invoices/${id}`, { method: 'DELETE' }); load();
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };
  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { draft: t.invoices.statusDraft, issued: t.invoices.statusIssued, paid: t.invoices.statusPaid, cancelled: t.invoices.statusCancelled };
    return map[s] || s;
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('hu-HU').format(amount) + ' ' + currency;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.invoices.title}</h1>
        <button onClick={openNew} className="px-4 py-2 bg-dental-600 hover:bg-dental-700 text-white font-medium rounded-lg text-sm transition-colors">{t.invoices.newInvoice}</button>
      </div>
      <div className="flex gap-2">
        {['', 'draft', 'issued', 'paid', 'cancelled'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filterStatus === s ? 'bg-dental-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
            {s ? statusLabel(s) : t.common.all}
          </button>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? <p className="text-gray-500 py-8 text-center">{t.common.loading}</p> : invoices.length === 0 ? <p className="text-gray-500 py-8 text-center">{t.invoices.noInvoices}</p> : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.invoices.invoiceNumber}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.invoices.doctorPartner}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.invoices.status}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.invoices.issueDate}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.invoices.totalAmount}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {invoices.map((inv) => (
                <tr key={inv.invoiceId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{inv.doctorPartner.doctorName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[inv.status] || ''}`}>{statusLabel(inv.status)}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{inv.issueDate?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">{formatAmount(inv.totalAmount, inv.currency)}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    {inv.status === 'draft' && (
                      <>
                        <button onClick={() => openEdit(inv)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md">{t.common.edit}</button>
                        <button onClick={() => handleStatus(inv.invoiceId, 'issued')} className="px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-md">{t.invoices.markIssued}</button>
                      </>
                    )}
                    {inv.status === 'issued' && (
                      <button onClick={() => handleStatus(inv.invoiceId, 'paid')} className="px-2 py-1 text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-md">{t.invoices.markPaid}</button>
                    )}
                    {(inv.status === 'draft' || inv.status === 'issued') && (
                      <button onClick={() => handleStatus(inv.invoiceId, 'cancelled')} className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md">{t.invoices.markCancelled}</button>
                    )}
                    {inv.status === 'draft' && (
                      <button onClick={() => handleDelete(inv.invoiceId)} className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md">{t.common.delete}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editingId ? t.invoices.editInvoice : t.invoices.newInvoice}</h2>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.invoices.doctorPartner} *</label>
                <select value={form.doctorPartnerId} onChange={(e) => setForm({ ...form, doctorPartnerId: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500">
                  <option value="">—</option>
                  {doctors.map((d) => <option key={d.doctorPartnerId} value={d.doctorPartnerId}>{d.doctorName}{d.clinicName ? ` (${d.clinicName})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.invoices.issueDate}</label>
                  <input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.invoices.dueDate}</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.invoices.currency}</label>
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500">
                    <option value="HUF">HUF</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              {/* Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.invoices.items}</label>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <input type="text" placeholder={t.invoices.description} value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500" />
                      <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500" />
                      <input type="number" min="0" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500" />
                      <span className="w-28 py-2 text-sm text-right text-gray-700 dark:text-gray-300 font-medium">{new Intl.NumberFormat('hu-HU').format(item.quantity * item.unitPrice)}</span>
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addItem} className="mt-2 text-sm text-dental-600 hover:text-dental-700 font-medium">{t.invoices.addItem}</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.invoices.notes}</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg">{t.common.cancel}</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-dental-600 hover:bg-dental-700 rounded-lg font-medium">{t.common.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
