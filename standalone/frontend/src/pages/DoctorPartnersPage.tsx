import { useState, useEffect } from 'react';
import { apiFetch } from '../context/AuthContext';

interface DoctorPartner {
  doctorPartnerId: string;
  doctorName: string;
  clinicName: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxNumber: string | null;
  notes: string | null;
  isActive: boolean;
}

const emptyForm = {
  doctorName: '',
  clinicName: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  taxNumber: '',
  notes: '',
  isActive: true,
};

export function DoctorPartnersPage() {
  const [partners, setPartners] = useState<DoctorPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    apiFetch('/doctor-partners')
      .then(setPartners)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (p: DoctorPartner) => {
    setForm({
      doctorName: p.doctorName,
      clinicName: p.clinicName || '',
      contactName: p.contactName || '',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      taxNumber: p.taxNumber || '',
      notes: p.notes || '',
      isActive: p.isActive,
    });
    setEditingId(p.doctorPartnerId);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await apiFetch(`/doctor-partners/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
    } else {
      await apiFetch('/doctor-partners', {
        method: 'POST',
        body: JSON.stringify(form),
      });
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Biztosan törli ezt a partnert?')) return;
    await apiFetch(`/doctor-partners/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Orvosok / Rendelők</h1>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-dental-600 hover:bg-dental-700 text-white font-medium rounded-lg text-sm transition-colors"
        >
          Új partner
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <p className="text-gray-500 py-8 text-center">Betöltés...</p>
        ) : partners.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">Még nincsenek orvos partnerek.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orvos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rendelő</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {partners.map((p) => (
                <tr key={p.doctorPartnerId} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!p.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{p.doctorName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.clinicName || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.email || '—'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md"
                    >
                      Szerkesztés
                    </button>
                    <button
                      onClick={() => handleDelete(p.doctorPartnerId)}
                      className="px-3 py-1 text-sm bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md"
                    >
                      Törlés
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingId ? 'Partner szerkesztése' : 'Új partner'}
              </h2>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <Field label="Orvos neve *" value={form.doctorName} onChange={(v) => setForm({ ...form, doctorName: v })} required />
              <Field label="Rendelő neve" value={form.clinicName} onChange={(v) => setForm({ ...form, clinicName: v })} />
              <Field label="Kapcsolattartó" value={form.contactName} onChange={(v) => setForm({ ...form, contactName: v })} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
              </div>
              <Field label="Cím" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              <Field label="Adószám" value={form.taxNumber} onChange={(v) => setForm({ ...form, taxNumber: v })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Megjegyzés</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-dental-600 hover:bg-dental-700 rounded-lg font-medium"
                >
                  Mentés
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', required = false,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500"
      />
    </div>
  );
}
