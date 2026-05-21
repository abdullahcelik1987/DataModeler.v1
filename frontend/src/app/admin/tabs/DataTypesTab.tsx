'use client';

import React, { useEffect, useMemo, useState } from 'react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '').replace(/\/api$/, '');

type DatabaseDataTypeParameter = {
  key: string;
  label: string;
  inputType: 'text' | 'number' | string;
  defaultValue?: string;
};

type DatabaseDataType = {
  id: string;
  databaseSystemId: string;
  name: string;
  inputTemplate: string;
  parameters: DatabaseDataTypeParameter[];
  requiresLength: boolean;
  supportsPrecisionScale: boolean;
  isActive: boolean;
  sortOrder: number;
};

type DatabaseSystem = {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  dataTypes: DatabaseDataType[];
};

type ApiResponse = {
  success: boolean;
  message: string;
};

const PLACEHOLDER_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

const EXAMPLE_PRESETS: Record<string, { template: string; parameters: DatabaseDataTypeParameter[] }> = {
  raw: {
    template: 'RAW({{length}})',
    parameters: [{ key: 'length', label: 'Length', inputType: 'number', defaultValue: '2000' }],
  },
  varchar_char: {
    template: 'VARCHAR({{length}} CHAR)',
    parameters: [{ key: 'length', label: 'Length', inputType: 'number', defaultValue: '255' }],
  },
  interval_day_to_second: {
    template: 'INTERVAL DAY({{day_precision}}) TO SECOND({{second_precision}})',
    parameters: [
      { key: 'day_precision', label: 'Day Precision', inputType: 'number', defaultValue: '3' },
      { key: 'second_precision', label: 'Second Precision', inputType: 'number', defaultValue: '2' },
    ],
  },
  timestamp: {
    template: 'TIMESTAMP({{fractional_seconds_precision}})',
    parameters: [{ key: 'fractional_seconds_precision', label: 'Fractional Seconds', inputType: 'number', defaultValue: '6' }],
  },
  decimal: {
    template: 'DECIMAL({{precision}},{{scale}})',
    parameters: [
      { key: 'precision', label: 'Precision', inputType: 'number', defaultValue: '18' },
      { key: 'scale', label: 'Scale', inputType: 'number', defaultValue: '2' },
    ],
  },
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function listTemplateKeys(template: string): string[] {
  const keys: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = PLACEHOLDER_REGEX.exec(template)) !== null) {
    keys.push(match[1]);
  }
  PLACEHOLDER_REGEX.lastIndex = 0;
  return Array.from(new Set(keys));
}

function applyTemplate(template: string, args: Record<string, string>): string {
  return template.replace(PLACEHOLDER_REGEX, (_, key: string) => args[key] || '').trim();
}

