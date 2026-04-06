/**
 * useFocusMode Hook
 * React hook for managing diagram focus mode state and operations
 * Provides methods for focusing, traversing relationships, and managing highlights
 */

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { DEFAULT_FOCUS_MODE_CONFIG } from "@/types/focus";
import type {
  CalculateFocusRequest,
  CalculateFocusResponse,
  CircularDependencyDetectionResult,
  CycleSeverity,
  DetectCircularDependenciesResponse,
  FindAllPathsRequest,
  FindAllPathsResponse,
  FindPathRequest,
  FindPathResponse,
  FocusModeAction,
  FocusModeChangeEvent,
  FocusModeConfig,
  FocusModeEventListener,
  FocusModeResult,
  FocusModeState,
  FocusMetrics,
  GetConnectionChainsRequest,
  GetConnectionChainsResponse,
  GetGraphMetricsResponse,
  HighlightedRelationship,
  RelationshipGraphMetrics,
  RelationshipPath,
  TableConnectionChain,
} from "@/types/focus";

// ============================================================================
// Reducer
// ============================================================================

const initialFocusModeState: FocusModeState = {
  isActive: false,
  maxDepth: 2,
  highlightedTables: new Set(),
  highlightedRelationships: [],
  loading: false,
  error: undefined,
};

