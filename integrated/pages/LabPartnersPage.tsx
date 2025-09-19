import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../../../context/SettingsContext';
import { Button, Card, CardContent, CardHeader, Input, Modal } from '../../../../components/common';
import { fetchLabPartners, createLabPartner, updateLabPartner, deleteLabPartner } from '../api';
import type { LabPartner, LabPartnerInput } from '../../core/types';

const emptyForm: LabPartnerInput = {
  labName: '',
  contactName: null,
  phone: null,
  email: null,
  address: null,
  taxNumber: null,
  notes: null,
  isActive: true,
};

export function LabPartnersPage() {
  const { t } = useSettings();
  const [partners, setPartners] = useState<LabPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LabPartner | null>(null);
  const [form, setForm] = useState<LabPartnerInput>({ ...emptyForm });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setPartners(await fetchLabPartners());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (partner: LabPartner) => {
    setEditing(partner);
    setForm({
      labName: partner.labName,
      contactName: partner.contactName ?? null,
      phone: partner.phone ?? null,
      email: partner.email ?? null,
      address: partner.address ?? null,
      taxNumber: partner.taxNumber ?? null,
      notes: partner.notes ?? null,
      isActive: partner.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (editing) {
      await updateLabPartner(editing.labPartnerId, form);
    } else {
      await createLabPartner(form);
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async (partner: LabPartner) => {
    if (!confirm(t.lab?.deleteConfirm ?? 'Biztosan törli?')) return;
    await deleteLabPartner(partner.labPartnerId);
    load();
  };

  const set = (field: keyof LabPartnerInput, value: string | boolean | null) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-theme-primary">
          {t.lab?.partners ?? 'Laborpartnerek'}
        </h1>
        <Button onClick={openCreate}>
          {t.lab?.addPartner ?? 'Új labor'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{t.lab?.partnersList ?? 'Laborpartnerek'}</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-theme-secondary py-4 text-center">{t.common.loading ?? 'Betöltés...'}</p>
          ) : partners.length === 0 ? (
            <p className="text-theme-secondary py-4 text-center">{t.lab?.noPartners ?? 'Nincs még laborpartner.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-theme-primary">
                <thead className="bg-theme-tertiary">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-tertiary uppercase">
                      {t.lab?.labName ?? 'Labor neve'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-tertiary uppercase">
                      {t.lab?.contactName ?? 'Kapcsolattartó'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-tertiary uppercase">
                      {t.lab?.phone ?? 'Telefon'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-tertiary uppercase">
                      {t.lab?.email ?? 'Email'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-tertiary uppercase">
                      {t.lab?.status ?? 'Státusz'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-theme-tertiary uppercase">
                      {t.common.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-primary">
                  {partners.map((partner) => (
                    <tr key={partner.labPartnerId} className={partner.isActive ? '' : 'opacity-50'}>
                      <td className="px-4 py-3 text-sm font-medium text-theme-primary">
                        {partner.labName}
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-secondary">
                        {partner.contactName || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-secondary">
                        {partner.phone || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-secondary">
                        {partner.email || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            partner.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-theme-hover text-theme-secondary'
                          }`}
                        >
                          {partner.isActive ? (t.common.active ?? 'Aktív') : (t.common.inactive ?? 'Inaktív')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(partner)}>
                            {t.common.edit}
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(partner)}>
                            {t.common.delete}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? (t.lab?.editPartner ?? 'Labor szerkesztése') : (t.lab?.addPartner ?? 'Új labor')}
      >
        <div className="space-y-4">
          <Input
            label={t.lab?.labName ?? 'Labor neve'}
            value={form.labName}
            onChange={(e) => set('labName', e.target.value)}
          />
          <Input
            label={t.lab?.contactName ?? 'Kapcsolattartó'}
            value={form.contactName || ''}
            onChange={(e) => set('contactName', e.target.value || null)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t.lab?.phone ?? 'Telefon'}
              value={form.phone || ''}
              onChange={(e) => set('phone', e.target.value || null)}
            />
            <Input
              label={t.lab?.email ?? 'Email'}
              type="email"
              value={form.email || ''}
              onChange={(e) => set('email', e.target.value || null)}
            />
          </div>
          <Input
            label={t.lab?.address ?? 'Cím'}
            value={form.address || ''}
            onChange={(e) => set('address', e.target.value || null)}
          />
          <Input
            label={t.lab?.taxNumber ?? 'Adószám'}
            value={form.taxNumber || ''}
            onChange={(e) => set('taxNumber', e.target.value || null)}
          />
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">
              {t.lab?.notes ?? 'Megjegyzés'}
            </label>
            <textarea
              className="w-full px-3 py-2 border border-theme-secondary rounded-lg text-sm bg-theme-input text-theme-primary focus:outline-none focus:ring-2 focus:ring-dental-500"
              rows={3}
              value={form.notes || ''}
              onChange={(e) => set('notes', e.target.value || null)}
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
                className="rounded border-theme-secondary"
              />
              <span className="text-sm text-theme-secondary">{t.common.active ?? 'Aktív'}</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSave} disabled={!form.labName.trim()}>
              {t.common.save}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
