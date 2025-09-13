import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSettings } from '../../../context/SettingsContext';
import { usePatients } from '../../../hooks';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  Input,
  TextArea,
  Select,
  Modal,
} from '../../../components/common';
import { formatCurrency, formatPatientName } from '../../../utils';
import { useLabWorkOrders } from '../hooks/useLabWorkOrders';
import type { LabWorkOrderInput, LabWorkOrderItemInput, LabWorkOrder } from '../types';

const SHADE_OPTIONS = [
  'A1','A2','A3','A3.5','A4',
  'B1','B2','B3','B4',
  'C1','C2','C3','C4',
  'D2','D3','D4',
  'BL1','BL2','BL3','BL4',
];

const emptyItem: LabWorkOrderItemInput = {
  catalogItemId: null,
  description: '',
  tooth: null,
  quantity: 1,
  unitPrice: null,
};

export function LabWorkOrderEditorPage() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();
  const { t } = useSettings();
  const { patients } = usePatients();
  const { partners, loadPartners, getWorkOrder, create, update } = useLabWorkOrders();

  const isEditing = Boolean(workOrderId);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingOrder, setExistingOrder] = useState<LabWorkOrder | null>(null);

  // Form state
  const [patientId, setPatientId] = useState('');
  const [labPartnerId, setLabPartnerId] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [toothNotation, setToothNotation] = useState('');
  const [shade, setShade] = useState('');
  const [material, setMaterial] = useState('');
  const [upperImpression, setUpperImpression] = useState(false);
  const [lowerImpression, setLowerImpression] = useState(false);
  const [bite, setBite] = useState(false);
  const [facebow, setFacebow] = useState(false);
  const [photos, setPhotos] = useState(false);
  const [notes, setNotes] = useState('');
  const [requestedDeadline, setRequestedDeadline] = useState('');
  const [currency, setCurrency] = useState('HUF');
  const [items, setItems] = useState<LabWorkOrderItemInput[]>([{ ...emptyItem }]);

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);

  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 20);
    const q = patientSearch.toLowerCase();
    return patients
      .filter((p) => {
        const name = `${p.lastName} ${p.firstName}`.toLowerCase();
        return name.includes(q) || (p.phone || '').includes(q);
      })
      .slice(0, 20);
  }, [patients, patientSearch]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.patientId === patientId),
    [patients, patientId],
  );

  // Load partners on mount
  useEffect(() => { loadPartners(); }, [loadPartners]);

  // Load existing work order
  useEffect(() => {
    if (!workOrderId) return;
    setLoading(true);
    getWorkOrder(workOrderId)
      .then((order) => {
        setExistingOrder(order);
        setPatientId(order.patientId);
        setLabPartnerId(order.labPartnerId);
        setPriority(order.priority as 'normal' | 'urgent');
        setToothNotation(order.toothNotation || '');
        setShade(order.shade || '');
        setMaterial(order.material || '');
        setUpperImpression(order.upperImpression);
        setLowerImpression(order.lowerImpression);
        setBite(order.bite);
        setFacebow(order.facebow);
        setPhotos(order.photos);
        setNotes(order.notes || '');
        setRequestedDeadline(order.requestedDeadline ? order.requestedDeadline.slice(0, 10) : '');
        setCurrency(order.currency);
        if (order.items && order.items.length > 0) {
          setItems(
            order.items.map((it) => ({
              catalogItemId: it.catalogItemId ?? null,
              description: it.description,
              tooth: it.tooth ?? null,
              quantity: it.quantity,
              unitPrice: it.unitPrice ?? null,
            })),
          );
        }
      })
      .finally(() => setLoading(false));
  }, [workOrderId, getWorkOrder]);

  // Item helpers
  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);

  const removeItem = (index: number) =>
    setItems((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof LabWorkOrderItemInput, value: string | number | null) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  const totalPrice = useMemo(
    () => items.reduce((sum, it) => sum + (it.unitPrice ?? 0) * (it.quantity || 1), 0),
    [items],
  );

  const canSave = patientId && labPartnerId && items.some((it) => it.description.trim());

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const data: LabWorkOrderInput = {
        patientId,
        labPartnerId,
        priority,
        toothNotation: toothNotation || null,
        shade: shade || null,
        material: material || null,
        upperImpression,
        lowerImpression,
        bite,
        facebow,
        photos,
        notes: notes || null,
        requestedDeadline: requestedDeadline || null,
        currency,
        items: items.filter((it) => it.description.trim()),
      };

      if (isEditing && workOrderId) {
        await update(workOrderId, data);
      } else {
        await create(data);
      }
      navigate('/lab');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-theme-secondary">{t.common.loading ?? 'Betöltés...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-theme-primary">
          {isEditing
            ? `${t.lab?.editWorkOrder ?? 'Munkalap szerkesztése'} — ${existingOrder?.workOrderNumber ?? ''}`
            : (t.lab?.newWorkOrder ?? 'Új munkalap')}
        </h1>
        <Button variant="secondary" onClick={() => navigate('/lab')}>
          {t.common.back ?? 'Vissza'}
        </Button>
      </div>

      {/* Patient + Lab partner */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{t.lab?.orderInfo ?? 'Megrendelés adatok'}</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient selector */}
            <div className="relative">
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                {t.lab?.patient ?? 'Páciens'} <span className="text-red-500">*</span>
              </label>
              {selectedPatient ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 border border-theme-secondary rounded-lg bg-theme-input text-theme-primary text-sm">
                    {formatPatientName(selectedPatient.lastName, selectedPatient.firstName, selectedPatient.title)}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setPatientId(''); setPatientSearch(''); }}>
                    ✕
                  </Button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-theme-secondary rounded-lg bg-theme-input text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-dental-500"
                    placeholder={t.lab?.searchPatient ?? 'Páciens keresése...'}
                    value={patientSearch}
                    onChange={(e) => { setPatientSearch(e.target.value); setPatientDropdownOpen(true); }}
                    onFocus={() => setPatientDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setPatientDropdownOpen(false), 200)}
                  />
                  {patientDropdownOpen && filteredPatients.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-theme-secondary border border-theme-primary rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredPatients.map((p) => (
                        <button
                          key={p.patientId}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-theme-primary hover:bg-theme-hover"
                          onMouseDown={() => {
                            setPatientId(p.patientId);
                            setPatientSearch('');
                            setPatientDropdownOpen(false);
                          }}
                        >
                          {formatPatientName(p.lastName, p.firstName, p.title)}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Lab partner selector */}
            <Select
              label={`${t.lab?.labPartner ?? 'Labor'} *`}
              value={labPartnerId}
              onChange={(e) => setLabPartnerId(e.target.value)}
              required
              options={[
                { value: '', label: t.lab?.selectLab ?? '— Válasszon labort —' },
                ...partners
                  .filter((p) => p.isActive)
                  .map((p) => ({ value: p.labPartnerId, label: p.labName })),
              ]}
            />

            {/* Priority */}
            <Select
              label={t.lab?.priority ?? 'Prioritás'}
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'normal' | 'urgent')}
              options={[
                { value: 'normal', label: t.lab?.priorityNormal ?? 'Normál' },
                { value: 'urgent', label: t.lab?.priorityUrgent ?? 'Sürgős' },
              ]}
            />

            {/* Deadline */}
            <Input
              label={t.lab?.requestedDeadline ?? 'Kért határidő'}
              type="date"
              value={requestedDeadline}
              onChange={(e) => setRequestedDeadline(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Technical details */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{t.lab?.technicalDetails ?? 'Technikai adatok'}</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label={t.lab?.toothNotation ?? 'Érintett fogak'}
              placeholder="pl. 11, 12, 21"
              value={toothNotation}
              onChange={(e) => setToothNotation(e.target.value)}
            />

            {/* Shade selector */}
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                {t.lab?.shade ?? 'Fogszín'}
              </label>
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 border border-theme-secondary rounded-lg bg-theme-input text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-dental-500"
                  value={shade}
                  onChange={(e) => setShade(e.target.value)}
                >
                  <option value="">—</option>
                  {SHADE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input
                  type="text"
                  className="w-20 px-2 py-2 border border-theme-secondary rounded-lg bg-theme-input text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-dental-500"
                  placeholder={t.lab?.customShade ?? 'Egyéb'}
                  value={SHADE_OPTIONS.includes(shade) ? '' : shade}
                  onChange={(e) => setShade(e.target.value)}
                />
              </div>
            </div>

            <Input
              label={t.lab?.material ?? 'Anyag'}
              placeholder={t.lab?.materialPlaceholder ?? 'pl. Cirkónium, E.max'}
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            />
          </div>

          {/* Attachments checkboxes */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              {t.lab?.attachments ?? 'Mellékletek'}
            </label>
            <div className="flex flex-wrap gap-4">
              {[
                { key: 'upperImpression', label: t.lab?.upperImpression ?? 'Felső lenyomat', value: upperImpression, set: setUpperImpression },
                { key: 'lowerImpression', label: t.lab?.lowerImpression ?? 'Alsó lenyomat', value: lowerImpression, set: setLowerImpression },
                { key: 'bite', label: t.lab?.bite ?? 'Harapás', value: bite, set: setBite },
                { key: 'facebow', label: t.lab?.facebow ?? 'Arcív', value: facebow, set: setFacebow },
                { key: 'photos', label: t.lab?.photos ?? 'Fotók', value: photos, set: setPhotos },
              ].map((cb) => (
                <label key={cb.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cb.value}
                    onChange={(e) => cb.set(e.target.checked)}
                    className="rounded border-theme-secondary text-dental-600 focus:ring-dental-500"
                  />
                  <span className="text-sm text-theme-primary">{cb.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t.lab?.workItems ?? 'Megrendelt munkák'}</h2>
            <Button size="sm" onClick={addItem}>
              {t.lab?.addItem ?? '+ Tétel'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Header row */}
            <div className="hidden md:grid md:grid-cols-[60px_1fr_80px_100px_100px_40px] gap-2 text-xs font-medium text-theme-tertiary uppercase px-1">
              <span>{t.lab?.tooth ?? 'Fog'}</span>
              <span>{t.lab?.itemDescription ?? 'Megnevezés'}</span>
              <span>{t.lab?.qty ?? 'Db'}</span>
              <span>{t.lab?.unitPrice ?? 'Egységár'}</span>
              <span>{t.lab?.lineTotal ?? 'Összesen'}</span>
              <span />
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-[60px_1fr_80px_100px_100px_40px] gap-2 items-start p-2 bg-theme-tertiary rounded-lg"
              >
                <input
                  type="text"
                  className="px-2 py-1.5 border border-theme-secondary rounded bg-theme-input text-theme-primary text-sm focus:outline-none focus:ring-1 focus:ring-dental-500"
                  placeholder="11"
                  value={item.tooth || ''}
                  onChange={(e) => updateItem(index, 'tooth', e.target.value || null)}
                />
                <input
                  type="text"
                  className="px-2 py-1.5 border border-theme-secondary rounded bg-theme-input text-theme-primary text-sm focus:outline-none focus:ring-1 focus:ring-dental-500"
                  placeholder={t.lab?.itemDescriptionPlaceholder ?? 'Munka megnevezése'}
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                />
                <input
                  type="number"
                  min={1}
                  className="px-2 py-1.5 border border-theme-secondary rounded bg-theme-input text-theme-primary text-sm text-center focus:outline-none focus:ring-1 focus:ring-dental-500"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                />
                <input
                  type="number"
                  min={0}
                  className="px-2 py-1.5 border border-theme-secondary rounded bg-theme-input text-theme-primary text-sm text-right focus:outline-none focus:ring-1 focus:ring-dental-500"
                  placeholder="0"
                  value={item.unitPrice ?? ''}
                  onChange={(e) => updateItem(index, 'unitPrice', e.target.value ? Number(e.target.value) : null)}
                />
                <div className="px-2 py-1.5 text-sm text-theme-primary text-right font-medium">
                  {item.unitPrice != null
                    ? formatCurrency((item.unitPrice ?? 0) * (item.quantity || 1), currency as 'HUF' | 'EUR')
                    : '—'}
                </div>
                <button
                  type="button"
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-30"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                  title={t.common.delete ?? 'Törlés'}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex justify-between items-center">
            <div className="text-sm text-theme-secondary">
              {items.filter((it) => it.description.trim()).length} {t.lab?.itemCount ?? 'tétel'}
            </div>
            <div className="text-lg font-bold text-theme-primary">
              {t.lab?.total ?? 'Összesen'}: {formatCurrency(totalPrice, currency as 'HUF' | 'EUR')}
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{t.lab?.notes ?? 'Megjegyzések'}</h2>
        </CardHeader>
        <CardContent>
          <TextArea
            label={t.lab?.doctorNotes ?? 'Orvos megjegyzése a labor felé'}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.lab?.notesPlaceholder ?? 'Speciális utasítások, kérések...'}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="secondary" onClick={() => navigate('/lab')}>
          {t.common.cancel}
        </Button>
        <Button onClick={handleSave} disabled={!canSave || saving}>
          {saving
            ? (t.common.saving ?? 'Mentés...')
            : isEditing
              ? (t.common.save ?? 'Mentés')
              : (t.lab?.createWorkOrder ?? 'Munkalap létrehozása')}
        </Button>
      </div>
    </div>
  );
}
