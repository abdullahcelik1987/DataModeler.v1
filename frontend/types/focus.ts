/**
 * Focus Mode Types
 * Comprehensive TypeScript interfaces for diagram focus mode functionality
 * Supports entity highlighting, relationship traversal, and visualization control
 */

// ============================================================================
// Enums
// ============================================================================

export enum HighlightIntensity {
  Light = "light",
  Medium = "medium",
  Strong = "strong"
}

export enum RelationshipType {
  OneToMany = "one_to_many",
  OneToOne = "one_to_one",
  ManyToMany = "many_to_many"
}

export enum DependencyConnectionType {
  Incoming = "incoming",
  Outgoing = "outgoing",
  Bidirectional = "bidirectional"
}

export enum CycleSeverity {
  Low = "low",
  Medium = "medium",
  High = "high",
  Critical = "critical"
}

export enum ComplexityLevel {
  Low = "low",
  Medium = "medium",
  High = "high",
  VeryHigh = "very_high"
}

// ============================================================================
// Request Types
// ============================================================================

export interface CalculateFocusRequest {
  modelId: string;
  focusTableName: string;
  maxDepth: number; // Default: 2
}

export interface FindPathRequest {
  modelId: string;
  sourceTable: string;
  targetTable: string;
}

export interface FindAllPathsRequest {
  modelId: string;
  sourceTable: string;
  targetTable: string;
  maxDepth: number; // Default: 5
}

export interface GetConnectionChainsRequest {
  modelId: string;
  tableNames: string; // Comma-separated
}

// ============================================================================
// Focus Mode Result Types
// ============================================================================

export interface FocusModeResultData {
  modelId: string;
  focusTableName: string;
  maxDepth: number;
  calculatedAt: Date;
  highlightedTables: Set<string>; // The focused table
  directlyConnectedTables: Set<string>; // Layer 1 connections
  allConnectedTables: Set<string>; // Layer 2+ connections
  highlightedRelationships: HighlightedRelationship[];
  dependencyLayers: Map<number, string[]>; // Layer mapping
  totalTablesInFocus: number;
  totalRelationshipsInFocus: number;
}

// Generic result wrapper for focus mode operations
export interface FocusModeResult<T = FocusModeResultData> {
  success?: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface HighlightedRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  relationType: string; // "one_to_many", "one_to_one", etc.
  intensity: HighlightIntensity;
  isDirectConnection: boolean;
  depth: number;
  highlightColor: string; // Hex color based on intensity
  opacity: number; // 0.0 - 1.0
}

export interface FocusMetrics {
  focusTableName: string;
  directlyConnectedCount: number;
  totalConnectedCount: number;
  incomingRelationships: number;
  outgoingRelationships: number;
  totalRelationships: number;
  maxDepth: number;
  complexityScore: number;
  complexityLevel: ComplexityLevel;
}

// ============================================================================
// Relationship Path Types
// ============================================================================

export interface RelationshipPath {
  sourceTable: string;
  targetTable: string;
  pathFound: boolean;
  distance: number; // Number of hops (-1 if not found)
  steps: PathStep[];
  isCircular: boolean;
  pathVisualization: string; // Human-readable format
}

export interface PathStep {
  tableName: string;
  level: number; // Distance from source
}

export interface TableConnectionChain {
  tableName: string;
  connectedTables: TableConnection[];
  chainStrength: number; // Total connections
  foundAt: Date;
}

export interface TableConnection {
  connectedTableName: string;
  connectionType: DependencyConnectionType;
  cardinality: RelationshipType;
  fromColumn: string;
  toColumn: string;
}

// ============================================================================
// Circular Dependency Types
// ============================================================================

export interface CircularDependencyDetectionResult {
  hasCircularDependencies: boolean;
  circularPaths: CircularPath[];
  affectedTables: Set<string>;
  totalCyclicDependencies: number;
  analysisTime: Date;
}

export interface CircularPath {
  tables: string[]; // Includes start table at end to complete cycle
  cycleLength: number;
  severity: CycleSeverity;
  tablesInCycle: string; // Human-readable format
}

// ============================================================================
// Graph Metrics Types
// ============================================================================

export interface RelationshipGraphMetrics {
  totalTables: number;
  totalRelationships: number;
  averageConnectionsPerTable: number;
  hasCircularDependencies: boolean;
  circularDependencyCount: number;
  affectedTablesByCircularDeps: number;
  isolatedTablesCount: number;
  mostConnectedTable?: string;
  maxConnectionsPerTable: number;
  graphDensity: number; // 0.0 to 1.0
  analyzedAt: Date;
}

// ============================================================================
// Focus Mode State Types (for React)
// ============================================================================

export interface FocusModeState {
  isActive: boolean;
  focusTableName?: string;
  maxDepth: number;
  focusResult?: FocusModeResultData;
  highlightedTables: Set<string>;
  highlightedRelationships: HighlightedRelationship[];
  metrics?: FocusMetrics;
  loading: boolean;
  error?: string;
}

