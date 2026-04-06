/**
 * Model Versioning Types
 * Comprehensive TypeScript interfaces for Git-like versioning system
 * Supports snapshots, branching, tagging, and diffing
 */

// ============================================================================
// Enums
// ============================================================================

export enum VersionChangeType {
  TableAdded = "TableAdded",
  TableRemoved = "TableRemoved",
  TableModified = "TableModified",
  ColumnAdded = "ColumnAdded",
  ColumnRemoved = "ColumnRemoved",
  ColumnModified = "ColumnModified",
  RelationshipAdded = "RelationshipAdded",
  RelationshipRemoved = "RelationshipRemoved",
  RelationshipModified = "RelationshipModified",
  IndexAdded = "IndexAdded",
  IndexRemoved = "IndexRemoved",
  EnumAdded = "EnumAdded",
  EnumRemoved = "EnumRemoved",
  EnumModified = "EnumModified",
}

export enum ChangeSeverity {
  Low = "low",
  Medium = "medium",
  High = "high",
  Critical = "critical",
}

export enum MergeStrategy {
  FastForward = "fast_forward",
  Recursive = "recursive",
  OursBranch = "ours",
  TheirsBranch = "theirs",
}

export enum ConflictResolution {
  Automatic = "automatic",
  ManualReview = "manual_review",
  Accept = "accept",
  Reject = "reject",
}

// ============================================================================
// Request Types
// ============================================================================

export interface CreateVersionRequest {
  modelId: string;
  dbmlContent: string;
  userId: string;
  commitMessage: string;
  branchName?: string; // Default: "main"
}

export interface RollbackRequest {
  modelId: string;
  versionId: string;
  userId: string;
  reason: string;
}

export interface CompareVersionsRequest {
  modelId: string;
  versionId1: string;
  versionId2: string;
}

export interface CreateBranchRequest {
  modelId: string;
  branchName: string;
  fromVersionId?: string; // If omitted, creates from latest
  userId: string;
}

export interface MergeBranchRequest {
  modelId: string;
  sourceBranch: string;
  targetBranch: string;
  userId: string;
  strategy?: MergeStrategy;
}

export interface TagVersionRequest {
  modelId: string;
  versionId: string;
  tagName: string;
  description?: string;
}

export interface GetVersionHistoryRequest {
  modelId: string;
  branchName?: string;
  pageSize?: number;
  pageNumber?: number;
  startDate?: Date;
  endDate?: Date;
}

// ============================================================================
// Response Types
// ============================================================================

export interface ModelVersion {
  versionId: string;
  modelId: string;
  dbmlContent: string;
  createdBy: string;
  createdAt: Date;
  commitMessage: string;
  branchName: string;
  tag?: string;
  parentVersionId?: string;
  isMergeCommit: boolean;
  checksum: string;
  statistics: VersionStatistics;
}

export interface VersionStatistics {
  tableCount: number;
  relationshipCount: number;
  enumCount: number;
  indexCount: number;
}

export interface RollbackResult {
  success: boolean;
  previousVersionId: string;
  newVersionId: string;
  rolledBackAt: Date;
  content: string;
  message: string;
}

export interface VersionComparison {
  modelId: string;
  version1Id: string;
  version2Id: string;
  version1CreatedAt: Date;
  version2CreatedAt: Date;
  comparedAt: Date;
  changes: VersionChange[];
  tablesAdded: number;
  tablesRemoved: number;
  tablesModified: number;
  relationshipsAdded: number;
  relationshipsRemoved: number;
  totalChanges: number;
}

export interface VersionChange {
  changeId: string;
  changeType: VersionChangeType;
  description: string;
  entityName?: string;
  oldValue?: string;
  newValue?: string;
  severity: ChangeSeverity;
}

export interface VersionMetadata {
  versionId: string;
  modelId: string;
  createdAt: Date;
  createdBy: string;
  commitMessage: string;
  branchName: string;
  tag?: string;
  checksum: string;
  parentVersionId?: string;
  isMergeCommit: boolean;
  statistics: VersionStatistics;
  contentSize: number;
}

