'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  DevOpsCredentials,
  AzureDevOpsRepository,
  AzureDevOpsPipeline,
  AzureDevOpsCommit,
  ModelSyncHistory,
  SyncModelToDevOpsRequest,
  SyncModelToDevOpsResult,
  PullModelFromDevOpsRequest,
  PullModelFromDevOpsResult,
  ModelRepositoryLink,
  DevOpsServiceState
} from '@/src/types/devops';

interface UseDevOpsOptions {
  apiUrl?: string;
  modelId?: string;
  autoRefreshIntervalMs?: number;
}

/**
 * Hook for managing Azure DevOps integration
 * Handles credentials, repositories, syncing, and pipeline management
 */
export const useDevOps = (options: UseDevOpsOptions = {}) => {
  const {
    apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    modelId,
    autoRefreshIntervalMs = 300000 // 5 minutes
  } = options;

  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  // State management
  const [state, setState] = useState<DevOpsServiceState>({
    isAuthenticated: false,
    repositories: [],
    pipelines: [],
    isLoading: false,
    error: undefined,
    lastRefresh: new Date()
  });

  const [credentials, setCredentials] = useState<DevOpsCredentials | null>(null);
  const [modelLink, setModelLink] = useState<ModelRepositoryLink | null>(null);
  const [syncHistory, setSyncHistory] = useState<ModelSyncHistory[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  /**
   * Test connection to Azure DevOps
   */
  const testConnection = useCallback(
    async (creds: DevOpsCredentials) => {
      try {
        setState(s => ({ ...s, isLoading: true, error: undefined }));

        const response = await fetch(`${apiUrl}/api/devops/test-connection`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            organizationUrl: creds.organizationUrl,
            personalAccessToken: creds.personalAccessToken
          })
        });

        if (!response.ok) {
          throw new Error(`Connection test failed: ${response.statusText}`);
        }

        const testResult = await response.json();

        if (testResult.isSuccess) {
          setCredentials(creds);
          setState(s => ({
            ...s,
            isLoading: false,
            isAuthenticated: true,
            organizationUrl: creds.organizationUrl,
            error: undefined
          }));
          return true;
        } else {
          setState(s => ({
            ...s,
            isLoading: false,
            error: testResult.message
          }));
          return false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
        setState(s => ({
          ...s,
          isLoading: false,
          error: errorMessage
        }));
        return false;
      }
    },
    [apiUrl]
  );

  /**
   * Fetch repositories from DevOps
   */
  const fetchRepositories = useCallback(async () => {
    if (!credentials) {
      setState(s => ({ ...s, error: 'No credentials provided' }));
      return;
    }

    try {
      setState(s => ({ ...s, isLoading: true, error: undefined }));

      const params = new URLSearchParams({
        organizationUrl: credentials.organizationUrl,
        personalAccessToken: credentials.personalAccessToken
      });

      const response = await fetch(`${apiUrl}/api/devops/repositories?${params}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.statusText}`);
      }

      const data = await response.json();

      setState(s => ({
        ...s,
        isLoading: false,
        repositories: data.repositories || [],
        lastRefresh: new Date()
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch repositories';
      setState(s => ({
        ...s,
        isLoading: false,
        error: errorMessage
      }));
    }
  }, [apiUrl, credentials]);

  /**
   * Fetch pipelines from DevOps
   */
  const fetchPipelines = useCallback(
    async (projectId: string) => {
      if (!credentials) {
        setState(s => ({ ...s, error: 'No credentials provided' }));
        return;
      }

      try {
        setState(s => ({ ...s, isLoading: true, error: undefined }));

        const params = new URLSearchParams({
          organizationUrl: credentials.organizationUrl,
          projectId,
          personalAccessToken: credentials.personalAccessToken
        });

        const response = await fetch(`${apiUrl}/api/devops/pipelines?${params}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch pipelines: ${response.statusText}`);
        }

        const data = await response.json();

        setState(s => ({
          ...s,
          isLoading: false,
          pipelines: data.pipelines || [],
          lastRefresh: new Date()
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch pipelines';
        setState(s => ({
          ...s,
          isLoading: false,
          error: errorMessage
        }));
      }
    },
    [apiUrl, credentials]
  );

  /**
   * Fetch commits from repository
   */
  const fetchCommits = useCallback(
    async (
      repositoryId: string,
      projectId: string,
      top: number = 20
    ): Promise<AzureDevOpsCommit[]> => {
      if (!credentials) {
        setState(s => ({ ...s, error: 'No credentials provided' }));
        return [];
      }

      try {
        const params = new URLSearchParams({
          organizationUrl: credentials.organizationUrl,
          projectId,
          personalAccessToken: credentials.personalAccessToken,
          top: top.toString()
        });

        const response = await fetch(
          `${apiUrl}/api/devops/repositories/${repositoryId}/commits?${params}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch commits: ${response.statusText}`);
        }

        const data = await response.json();
        return data.commits || [];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch commits';
        setSyncError(errorMessage);
        return [];
      }
    },
    [apiUrl, credentials]
  );

  /**
   * Sync model to DevOps (push)
   */
  const syncModelToDevOps = useCallback(
    async (
      request: SyncModelToDevOpsRequest,
      projectId: string,
      repositoryId: string
    ): Promise<SyncModelToDevOpsResult | null> => {
      if (!credentials || !modelId) {
        setSyncError('Missing credentials or model ID');
        return null;
      }

      try {
        setIsSyncing(true);
        setSyncError(null);

        const response = await fetch(`${apiUrl}/api/devops/models/${modelId}/sync-push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            organizationUrl: credentials.organizationUrl,
            projectId,
            repositoryId,
            personalAccessToken: credentials.personalAccessToken,
            ...request
          })
        });

        if (!response.ok) {
          throw new Error(`Sync failed: ${response.statusText}`);
        }

        const result = await response.json();
        setIsSyncing(false);

        // Add to history
        setSyncHistory(h => [
          {
            id: result.commitId,
            modelId,
            syncDirection: 'push',
            status: result.success ? 'completed' : 'failed',
            devOpsCommitId: result.commitId,
            localVersionId: '',
            details: result.message,
            initiatedAt: new Date(),
            completedAt: new Date(),
            initiatedBy: 'current_user'
          },
          ...h
        ]);

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Sync failed';
        setSyncError(errorMessage);
        setIsSyncing(false);
        return null;
      }
    },
    [apiUrl, credentials, modelId]
  );

  /**
   * Pull model from DevOps (fetch)
   */
  const pullModelFromDevOps = useCallback(
    async (
      projectId: string,
      repositoryId: string,
      request?: PullModelFromDevOpsRequest
    ): Promise<PullModelFromDevOpsResult | null> => {
      if (!credentials || !modelId) {
        setSyncError('Missing credentials or model ID');
        return null;
      }

      try {
        setIsSyncing(true);
        setSyncError(null);

        const response = await fetch(`${apiUrl}/api/devops/models/${modelId}/sync-pull`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            organizationUrl: credentials.organizationUrl,
            projectId,
            repositoryId,
            personalAccessToken: credentials.personalAccessToken,
            ...request
          })
        });

        if (!response.ok) {
          throw new Error(`Pull failed: ${response.statusText}`);
        }

        const result = await response.json();
        setIsSyncing(false);

        // Add to history
        setSyncHistory(h => [
          {
            id: result.commitId,
            modelId,
            syncDirection: 'pull',
            status: result.success ? 'completed' : 'failed',
            devOpsCommitId: result.commitId,
            localVersionId: '',
            details: result.message,
            initiatedAt: new Date(),
            completedAt: new Date(),
            initiatedBy: 'current_user'
          },
          ...h
        ]);

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Pull failed';
        setSyncError(errorMessage);
        setIsSyncing(false);
        return null;
      }
    },
    [apiUrl, credentials, modelId]
  );

  /**
   * Link model to repository
   */
  const linkModelToRepository = useCallback(
    async (
      repositoryId: string,
      projectId: string,
      branchName: string = 'main',
      filePath: string = 'models/model.dbml'
    ) => {
      if (!modelId) {
        setSyncError('Missing model ID');
        return false;
      }

      try {
        setIsSyncing(true);
        setSyncError(null);

        const response = await fetch(`${apiUrl}/api/devops/models/${modelId}/link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            organizationUrl: credentials?.organizationUrl,
            projectId,
            repositoryId,
            personalAccessToken: credentials?.personalAccessToken,
            branchName,
            filePath,
            autoSync: true
          })
        });

        if (!response.ok) {
          throw new Error(`Link failed: ${response.statusText}`);
        }

        setModelLink({
          modelId,
          repositoryId,
          repositoryName: '',
          branchName,
          filePath,
          autoSync: true,
          linkedAt: new Date()
        });

        setIsSyncing(false);
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Link failed';
        setSyncError(errorMessage);
        setIsSyncing(false);
        return false;
      }
    },
    [apiUrl, credentials, modelId]
  );

  /**
   * Clear credentials and reset state
   */
  const clearCredentials = useCallback(() => {
    setCredentials(null);
    setState({
      isAuthenticated: false,
      repositories: [],
      pipelines: [],
      isLoading: false,
      error: undefined,
      lastRefresh: new Date()
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    state,
    credentials,
    modelLink,
    syncHistory,
    isSyncing,
    syncError,
    isAuthenticated: state.isAuthenticated,

    // Methods
    testConnection,
    fetchRepositories,
    fetchPipelines,
    fetchCommits,
    syncModelToDevOps,
    pullModelFromDevOps,
    linkModelToRepository,
    clearCredentials,

    // Utilities
    repositories: state.repositories,
    pipelines: state.pipelines,
    isLoading: state.isLoading,
    error: state.error
  };
};

export default useDevOps;
