"use client";

/**
 * Focus Mode Controls Component
 * UI controls for managing diagram focus mode visualization
 * Includes buttons for focus toggle, depth adjustment, and clearing focus
 */

import React, { useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Focus,
  X,
  AlertCircle,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UseFocusModeReturn } from "@/hooks/useFocusMode";

interface FocusModeControlsProps {
  /** Focus mode hook result */
  focusMode: UseFocusModeReturn;
  /** Current model ID */
  modelId: string;
  /** Current diagram table (if any) */
  currentTableId?: string;
  /** CSS class for container */
  className?: string;
  /** Show metrics panel */
  showMetrics?: boolean;
  /** Compact mode (smaller buttons) */
  compact?: boolean;
  /** Callback when focus table changes */
  onFocusChange?: (tableName: string | undefined) => void;
}

export const FocusModeControls: React.FC<FocusModeControlsProps> = ({
  focusMode,
  modelId,
  currentTableId,
  className,
  showMetrics = true,
  compact = false,
  onFocusChange,
}) => {
  // ========================================================================
  // Handlers
  // ========================================================================

  const handleToggleFocus = async () => {
    if (!currentTableId) return;
    await focusMode.toggleFocus(modelId, currentTableId);
    onFocusChange?.(focusMode.isActive ? undefined : currentTableId);
  };

  const handleIncreaseFocusDepth = async () => {
    if (focusMode.canIncreaseFocusDepth()) {
      await focusMode.setFocusDepth(focusMode.maxDepth + 1);
    }
  };

  const handleDecreaseFocusDepth = async () => {
    if (focusMode.canDecreaseFocusDepth()) {
      await focusMode.setFocusDepth(focusMode.maxDepth - 1);
    }
  };

  const handleClearFocus = async () => {
    await focusMode.clearFocus();
    onFocusChange?.(undefined);
  };

  // ========================================================================
  // Computed Values
  // ========================================================================

  const isCurrentTableFocused = useMemo(
    () => focusMode.isTableInFocus(currentTableId || ""),
    [focusMode, currentTableId]
  );

  const focusInfo = useMemo(() => {
    if (!focusMode.focusResult) return null;
    return {
      tableName: focusMode.focusResult.focusTableName,
      directCount: focusMode.focusResult.directlyConnectedTables.size,
      totalCount: focusMode.focusResult.allConnectedTables.size,
      relationshipCount: focusMode.focusResult.highlightedRelationships.length,
    };
  }, [focusMode.focusResult]);

  // ========================================================================
  // Render
  // ========================================================================

  const buttonSize = compact ? "sm" : "base";
  const iconSize = compact ? 16 : 20;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm",
        "dark:bg-slate-900 dark:border-slate-700",
        className
      )}
    >
      {/* Main Controls */}
      <div className="flex items-center gap-2">
        {/* Focus Toggle Button */}
        <button
          onClick={handleToggleFocus}
          disabled={!currentTableId || focusMode.loading}
          title={
            focusMode.isActive
              ? "Clear focus (Esc)"
              : "Focus on table (F)"
          }
          className={cn(
            "flex items-center justify-center gap-2 px-3 py-2 rounded-md font-medium transition-colors",
            "border border-transparent",
            focusMode.isActive
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            compact && "px-2 py-1 text-sm"
          )}
        >
          <Focus size={iconSize} />
          {!compact && <span>{focusMode.isActive ? "Focused" : "Focus"}</span>}
        </button>

        {/* Depth Controls */}
        <div className="flex items-center gap-1 border-l border-gray-200 dark:border-slate-600 pl-2">
          <button
            onClick={handleDecreaseFocusDepth}
            disabled={
              !focusMode.canDecreaseFocusDepth() || !focusMode.isActive || focusMode.loading
            }
            title="Decrease focus depth (-)"
            className={cn(
              "p-1.5 rounded-md transition-colors",
              "bg-gray-100 text-gray-900 hover:bg-gray-200",
              "dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <ChevronDown size={iconSize} />
          </button>

          <div className="px-2 py-1 min-w-[2.5rem] text-center">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {focusMode.maxDepth}
            </span>
          </div>

          <button
            onClick={handleIncreaseFocusDepth}
            disabled={
              !focusMode.canIncreaseFocusDepth() || !focusMode.isActive || focusMode.loading
            }
            title="Increase focus depth (+)"
            className={cn(
              "p-1.5 rounded-md transition-colors",
              "bg-gray-100 text-gray-900 hover:bg-gray-200",
              "dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <ChevronUp size={iconSize} />
          </button>
        </div>

        {/* Clear Button */}
        {focusMode.isActive && (
          <button
            onClick={handleClearFocus}
            disabled={focusMode.loading}
            title="Clear focus (Esc)"
            className={cn(
              "p-1.5 rounded-md transition-colors ml-auto",
              "bg-red-100 text-red-600 hover:bg-red-200",
              "dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <X size={iconSize} />
          </button>
        )}
      </div>

      {/* Focus Info Panel */}
      {focusMode.isActive && focusInfo && showMetrics && (
        <div className="space-y-2 border-t border-gray-200 dark:border-slate-600 pt-2">
          {/* Focus Table */}
          <div className="flex items-start gap-2">
            <Focus size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Focused Table
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {focusInfo.tableName}
              </p>
            </div>
          </div>

          {/* Connection Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 p-2 bg-gray-50 dark:bg-slate-800 rounded">
              <TrendingUp size={14} className="text-orange-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Direct</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {focusInfo.directCount}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-2 bg-gray-50 dark:bg-slate-800 rounded">
              <Zap size={14} className="text-yellow-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {focusInfo.totalCount}
                </p>
              </div>
            </div>
          </div>

          {/* Relationship Count */}
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-800 rounded text-sm">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-gray-600 dark:text-gray-300">
              {focusInfo.relationshipCount} relationships
            </span>
          </div>

          {/* Maximum Depth Indicator */}
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm border border-blue-200 dark:border-blue-800">
            <AlertCircle size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-blue-900 dark:text-blue-300">
              Depth: {focusMode.maxDepth} levels
            </span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {focusMode.loading && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-600 dark:text-gray-300">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
          <span>Calculating focus...</span>
        </div>
      )}

      {/* Error State */}
      {focusMode.error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-xs text-red-700 dark:text-red-400 font-medium">
            Error: {focusMode.error}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Compact Focus Mode Toolbar
 * Minimalist version for embedding in other components
 */
export const FocusModeToolbar: React.FC<
  Omit<FocusModeControlsProps, "compact">
> = (props) => {
  return <FocusModeControls {...props} compact={true} />;
};

/**
 * Focus Mode Status Indicator
 * Shows current focus status in a small badge
 */
interface FocusModeStatusProps {
  focusMode: UseFocusModeReturn;
  className?: string;
}

export const FocusModeStatus: React.FC<FocusModeStatusProps> = ({
  focusMode,
  className,
}) => {
  if (!focusMode.isActive) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full",
        "border border-blue-300 dark:border-blue-700 text-xs font-medium",
        "text-blue-700 dark:text-blue-300",
        className
      )}
    >
      <Focus size={12} />
      <span>Focus: {focusMode.focusTableName}</span>
      <span className="text-blue-600 dark:text-blue-400 ml-0.5">
        (Depth: {focusMode.maxDepth})
      </span>
    </div>
  );
};

export default FocusModeControls;
