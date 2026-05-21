'use client';

import React, { useEffect, useState } from 'react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '').replace(/\/api$/, '');

type DevopsSettings = {
  isConfigured: boolean;
  isEnabled: boolean;
  hasPersonalAccessToken: boolean;
  serverUrl?: string | null;
  collectionName?: string | null;
};

type ModelItem = {
  id: string;
  name: string;
};

type RepositoryMapping = {
  id: string;
  modelId: string;
  modelName: string;
  projectName: string;
  repositoryName: string;
  branchName: string;
  filePath: string;
  isEnabled: boolean;
  updatedAt: string;
};

export function RepositoriesTab() {
  const [settings, setSettings] = useState<DevopsSettings | null>(null);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [mappings, setMappings] = useState<RepositoryMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMapping, setSavingMapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPatInput, setShowPatInput] = useState(false);

  const [settingsForm, setSettingsForm] = useState({
    isEnabled: true,
    serverUrl: '',
    collectionName: '',
    personalAccessToken: '',
  });

  const [mappingForm, setMappingForm] = useState({
    modelId: '',
    projectName: '',
    repositoryName: '',
    branchName: 'main',
    filePath: '/models/model.dbml',
    isEnabled: true,
  });

  const panelClass = 'dm-panel p-5';
  const inputClass = 'dm-input';

  useEffect(() => {
    void loadAll();
  }, []);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const normalizeDefaultFilePath = (value: string, modelName?: string) => {
    if (value.trim().length > 0) {
      return value.startsWith('/') ? value : `/${value}`;
    }

    const safeName = (modelName || 'model')
      .toLowerCase()
      .replace(/[^a-z0-9_\-]/g, '_');
    return `/models/${safeName}.dbml`;
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);

    try {
      const [settingsRes, mappingsRes, modelsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/settings/devops`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/admin/settings/devops/repository-mappings`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/models`, { headers: authHeaders() }),
      ]);

      if (!settingsRes.ok || !mappingsRes.ok || !modelsRes.ok) {
        throw new Error('Failed to load DevOps admin data.');
      }

      const settingsData = (await settingsRes.json()) as DevopsSettings;
      const mappingsData = (await mappingsRes.json()) as RepositoryMapping[];
      const modelsData = (await modelsRes.json()) as ModelItem[];

      setSettings(settingsData);
      setMappings(mappingsData || []);
      setModels((modelsData || []).slice().sort((a, b) => a.name.localeCompare(b.name)));

      setSettingsForm({
        isEnabled: settingsData?.isEnabled ?? true,
        serverUrl: settingsData?.serverUrl || '',
        collectionName: settingsData?.collectionName || '',
        personalAccessToken: '',
      });

      if ((modelsData || []).length > 0) {
        const firstModel = modelsData[0];
        setMappingForm((current) => ({
          ...current,
          modelId: current.modelId || firstModel.id,
          filePath: current.filePath || normalizeDefaultFilePath('', firstModel.name),
        }));
      }
    } catch {
      setError('Failed to load DevOps settings and mappings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settingsForm.serverUrl.trim()) {
      setError('Server URL is required.');
      return;
    }

    setSavingSettings(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/admin/settings/devops`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          serverUrl: settingsForm.serverUrl.trim(),
          collectionName: settingsForm.collectionName.trim(),
          personalAccessToken: settingsForm.personalAccessToken.trim() || null,
          isEnabled: settingsForm.isEnabled,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowPatInput(false);
        setSettingsForm((current) => ({ ...current, personalAccessToken: '' }));
        await loadAll();
        setSuccess('DevOps settings saved successfully.');
      } else {
        setError(data.message || 'Failed to save DevOps settings.');
      }
    } catch {
      setError('Error while saving DevOps settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleModelChange = (modelId: string) => {
    const selectedModel = models.find((m) => m.id === modelId);
    setMappingForm((current) => ({
      ...current,
      modelId,
      filePath: normalizeDefaultFilePath(current.filePath, selectedModel?.name),
    }));
  };

  const handleSaveMapping = async () => {
    if (!mappingForm.modelId) {
      setError('Please select a model.');
      return;
    }

    if (!mappingForm.projectName.trim() || !mappingForm.repositoryName.trim()) {
      setError('Project name and repository name are required.');
      return;
    }

    setSavingMapping(true);
    setError(null);
    setSuccess(null);

    try {
      const selectedModel = models.find((m) => m.id === mappingForm.modelId);
      const response = await fetch(`${API_URL}/api/admin/settings/devops/repository-mappings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          modelId: mappingForm.modelId,
          projectName: mappingForm.projectName.trim(),
          repositoryName: mappingForm.repositoryName.trim(),
          branchName: mappingForm.branchName.trim() || 'main',
          filePath: normalizeDefaultFilePath(mappingForm.filePath, selectedModel?.name),
          isEnabled: mappingForm.isEnabled,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadAll();
        setSuccess('Repository mapping saved successfully.');
      } else {
        setError(data.message || 'Failed to save repository mapping.');
      }
    } catch {
      setError('Error while saving repository mapping.');
    } finally {
      setSavingMapping(false);
    }
  };

  const handleDeleteMapping = async (modelId: string) => {
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/admin/settings/devops/repository-mappings/${modelId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      const data = await response.json();
      if (data.success) {
        await loadAll();
        setSuccess('Repository mapping deleted successfully.');
      } else {
        setError(data.message || 'Failed to delete repository mapping.');
      }
    } catch {
      setError('Error while deleting repository mapping.');
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-slate-500">Loading DevOps configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
          {success}
        </div>
      )}

      <div className={panelClass}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Azure DevOps Settings</h3>
          <button onClick={() => void loadAll()} className="dm-btn-secondary">
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Server URL</label>
            <input
              type="text"
              value={settingsForm.serverUrl}
              onChange={(e) => setSettingsForm({ ...settingsForm, serverUrl: e.target.value })}
              placeholder="https://dev.azure.com/yourorg"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Collection Name (optional)</label>
            <input
              type="text"
              value={settingsForm.collectionName}
              onChange={(e) => setSettingsForm({ ...settingsForm, collectionName: e.target.value })}
              placeholder="DefaultCollection"
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Personal Access Token</label>
            {!showPatInput ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <span>
                  {settings?.hasPersonalAccessToken ? 'PAT already configured.' : 'No PAT configured yet.'}
                </span>
                <button type="button" className="dm-btn-secondary" onClick={() => setShowPatInput(true)}>
                  {settings?.hasPersonalAccessToken ? 'Replace PAT' : 'Add PAT'}
                </button>
              </div>
            ) : (
              <input
                type="password"
                value={settingsForm.personalAccessToken}
                onChange={(e) => setSettingsForm({ ...settingsForm, personalAccessToken: e.target.value })}
                placeholder="Paste new PAT token"
                className={inputClass}
              />
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={settingsForm.isEnabled}
              onChange={(e) => setSettingsForm({ ...settingsForm, isEnabled: e.target.checked })}
            />
            Enable DevOps archive integration
          </label>

          <div className="md:col-span-2">
            <button onClick={handleSaveSettings} disabled={savingSettings} className="dm-btn-primary">
              {savingSettings ? 'Saving...' : 'Save DevOps Settings'}
            </button>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Model to Repository Mapping</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Model</label>
            <select value={mappingForm.modelId} onChange={(e) => handleModelChange(e.target.value)} className="dm-select">
              <option value="">Select model</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Project Name</label>
            <input
              type="text"
              value={mappingForm.projectName}
              onChange={(e) => setMappingForm({ ...mappingForm, projectName: e.target.value })}
              placeholder="Azure DevOps project"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Repository Name</label>
            <input
              type="text"
              value={mappingForm.repositoryName}
              onChange={(e) => setMappingForm({ ...mappingForm, repositoryName: e.target.value })}
              placeholder="Repository"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Branch</label>
            <input
              type="text"
              value={mappingForm.branchName}
              onChange={(e) => setMappingForm({ ...mappingForm, branchName: e.target.value })}
              placeholder="main"
              className={inputClass}
            />
          </div>

          <div className="xl:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">DBML File Path</label>
            <input
              type="text"
              value={mappingForm.filePath}
              onChange={(e) => setMappingForm({ ...mappingForm, filePath: e.target.value })}
              placeholder="/models/model.dbml"
              className={inputClass}
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={mappingForm.isEnabled}
              onChange={(e) => setMappingForm({ ...mappingForm, isEnabled: e.target.checked })}
            />
            Mapping enabled
          </label>

          <div className="md:col-span-2 xl:col-span-3">
            <button onClick={handleSaveMapping} disabled={savingMapping} className="dm-btn-primary">
              {savingMapping ? 'Saving...' : 'Save Mapping'}
            </button>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Current Mappings</h3>

        {mappings.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No repository mappings configured.
          </div>
        ) : (
          <div className="space-y-3">
            {mappings.map((mapping) => (
              <div key={mapping.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{mapping.modelName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {mapping.projectName} / {mapping.repositoryName} / {mapping.branchName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{mapping.filePath}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Updated: {new Date(mapping.updatedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        mapping.isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {mapping.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMapping(mapping.modelId)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6">
        <h4 className="mb-2 font-semibold text-indigo-900">Archive Flow Status</h4>
        <p className="mb-3 text-sm text-indigo-700">
          Approved Change Requests are archived to Azure DevOps when both settings and model mapping are enabled.
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-indigo-700">
          <li>DevOps settings enabled + PAT configured</li>
          <li>Model has enabled mapping to project/repository/branch/file</li>
          <li>Approve request in Change Requests module</li>
          <li>System commits DBML + SQL archive files to mapped repository</li>
        </ul>
      </div>
    </div>
  );
}
