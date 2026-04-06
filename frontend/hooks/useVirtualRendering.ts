/**
 * Virtual Rendering Optimization Service
 * Manages efficient rendering of large diagrams with 1000+ tables
 * Uses viewport-based culling and lazy rendering
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export interface RenderableEntity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data?: Record<string, any>;
  visible?: boolean;
}

export interface RenderableEdge {
  id: string;
  source: string;
  target: string;
  visible?: boolean;
}

export interface ViewportDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VirtualRenderingStats {
  totalEntities: number;
  renderedEntities: number;
  culledEntities: number;
  totalEdges: number;
  renderedEdges: number;
  culledEdges: number;
  fps: number;
  lastUpdateTime: number;
}

export interface VirtualRenderingConfig {
  /** Padding around viewport to pre-load entities */
  cullingPadding?: number;
  /** Use OffscreenCanvas for rendering */
  useOffscreenCanvas?: boolean;
  /** Batch render updates */
  batchUpdates?: boolean;
  /** Update throttle in milliseconds */
  updateThrottle?: number;
  /** Enable debug visualization */
  enableDebug?: boolean;
  /** Maximum FPS to target */
  targetFPS?: number;
}

// ============================================================================
// Culling Algorithm
// ============================================================================

class ViewportCuller {
  private cullingPadding: number;

  constructor(cullingPadding: number = 500) {
    this.cullingPadding = cullingPadding;
  }

  /**
   * Determines if entity is within viewport bounds
   */
  isEntityVisible(
    entity: RenderableEntity,
    viewport: ViewportDimensions
  ): boolean {
    return (
      entity.x + entity.width >
      viewport.x - this.cullingPadding &&
      entity.x < viewport.x + viewport.width + this.cullingPadding &&
      entity.y + entity.height >
      viewport.y - this.cullingPadding &&
      entity.y < viewport.y + viewport.height + this.cullingPadding
    );
  }

  /**
   * Determines if edge connects visible entities
   */
  isEdgeVisible(
    edge: RenderableEdge,
    visibleEntities: Map<string, RenderableEntity>,
    allEntities: Map<string, RenderableEntity>
  ): boolean {
    const source = allEntities.get(edge.source);
    const target = allEntities.get(edge.target);

    if (!source || !target) return false;

    // Edge is visible if both endpoints are visible
    return (
      visibleEntities.has(edge.source) &&
      visibleEntities.has(edge.target)
    );
  }

  /**
   * Culls entities and edges based on viewport
   */
  cullItems(
    entities: RenderableEntity[],
    edges: RenderableEdge[],
    viewport: ViewportDimensions
  ): {
    visibleEntities: Map<string, RenderableEntity>;
    visibleEdges: RenderableEdge[];
    stats: Pick<VirtualRenderingStats, "culledEntities" | "culledEdges">;
  } {
    const allEntitiesMap = new Map(entities.map((e) => [e.id, e]));
    const visibleEntities = new Map<string, RenderableEntity>();

    // Cull entities
    for (const entity of entities) {
      if (this.isEntityVisible(entity, viewport)) {
        visibleEntities.set(entity.id, entity);
      }
    }

    // Cull edges
    const visibleEdges = edges.filter((edge) =>
      this.isEdgeVisible(edge, visibleEntities, allEntitiesMap)
    );

    return {
      visibleEntities,
      visibleEdges,
      stats: {
        culledEntities: entities.length - visibleEntities.size,
        culledEdges: edges.length - visibleEdges.length,
      },
    };
  }
}

// ============================================================================
// Rendering Optimizer
// ============================================================================

class RenderingOptimizer {
  private renderQueue: Set<string> = new Set();
  private lastRenderTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 60;
  private throttleTime: number;

  constructor(throttleTime: number = 16) {
    this.throttleTime = throttleTime;
  }

  /**
   * Queue entity for rendering
   */
  queueEntity(id: string): void {
    this.renderQueue.add(id);
  }

  /**
   * Queue multiple entities for rendering
   */
  queueEntities(ids: string[]): void {
    ids.forEach((id) => this.renderQueue.add(id));
  }

  /**
   * Get pending render queue
   */
  getPendingQueue(): string[] {
    return Array.from(this.renderQueue);
  }

