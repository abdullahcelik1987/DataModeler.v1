"use client";

/**
 * Diagram Enhancements Component
 * Integrates focus mode, zoom/pan, and virtual rendering
 * Enhances ReactFlow diagram with visual improvements and performance optimizations
 */

import React, { useCallback, useEffect, useRef } from "react";
import { useReactFlow, useNodesState, useEdgesState } from "reactflow";
import { cn } from "@/lib/utils";
import { useFocusMode } from "@/hooks/useFocusMode";
import { useZoomPan } from "@/hooks/useZoomPan";
import { useVirtualRendering } from "@/hooks/useVirtualRendering";
import { FocusModeControls, FocusModeStatus } from "@/components/FocusModeControls";
import { DEFAULT_FOCUS_MODE_CONFIG } from "@/types/focus";
import type { Node, Edge } from "reactflow";

interface DiagramEnhancementsProps {
  /** Current model ID */
  modelId: string;
  /** CSS class for container */
  className?: string;
  /** Show focus mode controls */
  showFocusControls?: boolean;
  /** Show zoom/pan controls */
  showZoomPanControls?: boolean;
  /** Show virtual rendering stats */
  showRenderingStats?: boolean;
  /** Show focus mode metrics */
  showFocusMetrics?: boolean;
  /** Enable performance optimizations */
  enableOptimizations?: boolean;
  /** Callback when focus changes */
  onFocusChange?: (tableName: string | undefined) => void;
  /** Callback for stats updates */
  onStatsUpdate?: (stats: {
    fps: number;
    renderedEntities: number;
    culledEntities: number;
  }) => void;
}

