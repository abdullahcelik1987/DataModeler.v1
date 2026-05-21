'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { ProjectMetadataFieldDefinition } from '@/src/lib/dbmlProjectMetadata';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '').replace(/\/api$/, '');

type SaveRequest = {
  fields: ProjectMetadataFieldDefinition[];
};

function normalizeFieldKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

export default function ProjectMetadataTab() {
  const [fields, setFields] = useState<ProjectMetadataFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'text' | 'textarea' | 'select'>('text');
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState('');

  useEffect(() => {
    void fetchFields();
  }, []);

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => (a.sortOrder - b.sortOrder) || a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })),
    [fields]
  );

  const fetchFields = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session token is missing. Please sign in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/admin/project-metadata/fields`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load project metadata fields');
      }

      const data = (await response.json()) as ProjectMetadataFieldDefinition[];
      setFields((data || []).filter((field) => field.isActive));
    } catch {
      setError('Failed to load project metadata fields');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = (fieldKey: string, patch: Partial<ProjectMetadataFieldDefinition>) => {
    setFields((current) => current.map((field) => (
      field.fieldKey === fieldKey ? { ...field, ...patch } : field
    )));
  };

  const handleRemoveCustomField = (fieldKey: string) => {
    setFields((current) => current.filter((field) => field.fieldKey !== fieldKey));
  };

  const handleAddCustomField = () => {
    const key = normalizeFieldKey(newKey);
    if (!key) {
      setError('Field key is required.');
      return;
    }

    if (fields.some((field) => field.fieldKey.localeCompare(key, undefined, { sensitivity: 'base' }) === 0)) {
      setError('Field key already exists.');
      return;
    }

    const label = newLabel.trim() || key;
    const options = newType === 'select'
      ? newOptions.split(',').map((x) => x.trim()).filter((x) => x.length > 0)
      : [];

    const maxSort = fields.reduce((max, field) => Math.max(max, field.sortOrder), 0);
    setFields((current) => ([
      ...current,
      {
        fieldKey: key,
        displayName: label,
        fieldType: newType,
        isRequired: newRequired,
        isSystem: false,
        isActive: true,
        sortOrder: maxSort + 10,
        options,
      },
    ]));

    setNewKey('');
    setNewLabel('');
    setNewType('text');
    setNewRequired(false);
    setNewOptions('');
    setError(null);
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session token is missing. Please sign in again.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: SaveRequest = {
        fields: sortedFields.map((field, index) => ({
          ...field,
          fieldKey: normalizeFieldKey(field.fieldKey),
          displayName: field.displayName.trim(),
          sortOrder: (index + 1) * 10,
          options: (field.options || []).map((x) => x.trim()).filter((x) => x.length > 0),
        })),
      };

      const response = await fetch(`${API_URL}/api/admin/project-metadata/fields`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save project metadata fields');
      }

      const refreshed = (await response.json()) as ProjectMetadataFieldDefinition[];
      setFields((refreshed || []).filter((field) => field.isActive));
      setSuccess('Project metadata fields saved successfully.');
    } catch {
      setError('Failed to save project metadata fields');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="dm-panel p-5 text-sm text-slate-500">Loading metadata fields...</div>;
  }

  return (
    <div className="space-y-5">
      <section className="dm-panel p-5">
        <h3 className="text-base font-semibold text-slate-900">Project Metadata Field Definitions</h3>
        <p className="mt-1 text-sm text-slate-500">System fields are always active. Add custom fields to make metadata dynamic in Add, Import, Reverse, and Designer screens.</p>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Key</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Label</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Required</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Options</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sortedFields.map((field) => (
                <tr key={field.fieldKey}>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">{field.fieldKey}</td>
                  <td className="px-3 py-2">
                    <input
                      value={field.displayName}
                      onChange={(e) => handleUpdateField(field.fieldKey, { displayName: e.target.value })}
                      className="dm-input h-9"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={field.fieldType}
                      disabled={field.isSystem}
                      onChange={(e) => handleUpdateField(field.fieldKey, { fieldType: e.target.value as ProjectMetadataFieldDefinition['fieldType'] })}
                      className="dm-select h-9"
                    >
                      <option value="text">text</option>
                      <option value="textarea">textarea</option>
                      <option value="select">select</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={field.isRequired}
                      disabled={field.isSystem}
                      onChange={(e) => handleUpdateField(field.fieldKey, { isRequired: e.target.checked })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={(field.options || []).join(', ')}
                      disabled={field.fieldType !== 'select'}
                      onChange={(e) => handleUpdateField(field.fieldKey, { options: e.target.value.split(',').map((x) => x.trim()).filter((x) => x.length > 0) })}
                      className="dm-input h-9"
                      placeholder="opt1, opt2"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!field.isSystem ? (
                      <button
                        onClick={() => handleRemoveCustomField(field.fieldKey)}
                        className="dm-btn-secondary"
                        type="button"
                      >
                        Remove
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">System</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-800">Add Custom Field</h4>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
            <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="field_key" className="dm-input" />
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Display Name" className="dm-input" />
            <select value={newType} onChange={(e) => setNewType(e.target.value as 'text' | 'textarea' | 'select')} className="dm-select">
              <option value="text">text</option>
              <option value="textarea">textarea</option>
              <option value="select">select</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} />
              Required
            </label>
            <button onClick={handleAddCustomField} className="dm-btn-primary" type="button">Add Field</button>
          </div>
          {newType === 'select' && (
            <div className="mt-3">
              <input value={newOptions} onChange={(e) => setNewOptions(e.target.value)} placeholder="Options: value1, value2" className="dm-input" />
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="dm-btn-primary" type="button">
            {saving ? 'Saving...' : 'Save Metadata Configuration'}
          </button>
        </div>
      </section>
    </div>
  );
}
