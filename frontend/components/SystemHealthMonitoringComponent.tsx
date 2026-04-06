import React, { useMemo, useEffect, useState } from 'react';
import {
  SystemHealth,
  ComponentHealth,
  HealthStatus,
  Alert,
  Warning,
} from '@/types/analytics';
import { useAdminDashboardContext } from '@/hooks/useAdminDashboard';

/**
 * Circular Progress Component
 */
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  color = '#3b82f6',
  label,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / max) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        className="drop-shadow"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.35s',
          }}
        />
      </svg>
      <div className="text-center mt-2">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {value}%
        </p>
        {label && <p className="text-xs text-slate-600 dark:text-slate-400">{label}</p>}
      </div>
    </div>
  );
};

/**
 * Health Status Badge Component
 */
interface HealthBadgeProps {
  status: HealthStatus;
  label?: string;
}

const HealthBadge: React.FC<HealthBadgeProps> = ({ status, label }) => {
  const getColors = (status: HealthStatus) => {
    switch (status) {
      case HealthStatus.Healthy:
        return {
          bg: 'bg-green-100 dark:bg-green-900',
          text: 'text-green-800 dark:text-green-100',
          dot: 'bg-green-500',
        };
      case HealthStatus.Warning:
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900',
          text: 'text-yellow-800 dark:text-yellow-100',
          dot: 'bg-yellow-500',
        };
      case HealthStatus.Critical:
        return {
          bg: 'bg-red-100 dark:bg-red-900',
          text: 'text-red-800 dark:text-red-100',
          dot: 'bg-red-500',
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-900',
          text: 'text-gray-800 dark:text-gray-100',
          dot: 'bg-gray-500',
        };
    }
  };

  const colors = getColors(status);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${colors.bg}`}>
      <span className={`w-2 h-2 rounded-full animate-pulse ${colors.dot}`}></span>
      <span className={`text-sm font-semibold ${colors.text}`}>
        {label || status}
      </span>
    </div>
  );
};

/**
 * Component Health Card
 */
interface ComponentHealthCardProps {
  component: ComponentHealth;
  onClick?: () => void;
}

const ComponentHealthCard: React.FC<ComponentHealthCardProps> = ({
  component,
  onClick,
}) => {
  const getStatusColor = (status?: string) => {
    if (!status) return 'text-gray-600';
    const s = status.toLowerCase();
    if (s.includes('healthy')) return 'text-green-600';
    if (s.includes('warning')) return 'text-yellow-600';
    if (s.includes('critical')) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-700 rounded-lg shadow hover:shadow-lg transition-all cursor-pointer p-6 border-l-4 border-blue-500"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {component.name}
          </h3>
        </div>
        <HealthBadge status={component.status as HealthStatus} />
      </div>

      <div className="space-y-3">
        {component.responseTime !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Response Time
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {component.responseTime}ms
            </span>
          </div>
        )}

        {component.uptime !== undefined && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 dark:text-slate-400">Uptime</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {(component.uptime * 100).toFixed(2)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-slate-600">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${component.uptime * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {component.lastChecked && (
          <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-600">
            Last check: {new Date(component.lastChecked).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * System Health Monitoring Component
 */
export interface SystemHealthMonitoringProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  showAlerts?: boolean;
  showThresholds?: boolean;
}

export const SystemHealthMonitoring: React.FC<SystemHealthMonitoringProps> = ({
  autoRefresh = true,
  refreshInterval = 30000,
  showAlerts = true,
  showThresholds = true,
}) => {
  const {
    state,
    fetchSystemHealth,
    fetchPerformanceMetrics,
  } = useAdminDashboardContext();

  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);
  const [history, setHistory] = useState<SystemHealth[]>([]);
  const [trend, setTrend] = useState<'improving' | 'stable' | 'declining'>('stable');

  // Track health history for trend analysis
  useEffect(() => {
    if (state.systemHealth) {
      setHistory((prev) => {
        const updated = [state.systemHealth as SystemHealth, ...prev].slice(0, 20);

        // Calculate trend
        if (updated.length >= 2) {
          const current = updated[0];
          const previous = updated[1];

          const currentScore =
            (current.healthScore || 0) +
            (current.components?.reduce((acc, c) => {
              const statusValue =
                c.status === HealthStatus.Healthy
                  ? 100
                  : c.status === HealthStatus.Warning
                    ? 50
                    : 0;
              return acc + statusValue;
            }, 0) || 0);

          const prevScore =
            (previous.healthScore || 0) +
            (previous.components?.reduce((acc, c) => {
              const statusValue =
                c.status === HealthStatus.Healthy
                  ? 100
                  : c.status === HealthStatus.Warning
                    ? 50
                    : 0;
              return acc + statusValue;
            }, 0) || 0);

          if (currentScore > prevScore) {
            setTrend('improving');
          } else if (currentScore < prevScore) {
            setTrend('declining');
          } else {
            setTrend('stable');
          }
        }

        return updated;
      });
    }
  }, [state.systemHealth]);

  const criticalCount = useMemo(
    () =>
      state.systemHealth?.components?.filter(
        (c) => c.status === HealthStatus.Critical
      ).length || 0,
    [state.systemHealth]
  );

  const warningCount = useMemo(
    () =>
      state.systemHealth?.components?.filter(
        (c) => c.status === HealthStatus.Warning
      ).length || 0,
    [state.systemHealth]
  );

  const healthyCount = useMemo(
    () =>
      state.systemHealth?.components?.filter(
        (c) => c.status === HealthStatus.Healthy
      ).length || 0,
    [state.systemHealth]
  );

  if (!state.systemHealth) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500 dark:text-slate-400">Loading system health...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overall Health Section */}
      <section className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          Overall System Health
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Health Score Gauge */}
          <div className="flex justify-center">
            <CircularProgress
              value={state.systemHealth.healthScore || 0}
              color={
                state.systemHealth.status === HealthStatus.Healthy
                  ? '#10b981'
                  : state.systemHealth.status === HealthStatus.Warning
                    ? '#f59e0b'
                    : '#ef4444'
              }
              label="Health Score"
            />
          </div>

          {/* Status Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Status
              </span>
              <HealthBadge status={state.systemHealth.status as HealthStatus} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600 dark:text-green-400">● Healthy</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {healthyCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-yellow-600 dark:text-yellow-400">● Warning</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {warningCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-600 dark:text-red-400">● Critical</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {criticalCount}
                </span>
              </div>
            </div>
          </div>

          {/* Trend */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Trend
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  trend === 'improving'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                    : trend === 'declining'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
                }`}
              >
                {trend.charAt(0).toUpperCase() + trend.slice(1)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Last checked:{' '}
                {state.systemHealth.checkedAt
                  ? new Date(state.systemHealth.checkedAt).toLocaleTimeString()
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Components Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Component Status
          </h3>
          <button
            onClick={() => fetchSystemHealth()}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
          >
            Refresh Now
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {state.systemHealth.components?.map((component) => (
            <ComponentHealthCard
              key={component.name}
              component={component}
              onClick={() =>
                setExpandedComponent(
                  expandedComponent === component.name ? null : component.name
                )
              }
            />
          ))}
        </div>
      </section>

      {/* Alerts & Warnings */}
      {showAlerts && (
        <section className="space-y-4">
          {state.systemHealth.alerts && state.systemHealth.alerts.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Active Alerts ({state.systemHealth.alerts.length})
              </h3>
              <div className="space-y-3">
                {state.systemHealth.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="bg-red-50 dark:bg-red-900 border-l-4 border-red-500 p-4 rounded"
                  >
                    <p className="text-sm text-red-700 dark:text-red-200">
                      {alert.message || 'System Alert'}
                    </p>
                    {alert.timestamp && (
                      <p className="text-xs text-red-600 dark:text-red-300 mt-2">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.systemHealth.warnings && state.systemHealth.warnings.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Warnings ({state.systemHealth.warnings.length})
              </h3>
              <div className="space-y-3">
                {state.systemHealth.warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500 p-4 rounded"
                  >
                    <p className="font-semibold text-yellow-800 dark:text-yellow-100">
                      {warning.message}
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-200 mt-1">
                      {warning.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Thresholds Information */}
      {showThresholds && (
        <section className="bg-blue-50 dark:bg-blue-900 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-4">
            Health Thresholds
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-blue-700 dark:text-blue-200">CPU Usage</p>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Warning: &gt;80%
              </p>
            </div>
            <div>
              <p className="text-blue-700 dark:text-blue-200">Memory Usage</p>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Warning: &gt;80%
              </p>
            </div>
            <div>
              <p className="text-blue-700 dark:text-blue-200">Error Rate</p>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Warning: &gt;1%
              </p>
            </div>
            <div>
              <p className="text-blue-700 dark:text-blue-200">Response Time</p>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Warning: &gt;500ms
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default SystemHealthMonitoring;



