'use client';

import React, { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface LdapConfig {
  server?: string;
  port?: number;
  baseDn?: string;
  adminUsername?: string;
  adminPassword?: string;
  useSSL?: boolean;
}

interface AzureAdConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  authority?: string;
}

interface AdSettings {
  ldap?: {
    isEnabled: boolean;
    config: LdapConfig;
    testStatus?: boolean;
    lastTestedAt?: string;
  };
  azureAd?: {
    isEnabled: boolean;
    config: AzureAdConfig;
    testStatus?: boolean;
    lastTestedAt?: string;
  };
}

export function AdSettingsTab() {
  const [settings, setSettings] = useState<AdSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const cardClass = 'bg-slate-50 border border-slate-200 rounded-xl p-6';
  const inputClass = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const checkboxClass = 'rounded border-slate-300 text-indigo-600 focus:ring-indigo-500';
  const primaryButtonClass = 'px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 transition';
  const successButtonClass = 'px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:bg-slate-400 transition';

  useEffect(() => {
    fetchAdSettings();
  }, []);

  const fetchAdSettings = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/settings/ad', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSettings(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load AD settings');
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('auth-token');
      const providers = [];

      if (settings.ldap) {
        providers.push({
          type: 'ldap',
          isEnabled: settings.ldap.isEnabled,
          config: settings.ldap.config
        });
      }

      if (settings.azureAd) {
        providers.push({
          type: 'azure_ad',
          isEnabled: settings.azureAd.isEnabled,
          config: settings.azureAd.config
        });
      }

      const response = await fetch('/api/admin/settings/ad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ providers })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('AD settings saved successfully');
        await fetchAdSettings();
      } else {
        setError(data.message || 'Failed to save settings');
      }
    } catch (err) {
      setError('Error saving AD settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (provider: 'ldap' | 'azure_ad') => {
    setTestingProvider(provider);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('auth-token');
      const config = provider === 'ldap' ? settings.ldap?.config : settings.azureAd?.config;

      const response = await fetch(`${API_URL}/api/admin/settings/ad/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: provider === 'ldap' ? 'ldap' : 'azure_ad',
          config
        })
      });

      const data = await response.json();
      if (data.isSuccessful) {
        setSuccess(`${provider === 'ldap' ? 'LDAP' : 'Azure AD'} connection successful!`);
      } else {
        setError(data.message || 'Connection test failed');
      }
    } catch (err) {
      setError('Error testing connection');
    } finally {
      setTestingProvider(null);
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

      {/* LDAP Section */}
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
          <button
            onClick={() => handleTestConnection('ldap')}
            disabled={testingProvider === 'ldap'}
            className={primaryButtonClass}
          >
            {testingProvider === 'ldap' ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {/* Azure AD Section */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Azure AD (Entra ID)</h3>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.azureAd?.isEnabled ?? false}
              onChange={(e) => setSettings({
                ...settings,
                azureAd: {
                  ...settings.azureAd,
                  isEnabled: e.target.checked,
                  config: settings.azureAd?.config ?? {}
                }
              })}
              className={checkboxClass}
            />
            <span className="ml-2 text-sm text-slate-600">Enable</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tenant ID</label>
            <input
              type="text"
              value={settings.azureAd?.config?.tenantId ?? ''}
              onChange={(e) => setSettings({
                ...settings,
                azureAd: {
                  ...settings.azureAd,
                  isEnabled: settings.azureAd?.isEnabled ?? false,
                  config: { ...settings.azureAd?.config, tenantId: e.target.value }
                }
              })}
              placeholder="your-tenant-id"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Client ID</label>
            <input
              type="text"
              value={settings.azureAd?.config?.clientId ?? ''}
              onChange={(e) => setSettings({
                ...settings,
                azureAd: {
                  ...settings.azureAd,
                  isEnabled: settings.azureAd?.isEnabled ?? false,
                  config: { ...settings.azureAd?.config, clientId: e.target.value }
                }
              })}
              placeholder="your-client-id"
              className={inputClass}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Client Secret</label>
            <input
              type="password"
              value={settings.azureAd?.config?.clientSecret ?? ''}
              onChange={(e) => setSettings({
                ...settings,
                azureAd: {
                  ...settings.azureAd,
                  isEnabled: settings.azureAd?.isEnabled ?? false,
                  config: { ...settings.azureAd?.config, clientSecret: e.target.value }
                }
              })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => handleTestConnection('azure_ad')}
            disabled={testingProvider === 'azure_ad'}
            className={primaryButtonClass}
          >
            {testingProvider === 'azure_ad' ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-4">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className={successButtonClass}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
