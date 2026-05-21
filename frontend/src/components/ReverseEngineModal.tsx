'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DbmlProjectMetadata,
  ProjectMetadataFieldDefinition,
  ProjectEnvironment,
  createDefaultProjectMetadata,
  getTodayIsoDate,
  sanitizeMetadataByDefinitions,
  setMetadataFieldValue,
  toProjectMetadataPayload,
  upsertProjectBlock,
} from '@/src/lib/dbmlProjectMetadata';

type ReverseEngineModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => Promise<void> | void;
  onError: (message: string) => void;
  currentUserEmail?: string;
  ownerGroups?: string[];
};

type SupportedDb = 'PostgreSQL' | 'SQL Server' | 'MySQL' | 'Oracle';

type ReverseEngineTable = {
  schema: string;
  name: string;
  identifier: string;
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '').replace(/\/api$/, '');

const defaultPortByDb: Record<SupportedDb, number> = {
  PostgreSQL: 5432,
  'SQL Server': 1433,
  MySQL: 3306,
  Oracle: 1521,
};

export function ReverseEngineModal({
  isOpen,
  onClose,
  onImported,
  onError,
  currentUserEmail,
  ownerGroups = [],
}: ReverseEngineModalProps) {
  const [databaseType, setDatabaseType] = useState<SupportedDb>('PostgreSQL');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState<number>(5432);
  const [databaseName, setDatabaseName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [schema, setSchema] = useState('public');

  const [modelName, setModelName] = useState('');
  const [projectMetadata, setProjectMetadata] = useState<DbmlProjectMetadata>(
    createDefaultProjectMetadata({
      databaseType: 'PostgreSQL',
      owner: currentUserEmail || '',
      environment: 'Development',
      version: '1.0.0',
    })
  );
  const [metadataFields, setMetadataFields] = useState<ProjectMetadataFieldDefinition[]>([]);

  const [loadingTables, setLoadingTables] = useState(false);
  const [importing, setImporting] = useState(false);
  const [tables, setTables] = useState<ReverseEngineTable[]>([]);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);

  const canImport = modelName.trim().length > 0
    && selectedTableIds.length > 0
    && ownerGroups.length > 0
    && (projectMetadata.ownerGroup || '').trim().length > 0;

  const selectedCountText = useMemo(() => `${selectedTableIds.length} / ${tables.length} selected`, [selectedTableIds.length, tables.length]);

  useEffect(() => {
    const ownerGroup = (projectMetadata.ownerGroup || '').trim();
    if (ownerGroup.length > 0 && ownerGroups.some((group) => group.localeCompare(ownerGroup, undefined, { sensitivity: 'base' }) === 0)) {
      return;
    }

    setProjectMetadata((current) => ({
      ...current,
      ownerGroup: ownerGroups[0] || '',
    }));
  }, [ownerGroups, projectMetadata.ownerGroup]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const fetchMetadataFields = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/models/project-metadata/fields`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Failed to load metadata fields');
        }

        const payload = (await response.json()) as ProjectMetadataFieldDefinition[];
        const active = (payload || []).filter(
          (field) => field.isActive && field.fieldKey.trim().toLowerCase() !== 'business_domain'
        );
        setMetadataFields(active);
        setProjectMetadata((current) => sanitizeMetadataByDefinitions(current, active));
      } catch {
        setMetadataFields([]);
      }
    };

    void fetchMetadataFields();
  }, [isOpen]);

  const handleDatabaseTypeChange = (value: SupportedDb) => {
    setDatabaseType(value);
    setPort(defaultPortByDb[value]);
    setProjectMetadata((current) => ({
      ...current,
      databaseType: value,
    }));

    if (value === 'PostgreSQL') {
      setSchema('public');
    } else if (value === 'SQL Server') {
      setSchema('dbo');
    } else {
      setSchema('');
    }
  };

  const handleMetadataFieldChange = (field: keyof DbmlProjectMetadata, value: string) => {
    setProjectMetadata((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCustomMetadataFieldChange = (fieldKey: string, value: string) => {
    setProjectMetadata((current) => setMetadataFieldValue(current, fieldKey, value));
  };

  const getConnectionPayload = () => ({
    databaseType,
    host: host.trim(),
    port,
    databaseName: databaseName.trim(),
    username: username.trim(),
    password,
    schema: schema.trim() || null,
  });

  const handleLoadTables = async () => {
    if (!host.trim() || !databaseName.trim() || !username.trim()) {
      onError('Please fill Host, Database Name, and Username first.');
      return;
    }

    setLoadingTables(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/models/reverse-engine/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(getConnectionPayload()),
      });

      const payload = await response.json().catch(() => []);
      if (!response.ok) {
        const message = typeof payload?.message === 'string' ? payload.message : 'Failed to connect and read table list.';
        onError(message);
        return;
      }

      const loaded = (Array.isArray(payload) ? payload : []) as ReverseEngineTable[];
      setTables(loaded);
      setSelectedTableIds(loaded.map((table) => table.identifier));
    } catch {
      onError('Could not load tables from selected database.');
    } finally {
      setLoadingTables(false);
    }
  };

  const handleToggleTable = (identifier: string) => {
    setSelectedTableIds((current) =>
      current.includes(identifier)
        ? current.filter((item) => item !== identifier)
        : [...current, identifier]
    );
  };

  const handleSelectAllTables = () => {
    setSelectedTableIds(tables.map((table) => table.identifier));
  };

  const handleClearTableSelection = () => {
    setSelectedTableIds([]);
  };

  const handleImport = async () => {
    if (!canImport) {
      onError('Model name and at least one selected table are required.');
      return;
    }

    const normalizedOwnerGroup = (projectMetadata.ownerGroup || '').trim();
    if (!normalizedOwnerGroup) {
      onError('Owner Group is required. Please select an Organization Unit.');
      return;
    }

    if (!ownerGroups.some((group) => group.localeCompare(normalizedOwnerGroup, undefined, { sensitivity: 'base' }) === 0)) {
      onError('Owner Group must be selected from Organization Unit list.');
      return;
    }

    setImporting(true);
    try {
      const token = localStorage.getItem('token');
      const reverseResponse = await fetch(`${API_URL}/api/models/reverse-engine/generate-dbml`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...getConnectionPayload(),
          selectedTables: selectedTableIds,
        }),
      });

      const reversePayload = await reverseResponse.json().catch(() => null) as { dbmlContent?: string; message?: string } | null;
      if (!reverseResponse.ok || !reversePayload?.dbmlContent) {
        const message = reversePayload?.message || 'DBML generation failed from selected tables.';
        onError(message);
        return;
      }

      const normalizedMetadata: DbmlProjectMetadata = sanitizeMetadataByDefinitions({
        ...projectMetadata,
        databaseType,
        owner: projectMetadata.owner.trim() || currentUserEmail || '',
        ownerGroup: normalizedOwnerGroup,
        version: projectMetadata.version.trim() || '1.0.0',
        description: projectMetadata.description,
        lastUpdate: getTodayIsoDate(),
      }, metadataFields);

      const missingCustomRequired = metadataFields
        .filter((field) => field.isActive && field.isRequired && !field.isSystem)
        .find((field) => !(normalizedMetadata.customFields[field.fieldKey] || '').trim());
      if (missingCustomRequired) {
        onError(`${missingCustomRequired.displayName} is required.`);
        return;
      }

      const dbmlWithProject = upsertProjectBlock(reversePayload.dbmlContent, modelName.trim(), normalizedMetadata);

      const createResponse = await fetch(`${API_URL}/api/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: modelName.trim(),
          description: normalizedMetadata.description,
          databaseDialect: databaseType,
          initialDbml: dbmlWithProject,
          projectMetadata: toProjectMetadataPayload(normalizedMetadata),
        }),
      });

      if (!createResponse.ok) {
        const message = await createResponse.text().catch(() => 'Failed to import model into DataModeler.');
        onError(message || 'Failed to import model into DataModeler.');
        return;
      }

      await onImported();
      onClose();
    } catch {
      onError('Reverse engine import failed.');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="max-h-[95vh] w-full max-w-6xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">Reverse Engine</h2>
          <p className="mt-1 text-sm text-slate-500">Connect to Oracle, SQL Server, MySQL, or PostgreSQL and import selected tables as DBML model.</p>
        </div>

        <div className="max-h-[calc(95vh-136px)] space-y-5 overflow-y-auto px-6 py-5">
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Model Metadata</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Model Name*</label>
                <input value={modelName} onChange={(e) => setModelName(e.target.value)} className="dm-input" placeholder="PhysicalSchemaImport" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Database Type*</label>
                <select value={databaseType} onChange={(e) => handleDatabaseTypeChange(e.target.value as SupportedDb)} className="dm-select">
                  <option value="PostgreSQL">PostgreSQL</option>
                  <option value="SQL Server">SQL Server</option>
                  <option value="MySQL">MySQL</option>
                  <option value="Oracle">Oracle</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Environment</label>
                <select value={projectMetadata.environment} onChange={(e) => handleMetadataFieldChange('environment', e.target.value as ProjectEnvironment)} className="dm-select">
                  <option value="Development">Development</option>
                  <option value="Test">Test</option>
                  <option value="Staging">Staging</option>
                  <option value="Production">Production</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Owner User</label>
                <input value={projectMetadata.owner} onChange={(e) => handleMetadataFieldChange('owner', e.target.value)} className="dm-input" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Owner Group*</label>
                <select value={projectMetadata.ownerGroup || ''} onChange={(e) => handleMetadataFieldChange('ownerGroup', e.target.value)} className="dm-select">
                  <option value="">Select Organization Unit</option>
                  {ownerGroups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
                {ownerGroups.length === 0 && (
                  <p className="mt-1 text-[11px] text-amber-700">No Organization Unit found from imported LDAP users.</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Version</label>
                <input value={projectMetadata.version} onChange={(e) => handleMetadataFieldChange('version', e.target.value)} className="dm-input" placeholder="1.0.0" />
              </div>
              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">Project Description</label>
                <textarea value={projectMetadata.description} onChange={(e) => handleMetadataFieldChange('description', e.target.value)} rows={2} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </div>

              {metadataFields
                .filter((field) => field.isActive && !field.isSystem)
                .map((field) => {
                  const value = projectMetadata.customFields[field.fieldKey] || '';
                  return (
                    <div key={field.fieldKey} className="md:col-span-3">
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        {field.displayName}{field.isRequired ? '*' : ''}
                      </label>
                      {field.fieldType === 'textarea' ? (
                        <textarea
                          value={value}
                          onChange={(e) => handleCustomMetadataFieldChange(field.fieldKey, e.target.value)}
                          rows={2}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                      ) : field.fieldType === 'select' ? (
                        <select
                          value={value}
                          onChange={(e) => handleCustomMetadataFieldChange(field.fieldKey, e.target.value)}
                          className="dm-select"
                        >
                          <option value="">Select...</option>
                          {(field.options || []).map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={value}
                          onChange={(e) => handleCustomMetadataFieldChange(field.fieldKey, e.target.value)}
                          className="dm-input"
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Database Connection</h3>
              <button onClick={() => void handleLoadTables()} disabled={loadingTables} className="dm-btn-primary disabled:cursor-not-allowed disabled:opacity-60">
                {loadingTables ? 'Loading Tables...' : 'Connect & Load Tables'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Host*</label>
                <input value={host} onChange={(e) => setHost(e.target.value)} className="dm-input" />
                <p className="mt-1 text-[11px] text-slate-500">
                  If backend runs in Docker, use <span className="font-semibold">host.docker.internal</span> for your local machine DB, or Docker service name such as <span className="font-semibold">postgres</span>.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Port*</label>
                <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value) || 0)} className="dm-input" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Database/Service Name*</label>
                <input value={databaseName} onChange={(e) => setDatabaseName(e.target.value)} className="dm-input" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Schema</label>
                <input value={schema} onChange={(e) => setSchema(e.target.value)} className="dm-input" placeholder={databaseType === 'Oracle' ? 'HR' : 'public / dbo'} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Username*</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} className="dm-input" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="dm-input" />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Tables to Import</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{selectedCountText}</span>
                <button onClick={handleSelectAllTables} type="button" className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100">Select All</button>
                <button onClick={handleClearTableSelection} type="button" className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100">Clear</button>
              </div>
            </div>

            {tables.length === 0 ? (
              <p className="text-sm text-slate-500">No tables loaded yet. Use "Connect & Load Tables" first.</p>
            ) : (
              <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 md:grid-cols-2 xl:grid-cols-3">
                {tables.map((table) => (
                  <label key={table.identifier} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input type="checkbox" checked={selectedTableIds.includes(table.identifier)} onChange={() => handleToggleTable(table.identifier)} />
                    <span className="truncate">{table.identifier}</span>
                  </label>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="dm-btn-secondary" disabled={importing}>Cancel</button>
          <button onClick={() => void handleImport()} disabled={importing || !canImport} className="dm-btn-primary disabled:cursor-not-allowed disabled:opacity-60">
            {importing ? 'Importing...' : 'Import as New Model'}
          </button>
        </div>
      </div>
    </div>
  );
}
