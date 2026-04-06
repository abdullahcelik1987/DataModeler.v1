import React, { useMemo, useState } from 'react';
import {
  useAdminDashboard,
  AdminDashboardProvider,
} from '@/hooks/useAdminDashboard';
import {
  DashboardSection,
  HealthStatus,
  MetricsPeriod,
  SortBy,
} from '@/types/analytics';
import Link from 'next/link';

/**
 * Main Admin Dashboard Component
 * Displays system overview, health, metrics, and analytics
 */
export const AdminDashboard: React.FC = () => {
  const {
    state,
    config,
    refreshDashboard,
    fetchTopModels,
    toggleAutoRefresh,
    setRefreshInterval,
  } = useAdminDashboard();

  const [sortBy, setSortBy] = useState<SortBy>(SortBy.Usage);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const handleRefresh = async () => {
    await refreshDashboard();
  };

  const getHealthColor = (status?: HealthStatus): string => {
    switch (status) {
      case HealthStatus.Healthy:
        return 'text-green-600';
      case HealthStatus.Warning:
        return 'text-yellow-600';
      case HealthStatus.Critical:
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getHealthBgColor = (status?: HealthStatus): string => {
    switch (status) {
      case HealthStatus.Healthy:
        return 'bg-green-100';
      case HealthStatus.Warning:
        return 'bg-yellow-100';
      case HealthStatus.Critical:
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2">
              System overview, health monitoring, and analytics
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {state.lastUpdated && (
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Last updated:{' '}
                {state.lastUpdated.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}

            <button
              onClick={handleRefresh}
              disabled={state.loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {state.loading ? 'Loading...' : 'Refresh'}
            </button>

            <select
              value={config.defaultPeriod}
              onChange={(e) => {
                // Period change handler
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            >
              {Object.values(MetricsPeriod).map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>

            <button
              onClick={toggleAutoRefresh}
              className={`px-4 py-2 rounded-lg transition-colors ${
                state.autoRefreshEnabled
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              {state.autoRefreshEnabled ? 'Auto-refresh: ON' : 'Auto-refresh: OFF'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 dark:bg-red-900 dark:border-red-700 dark:text-red-100">
            <p className="font-semibold">Error</p>
            <p>{state.error}</p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {state.loading && !state.overview && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-300">
              Loading dashboard data...
            </p>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      {state.overview && (
        <div className="space-y-8">
          {/* Quick Stats */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Quick Stats
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {state.overview.quickStats?.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white dark:bg-slate-700 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                  {stat.change !== undefined && (
                    <p
                      className={`text-sm mt-2 ${
                        stat.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {stat.change >= 0 ? '+' : ''}{stat.change}% from yesterday
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* System Health */}
          {state.systemHealth && (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                System Health
              </h2>
              <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Overall Health */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Overall Status
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {state.systemHealth.status}
                      </p>
                    </div>
                    <div
                      className={`w-24 h-24 rounded-full flex items-center justify-center ${getHealthBgColor(
                        state.systemHealth.status as HealthStatus
                      )}`}
                    >
                      <span
                        className={`text-3xl font-bold ${getHealthColor(
                          state.systemHealth.status as HealthStatus
                        )}`}
                      >
                        {state.systemHealth.healthScore}%
                      </span>
                    </div>
                  </div>

                  {/* Uptime */}
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      System Uptime
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          99.9%
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">
                          45 days
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-slate-600">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: '99.9%' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Component Health */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 border-t border-slate-200 dark:border-slate-600 pt-6">
                  {state.systemHealth.components?.map((component) => (
                    <div
                      key={component.name}
                      className={`p-4 rounded-lg ${getHealthBgColor(
                        component.status as HealthStatus
                      )}`}
                    >
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {component.name}
                      </p>
                      <p
                        className={`text-sm font-medium mt-1 ${getHealthColor(
                          component.status as HealthStatus
                        )}`}
                      >
                        {component.status}
                      </p>
                      {component.responseTime && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {component.responseTime}ms response time
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Alerts */}
                {state.systemHealth.alerts && state.systemHealth.alerts.length > 0 && (
                  <div className="mt-6 border-t border-slate-200 dark:border-slate-600 pt-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                      Active Alerts ({state.systemHealth.alerts.length})
                    </h3>
                    <div className="space-y-2">
                      {state.systemHealth.alerts.map((alert, idx) => (
                        <div
                          key={idx}
                          className="bg-red-100 border-l-4 border-red-500 p-3 rounded text-sm text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-100"
                        >
                          <p className="text-sm">{alert.message || 'Alert'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Top Models */}
          {state.topModels && state.topModels.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Top Models
              </h2>
              <div className="bg-white dark:bg-slate-700 rounded-lg shadow overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-600">
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as SortBy);
                      fetchTopModels(10, e.target.value);
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-lg bg-white dark:bg-slate-600 dark:border-slate-500 dark:text-white"
                  >
                    {Object.values(SortBy).map((option) => (
                      <option key={option} value={option}>
                        Sort by {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-600">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">
                          Model Name
                        </th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">
                          Access Count
                        </th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">
                          Versions
                        </th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">
                          Last Modified
                        </th>
                        <th className="px-6 py-3 text-center font-semibold text-slate-900 dark:text-white">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                      {state.topModels.map((model, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                          onClick={() => setSelectedModel(model.name)}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {model.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Model
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                            {model.accessCount}
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                            {model.versionCount|| 0}
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                            {Math.round(model.sizeInBytes / 1024 / 1024)} MB
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                            {new Date(model.lastModified).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Link
                              href={`/models/${encodeURIComponent(model.name)}`}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* User Activity */}
          {state.userActivity && (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                User Activity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Daily Active Users
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {state.userActivity.totalActiveUsers}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Last 24 hours
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Retention Rate
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {Math.round(state.userActivity.retentionRate * 100)}%
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    7-day retention
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Engagement Score
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {Math.round(state.userActivity.userEngagementScore * 100)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Out of 100
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Performance Metrics */}
          {state.performance && (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                API Performance
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    P95 Latency
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {state.performance.p95ResponseTime}ms
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    P99 Latency
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {state.performance.p99ResponseTime}ms
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Requests/sec
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {state.performance.requestsPerSecond}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Cache Hit Rate
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(state.performance.cacheHitRate * 100)}%
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Storage Analytics */}
          {state.storage && (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Storage Analytics
              </h2>
              <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                      Storage Breakdown
                    </h3>
                    <div className="space-y-3">
                      {state.storage.largestModels?.map((item) => (
                        <div key={item.modelName}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-700 dark:text-slate-300">
                              {item.modelName}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {Math.round(item.sizeInBytes / 1024 / 1024 / 1024)} GB
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-slate-600">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${(item.sizeInBytes / (state.storage!.totalStorageUsed || 1)) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                      Cost Estimation
                    </h3>
                    <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-700 dark:text-slate-300">
                          Monthly Cost
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-300">
                          ${state.storage.estimatedCostPerMonth}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-700 dark:text-slate-300">
                          Annual Estimate
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ${state.storage.estimatedCostPerMonth * 12}
                        </span>
                      </div>
                      {state.storage.projectedFullAt && (
                        <div className="border-t border-blue-200 dark:border-blue-700 pt-3">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            Projected full:{' '}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {new Date(state.storage.projectedFullAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Exported component with provider
 */
export default function AdminDashboardPage() {
  return (
    <AdminDashboardProvider>
      <AdminDashboard />
    </AdminDashboardProvider>
  );
}
