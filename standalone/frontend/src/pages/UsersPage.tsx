import { useState, useEffect } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

interface UserRecord { userId: string; email: string; fullName: string; role: string; isActive: boolean; createdAt: string; }
const emptyForm = { fullName: '', email: '', password: '', role: 'technician', isActive: true };

export function UsersPage() {
  const { t } = useI18n();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    apiFetch('/users').then(setUsers).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew = () => { setForm({ ...emptyForm }); setEditingId(null); setModalOpen(true); };
  const openEdit = (u: UserRecord) => {
    setForm({ fullName: u.fullName, email: u.email, password: '', role: u.role, isActive: u.isActive });
    setEditingId(u.userId); setModalOpen(true);
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...form };
    if (editingId && !payload.password) delete payload.password;
    if (editingId) { await apiFetch(`/users/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) }); }
    else { await apiFetch('/users', { method: 'POST', body: JSON.stringify(payload) }); }
    setModalOpen(false); load();
  };
  const handleDeactivate = async (id: string) => {
    if (id === currentUser?.userId) { alert(t.users.cannotDeleteSelf); return; }
    if (!confirm(t.users.deleteConfirm)) return;
    await apiFetch(`/users/${id}`, { method: 'DELETE' }); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.users.title}</h1>
        <button onClick={openNew} className="px-4 py-2 bg-dental-600 hover:bg-dental-700 text-white font-medium rounded-lg text-sm transition-colors">{t.users.newUser}</button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? <p className="text-gray-500 py-8 text-center">{t.common.loading}</p> : users.length === 0 ? <p className="text-gray-500 py-8 text-center">{t.users.noUsers}</p> : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.users.fullName}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.users.email}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.users.role}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.users.isActive}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users.map((u) => (
                <tr key={u.userId} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!u.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{u.fullName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{t.roles[u.role as keyof typeof t.roles] || u.role}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-block w-2 h-2 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(u)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md">{t.common.edit}</button>
                    {u.userId !== currentUser?.userId && u.isActive && (
                      <button onClick={() => handleDeactivate(u.userId)} className="px-3 py-1 text-sm bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md">{t.common.delete}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editingId ? t.users.editUser : t.users.newUser}</h2>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <Field label={`${t.users.fullName} *`} value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} required />
              <Field label={`${t.users.email} *`} value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" required />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {editingId ? t.users.password : `${t.users.password} *`}
                </label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingId} placeholder={editingId ? t.users.passwordHint : ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.users.role}</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500">
                  <option value="admin">{t.roles.admin}</option>
                  <option value="technician">{t.roles.technician}</option>
                  <option value="receptionist">{t.roles.receptionist}</option>
                </select>
              </div>
              {editingId && (
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                  {t.users.isActive}
                </label>
              )}
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

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-dental-500" />
    </div>
  );
}
