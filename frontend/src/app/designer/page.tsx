'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AppShell } from '@/src/components/admin/AppShell';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';
import { useAuth } from '@/src/hooks/useAuth';
import { ModelListDto } from '@/src/types/dbml';

const ModelEditorWorkspace = dynamic(
  () => import('@/src/components/model/ModelEditorWorkspace').then((module) => module.ModelEditorWorkspace),
  { ssr: false }
);

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '').replace(/\/api$/, '');

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function DesignerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

  const preselectedModelId = searchParams.get('modelId') ?? '';
  const hideSelector = searchParams.get('hideSelector') === '1';

  const [ownerGroups, setOwnerGroups] = useState<string[]>([]);
  const [models, setModels] = useState<ModelListDto[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDesignerData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [usersResponse, groupsResponse, modelsResponse] = await Promise.all([
        fetch(`${API_URL}/api/authorization/users`, { headers }),
        fetch(`${API_URL}/api/models/groups`, { headers }),
        fetch(`${API_URL}/api/models`, { headers }),
      ]);

      if (!modelsResponse.ok) {
        throw new Error('Failed to load models');
      }

      const modelsData = (await modelsResponse.json()) as ModelListDto[];
      const usersPayload = usersResponse.ok
        ? await usersResponse.json()
        : { data: [] as Array<{ organizationUnit?: string; authSource?: string }> };
      const users = (usersPayload?.data || []) as Array<{ organizationUnit?: string; authSource?: string }>;

      const unitsFromUsers = users
        .filter((user) => user.authSource === 'ldap')
        .map((user) => (user.organizationUnit || '').trim())
        .filter((value) => value.length > 0);

      const groupsPayload = groupsResponse.ok
        ? await groupsResponse.json().catch(() => [] as Array<{ name?: string }>)
        : [] as Array<{ name?: string }>;
      const unitsFromGroups = (groupsPayload || [])
        .map((group: { name?: string }) => (group.name || '').trim())
        .filter((name: string) => name.length > 0 && name.localeCompare('Ungrouped', undefined, { sensitivity: 'base' }) !== 0);

      const ownerGroupNames = Array.from(new Set([...unitsFromUsers, ...unitsFromGroups]))
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

      setModels(sortByName(modelsData));
      setOwnerGroups(ownerGroupNames);
    } catch {
      setError('Designer data could not be loaded. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDesignerData();
  }, []);

  const groupNames = useMemo(() => {
    return [...ownerGroups].sort((a, b) => a.localeCompare(b));
  }, [ownerGroups]);

  const filteredModels = useMemo(() => {
    if (!selectedGroup) {
      return models;
    }

    return models.filter((model) => (model.modelGroupName ?? '').trim() === selectedGroup);
  }, [models, selectedGroup]);

  const activeModelId = selectedModelId || preselectedModelId;

  useEffect(() => {
    if (!preselectedModelId) {
      return;
    }

    setSelectedModelId(preselectedModelId);
  }, [preselectedModelId]);

  const handleGroupChange = (groupName: string) => {
    setSelectedGroup(groupName);
    setSelectedModelId('');
  };

  return (
    <AppShell
      title="Designer"
      subtitle="Select a model and edit it in DBML + ER designer workspace."
      currentArea="designer"
      userEmail={user?.email}
      onLogout={() => {
        logout();
        router.push('/');
      }}
    >
      {!hideSelector && (
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Organization Unit
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="dm-select"
            >
              <option value="">All Organization Units</option>
              {groupNames.map((groupName) => (
                <option key={groupName} value={groupName}>
                  {groupName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Data Model
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="dm-select"
              disabled={loading || filteredModels.length === 0}
            >
              <option value="">Select model</option>
              {sortByName(filteredModels).map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && loading && (
          <p className="mt-4 text-sm text-slate-500">Loading organization units and models...</p>
        )}

        {!loading && !error && !activeModelId && (
          <p className="mt-4 text-sm text-slate-500">
            Designer starts empty. Select a model to open DBML and ER editor.
          </p>
        )}
      </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-3">
        {!activeModelId ? (
          <div className="flex min-h-[68vh] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Designer Ready</h3>
              <p className="mt-2 text-sm text-slate-600">
                Group ve model secimi yaptiginizda DBML ve ER Designer burada acilacak.
              </p>
            </div>
          </div>
        ) : (
          <ModelEditorWorkspace
            modelId={activeModelId}
            isEmbedded
          />
        )}
      </section>
    </AppShell>
  );
}

export default function DesignerPage() {
  return (
    <ProtectedRoute>
      <DesignerContent />
    </ProtectedRoute>
  );
}
