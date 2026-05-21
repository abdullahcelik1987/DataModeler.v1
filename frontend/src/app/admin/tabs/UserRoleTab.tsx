'use client';

import React, { useEffect, useMemo, useState } from 'react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '').replace(/\/api$/, '');

type AdminTab = 'users' | 'roles';
type AuthSource = 'ldap' | 'azure_ad' | 'local' | string;
const UNGROUPED_OU = 'Ungrouped';

interface User {
  id: string;
  email: string;
  username?: string;
  organizationUnit?: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  authSource: AuthSource;
}

interface ApplicationRole {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
}

interface PermissionAction {
  key: string;
  label: string;
}

interface PermissionModule {
  id: string;
  label: string;
  actions: PermissionAction[];
}

interface UserAppRoleAssignment {
  roleId: string;
  assignedAt: string;
  role: ApplicationRole;
}

interface UserModelRoleItem {
  id: string;
  name: string;
  modelGroupName?: string | null;
  role: string;
  explicitRole?: string | null;
  defaultRole?: string | null;
  roleSource: 'owner' | 'explicit' | 'default_ou' | 'none' | string;
  hasExplicitAssignment: boolean;
}

interface DirectoryUser {
  email: string;
  username: string;
  displayName: string;
  distinguishedName: string;
  organizationUnit?: string;
  isImported: boolean;
  userId?: string;
  authSource?: AuthSource;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function UserRoleTab() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [directoryResults, setDirectoryResults] = useState<DirectoryUser[]>([]);
  const [directorySearchLoading, setDirectorySearchLoading] = useState(false);
  const [directoryImporting, setDirectoryImporting] = useState(false);
  const [isDirectoryModalOpen, setIsDirectoryModalOpen] = useState(false);
  const [selectedDirectoryEmails, setSelectedDirectoryEmails] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [collapsedOrganizationUnits, setCollapsedOrganizationUnits] = useState<Record<string, boolean>>({});
  const [userRoleAssignments, setUserRoleAssignments] = useState<UserAppRoleAssignment[]>([]);
  const [userModelRoles, setUserModelRoles] = useState<UserModelRoleItem[]>([]);
  const [selectedAppRoleId, setSelectedAppRoleId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedModelRole, setSelectedModelRole] = useState<string>('developer');