export interface VersionTag {
  tagId: string;
  modelId: string;
  versionId: string;
  tagName: string;
  description: string;
  createdAt: Date;
}

export interface VersionStatisticsData {
  modelId: string;
  totalVersions: number;
  totalBranches: number;
  totalTags: number;
  totalContributors: number;
  calculatedAt: Date;
  branches: BranchStatistics[];
  topContributors: ContributorStatistics[];
}

export interface BranchStatistics {
  branchName: string;
  versionCount: number;
  latestVersionId?: string;
  latestVersionAt: Date;
}

export interface ContributorStatistics {
  userId: string;
  versionCount: number;
  firstContributionAt: Date;
  lastContributionAt: Date;
}

export interface BranchInfo {
  branchId: string;
  modelId: string;
  branchName: string;
  createdAt: Date;
  createdBy: string;
  latestVersionId: string;
  versionCount: number;
  description?: string;
  isMainBranch: boolean;
  isProtected: boolean;
}

export interface MergeResult {
  success: boolean;
  mergeVersionId?: string;
  conflicts?: MergeConflict[];
  message: string;
  mergedAt: Date;
}

export interface MergeConflict {
  conflictId: string;
  entityType: string;
  entityName: string;
  sourceChange: VersionChange;
  targetChange: VersionChange;
  suggestedResolution?: string;
}

// ============================================================================
// State Types (for React)
// ============================================================================

export interface VersioningState {
  modelId: string;
  currentVersion?: ModelVersion;
  versionHistory: ModelVersion[];
  branches: BranchInfo[];
  currentBranch: string;
  tags: VersionTag[];
  selectedVersion?: ModelVersion;
  selectedVersionToCompare?: ModelVersion;
  loading: boolean;
  error?: string;
  pendingChanges: boolean;
  lastSync: Date;
}

export interface VersionHistoryPanelState {
  selectedVersion?: string;
  expandedSections: Record<string, boolean>; // e.g., { "2025-01": true }
  filterBranch?: string;
  filterTag?: string;
  searchQuery?: string;
  sortBy: "date" | "author" | "message";
  sortOrder: "asc" | "desc";
}

export interface DiffViewerState {
  version1?: ModelVersion;
  version2?: ModelVersion;
  comparison?: VersionComparison;
  viewMode: "split" | "unified" | "side-by-side";
  hideUnchanged: boolean;
  highlightedChangeId?: string;
  loading: boolean;
}

export interface BranchManagementState {
  selectedBranch?: string;
  branches: BranchInfo[];
  newBranchName?: string;
  mergingFrom?: string;
  mergingTo?: string;
  loading: boolean;
  error?: string;
}

// ============================================================================
// Action Types
// ============================================================================

export interface SetCurrentVersionAction {
  type: "SET_CURRENT_VERSION";
  payload: ModelVersion;
}

export interface SetVersionHistoryAction {
  type: "SET_VERSION_HISTORY";
  payload: ModelVersion[];
}

export interface AddVersionAction {
  type: "ADD_VERSION";
  payload: ModelVersion;
}

export interface SetSelectedVersionAction {
  type: "SET_SELECTED_VERSION";
  payload: ModelVersion | undefined;
}

export interface SetBranchesAction {
  type: "SET_BRANCHES";
  payload: BranchInfo[];
}

export interface SetCurrentBranchAction {
  type: "SET_CURRENT_BRANCH";
  payload: string;
}

export interface SetTagsAction {
  type: "SET_TAGS";
  payload: VersionTag[];
}

export interface SetLoadingAction {
  type: "SET_LOADING";
  payload: boolean;
}

export interface SetErrorAction {
  type: "SET_ERROR";
  payload: string | undefined;
}

export interface SetPendingChangesAction {
  type: "SET_PENDING_CHANGES";
  payload: boolean;
}

export type VersioningAction =
  | SetCurrentVersionAction
  | SetVersionHistoryAction
  | AddVersionAction
  | SetSelectedVersionAction
  | SetBranchesAction
  | SetCurrentBranchAction
  | SetTagsAction
  | SetLoadingAction
  | SetErrorAction
  | SetPendingChangesAction;

// ============================================================================
// Configuration Types
// ============================================================================

