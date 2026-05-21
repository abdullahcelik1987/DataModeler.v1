'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import { AppShell } from '@/src/components/admin/AppShell';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';
import { ImportExportModal } from '@/src/components/ImportExportModal';
import { ReverseEngineModal } from '@/src/components/ReverseEngineModal';
import { ModelGroupDto, ModelListDto } from '@/src/types/dbml';
import { getStandardTabClass } from '@/src/lib/tabStyles';
import {
  DbmlProjectMetadata,
  ProjectMetadataFieldDefinition,
  ProjectEnvironment,
  buildProjectBlock,
  createDefaultProjectMetadata,
  getTodayIsoDate,
  sanitizeMetadataByDefinitions,
  setMetadataFieldValue,
  toProjectMetadataPayload,
} from '@/src/lib/dbmlProjectMetadata';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '').replace(/\/api$/, '');
const UNGROUPED_GROUP = 'Ungrouped';

function ModelsContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [models, setModels] = useState<ModelListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showReverseEngineModal, setShowReverseEngineModal] = useState(false);
  const [importExportDefaultTab, setImportExportDefaultTab] = useState<'import' | 'export'>('import');
  const [activeQuickTab, setActiveQuickTab] = useState<'add' | 'import' | 'export' | 'reverse'>('import');
  const [newModelName, setNewModelName] = useState('');
  const [newModelDescription, setNewModelDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [groups, setGroups] = useState<ModelGroupDto[]>([]);
  const [ownerGroups, setOwnerGroups] = useState<string[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string>(UNGROUPED_GROUP);
  const [metadataFields, setMetadataFields] = useState<ProjectMetadataFieldDefinition[]>([]);
  const [newModelMetadata, setNewModelMetadata] = useState<DbmlProjectMetadata>(
    createDefaultProjectMetadata({
      environment: 'Development',
    })
  );

  const openImportExportModal = (tab: 'import' | 'export') => {
    setImportExportDefaultTab(tab);
    setShowImportExportModal(true);
  };

  useEffect(() => {
    void syncData();
  }, []);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/models/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load groups');
      }

      const data = (await response.json()) as ModelGroupDto[];
      setGroups(data);
    } catch {
      setGroups([{ id: null, name: UNGROUPED_GROUP, modelCount: 0 }]);
    }
  };

  const fetchModels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/models`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load models');
      }

      const data = (await response.json()) as ModelListDto[];
      setModels(data);
      setError(null);
    } catch {
      setError('Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnerGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [usersResponse, groupsResponse] = await Promise.all([
        fetch(`${API_URL}/api/authorization/users`, { headers }),
        fetch(`${API_URL}/api/models/groups`, { headers })
      ]);

      const payload = usersResponse.ok
        ? await usersResponse.json().catch(() => ({ success: false, data: [] as Array<{ organizationUnit?: string; authSource?: string }> }))
        : { success: false, data: [] as Array<{ organizationUnit?: string; authSource?: string }> };
      const users = ((payload?.data || []) as Array<{ organizationUnit?: string; authSource?: string }>);
      const unitsFromUsers = users
        .filter((item) => item.authSource === 'ldap')
        .map((item) => (item.organizationUnit || '').trim())
        .filter((value) => value.length > 0);

      const groupsPayload = groupsResponse.ok
        ? await groupsResponse.json().catch(() => [] as Array<{ name?: string }>)
        : [] as Array<{ name?: string }>;
      const unitsFromGroups = (groupsPayload || [])
        .map((group: { name?: string }) => (group.name || '').trim())
        .filter((name: string) => name.length > 0 && name.localeCompare(UNGROUPED_GROUP, undefined, { sensitivity: 'base' }) !== 0);

      const units = Array.from(new Set([...unitsFromUsers, ...unitsFromGroups]))
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

      setOwnerGroups(units);
    } catch {
      setOwnerGroups([]);
    }
  };

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
      const activeFields = (payload || []).filter(
        (field) => field.isActive && field.fieldKey.trim().toLowerCase() !== 'business_domain'
      );
      setMetadataFields(activeFields);
      setNewModelMetadata((current) => sanitizeMetadataByDefinitions(current, activeFields));
    } catch {
      setMetadataFields([]);
    }
  };

  const syncData = async () => {
    setError(null);
    try {
      await Promise.all([fetchModels(), fetchGroups(), fetchOwnerGroups(), fetchMetadataFields()]);
    } catch {
      setError('Failed to refresh data');
    }
  };

  const handleCreateModel = async () => {
    if (!user?.isSuperAdmin) {
      setError('Only admin users can create new models');
      return;
    }

    if (!newModelName.trim()) {
      setError('Model name is required');
      return;
    }

    if (ownerGroups.length === 0) {
      setError('No Organization Unit found. Import LDAP users first and then select an Owner Group.');
      return;
    }

    const normalizedOwnerGroup = (newModelMetadata.ownerGroup || '').trim();
    if (!normalizedOwnerGroup) {
      setError('Owner Group is required. Please select an Organization Unit.');
      return;
    }

    if (!ownerGroups.some((group) => group.localeCompare(normalizedOwnerGroup, undefined, { sensitivity: 'base' }) === 0)) {
      setError('Owner Group must be selected from Organization Unit list.');
      return;
    }

    try {
      const normalizedName = newModelName.trim();
      const normalizedMetadata: DbmlProjectMetadata = sanitizeMetadataByDefinitions({
        ...newModelMetadata,
        databaseType: newModelMetadata.databaseType || 'PostgreSQL',
        description: newModelDescription.trim(),
        owner: newModelMetadata.owner || user.email,
        ownerGroup: normalizedOwnerGroup,
        version: newModelMetadata.version || '1.0.0',
        lastUpdate: getTodayIsoDate(),
      }, metadataFields);

      const missingCustomRequired = metadataFields
        .filter((field) => field.isActive && field.isRequired && !field.isSystem)
        .find((field) => {
          const key = field.fieldKey.trim().toLowerCase();
          return !(normalizedMetadata.customFields[key] || '').trim();
        });
      if (missingCustomRequired) {
        setError(`${missingCustomRequired.displayName} is required.`);
        return;
      }

      const initialDbml = buildProjectBlock(normalizedName, normalizedMetadata);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: normalizedName,
          description: newModelDescription,
          databaseDialect: normalizedMetadata.databaseType,
          initialDbml,
          projectMetadata: toProjectMetadataPayload(normalizedMetadata),
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create model');
      }

      setShowNewModal(false);
      setNewModelName('');
      setNewModelDescription('');
      setNewModelMetadata(createDefaultProjectMetadata({
        owner: user.email,
        ownerGroup: '',
        environment: 'Development',
      }));
      await fetchModels();
      await fetchGroups();
    } catch {
      setError('Failed to create model');
    }
  };

  useEffect(() => {
    setNewModelMetadata((current) => ({
      ...current,
      owner: current.owner || user?.email || '',
    }));
  }, [user?.email]);

  useEffect(() => {
    setNewModelMetadata((current) => {
      const currentOwnerGroup = (current.ownerGroup || '').trim();
      if (currentOwnerGroup.length > 0 && ownerGroups.some((group) => group.localeCompare(currentOwnerGroup, undefined, { sensitivity: 'base' }) === 0)) {
        return current;
      }

      return {
        ...current,
        ownerGroup: ownerGroups[0] || '',
      };
    });
  }, [ownerGroups]);

  const handleMetadataFieldChange = (field: keyof DbmlProjectMetadata, value: string) => {
    setNewModelMetadata((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCustomMetadataFieldChange = (fieldKey: string, value: string) => {
    setNewModelMetadata((current) => setMetadataFieldValue(current, fieldKey, value));
  };

  const handleDeleteModel = async (modelId: string, modelName: string) => {
    if (!user?.isSuperAdmin) {
      setError('Only admin users can delete models');
      return;
    }

    if (!window.confirm(`Delete model "${modelName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/models/${modelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to delete model');
      }

      await fetchModels();
      await fetchGroups();
    } catch {
      setError('Failed to delete model');
    }
  };

  const filteredModels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return models;
    }

    return models.filter((model) => {
      const haystack = `${model.name} ${model.description ?? ''} ${model.ownerEmail}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [models, searchQuery]);

  const groupedModels = useMemo(() => {
    const bucket: Record<string, ModelListDto[]> = {};
    const ouLookup = new Set(ownerGroups.map((group) => group.toLowerCase()));

    for (const model of filteredModels) {
      const modelGroupName = (model.modelGroupName || '').trim();
      const groupName = modelGroupName && ouLookup.has(modelGroupName.toLowerCase())
        ? modelGroupName
        : UNGROUPED_GROUP;
      if (!bucket[groupName]) {
        bucket[groupName] = [];
      }
      bucket[groupName].push(model);
    }

    const query = searchQuery.trim();
    const knownGroups = query.length > 0
      ? Object.keys(bucket)
      : [UNGROUPED_GROUP, ...ownerGroups];
    const allGroupNames = [...new Set([...knownGroups, ...Object.keys(bucket)])];

    return allGroupNames.map((groupName) => ({
      groupName,
      models: bucket[groupName] ?? []
    }));
  }, [filteredModels, ownerGroups, searchQuery]);

  const isSearchMode = searchQuery.trim().length > 0;


  const handleAssignModelGroup = async (modelId: string, groupName: string) => {
    try {
      const normalizedName = groupName.trim();
      const token = localStorage.getItem('token');
      let groupId: string | null = null;

      if (normalizedName.length > 0) {
        const existing = groups.find((group) =>
          !!group.id && group.name.localeCompare(normalizedName, undefined, { sensitivity: 'base' }) === 0);

        if (existing?.id) {
          groupId = existing.id;
        } else {
          const createResponse = await fetch(`${API_URL}/api/models/groups`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ name: normalizedName })
          });

          if (createResponse.status === 409) {
            const refreshResponse = await fetch(`${API_URL}/api/models/groups`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (refreshResponse.ok) {
              const refreshed = (await refreshResponse.json()) as ModelGroupDto[];
              setGroups(refreshed);
              const resolved = refreshed.find((group) =>
                !!group.id && group.name.localeCompare(normalizedName, undefined, { sensitivity: 'base' }) === 0);
              groupId = resolved?.id ?? null;
            }
          } else if (createResponse.ok) {
            const created = await createResponse.json().catch(() => null) as ModelGroupDto | null;
            groupId = created?.id ?? null;
            await fetchGroups();
          } else {
            throw new Error('Failed to create model group');
          }
        }
      }

      const response = await fetch(`${API_URL}/api/models/${modelId}/group`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ modelGroupId: groupId })
      });

      if (!response.ok) {
        throw new Error('Failed to update model group');
      }

      setModels((previous) => previous.map((model) =>
        model.id === modelId
          ? {
              ...model,
              modelGroupId: groupId,
              modelGroupName: normalizedName || UNGROUPED_GROUP
            }
          : model
      ));
      await fetchGroups();
      setError(null);
    } catch {
      setError('Failed to update model group');
    }
  };

  const getRoleBadgeClasses = (role: string) => {
    if (role === 'owner') return 'bg-indigo-100 text-indigo-700';
    if (role === 'editor') return 'bg-emerald-100 text-emerald-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <>
    <AppShell
      title="Data Models"
      subtitle="Design, maintain and collaborate on governed model spaces."
      currentArea="models"
      userEmail={user?.email}
      onLogout={() => {
        logout();
        router.push('/');
      }}
    >
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            {user?.isSuperAdmin && (
              <button
                onClick={() => {
                  setActiveQuickTab('add');
                  setShowNewModal(true);
                }}
                className={`${getStandardTabClass(activeQuickTab === 'add')} min-w-[160px]`}
              >
                Add Model
              </button>
            )}

            <button
              onClick={() => {
                setActiveQuickTab('import');
                openImportExportModal('import');
              }}
              className={`${getStandardTabClass(activeQuickTab === 'import')} min-w-[160px]`}
            >
              Import Model
            </button>

            <button
              onClick={() => {
                setActiveQuickTab('export');
                openImportExportModal('export');
              }}
              className={`${getStandardTabClass(activeQuickTab === 'export')} min-w-[160px]`}
            >
              Export Model
            </button>

            {user?.isSuperAdmin && (
              <button
                onClick={() => {
                  setActiveQuickTab('reverse');
                  setShowReverseEngineModal(true);
                }}
                className={`${getStandardTabClass(activeQuickTab === 'reverse')} min-w-[160px]`}
              >
                Reverse Engine
              </button>
            )}

          </div>
        </section>

        {!user?.isSuperAdmin && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-700">
            New model creation is limited to admin users; developers can update models they are authorized for.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Model List</h2>
            <span className="text-xs text-slate-400">{filteredModels.length} models</span>
          </div>
          <p className="mb-3 text-xs text-slate-500">Groups are synchronized from imported AD Organization Units</p>

        {loading ? (
          <div className="text-center py-12">Loading models...</div>
        ) : filteredModels.length === 0 && ownerGroups.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-500 text-lg mb-4">No models found</p>
            <p className="text-slate-400">
              {user?.isSuperAdmin
                ? searchQuery
                  ? 'Try a different search query'
                  : 'Click "Add Model" to get started'
                : 'Ask an admin to create a model and grant you access'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {groupedModels.map(({ groupName, models: groupItems }) => {
              const isExpanded = isSearchMode || expandedGroup === groupName;

              return (
                <div key={groupName} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="w-full border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedGroup(isExpanded && !isSearchMode ? '' : groupName)}
                      className="flex-1 flex items-center justify-between text-left hover:bg-white rounded-lg px-2 py-1.5 transition"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        {!isSearchMode && <span className="text-slate-500 text-xs" aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>}
                        <p className="truncate text-sm font-semibold text-slate-900">{groupName}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {groupItems.length}
                      </span>
                    </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pl-8 pr-3 py-2">
                      {groupItems.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500 border-l-2 border-dashed border-slate-200">No models in this group.</div>
                      ) : (
                        groupItems.map((model) => (
                          <div
                            key={model.id}
                            onClick={() => router.push(`/designer?modelId=${model.id}&hideSelector=1`)}
                            className="relative pl-5 pr-3 py-2.5 cursor-pointer hover:bg-slate-50 transition rounded-lg border border-transparent hover:border-slate-200 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-slate-200"
                          >
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-px w-3 bg-slate-300" aria-hidden="true"></span>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{model.name}</p>
                                <p className="text-xs text-slate-500 truncate">
                                  {model.ownerEmail} • {model.databaseDialect} • v{model.latestVersion} • {new Date(model.updatedAt).toLocaleDateString()}
                                </p>
                              </div>

                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={ownerGroups.some((group) => group === model.modelGroupName) ? (model.modelGroupName || '') : ''}
                                  onChange={(e) => handleAssignModelGroup(model.id, e.target.value)}
                                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                                >
                                  <option value="">{UNGROUPED_GROUP}</option>
                                  {ownerGroups.map((group) => (
                                    <option key={group} value={group}>{group}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {!loading && searchQuery.trim().length > 0 && filteredModels.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                No models matched your search.
              </div>
            )}
          </div>
        )}
        </section>
    </AppShell>

      {/* New Model Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-xl">
            <h2 className="text-2xl font-bold mb-2 text-slate-900">Create New Model</h2>
            <p className="text-sm text-slate-500 mb-6">Start with model metadata. A DBML Project block will be generated automatically.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model Name*</label>
                <input
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="e.g., Customer Database"
                  className="dm-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newModelDescription}
                  onChange={(e) => setNewModelDescription(e.target.value)}
                  placeholder="Model scope and intent..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Database Type</label>
                  <select
                    value={newModelMetadata.databaseType}
                    onChange={(e) => handleMetadataFieldChange('databaseType', e.target.value)}
                    className="dm-select"
                  >
                    <option value="PostgreSQL">PostgreSQL</option>
                    <option value="MySQL">MySQL</option>
                    <option value="SQL Server">SQL Server</option>
                    <option value="Oracle">Oracle</option>
                    <option value="SQLite">SQLite</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Environment</label>
                  <select
                    value={newModelMetadata.environment}
                    onChange={(e) => handleMetadataFieldChange('environment', e.target.value as ProjectEnvironment)}
                    className="dm-select"
                  >
                    <option value="Development">Development</option>
                    <option value="Test">Test</option>
                    <option value="Staging">Staging</option>
                    <option value="Production">Production</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Owner User</label>
                  <input
                    type="text"
                    value={newModelMetadata.owner}
                    onChange={(e) => handleMetadataFieldChange('owner', e.target.value)}
                    className="dm-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Owner Group*</label>
                  <select
                    value={newModelMetadata.ownerGroup || ''}
                    onChange={(e) => handleMetadataFieldChange('ownerGroup', e.target.value)}
                    className="dm-select"
                  >
                    <option value="">Select Organization Unit</option>
                    {ownerGroups.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                  {ownerGroups.length === 0 && (
                    <p className="mt-1 text-xs text-amber-700">No Organization Unit found from imported LDAP users.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Version</label>
                  <input
                    type="text"
                    value={newModelMetadata.version}
                    onChange={(e) => handleMetadataFieldChange('version', e.target.value)}
                    placeholder="1.0.0"
                    className="dm-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact</label>
                  <input
                    type="email"
                    value={newModelMetadata.contact}
                    onChange={(e) => handleMetadataFieldChange('contact', e.target.value)}
                    placeholder="data-team@company.com"
                    className="dm-input"
                  />
                </div>

                {metadataFields
                  .filter((field) => field.isActive && !field.isSystem)
                  .map((field) => {
                    const fieldValue = (newModelMetadata.customFields[field.fieldKey] || '');
                    return (
                      <div key={field.fieldKey} className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {field.displayName}{field.isRequired ? '*' : ''}
                        </label>
                        {field.fieldType === 'textarea' ? (
                          <textarea
                            value={fieldValue}
                            onChange={(e) => handleCustomMetadataFieldChange(field.fieldKey, e.target.value)}
                            rows={2}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          />
                        ) : field.fieldType === 'select' ? (
                          <select
                            value={fieldValue}
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
                            type="text"
                            value={fieldValue}
                            onChange={(e) => handleCustomMetadataFieldChange(field.fieldKey, e.target.value)}
                            className="dm-input"
                          />
                        )}
                      </div>
                    );
                  })}
              </div>

            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewModal(false)}
                className="dm-btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateModel}
                disabled={!newModelName.trim() || ownerGroups.length === 0 || !(newModelMetadata.ownerGroup || '').trim()}
                className="dm-btn-primary flex-1"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportExportModal
        isOpen={showImportExportModal}
        defaultTab={importExportDefaultTab}
        onClose={() => setShowImportExportModal(false)}
        models={models}
        canImport={!!user?.isSuperAdmin}
        currentUserEmail={user?.email}
        ownerGroups={ownerGroups}
        onImported={syncData}
        onError={setError}
      />

      <ReverseEngineModal
        isOpen={showReverseEngineModal}
        onClose={() => setShowReverseEngineModal(false)}
        onImported={syncData}
        onError={setError}
        currentUserEmail={user?.email}
        ownerGroups={ownerGroups}
      />
    </>
  );
}

export default function ModelsPage() {
  return (
    <ProtectedRoute>
      <ModelsContent />
    </ProtectedRoute>
  );
}
