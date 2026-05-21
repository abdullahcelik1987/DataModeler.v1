'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Database, GitBranch, ShieldCheck } from 'lucide-react';

export default function Home() {
  const [apiHealth, setApiHealth] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`);
        setApiHealth(response.ok ? 'healthy' : 'unhealthy');
      } catch {
        setApiHealth('unhealthy');
      }
    };

    checkHealth();
  }, []);

  return (
    <div className="dm-page">
      <div className="dm-shell space-y-8">
        <section className="dm-surface p-8 md:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Data Model Workspace</p>
              <h1 className="dm-title mt-3">DataModeler</h1>
              <p className="dm-subtitle mt-3">
                Text-first DBML editing, real-time collaboration, and schema governance in a single control panel.
              </p>
            </div>

            <div className="dm-panel min-w-[220px] px-5 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">System Status</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    apiHealth === 'healthy'
                      ? 'bg-emerald-500'
                      : apiHealth === 'unhealthy'
                      ? 'bg-rose-500'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="text-sm font-semibold text-slate-700">
                  {apiHealth === 'healthy'
                    ? 'API Connected'
                    : apiHealth === 'unhealthy'
                    ? 'API Unavailable'
                    : 'Checking'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/login" className="dm-btn-primary min-w-[160px]">
              Open Workspace
            </Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: Database,
              title: 'DBML Editor',
              text: 'Write and validate schemas with syntax-focused editing and instant feedback.'
            },
            {
              icon: Activity,
              title: 'Live Diagram',
              text: 'Visual ERD canvas synchronized with DBML for rapid architecture exploration.'
            },
            {
              icon: GitBranch,
              title: 'Version Flow',
              text: 'Track model evolution and prepare migration workflows across environments.'
            },
            {
              icon: ShieldCheck,
              title: 'Access Control',
              text: 'Role-based access and auditability for enterprise-grade collaboration.'
            },
          ].map((feature) => (
            <article key={feature.title} className="dm-panel p-5">
              <feature.icon className="h-6 w-6 text-blue-700" strokeWidth={2.2} />
              <h2 className="mt-4 text-lg font-bold text-slate-900">{feature.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{feature.text}</p>
            </article>
          ))}
        </section>

        <section className="dm-panel p-6 md:p-8">
          <h2 className="text-xl font-bold text-slate-900">Built for governed data modeling</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Keep your modeling workflow in DBML without losing visual context, collaboration visibility, or enterprise controls.
            Functionality remains identical while the interface is tuned for faster scanning and cleaner decision points.
          </p>
        </section>
      </div>
    </div>
  );
}