export const DiagramEnhancements: React.FC<DiagramEnhancementsProps> = ({
  modelId,
  className,
  showFocusControls = true,
  showZoomPanControls = true,
  showRenderingStats = true,
  showFocusMetrics = true,
  enableOptimizations = true,
  onFocusChange,
  onStatsUpdate,
}) => {
  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ========================================================================
  // Hooks
  // ========================================================================

  const focusMode = useFocusMode(DEFAULT_FOCUS_MODE_CONFIG);
  const zoomPan = useZoomPan(containerRef);
  const virtualRendering = useVirtualRendering({
    cullingPadding: 500,
    enableDebug: showRenderingStats,
  });

  const [, setNodes] = useNodesState([]);
  const [, setEdges] = useEdgesState([]);

  // ========================================================================
  // Effects
  // ========================================================================

  /**
   * Update virtual rendering when nodes/edges change
   */
  useEffect(() => {
    if (!enableOptimizations || !reactFlowInstance.getNodes().length) return;

    const nodes = reactFlowInstance.getNodes();
    const edges = reactFlowInstance.getEdges();

    // Convert ReactFlow nodes to renderable entities
    const entities = nodes.map((node) => ({
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      width: node.width || 150,
      height: node.height || 50,
      data: node.data,
    }));

    // Convert ReactFlow edges to renderable edges
    const edgeList = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }));

    virtualRendering.setRenderableEntities(entities);
    virtualRendering.setRenderableEdges(edgeList);
  }, [reactFlowInstance, enableOptimizations, virtualRendering]);

  /**
   * Update viewport when pan/zoom changes
   */
  useEffect(() => {
    if (!containerRef.current) return;

    const { zoom, translateX, translateY } = zoomPan.transform;
    const { clientWidth, clientHeight } = containerRef.current;

    virtualRendering.updateViewport({
      x: -translateX / zoom,
      y: -translateY / zoom,
      width: clientWidth / zoom,
      height: clientHeight / zoom,
    });
  }, [zoomPan.transform, virtualRendering]);

  /**
   * Apply focus mode highlighting
   */
  useEffect(() => {
    if (!focusMode.isActive || !focusMode.focusResult) return;

    const nodes = reactFlowInstance.getNodes();
    const updatedNodes = nodes.map((node) => {
      const isHighlighted = focusMode.highlightedTables.has(node.id);
      const color = focusMode.getHighlightColor(node.id);
      const opacity = focusMode.getHighlightOpacity(node.id);

      return {
        ...node,
        style: {
          ...node.style,
          borderColor: isHighlighted ? color : undefined,
          borderWidth: isHighlighted ? 3 : 1,
          opacity,
          boxShadow: focusMode.isTableInFocus(node.id)
            ? `0 0 20px 4px ${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`
            : "none",
          transition: "all 0.3s ease-out",
        },
        data: {
          ...node.data,
          highlighted: isHighlighted,
          focusLevel: focusMode.focusTableName === node.id
            ? 0
            : focusMode.focusResult?.directlyConnectedTables.has(node.id)
            ? 1
            : focusMode.focusResult?.allConnectedTables.has(node.id)
            ? 2
            : -1,
        },
      };
    });

    setNodes(updatedNodes);

    // Apply edge highlighting
    const edges = reactFlowInstance.getEdges();
    const updatedEdges = edges.map((edge) => {
      const highlight = focusMode.getRelationshipHighlight(edge.source, edge.target);

      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: highlight?.highlightColor || undefined,
          strokeWidth: highlight ? highlight.depth === 0 ? 2 : 1.5 : undefined,
          opacity: highlight?.opacity || 0.3,
          transition: "all 0.3s ease-out",
        },
        animated: highlight !== undefined,
      };
    });

    setEdges(updatedEdges);
  }, [
    focusMode.isActive,
    focusMode.focusResult,
    focusMode.highlightedTables,
    focusMode.focusTableName,
    focusMode.getHighlightColor,
    focusMode.getHighlightOpacity,
    focusMode.getRelationshipHighlight,
    focusMode.isTableInFocus,
    focusMode.isTableInFocus,
    reactFlowInstance,
    setNodes,
    setEdges,
  ]);

  /**
   * Update stats callback
   */
  useEffect(() => {
    if (!showRenderingStats) return;

    const stats = virtualRendering.getStatistics();
    onStatsUpdate?.({
      fps: stats.fps,
      renderedEntities: stats.renderedEntities,
      culledEntities: stats.culledEntities,
    });
  }, [virtualRendering, showRenderingStats, onStatsUpdate]);

  // ========================================================================
  // Handlers
  // ========================================================================

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (!showFocusControls) return;

      // Focus on the clicked node
      focusMode.calculateFocus(modelId, nodeId, focusMode.maxDepth);
      onFocusChange?.(nodeId);
    },
    [modelId, focusMode, showFocusControls, onFocusChange]
  );

  const handleZoomReset = useCallback(() => {
    zoomPan.reset();
    virtualRendering.zoomToFitContent();
  }, [zoomPan, virtualRendering]);

  // ========================================================================
  // Render
  // ========================================================================

  const stats = virtualRendering.getStatistics();

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-gray-50 dark:bg-slate-950",
        "overflow-hidden",
        className
      )}
    >
      {/* Diagram Canvas */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={zoomPan.getTransformStyle()}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{
            imageRendering: "pixelated",
          }}
        />
      </div>

      {/* Top-left: Focus Mode Controls */}
      {showFocusControls && (
        <div className="absolute top-4 left-4 z-40">
          <FocusModeControls
            focusMode={focusMode}
            modelId={modelId}
            currentTableId={focusMode.focusTableName}
            showMetrics={showFocusMetrics}
            onFocusChange={onFocusChange}
          />
        </div>
      )}

      {/* Top-right: Focus Mode Status Badge */}
      {showFocusControls && (
        <div className="absolute top-4 right-4 z-40">
          <FocusModeStatus focusMode={focusMode} />
        </div>
      )}

      {/* Bottom-left: Zoom/Pan Controls */}
      {showZoomPanControls && (
        <div className="absolute bottom-6 left-6 z-40 space-y-2">
          <button
            onClick={zoomPan.zoomIn}
            disabled={!zoomPan.canZoomIn()}
            className={cn(
              "p-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600",
              "rounded-md shadow-md hover:shadow-lg transition-shadow",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title="Zoom in (+)"
          >
            <span className="text-lg font-semibold">+</span>
          </button>

          <div className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-md text-center">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {Math.round(zoomPan.state.zoom * 100)}%
            </span>
          </div>

          <button
            onClick={zoomPan.zoomOut}
            disabled={!zoomPan.canZoomOut()}
            className={cn(
              "p-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600",
              "rounded-md shadow-md hover:shadow-lg transition-shadow",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title="Zoom out (-)"
          >
            <span className="text-lg font-semibold">−</span>
          </button>

          <button
            onClick={handleZoomReset}
            className={cn(
              "p-2 w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600",
              "rounded-md shadow-md hover:shadow-lg transition-shadow font-medium text-xs"
            )}
            title="Reset zoom and pan (Ctrl+0)"
          >
            Reset
          </button>
        </div>
      )}

      {/* Bottom-right: Rendering Stats (Debug) */}
      {showRenderingStats && (
        <div className="absolute bottom-6 right-6 z-40 text-xs font-mono bg-gray-900 dark:bg-black text-green-400 p-3 rounded-md border border-green-500 opacity-75 max-w-xs">
          <div>FPS: {stats.fps}</div>
          <div>Rendered: {stats.renderedEntities} / {stats.totalEntities}</div>
          <div>Culled: {stats.culledEntities}</div>
          <div>Edges: {stats.renderedEdges} / {stats.totalEdges}</div>
          <div>Zoom: {Math.round(zoomPan.state.zoom * 100)}%</div>
          <div className="mt-1 border-t border-green-500 pt-1">
            Pan: ({Math.round(zoomPan.state.pan.x)}, {Math.round(zoomPan.state.pan.y)})
          </div>
        </div>
      )}

      {/* Keyboard Help Overlay (optional debug) */}
      <div className="absolute top-4 right-20 z-40 hidden group-hover:block text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-900 p-2 rounded-md border border-gray-200 dark:border-slate-700">
        <div><strong>Keyboard Shortcuts:</strong></div>
        <div>+/- : Zoom in/out</div>
        <div>Esc : Clear focus</div>
        <div>Ctrl+0 : Reset view</div>
        <div>Right-click drag : Pan</div>
      </div>
    </div>
  );
};

export default DiagramEnhancements;
