// ============ CONNECTION & CREDENTIALS ============

/**
 * DevOps connection credentials
 */
export interface DevOpsCredentials {
  organizationUrl: string;
  personalAccessToken: string;
}

/**
 * Result of testing DevOps connection
 */
export interface AzureDevOpsConnectionTest {
  isSuccess: boolean;
  message: string;
  projectCount?: number;
  timestamp: Date;
}

// ============ REPOSITORIES ============

/**
 * Azure DevOps repository information
 */
export interface AzureDevOpsRepository {
  id: string;
  name: string;
  projectId: string;
  url: string;
  defaultBranch: string;
  isDisabled: boolean;
  sshUrl?: string;
  httpUrl?: string;
}

/**
 * Model-to-repository link
 */
export interface ModelRepositoryLink {
  modelId: string;
  repositoryId: string;
  repositoryName: string;
  branchName: string;
  filePath: string;
  autoSync: boolean;
  linkedAt: Date;
  lastSyncAt?: Date;
  lastSyncStatus?: 'success' | 'failed' | 'pending';
}

/**
 * Request to link model to repository
 */
export interface LinkModelToRepositoryRequest {
  modelId: string;
  repositoryId: string;
  branchName?: string;
  filePath?: string;
  autoSync?: boolean;
}

// ============ COMMITS ============

/**
 * Commit information from Azure DevOps
 */
export interface AzureDevOpsCommit {
  commitId: string;
  author: string;
  authorEmail: string;
  comment: string;
  authorDate: Date;
  url: string;
}

/**
 * Detailed commit information
 */
export interface AzureDevOpsCommitDetail {
  commitId: string;
  author: string;
  authorEmail: string;
  comment: string;
  authorDate: Date;
  committerDate: Date;
  parents: string[];
  url: string;
  changes: AzureDevOpsChange[];
}

/**
 * Change in a commit
 */
export interface AzureDevOpsChange {
  objectId: string;
  path: string;
  changeType: string;
}

/**
 * Request to sync model to DevOps
 */
export interface SyncModelToDevOpsRequest {
  dbmlContent: string;
  commitMessage?: string;
  createPullRequest?: boolean;
  pullRequestTitle?: string;
  pullRequestDescription?: string;
}

/**
 * Result of syncing to DevOps
 */
export interface SyncModelToDevOpsResult {
  success: boolean;
  commitId: string;
  pullRequestId?: number;
  message: string;
  syncedAt: Date;
  devOpsUrl: string;
}

/**
 * Request to pull model from DevOps
 */
export interface PullModelFromDevOpsRequest {
  commitId?: string;
}

/**
 * Result of pulling from DevOps
 */
export interface PullModelFromDevOpsResult {
  success: boolean;
  dbmlContent: string;
  commitId: string;
  author: string;
  commitDate: Date;
  message: string;
}

// ============ PULL REQUESTS ============

/**
 * Pull request information
 */
export interface AzureDevOpsPullRequest {
  id: number;
  number: number;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'abandoned';
  createdBy: string;
  createdDate: Date;
  closedDate?: Date;
  sourceBranch: string;
  targetBranch: string;
  votesApproved: number;
  votesRejected: number;
  url: string;
}

/**
 * Request to create a pull request
 */
export interface CreatePullRequestRequest {
  sourceBranch: string;
  targetBranch: string;
  title: string;
  description: string;
  isDraft?: boolean;
  reviewerIds?: string[];
}

// ============ PIPELINES ============

/**
 * Azure DevOps pipeline
 */
export interface AzureDevOpsPipeline {
  id: number;
  name: string;
  url: string;
  folder: string;
  revision: number;
}

/**
 * Pipeline run/execution
 */
export interface AzureDevOpsPipelineRun {
  id: number;
  name: string;
  state: 'inProgress' | 'completed';
  result?: 'succeeded' | 'failed' | 'partiallySucceeded' | 'canceled';
  createdDate: Date;
  finishedDate?: Date;
  url: string;
}

/**
 * Request to trigger a pipeline
 */
export interface TriggerPipelineRequest {
  pipelineId: number;
  variables?: Record<string, string>;
}

// ============ SYNC & INTEGRATION ============

/**
 * Model sync configuration
 */
export interface ModelDevOpsSyncConfig {
  modelId: string;
  organizationUrl: string;
  projectId: string;
  repositoryId: string;
  branchName: string;
  filePath: string;
  autoSyncEnabled: boolean;
  createPrForChanges: boolean;
  defaultPipelineId?: number;
  triggerPipelineOnSync: boolean;
  configuredAt: Date;
  lastSyncAt?: Date;
}

/**
 * DevOps integration event
 */
export interface DevOpsIntegrationEvent {
  id: string;
  modelId: string;
  eventType: 'commit' | 'pr' | 'pipeline' | 'sync';
  status: 'pending' | 'success' | 'failed';
  details: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Sync history record
 */
export interface ModelSyncHistory {
  id: string;
  modelId: string;
  syncDirection: 'push' | 'pull';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  devOpsCommitId: string;
  localVersionId: string;
  details: string;
  initiatedAt: Date;
  completedAt?: Date;
  initiatedBy: string;
}

// ============ SETTINGS ============

/**
 * Application DevOps settings
 */
export interface ApplicationDevOpsSettings {
  defaultOrganizationUrl: string;
  defaultProjectId: string;
  autoSyncByDefault: boolean;
  syncIntervalSeconds: number;
  requireApprovalForSync: boolean;
}

/**
 * User DevOps account linking
 */
export interface UserDevOpsLinking {
  userId: string;
  organizationUrl: string;
  isLinked: boolean;
  linkedAt?: Date;
  linkedBy: 'user_manual' | 'admin_system';
}

// ============ STATE & CONTEXT ============

/**
 * DevOps integration state for model
 */
export interface ModelDevOpsIntegrationState {
  modelId: string;
  isLinked: boolean;
  link?: ModelRepositoryLink;
  lastSync?: ModelSyncHistory;
  isAutoSyncing: boolean;
  isSyncing: boolean;
  syncError?: string;
  syncProgress?: number;
}

/**
 * DevOps service state
 */
export interface DevOpsServiceState {
  isAuthenticated: boolean;
  organizationUrl?: string;
  repositories: AzureDevOpsRepository[];
  pipelines: AzureDevOpsPipeline[];
  isLoading: boolean;
  error?: string;
  lastRefresh: Date;
}

/**
 * DevOps configuration for React context/hooks
 */
export interface DevOpsConfig {
  apiUrl: string;
  enableAutoSync: boolean;
  syncIntervalMs: number;
  requiredCredentials: ['organizationUrl', 'personalAccessToken'];
}