  /**
   * Clear render queue
   */
  clearQueue(): void {
    this.renderQueue.clear();
  }

  /**
   * Calculate current FPS
   */
  updateFPS(): number {
    const now = performance.now();
    const deltaTime = now - this.lastRenderTime;

    if (deltaTime > 1000) {
      this.fps = Math.round(this.frameCount);
      this.frameCount = 0;
      this.lastRenderTime = now;
    } else {
      this.frameCount++;
    }

    return this.fps;
  }

  /**
   * Should throttle updates
   */
  shouldThrottle(): boolean {
    return performance.now() - this.lastRenderTime < this.throttleTime;
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.fps;
  }
}

// ============================================================================
// Hook
// ============================================================================

const DEFAULT_CONFIG: Required<VirtualRenderingConfig> = {
  cullingPadding: 500,
  useOffscreenCanvas: false,
  batchUpdates: true,
  updateThrottle: 16, // ~60 FPS
  enableDebug: false,
  targetFPS: 60,
};

export function useVirtualRendering(
  config: VirtualRenderingConfig = {}
) {
  const mergedConfig: Required<VirtualRenderingConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const cullerRef = useRef(new ViewportCuller(mergedConfig.cullingPadding));
  const optimizerRef = useRef(new RenderingOptimizer(mergedConfig.updateThrottle));

  const [entities, setEntities] = useState<RenderableEntity[]>([]);
  const [edges, setEdges] = useState<RenderableEdge[]>([]);
  const [viewport, setViewport] = useState<ViewportDimensions>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const [visibleEntities, setVisibleEntities] = useState<Map<string, RenderableEntity>>(
    new Map()
  );
  const [visibleEdges, setVisibleEdges] = useState<RenderableEdge[]>([]);
  const [stats, setStats] = useState<VirtualRenderingStats>({
    totalEntities: 0,
    renderedEntities: 0,
    culledEntities: 0,
    totalEdges: 0,
    renderedEdges: 0,
    culledEdges: 0,
    fps: 60,
    lastUpdateTime: performance.now(),
  });

  const updateLoopRef = useRef<number | null>(null);

  // ========================================================================
  // Culling Update
  // ========================================================================

  const updateVisibleItems = useCallback((
    ents: RenderableEntity[],
    edgs: RenderableEdge[],
    vp: ViewportDimensions
  ) => {
    if (optimizerRef.current.shouldThrottle()) {
      return;
    }

    const { visibleEntities: visible, visibleEdges: visibleEdgeList, stats: cullStats } =
      cullerRef.current.cullItems(ents, edgs, vp);

    setVisibleEntities(visible);
    setVisibleEdges(visibleEdgeList);

    const fps = optimizerRef.current.updateFPS();

    setStats({
      totalEntities: ents.length,
      renderedEntities: visible.size,
      culledEntities: cullStats.culledEntities,
      totalEdges: edgs.length,
      renderedEdges: visibleEdgeList.length,
      culledEdges: cullStats.culledEdges,
      fps,
      lastUpdateTime: performance.now(),
    });
  }, []);

  // ========================================================================
  // Update Methods
  // ========================================================================

  const setRenderableEntities = useCallback((newEntities: RenderableEntity[]) => {
    setEntities(newEntities);
    updateVisibleItems(newEntities, edges, viewport);
  }, [edges, viewport, updateVisibleItems]);

  const setRenderableEdges = useCallback((newEdges: RenderableEdge[]) => {
    setEdges(newEdges);
    updateVisibleItems(entities, newEdges, viewport);
  }, [entities, viewport, updateVisibleItems]);

  const updateViewport = useCallback((newViewport: ViewportDimensions) => {
    setViewport(newViewport);
    updateVisibleItems(entities, edges, newViewport);
  }, [entities, edges, updateVisibleItems]);

  // ========================================================================
  // Batch Updates
  // ========================================================================

  const batchUpdate = useCallback(
    (updates: {
      entities?: RenderableEntity[];
      edges?: RenderableEdge[];
      viewport?: ViewportDimensions;
    }) => {
      const newEntities = updates.entities ?? entities;
      const newEdges = updates.edges ?? edges;
      const newViewport = updates.viewport ?? viewport;

      setEntities(newEntities);
      setEdges(newEdges);
      setViewport(newViewport);

      updateVisibleItems(newEntities, newEdges, newViewport);
    },
    [entities, edges, viewport, updateVisibleItems]
  );

  // ========================================================================
  // Query Methods
  // ========================================================================

  const getVisibleEntity = useCallback(
    (id: string): RenderableEntity | undefined => visibleEntities.get(id),
    [visibleEntities]
  );

  const getVisibleEntities = useCallback(
    (): RenderableEntity[] => Array.from(visibleEntities.values()),
    [visibleEntities]
  );

  const getVisibleEdges = useCallback((): RenderableEdge[] => visibleEdges, [visibleEdges]);

  const isEntityVisible = useCallback(
    (id: string): boolean => visibleEntities.has(id),
    [visibleEntities]
  );

  const getStatistics = useCallback((): VirtualRenderingStats => stats, [stats]);

  /**
   * Zoom to fit all content in viewport
   */
  const zoomToFitContent = useCallback((): ViewportDimensions => {
    if (entities.length === 0) {
      return viewport;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    entities.forEach((entity) => {
      minX = Math.min(minX, entity.x);
      maxX = Math.max(maxX, entity.x + entity.width);
      minY = Math.min(minY, entity.y);
      maxY = Math.max(maxY, entity.y + entity.height);
    });

    const newViewport: ViewportDimensions = {
      x: minX - 50,
      y: minY - 50,
      width: viewport.width,
      height: viewport.height,
    };

    updateViewport(newViewport);
    return newViewport;
  }, [entities, viewport, updateViewport]);

  /**
   * Focus on entity by centering viewport
   */
  const focusOnEntity = useCallback(
    (entityId: string): void => {
      const entity = entities.find((e) => e.id === entityId);
      if (!entity) return;

      const newViewport: ViewportDimensions = {
        x: entity.x - viewport.width / 2 + entity.width / 2,
        y: entity.y - viewport.height / 2 + entity.height / 2,
        width: viewport.width,
        height: viewport.height,
      };

      updateViewport(newViewport);
    },
    [entities, viewport, updateViewport]
  );

  /**
   * Get entities in region
   */
  const getEntitiesInRegion = useCallback(
    (x: number, y: number, width: number, height: number): RenderableEntity[] => {
      return entities.filter(
        (entity) =>
          entity.x < x + width &&
          entity.x + entity.width > x &&
          entity.y < y + height &&
          entity.y + entity.height > y
      );
    },
    [entities]
  );

  return {
    // State
    entities,
    edges,
    viewport,
    visibleEntities: Array.from(visibleEntities.values()),
    visibleEdges,
    stats,

    // Update methods
    setRenderableEntities,
    setRenderableEdges,
    updateViewport,
    batchUpdate,

    // Query methods
    getVisibleEntity,
    getVisibleEntities,
    getVisibleEdges,
    isEntityVisible,
    getStatistics,
    getEntitiesInRegion,

    // Navigation
    zoomToFitContent,
    focusOnEntity,
  };
}

export type UseVirtualRenderingReturn = ReturnType<typeof useVirtualRendering>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate viewport bounds from canvas dimensions
 */
export function calculateViewportBounds(
  canvas: HTMLCanvasElement,
  zoom: number,
  panX: number,
  panY: number
): ViewportDimensions {
  return {
    x: -panX / zoom,
    y: -panY / zoom,
    width: canvas.width / zoom,
    height: canvas.height / zoom,
  };
}

/**
 * Convert world coordinates to canvas coordinates
 */
export function worldToCanvas(
  worldX: number,
  worldY: number,
  zoom: number,
  panX: number,
  panY: number
): [number, number] {
  return [
    worldX * zoom + panX,
    worldY * zoom + panY,
  ];
}

/**
 * Convert canvas coordinates to world coordinates
 */
export function canvasToWorld(
  canvasX: number,
  canvasY: number,
  zoom: number,
  panX: number,
  panY: number
): [number, number] {
  return [
    (canvasX - panX) / zoom,
    (canvasY - panY) / zoom,
  ];
}
