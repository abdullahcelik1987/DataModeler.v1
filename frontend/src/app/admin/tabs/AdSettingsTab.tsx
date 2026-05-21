'use client';

import React, { useState, useEffect } from 'react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '').replace(/\/api$/, '');

interface LdapConfig {
  server?: string;
  port?: number;
  baseDn?: string;
  adminUsername?: string;
  adminPassword?: string;
  useSSL?: boolean;
}

interface AdSettings {
  ldap?: {
    isEnabled: boolean;
    config: LdapConfig;
    testStatus?: boolean;
    lastTestedAt?: string;
  };
}

const normalizeLdapConfig = (config: any): LdapConfig => {
  const source = config ?? {};

  const readBool = (...keys: string[]): boolean | undefined => {
    for (const key of keys) {
      const value = source?.[key];
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
      }
    }
    return undefined;
  };

  return {
    server: source.server ?? source.host ?? source.ldapServer ?? '',
    port: Number(source.port ?? source.ldapPort ?? 389),
    baseDn: source.baseDn ?? source.baseDN ?? source.searchBase ?? source.dn ?? '',
    adminUsername: source.adminUsername ?? source.bindDn ?? source.bindDN ?? source.username ?? '',
    adminPassword: source.adminPassword ?? source.bindPassword ?? source.password ?? '',
    useSSL: readBool('useSSL', 'useSsl', 'ssl') ?? false
  };
};

export function AdSettingsTab() {
  const [settings, setSettings] = useState<AdSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const cardClass = 'dm-panel p-6';
  const inputClass = 'dm-input';
  const checkboxClass = 'rounded border-slate-300 text-indigo-600 focus:ring-indigo-500';
  const primaryButtonClass = 'dm-btn-secondary h-10';
  const successButtonClass = 'dm-btn-primary h-10';

  const toAdSettings = (payload: any): AdSettings => {
    const ldap = payload?.ldap ?? payload?.Ldap;
    if (!ldap) {
      return { ldap: { isEnabled: false, config: {} } };
    }

    return {
      ldap: {
        ...ldap,
        config: normalizeLdapConfig(ldap.config)
      }
    };
  };

  useEffect(() => {
    fetchAdSettings();
  }, []);

  const fetchAdSettings = async () => {
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Session token is missing. Please sign in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/settings/ad`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message || `Failed to load AD settings (${response.status})`);
        setLoading(false);
        return;
      }

      setSettings(toAdSettings(data));
    } catch (err) {
      setError('Failed to load AD settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Session token is missing. Please sign in again.');
        return;
      }
      const providers = [];

      if (settings.ldap) {
        providers.push({
          type: 'ldap',
          isEnabled: settings.ldap.isEnabled,
          config: settings.ldap.config
        });
      }

      const response = await fetch(`${API_URL}/api/admin/settings/ad`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ providers })
      });

      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        setSuccess('LDAP settings saved successfully');
        await fetchAdSettings();
      } else {
        setError(data?.message || `Failed to save settings (${response.status})`);
      }
    } catch (err) {
      setError('Error saving LDAP settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Session token is missing. Please sign in again.');
        return;
      }

      const config = settings.ldap?.config;

      const response = await fetch(`${API_URL}/api/admin/settings/ad/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: 'ldap',
          config
        })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message || `Connection test failed (${response.status}). Please sign in again.`);
        return;
      }

      if (data.isSuccessful) {
        setSuccess('LDAP connection successful!');
      } else {
        setError(data.message || 'Connection test failed');
      }
    } catch (err) {
      setError('Error testing connection');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Loading AD settings...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="dm-panel p-4">
        <h3 className="text-base font-semibold text-slate-900">Active Directory (LDAP) Configuration</h3>
        <p className="text-xs text-slate-500 mt-1">Use this section to test and persist LDAP integration settings.</p>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">LDAP (On-Premises AD)</h3>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.ldap?.isEnabled ?? false}
              onChange={(e) => setSettings({
                ...settings,
                ldap: {
                  ...settings.ldap,
                  isEnabled: e.target.checked,
                  config: settings.ldap?.config ?? {}
                }
              })}
              className={checkboxClass}
            />
            <span className="ml-2 text-sm text-slate-600">Enable</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Server</label>
            <input
              type="text"
              value={settings.ldap?.config?.server ?? ''}
              onChange={(e) => setSettings({
                ...settings,
                ldap: {
                  ...settings.ldap,
                  isEnabled: settings.ldap?.isEnabled ?? false,
                  config: { ...settings.ldap?.config, server: e.target.value }
                }
              })}
              placeholder="ldap.company.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Port</label>
            <input
              type="number"
              value={settings.ldap?.config?.port ?? 389}
              onChange={(e) => setSettings({
                ...settings,
                ldap: {
                  ...settings.ldap,
                  isEnabled: settings.ldap?.isEnabled ?? false,
                  config: { ...settings.ldap?.config, port: parseInt(e.target.value) }
                }
              })}
              className={inputClass}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Base DN</label>
            <input
              type="text"
              value={settings.ldap?.config?.baseDn ?? ''}
              onChange={(e) => setSettings({
                ...settings,
                ldap: {
                  ...settings.ldap,
                  isEnabled: settings.ldap?.isEnabled ?? false,
                  config: { ...settings.ldap?.config, baseDn: e.target.value }
                }
              })}
              placeholder="dc=company,dc=com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Admin Username</label>
            <input
              type="text"
              value={settings.ldap?.config?.adminUsername ?? ''}
              onChange={(e) => setSettings({
                ...settings,
                ldap: {
                  ...settings.ldap,
                  isEnabled: settings.ldap?.isEnabled ?? false,
                  config: { ...settings.ldap?.config, adminUsername: e.target.value }
                }
              })}
              placeholder="admin@company.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Admin Password</label>
            <input
              type="password"
              value={settings.ldap?.config?.adminPassword ?? ''}
              onChange={(e) => setSettings({
                ...settings,
                ldap: {
                  ...settings.ldap,
                  isEnabled: settings.ldap?.isEnabled ?? false,
                  config: { ...settings.ldap?.config, adminPassword: e.target.value }
                }
              })}
              className={inputClass}
            />
          </div>

          <div className="col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.ldap?.config?.useSSL ?? false}
                onChange={(e) => setSettings({
                  ...settings,
                  ldap: {
                    ...settings.ldap,
                    isEnabled: settings.ldap?.isEnabled ?? false,
                    config: { ...settings.ldap?.config, useSSL: e.target.checked }
                  }
                })}
                className={checkboxClass}
              />
              <span className="ml-2 text-sm text-slate-600">Use SSL</span>
            </label>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className={primaryButtonClass}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className={successButtonClass}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
