/**
 * Zoom & Pan Service
 * Manages canvas transformations, zoom levels, and pan coordinates
 * Supports keyboard shortcuts, mouse wheel zoom, and touch gestures
 */

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export interface ZoomPanState {
  /** Current zoom level (1.0 = 100%, 0.5 = 50%, 2.0 = 200%) */
  zoom: number;
  /** Current pan coordinates */
  pan: { x: number; y: number };
  /** Min and max zoom levels */
  minZoom: number;
  maxZoom: number;
  /** Viewport dimensions */
  viewportWidth: number;
  viewportHeight: number;
  /** Whether currently panning with mouse */
  isPanning: boolean;
  /** Animation in progress */
  isAnimating: boolean;
}

export interface ZoomPanConfig {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number; // Amount to zoom per wheel event
  animationDuration?: number; // ms
  enableMouseWheel?: boolean;
  enableKeyboardShortcuts?: boolean;
  enableTouchGestures?: boolean;
  panDampening?: number; // 0-1, higher = more damping
}

export interface Transform {
  zoom: number;
  translateX: number;
  translateY: number;
}

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// ============================================================================
// Action Types
// ============================================================================

type ZoomPanAction =
  | { type: "SET_ZOOM"; payload: number }
  | { type: "SET_PAN"; payload: { x: number; y: number } }
  | { type: "SET_VIEWPORT"; payload: { width: number; height: number } }
  | { type: "SET_PANNING"; payload: boolean }
  | { type: "SET_ANIMATING"; payload: boolean }
  | {
      type: "ZOOM_TO_POINT";
      payload: {
        centerX: number;
        centerY: number;
        newZoom: number;
      };
    }
  | { type: "RESET" };

// ============================================================================
// Reducer
// ============================================================================

const DEFAULT_CONFIG: Required<ZoomPanConfig> = {
  minZoom: 0.1,
  maxZoom: 5.0,
  zoomStep: 0.2,
  animationDuration: 300,
  enableMouseWheel: true,
  enableKeyboardShortcuts: true,
  enableTouchGestures: true,
  panDampening: 0.95,
};

const createInitialState = (
  config: Required<ZoomPanConfig>
): ZoomPanState => ({
  zoom: 1.0,
  pan: { x: 0, y: 0 },
  minZoom: config.minZoom,
  maxZoom: config.maxZoom,
  viewportWidth: 0,
  viewportHeight: 0,
  isPanning: false,
  isAnimating: false,
});

