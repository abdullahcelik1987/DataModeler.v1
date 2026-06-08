'use client';

import Link from 'next/link';
import { Database, GitPullRequestArrow, PencilRuler, Settings, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080')
  .replace(/\/$/, '')
  .replace(/\/api$/, '');

type AppArea = 'models' | 'designer' | 'change-requests' | 'admin';

type NavItem = {
  id: AppArea;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }>;
};

type AppShellProps = {
  title: string;
  subtitle: string;
  currentArea: AppArea;
  userEmail?: string;
  onLogout?: () => void;
  topActions?: React.ReactNode;
  sideActions?: React.ReactNode;
  notificationCountByArea?: Partial<Record<AppArea, number>>;
  children: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'models', label: 'Data Models', href: '/models', icon: Database },
  { id: 'designer', label: 'Designer', href: '/designer', icon: PencilRuler },
  { id: 'change-requests', label: 'Change Requests', href: '/change-requests', icon: GitPullRequestArrow },
  { id: 'admin', label: 'Admin Console', href: '/admin', icon: Settings },
];

export function AppShell({
  title,
  subtitle,
  currentArea,
  userEmail,
  onLogout,
  topActions,
  sideActions,
  notificationCountByArea,
  children,
}: AppShellProps) {
  const [internalPendingCount, setInternalPendingCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const resp = await fetch(`${API_BASE}/api/change-requests/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return;
        const data: unknown = await resp.json();
        setInternalPendingCount(Array.isArray(data) ? data.length : 0);
      } catch {
        // network errors are silently ignored; badge stays at last known value
      }
    };

    void fetchPendingCount();
    const interval = setInterval(() => void fetchPendingCount(), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Prop values take precedence over internally fetched values so
  // the change-requests page can still pass its own count.
  const effectiveCounts: Partial<Record<AppArea, number>> = {
    'change-requests': internalPendingCount,
    ...notificationCountByArea,
  };

  return (
    <div className="dm-page !p-0 md:!p-0">
      <div className="flex min-h-screen w-full gap-4 p-0 md:gap-5 md:p-0">
        <aside className="hidden w-72 shrink-0 lg:flex lg:flex-col">
          <div className="dm-surface sticky top-5 flex h-[calc(100vh-2.5rem)] flex-col p-5">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Sparkles className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">DataModeler</p>
                <p className="text-xs text-slate-500">Governed Data Workspace</p>
              </div>
            </div>

            <nav className="space-y-2">
              {NAV_ITEMS.map((item) => {
                const isActive = item.id === currentArea;
                const Icon = item.icon;
                const notificationCount = effectiveCounts[item.id] ?? 0;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`dm-shell-nav ${isActive ? 'dm-shell-nav-active' : ''}`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                    <span>{item.label}</span>
                    {notificationCount > 0 ? (
                      <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            {sideActions ? (
              <div className="mt-5 space-y-2">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Quick Actions</p>
                {sideActions}
              </div>
            ) : null}

            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
              Unified corporate shell active.
              <br />
              Layout and behavior are standardized across modules.
            </div>

            <div className="mt-auto rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Signed in as</p>
              <p className="truncate text-sm font-semibold text-slate-700">{userEmail || 'Unknown user'}</p>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="mt-2 text-xs font-semibold text-rose-600 transition hover:text-rose-700"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="dm-surface p-4 md:p-5">
            <div className="mb-3 flex gap-2 lg:hidden">
              {NAV_ITEMS.map((item) => {
                const isActive = item.id === currentArea;
                const notificationCount = effectiveCounts[item.id] ?? 0;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`dm-tab ${
                      isActive
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {item.label}
                    {notificationCount > 0 ? (
                      <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>

            {sideActions ? <div className="mb-3 grid gap-2 lg:hidden">{sideActions}</div> : null}

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
                <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
              </div>
              {topActions ? <div className="flex flex-wrap items-center gap-2">{topActions}</div> : null}
            </div>
          </div>

          <div className="dm-panel p-4 md:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
