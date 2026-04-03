'use client';

import React, { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface User {
  id: string;
  email: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
}

interface UserRole {
  userId: string;
  userEmail: string;
  models: Array<{
    modelId: string;
    modelName: string;
    role: string;
  }>;
}

export function UserRoleTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const panelClass = 'bg-slate-50 border border-slate-200 rounded-xl p-5';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/authorization/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load users');
      setLoading(false);
    }
  };

  const handleSelectUser = async (userId: string) => {
    setSelectedUserId(userId);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/authorization/user-models/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUserRoles(data);
    } catch (err) {
      setError('Failed to load user roles');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Loading users...</div>;
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Users List */}
        <div className="xl:col-span-4">
          <div className={panelClass}>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Users</h3>
            <div className="space-y-2">
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                    selectedUserId === user.id
                      ? 'bg-indigo-50 border-indigo-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-slate-900">{user.email}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {user.isSuperAdmin && 'Super Admin'}
                    {!user.isActive && ' (Inactive)'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Model Roles */}
        <div className="xl:col-span-8">
          {selectedUserId && userRoles ? (
            <div className={panelClass}>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Models & Roles for {userRoles.userEmail}
              </h3>

              {userRoles.models.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No model assignments</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/80">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Model</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Role</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userRoles.models.map(model => (
                        <tr key={model.modelId} className="border-b border-slate-200 hover:bg-slate-100/70 transition">
                          <td className="px-4 py-3 text-slate-800">{model.modelName}</td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                              {model.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRemoveAccess(userRoles.userId, model.modelId)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className={`${panelClass} text-center text-slate-500`}>
              Select a user to view their model assignments
            </div>
          )}
        </div>
      </div>
    </div>
  );

  async function handleRemoveAccess(userId: string, modelId: string) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/authorization/remove-model-access`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, modelId })
      });

      if (response.ok) {
        setSuccess('Access removed successfully');
        handleSelectUser(userId);
      } else {
        setError('Failed to remove access');
      }
    } catch (err) {
      setError('Error removing access');
    }
  }
}
