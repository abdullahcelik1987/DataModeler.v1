'use client';

import React, {
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useState,
  useContext,
  createContext,
} from 'react';
import {
  AdminDashboardState,
  AdminDashboardConfig,
  DashboardOverview,
  SystemHealth,
  ModelAnalytics,
  UserActivityMetrics,
  ModelStatistics,
  PerformanceMetrics,
  AuditSummary,
  StorageAnalytics,
  AccessPattern,
  MetricsPeriod,
  HealthStatus,
  DashboardSection,
  GetDashboardRequest,
  GetMetricsRequest,
  Report,
  ReportGenerationRequest,
} from '@/types/analytics';

/**
 * React hook for managing admin dashboard state and data fetching
 * Provides real-time metrics, health monitoring, and analytics
 */
export const useAdminDashboard = (config?: Partial<AdminDashboardConfig>) => {
  const defaultConfig: AdminDashboardConfig = {
    defaultPeriod: MetricsPeriod.Day,
    autoRefresh: true,
    refreshInterval: 30000,
    chartResolution: 'medium',
    enableRealTimeUpdates: true,
    alertThresholds: {
      cpuUsagePercent: 80,
      memoryUsagePercent: 80,
      errorRatePercent: 1.0,
      responseTimeMs: 500,
      storageUsagePercent: 85,
      failedLoginAttempts: 5,
    },
    visibleSections: [
      DashboardSection.Overview,
      DashboardSection.SystemHealth,
      DashboardSection.TopModels,
      DashboardSection.Performance,
    ],
    darkMode: false,
  };

  const mergedConfig = { ...defaultConfig, ...config };

  const initialState: AdminDashboardState = {
    overview: null,
    systemHealth: null,
    topModels: [],
    userActivity: null,
    modelStats: null,
    performance: null,
    auditSummary: null,
    storage: null,
    accessPatterns: null,
    loading: false,
    error: null,
    lastUpdated: null,
    autoRefreshEnabled: mergedConfig.autoRefresh,
    refreshInterval: mergedConfig.refreshInterval,
  };

  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const refreshTimerRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();
  const metricsStreamRef = useRef<ReadableStreamDefaultReader>();

  // =====================================================================
  // API Calls
  // =====================================================================

  /**
   * Fetches dashboard overview
   */
  const fetchDashboardOverview = useCallback(
    async (includeDetails = false): Promise<DashboardOverview | null> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const request: GetDashboardRequest = { includeDetails };

        const response = await fetch('/api/admin/dashboard/overview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) throw new Error('Failed to fetch dashboard overview');

        const overview = await response.json();
        dispatch({ type: 'SET_OVERVIEW', payload: overview });
        return overview;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    []
  );

  /**
   * Fetches system health status
   */
  const fetchSystemHealth = useCallback(
    async (): Promise<SystemHealth | null> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const response = await fetch('/api/admin/health/system', {
          method: 'GET',
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) throw new Error('Failed to fetch system health');

        const health = await response.json();
        dispatch({ type: 'SET_SYSTEM_HEALTH', payload: health });

        // Check alerts against thresholds
        checkHealthAlerts(health);

        return health;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    []
  );

  /**
   * Fetches top models
   */
  const fetchTopModels = useCallback(
    async (count = 10, sortBy = 'usage'): Promise<ModelAnalytics[]> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const response = await fetch(
          `/api/admin/analytics/models/top?count=${count}&sortBy=${sortBy}`,
          { signal: abortControllerRef.current?.signal }
        );

        if (!response.ok) throw new Error('Failed to fetch top models');

        const models = await response.json();
        dispatch({ type: 'SET_TOP_MODELS', payload: models });
        return models;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return [];
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    []
  );

  /**
   * Fetches user activity metrics
   */
  const fetchUserActivity = useCallback(
    async (
      startDate?: Date,
      endDate?: Date
    ): Promise<UserActivityMetrics | null> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const query = new URLSearchParams();
        if (startDate) query.append('startDate', startDate.toISOString());
        if (endDate) query.append('endDate', endDate.toISOString());

        const response = await fetch(`/api/admin/analytics/users?${query}`, {
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) throw new Error('Failed to fetch user activity');

        const activity = await response.json();
        dispatch({ type: 'SET_USER_ACTIVITY', payload: activity });
        return activity;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    []
  );

  /**
   * Fetches model statistics
   */
  const fetchModelStatistics = useCallback(
    async (): Promise<ModelStatistics | null> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const response = await fetch('/api/admin/analytics/models/statistics', {
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) throw new Error('Failed to fetch model statistics');

        const stats = await response.json();
        dispatch({ type: 'SET_MODEL_STATS', payload: stats });
        return stats;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    []
  );

  /**
   * Fetches performance metrics
   */
  const fetchPerformanceMetrics = useCallback(
    async (
      startDate?: Date,
      endDate?: Date
    ): Promise<PerformanceMetrics | null> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const request: GetMetricsRequest = {
          startDate: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
          endDate: endDate || new Date(),
          granularity: 'hour',
        };

        const response = await fetch('/api/admin/metrics/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) throw new Error('Failed to fetch performance metrics');

        const performance = await response.json();
        dispatch({ type: 'SET_PERFORMANCE', payload: performance });
        return performance;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    []
  );

  /**
   * Fetches audit summary
   */
  const fetchAuditSummary = useCallback(
    async (startDate?: Date, endDate?: Date): Promise<AuditSummary | null> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const query = new URLSearchParams();
        if (startDate) query.append('startDate', startDate.toISOString());
        if (endDate) query.append('endDate', endDate.toISOString());

        const response = await fetch(`/api/admin/audit/summary?${query}`, {
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) throw new Error('Failed to fetch audit summary');

        const summary = await response.json();
        dispatch({ type: 'SET_AUDIT_SUMMARY', payload: summary });
        return summary;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    []
  );

  /**
   * Fetches storage analytics
   */
  const fetchStorageAnalytics = useCallback(
    async (): Promise<StorageAnalytics | null> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const response = await fetch('/api/admin/analytics/storage', {
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) throw new Error('Failed to fetch storage analytics');

        const storage = await response.json();
        dispatch({ type: 'SET_STORAGE', payload: storage });
        return storage;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    []
  );

  /**
   * Fetches access patterns
   */
  const fetchAccessPatterns = useCallback(
    async (days = 30): Promise<AccessPattern | null> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const response = await fetch(
          `/api/admin/analytics/access-patterns?days=${days}`,
          { signal: abortControllerRef.current?.signal }
        );

        if (!response.ok) throw new Error('Failed to fetch access patterns');

        const patterns = await response.json();
        dispatch({ type: 'SET_ACCESS_PATTERNS', payload: patterns });
        return patterns;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    []
  );

  /**
   * Fetches or generates report
   */
  const generateReport = useCallback(
    async (request: ReportGenerationRequest): Promise<Report | null> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const response = await fetch('/api/admin/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) throw new Error('Failed to generate report');

        const report = await response.json();
        return report;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    []
  );

  /**
   * Refetches all dashboard data
   */
  const refreshDashboard = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      await Promise.all([
        fetchDashboardOverview(true),
        fetchSystemHealth(),
        fetchTopModels(10, 'usage'),
        fetchUserActivity(),
        fetchModelStatistics(),
        fetchPerformanceMetrics(),
        fetchAuditSummary(),
        fetchStorageAnalytics(),
        fetchAccessPatterns(),
      ]);

      dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [
    fetchDashboardOverview,
    fetchSystemHealth,
    fetchTopModels,
    fetchUserActivity,
    fetchModelStatistics,
    fetchPerformanceMetrics,
    fetchAuditSummary,
    fetchStorageAnalytics,
    fetchAccessPatterns,
  ]);

  /**
   * Streams real-time metrics
   */
  const startMetricsStream = useCallback(async () => {
    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/admin/metrics/stream', {
        signal: abortControllerRef.current.signal,
      });

      if (!response.body) {
        throw new Error('Response body is not available');
      }

      const reader = response.body.getReader();
      metricsStreamRef.current = reader;
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        lines.forEach((line) => {
          if (line.trim()) {
            try {
              const metrics = JSON.parse(line);
              dispatch({ type: 'UPDATE_METRICS', payload: metrics });
            } catch (e) {
              console.warn('Failed to parse metrics line:', line);
            }
          }
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error in metrics stream:', error);
      }
    }
  }, []);

  /**
   * Stops metrics streaming
   */
  const stopMetricsStream = useCallback(() => {
    abortControllerRef.current?.abort();
    metricsStreamRef.current = undefined;
  }, []);

  /**
   * Toggles auto-refresh
   */
  const toggleAutoRefresh = useCallback(() => {
    dispatch({ type: 'TOGGLE_AUTO_REFRESH', payload: null });

    if (!state.autoRefreshEnabled) {
      setupAutoRefresh();
    } else {
      clearAutoRefresh();
    }
  }, [state.autoRefreshEnabled]);

  /**
   * Sets custom refresh interval
   */
  const setRefreshInterval = useCallback((intervalMs: number) => {
    dispatch({ type: 'SET_REFRESH_INTERVAL', payload: intervalMs });
    clearAutoRefresh();
    setupAutoRefresh();
  }, []);

  // =====================================================================
  // Private Helpers
  // =====================================================================

  const setupAutoRefresh = useCallback(() => {
    if (!mergedConfig.autoRefresh) return;

    refreshTimerRef.current = setInterval(() => {
      refreshDashboard();
    }, state.refreshInterval);
  }, [state.refreshInterval, refreshDashboard, mergedConfig.autoRefresh]);

  const clearAutoRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = undefined;
    }
  }, []);

  const checkHealthAlerts = (health: SystemHealth) => {
    health.alerts.forEach((alert) => {
      console.warn(`Alert: ${alert.message}`);
    });
  };

  // =====================================================================
  // Effects
  // =====================================================================

  useEffect(() => {
    // Initial load
    refreshDashboard();

    // Setup auto-refresh if enabled
    if (mergedConfig.autoRefresh) {
      setupAutoRefresh();
    }

    // Start metrics stream if real-time updates enabled
    if (mergedConfig.enableRealTimeUpdates) {
      startMetricsStream();
    }

    return () => {
      clearAutoRefresh();
      stopMetricsStream();
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    // State
    state,
    config: mergedConfig,

    // Dashboard
    refreshDashboard,
    fetchDashboardOverview,
    fetchSystemHealth,

    // Analytics
    fetchTopModels,
    fetchUserActivity,
    fetchModelStatistics,
    fetchPerformanceMetrics,
    fetchAuditSummary,
    fetchStorageAnalytics,
    fetchAccessPatterns,

    // Reports
    generateReport,

    // Streaming
    startMetricsStream,
    stopMetricsStream,

    // Controls
    toggleAutoRefresh,
    setRefreshInterval,
    clearError: () => dispatch({ type: 'SET_ERROR', payload: null }),
  };
};

// =========================================================================
// Reducer
// =========================================================================

function dashboardReducer(
  state: AdminDashboardState,
  action: any
): AdminDashboardState {
  switch (action.type) {
    case 'SET_OVERVIEW':
      return { ...state, overview: action.payload };

    case 'SET_SYSTEM_HEALTH':
      return { ...state, systemHealth: action.payload };

    case 'SET_TOP_MODELS':
      return { ...state, topModels: action.payload };

    case 'SET_USER_ACTIVITY':
      return { ...state, userActivity: action.payload };

    case 'SET_MODEL_STATS':
      return { ...state, modelStats: action.payload };

    case 'SET_PERFORMANCE':
      return { ...state, performance: action.payload };

    case 'SET_AUDIT_SUMMARY':
      return { ...state, auditSummary: action.payload };

    case 'SET_STORAGE':
      return { ...state, storage: action.payload };

    case 'SET_ACCESS_PATTERNS':
      return { ...state, accessPatterns: action.payload };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdated: action.payload };

    case 'TOGGLE_AUTO_REFRESH':
      return { ...state, autoRefreshEnabled: !state.autoRefreshEnabled };

    case 'SET_REFRESH_INTERVAL':
      return { ...state, refreshInterval: action.payload };

    case 'UPDATE_METRICS':
      // Update performance metrics with streamed data
      return {
        ...state,
        performance: action.payload.performance || state.performance,
        systemHealth: {
          ...state.systemHealth,
          ...action.payload.health,
        },
      };

    default:
      return state;
  }
}

/**
 * Context for providing dashboard to child components
 */
export const AdminDashboardContext = createContext<
  ReturnType<typeof useAdminDashboard> | undefined
>(undefined);

/**
 * Provider component for admin dashboard
 */
export const AdminDashboardProvider: React.FC<{
  children: React.ReactNode;
  config?: Partial<AdminDashboardConfig>;
}> = ({ children, config }) => {
  const dashboard = useAdminDashboard(config);

  return (
    <AdminDashboardContext.Provider value={dashboard}>
      {children}
    </AdminDashboardContext.Provider>
  );
};

/**
 * Hook to use admin dashboard from context
 */
export const useAdminDashboardContext = () => {
  const context = useContext(AdminDashboardContext);
  if (!context) {
    throw new Error(
      'useAdminDashboardContext must be used within AdminDashboardProvider'
    );
  }
  return context;
};

export default useAdminDashboard;
