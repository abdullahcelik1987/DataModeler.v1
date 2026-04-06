import { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import {
  VersioningState,
  ModelVersion,
  BranchInfo,
  VersionTag,
  VersionComparison,
  VersionMetadata,
  VersioningEvent,
  CreateVersionRequest,
  RollbackRequest,
  CompareVersionsRequest,
  CreateBranchRequest,
  MergeBranchRequest,
  TagVersionRequest,
  GetVersionHistoryRequest,
  MergeStrategy,
} from '@/types/versioning';

/**
 * React hook for managing DBML model versioning
 * Provides state management and API integration for Git-like versioning
 */
export const useModelVersioning = (modelId: string) => {
  const initialState: VersioningState = {
    modelId,
    currentVersion: undefined,
    versionHistory: [],
    currentBranch: 'main',
    branches: [],
    tags: [],
    loading: false,
    error: undefined,
    pendingChanges: false,
    lastSync: new Date(),
  };

  const [state, dispatch] = useReducer(versioningReducer, initialState);
  const [pendingChanges, setPendingChanges] = useState<string | null>(null);
  const eventListenersRef = useRef<Map<string, Function[]>>(new Map());

  // =====================================================================
  // Version Management
  // =====================================================================

  /**
   * Creates a new version snapshot
   */
  const createVersion = useCallback(
    async (
      dbmlContent: string,
      message: string,
      userId?: string
    ): Promise<ModelVersion | null> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const request: CreateVersionRequest = {
          modelId,
          dbmlContent,
          userId: userId || 'current-user',
          commitMessage: message,
          branchName: state.currentBranch,
        };

        const response = await fetch('/api/versions/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) throw new Error('Failed to create version');

        const version = await response.json();
        dispatch({ type: 'ADD_VERSION', payload: version });
        emit('version_created', { version, branch: state.currentBranch });
        setPendingChanges(null);

        return version;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [modelId, state.currentBranch]
  );

  /**
   * Retrieves version history with pagination
   */
  const getVersionHistory = useCallback(
    async (pageSize: number = 20, pageNumber: number = 1): Promise<void> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const request: GetVersionHistoryRequest = {
          modelId,
          branchName: state.currentBranch,
          pageSize,
          pageNumber,
        };

        const response = await fetch('/api/versions/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) throw new Error('Failed to fetch history');

        const history = await response.json();
        dispatch({ type: 'SET_HISTORY', payload: history });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [modelId, state.currentBranch]
  );

  /**
   * Rollbacks to a previous version
   */
  const rollbackToVersion = useCallback(
    async (versionId: string, reason: string, userId?: string): Promise<boolean> => {
      try {
        dispatch({ type: 'SET_OPERATION_IN_PROGRESS', payload: true });

        const request: RollbackRequest = {
          modelId,
          versionId,
          userId: userId || 'current-user',
          reason,
        };

        const response = await fetch('/api/versions/rollback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) throw new Error('Rollback failed');

        const newVersion = await response.json();
        dispatch({ type: 'SET_CURRENT_VERSION', payload: newVersion });
        emit('version_rollback', { fromVersion: versionId, toVersion: newVersion.id });

        return true;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return false;
      } finally {
        dispatch({ type: 'SET_OPERATION_IN_PROGRESS', payload: false });
      }
    },
    [modelId]
  );

  /**
   * Compares two versions
   */
  const compareVersions = useCallback(
    async (
      versionId1: string,
      versionId2: string
    ): Promise<VersionComparison | null> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const request: CompareVersionsRequest = {
          modelId,
          versionId1,
          versionId2,
        };

        const response = await fetch('/api/versions/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) throw new Error('Comparison failed');

        const comparison = await response.json();
        return comparison;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [modelId]
  );

  // =====================================================================
  // Branch Management
  // =====================================================================

  /**
   * Creates a new branch from current version
   */
  const createBranch = useCallback(
    async (branchName: string, description?: string): Promise<BranchInfo | null> => {
      try {
        dispatch({ type: 'SET_OPERATION_IN_PROGRESS', payload: true });

        if (!state.currentVersion) {
          throw new Error('No current version to branch from');
        }

        const request: CreateBranchRequest = {
          modelId,
          branchName,
          fromVersionId: state.currentVersion.versionId,
          userId: 'current-user',
        };

        const response = await fetch('/api/branches/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) throw new Error('Failed to create branch');

        const branch = await response.json();
        dispatch({
          type: 'SET_BRANCHES',
          payload: [...state.branches, branch],
        });
        emit('branch_created', { branch });

        return branch;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return null;
      } finally {
        dispatch({ type: 'SET_OPERATION_IN_PROGRESS', payload: false });
      }
    },
    [modelId, state.currentVersion, state.branches]
  );

  /**
   * Switches to a different branch
   */
  const switchBranch = useCallback(
    async (branchName: string): Promise<boolean> => {
      try {
        dispatch({ type: 'SET_OPERATION_IN_PROGRESS', payload: true });

        const response = await fetch(`/api/branches/${branchName}/switch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, userId: 'current-user' }),
        });

        if (!response.ok) throw new Error('Failed to switch branch');

        dispatch({ type: 'SET_CURRENT_BRANCH', payload: branchName });
        emit('branch_switched', { branch: branchName });

        // Auto-fetch history for new branch
        await getVersionHistory();

        return true;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return false;
      } finally {
        dispatch({ type: 'SET_OPERATION_IN_PROGRESS', payload: false });
      }
    },
    [modelId, getVersionHistory]
  );

  /**
   * Merges a branch into current branch
   */
  const mergeBranch = useCallback(
    async (sourceBranch: string, strategy: string = MergeStrategy.Recursive): Promise<boolean> => {
      try {
        dispatch({ type: 'SET_OPERATION_IN_PROGRESS', payload: true });

        const request: MergeBranchRequest = {
          modelId,
          sourceBranch: sourceBranch,
          targetBranch: state.currentBranch,
          userId: 'current-user',
          strategy: strategy as MergeStrategy,
        };

        const response = await fetch('/api/branches/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) throw new Error('Merge failed');

        const result = await response.json();

        if (result.hasConflicts) {
          emit('merge_conflict_detected', { conflicts: result.conflicts });
          return false;
        }

        emit('branch_merged', {
          source: sourceBranch,
          target: state.currentBranch,
        });

        await getVersionHistory();
        return true;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return false;
      } finally {
        dispatch({ type: 'SET_OPERATION_IN_PROGRESS', payload: false });
      }
    },
    [modelId, state.currentBranch, getVersionHistory]
  );

  /**
   * Deletes a branch
   */
  const deleteBranch = useCallback(
    async (branchName: string): Promise<boolean> => {
      try {
        dispatch({ type: 'SET_OPERATION_IN_PROGRESS', payload: true });

        if (branchName === 'main') {
          throw new Error('Cannot delete main branch');
        }

        const response = await fetch(`/api/branches/${branchName}/delete`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, userId: 'current-user' }),
        });

        if (!response.ok) throw new Error('Failed to delete branch');

        dispatch({
          type: 'SET_BRANCHES',
          payload: state.branches.filter((b) => b.branchName !== branchName),
        });
        emit('branch_deleted', { branch: branchName });

        return true;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return false;
      } finally {
        dispatch({ type: 'SET_OPERATION_IN_PROGRESS', payload: false });
      }
    },
    [modelId, state.branches]
  );

  /**
   * Protects a branch
   */
  const protectBranch = useCallback(
    async (branchName: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/branches/${branchName}/protect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId }),
        });

        if (!response.ok) throw new Error('Failed to protect branch');

        emit('branch_protected', { branch: branchName });
        return true;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return false;
      }
    },
    [modelId]
  );

  // =====================================================================
  // Tag Management
  // =====================================================================

  /**
   * Tags a version with a semantic tag
   */
  const tagVersion = useCallback(
    async (versionId: string, tagName: string, description?: string): Promise<boolean> => {
      try {
        dispatch({ type: 'SET_OPERATION_IN_PROGRESS', payload: true });

        const request: TagVersionRequest = {
          modelId,
          versionId,
          tagName,
          description,
        };

        const response = await fetch('/api/versions/tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) throw new Error('Failed to tag version');

        const tag = await response.json();
        dispatch({
          type: 'SET_TAGS',
          payload: [...state.tags, tag],
        });
        emit('version_tagged', { versionId, tag });

        return true;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return false;
      } finally {
        dispatch({ type: 'SET_OPERATION_IN_PROGRESS', payload: false });
      }
    },
    [modelId, state.tags]
  );

  /**
   * Gets version by tag name
   */
  const getVersionByTag = useCallback(
    async (tagName: string): Promise<ModelVersion | null> => {
      try {
        const response = await fetch(`/api/versions/tag/${tagName}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Tag not found');

        return await response.json();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return null;
      }
    },
    []
  );

  // =====================================================================
  // Event Management
  // =====================================================================

  /**
   * Subscribes to versioning events
   */
  const subscribe = useCallback(
    (eventType: string, listener: Function): (() => void) => {
      if (!eventListenersRef.current.has(eventType)) {
        eventListenersRef.current.set(eventType, []);
      }

      const listeners = eventListenersRef.current.get(eventType)!;
      listeners.push(listener);

      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    },
    []
  );

  /**
   * Emits versioning events
   */
  const emit = useCallback((eventType: string, data: any): void => {
    const listeners = eventListenersRef.current.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }, []);

  // =====================================================================
  // Initialization & Effects
  // =====================================================================

  /**
   * Initialize versioning on mount
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        await getVersionHistory();
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      } catch (error) {
        console.error('Failed to initialize versioning:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initialize();
  }, [modelId]);

  /**
   * Track pending changes
   */
  const setPending = useCallback((changes: string | null) => {
    setPendingChanges(changes);
    dispatch({ type: 'SET_PENDING_CHANGES', payload: changes });
  }, []);

  return {
    // State
    state: {
      currentVersion: state.currentVersion,
      currentBranch: state.currentBranch,
      versionHistory: state.versionHistory,
      branches: state.branches,
      tags: state.tags,
      pendingChanges: state.pendingChanges,
      loading: state.loading,
      error: state.error,
      modelId: state.modelId,
      lastSync: state.lastSync,
    } as VersioningState,
    // Version management
    createVersion,
    getVersionHistory,
    rollbackToVersion,
    compareVersions,
    // Branch management
    createBranch,
    switchBranch,
    mergeBranch,
    deleteBranch,
    protectBranch,
    // Tag management
    tagVersion,
    getVersionByTag,
    // Event management
    subscribe,
    emit,
    // Utilities
    setPending,
    clearError: () => dispatch({ type: 'SET_ERROR', payload: null }),
  };
};

// =========================================================================
// Reducer
// =========================================================================

function versioningReducer(
  state: VersioningState,
  action: any
): VersioningState {
  switch (action.type) {
    case 'SET_CURRENT_VERSION':
      return { ...state, currentVersion: action.payload };

    case 'SET_CURRENT_BRANCH':
      return { ...state, currentBranch: action.payload };

    case 'SET_HISTORY':
      return { ...state, versionHistory: action.payload };

    case 'ADD_VERSION':
      return {
        ...state,
        currentVersion: action.payload,
        versionHistory: [action.payload, ...state.versionHistory],
      };

    case 'SET_BRANCHES':
      return { ...state, branches: action.payload };

    case 'SET_TAGS':
      return { ...state, tags: action.payload };

    case 'SET_PENDING_CHANGES':
      return { ...state, pendingChanges: action.payload };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    default:
      return state;
  }
}

export default useModelVersioning;