export interface VersioningConfig {
  /** Enable auto-save versioning */
  autoSaveEnabled?: boolean;
  /** Auto-save interval in milliseconds */
  autoSaveInterval?: number;
  /** Maximum versions to keep (0 = unlimited) */
  maxVersionsCount?: number;
  /** Enable branch protection on main */
  protectMainBranch?: boolean;
  /** Require commit message */
  requireCommitMessage?: boolean;
  /** Minimum commit message length */
  minCommitMessageLength?: number;
  /** Enable automatic merge attempts */
  autoMergeEnabled?: boolean;
}

export const DEFAULT_VERSIONING_CONFIG: VersioningConfig = {
  autoSaveEnabled: false,
  autoSaveInterval: 30000, // 30 seconds
  maxVersionsCount: 1000,
  protectMainBranch: true,
  requireCommitMessage: true,
  minCommitMessageLength: 5,
  autoMergeEnabled: false,
};

// ============================================================================
// Event Types
// ============================================================================

export interface VersioningEvent {
  type:
    | "version_created"
    | "version_deleted"
    | "branch_created"
    | "branch_deleted"
    | "branch_merged"
    | "tag_created"
    | "rollback_performed"
    | "conflict_detected";
  modelId: string;
  data: Record<string, any>;
  timestamp: Date;
  userId: string;
}

export interface VersioningEventListener {
  (event: VersioningEvent): void;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface CreateVersionResponse {
  success: boolean;
  data?: ModelVersion;
  error?: string;
  statusCode: number;
}

export interface RollbackResponse {
  success: boolean;
  data?: RollbackResult;
  error?: string;
  statusCode: number;
}

export interface CompareVersionsResponse {
  success: boolean;
  data?: VersionComparison;
  error?: string;
  statusCode: number;
}

export interface GetVersionHistoryResponse {
  success: boolean;
  data?: {
    versions: ModelVersion[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
  };
  error?: string;
  statusCode: number;
}

export interface GetBranchesResponse {
  success: boolean;
  data?: BranchInfo[];
  error?: string;
  statusCode: number;
}

export interface MergeBranchResponse {
  success: boolean;
  data?: MergeResult;
  error?: string;
  statusCode: number;
}

export interface GetVersionStatisticsResponse {
  success: boolean;
  data?: VersionStatisticsData;
  error?: string;
  statusCode: number;
}

// ============================================================================
// Context Types
// ============================================================================

export interface VersioningContextType {
  state: VersioningState;
  createVersion: (request: CreateVersionRequest) => Promise<CreateVersionResponse>;
  rollbackToVersion: (request: RollbackRequest) => Promise<RollbackResponse>;
  compareVersions: (request: CompareVersionsRequest) => Promise<CompareVersionsResponse>;
  getVersionHistory: (
    request: GetVersionHistoryRequest
  ) => Promise<GetVersionHistoryResponse>;
  createBranch: (request: CreateBranchRequest) => Promise<void>;
  mergeBranch: (request: MergeBranchRequest) => Promise<MergeBranchResponse>;
  switchBranch: (branchName: string) => Promise<void>;
  tagVersion: (request: TagVersionRequest) => Promise<void>;
  addEventListener: (listener: VersioningEventListener) => () => void;
}

// ============================================================================
// Utility Types
// ============================================================================

export type VersioningResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface VersionTimeline {
  versionId: string;
  createdAt: Date;
  author: string;
  message: string;
  branch: string;
  tag?: string;
  statistics: VersionStatistics;
}

export interface VersionDiff {
  oldContent: string;
  newContent: string;
  htmlDiff?: string; // HTML formatted diff
  changes: VersionChange[];
}

export interface CommitInfo {
  commitId: string;
  author: string;
  authorEmail?: string;
  authorDate: Date;
  committerDate: Date;
  message: string;
  parentCommitId?: string;
  treeId: string;
}

export interface BranchMergeHistory {
  sourceVersion: ModelVersion;
  targetVersion: ModelVersion;
  mergeVersion: ModelVersion;
  mergedAt: Date;
  mergedBy: string;
  strategy: MergeStrategy;
  conflictsResolved: number;
}
