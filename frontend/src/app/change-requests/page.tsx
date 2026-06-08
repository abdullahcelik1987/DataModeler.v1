'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/src/components/admin/AppShell';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';
import { useAuth } from '@/src/hooks/useAuth';
import { WorkflowExplorer } from '@/src/components/change-requests/WorkflowExplorer';
import {
  ChangeRequestApprovalLog,
  ChangeRequestDetail,
  ChangeRequestFilter,
  ChangeRequestListItem,
  ChangeRequestWorkflowStage,
} from '@/src/types/changeRequests';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '').replace(/\/api$/, '');

const FINAL_STATUSES = new Set(['Approved', 'Merged', 'Rejected']);

type StageViewState = 'completed' | 'current' | 'upcoming' | 'rejected';

function getStatusClasses(status: string): string {
  switch (status) {
    case 'Approved':
      return 'border-emerald-300 bg-emerald-50 text-emerald-700';
    case 'Merged':
      return 'border-teal-300 bg-teal-50 text-teal-700';
    case 'Rejected':
      return 'border-rose-300 bg-rose-50 text-rose-700';
    case 'Pending_Business':
    case 'Pending_Architect':
      return 'border-amber-300 bg-amber-50 text-amber-700';
    case 'Draft':
      return 'border-slate-300 bg-slate-100 text-slate-700';
    default:
      return 'border-slate-300 bg-slate-100 text-slate-700';
  }
}

function getStageClasses(state: StageViewState): string {
  if (state === 'completed') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-emerald-100';
  }

  if (state === 'current') {
    return 'border-amber-300 bg-amber-50 text-amber-700 shadow-amber-100 ring-2 ring-amber-200';
  }

  if (state === 'rejected') {
    return 'border-rose-300 bg-rose-50 text-rose-700 shadow-rose-100';
  }

  return 'border-slate-200 bg-white text-slate-500 shadow-slate-100';
}

function getStageStateLabel(state: StageViewState): string {
  if (state === 'completed') {
    return 'Tamamlandi';
  }

  if (state === 'current') {
    return 'Aktif';
  }

  if (state === 'rejected') {
    return 'Reddedildi';
  }

  return 'Sirada';
}

function findStageActionLog(logs: ChangeRequestApprovalLog[], stage: ChangeRequestWorkflowStage): ChangeRequestApprovalLog | null {
  const matches = logs
    .filter((log) => log.fromStatus === stage.pendingStatus)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return matches.length > 0 ? matches[matches.length - 1] : null;
}

function getCurrentStageIndex(detail: ChangeRequestDetail): number {
  if (detail.workflowStages.length === 0) {
    return -1;
  }

  if (detail.currentStageIndex >= 0 && detail.currentStageIndex < detail.workflowStages.length) {
    return detail.currentStageIndex;
  }

  const statusMatchIndex = detail.workflowStages.findIndex((stage) => stage.pendingStatus === detail.status);
  if (statusMatchIndex >= 0) {
    return statusMatchIndex;
  }

  if (detail.status === 'Draft') {
    return 0;
  }

  if (detail.status === 'Approved' || detail.status === 'Merged') {
    return detail.workflowStages.length - 1;
  }

  return 0;
}

function getPendingRoleLabel(status: string): string {
  if (status === 'Pending_Architect') {
    return 'Data Architect';
  }

  if (status === 'Pending_Business') {
    return 'Business Domain Architect';
  }

  return 'Approver';
}

function getHoursSince(isoDate: string): number {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diffMs / 3600000));
}

function getInboxUrgencyClass(hoursWaiting: number): string {
  if (hoursWaiting >= 48) {
    return 'border-rose-300 bg-rose-50 text-rose-700';
  }

  if (hoursWaiting >= 24) {
    return 'border-amber-300 bg-amber-50 text-amber-700';
  }

  return 'border-emerald-300 bg-emerald-50 text-emerald-700';
}