function zoomPanReducer(
  state: ZoomPanState,
  action: ZoomPanAction
): ZoomPanState {
  switch (action.type) {
    case "SET_ZOOM": {
      const newZoom = Math.max(
        state.minZoom,
        Math.min(state.maxZoom, action.payload)
      );
      return { ...state, zoom: newZoom };
    }

    case "SET_PAN":
      return { ...state, pan: action.payload };

    case "SET_VIEWPORT":
      return {
        ...state,
        viewportWidth: action.payload.width,
        viewportHeight: action.payload.height,
      };

    case "SET_PANNING":
      return { ...state, isPanning: action.payload };

    case "SET_ANIMATING":
      return { ...state, isAnimating: action.payload };

    case "ZOOM_TO_POINT": {
      const { centerX, centerY, newZoom } = action.payload;
      const oldZoom = state.zoom;
      const zoomRatio = newZoom / oldZoom;

      const newPanX = centerX - (centerX - state.pan.x) * zoomRatio;
      const newPanY = centerY - (centerY - state.pan.y) * zoomRatio;

      return {
        ...state,
        zoom: Math.max(
          state.minZoom,
          Math.min(state.maxZoom, newZoom)
        ),
        pan: { x: newPanX, y: newPanY },
      };
    }

    case "RESET":
      return createInitialState(DEFAULT_CONFIG);

    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useZoomPan(
  containerRef: React.RefObject<HTMLDivElement>,
  config: ZoomPanConfig = {}
) {
  const mergedConfig: Required<ZoomPanConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [state, dispatch] = useReducer(
    zoomPanReducer,
    mergedConfig,
    createInitialState
  );

  const [transform, setTransform] = useState<Transform>({
    zoom: state.zoom,
    translateX: state.pan.x,
    translateY: state.pan.y,
  });

  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);
  const lastPinchZoomRef = useRef<number>(1);
  const animationFrameRef = useRef<number | null>(null);

  // ========================================================================
  // DOM Event Handlers
  // ========================================================================

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const handleResize = () => {
      dispatch({
        type: "SET_VIEWPORT",
        payload: {
          width: container.clientWidth,
          height: container.clientHeight,
        },
      });
    };

    handleResize(); // Set initial size
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ========================================================================
  // Mouse Wheel Zoom
  // ========================================================================

  const handleMouseWheel = useCallback(
    (event: WheelEvent) => {
      if (!mergedConfig.enableMouseWheel) return;

      event.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = event.clientX - rect.left;
      const centerY = event.clientY - rect.top;

      const direction = event.deltaY > 0 ? -1 : 1;
      const newZoom =
        state.zoom + direction * mergedConfig.zoomStep;

      dispatch({
        type: "ZOOM_TO_POINT",
        payload: { centerX, centerY, newZoom },
      });
    },
    [state.zoom, mergedConfig.enableMouseWheel, mergedConfig.zoomStep]
  );

  // ========================================================================
  // Mouse Pan
  // ========================================================================

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.button !== 2 && event.button !== 1) return; // Right or middle click
    event.preventDefault();

    panStartRef.current = { x: event.clientX, y: event.clientY };
    velocityRef.current = { x: 0, y: 0 };
    dispatch({ type: "SET_PANNING", payload: true });
  }, []);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!panStartRef.current || !state.isPanning) return;

      const deltaX = event.clientX - panStartRef.current.x;
      const deltaY = event.clientY - panStartRef.current.y;

      velocityRef.current = { x: deltaX, y: deltaY };

      const newPan = {
        x: state.pan.x + deltaX,
        y: state.pan.y + deltaY,
      };

      dispatch({ type: "SET_PAN", payload: newPan });
      panStartRef.current = { x: event.clientX, y: event.clientY };
    },
    [state.isPanning, state.pan]
  );

  const handleMouseUp = useCallback(() => {
    dispatch({ type: "SET_PANNING", payload: false });
    panStartRef.current = null;
  }, []);

  // ========================================================================
  // Touch Gestures
  // ========================================================================

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!mergedConfig.enableTouchGestures) return;

    if (event.touches.length === 1) {
      panStartRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
      dispatch({ type: "SET_PANNING", payload: true });
    } else if (event.touches.length === 2) {
      const p1 = event.touches[0];
      const p2 = event.touches[1];
      const distance = Math.hypot(
        p1.clientX - p2.clientX,
        p1.clientY - p2.clientY
      );
      touchDistanceRef.current = distance;
      lastPinchZoomRef.current = state.zoom;
    }
  }, [mergedConfig.enableTouchGestures, state.zoom]);

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!mergedConfig.enableTouchGestures) return;

      if (event.touches.length === 1 && panStartRef.current) {
        // Single touch pan
        const deltaX = event.touches[0].clientX - panStartRef.current.x;
        const deltaY = event.touches[0].clientY - panStartRef.current.y;

        const newPan = {
          x: state.pan.x + deltaX,
          y: state.pan.y + deltaY,
        };

        dispatch({ type: "SET_PAN", payload: newPan });
        panStartRef.current = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
      } else if (event.touches.length === 2) {
        // Two finger pinch zoom
        const p1 = event.touches[0];
        const p2 = event.touches[1];
        const newDistance = Math.hypot(
          p1.clientX - p2.clientX,
          p1.clientY - p2.clientY
        );

        if (touchDistanceRef.current) {
          const scale = newDistance / touchDistanceRef.current;
          const newZoom = lastPinchZoomRef.current * scale;

          dispatch({ type: "SET_ZOOM", payload: newZoom });
        }
      }
    },
    [mergedConfig.enableTouchGestures, state.pan]
  );

  const handleTouchEnd = useCallback(() => {
    dispatch({ type: "SET_PANNING", payload: false });
    panStartRef.current = null;
    touchDistanceRef.current = null;
  }, []);

  // ========================================================================
  // Keyboard Shortcuts
  // ========================================================================

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!mergedConfig.enableKeyboardShortcuts) return;

      switch (event.key) {
        case "+":
        case "=":
          event.preventDefault();
          dispatch({
            type: "SET_ZOOM",
            payload: state.zoom + mergedConfig.zoomStep,
          });
          break;

        case "-":
        case "_":
          event.preventDefault();
          dispatch({
            type: "SET_ZOOM",
            payload: state.zoom - mergedConfig.zoomStep,
          });
          break;

        case "0":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            dispatch({ type: "RESET" });
          }
          break;

        case "r":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            dispatch({ type: "RESET" });
          }
          break;
      }
    },
    [mergedConfig.enableKeyboardShortcuts, state.zoom, mergedConfig.zoomStep]
  );

  // ========================================================================
  // Effect: Update Transform
  // ========================================================================

  useEffect(() => {
    setTransform({
      zoom: state.zoom,
      translateX: state.pan.x,
      translateY: state.pan.y,
    });
  }, [state.zoom, state.pan]);

  // ========================================================================
  // Effect: Register Event Listeners
  // ========================================================================

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Wheel zoom
    if (mergedConfig.enableMouseWheel) {
      container.addEventListener("wheel", handleMouseWheel, { passive: false });
    }

    // Mouse pan
    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    // Touch gestures
    if (mergedConfig.enableTouchGestures) {
      container.addEventListener("touchstart", handleTouchStart, { passive: false });
      container.addEventListener("touchmove", handleTouchMove, { passive: false });
      container.addEventListener("touchend", handleTouchEnd);
    }

    // Keyboard shortcuts
    if (mergedConfig.enableKeyboardShortcuts) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (mergedConfig.enableMouseWheel) {
        container.removeEventListener("wheel", handleMouseWheel);
      }
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      if (mergedConfig.enableTouchGestures) {
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouchMove);
        container.removeEventListener("touchend", handleTouchEnd);
      }

      if (mergedConfig.enableKeyboardShortcuts) {
        window.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [
    mergedConfig.enableMouseWheel,
    mergedConfig.enableTouchGestures,
    mergedConfig.enableKeyboardShortcuts,
    handleMouseWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleKeyDown,
  ]);

  // ========================================================================
  // Public Methods
  // ========================================================================

  const zoomIn = useCallback(() => {
    dispatch({
      type: "SET_ZOOM",
      payload: state.zoom + mergedConfig.zoomStep,
    });
  }, [state.zoom, mergedConfig.zoomStep]);

  const zoomOut = useCallback(() => {
    dispatch({
      type: "SET_ZOOM",
      payload: state.zoom - mergedConfig.zoomStep,
    });
  }, [state.zoom, mergedConfig.zoomStep]);

  const zoomToFit = useCallback((contentBounds: ViewportBounds) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const contentWidth =
      contentBounds.maxX - contentBounds.minX;
    const contentHeight =
      contentBounds.maxY - contentBounds.minY;

    const zoomX = containerWidth / contentWidth;
    const zoomY = containerHeight / contentHeight;
    const newZoom = Math.min(zoomX, zoomY) * 0.9; // 10% padding

    const centerX = (contentBounds.minX + contentBounds.maxX) / 2;
    const centerY = (contentBounds.minY + contentBounds.maxY) / 2;

    const containerCenterX = containerWidth / 2;
    const containerCenterY = containerHeight / 2;

    dispatch({
      type: "ZOOM_TO_POINT",
      payload: {
        centerX: containerCenterX,
        centerY: containerCenterY,
        newZoom,
      },
    });

    dispatch({
      type: "SET_PAN",
      payload: {
        x: containerCenterX - centerX * newZoom,
        y: containerCenterY - centerY * newZoom,
      },
    });
  }, []);

  const zoomToPoint = useCallback((x: number, y: number, newZoom: number) => {
    dispatch({
      type: "ZOOM_TO_POINT",
      payload: { centerX: x, centerY: y, newZoom },
    });
  }, []);

  const pan = useCallback((deltaX: number, deltaY: number) => {
    dispatch({
      type: "SET_PAN",
      payload: { x: state.pan.x + deltaX, y: state.pan.y + deltaY },
    });
  }, [state.pan]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const getTransformStyle = useCallback((): React.CSSProperties => ({
    transform: `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`,
    transformOrigin: "0 0",
    transition: state.isAnimating
      ? `transform ${mergedConfig.animationDuration}ms ease-out`
      : "none",
  }), [state.pan, state.zoom, state.isAnimating, mergedConfig.animationDuration]);

  return {
    // State
    state,
    transform,

    // Zoom controls
    zoomIn,
    zoomOut,
    zoomToFit,
    zoomToPoint,
    setZoom: (zoom: number) => dispatch({ type: "SET_ZOOM", payload: zoom }),

    // Pan controls
    pan,
    setPan: (pan: { x: number; y: number }) =>
      dispatch({ type: "SET_PAN", payload: pan }),

    // Reset
    reset,

    // Utility
    getTransformStyle,
    canZoomIn: () => state.zoom < state.maxZoom,
    canZoomOut: () => state.zoom > state.minZoom,
  };
}

export type UseZoomPanReturn = ReturnType<typeof useZoomPan>;