export function DataTypesTab() {
  const [systems, setSystems] = useState<DatabaseSystem[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newSystemName, setNewSystemName] = useState('');

  const [newDataTypeName, setNewDataTypeName] = useState('');
  const [newDataTypeSort, setNewDataTypeSort] = useState('100');
  const [newInputTemplate, setNewInputTemplate] = useState('');
  const [newParameters, setNewParameters] = useState<DatabaseDataTypeParameter[]>([]);
  const [examplePreset, setExamplePreset] = useState<keyof typeof EXAMPLE_PRESETS | ''>('');

  const panelClass = 'dm-panel p-5';
  const inputClass = 'dm-input';
  const primaryButtonClass = 'dm-btn-primary';
  const secondaryButtonClass = 'dm-btn-secondary';

  useEffect(() => {
    void fetchSystems();
  }, []);

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  const selectedSystem = useMemo(
    () => systems.find((s) => s.id === selectedSystemId) || null,
    [systems, selectedSystemId]
  );

  const templateKeys = useMemo(() => listTemplateKeys(newInputTemplate), [newInputTemplate]);

  const previewValues = useMemo(() => {
    const values: Record<string, string> = {};
    newParameters.forEach((parameter) => {
      values[parameter.key] = parameter.defaultValue || parameter.label || parameter.key;
    });
    return values;
  }, [newParameters]);

  const previewText = useMemo(() => {
    const template = newInputTemplate.trim() || newDataTypeName.trim();
    if (!template) return '';
    return applyTemplate(template, previewValues);
  }, [newInputTemplate, newDataTypeName, previewValues]);

  const fetchSystems = async () => {
    const token = getToken();
    if (!token) {
      setError('Session token is missing. Please sign in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/admin/database-systems`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to load database systems');
      }

      const data = (await response.json()) as DatabaseSystem[];
      const sortedSystems = (data || []).slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      setSystems(sortedSystems);

      if (sortedSystems.length > 0) {
        setSelectedSystemId((current) => (current && sortedSystems.some((x) => x.id === current) ? current : sortedSystems[0].id));
      } else {
        setSelectedSystemId('');
      }
    } catch {
      setError('Failed to load database systems');
    } finally {
      setLoading(false);
    }
  };

  const resetDesigner = () => {
    setNewDataTypeName('');
    setNewDataTypeSort('100');
    setNewInputTemplate('');
    setNewParameters([]);
    setExamplePreset('');
  };

  const handleCreateSystem = async () => {
    const token = getToken();
    if (!token) {
      setError('Session token is missing. Please sign in again.');
      return;
    }

    const name = newSystemName.trim();
    if (!name) {
      setError('Database system name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/admin/database-systems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.message || 'Failed to create database system');
        return;
      }

      setNewSystemName('');
      await fetchSystems();
      setSuccess('Database system created.');
    } catch {
      setError('Failed to create database system');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSystem = async (systemId: string, systemName: string) => {
    const token = getToken();
    if (!token) return;
    if (!window.confirm(`Delete ${systemName}? All related data types will also be deleted.`)) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/admin/database-systems/${systemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = (await response.json().catch(() => ({}))) as ApiResponse;
      if (!response.ok) {
        setError(payload?.message || 'Failed to delete database system');
        return;
      }

      await fetchSystems();
      setSuccess(payload.message || 'Database system deleted.');
    } catch {
      setError('Failed to delete database system');
    } finally {
      setSaving(false);
    }
  };

  const addParameter = () => {
    setNewParameters((current) => [
      ...current,
      {
        key: `param_${current.length + 1}`,
        label: `Parameter ${current.length + 1}`,
        inputType: 'text',
        defaultValue: '',
      },
    ]);
  };

  const updateParameter = (index: number, field: keyof DatabaseDataTypeParameter, value: string) => {
    setNewParameters((current) =>
      current.map((parameter, parameterIndex) => {
        if (parameterIndex !== index) return parameter;

        if (field === 'key') {
          return { ...parameter, key: normalizeKey(value) };
        }

        return { ...parameter, [field]: value };
      })
    );
  };

  const removeParameter = (index: number) => {
    setNewParameters((current) => current.filter((_, parameterIndex) => parameterIndex !== index));
  };

  const applyPreset = (presetKey: keyof typeof EXAMPLE_PRESETS | '') => {
    setExamplePreset(presetKey);
    if (!presetKey) return;

    const preset = EXAMPLE_PRESETS[presetKey];
    setNewInputTemplate(preset.template);
    setNewParameters(preset.parameters);
  };

  const validateDesigner = (): string | null => {
    const name = newDataTypeName.trim();
    if (!name) {
      return 'Data type name is required.';
    }

    const template = (newInputTemplate || name).trim();
    if (!template) {
      return 'Type template is required.';
    }

    const normalized = newParameters.map((parameter) => ({
      ...parameter,
      key: normalizeKey(parameter.key),
      label: parameter.label.trim(),
    }));

    if (normalized.some((parameter) => !parameter.key)) {
      return 'Each parameter must have a valid key (letters, numbers, underscore).';
    }

    const keySet = new Set<string>();
    for (const parameter of normalized) {
      if (keySet.has(parameter.key)) {
        return `Duplicate parameter key: ${parameter.key}`;
      }
      keySet.add(parameter.key);
    }

    const placeholders = listTemplateKeys(template);
    const missing = normalized.find((parameter) => !placeholders.includes(parameter.key));
    if (missing) {
      return `Template is missing placeholder for parameter: {{${missing.key}}}`;
    }

    return null;
  };

  const handleCreateDataType = async () => {
    const token = getToken();
    if (!token || !selectedSystem) return;

    const validationError = validateDesigner();
    if (validationError) {
      setError(validationError);
      return;
    }

    const sortOrder = Number.parseInt(newDataTypeSort, 10);
    const normalizedParameters = newParameters.map((parameter) => ({
      ...parameter,
      key: normalizeKey(parameter.key),
      label: parameter.label.trim() || normalizeKey(parameter.key),
      inputType: parameter.inputType === 'number' ? 'number' : 'text',
      defaultValue: parameter.defaultValue?.trim() || '',
    }));

    const hasLength = normalizedParameters.some((parameter) => parameter.key === 'length');
    const hasPrecisionScale = normalizedParameters.some((parameter) => parameter.key === 'precision' || parameter.key === 'scale');

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/admin/database-systems/${selectedSystem.id}/data-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newDataTypeName.trim(),
          inputTemplate: (newInputTemplate || newDataTypeName).trim(),
          parameters: normalizedParameters,
          requiresLength: hasLength,
          supportsPrecisionScale: hasPrecisionScale,
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as ApiResponse;
      if (!response.ok) {
        setError(payload?.message || 'Failed to add data type');
        return;
      }

      resetDesigner();
      await fetchSystems();
      setSuccess('Data type template added.');
    } catch {
      setError('Failed to add data type');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTypeFlag = async (type: DatabaseDataType, field: 'isActive') => {
    const token = getToken();
    if (!token) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/admin/database-data-types/${type.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: type.name,
          inputTemplate: type.inputTemplate,
          parameters: type.parameters || [],
          requiresLength: type.requiresLength,
          supportsPrecisionScale: type.supportsPrecisionScale,
          isActive: field === 'isActive' ? !type.isActive : type.isActive,
          sortOrder: type.sortOrder,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as ApiResponse;
      if (!response.ok) {
        setError(payload?.message || 'Failed to update data type');
        return;
      }

      await fetchSystems();
      setSuccess('Data type updated.');
    } catch {
      setError('Failed to update data type');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDataType = async (type: DatabaseDataType) => {
    const token = getToken();
    if (!token) return;
    if (!window.confirm(`Delete data type ${type.name}?`)) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/admin/database-data-types/${type.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse;
      if (!response.ok) {
        setError(payload?.message || 'Failed to delete data type');
        return;
      }

      await fetchSystems();
      setSuccess(payload.message || 'Data type deleted.');
    } catch {
      setError('Failed to delete data type');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Loading database systems...</div>;
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className={panelClass}>
            <h3 className="text-base font-semibold text-slate-900 mb-3">Add DBMS</h3>
            <div className="space-y-2">
              <input
                value={newSystemName}
                onChange={(e) => setNewSystemName(e.target.value)}
                placeholder="e.g. MariaDB"
                className={inputClass}
              />
              <button
                onClick={() => void handleCreateSystem()}
                disabled={saving}
                className={`${primaryButtonClass} w-full`}
              >
                Add Database System
              </button>
            </div>
          </div>

          <div className={panelClass}>
            <h3 className="text-base font-semibold text-slate-900 mb-3">Database Systems</h3>
            <div className="max-h-[28rem] overflow-y-auto space-y-2 pr-1">
              {systems.map((system) => (
                <div
                  key={system.id}
                  className={`rounded-lg border p-3 cursor-pointer ${selectedSystemId === system.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                  onClick={() => setSelectedSystemId(system.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{system.name}</div>
                      <div className="text-xs text-slate-500">{system.key}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteSystem(system.id, system.name);
                      }}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {systems.length === 0 && <div className="text-sm text-slate-500">No database system defined.</div>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className={panelClass}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-base font-semibold text-slate-900">Data Type Designer</h3>
              <select
                value={examplePreset}
                onChange={(e) => applyPreset(e.target.value as keyof typeof EXAMPLE_PRESETS | '')}
                className="dm-select h-9 rounded-lg px-3 py-2 text-xs"
              >
                <option value="">Load Example</option>
                <option value="raw">RAW({`{{length}}`})</option>
                <option value="varchar_char">VARCHAR({`{{length}}`} CHAR)</option>
                <option value="interval_day_to_second">INTERVAL DAY(...) TO SECOND(...)</option>
                <option value="timestamp">TIMESTAMP(...)</option>
                <option value="decimal">DECIMAL(precision, scale)</option>
              </select>
            </div>

            {selectedSystem ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-600 mb-1">Type Name</label>
                    <input
                      value={newDataTypeName}
                      onChange={(e) => setNewDataTypeName(e.target.value)}
                      placeholder="e.g. INTERVAL_DAY_TO_SECOND"
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-600 mb-1">Sort</label>
                    <input
                      value={newDataTypeSort}
                      onChange={(e) => setNewDataTypeSort(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-7">
                    <label className="block text-xs text-slate-600 mb-1">Template</label>
                    <input
                      value={newInputTemplate}
                      onChange={(e) => setNewInputTemplate(e.target.value)}
                      placeholder="INTERVAL DAY({{day_precision}}) TO SECOND({{second_precision}})"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-slate-700">Template Parameters</div>
                    <button
                      onClick={addParameter}
                      className="dm-btn-secondary h-8 rounded-md px-2 py-1 text-xs"
                    >
                      Add Parameter
                    </button>
                  </div>

                  <div className="space-y-2">
                    {newParameters.map((parameter, index) => (
                      <div key={`${parameter.key}-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                        <div className="md:col-span-3">
                          <label className="block text-[11px] text-slate-600 mb-1">Key</label>
                          <input
                            value={parameter.key}
                            onChange={(e) => updateParameter(index, 'key', e.target.value)}
                            placeholder="day_precision"
                            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-[11px] text-slate-600 mb-1">Label</label>
                          <input
                            value={parameter.label}
                            onChange={(e) => updateParameter(index, 'label', e.target.value)}
                            placeholder="Day Precision"
                            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[11px] text-slate-600 mb-1">Input</label>
                          <select
                            value={parameter.inputType}
                            onChange={(e) => updateParameter(index, 'inputType', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs bg-white"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                          </select>
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-[11px] text-slate-600 mb-1">Default Value</label>
                          <input
                            value={parameter.defaultValue || ''}
                            onChange={(e) => updateParameter(index, 'defaultValue', e.target.value)}
                            placeholder="3"
                            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <button
                            onClick={() => removeParameter(index)}
                            className="w-full rounded-lg border border-red-300 bg-red-50 px-2 py-2 text-xs text-red-700 hover:bg-red-100"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ))}
                    {newParameters.length === 0 && (
                      <div className="text-xs text-slate-500">No parameters yet. Use placeholders like {'{{length}}'} in template and add matching parameter keys.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
                  <div><span className="font-semibold">Detected placeholders:</span> {templateKeys.length > 0 ? templateKeys.join(', ') : 'none'}</div>
                  <div className="mt-1"><span className="font-semibold">Preview:</span> {previewText || '-'}</div>
                </div>

                <button
                  onClick={() => void handleCreateDataType()}
                  disabled={saving}
                  className={`${primaryButtonClass} w-full`}
                >
                  Save Data Type Template
                </button>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Select a database system first.</div>
            )}
          </div>

          <div className={panelClass}>
            <h3 className="text-base font-semibold text-slate-900 mb-3">Data Types {selectedSystem ? `for ${selectedSystem.name}` : ''}</h3>
            {selectedSystem ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/80">
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Template</th>
                      <th className="px-3 py-2 text-left">Parameters</th>
                      <th className="px-3 py-2 text-center">Active</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSystem.dataTypes
                      .slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                      .map((type) => (
                        <tr key={type.id} className="border-b border-slate-200 align-top">
                          <td className="px-3 py-2 font-medium text-slate-800">{type.name}</td>
                          <td className="px-3 py-2 text-xs text-slate-700">{type.inputTemplate || type.name}</td>
                          <td className="px-3 py-2 text-xs text-slate-600">
                            {(type.parameters || []).length > 0
                              ? type.parameters.map((parameter) => `${parameter.key} (${parameter.inputType})`).join(', ')
                              : '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" checked={type.isActive} onChange={() => void handleToggleTypeFlag(type, 'isActive')} />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => void handleDeleteDataType(type)} className="text-red-600 hover:text-red-700">Delete</button>
                          </td>
                        </tr>
                      ))}
                    {selectedSystem.dataTypes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-slate-500">No data type defined for this system.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Select a database system to manage types.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