function getInboxUrgencyLabel(hoursWaiting: number): string {
  if (hoursWaiting >= 48) {
    return 'Gecikmiş';
  }

  if (hoursWaiting >= 24) {
    return 'Bugün öncelikli';
  }

  return 'Normal';
}

function ChangeRequestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

  const [items, setItems] = useState<ChangeRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [canViewPending, setCanViewPending] = useState(false);
  const [canDeleteRequests, setCanDeleteRequests] = useState(false);
  const [activeTab, setActiveTab] = useState<'mine' | 'pending'>(() => {
    const mode = searchParams.get('mode');
    return mode === 'mine' ? 'mine' : 'pending';
  });
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [requester, setRequester] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ChangeRequestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [pendingInboxCount, setPendingInboxCount] = useState(0);
  const [pendingOverdueCount, setPendingOverdueCount] = useState(0);
  const [pendingTodayCount, setPendingTodayCount] = useState(0);
  const [pendingOnlyOverdue, setPendingOnlyOverdue] = useState(false);
  const [pendingQuery, setPendingQuery] = useState('');
  const [pendingStatsLoading, setPendingStatsLoading] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const buildDefaultFilter = (mode: 'mine' | 'pending'): ChangeRequestFilter => {
    if (mode === 'pending') {
      return {
        mode,
        status: 'pending',
      };
    }

    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 7);

    return {
      mode,
      fromDate: defaultFrom.toISOString().slice(0, 10),
    };
  };

  const hydrateFilterInputs = (filter: ChangeRequestFilter) => {
    setFromDate(filter.fromDate ?? '');
    setToDate(filter.toDate ?? '');
    setRequester(filter.requester ?? '');
    setStatus(filter.status ?? '');
  };

  const loadList = async (filter: ChangeRequestFilter) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const params = new URLSearchParams();
      params.set('mode', filter.mode);

      if (filter.fromDate) {
        params.set('fromDate', filter.fromDate);
      }

      if (filter.toDate) {
        params.set('toDate', filter.toDate);
      }

      if (filter.requester) {
        params.set('requester', filter.requester);
      }

      if (filter.status) {
        params.set('status', filter.status);
      }

      const response = await fetch(`${API_URL}/api/change-requests/list?${params.toString()}`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load change requests.');
      }

      const data = (await response.json()) as ChangeRequestListItem[];
      setItems(data);

      if (data.length === 0) {
        setSelectedRequestId(null);
        setSelectedDetail(null);
        setDetailError(null);
        return;
      }

      const nextSelectedId = data.some((item) => item.id === selectedRequestId)
        ? selectedRequestId
        : data[0].id;

      setSelectedRequestId(nextSelectedId);
    } catch {
      setError('Change request lists could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (requestId: string) => {
    setDetailLoading(true);
    setDetailError(null);

    try {
      const response = await fetch(`${API_URL}/api/change-requests/${requestId}`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load request detail.');
      }

      const data = (await response.json()) as ChangeRequestDetail;
      setSelectedDetail(data);
    } catch {
      setSelectedDetail(null);
      setDetailError('Secili degisikligin workflow bilgisi yuklenemedi.');
    } finally {
      setDetailLoading(false);
    }
  };

  const loadCapabilities = async (): Promise<{ canDelete: boolean; canViewPending: boolean }> => {
    try {
      const response = await fetch(`${API_URL}/api/change-requests/capabilities`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load capabilities.');
      }

      const data = (await response.json()) as { canDelete?: boolean; canViewPending?: boolean };
      const capabilities = {
        canDelete: Boolean(data.canDelete),
        canViewPending: Boolean(data.canViewPending),
      };

      setCanDeleteRequests(capabilities.canDelete);
      setCanViewPending(capabilities.canViewPending);
      return capabilities;
    } catch {
      setCanDeleteRequests(false);
      setCanViewPending(false);
      return { canDelete: false, canViewPending: false };
    }
  };

  const loadPendingInboxStats = async (canViewOverride?: boolean) => {
    const canView = canViewOverride ?? canViewPending;
    if (!canView) {
      setPendingInboxCount(0);
      setPendingOverdueCount(0);
      setPendingTodayCount(0);
      return;
    }

    setPendingStatsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('mode', 'pending');
      params.set('status', 'pending');

      const response = await fetch(`${API_URL}/api/change-requests/list?${params.toString()}`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load pending inbox stats.');
      }

      const data = (await response.json()) as ChangeRequestListItem[];
      const today = new Date().toISOString().slice(0, 10);

      const overdue = data.filter((item) => getHoursSince(item.createdAt) >= 48).length;
      const todayCount = data.filter((item) => item.createdAt.slice(0, 10) === today).length;

      setPendingInboxCount(data.length);
      setPendingOverdueCount(overdue);
      setPendingTodayCount(todayCount);
    } catch {
      setPendingInboxCount(0);
      setPendingOverdueCount(0);
      setPendingTodayCount(0);
    } finally {
      setPendingStatsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const capabilities = await loadCapabilities();

      const mode = searchParams.get('mode');
      const initialMode: 'mine' | 'pending' = mode === 'mine'
        ? 'mine'
        : capabilities.canViewPending
          ? 'pending'
          : 'mine';
      setActiveTab(initialMode);

      const defaults = buildDefaultFilter(initialMode);
      hydrateFilterInputs(defaults);
      await loadList(defaults);

      if (capabilities.canViewPending) {
        await loadPendingInboxStats(capabilities.canViewPending);
      }
    };

    void initialize();
  }, []);

  useEffect(() => {
    if (!canViewPending) {
      return;
    }

    void loadPendingInboxStats();
  }, [canViewPending]);

  useEffect(() => {
    if (!canViewPending && activeTab === 'pending') {
      setActiveTab('mine');
      const defaults = buildDefaultFilter('mine');
      hydrateFilterInputs(defaults);
      router.replace('/change-requests?mode=mine');
      void loadList(defaults);
    }
  }, [canViewPending]);

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'mine' || (mode === 'pending' && canViewPending)) {
      setActiveTab(mode);
      return;
    }

    if (mode === 'pending' && !canViewPending) {
      setActiveTab('mine');
      router.replace('/change-requests?mode=mine');
    }
  }, [searchParams, canViewPending]);

  useEffect(() => {
    if (!selectedRequestId) {
      setSelectedDetail(null);
      setDetailError(null);
      return;
    }

    void loadDetail(selectedRequestId);
  }, [selectedRequestId]);

  const onModeChange = (mode: 'mine' | 'pending') => {
    if (mode === 'pending' && !canViewPending) {
      setError('Onay bekleyenler ekranina erisim yetkiniz yok.');
      return;
    }

    setError(null);
    setActiveTab(mode);
    const defaults = buildDefaultFilter(mode);
    hydrateFilterInputs(defaults);
    router.replace(`/change-requests?mode=${mode}`);
    void loadList(defaults);
  };

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'Tum statusler' },
      { value: 'pending', label: 'Pending (all)' },
      { value: 'Draft', label: 'Draft' },
      { value: 'Pending_Business', label: 'Pending Business' },
      { value: 'Pending_Architect', label: 'Pending Architect' },
      { value: 'Approved', label: 'Approved' },
      { value: 'Rejected', label: 'Rejected' },
      { value: 'Merged', label: 'Merged' },
    ],
    []
  );

  const onFetch = () => {
    const filter: ChangeRequestFilter = {
      mode: activeTab,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      requester: requester || undefined,
      status: status || undefined,
    };

    void loadList(filter);
  };

  const filteredPendingItems = useMemo(() => {
    if (activeTab !== 'pending') {
      return items;
    }

    const normalizedQuery = pendingQuery.trim().toLowerCase();
    return items.filter((item) => {
      const hoursWaiting = getHoursSince(item.createdAt);
      if (pendingOnlyOverdue && hoursWaiting < 48) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchText = [item.changeCode, item.modelName, item.title, item.requesterEmail, item.requesterName]
        .join(' ')
        .toLowerCase();

      return searchText.includes(normalizedQuery);
    });
  }, [activeTab, items, pendingOnlyOverdue, pendingQuery]);

  useEffect(() => {
    if (activeTab !== 'pending') {
      return;
    }

    if (filteredPendingItems.length === 0) {
      setSelectedRequestId(null);
      setSelectedDetail(null);
      return;
    }

    if (!selectedRequestId || !filteredPendingItems.some((item) => item.id === selectedRequestId)) {
      setSelectedRequestId(filteredPendingItems[0].id);
    }
  }, [activeTab, filteredPendingItems, selectedRequestId]);

  const onDelete = async (id: string) => {
    if (!canDeleteRequests) {
      setError('Bu islem sadece admin kullanicilar tarafindan yapilabilir.');
      return;
    }

    const shouldDelete = window.confirm('Bu degisiklik silinecek ve geri alinacak. Devam edilsin mi?');
    if (!shouldDelete) {
      return;
    }

    setDeletingId(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/change-requests/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || 'Degisiklik silinemedi.');
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedRequestId === id) {
        setSelectedRequestId(null);
        setSelectedDetail(null);
      }
      setSuccess('Degisiklik silindi ve geri alindi.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Degisiklik silinemedi.';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const onSelectRequest = (requestId: string) => {
    setSelectedRequestId(requestId);
  };

  const currentStageIndex = useMemo(() => {
    if (!selectedDetail) {
      return -1;
    }

    return getCurrentStageIndex(selectedDetail);
  }, [selectedDetail]);

  const rejectedStageIndex = useMemo(() => {
    if (!selectedDetail || selectedDetail.status !== 'Rejected') {
      return -1;
    }

    const rejectionLog = selectedDetail.approvalLogs
      .filter((log) => log.toStatus === 'Rejected')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .pop();

    if (!rejectionLog || !rejectionLog.fromStatus) {
      return currentStageIndex;
    }

    return selectedDetail.workflowStages.findIndex((stage) => stage.pendingStatus === rejectionLog.fromStatus);
  }, [selectedDetail, currentStageIndex]);

  return (
    <AppShell
      title="Change Requests"
      subtitle="Approval workflow, visual diff, and SQL script export"
      currentArea="change-requests"
      notificationCountByArea={{ 'change-requests': pendingInboxCount }}
      userEmail={user?.email}
      onLogout={() => {
        logout();
        router.push('/');
      }}
    >
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="mb-4 inline-flex rounded-lg border border-slate-200 p-1 text-sm">
        <button
          type="button"
          onClick={() => onModeChange('pending')}
          disabled={!canViewPending}
          className={`rounded-md px-3 py-1.5 ${activeTab === 'pending' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
        >
          Onay Gelen Kutusu
          {pendingInboxCount > 0 ? ` (${pendingInboxCount > 99 ? '99+' : pendingInboxCount})` : ''}
        </button>
        <button
          type="button"
          onClick={() => onModeChange('mine')}
          className={`rounded-md px-3 py-1.5 ${activeTab === 'mine' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
        >
          Değişiklik Listeleme
        </button>
      </div>

      {activeTab === 'pending' && (
        <section className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Toplam Bekleyen</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{pendingStatsLoading ? '...' : pendingInboxCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bugün Gelen</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{pendingStatsLoading ? '...' : pendingTodayCount}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Gecikmiş</p>
            <p className="mt-2 text-2xl font-bold text-amber-800">{pendingStatsLoading ? '...' : pendingOverdueCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hızlı İşlemler</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const filter = buildDefaultFilter('pending');
                  hydrateFilterInputs(filter);
                  void loadList(filter);
                  void loadPendingInboxStats();
                }}
                className="dm-btn-primary px-3 py-1.5 text-xs"
              >
                Yenile
              </button>
              <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={pendingOnlyOverdue}
                  onChange={(event) => setPendingOnlyOverdue(event.target.checked)}
                />
                Sadece gecikmiş
              </label>
            </div>
          </div>
        </section>
      )}

      <div className="grid min-h-[calc(100vh-240px)] grid-cols-1 gap-4 lg:grid-rows-[52vh_42vh]">
        <section className="grid h-full min-h-[360px] grid-cols-1 gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            {activeTab === 'pending' ? (
              <>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Gelen Kutusu</h2>
                <p className="mt-1 text-xs text-slate-500">Sadece rolüne atanmış onay kayıtları görünür.</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Hızlı Arama</label>
                    <input
                      type="text"
                      value={pendingQuery}
                      onChange={(event) => setPendingQuery(event.target.value)}
                      placeholder="CR kodu, model, talep sahibi"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={pendingOnlyOverdue}
                      onChange={(event) => setPendingOnlyOverdue(event.target.checked)}
                    />
                    Sadece 48+ saat bekleyenler
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingQuery('');
                      setPendingOnlyOverdue(false);
                    }}
                    className="dm-btn-secondary w-full"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Filtreler</h2>

                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Baslangic Tarihi</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Bitis Tarihi</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Kullanici (email/username)</label>
                    <input
                      type="text"
                      value={requester}
                      onChange={(event) => setRequester(event.target.value)}
                      placeholder="orn. ali"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {statusOptions.map((item) => (
                        <option key={item.value || 'all'} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </div>

                  <button type="button" onClick={onFetch} className="dm-btn-primary w-full">
                    Degisiklikleri Getir
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-100">
            {loading ? (
              <p className="p-4 text-sm text-slate-500">Loading requests...</p>
            ) : (activeTab === 'pending' ? filteredPendingItems : items).length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No records.</p>
            ) : (
              activeTab === 'pending' ? (
                <div className="h-full overflow-auto p-3">
                  <div className="space-y-2">
                    {filteredPendingItems.map((item) => {
                      const isSelected = item.id === selectedRequestId;
                      const hoursWaiting = getHoursSince(item.createdAt);
                      const urgencyClass = getInboxUrgencyClass(hoursWaiting);

                      return (
                        <div
                          key={item.id}
                          onClick={() => onSelectRequest(item.id)}
                          className={`rounded-xl border p-3 transition hover:cursor-pointer ${isSelected ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.changeCode}</p>
                              <p className="text-sm font-semibold text-slate-900">{item.modelName}</p>
                              <p className="text-xs text-slate-600">Talep: {item.requesterName || item.requesterEmail}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                                {getPendingRoleLabel(item.status)}
                              </span>
                              <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${urgencyClass}`}>
                                {getInboxUrgencyLabel(hoursWaiting)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                            <span>{hoursWaiting} saattir bekliyor</span>
                            <span>Olusturma: {new Date(item.createdAt).toLocaleString()}</span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push(`/change-requests/${item.id}?mode=${activeTab}`);
                              }}
                              className="dm-btn-primary px-3 py-1 text-xs"
                            >
                              Aç ve İncele
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-2 py-2">Kod</th>
                        <th className="px-2 py-2">Model</th>
                        <th className="px-2 py-2">Kullanici</th>
                        <th className="px-2 py-2">Created</th>
                        <th className="px-2 py-2">Updated</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Islem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => {
                        const isSelected = item.id === selectedRequestId;

                        return (
                          <tr
                            key={item.id}
                            onClick={() => onSelectRequest(item.id)}
                            aria-selected={isSelected}
                            className={`transition ${isSelected ? 'bg-cyan-100/80' : 'hover:bg-slate-50'} hover:cursor-pointer`}
                          >
                            <td className={`px-2 py-2 font-semibold text-slate-800 ${isSelected ? 'border-l-4 border-cyan-500 bg-cyan-100' : 'cursor-pointer'}`}>
                              <div className="flex items-center gap-2">
                                {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-cyan-600" />}
                                <span>{item.changeCode || '-'}</span>
                              </div>
                            </td>
                            <td className={`px-2 py-2 text-slate-700 ${isSelected ? 'bg-cyan-100' : 'cursor-pointer'}`}>{item.modelName}</td>
                            <td className={`px-2 py-2 text-slate-700 ${isSelected ? 'bg-cyan-100' : 'cursor-pointer'}`}>{item.requesterName || item.requesterEmail}</td>
                            <td className={`px-2 py-2 text-slate-600 ${isSelected ? 'bg-cyan-100' : 'cursor-pointer'}`}>{new Date(item.createdAt).toLocaleString()}</td>
                            <td className={`px-2 py-2 text-slate-600 ${isSelected ? 'bg-cyan-100' : 'cursor-pointer'}`}>{new Date(item.updatedAt).toLocaleString()}</td>
                            <td className={`px-2 py-2 ${isSelected ? 'bg-cyan-100' : 'cursor-pointer'}`}>
                              <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getStatusClasses(item.status)}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className={`px-2 py-2 ${isSelected ? 'bg-cyan-100' : ''}`}>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    router.push(`/change-requests/${item.id}?mode=${activeTab}`);
                                  }}
                                  className="dm-btn-primary px-3 py-1 text-xs"
                                >
                                  Aç
                                </button>
                                {canDeleteRequests && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void onDelete(item.id);
                                    }}
                                    disabled={deletingId === item.id}
                                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {deletingId === item.id ? 'Siliniyor...' : 'Sil'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </section>

        <section className="relative h-full min-h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-[#f8fbff] via-[#f2f8ff] to-[#e7f5ff] p-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(14,116,144,0.12),transparent_42%)]" />
          <div className="relative h-full overflow-auto">
            {!selectedRequestId ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-500">
                Workflow goruntulemek icin ust tablodan bir degisiklik secin.
              </div>
            ) : detailLoading ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-500">
                Workflow yukleniyor...
              </div>
            ) : detailError || !selectedDetail ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">
                {detailError || 'Workflow bilgisi yuklenemedi.'}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/80 bg-white/75 p-4 backdrop-blur-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Workflow Explorer</p>
                    <h3 className="text-lg font-bold text-slate-900">{selectedDetail.changeCode || '-'} | {selectedDetail.title}</h3>
                    <p className="text-sm text-slate-600">Model: {selectedDetail.modelName} | Talep Sahibi: {selectedDetail.requesterEmail}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(selectedDetail.status)}`}>
                      {selectedDetail.status}
                    </span>
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Son Guncelleme: {new Date(selectedDetail.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="h-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <WorkflowExplorer
                    stages={selectedDetail.workflowStages}
                    currentStageIndex={selectedDetail.currentStageIndex}
                    approvalLogs={selectedDetail.approvalLogs}
                    status={selectedDetail.status}
                  />
                </div>

                <div className="rounded-xl border border-white/80 bg-white/80 p-4 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Onay Gecmisi</p>
                  <div className="mt-3 space-y-2">
                    {selectedDetail.approvalLogs.length === 0 ? (
                      <p className="text-sm text-slate-500">Henuz onay kaydi yok.</p>
                    ) : (
                      selectedDetail.approvalLogs
                        .slice()
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                        .map((log) => (
                          <div key={log.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-semibold text-slate-800">{new Date(log.createdAt).toLocaleString()}</span>
                              <span className="text-slate-500">{log.actorEmail || 'system'}</span>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-700">
                                {log.fromStatus || '-'} to {log.toStatus}
                              </span>
                            </div>
                            {log.comment && <p className="mt-1 text-xs text-slate-600">Not: {log.comment}</p>}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default function ChangeRequestsPage() {
  return (
    <ProtectedRoute>
      <ChangeRequestsContent />
    </ProtectedRoute>
  );
}
