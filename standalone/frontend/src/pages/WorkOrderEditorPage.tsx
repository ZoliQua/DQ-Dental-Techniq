import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { StatusBadge } from '../components/StatusBadge';

const SHADE_OPTIONS = [
  'A1','A2','A3','A3.5','A4','B1','B2','B3','B4',
  'C1','C2','C3','C4','D2','D3','D4','BL1','BL2','BL3','BL4',
];

interface ItemRow {
  description: string;
  tooth: string;
  quantity: number;
  unitPrice: number | null;
}

const emptyItem: ItemRow = { description: '', tooth: '', quantity: 1, unitPrice: null };

// Valid next statuses for lab workflow
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['in_progress', 'cancelled'],
  sent: ['in_progress', 'cancelled'],
  in_progress: ['ready', 'revision', 'cancelled'],
  ready: ['delivered', 'revision'],
  delivered: ['accepted', 'revision'],
  revision: ['in_progress'],
  accepted: [],
  cancelled: ['draft'],
};

export function WorkOrderEditorPage() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const isEditing = Boolean(workOrderId);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<any>(null);

  // Form
  const [patientId, setPatientId] = useState('');
  const [doctorPartnerId, setDoctorPartnerId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [toothNotation, setToothNotation] = useState('');
  const [shade, setShade] = useState('');
  const [material, setMaterial] = useState('');
  const [upperImpression, setUpperImpression] = useState(false);
  const [lowerImpression, setLowerImpression] = useState(false);
  const [bite, setBite] = useState(false);
  const [facebow, setFacebow] = useState(false);
  const [photos, setPhotos] = useState(false);
  const [notes, setNotes] = useState('');
  const [labNotes, setLabNotes] = useState('');
  const [requestedDeadline, setRequestedDeadline] = useState('');
  const [promisedDeadline, setPromisedDeadline] = useState('');
  const [currency, setCurrency] = useState('HUF');
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyItem }]);

  // Lookups
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);

  // Status change
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    apiFetch('/doctor-partners').then(setDoctors).catch(() => {});
    apiFetch('/patients').then(setPatients).catch(() => {});
  }, []);

  useEffect(() => {
    if (!workOrderId) return;
    setLoading(true);
    apiFetch(`/work-orders/${workOrderId}`)
      .then((o) => {
        setOrder(o);
        setPatientId(o.patientId);
        setDoctorPartnerId(o.doctorPartnerId);
        setPriority(o.priority);
        setToothNotation(o.toothNotation || '');
        setShade(o.shade || '');
        setMaterial(o.material || '');
        setUpperImpression(o.upperImpression);
        setLowerImpression(o.lowerImpression);
        setBite(o.bite);
        setFacebow(o.facebow);
        setPhotos(o.photos);
        setNotes(o.notes || '');
        setLabNotes(o.labNotes || '');
        setRequestedDeadline(o.requestedDeadline ? o.requestedDeadline.split('T')[0] : '');
        setPromisedDeadline(o.promisedDeadline ? o.promisedDeadline.split('T')[0] : '');
        setCurrency(o.currency);
        setItems(o.items?.length ? o.items.map((i: any) => ({
          description: i.description, tooth: i.tooth || '', quantity: i.quantity, unitPrice: i.unitPrice,
        })) : [{ ...emptyItem }]);
      })
      .catch(() => navigate('/work-orders'))
      .finally(() => setLoading(false));
  }, [workOrderId, navigate]);

  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 20);
    const q = patientSearch.toLowerCase();
    return patients.filter((p) => `${p.lastName} ${p.firstName}`.toLowerCase().includes(q)).slice(0, 20);
  }, [patients, patientSearch]);

  const selectedPatient = patients.find((p) => p.patientId === patientId);
  const selectedDoctor = doctors.find((d) => d.doctorPartnerId === doctorPartnerId);

  const totalPrice = items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0);

  const updateItem = (idx: number, field: keyof ItemRow, value: any) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const addItem = () => setItems([...items, { ...emptyItem }]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !doctorPartnerId) return;
    setSaving(true);
    try {
      const payload = {
        patientId, doctorPartnerId, priority, toothNotation: toothNotation || null,
        shade: shade || null, material: material || null,
        upperImpression, lowerImpression, bite, facebow, photos,
        notes: notes || null, requestedDeadline: requestedDeadline || null,
        currency, items: items.filter((i) => i.description.trim()),
      };
      if (isEditing) {
        await apiFetch(`/work-orders/${workOrderId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        const created = await apiFetch('/work-orders', { method: 'POST', body: JSON.stringify(payload) });
        navigate(`/work-orders/${created.workOrderId}`, { replace: true });
        return;
      }
      navigate('/work-orders');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus) return;
    try {
      const payload: any = { status: newStatus };
      if (statusNote) payload.labNotes = statusNote;
      if (promisedDeadline) payload.promisedDeadline = promisedDeadline;
      await apiFetch(`/work-orders/${workOrderId}/status`, { method: 'PATCH', body: JSON.stringify(payload) });
      setStatusModalOpen(false);
      // Reload
      const updated = await apiFetch(`/work-orders/${workOrderId}`);
      setOrder(updated);
      setLabNotes(updated.labNotes || '');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const nextStatuses = order ? (STATUS_TRANSITIONS[order.status] || []) : [];

  if (loading) return <p className="text-gray-500 py-8 text-center">{t.common.loading}</p>;

  const Checkbox = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-dental-600 focus:ring-dental-500" />
      {label}
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/work-orders')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isEditing ? order?.workOrderNumber : t.workOrders.newOrder}
          </h1>
          {order && <StatusBadge status={order.status} />}
          {order?.priority === 'urgent' && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 text-xs rounded font-medium">{t.workOrders.urgent}</span>
          )}
        </div>
        {isEditing && nextStatuses.length > 0 && (
          <div className="flex gap-2">
            {nextStatuses.map((s) => (
              <button key={s} onClick={() => { setNewStatus(s); setStatusNote(''); setStatusModalOpen(true); }}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                {t.statuses[s as keyof typeof t.statuses]}
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Patient + Doctor */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient selector */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.workOrders.patient} *</label>
              {selectedPatient ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100">
                    {selectedPatient.lastName} {selectedPatient.firstName}
                  </span>
                  <button type="button" onClick={() => { setPatientId(''); setPatientSearch(''); }}
                    className="px-2 py-2 text-gray-400 hover:text-gray-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              ) : (
                <div>
                  <input type="text" value={patientSearch} onChange={(e) => { setPatientSearch(e.target.value); setPatientDropdownOpen(true); }}
                    onFocus={() => setPatientDropdownOpen(true)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500"
                    placeholder={t.patients.searchPlaceholder} />
                  {patientDropdownOpen && filteredPatients.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredPatients.map((p) => (
                        <button key={p.patientId} type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                          onClick={() => { setPatientId(p.patientId); setPatientDropdownOpen(false); }}>
                          {p.lastName} {p.firstName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Doctor selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.workOrders.doctor} *</label>
              <select value={doctorPartnerId} onChange={(e) => setDoctorPartnerId(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500">
                <option value="">—</option>
                {doctors.map((d) => <option key={d.doctorPartnerId} value={d.doctorPartnerId}>{d.doctorName}{d.clinicName ? ` (${d.clinicName})` : ''}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.workOrders.priority}</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500">
                <option value="normal">{t.workOrders.normal}</option>
                <option value="urgent">{t.workOrders.urgent}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.workOrders.requestedDeadline}</label>
              <input type="date" value={requestedDeadline} onChange={(e) => setRequestedDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500" />
            </div>
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.workOrders.promisedDeadline}</label>
                <input type="date" value={promisedDeadline} onChange={(e) => setPromisedDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.workOrders.currency}</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500">
                <option value="HUF">HUF</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </div>

        {/* Technical details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">{t.workOrders.toothNotation}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.workOrders.toothNotation}</label>
              <input type="text" value={toothNotation} onChange={(e) => setToothNotation(e.target.value)} placeholder="11, 12, 21..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.workOrders.shade}</label>
              <select value={shade} onChange={(e) => setShade(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500">
                <option value="">—</option>
                {SHADE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.workOrders.material}</label>
              <input type="text" value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Cirkónium, E.max..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <Checkbox checked={upperImpression} onChange={setUpperImpression} label={t.workOrders.upperImpression} />
            <Checkbox checked={lowerImpression} onChange={setLowerImpression} label={t.workOrders.lowerImpression} />
            <Checkbox checked={bite} onChange={setBite} label={t.workOrders.bite} />
            <Checkbox checked={facebow} onChange={setFacebow} label={t.workOrders.facebow} />
            <Checkbox checked={photos} onChange={setPhotos} label={t.workOrders.photos} />
          </div>
        </div>

        {/* Items */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">{t.workOrders.items}</h3>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">{t.workOrders.tooth}</label>
                  <input type="text" value={item.tooth} onChange={(e) => updateItem(idx, 'tooth', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <div className="col-span-5">
                  <label className="block text-xs text-gray-500 mb-1">{t.workOrders.description}</label>
                  <input type="text" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">{t.workOrders.quantity}</label>
                  <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">{t.workOrders.unitPrice}</label>
                  <input type="number" value={item.unitPrice ?? ''} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <div className="col-span-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100 pb-1.5">
                  {(item.unitPrice ?? 0) * item.quantity > 0 ? new Intl.NumberFormat('hu-HU').format((item.unitPrice ?? 0) * item.quantity) : '—'}
                </div>
                <div className="col-span-1 pb-1">
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={addItem} className="text-sm text-dental-600 hover:text-dental-700 font-medium">{t.workOrders.addItem}</button>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t.workOrders.total}: {new Intl.NumberFormat('hu-HU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(totalPrice)}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.workOrders.notes}</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500" />
            </div>
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.workOrders.labNotes}</label>
                <textarea value={labNotes} onChange={(e) => setLabNotes(e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500" />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/work-orders')}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg font-medium">
            {t.common.cancel}
          </button>
          <button type="submit" disabled={saving}
            className="px-6 py-2 text-sm text-white bg-dental-600 hover:bg-dental-700 rounded-lg font-medium disabled:opacity-50">
            {saving ? t.common.wait : t.common.save}
          </button>
        </div>
      </form>

      {/* Status change modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t.statuses[newStatus as keyof typeof t.statuses]}
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.workOrders.labNotes}</label>
              <textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500" />
            </div>
            {(newStatus === 'in_progress' || newStatus === 'ready') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.workOrders.promisedDeadline}</label>
                <input type="date" value={promisedDeadline} onChange={(e) => setPromisedDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500" />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setStatusModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg">{t.common.cancel}</button>
              <button onClick={handleStatusChange}
                className="px-4 py-2 text-sm text-white bg-dental-600 hover:bg-dental-700 rounded-lg font-medium">{t.common.confirm}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
