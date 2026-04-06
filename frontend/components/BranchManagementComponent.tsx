'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import {
  GitBranch,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Merge,
  Check,
  X,
  ArrowUpRight,
  Shield,
  User,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { BranchInfo } from '@/types/versioning';
import useModelVersioning from '@/hooks/useModelVersioning';

interface BranchManagementProps {
  modelId: string;
  onBranchSwitch?: (branchName: string) => void;
  onBranchCreated?: (branch: BranchInfo) => void;
}

/**
 * Branch Management Component
 * Manages Git-like branches with creation, switching, merging, and protection
 */
export const BranchManagementComponent: React.FC<BranchManagementProps> = ({
  modelId,
  onBranchSwitch,
  onBranchCreated,
}) => {
  const {
    state: {
      branches,
      currentBranch,
      loading,
      error,
    },
    createBranch,
    switchBranch,
    mergeBranch,
    deleteBranch,
    protectBranch,
  } = useModelVersioning(modelId);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchDescription, setNewBranchDescription] = useState('');
  const [showMergeForm, setShowMergeForm] = useState<string | null>(null);
  const [mergeSourceBranch, setMergeSourceBranch] = useState('');
  const [mergeStrategy, setMergeStrategy] = useState('recursive');
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);

  // Get merge strategies
  const mergeStrategies = [
    { value: 'recursive', label: 'Recursive (Default)' },
    { value: 'fastforward', label: 'Fast-forward' },
    { value: 'ours', label: 'Ours (Keep current)' },
    { value: 'theirs', label: 'Theirs (Accept changes)' },
  ];

  // Validate branch name
  const isValidBranchName = useCallback((name: string): boolean => {
    const regex = /^[a-zA-Z0-9._/-]+$/;
    return regex.test(name) && name.length > 0 && name.length <= 50;
  }, []);

  // Handle create branch
  const handleCreateBranch = useCallback(async () => {
    if (!isValidBranchName(newBranchName)) {
      alert(
        'Invalid branch name. Use alphanumeric, dots, slashes, and hyphens only.'
      );
      return;
    }

    const branch = await createBranch(newBranchName, newBranchDescription);
    if (branch) {
      setNewBranchName('');
      setNewBranchDescription('');
      setShowCreateForm(false);
      onBranchCreated?.(branch);
    }
  }, [newBranchName, newBranchDescription, createBranch, onBranchCreated, isValidBranchName]);

  // Handle switch branch
  const handleSwitchBranch = useCallback(
    async (branchName: string) => {
      if (branchName === currentBranch) return;

      const success = await switchBranch(branchName);
      if (success) {
        onBranchSwitch?.(branchName);
      }
    },
    [currentBranch, switchBranch, onBranchSwitch]
  );

  // Handle merge
  const handleMergeBranch = useCallback(
    async (targetBranch: string) => {
      if (!mergeSourceBranch) {
        alert('Please select a source branch');
        return;
      }

      if (mergeSourceBranch === targetBranch) {
        alert('Cannot merge branch into itself');
        return;
      }

      const success = await mergeBranch(mergeSourceBranch, mergeStrategy);
      if (success) {
        alert('Merge completed successfully!');
        setShowMergeForm(null);
        setMergeSourceBranch('');
      } else {
        alert('Merge completed with conflicts. Please resolve manually.');
      }
    },
    [mergeSourceBranch, mergeStrategy, mergeBranch]
  );

  // Handle delete branch
  const handleDeleteBranch = useCallback(
    async (branchName: string) => {
      if (!confirm(`Delete branch "${branchName}"? This action cannot be undone.`)) {
        return;
      }

      const success = await deleteBranch(branchName);
      if (success) {
        alert('Branch deleted successfully');
      }
    },
    [deleteBranch]
  );

  // Handle protect branch
  const handleProtectBranch = useCallback(
    async (branchName: string) => {
      const success = await protectBranch(branchName);
      if (success) {
        alert(`Branch "${branchName}" is now protected`);
      }
    },
    [protectBranch]
  );

  // Sorted branches (main first)
  const sortedBranches = useMemo(() => {
    return [...branches].sort((a, b) => {
      if (a.isMainBranch) return -1;
      if (b.isMainBranch) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [branches]);

  // Get source branch options (exclude current branch)
  const sourceBranchOptions = useMemo(
    () => branches.filter((b) => b.branchName !== currentBranch),
    [branches, currentBranch]
  );

  // Branch statistics
  const stats = useMemo(
    () => ({
      total: branches.length,
      protected: branches.filter((b) => b.isProtected).length,
      main: branches.filter((b) => b.isMainBranch).length,
    }),
    [branches]
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Branch Management
          </h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition disabled:opacity-50"
            disabled={loading}
          >
            <Plus className="w-4 h-4" />
            New Branch
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded">
            <p className="text-slate-600 dark:text-slate-400">Total</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {stats.total}
            </p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded">
            <p className="text-slate-600 dark:text-slate-400">Protected</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {stats.protected}
            </p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded">
            <p className="text-slate-600 dark:text-slate-400">Main</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {stats.main}
            </p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Create Branch Form */}
      {showCreateForm && (
        <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 space-y-3">
          <input
            type="text"
            placeholder="Branch name (e.g., feature/new-tables)"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newBranchDescription}
            onChange={(e) => setNewBranchDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateBranch}
              disabled={loading || !newBranchName.trim()}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition disabled:opacity-50"
            >
              Create Branch
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewBranchName('');
                setNewBranchDescription('');
              }}
              className="flex-1 px-3 py-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 text-slate-900 dark:text-white text-sm font-medium rounded-md transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Branch List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-slate-600 dark:text-slate-400">Loading branches...</p>
          </div>
        ) : sortedBranches.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-slate-600 dark:text-slate-400">No branches yet</p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {sortedBranches.map((branch) => (
              <div
                key={branch.branchName}
                className={`border rounded-lg p-4 transition ${
                  currentBranch === branch.branchName
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Branch Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <GitBranch className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {branch.branchName}
                      </h3>
                      {currentBranch === branch.branchName && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                          Current
                        </span>
                      )}
                      {branch.isMainBranch && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                          Main
                        </span>
                      )}
                      {branch.isProtected && (
                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Protected
                        </span>
                      )}
                    </div>
                    {branch.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        {branch.description}
                      </p>
                    )}
                  </div>

                  {/* Expand Button */}
                  <button
                    onClick={() =>
                      setExpandedBranch(
                        expandedBranch === branch.branchName ? null : branch.branchName
                      )
                    }
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
                  >
                    <ArrowUpRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>

                {/* Branch Info */}
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{branch.createdBy}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(branch.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                {/* Expanded Actions */}
                {expandedBranch === branch.branchName && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                    {/* Branch Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-600 dark:text-slate-400 mb-1">
                          Versions
                        </p>
                        <p className="text-slate-900 dark:text-white font-medium">
                          {branch.versionCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400 mb-1">
                          Created
                        </p>
                        <p className="text-slate-900 dark:text-white">
                          {format(
                            new Date(branch.createdAt),
                            'MMM d, HH:mm'
                          )}
                        </p>
                      </div>
                    </div>



                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {currentBranch !== branch.branchName && (
                        <button
                          onClick={() => handleSwitchBranch(branch.branchName)}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition"
                        >
                          <Check className="w-3 h-3" />
                          Switch
                        </button>
                      )}

                      {!branch.isMainBranch && (
                        <>
                          {!branch.isProtected ? (
                            <button
                              onClick={() => handleProtectBranch(branch.branchName)}
                              className="flex items-center gap-1 px-3 py-1 bg-orange-200 dark:bg-orange-900/30 hover:bg-orange-300 dark:hover:bg-orange-900/50 text-orange-800 dark:text-orange-400 text-xs rounded transition"
                            >
                              <Unlock className="w-3 h-3" />
                              Protect
                            </button>
                          ) : (
                            <button
                              disabled
                              className="flex items-center gap-1 px-3 py-1 bg-orange-200 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 text-xs rounded opacity-50 cursor-not-allowed"
                            >
                              <Lock className="w-3 h-3" />
                              Protected
                            </button>
                          )}

                          {!branch.isProtected && (
                            <button
                              onClick={() => handleDeleteBranch(branch.branchName)}
                              className="flex items-center gap-1 px-3 py-1 bg-red-200 dark:bg-red-900/30 hover:bg-red-300 dark:hover:bg-red-900/50 text-red-800 dark:text-red-400 text-xs rounded transition"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          )}
                        </>
                      )}

                      {currentBranch === branch.branchName && sourceBranchOptions.length > 0 && (
                        <button
                          onClick={() =>
                            setShowMergeForm(
                              showMergeForm === branch.branchName ? null : branch.branchName
                            )
                          }
                          className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition"
                        >
                          <Merge className="w-3 h-3" />
                          Merge Into
                        </button>
                      )}
                    </div>

                    {/* Merge Form */}
                    {showMergeForm === branch.branchName && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded space-y-2 border border-purple-200 dark:border-purple-800">
                        <select
                          value={mergeSourceBranch}
                          onChange={(e) => setMergeSourceBranch(e.target.value)}
                          className="w-full px-2 py-1 rounded border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select branch to merge...</option>
                          {sourceBranchOptions.map((b) => (
                            <option key={b.branchName} value={b.branchName}>
                              {b.branchName}
                            </option>
                          ))}
                        </select>

                        <select
                          value={mergeStrategy}
                          onChange={(e) => setMergeStrategy(e.target.value)}
                          className="w-full px-2 py-1 rounded border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          {mergeStrategies.map((strat) => (
                            <option key={strat.value} value={strat.value}>
                              {strat.label}
                            </option>
                          ))}
                        </select>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMergeBranch(branch.branchName)}
                            disabled={!mergeSourceBranch}
                            className="flex-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition disabled:opacity-50"
                          >
                            Merge
                          </button>
                          <button
                            onClick={() => setShowMergeForm(null)}
                            className="flex-1 px-2 py-1 bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white text-xs rounded transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchManagementComponent;


