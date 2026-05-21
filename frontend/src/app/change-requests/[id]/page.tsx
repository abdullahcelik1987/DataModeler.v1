'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/src/components/admin/AppShell';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';
import { useAuth } from '@/src/hooks/useAuth';
import DbmlSplitDiffView from '@/src/components/change-requests/DbmlSplitDiffView';
import { WorkflowExplorer } from '@/src/components/change-requests/WorkflowExplorer';
import { ChangeRequestDetail } from '@/src/types/changeRequests';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '').replace(/\/api$/, '');

function ChangeRequestDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

  const requestId = params.id;
  const mode = searchParams.get('mode') === 'pending' ? 'pending' : 'mine';

  const [detail, setDetail] = useState<ChangeRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const loadDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/change-requests/${requestId}`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load detail.');
      }

      const data = (await response.json()) as ChangeRequestDetail;
      setDetail(data);
    } catch {
      setError('Change request detail could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [requestId]);

  const executeAction = async (action: 'submit' | 'approve' | 'reject' | 'merge') => {
    if (!detail) {
      return;
    }

    const comment = window.prompt('Comment (optional):', '') || '';
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/change-requests/${detail.id}/${action}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        const raw = await response.text().catch(() => 'Action failed');
        let message = raw || 'Action failed';

        try {
          const parsed = JSON.parse(raw) as { message?: string };
          if (parsed.message) {
            message = parsed.message;
          }
        } catch {
          // Keep raw response text when it is not JSON.
        }

        throw new Error(message);
      }

      await loadDetail();
    } catch (err) {
      const message = err instanceof Error ? err.message : `Action '${action}' failed.`;
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };
  const canSubmit = detail?.canSubmit ?? false;
  const canApprove = detail?.canApprove ?? false;
  const canReject = detail?.canReject ?? false;
  const canMerge = detail?.canMerge ?? false;

  return (
    <AppShell
      title="Change Request Detail"
      subtitle="Inspect DBML diff and run workflow actions"
      currentArea="change-requests"
      userEmail={user?.email}
      onLogout={() => {
        logout();
        router.push('/');
      }}
      topActions={(
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push(`/change-requests?mode=${mode}`)}
            className="dm-btn-secondary"
          >
            Geri Don
          </button>
          <button
            type="button"
            onClick={() => window.open(`${API_URL}/api/change-requests/${requestId}/sql`, '_blank')}
            className="dm-btn-secondary"
          >
            Download SQL
          </button>
        </div>
      )}
    >
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading || !detail ? (
        <p className="text-sm text-slate-500">Loading detail...</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{detail.changeCode || '-'}</p>
                <h1 className="text-xl font-bold text-slate-900">{detail.title}</h1>
                <p className="text-sm text-slate-600">{detail.modelName} | {detail.status}</p>
                <p className="text-xs text-slate-500">Requester: {detail.requesterEmail}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {canSubmit && (
                  <button type="button" onClick={() => executeAction('submit')} disabled={actionLoading} className="dm-btn-secondary">
                    Submit
                  </button>
                )}
                {canApprove && (
                  <button type="button" onClick={() => executeAction('approve')} disabled={actionLoading} className="dm-btn-primary">
                    Approve
                  </button>
                )}
                {canReject && (
                  <button type="button" onClick={() => executeAction('reject')} disabled={actionLoading} className="dm-btn-secondary">
                    Reject
                  </button>
                )}
                {canMerge && (
                  <button type="button" onClick={() => executeAction('merge')} disabled={actionLoading} className="dm-btn-secondary">
                    Mark Merged
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow Explorer</p>
            <div className="mt-3 h-96 overflow-hidden rounded-xl border border-slate-200">
              <WorkflowExplorer
                stages={detail.workflowStages}
                currentStageIndex={detail.currentStageIndex}
                approvalLogs={detail.approvalLogs}
                status={detail.status}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">DBML Split Diff</p>
            <div className="mt-3">
              <DbmlSplitDiffView oldDbml={detail.oldDbmlSnapshot} newDbml={detail.newDbmlSnapshot} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Generated SQL</p>
            <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {detail.generatedSql}
            </pre>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function ChangeRequestDetailPage() {
  return (
    <ProtectedRoute>
      <ChangeRequestDetailContent />
    </ProtectedRoute>
  );
}
