/**
 * React hook for SQL migration generation and management
 * Provides complete lifecycle for change detection, planning, and script generation
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ModelChangeDetectionResult,
  SqlMigrationPlan,
  OptimizedMigrationPlan,
  SqlExportResult,
  MigrationPreviewState,
  DetectChangesRequest,
  GenerateMigrationPlanRequest,
  GenerateSqlScriptRequest,
  ExportSqlRequest,
  ExportSqlResponse,
  MigrationRiskLevel,
} from '@/src/types/migration';

export interface UseMigrationOptions {
  apiUrl?: string;
  modelId?: string;
  autoDetect?: boolean;
}

export function useMigration(options: UseMigrationOptions = {}) {
  const {
    apiUrl = process.env.NEXT_PUBLIC_API_URL,
    modelId,
    autoDetect = false,
  } = options;

  const [state, setState] = useState<MigrationPreviewState>({
    isLoading: false,
    selectedDialect: 'postgresql',
    currentStep: 'initial',
    statistics: {
      changesDetected: 0,
      operationsCount: 0,
      estimatedDuration: '0ms',
      riskLevel: MigrationRiskLevel.Low,
    },
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Detects changes between two DBML versions
   */
  const detectChanges = useCallback(
    async (
      oldDbmlContent: string,
      newDbmlContent: string
    ): Promise<ModelChangeDetectionResult | null> => {
      try {
        setState((prev) => ({
          ...prev,
          isLoading: true,
          currentStep: 'detecting',
          error: undefined,
        }));

        const request: DetectChangesRequest = {
          oldDbmlContent,
          newDbmlContent,
        };

        const response = await fetch(`${apiUrl}/api/migration/detect-changes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify(request),
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Change detection failed: ${response.statusText}`
          );
        }

        const result: ModelChangeDetectionResult = await response.json();

        setState((prev) => ({
          ...prev,
          changeDetection: result,
          statistics: {
            ...prev.statistics,
            changesDetected: result.totalChanges,
          },
        }));

        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          currentStep: 'initial',
        }));
        return null;
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [apiUrl]
  );

  /**
   * Generates SQL migration plan from detected changes
   */
  const generateMigrationPlan = useCallback(
    async (
      changeDetection: ModelChangeDetectionResult
    ): Promise<SqlMigrationPlan | null> => {
      try {
        setState((prev) => ({
          ...prev,
          isLoading: true,
          currentStep: 'planning',
          error: undefined,
        }));

        const request: GenerateMigrationPlanRequest = {
          changeDetection,
          databaseDialect: state.selectedDialect,
        };

        const response = await fetch(`${apiUrl}/api/migration/generate-plan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify(request),
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          throw new Error(`Plan generation failed: ${response.statusText}`);
        }

        const plan: SqlMigrationPlan = await response.json();

        setState((prev) => ({
          ...prev,
          migrationPlan: plan,
          statistics: {
            ...prev.statistics,
            operationsCount: plan.totalOperations,
            estimatedDuration: plan.estimatedDuration,
            riskLevel: plan.riskLevel as MigrationRiskLevel,
          },
        }));

        return plan;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          currentStep: 'planning',
        }));
        return null;
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [apiUrl, state.selectedDialect]
  );

  /**
   * Optimizes migration plan for execution
   */
  const optimizeMigrationPlan = useCallback(
    async (
      migrationPlan: SqlMigrationPlan
    ): Promise<OptimizedMigrationPlan | null> => {
      try {
        setState((prev) => ({
          ...prev,
          isLoading: true,
          currentStep: 'optimizing',
          error: undefined,
        }));

        const response = await fetch(`${apiUrl}/api/migration/optimize-plan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify(migrationPlan),
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          throw new Error(`Plan optimization failed: ${response.statusText}`);
        }

        const optimized: OptimizedMigrationPlan = await response.json();

        setState((prev) => ({
          ...prev,
          optimizedPlan: optimized,
        }));

        return optimized;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({
          ...prev,
          error: errorMsg,
        }));
        return null;
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [apiUrl]
  );

  /**
   * Generates SQL script from migration plan
   */
  const generateSqlScript = useCallback(
    async (
      migrationPlan: SqlMigrationPlan,
      includeRollback = true
    ): Promise<SqlExportResult | null> => {
      try {
        setState((prev) => ({
          ...prev,
          isLoading: true,
          currentStep: 'generating',
          error: undefined,
        }));

        const request: GenerateSqlScriptRequest = {
          migrationPlan,
          databaseDialect: state.selectedDialect,
          includeRollback,
        };

        const response = await fetch(`${apiUrl}/api/migration/generate-script`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify(request),
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          throw new Error(`Script generation failed: ${response.statusText}`);
        }

        const result: SqlExportResult = await response.json();

        setState((prev) => ({
          ...prev,
          sqlScript: result.forwardScript,
          rollbackScript: result.rollbackScript,
          currentStep: 'complete',
        }));

        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({
          ...prev,
          error: errorMsg,
        }));
        return null;
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [apiUrl, state.selectedDialect]
  );

  /**
   * Complete flow: detect → plan → optimize → generate
   */
  const exportSql = useCallback(
    async (request: ExportSqlRequest): Promise<ExportSqlResponse> => {
      try {
        setState((prev) => ({
          ...prev,
          isLoading: true,
          currentStep: 'detecting',
          error: undefined,
        }));

        const response = await fetch(`${apiUrl}/api/migration/export-sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify(request),
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          throw new Error(`SQL export failed: ${response.statusText}`);
        }

        const result: ExportSqlResponse = await response.json();

        if (result.result) {
          setState((prev) => ({
            ...prev,
            sqlScript: result.result!.forwardScript,
            rollbackScript: result.result!.rollbackScript,
            changeDetection: result.plan
              ? {
                  hasChanges: true,
                  detectedAt: result.plan.detectedAt,
                  tableChanges: [],
                  columnChanges: [],
                  relationshipChanges: [],
                  indexChanges: [],
                  enumChanges: [],
                  constraintChanges: [],
                  totalChanges: result.plan.totalOperations,
                }
              : undefined,
            migrationPlan: result.plan,
            optimizedPlan: result.optimizedPlan,
            selectedDialect: request.databaseDialect as any,
            currentStep: 'complete',
          }));
        }

        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          currentStep: 'initial',
        }));
        return {
          success: false,
          message: errorMsg,
        };
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [apiUrl]
  );

  /**
   * Changes selected database dialect
   */
  const selectDialect = useCallback(
    (dialect: 'postgresql' | 'mysql' | 'sqlserver' | 'oracle') => {
      setState((prev) => ({
        ...prev,
        selectedDialect: dialect,
      }));
    },
    []
  );

  /**
   * Copies SQL script to clipboard
   */
  const copySqlToClipboard = useCallback(async () => {
    if (!state.sqlScript) return false;

    try {
      await navigator.clipboard.writeText(state.sqlScript);
      return true;
    } catch (error) {
      console.error('Failed to copy SQL script', error);
      return false;
    }
  }, [state.sqlScript]);

  /**
   * Downloads SQL script as file
   */
  const downloadSqlScript = useCallback(() => {
    if (!state.sqlScript) return;

    const filename = `migration-${state.selectedDialect}-${new Date().getTime()}.sql`;
    const blob = new Blob([state.sqlScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state.sqlScript, state.selectedDialect]);

  /**
   * Resets state to initial
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      selectedDialect: 'postgresql',
      currentStep: 'initial',
      statistics: {
        changesDetected: 0,
        operationsCount: 0,
        estimatedDuration: '0ms',
        riskLevel: MigrationRiskLevel.Low,
      },
    });
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * Auto-detect changes if both old and new content provided
   */
  useEffect(() => {
    if (autoDetect && modelId) {
      // Could implement auto-detect logic here
    }
  }, [autoDetect, modelId]);

  return {
    // State
    state,
    isLoading: state.isLoading,
    changeDetection: state.changeDetection,
    migrationPlan: state.migrationPlan,
    optimizedPlan: state.optimizedPlan,
    sqlScript: state.sqlScript,
    rollbackScript: state.rollbackScript,
    error: state.error,
    currentStep: state.currentStep,
    statistics: state.statistics,
    selectedDialect: state.selectedDialect,

    // Methods
    detectChanges,
    generateMigrationPlan,
    optimizeMigrationPlan,
    generateSqlScript,
    exportSql,
    selectDialect,
    copySqlToClipboard,
    downloadSqlScript,
    reset,
  };
}

export type UseMigrationReturn = ReturnType<typeof useMigration>;
