'use client';

import React, { useState } from 'react';
import { AzureDevOpsRepository, DevOpsCredentials, SyncModelToDevOpsRequest } from '@/src/types/devops';
import { useDevOps } from '@/src/hooks/useDevOps';

interface DevOpsSettingsProps {
  modelId?: string;
  onSyncComplete?: (commitId: string) => void;
}

/**
 * DevOps settings component for model configuration and sync
 */
export const DevOpsSettings: React.FC<DevOpsSettingsProps> = ({ modelId, onSyncComplete }) => {
  const devOps = useDevOps({ modelId });

  const [orgUrl, setOrgUrl] = useState('');
  const [pat, setPat] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<AzureDevOpsRepository | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  /**
   * Test and connect to DevOps
   */
  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      const success = await devOps.testConnection({
        organizationUrl: orgUrl,
        personalAccessToken: pat
      });

      if (success) {
        await devOps.fetchRepositories();
      }
    } finally {
      setTestingConnection(false);
    }
  };

  /**
   * Link model to selected repository
   */
  const handleLinkRepository = async () => {
    if (!selectedRepo) return;

    const success = await devOps.linkModelToRepository(
      selectedRepo.id,
      selectedRepo.projectId
    );

    if (success) {
      alert('Model linked to repository successfully!');
    } else {
      alert(`Failed to link model: ${devOps.syncError}`);
    }
  };

  /**
   * Sync model to DevOps
   */
  const handleSyncModel = async () => {
    if (!modelId || !selectedRepo) {
      alert('Please select a repository first');
      return;
    }

    // TODO: Get current DBML content from model
    const dbmlContent = `Table users {
  id integer [primary key]
  email varchar [not null, unique]
  name varchar
  created_at timestamp [default: 'now()']
}`;

    const request: SyncModelToDevOpsRequest = {
      dbmlContent,
      commitMessage: `Update model: ${new Date().toLocaleString()}`,
      createPullRequest: false
    };

    const result = await devOps.syncModelToDevOps(
      request,
      selectedRepo.projectId,
      selectedRepo.id
    );

    if (result?.success) {
      alert(`Model synced successfully! Commit: ${result.commitId}`);
      onSyncComplete?.(result.commitId);
    } else {
      alert(`Sync failed: ${devOps.syncError}`);
    }
  };

  /**
   * Pull model from DevOps
   */
  const handlePullModel = async () => {
    if (!modelId || !selectedRepo) {
      alert('Please select a repository first');
      return;
    }

    const result = await devOps.pullModelFromDevOps(
      selectedRepo.projectId,
      selectedRepo.id
    );

    if (result?.success) {
      alert(
        `Model pulled! Author: ${result.author}, Date: ${new Date(result.commitDate).toLocaleString()}`
      );
    } else {
      alert(`Pull failed: ${devOps.syncError}`);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-semibold text-white">Azure DevOps Integration</h2>
        <p className="text-sm text-gray-400 mt-1">
          Connect and sync your models with Azure DevOps repositories
        </p>
      </div>

      {/* Credentials Section */}
      <div className="border border-gray-700 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-white">DevOps Credentials</h3>

        {/* Organization URL */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Organization URL
          </label>
          <input
            type="text"
            placeholder="https://dev.azure.com/yourorg"
            value={orgUrl}
            onChange={(e) => setOrgUrl(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Format: https://dev.azure.com/YourOrganizationName
          </p>
        </div>

        {/* Personal Access Token */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Personal Access Token (PAT)
          </label>
          <input
            type="password"
            placeholder="••••••••••••••••"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Generate from{' '}
            <a
              href="https://dev.azure.com/_usersettings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              User Settings → Personal access tokens
            </a>
          </p>
        </div>

        {/* Test Connection Button */}
        <button
          onClick={handleTestConnection}
          disabled={testingConnection || !orgUrl || !pat}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors"
        >
          {testingConnection ? 'Testing...' : 'Test Connection'}
        </button>

        {/* Connection Status */}
        {devOps.isAuthenticated && (
          <div className="bg-green-900 border border-green-700 rounded p-3">
            <p className="text-sm text-green-200">✓ Connected to DevOps successfully</p>
          </div>
        )}

        {devOps.error && (
          <div className="bg-red-900 border border-red-700 rounded p-3">
            <p className="text-sm text-red-200">✗ Error: {devOps.error}</p>
          </div>
        )}
      </div>

      {/* Repository Selection */}
      {devOps.isAuthenticated && (
        <div className="border border-gray-700 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-medium text-white">Select Repository</h3>

          {devOps.isLoading ? (
            <p className="text-gray-400">Loading repositories...</p>
          ) : devOps.repositories.length === 0 ? (
            <p className="text-gray-400">No repositories found</p>
          ) : (
            <div className="space-y-2">
              {devOps.repositories.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => setSelectedRepo(repo)}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    selectedRepo?.id === repo.id
                      ? 'border-blue-500 bg-blue-900 bg-opacity-20'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800'
                  }`}
                >
                  <p className="font-medium text-white">{repo.name}</p>
                  <p className="text-xs text-gray-400">Branch: {repo.defaultBranch}</p>
                  <p className="text-xs text-gray-400">{repo.httpUrl}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Model Actions */}
      {devOps.isAuthenticated && selectedRepo && modelId && (
        <div className="border border-gray-700 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-medium text-white">Model Sync</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Push to DevOps */}
            <button
              onClick={handleSyncModel}
              disabled={devOps.isSyncing}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors"
            >
              {devOps.isSyncing ? 'Pushing...' : '↑ Push to DevOps'}
            </button>

            {/* Pull from DevOps */}
            <button
              onClick={handlePullModel}
              disabled={devOps.isSyncing}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors"
            >
              {devOps.isSyncing ? 'Pulling...' : '↓ Pull from DevOps'}
            </button>
          </div>

          {/* Link Repository */}
          <button
            onClick={handleLinkRepository}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Link Model to Repository
          </button>

          {/* Sync History */}
          {devOps.syncHistory.length > 0 && (
            <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
              <p className="text-sm font-medium text-white mb-2">Recent Syncs</p>
              <div className="space-y-2">
                {devOps.syncHistory.slice(0, 3).map((sync) => (
                  <div key={sync.id} className="text-xs text-gray-400">
                    <p>
                      {sync.syncDirection === 'push' ? '↑' : '↓'} {sync.status} -{' '}
                      {new Date(sync.initiatedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-900 border border-blue-700 rounded p-4">
        <p className="text-sm text-blue-200">
          <strong>Tip:</strong> Sync your models to DevOps to version control DBML files alongside
          your code. Push updates, pull changes, and automate CI/CD pipelines.
        </p>
      </div>
    </div>
  );
};

export default DevOpsSettings;
