'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Clock,
  Tag,
  User,
  MessageSquare,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Copy,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { ModelVersion, VersionTag } from '@/types/versioning';
import useModelVersioning from '@/hooks/useModelVersioning';

interface VersionHistoryUIProps {
  modelId: string;
  onVersionSelect?: (version: ModelVersion) => void;
  onRollback?: (versionId: string) => void;
  maxHeight?: string;
}

/**
 * Version versionHistory Timeline UI Component
 * Displays DBML model version versionHistory with filtering, search, and tagging
 */
export const VersionHistoryUI: React.FC<VersionHistoryUIProps> = ({
  modelId,
  onVersionSelect,
  onRollback,
  maxHeight = '600px',
}) => {
  const {
    state: {
      versionHistory,
      tags,
      currentVersion,
      currentBranch,
      loading,
      error,
    },
    getVersionHistory,
    rollbackToVersion,
    compareVersions,
    tagVersion,
  } = useModelVersioning(modelId);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(20);
  const [pageNumber, setPageNumber] = useState(1);
  const [showTagForm, setShowTagForm] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tagDescription, setTagDescription] = useState('');

  // Filter and search versions
  const filteredVersions = useMemo(() => {
    let filtered = [...versionHistory];

    // Filter by branch
    if (filterBranch !== 'all') {
      filtered = filtered.filter((v: ModelVersion) => v.branchName === filterBranch);
    }

    // Search by message or author
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v: ModelVersion) =>
          v.commitMessage.toLowerCase().includes(query) ||
          v.createdBy.toLowerCase().includes(query)
      );
    }

    // Sort
    if (sortOrder === 'asc') {
      filtered.reverse();
    }

    return filtered;
  }, [versionHistory, filterBranch, searchQuery, sortOrder]);

  // Get unique branches from versionHistory
  const uniqueBranches = useMemo(
    () => [...new Set(versionHistory.map((v: ModelVersion) => v.branchName))] as string[],
    [versionHistory]
  );

  // Get tags for a specific version
  const getVersionTags = useCallback(
    (versionId: string): VersionTag[] => {
      return tags.filter((t) => t.versionId === versionId);
    },
    [tags]
  );

  // Handle version selection for comparison
  const handleVersionSelect = useCallback(
    (version: ModelVersion) => {
      setSelectedVersions((prev) => {
        const updated = new Set(prev);
        if (updated.has(version.versionId)) {
          updated.delete(version.versionId);
        } else {
          updated.add(version.versionId);
        }
        return updated;
      });
      onVersionSelect?.(version);
    },
    [onVersionSelect]
  );

  // Handle rollback
  const handleRollback = useCallback(
    async (versionId: string) => {
      if (!confirm('Are you sure you want to rollback to this version?')) return;

      const success = await rollbackToVersion(versionId, 'Rolled back via UI');
      if (success) {
        onRollback?.(versionId);
        alert('Rollback successful!');
      }
    },
    [rollbackToVersion, onRollback]
  );

  // Handle tagging
  const handleAddTag = useCallback(
    async (versionId: string) => {
      if (!tagInput.trim()) return;

      const success = await tagVersion(versionId, tagInput, tagDescription);
      if (success) {
        setTagInput('');
        setTagDescription('');
        setShowTagForm(null);
      }
    },
    [tagVersion, tagInput, tagDescription]
  );

  // Handle copy version ID
  const handleCopyVersionId = useCallback((versionId: string) => {
    navigator.clipboard.writeText(versionId);
    alert('Version ID copied to clipboard');
  }, []);

  // Handle compare versions
  const handleCompareVersions = useCallback(async () => {
    if (selectedVersions.size !== 2) return;

    const [v1, v2] = Array.from(selectedVersions);
    const comparison = await compareVersions(v1, v2);

    if (comparison) {
      alert(`Comparison generated: ${comparison.totalChanges} changes`);
    }
  }, [selectedVersions, compareVersions]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Version versionHistory
        </h2>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search by message or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Controls */}
          <div className="grid grid-cols-3 gap-3">
            {/* Branch Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Branch
              </label>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="w-full px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Branches</option>
                {uniqueBranches.map((branch: string) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sort
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>

            {/* Page Size */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Per Page
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value))}
                className="w-full px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>

          {/* Comparison Button */}
          {selectedVersions.size === 2 && (
            <button
              onClick={handleCompareVersions}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition"
            >
              Compare {selectedVersions.size} Versions
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Clock className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Loading versionHistory...
            </p>
          </div>
        </div>
      )}

      {/* Version List */}
      {!loading && (
        <div className={`flex-1 overflow-y-auto`} style={{ maxHeight }}>
          {filteredVersions.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
              No versions found
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {filteredVersions.map((version) => (
                <div
                  key={version.versionId}
                  className={`border rounded-lg p-4 transition ${
                    selectedVersions.has(version.versionId)
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Version Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        {/* Selection Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedVersions.has(version.versionId)}
                          onChange={() => handleVersionSelect(version)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                        />

                        {/* Current Badge */}
                        {currentVersion?.versionId === version.versionId && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                            Current
                          </span>
                        )}

                        {/* Version Message */}
                        <div
                          onClick={() =>
                            setExpandedVersionId(
                              expandedVersionId === version.versionId ? null : version.versionId
                            )
                          }
                          className="flex-1"
                        >
                          <p className="font-medium text-slate-900 dark:text-white text-sm line-clamp-1">
                            {version.commitMessage}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 dark:text-slate-400">
                            <User className="w-3 h-3" />
                            <span>{version.createdBy}</span>
                            <Clock className="w-3 h-3 ml-2" />
                            <span>
                              {format(
                                new Date(version.createdAt),
                                'MMM d, yyyy HH:mm'
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {getVersionTags(version.versionId).map((tag) => (
                          <span
                            key={tag.tagId}
                            className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded flex items-center gap-1"
                          >
                            <Tag className="w-3 h-3" />
                            {tag.tagName}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setExpandedVersionId(
                            expandedVersionId === version.versionId ? null : version.versionId
                          )
                        }
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
                      >
                        {expandedVersionId === version.versionId ? (
                          <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedVersionId === version.versionId && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                      {/* Version Info */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-slate-600 dark:text-slate-400 mb-1">
                            Version ID
                          </p>
                          <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-900 dark:text-white font-mono break-all">
                            {version.versionId.substring(0, 12)}...
                          </code>
                        </div>
                        <div>
                          <p className="text-slate-600 dark:text-slate-400 mb-1">
                            Branch
                          </p>
                          <div className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            <span className="text-slate-900 dark:text-white">
                              {version.branchName}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-600 dark:text-slate-400 mb-1">
                            Checksum
                          </p>
                          <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-900 dark:text-white font-mono">
                            {version.checksum?.substring(0, 12)}...
                          </code>
                        </div>
                        <div>
                          <p className="text-slate-600 dark:text-slate-400 mb-1">
                            Statistics
                          </p>
                          <p className="text-slate-900 dark:text-white">
                            {version.statistics?.tableCount || 0} tables
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          onClick={() => handleCopyVersionId(version.versionId)}
                          className="flex items-center gap-1 px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white text-xs rounded transition"
                        >
                          <Copy className="w-3 h-3" />
                          Copy ID
                        </button>

                        {currentVersion?.versionId !== version.versionId && (
                          <button
                            onClick={() => handleRollback(version.versionId)}
                            className="flex items-center gap-1 px-3 py-1 bg-orange-200 dark:bg-orange-900/30 hover:bg-orange-300 dark:hover:bg-orange-900/50 text-orange-800 dark:text-orange-400 text-xs rounded transition"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Rollback
                          </button>
                        )}

                        <button
                          onClick={() => setShowTagForm(showTagForm === version.versionId ? null : version.versionId)}
                          className="flex items-center gap-1 px-3 py-1 bg-purple-200 dark:bg-purple-900/30 hover:bg-purple-300 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-400 text-xs rounded transition"
                        >
                          <Tag className="w-3 h-3" />
                          Tag
                        </button>
                      </div>

                      {/* Tag Form */}
                      {showTagForm === version.versionId && (
                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded space-y-2">
                          <input
                            type="text"
                            placeholder="Tag name (e.g., v1.0.0)"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Description (optional)"
                            value={tagDescription}
                            onChange={(e) => setTagDescription(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddTag(version.versionId)}
                              className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition"
                            >
                              Create Tag
                            </button>
                            <button
                              onClick={() => setShowTagForm(null)}
                              className="flex-1 px-2 py-1 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 text-slate-900 dark:text-white text-xs rounded transition"
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
      )}

      {/* Pagination */}
      {!loading && filteredVersions.length > 0 && (
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <p>
            Showing {Math.min((pageNumber - 1) * pageSize + 1, filteredVersions.length)} -{' '}
            {Math.min(pageNumber * pageSize, filteredVersions.length)} of{' '}
            {filteredVersions.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
              disabled={pageNumber === 1}
              className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPageNumber(pageNumber + 1)}
              disabled={pageNumber * pageSize >= filteredVersions.length}
              className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionHistoryUI;