function focusModeReducer(
  state: FocusModeState,
  action: FocusModeAction
): FocusModeState {
  switch (action.type) {
    case "SET_FOCUS_TABLE":
      return {
        ...state,
        isActive: true,
        focusTableName: action.payload.tableId,
        maxDepth: action.payload.maxDepth,
      };

    case "SET_FOCUS_RESULT":
      const result = action.payload;
      const highlightedTables = new Set<string>();

      // Combine all tables into highlighted set
      result.highlightedTables.forEach((t) => highlightedTables.add(t));
      result.directlyConnectedTables.forEach((t) => highlightedTables.add(t));
      result.allConnectedTables.forEach((t) => highlightedTables.add(t));

      return {
        ...state,
        focusResult: result,
        highlightedTables,
        highlightedRelationships: result.highlightedRelationships,
        loading: false,
      };

    case "CLEAR_FOCUS":
      return {
        ...state,
        isActive: false,
        focusTableName: undefined,
        focusResult: undefined,
        highlightedTables: new Set(),
        highlightedRelationships: [],
        metrics: undefined,
      };

    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case "TOGGLE_DEPTH":
      return {
        ...state,
        maxDepth: action.payload,
      };

    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useFocusMode(config: FocusModeConfig = DEFAULT_FOCUS_MODE_CONFIG) {
  const [state, dispatch] = useReducer(focusModeReducer, initialFocusModeState);
  const eventListenersRef = useRef<FocusModeEventListener[]>([]);
  const [graphMetrics, setGraphMetrics] = useState<RelationshipGraphMetrics>();
  const [circularDependencies, setCircularDependencies] =
    useState<CircularDependencyDetectionResult>();

  // ========================================================================
  // Event Management
  // ========================================================================

  const emitFocusModeEvent = useCallback(
    (event: FocusModeChangeEvent) => {
      eventListenersRef.current.forEach((listener) => {
        listener(event);
      });
    },
    []
  );

  const addEventListener = useCallback(
    (listener: FocusModeEventListener) => {
      eventListenersRef.current.push(listener);
      return () => {
        eventListenersRef.current = eventListenersRef.current.filter(
          (l) => l !== listener
        );
      };
    },
    []
  );

  // ========================================================================
  // Core Focus Mode Methods
  // ========================================================================

  const calculateFocus = useCallback(
    async (
      modelId: string,
      tableName: string,
      maxDepth: number = config.maxDepth
    ): Promise<FocusModeResult> => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });

        const request: CalculateFocusRequest = {
          modelId,
          focusTableName: tableName,
          maxDepth,
        };

        const response = await fetch("/api/focusmode/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`Focus calculation failed: ${response.statusText}`);
        }

        const data: CalculateFocusResponse = await response.json();

        if (!data.success || !data.data) {
          throw new Error(data.error || "Unknown error");
        }

        dispatch({ type: "SET_FOCUS_RESULT", payload: data.data });

        const previousFocus = state.focusTableName;
        emitFocusModeEvent({
          type: "focus_changed",
          focusTableName: tableName,
          previousFocusTableName: previousFocus,
          maxDepth,
          timestamp: new Date(),
        });

        return { success: true, data: data.data };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        dispatch({ type: "SET_ERROR", payload: errorMessage });
        return { success: false, error: errorMessage };
      }
    },
    [config.maxDepth, state.focusTableName, emitFocusModeEvent]
  );

  const clearFocus = useCallback(async () => {
    dispatch({ type: "CLEAR_FOCUS" });

    emitFocusModeEvent({
      type: "focus_cleared",
      timestamp: new Date(),
    });
  }, [emitFocusModeEvent]);

  const setFocusDepth = useCallback(
    async (newDepth: number) => {
      if (newDepth < 1 || newDepth > 5) {
        dispatch({
          type: "SET_ERROR",
          payload: "Focus depth must be between 1 and 5",
        });
        return;
      }

      dispatch({ type: "TOGGLE_DEPTH", payload: newDepth });

      if (state.focusTableName) {
        await calculateFocus(state.focusResult?.modelId || "", state.focusTableName, newDepth);
      }

      emitFocusModeEvent({
        type: "depth_changed",
        maxDepth: newDepth,
        timestamp: new Date(),
      });
    },
    [state.focusTableName, state.focusResult?.modelId, calculateFocus]
  );

  // ========================================================================
  // Relationship Path Methods
  // ========================================================================

  const findPath = useCallback(
    async (
      modelId: string,
      sourceTable: string,
      targetTable: string
    ): Promise<FocusModeResult<RelationshipPath>> => {
      try {
        const request: FindPathRequest = {
          modelId,
          sourceTable,
          targetTable,
        };

        const response = await fetch("/api/focusmode/find-path", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`Path finding failed: ${response.statusText}`);
        }

        const data: FindPathResponse = await response.json();

        if (!data.success || !data.data) {
          throw new Error(data.error || "Path not found");
        }

        return { success: true, data: data.data };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  const findAllPaths = useCallback(
    async (
      modelId: string,
      sourceTable: string,
      targetTable: string,
      maxDepth: number = 5
    ): Promise<FocusModeResult<RelationshipPath[]>> => {
      try {
        const request: FindAllPathsRequest = {
          modelId,
          sourceTable,
          targetTable,
          maxDepth,
        };

        const response = await fetch("/api/focusmode/find-all-paths", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`All paths finding failed: ${response.statusText}`);
        }

        const data: FindAllPathsResponse = await response.json();

        if (!data.success || !data.data) {
          throw new Error(data.error || "No paths found");
        }

        return { success: true, data: data.data };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // ========================================================================
  // Connection Chain Methods
  // ========================================================================

  const getConnectionChains = useCallback(
    async (
      modelId: string,
      tableNames: string
    ): Promise<FocusModeResult<TableConnectionChain[]>> => {
      try {
        const request: GetConnectionChainsRequest = {
          modelId,
          tableNames,
        };

        const response = await fetch("/api/focusmode/connection-chains", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`Connection chains failed: ${response.statusText}`);
        }

        const data: GetConnectionChainsResponse = await response.json();

        if (!data.success || !data.data) {
          throw new Error(data.error || "Failed to get connection chains");
        }

        return { success: true, data: data.data };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // ========================================================================
  // Circular Dependency Methods
  // ========================================================================

  const detectCircularDependencies = useCallback(
    async (
      modelId: string
    ): Promise<FocusModeResult<CircularDependencyDetectionResult>> => {
      try {
        const response = await fetch(
          `/api/focusmode/circular-dependencies?modelId=${encodeURIComponent(modelId)}`,
          { method: "GET" }
        );

        if (!response.ok) {
          throw new Error(
            `Circular dependency detection failed: ${response.statusText}`
          );
        }

        const data: DetectCircularDependenciesResponse = await response.json();

        if (!data.success || !data.data) {
          throw new Error(data.error || "Failed to detect circular dependencies");
        }

        setCircularDependencies(data.data);
        return { success: true, data: data.data };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // ========================================================================
  // Graph Metrics Methods
  // ========================================================================

  const getGraphMetrics = useCallback(
    async (modelId: string): Promise<FocusModeResult<RelationshipGraphMetrics>> => {
      try {
        const response = await fetch(
          `/api/focusmode/graph-metrics?modelId=${encodeURIComponent(modelId)}`,
          { method: "GET" }
        );

        if (!response.ok) {
          throw new Error(`Graph metrics failed: ${response.statusText}`);
        }

        const data: GetGraphMetricsResponse = await response.json();

        if (!data.success || !data.data) {
          throw new Error(data.error || "Failed to get graph metrics");
        }

        setGraphMetrics(data.data);
        return { success: true, data: data.data };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // ========================================================================
  // Highlighting Methods
  // ========================================================================

  const getHighlightColor = useCallback(
    (tableName: string): string => {
      if (!state.focusResult) return "";

      if (state.focusResult.highlightedTables.has(tableName)) {
        return config.colorScheme.strong;
      }
      if (state.focusResult.directlyConnectedTables.has(tableName)) {
        return config.colorScheme.medium;
      }
      if (state.focusResult.allConnectedTables.has(tableName)) {
        return config.colorScheme.light;
      }

      return "";
    },
    [state.focusResult, config.colorScheme]
  );

  const getHighlightOpacity = useCallback(
    (tableName: string): number => {
      if (!state.focusResult) return 1;

      if (state.focusResult.highlightedTables.has(tableName)) {
        return config.opacityScheme.strong;
      }
      if (state.focusResult.directlyConnectedTables.has(tableName)) {
        return config.opacityScheme.medium;
      }
      if (state.focusResult.allConnectedTables.has(tableName)) {
        return config.opacityScheme.light;
      }

      return 0.3; // Default dim for non-focused tables
    },
    [state.focusResult, config.opacityScheme]
  );

  const getRelationshipHighlight = useCallback(
    (fromTable: string, toTable: string): HighlightedRelationship | undefined => {
      return state.highlightedRelationships.find(
        (rel) =>
          (rel.fromTable === fromTable && rel.toTable === toTable) ||
          (rel.fromTable === toTable && rel.toTable === fromTable)
      );
    },
    [state.highlightedRelationships]
  );

  // ========================================================================
  // Utility Methods
  // ========================================================================

  const isTableHighlighted = useCallback(
    (tableName: string): boolean => state.highlightedTables.has(tableName),
    [state.highlightedTables]
  );

  const isTableInFocus = useCallback(
    (tableName: string): boolean => tableName === state.focusTableName,
    [state.focusTableName]
  );

  const canIncreaseFocusDepth = useCallback(
    (): boolean => state.maxDepth < 5,
    [state.maxDepth]
  );

  const canDecreaseFocusDepth = useCallback(
    (): boolean => state.maxDepth > 1,
    [state.maxDepth]
  );

  const toggleFocus = useCallback(
    async (
      modelId: string,
      tableName: string
    ): Promise<void> => {
      if (state.isActive && state.focusTableName === tableName) {
        await clearFocus();
      } else {
        await calculateFocus(modelId, tableName, state.maxDepth);
      }
    },
    [state.isActive, state.focusTableName, state.maxDepth, calculateFocus, clearFocus]
  );

  // ========================================================================
  // Keyboard Shortcut Handling
  // ========================================================================

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === config.keyboardShortcuts.toggleFocusMode &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        // Would need context to know current table
        // This is a placeholder for keyboard integration
      } else if (event.key === config.keyboardShortcuts.clearFocus) {
        if (state.isActive) {
          clearFocus();
        }
      } else if (event.key === config.keyboardShortcuts.increaseFocusDepth) {
        if (canIncreaseFocusDepth()) {
          setFocusDepth(state.maxDepth + 1);
        }
      } else if (event.key === config.keyboardShortcuts.decreaseFocusDepth) {
        if (canDecreaseFocusDepth()) {
          setFocusDepth(state.maxDepth - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    config.keyboardShortcuts,
    state.isActive,
    state.maxDepth,
    clearFocus,
    setFocusDepth,
    canIncreaseFocusDepth,
    canDecreaseFocusDepth,
  ]);

  return {
    // State
    state,
    isActive: state.isActive,
    focusTableName: state.focusTableName,
    focusResult: state.focusResult,
    highlightedTables: state.highlightedTables,
    highlightedRelationships: state.highlightedRelationships,
    metrics: state.metrics,
    loading: state.loading,
    error: state.error,
    maxDepth: state.maxDepth,

    // Graph data
    graphMetrics,
    circularDependencies,

    // Core methods
    calculateFocus,
    clearFocus,
    setFocusDepth,
    toggleFocus,

    // Path methods
    findPath,
    findAllPaths,
    getConnectionChains,

    // Circular dependency
    detectCircularDependencies,
    getGraphMetrics,

    // Highlighting
    getHighlightColor,
    getHighlightOpacity,
    getRelationshipHighlight,

    // Utility
    isTableHighlighted,
    isTableInFocus,
    canIncreaseFocusDepth,
    canDecreaseFocusDepth,

    // Events
    addEventListener,
  };
}

export type UseFocusModeReturn = ReturnType<typeof useFocusMode>;
