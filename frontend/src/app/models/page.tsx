'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';
import { ImportExportModal } from '@/src/components/ImportExportModal';
import { ModelGroupDto, ModelListDto } from '@/src/types/dbml';
import {
  DbmlProjectMetadata,
  ProjectEnvironment,
  buildProjectBlock,
  createDefaultProjectMetadata,
  getTodayIsoDate,
} from '@/src/lib/dbmlProjectMetadata';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const UNGROUPED_GROUP = 'Ungrouped';

function ModelsContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [models, setModels] = useState<ModelListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelDescription, setNewModelDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [groups, setGroups] = useState<ModelGroupDto[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string>(UNGROUPED_GROUP);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [newModelMetadata, setNewModelMetadata] = useState<DbmlProjectMetadata>(
    createDefaultProjectMetadata({
      environment: 'Development',
    })
  );

  const primaryButtonClass = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';
  const secondaryButtonClass = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60';

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

  const syncData = async () => {
    setError(null);
    try {
      await Promise.all([fetchModels(), fetchGroups()]);
      setLastSyncedAt(new Date());
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

    try {
      const normalizedName = newModelName.trim();
      const normalizedMetadata: DbmlProjectMetadata = {
        ...newModelMetadata,
        databaseType: newModelMetadata.databaseType || 'PostgreSQL',
        description: newModelDescription.trim(),
        owner: newModelMetadata.owner || user.email,
        version: newModelMetadata.version || '1.0.0',
        lastUpdate: getTodayIsoDate(),
      };
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

  const handleMetadataFieldChange = (field: keyof DbmlProjectMetadata, value: string) => {
    setNewModelMetadata((current) => ({
      ...current,
      [field]: value,
    }));
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

    for (const model of filteredModels) {
      const groupName = model.modelGroupName ?? UNGROUPED_GROUP;
      if (!bucket[groupName]) {
        bucket[groupName] = [];
      }
      bucket[groupName].push(model);
    }

    const query = searchQuery.trim();
    const knownGroups = query.length > 0
      ? Object.keys(bucket)
      : (groups.length > 0 ? groups.map((group) => group.name) : [UNGROUPED_GROUP]);
    const allGroupNames = [...new Set([...knownGroups, ...Object.keys(bucket)])];

    return allGroupNames.map((groupName) => ({
      groupName,
      models: bucket[groupName] ?? []
    }));
  }, [filteredModels, groups, searchQuery]);

  const isSearchMode = searchQuery.trim().length > 0;

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      return;
    }

    if (groups.some((group) => group.name.toLowerCase() === name.toLowerCase())) {
      setError('Bu isimde bir grup zaten mevcut');
      return;
    }

    setCreatingGroup(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/models/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });

      if (response.status === 409) {
        setError('Bu isimde bir grup zaten mevcut');
        return;
      }

      if (!response.ok) {
        const message = await response.text().catch(() => '');
        setError(`Grup oluşturma başarısız${message ? `: ${message}` : ''}`);
        return;
      }

      await fetchGroups();
      setExpandedGroup(name);
      setNewGroupName('');
    } catch {
      setError('Grup oluşturulamadı. Bağlantınızı kontrol edin.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleAssignModelGroup = async (modelId: string, groupId: string | null) => {
    try {
      const token = localStorage.getItem('token');
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

      const selectedGroup = groups.find((group) => group.id === groupId);
      setModels((previous) => previous.map((model) =>
        model.id === modelId
          ? {
              ...model,
              modelGroupId: groupId,
              modelGroupName: selectedGroup?.name ?? UNGROUPED_GROUP
            }
          : model
      ));
      await fetchGroups();
      setError(null);
    } catch {
      setError('Failed to update model group');
    }
  };

  const handleDeleteGroup = async (group: ModelGroupDto) => {
    if (!group.id) {
      return;
    }

    if (!user?.isSuperAdmin) {
      setError('Only admin users can delete groups');
      return;
    }

    const confirmed = window.confirm(`Delete group "${group.name}"?`);
    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/models/groups/${group.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 409) {
        const message = await response.text().catch(() => 'Group has models and cannot be deleted.');
        setError(message || 'Group has models and cannot be deleted.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to delete group');
      }

      setError(null);
      await fetchGroups();
      await fetchModels();
      setExpandedGroup(UNGROUPED_GROUP);
    } catch {
      setError('Failed to delete group');
    }
  };

  const getRoleBadgeClasses = (role: string) => {
    if (role === 'owner') return 'bg-indigo-100 text-indigo-700';
    if (role === 'editor') return 'bg-emerald-100 text-emerald-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-lg shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Data Models</h1>
            <p className="mt-1 text-sm text-slate-500">Design, maintain and collaborate on your data models.</p>
            {lastSyncedAt && (
              <p className="mt-1 text-xs text-slate-400">Last refresh: {lastSyncedAt.toLocaleTimeString()}</p>
            )}
          </div>

          <div className="flex items-start gap-3 self-end lg:self-auto">
            <button
              onClick={() => setShowImportExportModal(true)}
              className={`${secondaryButtonClass} min-w-[148px]`}
            >
              Import / Export
            </button>

            {user?.isSuperAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className={`${secondaryButtonClass} min-w-[148px]`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="opacity-90">
                  <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm9 4l-2.05-.68c-.12-.4-.28-.77-.49-1.12l.97-1.92-2.12-2.12-1.92.97c-.35-.21-.72-.37-1.12-.49L12 3 9.73 3.64c-.4.12-.77.28-1.12.49l-1.92-.97L4.57 5.28l.97 1.92c-.21.35-.37.72-.49 1.12L3 12l.64 2.27c.12.4.28.77.49 1.12l-.97 1.92 2.12 2.12 1.92-.97c.35.21.72.37 1.12.49L12 21l2.27-.64c.4-.12.77-.28 1.12-.49l1.92.97 2.12-2.12-.97-1.92c.21-.35.37-.72.49-1.12L21 12z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Admin Panel
              </button>
            )}

            <div className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Signed in as</p>
              <p className="text-sm font-medium text-slate-700 truncate">{user?.email}</p>
              <button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 transition hover:text-rose-700"
              >
                <span aria-hidden="true">↳</span>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <label htmlFor="model-search" className="sr-only">Search models</label>
                <input
                  id="model-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by model name, description or owner"
                  className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div className="flex items-center gap-2">
                {user?.isSuperAdmin && (
                  <button
                    onClick={() => setShowNewModal(true)}
                    className={`${primaryButtonClass} min-w-[148px]`}
                  >
                    Create Model
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Create logical group (e.g., Finance, CRM, Legacy)"
                className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup || !newGroupName.trim()}
                className={`${primaryButtonClass} min-w-[124px]`}
              >
                {creatingGroup ? 'Oluşturuluyor…' : 'Grup Ekle'}
              </button>
            </div>
          </div>
        </div>

        {!user?.isSuperAdmin && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg">
            New model creation is limited to admin users; developers can update models they are authorized for.
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">Loading models...</div>
        ) : filteredModels.length === 0 && groups.filter(g => g.id !== null).length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center">
            <p className="text-slate-500 text-lg mb-4">No models found</p>
            <p className="text-slate-400">
              {user?.isSuperAdmin
                ? searchQuery
                  ? 'Try a different search query'
                  : 'Click "Create Model" to get started'
                : 'Ask an admin to create a model and grant you access'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {groupedModels.map(({ groupName, models: groupItems }) => {
              const isExpanded = isSearchMode || expandedGroup === groupName;
              const groupMeta = groups.find((group) => group.name === groupName);
              const isDeletableGroup = !!groupMeta?.id;

              return (
                <div key={groupName} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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

                    {user?.isSuperAdmin && isDeletableGroup && (
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(groupMeta)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        title="Delete empty group"
                      >
                        Delete Group
                      </button>
                    )}
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
                            onClick={() => router.push(`/models/${model.id}`)}
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
                                  value={model.modelGroupId ?? ''}
                                  onChange={(e) => handleAssignModelGroup(model.id, e.target.value || null)}
                                  className="text-xs px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                                >
                                  <option value="">{UNGROUPED_GROUP}</option>
                                  {groups
                                    .filter((group) => group.id)
                                    .map((group) => (
                                      <option key={group.id} value={group.id ?? ''}>{group.name}</option>
                                    ))}
                                </select>

                                <span className={`inline-block px-2 py-1 text-[11px] rounded-full ${getRoleBadgeClasses(model.yourRole)}`}>
                                  {model.yourRole}
                                </span>

                                {user?.isSuperAdmin && (
                                  <button
                                    onClick={() => handleDeleteModel(model.id, model.name)}
                                    className="px-2 py-1 bg-red-100 text-red-700 text-[11px] rounded-full hover:bg-red-200 transition font-semibold"
                                  >
                                    Delete
                                  </button>
                                )}
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
      </main>

      {/* New Model Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full border border-slate-200">
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
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newModelDescription}
                  onChange={(e) => setNewModelDescription(e.target.value)}
                  placeholder="Model scope and intent..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Database Type</label>
                  <select
                    value={newModelMetadata.databaseType}
                    onChange={(e) => handleMetadataFieldChange('databaseType', e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Development">Development</option>
                    <option value="Test">Test</option>
                    <option value="Staging">Staging</option>
                    <option value="Production">Production</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Owner</label>
                  <input
                    type="text"
                    value={newModelMetadata.owner}
                    onChange={(e) => handleMetadataFieldChange('owner', e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Version</label>
                  <input
                    type="text"
                    value={newModelMetadata.version}
                    onChange={(e) => handleMetadataFieldChange('version', e.target.value)}
                    placeholder="1.0.0"
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact</label>
                  <input
                    type="email"
                    value={newModelMetadata.contact}
                    onChange={(e) => handleMetadataFieldChange('contact', e.target.value)}
                    placeholder="data-team@sirket.com"
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Business Domain</label>
                  <input
                    type="text"
                    value={newModelMetadata.businessDomain}
                    onChange={(e) => handleMetadataFieldChange('businessDomain', e.target.value)}
                    placeholder="finance"
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewModal(false)}
                className="flex-1 h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateModel}
                className="flex-1 h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportExportModal
        isOpen={showImportExportModal}
        onClose={() => setShowImportExportModal(false)}
        models={models}
        canImport={!!user?.isSuperAdmin}
        currentUserEmail={user?.email}
        onImported={syncData}
        onError={setError}
      />
    </div>
  );
}

export default function ModelsPage() {
  return (
    <ProtectedRoute>
      <ModelsContent />
    </ProtectedRoute>
  );
}