  const [appRoles, setAppRoles] = useState<ApplicationRole[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<PermissionModule[]>([]);

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  const [editingRoleId, setEditingRoleId] = useState('');
  const [editingRoleName, setEditingRoleName] = useState('');
  const [editingRoleDescription, setEditingRoleDescription] = useState('');
  const [editingRolePermissions, setEditingRolePermissions] = useState<string[]>([]);

  const modelRoleOptions = ['viewer', 'developer', 'domain_architect', 'data_architect', 'data_steward', 'admin'];

  const getToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session token is missing. Please sign in again.');
      return null;
    }
    return token;
  };

  const extractOuFromDn = (distinguishedName?: string): string => {
    if (!distinguishedName) {
      return '';
    }

    const ouParts = distinguishedName
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.toUpperCase().startsWith('OU='));

    if (ouParts.length === 0) {
      return '';
    }

    return ouParts
      .map((part) => part.slice(3).trim())
      .filter(Boolean)
      .join(' / ');
  };

  const normalizeUser = (raw: any): User => ({
    id: raw?.id ?? raw?.Id ?? '',
    email: raw?.email ?? raw?.Email ?? '',
    username: raw?.username ?? raw?.Username,
    organizationUnit: raw?.organizationUnit ?? raw?.OrganizationUnit ?? '',
    isSuperAdmin: Boolean(raw?.isSuperAdmin ?? raw?.IsSuperAdmin),
    isActive: Boolean(raw?.isActive ?? raw?.IsActive),
    authSource: raw?.authSource ?? raw?.AuthSource ?? 'local'
  });

  const normalizeDirectoryUser = (raw: any): DirectoryUser => {
    const distinguishedName = raw?.distinguishedName ?? raw?.DistinguishedName ?? '';
    return {
      email: raw?.email ?? raw?.Email ?? '',
      username: raw?.username ?? raw?.Username ?? '',
      displayName: raw?.displayName ?? raw?.DisplayName ?? '',
      distinguishedName,
      organizationUnit: raw?.organizationUnit ?? raw?.OrganizationUnit ?? extractOuFromDn(distinguishedName),
      isImported: Boolean(raw?.isImported ?? raw?.IsImported),
      userId: raw?.userId ?? raw?.UserId,
      authSource: raw?.authSource ?? raw?.AuthSource
    };
  };

  const fetchAppRoles = async (): Promise<ApplicationRole[]> => {
    const token = getToken();
    if (!token) {
      return [];
    }

    try {
      const response = await fetch(`${API_URL}/api/authorization/app-roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json().catch(() => ({ success: false, data: [] as ApplicationRole[] }));
      if (!response.ok || !payload.success) {
        return [];
      }

      const roles = ((payload.data || []) as ApplicationRole[])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      setAppRoles(roles);
      return roles;
    } catch {
      return [];
    }
  };

  const fetchPermissionCatalog = async () => {
    const token = getToken();
    if (!token) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/authorization/app-permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json().catch(() => ({ success: false, data: [] as PermissionModule[] }));
      if (response.ok && payload.success) {
        setPermissionCatalog((payload.data || []) as PermissionModule[]);
      }
    } catch {
      // keep existing state
    }
  };

  const fetchUsers = async () => {
    const token = getToken();
    if (!token) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/authorization/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json().catch(() => ({ success: false, data: [] as User[] }));
      if (response.ok && payload.success) {
        const sorted = (payload.data || [])
          .map((item: any) => normalizeUser(item))
          .slice()
          .sort((a: User, b: User) => a.email.localeCompare(b.email, undefined, { sensitivity: 'base' }));
        setUsers(sorted);
      }
    } catch {
      // keep existing state
    }
  };

  const fetchUserAppRoles = async (userId: string) => {
    const token = getToken();
    if (!token || !userId) {
      setUserRoleAssignments([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/authorization/user-roles/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json().catch(() => ({ success: false, data: [] as UserAppRoleAssignment[] }));
      if (response.ok && payload.success) {
        setUserRoleAssignments((payload.data || []) as UserAppRoleAssignment[]);
      } else {
        setUserRoleAssignments([]);
      }
    } catch {
      setUserRoleAssignments([]);
    }
  };

  const fetchUserModelRoles = async (userId: string) => {
    const token = getToken();
    if (!token || !userId) {
      setUserModelRoles([]);
      setSelectedModelId('');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/authorization/user-models/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json().catch(() => ({ success: false, data: [] as Array<{ model: UserModelRoleItem }> }));
      if (response.ok && payload.success) {
        const items = (payload.data || [])
          .map((entry: any) => entry?.model)
          .filter((item: any) => item?.id && item?.name) as UserModelRoleItem[];

        setUserModelRoles(items);
        if (!items.some((item) => item.id === selectedModelId)) {
          setSelectedModelId(items[0]?.id || '');
        }
      } else {
        setUserModelRoles([]);
      }
    } catch {
      setUserModelRoles([]);
    }
  };

  const bootstrap = async () => {
    setLoading(true);
    setError(null);

    await Promise.all([fetchUsers(), fetchAppRoles(), fetchPermissionCatalog()]);

    setLoading(false);
  };

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      void fetchUserAppRoles(selectedUserId);
      void fetchUserModelRoles(selectedUserId);
    } else {
      setUserModelRoles([]);
      setSelectedModelId('');
    }
  }, [selectedUserId]);

  const openRoleEditor = (role: ApplicationRole) => {
    setEditingRoleId(role.id);
    setEditingRoleName(role.name);
    setEditingRoleDescription(role.description || '');
    setEditingRolePermissions(role.permissions || []);
  };

  const resetRoleEditor = () => {
    setEditingRoleId('');
    setEditingRoleName('');
    setEditingRoleDescription('');
    setEditingRolePermissions([]);
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      setError('Role name is required.');
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/authorization/app-roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newRoleName.trim(),
          displayName: newRoleName.trim(),
          description: newRoleDescription.trim() || null,
          permissions: []
        })
      });

      const payload = await response.json().catch(() => ({ message: 'Failed to create role' })) as {
        message?: string;
        data?: { id?: string };
      };

      if (!response.ok) {
        setError(payload.message || 'Failed to create role');
        return;
      }

      const createdName = newRoleName.trim().toLowerCase();
      setNewRoleName('');
      setNewRoleDescription('');

      const roles = await fetchAppRoles();
      const createdRole = payload.data?.id
        ? roles.find((role) => role.id === payload.data?.id)
        : roles.find((role) => role.name === createdName);

      if (createdRole) {
        openRoleEditor(createdRole);
      }

      setSuccess('Role created. Now select/update permissions from the matrix.');
    } catch {
      setError('Error creating role');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRoleId) {
      setError('Select a role first.');
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/authorization/app-roles/${editingRoleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          displayName: editingRoleName.trim() || editingRoleName,
          description: editingRoleDescription.trim() || null,
          permissions: editingRolePermissions
        })
      });

      const payload = await response.json().catch(() => ({ message: 'Failed to update role' }));
      if (!response.ok) {
        setError(payload.message || 'Failed to update role');
        return;
      }

      const roles = await fetchAppRoles();
      const updated = roles.find((role) => role.id === editingRoleId);
      if (updated) {
        openRoleEditor(updated);
      }

      setSuccess('Role permissions updated.');
    } catch {
      setError('Error updating role');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: ApplicationRole) => {
    const token = getToken();
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/authorization/app-roles/${role.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const payload = await response.json().catch(() => ({ message: 'Failed to delete role' }));
      if (!response.ok) {
        setError(payload.message || 'Failed to delete role');
        return;
      }

      const roles = await fetchAppRoles();
      if (editingRoleId === role.id) {
        const fallback = roles[0];
        if (fallback) {
          openRoleEditor(fallback);
        } else {
          resetRoleEditor();
        }
      }

      setSuccess('Role deleted.');
    } catch {
      setError('Error deleting role');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignRoleToUser = async () => {
    if (!selectedUserId || !selectedAppRoleId) {
      setError('Select user and role first.');
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/authorization/assign-user-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId: selectedUserId, roleId: selectedAppRoleId })
      });
      const payload = await response.json().catch(() => ({ message: 'Failed to assign role' }));
      if (!response.ok) {
        setError(payload.message || 'Failed to assign role');
        return;
      }

      await fetchUserAppRoles(selectedUserId);
      await fetchUserModelRoles(selectedUserId);
      setSuccess('Role assigned to user.');
    } catch {
      setError('Error assigning role');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRoleFromUser = async (roleId: string) => {
    if (!selectedUserId) {
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/authorization/user-roles/${selectedUserId}/${roleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json().catch(() => ({ message: 'Failed to remove role' }));
      if (!response.ok) {
        setError(payload.message || 'Failed to remove role');
        return;
      }

      await fetchUserAppRoles(selectedUserId);
      await fetchUserModelRoles(selectedUserId);
      setSuccess('Role removed from user.');
    } catch {
      setError('Error removing role');
    } finally {
      setSaving(false);
    }
  };

  const handleSearchDirectoryUsers = async () => {
    const query = directoryQuery.trim();
    if (query.length < 2) {
      setError('Search text must be at least 2 characters.');
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    // Always start a fresh search view by clearing old rows and selections.
    setDirectoryResults([]);
    setSelectedDirectoryEmails([]);
    setIsDirectoryModalOpen(true);

    setDirectorySearchLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/authorization/ldap-users?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const payload = await response.json().catch(() => ({ success: false, data: [] as DirectoryUser[], message: 'Directory search failed' }));

      if (!response.ok || !payload.success) {
        setDirectoryResults([]);
        setError(payload.message || 'Directory search failed');
        return;
      }

      setDirectoryResults((payload.data || []).map((item: any) => normalizeDirectoryUser(item)));
      setSuccess(`${(payload.data || []).length} directory user(s) listed.`);
    } catch {
      setDirectoryResults([]);
      setError('Directory search failed');
    } finally {
      setDirectorySearchLoading(false);
    }
  };

  const toggleDirectoryUserSelection = (email: string) => {
    const lowered = email.toLowerCase();
    setSelectedDirectoryEmails((current) => (
      current.includes(lowered)
        ? current.filter((item) => item !== lowered)
        : [...current, lowered]
    ));
  };

  const selectableDirectoryUsers = directoryResults.filter((item) => !item.isImported);

  const handleImportSelectedDirectoryUsers = async () => {
    const selected = selectableDirectoryUsers.filter((item) => selectedDirectoryEmails.includes(item.email.toLowerCase()));
    if (selected.length === 0) {
      setError('Import etmek icin en az bir kullanici secin.');
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    setDirectoryImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const importedEmails = new Set<string>();
      const importedUserIds: string[] = [];
      const importedUserOuByEmail = new Map<string, string>();

      for (const item of selected) {
        const response = await fetch(`${API_URL}/api/authorization/ldap-users/import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            email: item.email,
            username: item.username,
            displayName: item.displayName,
            distinguishedName: item.distinguishedName
          })
        });

        const payload = await response.json().catch(() => ({ success: false, message: 'Import failed' }));
        if (!response.ok || !payload.success) {
          setError(payload.message || `Import failed for ${item.email}`);
          continue;
        }

        importedEmails.add(item.email.toLowerCase());
        if (payload.data?.id) {
          importedUserIds.push(payload.data.id);
        }
        if (payload.data?.organizationUnit) {
          importedUserOuByEmail.set(item.email.toLowerCase(), payload.data.organizationUnit);
        }
      }

      if (importedEmails.size === 0) {
        setError('Secili kullanicilar import edilemedi.');
        return;
      }

      await fetchUsers();
      if (importedUserIds.length > 0) {
        setSelectedUserId(importedUserIds[0]);
      }

      setDirectoryResults((current) => current.map((item) => (
        importedEmails.has(item.email.toLowerCase())
          ? {
              ...item,
              isImported: true,
              userId: item.userId,
              organizationUnit: importedUserOuByEmail.get(item.email.toLowerCase()) || item.organizationUnit,
              authSource: 'ldap'
            }
          : item
      )));

      setSelectedDirectoryEmails([]);
      setSuccess(`${importedEmails.size} user(s) imported successfully.`);
    } catch {
      setError('Import failed');
    } finally {
      setDirectoryImporting(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`${user.email} kullanicisini silmek istiyor musunuz?`)) {
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/authorization/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const payload = await response.json().catch(() => ({ success: false, message: 'User delete failed' }));
      if (!response.ok || !payload.success) {
        setError(payload.message || 'User delete failed');
        return;
      }

      await fetchUsers();
      if (selectedUserId === user.id) {
        setSelectedUserId('');
        setUserRoleAssignments([]);
      }

      setDirectoryResults((current) => current.map((item) => (
        item.email.toLowerCase() === user.email.toLowerCase()
          ? { ...item, isImported: false, userId: undefined }
          : item
      )));

      setSuccess(payload.message || 'User deleted successfully.');
    } catch {
      setError('User delete failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshUserFromAd = async (user: User) => {
    const token = getToken();
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/authorization/users/${user.id}/refresh-ldap`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const payload = await response.json().catch(() => ({ success: false, message: 'AD refresh failed' }));
      if (!response.ok || !payload.success) {
        setError(payload.message || 'AD refresh failed');
        return;
      }

      const updatedUser = (payload.data || null) as User | null;
      if (updatedUser?.id) {
        setUsers((current) => current
          .map((item) => (item.id === updatedUser.id ? { ...item, ...updatedUser } : item))
          .sort((a, b) => a.email.localeCompare(b.email, undefined, { sensitivity: 'base' }))
        );

        setDirectoryResults((current) => current.map((item) => {
          const sameUser = item.userId === updatedUser.id;
          const sameEmail = item.email.toLowerCase() === user.email.toLowerCase()
            || item.email.toLowerCase() === updatedUser.email.toLowerCase();

          if (!sameUser && !sameEmail) {
            return item;
          }

          return {
            ...item,
            email: updatedUser.email || item.email,
            username: updatedUser.username || item.username,
            organizationUnit: updatedUser.organizationUnit || '',
            isImported: true,
            userId: updatedUser.id,
            authSource: updatedUser.authSource || 'ldap'
          };
        }));
      }

      setSuccess(payload.message || 'User info refreshed from AD.');
    } catch {
      setError('AD refresh failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignModelRoleOverride = async () => {
    if (!selectedUserId || !selectedModelId || !selectedModelRole) {
      setError('Select model and role first.');
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/authorization/assign-model-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUserId,
          modelId: selectedModelId,
          role: selectedModelRole
        })
      });

      const payload = await response.json().catch(() => ({ message: 'Failed to assign model role override' }));
      if (!response.ok) {
        setError(payload.message || 'Failed to assign model role override');
        return;
      }

      await fetchUserModelRoles(selectedUserId);
      setSuccess('Model-specific role override saved.');
    } catch {
      setError('Failed to assign model role override');
    } finally {
      setSaving(false);
    }
  };

  const handleResetModelRoleOverride = async (modelId: string) => {
    if (!selectedUserId || !modelId) {
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/authorization/remove-model-access?modelId=${encodeURIComponent(modelId)}&userId=${encodeURIComponent(selectedUserId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const payload = await response.json().catch(() => ({ message: 'Failed to reset model role override' }));
      if (!response.ok) {
        setError(payload.message || 'Failed to reset model role override');
        return;
      }

      await fetchUserModelRoles(selectedUserId);
      setSuccess(payload.message || 'Model-specific role override removed.');
    } catch {
      setError('Failed to reset model role override');
    } finally {
      setSaving(false);
    }
  };

  const allPermissionKeys = useMemo(() => {
    return Array.from(new Set(permissionCatalog.flatMap((module) => module.actions.map((action) => action.key))));
  }, [permissionCatalog]);

  const permissionRows = useMemo(() => {
    return permissionCatalog.flatMap((module) =>
      module.actions.map((action) => ({
        moduleLabel: module.label,
        actionKey: action.key,
        actionLabel: action.label
      }))
    );
  }, [permissionCatalog]);

  const togglePermission = (
    permissionKey: string,
    setPermissions: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setPermissions((existing) => (
      existing.includes(permissionKey)
        ? existing.filter((permission) => permission !== permissionKey)
        : [...existing, permissionKey]
    ));
  };

  const selectAllPermissions = (setPermissions: React.Dispatch<React.SetStateAction<string[]>>) => {
    setPermissions(allPermissionKeys);
  };

  const clearAllPermissions = (setPermissions: React.Dispatch<React.SetStateAction<string[]>>) => {
    setPermissions([]);
  };

  const selectedUser = users.find((user) => user.id === selectedUserId) || null;
  const assignableUserRoles = appRoles.filter((role) => !userRoleAssignments.some((assignment) => assignment.roleId === role.id));
  const usersByOrganizationUnit = useMemo(() => {
    const map = new Map<string, User[]>();

    for (const user of users) {
      const key = (user.organizationUnit || '').trim() || UNGROUPED_OU;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(user);
    }

    return Array.from(map.entries())
      .map(([organizationUnit, members]) => ({
        organizationUnit,
        members: members
          .slice()
          .sort((a, b) => (a.username || a.email).localeCompare((b.username || b.email), undefined, { sensitivity: 'base' }))
      }))
      .sort((a, b) => {
        if (a.organizationUnit === UNGROUPED_OU) return 1;
        if (b.organizationUnit === UNGROUPED_OU) return -1;
        return a.organizationUnit.localeCompare(b.organizationUnit, undefined, { sensitivity: 'base' });
      });
  }, [users]);
  const openOrganizationUnitCount = useMemo(
    () => usersByOrganizationUnit.reduce((count, group) => (
      (collapsedOrganizationUnits[group.organizationUnit] ?? true) ? count : count + 1
    ), 0),
    [usersByOrganizationUnit, collapsedOrganizationUnits]
  );

  const selectedUserOrganizationUnit = selectedUser
    ? ((selectedUser.organizationUnit || '').trim() || UNGROUPED_OU)
    : '';

  useEffect(() => {
    setCollapsedOrganizationUnits((current) => {
      const next: Record<string, boolean> = {};

      for (const group of usersByOrganizationUnit) {
        const groupName = group.organizationUnit;
        next[groupName] = current[groupName] ?? true;
      }

      if (selectedUserOrganizationUnit && Object.prototype.hasOwnProperty.call(next, selectedUserOrganizationUnit)) {
        next[selectedUserOrganizationUnit] = false;
      }

      return next;
    });
  }, [usersByOrganizationUnit, selectedUserOrganizationUnit]);

  const toggleOrganizationUnit = (organizationUnit: string) => {
    setCollapsedOrganizationUnits((current) => ({
      ...current,
      [organizationUnit]: !(current[organizationUnit] ?? true)
    }));
  };

  const expandAllOrganizationUnits = () => {
    const next: Record<string, boolean> = {};
    for (const group of usersByOrganizationUnit) {
      next[group.organizationUnit] = false;
    }
    setCollapsedOrganizationUnits(next);
  };

  const collapseAllOrganizationUnits = () => {
    const next: Record<string, boolean> = {};
    for (const group of usersByOrganizationUnit) {
      next[group.organizationUnit] = true;
    }
    setCollapsedOrganizationUnits(next);
  };

  const renderPermissionMatrix = (
    currentPermissions: string[],
    setPermissions: React.Dispatch<React.SetStateAction<string[]>>,
    tableId: string
  ) => {
    const allSelected = allPermissionKeys.length > 0 && allPermissionKeys.every((key) => currentPermissions.includes(key));

    if (permissionRows.length === 0) {
      return <p className="text-sm text-slate-500">No permissions available yet.</p>;
    }

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="text-xs text-slate-600">{currentPermissions.length} permission(s) selected</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => selectAllPermissions(setPermissions)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => clearAllPermissions(setPermissions)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
            >
              Clear All
            </button>
            <label className="inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-800">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => {
                  if (allSelected) {
                    clearAllPermissions(setPermissions);
                  } else {
                    selectAllPermissions(setPermissions);
                  }
                }}
              />
              Full Access
            </label>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">Module</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">Screen / Action</th>
                <th className="border-b border-slate-200 px-4 py-3 text-center font-semibold text-slate-700">Allowed</th>
              </tr>
            </thead>
            <tbody>
              {permissionRows.map((row, index) => (
                <tr key={`${tableId}-${row.actionKey}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  <td className="border-b border-slate-200 px-4 py-3 align-middle text-slate-800">{row.moduleLabel}</td>
                  <td className="border-b border-slate-200 px-4 py-3 align-middle text-slate-700">{row.actionLabel}</td>
                  <td className="border-b border-slate-200 px-4 py-3 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={currentPermissions.includes(row.actionKey)}
                      onChange={() => togglePermission(row.actionKey, setPermissions)}
                      aria-label={`${row.moduleLabel} ${row.actionLabel}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">{success}</div>}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        <button
          onClick={() => setActiveTab('users')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === 'roles' ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
        >
          Roles
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-6">
          <div className="dm-panel p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">Active Directory User Search</div>
                <p className="mt-1 text-xs text-slate-500">Search from configured AD and import selected user into DataModeler.</p>
              </div>
              <button
                onClick={() => void fetchUsers()}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                Refresh Imported Users
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <input
                value={directoryQuery}
                onChange={(event) => setDirectoryQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSearchDirectoryUsers();
                  }
                }}
                placeholder="Email, username or display name ile AD'de ara..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => void handleSearchDirectoryUsers()}
                disabled={directorySearchLoading || directoryQuery.trim().length < 2}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-slate-400"
              >
                {directorySearchLoading ? 'Searching...' : 'Search AD'}
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Search AD butonuna tikladiktan sonra sonuc listesi secim/import icin yeni pencerede acilir.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="xl:col-span-4">
              <div className="dm-panel p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-800">Imported Users</div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">Open: {openOrganizationUnitCount}</span>
                    <button
                      onClick={expandAllOrganizationUnits}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                    >
                      Expand All
                    </button>
                    <button
                      onClick={collapseAllOrganizationUnits}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                    >
                      Collapse All
                    </button>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{users.length}</span>
                  </div>
                </div>

                <div className="max-h-[32rem] space-y-3 overflow-y-auto">
                  {usersByOrganizationUnit.map((group) => (
                    <div key={group.organizationUnit} className="rounded-lg border border-slate-200 bg-white">
                      {(() => {
                        const isCollapsed = collapsedOrganizationUnits[group.organizationUnit] ?? true;
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleOrganizationUnit(group.organizationUnit)}
                              className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
                            >
                              <div className="min-w-0 flex items-center gap-2">
                                <span className="text-xs text-slate-500" aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
                                <div className="truncate text-sm font-semibold text-slate-800" title={group.organizationUnit}>
                                  {group.organizationUnit}
                                </div>
                              </div>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{group.members.length}</span>
                            </button>

                            {!isCollapsed && (
                              <div className="space-y-1 p-2">
                                {group.members.map((user) => (
                          <div
                            key={user.id}
                            className={`w-full rounded-lg border px-2 py-2 ${selectedUserId === user.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                          >
                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_90px_auto] items-center gap-2">
                              <button
                                onClick={() => setSelectedUserId(user.id)}
                                className="truncate text-left text-sm font-medium text-slate-900"
                                title={user.username || user.email}
                              >
                                {user.username || user.email}
                              </button>
                              <button
                                onClick={() => setSelectedUserId(user.id)}
                                className="truncate text-left text-xs text-slate-700"
                                title={user.email}
                              >
                                {user.email}
                              </button>
                              <button
                                onClick={() => setSelectedUserId(user.id)}
                                className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                              >
                                {user.authSource}
                              </button>

                              <div className="flex items-center justify-end gap-1">
                                {user.authSource === 'ldap' && (
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleRefreshUserFromAd(user);
                                    }}
                                    disabled={saving}
                                    className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                                  >
                                    AD Refresh
                                  </button>
                                )}
                                {!user.isSuperAdmin ? (
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleDeleteUser(user);
                                    }}
                                    disabled={saving}
                                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:bg-slate-100 disabled:text-slate-400"
                                  >
                                    Delete
                                  </button>
                                ) : (
                                  <span className="text-right text-xs text-slate-400">System</span>
                                )}
                              </div>
                            </div>
                          </div>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="xl:col-span-8">
              <div className="dm-panel space-y-4 p-5">
                <div className="text-sm font-semibold text-slate-800">Assign Persistent Role to User</div>
                {!selectedUser ? (
                  <p className="text-sm text-slate-500">Select an imported user to assign/remove persistent roles.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
                      <div className="md:col-span-7">
                        <label className="mb-1 block text-xs text-slate-600">Selected User</label>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          <div>{selectedUser.email}</div>
                          <div className="mt-1 text-xs text-slate-500">OU: {selectedUser.organizationUnit || '-'}</div>
                        </div>
                      </div>
                      <div className="md:col-span-3">
                        <label className="mb-1 block text-xs text-slate-600">Role</label>
                        <select
                          value={selectedAppRoleId}
                          onChange={(event) => setSelectedAppRoleId(event.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Select role</option>
                          {assignableUserRoles.map((role) => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => void handleAssignRoleToUser()}
                            disabled={saving || !selectedAppRoleId}
                            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-slate-400"
                          >
                            Assign
                          </button>
                          {selectedUser.authSource === 'ldap' && (
                            <button
                              onClick={() => void handleRefreshUserFromAd(selectedUser)}
                              disabled={saving}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              AD Refresh
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {userRoleAssignments.map((assignment) => (
                        <span key={assignment.roleId} className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700">
                          {assignment.role.name}
                          <button
                            onClick={() => void handleRemoveRoleFromUser(assignment.roleId)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </span>
                      ))}
                      {userRoleAssignments.length === 0 && <p className="text-sm text-slate-500">No persistent roles assigned.</p>}
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-slate-800">Model Role Exceptions</div>
                        <p className="mt-1 text-xs text-slate-500">
                          Default behavior: user gets role on models in the same OU based on assigned persistent app role. Use overrides below for exceptions.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
                        <div className="md:col-span-7">
                          <label className="mb-1 block text-xs text-slate-600">Model</label>
                          <select
                            value={selectedModelId}
                            onChange={(event) => setSelectedModelId(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="">Select model</option>
                            {userModelRoles.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} {item.modelGroupName ? `(${item.modelGroupName})` : '(Ungrouped)'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-3">
                          <label className="mb-1 block text-xs text-slate-600">Override Role</label>
                          <select
                            value={selectedModelRole}
                            onChange={(event) => setSelectedModelRole(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            {modelRoleOptions.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <button
                            onClick={() => void handleAssignModelRoleOverride()}
                            disabled={saving || !selectedModelId || !selectedModelRole}
                            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-slate-400"
                          >
                            Save Override
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-slate-200">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700">
                              <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Model</th>
                              <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">OU</th>
                              <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Effective Role</th>
                              <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Source</th>
                              <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userModelRoles.map((item) => (
                              <tr key={item.id} className="border-b border-slate-100">
                                <td className="px-3 py-2 text-slate-800">{item.name}</td>
                                <td className="px-3 py-2 text-slate-700">{item.modelGroupName || '-'}</td>
                                <td className="px-3 py-2 text-slate-700">{item.role}</td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex rounded-full px-2 py-1 text-xs ${item.roleSource === 'explicit' ? 'bg-amber-100 text-amber-700' : item.roleSource === 'default_ou' ? 'bg-emerald-100 text-emerald-700' : item.roleSource === 'owner' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {item.roleSource}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {item.hasExplicitAssignment && (
                                    <button
                                      onClick={() => void handleResetModelRoleOverride(item.id)}
                                      disabled={saving}
                                      className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                      Reset Override
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {userModelRoles.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                                  No model role context available.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-4 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-800 mb-3">Create New Role</div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Role Name</label>
                  <input
                    value={newRoleName}
                    onChange={(event) => setNewRoleName(event.target.value)}
                    placeholder="business_analyst"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Description</label>
                  <input
                    value={newRoleDescription}
                    onChange={(event) => setNewRoleDescription(event.target.value)}
                    placeholder="Optional description"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() => void handleCreateRole()}
                  disabled={saving || !newRoleName.trim()}
                  className="w-full rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-medium hover:bg-emerald-700 disabled:bg-slate-400"
                >
                  Create Role
                </button>
                <p className="text-xs text-slate-500">
                  New role is created first. Then select it from list and edit permissions in the matrix.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-800">Roles</div>
                <button
                  onClick={() => void fetchAppRoles()}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
                >
                  Refresh
                </button>
              </div>

              <div className="max-h-[34rem] overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Role</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Perm.</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appRoles.map((role) => (
                      <tr
                        key={role.id}
                        className={`border-t border-slate-200 cursor-pointer ${editingRoleId === role.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                        onClick={() => openRoleEditor(role)}
                      >
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium text-slate-900">{role.name}</div>
                        </td>
                        <td className="px-3 py-2 align-top text-slate-700">{role.permissions.length}</td>
                        <td className="px-3 py-2 text-right align-top">
                          {!role.isSystem && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDeleteRole(role);
                              }}
                              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="xl:col-span-8">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Role Permission Matrix</div>
                  <div className="text-xs text-slate-500">Select a role from list, then update matrix.</div>
                </div>
                {editingRoleId && (
                  <button
                    onClick={resetRoleEditor}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {!editingRoleId ? (
                <p className="text-sm text-slate-500 py-8 text-center">Select a role from the list to open matrix.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">Role Name</label>
                      <input
                        value={editingRoleName}
                        readOnly
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">Description</label>
                      <input
                        value={editingRoleDescription}
                        onChange={(event) => setEditingRoleDescription(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  {renderPermissionMatrix(editingRolePermissions, setEditingRolePermissions, 'edit-role')}

                  <div className="flex justify-end">
                    <button
                      onClick={() => void handleUpdateRole()}
                      disabled={saving || !editingRoleId}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-slate-400"
                    >
                      Save Role Permissions
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isDirectoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-6xl rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">AD Search Results</h3>
                <p className="mt-1 text-xs text-slate-500">Select users to import into DataModeler.</p>
              </div>
              <button
                onClick={() => {
                  setIsDirectoryModalOpen(false);
                  setSelectedDirectoryEmails([]);
                }}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-100"
                aria-label="Close"
              >
                X
              </button>
            </div>

            <div className="max-h-[65vh] overflow-auto px-5 py-4">
              {directoryResults.length === 0 ? (
                <p className="py-6 text-sm text-slate-500">
                  {directorySearchLoading ? 'Searching Active Directory...' : 'No users found.'}
                </p>
              ) : (
                <table className="w-full min-w-[820px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700">
                      <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Select</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Display Name</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Email</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Username</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Organization Unit</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directoryResults.map((item) => {
                      const lowered = item.email.toLowerCase();
                      return (
                        <tr key={`${item.email}-${item.distinguishedName}`} className="border-b border-slate-100">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedDirectoryEmails.includes(lowered)}
                              onChange={() => toggleDirectoryUserSelection(item.email)}
                              disabled={item.isImported || directoryImporting}
                            />
                          </td>
                          <td className="px-3 py-2 text-slate-800">{item.displayName || '-'}</td>
                          <td className="px-3 py-2 text-slate-700">{item.email}</td>
                          <td className="px-3 py-2 text-slate-700">{item.username || '-'}</td>
                          <td className="px-3 py-2 text-slate-700">{item.organizationUnit || '-'}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs ${item.isImported ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {item.isImported ? 'Imported' : 'Not Imported'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
              <div className="text-xs text-slate-600">
                {selectedDirectoryEmails.length} selected
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsDirectoryModalOpen(false);
                    setSelectedDirectoryEmails([]);
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Kapat
                </button>
                <button
                  onClick={() => void handleImportSelectedDirectoryUsers()}
                  disabled={directoryImporting || selectedDirectoryEmails.length === 0}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-slate-400"
                >
                  {directoryImporting ? 'Importing...' : 'Import Selected'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