export interface FocusAnimationConfig {
  duration: number; // milliseconds
  easing: "ease" | "ease-in" | "ease-out" | "linear";
  glowIntensity: number; // 1.0 to 3.0
  highlightColor: string;
  opacity: number;
}

// ============================================================================
// Visualization Types
// ============================================================================

export interface HighlightedEntity {
  tableName: string;
  highlightLevel: number; // 0 for focused, 1 for direct, 2+ for indirect
  intensity: HighlightIntensity;
  shouldRender: boolean;
  animationConfig?: FocusAnimationConfig;
  glowColor?: string;
  scale?: number; // For zoom effect
}

export interface HighlightedEdge {
  id: string;
  source: string;
  target: string;
  intensity: HighlightIntensity;
  color: string;
  width: number; // Based on intensity
  opacity: number;
  isAnimated: boolean;
}

// ============================================================================
// Focus Mode Actions Types (for reducer)
// ============================================================================

export interface SetFocusTableAction {
  type: "SET_FOCUS_TABLE";
  payload: {
    tableId: string;
    maxDepth: number;
  };
}

export interface SetFocusResultAction {
  type: "SET_FOCUS_RESULT";
  payload: FocusModeResultData;
}

export interface ClearFocusAction {
  type: "CLEAR_FOCUS";
}

export interface SetFocusLoadingAction {
  type: "SET_LOADING";
  payload: boolean;
}

export interface SetFocusErrorAction {
  type: "SET_ERROR";
  payload: string | undefined;
}

export interface ToggleFocusDepthAction {
  type: "TOGGLE_DEPTH";
  payload: number;
}

export type FocusModeAction =
  | SetFocusTableAction
  | SetFocusResultAction
  | ClearFocusAction
  | SetFocusLoadingAction
  | SetFocusErrorAction
  | ToggleFocusDepthAction;

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CalculateFocusResponse {
  success: boolean;
  data?: FocusModeResultData;
  error?: string;
  statusCode: number;
}

export interface FindPathResponse {
  success: boolean;
  data?: RelationshipPath;
  error?: string;
  statusCode: number;
}

export interface FindAllPathsResponse {
  success: boolean;
  data?: RelationshipPath[];
  error?: string;
  statusCode: number;
}

export interface GetConnectionChainsResponse {
  success: boolean;
  data?: TableConnectionChain[];
  error?: string;
  statusCode: number;
}

export interface DetectCircularDependenciesResponse {
  success: boolean;
  data?: CircularDependencyDetectionResult;
  error?: string;
  statusCode: number;
}

export interface GetGraphMetricsResponse {
  success: boolean;
  data?: RelationshipGraphMetrics;
  error?: string;
  statusCode: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface FocusModeConfig {
  /** Maximum depth for relationship traversal */
  maxDepth: number;
  /** Animation duration in milliseconds */
  animationDuration: number;
  /** Enable glow effect on focused entity */
  enableGlow: boolean;
  /** Glow color (hex) */
  glowColor: string;
  /** Colors for different highlight intensities */
  colorScheme: {
    strong: string;
    medium: string;
    light: string;
  };
  /** Opacity levels for different intensities */
  opacityScheme: {
    strong: number;
    medium: number;
    light: number;
  };
  /** Enable circular dependency highlighting */
  highlightCircularDependencies: boolean;
  /** Keyboard shortcuts configuration */
  keyboardShortcuts: {
    toggleFocusMode: string;
    clearFocus: string;
    increaseFocusDepth: string;
    decreaseFocusDepth: string;
  };
}

export const DEFAULT_FOCUS_MODE_CONFIG: FocusModeConfig = {
  maxDepth: 2,
  animationDuration: 300,
  enableGlow: true,
  glowColor: "#FF6B6B",
  colorScheme: {
    strong: "#FF6B6B",
    medium: "#FFA94D",
    light: "#FFD93D"
  },
  opacityScheme: {
    strong: 1.0,
    medium: 0.7,
    light: 0.4
  },
  highlightCircularDependencies: true,
  keyboardShortcuts: {
    toggleFocusMode: "F",
    clearFocus: "Escape",
    increaseFocusDepth: "+",
    decreaseFocusDepth: "-"
  }
};

// ============================================================================
// Event Types
// ============================================================================

export interface FocusModeChangeEvent {
  type: "focus_changed" | "focus_cleared" | "depth_changed";
  focusTableName?: string;
  previousFocusTableName?: string;
  maxDepth?: number;
  timestamp: Date;
}

export interface FocusModeEventListener {
  (event: FocusModeChangeEvent): void;
}

// ============================================================================
// Error Types
// ============================================================================

export interface FocusModeError extends Error {
  code: "INVALID_TABLE" | "PATH_NOT_FOUND" | "CIRCULAR_DEPENDENCY" | "CALCULATION_FAILED";
  details?: Record<string, unknown>;
}

// ============================================================================
// Utility Types
// ============================================================================

// Removed duplicate - using above FocusModeResult interface

export interface TableHighlightInfo {
  tableName: string;
  depth: number;
  incomingRelationships: number;
  outgoingRelationships: number;
  isDirectlyConnected: boolean;
  isFocused: boolean;
}
