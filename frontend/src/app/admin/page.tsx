'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import { AppShell } from '@/src/components/admin/AppShell';
import { AdSettingsTab } from './tabs/AdSettingsTab';
import { UserRoleTab } from './tabs/UserRoleTab';
import { AuditLogsTab } from './tabs/AuditLogsTab';
import { RepositoriesTab } from './tabs/RepositoriesTab';
import { DataTypesTab } from './tabs/DataTypesTab';
import ProjectMetadataTab from './tabs/ProjectMetadataTab';
import WorkflowDesignerTab from './tabs/WorkflowDesignerTab';
import { getStandardTabClass } from '@/src/lib/tabStyles';

type TabType = 'ad-settings' | 'users' | 'audit-logs' | 'repositories' | 'data-types' | 'project-metadata' | 'workflow-designer';

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
      <div className="dm-page flex items-center justify-center">
        <div className="dm-surface max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h1>
          <p className="text-slate-600">You do not have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      title="Admin Panel"
      subtitle="Manage identity, authorization, audit and integrations from one control center."
      currentArea="admin"
      userEmail={user?.email}
      onLogout={handleLogout}
      topActions={(
        <button
          onClick={() => router.push('/models')}
          className="dm-btn-secondary"
        >
          Back to Models
        </button>
      )}
    >
      <div className="sticky top-0 z-10 mb-5 border-b border-slate-200 bg-white/80 pb-4 backdrop-blur">
        <nav className="flex gap-2 overflow-x-auto">
          {[
            { id: 'ad-settings' as TabType, label: 'AD Settings' },
            { id: 'users' as TabType, label: 'Users & Roles' },
            { id: 'audit-logs' as TabType, label: 'Audit Logs' },
            { id: 'repositories' as TabType, label: 'Repositories' },
            { id: 'data-types' as TabType, label: 'Data Types' },
            { id: 'project-metadata' as TabType, label: 'Project Metadata' },
            { id: 'workflow-designer' as TabType, label: '🔄 Workflow Designer' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={getStandardTabClass(activeTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="dm-panel p-4 sm:p-6">
        {activeTab === 'ad-settings' && <AdSettingsTab />}
        {activeTab === 'users' && <UserRoleTab />}
        {activeTab === 'audit-logs' && <AuditLogsTab />}
        {activeTab === 'repositories' && <RepositoriesTab />}
        {activeTab === 'data-types' && <DataTypesTab />}
        {activeTab === 'project-metadata' && <ProjectMetadataTab />}
        {activeTab === 'workflow-designer' && <WorkflowDesignerTab />}
      </div>
    </AppShell>
  );
}
