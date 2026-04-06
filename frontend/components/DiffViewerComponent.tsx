'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Download,
  Copy,
  Plus,
  Minus,
  ArrowRight,
} from 'lucide-react';
import { VersionComparison, ChangeSeverity } from '@/types/versioning';

interface DiffViewerProps {
  comparison: VersionComparison;
  version1Label?: string;
  version2Label?: string;
  onDownloadDiff?: () => void;
}

type ViewMode = 'side-by-side' | 'unified';

/**
 * Diff Viewer Component
 * Displays version comparison with side-by-side and unified diff views
 */
export const DiffViewerComponent: React.FC<DiffViewerProps> = ({
  comparison,
  version1Label = 'Version 1',
  version2Label = 'Version 2',
  onDownloadDiff,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [hideUnchanged, setHideUnchanged] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['all'])
  );
  const [filterType, setFilterType] = useState<'all' | 'added' | 'removed' | 'modified'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get change type colors
  const getChangeColor = (type: string) => {
    switch (type) {
      case 'Added':
      case 'TableAdded':
      case 'ColumnAdded':
        return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700';
      case 'Removed':
      case 'TableRemoved':
      case 'ColumnRemoved':
        return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700';
      case 'Modified':
      case 'ColumnModified':
        return 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700';
      default:
        return 'bg-slate-50 dark:bg-slate-900';
    }
  };

  const getChangeTextColor = (type: string) => {
    switch (type) {
      case 'Added':
      case 'TableAdded':
      case 'ColumnAdded':
        return 'text-green-900 dark:text-green-200';
      case 'Removed':
      case 'TableRemoved':
      case 'ColumnRemoved':
        return 'text-red-900 dark:text-red-200';
      case 'Modified':
      case 'ColumnModified':
        return 'text-blue-900 dark:text-blue-200';
      default:
        return 'text-slate-900 dark:text-slate-200';
    }
  };

  // Filter changes based on type and search
  const filteredChanges = useMemo(() => {
    let filtered = comparison.changes || [];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((change) => {
        const changeTypeStr = change.changeType.toLowerCase();
        return changeTypeStr.includes(filterType);
      });
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (change) =>
          change.description.toLowerCase().includes(query) ||
          change.entityName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [comparison.changes, filterType, searchQuery]);

  // Group changes by category
  const groupedChanges = useMemo(() => {
    const groups: Record<string, typeof filteredChanges> = {};

    filteredChanges.forEach((change) => {
      const category = change.changeType.split(/(?=[A-Z])/)[0] || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(change);
    });

    return groups;
  }, [filteredChanges]);

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const updated = new Set(prev);
      if (updated.has(section)) {
        updated.delete(section);
      } else {
        updated.add(section);
      }
      return updated;
    });
  }, []);

  // Toggle all sections
  const toggleAllSections = useCallback(() => {
    setExpandedSections((prev) => {
      if (prev.size === Object.keys(groupedChanges).length) {
        return new Set();
      } else {
        return new Set(Object.keys(groupedChanges));
      }
    });
  }, [groupedChanges]);

  // Download diff as text
  const handleDownloadDiff = useCallback(() => {
    const summary = `Changes: ${comparison.totalChanges} | Added: ${comparison.tablesAdded} | Removed: ${comparison.tablesRemoved} | Modified: ${comparison.tablesModified}`;
    let diffText = `Diff Report: ${version1Label} → ${version2Label}\n`;
    diffText += `Generated: ${new Date().toISOString()}\n`;
    diffText += `\n${summary}\n\n`;

    // Add changes
    Object.entries(groupedChanges).forEach(([section, changes]) => {
      diffText += `\n=== ${section} Changes ===\n`;
      changes.forEach((change) => {
        diffText += `${change.changeType}: ${change.entityName} - ${change.description}\n`;
      });
    });

    // Download
    const blob = new Blob([diffText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diff-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    onDownloadDiff?.();
  }, [comparison, version1Label, version2Label, groupedChanges, onDownloadDiff]);

  // Copy diff to clipboard
  const handleCopyDiff = useCallback(() => {
    const summary = `Changes: ${comparison.totalChanges} | Added: ${comparison.tablesAdded} | Removed: ${comparison.tablesRemoved} | Modified: ${comparison.tablesModified}`;
    let diffText = `${summary}\n\n`;
    filteredChanges.forEach((change) => {
      diffText += `${change.changeType}: ${change.entityName} - ${change.description}\n`;
    });
    navigator.clipboard.writeText(diffText);
    alert('Diff copied to clipboard');
  }, [comparison.totalChanges, comparison.tablesAdded, comparison.tablesRemoved, comparison.tablesModified, filteredChanges]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Version Comparison
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyDiff}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded transition"
              title="Copy diff"
            >
              <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </button>
            <button
              onClick={handleDownloadDiff}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded transition"
              title="Download diff"
            >
              <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Version Labels */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {version1Label}
          </span>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {version2Label}
          </span>
        </div>

        {/* Summary Statistics */}
        {comparison.totalChanges !== undefined && (
          <div className="grid grid-cols-4 gap-3 mb-4 text-xs">
            <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded">
              <p className="text-slate-600 dark:text-slate-400">Total Changes</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {comparison.totalChanges}
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded">
              <p className="text-slate-600 dark:text-slate-400">Added</p>
              <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                {comparison.tablesAdded || 0}
              </p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded">
              <p className="text-slate-600 dark:text-slate-400">Removed</p>
              <p className="text-lg font-semibold text-red-700 dark:text-red-400">
                {comparison.tablesRemoved || 0}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded">
              <p className="text-slate-600 dark:text-slate-400">Modified</p>
              <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                {comparison.tablesModified || 0}
              </p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="space-y-3">
          {/* View Mode and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-md p-1">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  viewMode === 'side-by-side'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Side-by-Side
              </button>
              <button
                onClick={() => setViewMode('unified')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  viewMode === 'unified'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Unified
              </button>
            </div>

            <button
              onClick={() => setHideUnchanged(!hideUnchanged)}
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition ${
                hideUnchanged
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              {hideUnchanged ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              Hide Unchanged
            </button>
          </div>

          {/* Filter Type and Search */}
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Changes</option>
              <option value="added">Added</option>
              <option value="removed">Removed</option>
              <option value="modified">Modified</option>
            </select>

            <input
              type="text"
              placeholder="Search changes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Text */}
      {`Changes: ${comparison.totalChanges} | Added: ${comparison.tablesAdded} | Removed: ${comparison.tablesRemoved} | Modified: ${comparison.tablesModified}` && (
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {`Changes: ${comparison.totalChanges} | Added: ${comparison.tablesAdded} | Removed: ${comparison.tablesRemoved} | Modified: ${comparison.tablesModified}`}
          </p>
        </div>
      )}

      {/* Changes View */}
      <div className="flex-1 overflow-y-auto">
        {filteredChanges.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
            No changes found
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {/* Expand All Button */}
            <div className="flex justify-end mb-2">
              <button
                onClick={toggleAllSections}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {expandedSections.size === Object.keys(groupedChanges).length
                  ? 'Collapse All'
                  : 'Expand All'}
              </button>
            </div>

            {/* Grouped Changes */}
            {Object.entries(groupedChanges).map(([section, changes]) => (
              <div key={section} className="border rounded-lg overflow-hidden">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {section}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-full">
                      {changes.length}
                    </span>
                  </div>
                  {expandedSections.has(section) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {/* Section Changes */}
                {expandedSections.has(section) && (
                  <div className="border-t border-slate-200 dark:border-slate-700">
                    {changes.map((change, idx) => (
                      <div
                        key={idx}
                        className={`border-b border-slate-200 dark:border-slate-700 p-4 last:border-b-0 ${getChangeColor(
                          change.changeType
                        )}`}
                      >
                        {/* Change Header */}
                        <div className="flex items-start gap-3 mb-2">
                          {/* Icon */}
                          <div className="mt-0.5">
                            {change.changeType.includes('Added') ? (
                              <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : change.changeType.includes('Removed') ? (
                              <Minus className="w-4 h-4 text-red-600 dark:text-red-400" />
                            ) : (
                              <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>

                          {/* Change Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">
                                {change.changeType}
                              </span>
                              {change.severity && (
                                <span
                                  className={`px-2 py-0.5 text-xs rounded font-medium ${
                                    change.severity === ChangeSeverity.Critical
                                      ? 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-200'
                                      : change.severity === ChangeSeverity.High
                                      ? 'bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-200'
                                      : change.severity === ChangeSeverity.Medium
                                      ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-200'
                                      : 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-200'
                                  }`}
                                >
                                  {change.severity}
                                </span>
                              )}
                            </div>
                            {change.entityName && (
                              <p className="text-sm font-mono mt-1 text-slate-700 dark:text-slate-300">
                                {change.entityName}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Change Description */}
                        {change.description && (
                          <p className="text-sm text-slate-700 dark:text-slate-300 ml-7">
                            {change.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
        Showing {filteredChanges.length} of {comparison.totalChanges || 0} changes
      </div>
    </div>
  );
};

export default DiffViewerComponent;


