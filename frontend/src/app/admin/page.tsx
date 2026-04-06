'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import { AdSettingsTab } from './tabs/AdSettingsTab';
import { UserRoleTab } from './tabs/UserRoleTab';
import { AuditLogsTab } from './tabs/AuditLogsTab';
import { RepositoriesTab } from './tabs/RepositoriesTab';

type TabType = 'ad-settings' | 'users' | 'audit-logs' | 'repositories';

export default function AdminPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('ad-settings');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!user?.isSuperAdmin) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!isAuthenticated || !user?.isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h1>
          <p className="text-slate-600">You do not have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white/90 border-b border-slate-200 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Panel</h1>
            <p className="text-sm text-slate-500 mt-1">Manage identity, authorization, audit and integrations.</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/models')}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Back to Models
            </button>
            <span className="text-sm text-slate-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-2 py-3 overflow-x-auto">
            {[
              { id: 'ad-settings' as TabType, label: 'AD Settings' },
              { id: 'users' as TabType, label: 'Users & Roles' },
              { id: 'audit-logs' as TabType, label: 'Audit Logs' },
              { id: 'repositories' as TabType, label: 'Repositories' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6">
          {activeTab === 'ad-settings' && <AdSettingsTab />}
          {activeTab === 'users' && <UserRoleTab />}
          {activeTab === 'audit-logs' && <AuditLogsTab />}
          {activeTab === 'repositories' && <RepositoriesTab />}
        </div>
      </main>
    </div>
  );
}
