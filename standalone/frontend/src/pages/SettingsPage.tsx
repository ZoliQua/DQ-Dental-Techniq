import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../context/I18nContext';
import { apiFetch } from '../context/AuthContext';

interface LabSettings {
  labName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
  bankAccount: string | null;
  notes: string | null;
}

interface ApiKeyRecord {
  apiKeyId: string;
  name: string;
  permissions: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export function SettingsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<'lab' | 'apikeys'>('lab');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {t.settings.title}
      </h1>

      {/* Tab selector */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab('lab')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'lab'
              ? 'border-dental-600 text-dental-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t.settings.labInfo}
        </button>
        <button
          onClick={() => setTab('apikeys')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'apikeys'
              ? 'border-dental-600 text-dental-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t.settings.apiKeys}
        </button>
      </div>

      {tab === 'lab' && <LabInfoTab />}
      {tab === 'apikeys' && <ApiKeysTab />}
    </div>
  );
}

// ─── Lab Info Tab ──────────────────────────────────────────────────

function LabInfoTab() {
  const { t } = useI18n();
  const [form, setForm] = useState<LabSettings>({
    labName: '',
    address: null,
    phone: null,
    email: null,
    taxNumber: null,
    bankAccount: null,
    notes: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiFetch('/settings/lab')
      .then((data) => {
        setForm({
          labName: data.labName || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          taxNumber: data.taxNumber || '',
          bankAccount: data.bankAccount || '',
          notes: data.notes || '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await apiFetch('/settings/lab', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setMessage(t.settings.saved);
      setTimeout(() => setMessage(''), 3000);
    } catch {
      // error handled by apiFetch
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500">{t.common.loading}</p>;
  }

  const fields: { key: keyof LabSettings; label: string; type?: string }[] = [
    { key: 'labName', label: t.settings.labName },
    { key: 'address', label: t.settings.address },
    { key: 'phone', label: t.settings.phone, type: 'tel' },
    { key: 'email', label: t.settings.email, type: 'email' },
    { key: 'taxNumber', label: t.settings.taxNumber },
    { key: 'bankAccount', label: t.settings.bankAccount },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 max-w-2xl">
      <div className="space-y-4">
        {fields.map(({ key, label, type }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {label}
            </label>
            <input
              type={type || 'text'}
              value={form[key] || ''}
              onChange={(e) => setForm({ ...form, [key]: e.target.value || null })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500"
            />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t.settings.notes}
          </label>
          <textarea
            rows={3}
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-dental-600 text-white rounded-lg text-sm font-medium hover:bg-dental-700 disabled:opacity-50 transition-colors"
        >
          {saving ? t.common.wait : t.common.save}
        </button>
        {message && (
          <span className="text-sm text-green-600 dark:text-green-400">{message}</span>
        )}
      </div>
    </div>
  );
}

// ─── API Keys Tab ──────────────────────────────────────────────────

function ApiKeysTab() {
  const { t } = useI18n();
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadKeys = useCallback(async () => {
    try {
      const data = await apiFetch('/external/api-keys');
      setKeys(data);
    } catch {
      // error handled by apiFetch
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const data = await apiFetch('/external/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      setCreatedKey(data.apiKey);
      setNewKeyName('');
      loadKeys();
    } catch {
      // error handled by apiFetch
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (apiKeyId: string) => {
    if (!confirm(t.settings.revokeConfirm)) return;
    try {
      await apiFetch(`/external/api-keys/${apiKeyId}`, { method: 'DELETE' });
      loadKeys();
    } catch {
      // error handled by apiFetch
    }
  };

  const handleCopy = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <p className="text-gray-500">{t.common.loading}</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Create new key */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t.settings.createApiKey}
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder={t.settings.apiKeyName}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-dental-500"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newKeyName.trim()}
            className="px-4 py-2 bg-dental-600 text-white rounded-lg text-sm font-medium hover:bg-dental-700 disabled:opacity-50 transition-colors"
          >
            {creating ? t.common.wait : t.common.create}
          </button>
        </div>

        {/* Show created key */}
        {createdKey && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              {t.settings.keyWarning}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white dark:bg-gray-800 p-2 rounded border border-yellow-300 dark:border-yellow-600 font-mono break-all text-gray-900 dark:text-gray-100">
                {createdKey}
              </code>
              <button
                onClick={() => handleCopy(createdKey)}
                className="px-3 py-1.5 text-xs bg-yellow-600 text-white rounded font-medium hover:bg-yellow-700 transition-colors whitespace-nowrap"
              >
                {copied ? t.settings.keyCopied : t.settings.copyKey}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Key list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {keys.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">{t.settings.noApiKeys}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-3">{t.settings.apiKeyName}</th>
                <th className="px-4 py-3">{t.settings.permissions}</th>
                <th className="px-4 py-3">{t.settings.lastUsed}</th>
                <th className="px-4 py-3">{t.settings.createdAt}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {keys.map((key) => (
                <tr key={key.apiKeyId} className={key.isActive ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                    {key.name}
                    <span
                      className={`ml-2 inline-block text-xs px-1.5 py-0.5 rounded ${
                        key.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {key.isActive ? t.settings.active : t.settings.revoked}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {key.permissions}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleDateString()
                      : t.settings.never}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {key.isActive && (
                      <button
                        onClick={() => handleRevoke(key.apiKeyId)}
                        className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                      >
                        {t.settings.revokeKey}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
