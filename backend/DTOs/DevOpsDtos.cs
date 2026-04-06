using System;
using System.Collections.Generic;

namespace DataModeler.DTOs
{
    // ============ TEST & CONNECTION ============

    /// <summary>
    /// Result of testing Azure DevOps connection
    /// </summary>
    public class AzureDevOpsConnectionTestDto
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; }
        public int? ProjectCount { get; set; }
        public DateTime Timestamp { get; set; }
    }

    // ============ REPOSITORIES ============

    /// <summary>
    /// Represents an Azure DevOps repository
    /// </summary>
    public class AzureDevOpsRepositoryDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string ProjectId { get; set; }
        public string Url { get; set; }
        public string DefaultBranch { get; set; }
        public bool IsDisabled { get; set; }
        public string SshUrl { get; set; }
        public string HttpUrl { get; set; }
    }

    /// <summary>
    /// Request to link a model to a DevOps repository
    /// </summary>
    public class LinkModelToRepositoryRequestDto
    {
        public Guid ModelId { get; set; }
        public string RepositoryId { get; set; }
        public string BranchName { get; set; } = "main";
        public string FilePath { get; set; } = "models/model.dbml";
        public bool AutoSync { get; set; } = true;
    }

    /// <summary>
    /// Model-to-repository link information
    /// </summary>
    public class ModelRepositoryLinkDto
    {
        public Guid ModelId { get; set; }
        public string RepositoryId { get; set; }
        public string RepositoryName { get; set; }
        public string BranchName { get; set; }
        public string FilePath { get; set; }
        public bool AutoSync { get; set; }
        public DateTime LinkedAt { get; set; }
        public DateTime? LastSyncAt { get; set; }
        public string LastSyncStatus { get; set; } // "success", "failed", "pending"
    }

    // ============ COMMITS ============

    /// <summary>
    /// Represents a commit in Azure DevOps repository
    /// </summary>
    public class AzureDevOpsCommitDto
    {
        public string CommitId { get; set; }
        public string Author { get; set; }
        public string AuthorEmail { get; set; }
        public string Comment { get; set; }
        public DateTime AuthorDate { get; set; }
        public string Url { get; set; }
    }

    /// <summary>
    /// Detailed commit information
    /// </summary>
    public class AzureDevOpsCommitDetailDto
    {
        public string CommitId { get; set; }
        public string Author { get; set; }
        public string AuthorEmail { get; set; }
        public string Comment { get; set; }
        public DateTime AuthorDate { get; set; }
        public DateTime CommitterDate { get; set; }
        public List<string> Parents { get; set; } = new();
        public string Url { get; set; }
        public List<AzureDevOpsChangeDto> Changes { get; set; } = new();
    }

    /// <summary>
    /// Change in a commit
    /// </summary>
    public class AzureDevOpsChangeDto
    {
        public string ObjectId { get; set; }
        public string Path { get; set; }
        public string ChangeType { get; set; }
    }

    /// <summary>
    /// Request to create a commit with model content
    /// </summary>
    public class CreateDevOpsCommitRequestDto
    {
        public string BranchName { get; set; }
        public string FilePath { get; set; }
        public string FileContent { get; set; } // DBML content
        public string Comment { get; set; }
        public string OldObjectId { get; set; } // Previous commit ID for updates
    }

    /// <summary>
    /// Result of creating a commit
    /// </summary>
    public class CreateDevOpsCommitResultDto
    {
        public string CommitId { get; set; }
        public string Branch { get; set; }
        public DateTime CreatedDate { get; set; }
        public string Url { get; set; }
        public bool Success { get; set; }
    }

    // ============ PULL REQUESTS ============

    /// <summary>
    /// Request to create a pull request
    /// </summary>
    public class CreateDevOpsPullRequestRequestDto
    {
        public string SourceBranch { get; set; } // e.g., "refs/heads/feature/model-update"
        public string TargetBranch { get; set; } // e.g., "refs/heads/main"
        public string Title { get; set; }
        public string Description { get; set; }
        public bool IsDraft { get; set; } = false;
        public List<string> ReviewerIds { get; set; } = new();
    }

    /// <summary>
    /// Pull request information
    /// </summary>
    public class AzureDevOpsPullRequestDto
    {
        public int Id { get; set; }
        public int Number { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Status { get; set; } // "active", "completed", "abandoned"
        public string CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? ClosedDate { get; set; }
        public string SourceBranch { get; set; }
        public string TargetBranch { get; set; }
        public int VotesApproved { get; set; }
        public int VotesRejected { get; set; }
        public string Url { get; set; }
    }

    // ============ PIPELINES ============

    /// <summary>
    /// Represents an Azure DevOps pipeline
    /// </summary>
    public class AzureDevOpsPipelineDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Url { get; set; }
        public string Folder { get; set; }
        public int Revision { get; set; }
    }

    /// <summary>
    /// Pipeline run/execution
    /// </summary>
    public class AzureDevOpsPipelineRunDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string State { get; set; } // "inProgress", "completed"
        public string Result { get; set; } // "succeeded", "failed", "partiallySucceeded", "canceled"
        public DateTime CreatedDate { get; set; }
        public DateTime? FinishedDate { get; set; }
        public string Url { get; set; }
    }

    /// <summary>
    /// Request to trigger a pipeline on model change
    /// </summary>
    public class TriggerPipelineOnChangeRequestDto
    {
        public Guid ModelId { get; set; }
        public int PipelineId { get; set; }
        public string TriggerReason { get; set; } // "manual", "model_change", "scheduled"
        public Dictionary<string, string> Variables { get; set; } = new();
    }

    /// <summary>
    /// Represents a DevOps integration event
    /// </summary>
    public class DevOpsIntegrationEventDto
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid ModelId { get; set; }
        public string EventType { get; set; } // "commit", "pr", "pipeline", "sync"
        public string Status { get; set; } // "pending", "success", "failed"
        public string Details { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
    }

    // ============ MODEL SYNC ============

    /// <summary>
    /// Configuration for model-to-DevOps synchronization
    /// </summary>
    public class ModelDevOpsSyncConfigDto
    {
        public Guid ModelId { get; set; }
        public string OrganizationUrl { get; set; }
        public string ProjectId { get; set; }
        public string RepositoryId { get; set; }
        public string BranchName { get; set; } = "main";
        public string FilePath { get; set; } = "models/model.dbml";
        public bool AutoSyncEnabled { get; set; } = true;
        public bool CreatePrForChanges { get; set; } = false;
        public int? DefaultPipelineId { get; set; }
        public bool TriggerPipelineOnSync { get; set; } = false;
        public DateTime ConfiguredAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastSyncAt { get; set; }
    }

    /// <summary>
    /// Request to sync model to DevOps
    /// </summary>
    public class SyncModelToDevOpsRequestDto
    {
        public Guid ModelId { get; set; }
        public string DbmlContent { get; set; }
        public string CommitMessage { get; set; }
        public bool CreatePullRequest { get; set; } = false;
        public string PullRequestTitle { get; set; }
        public string PullRequestDescription { get; set; }
    }

    /// <summary>
    /// Result of syncing model to DevOps
    /// </summary>
    public class SyncModelToDevOpsResultDto
    {
        public bool Success { get; set; }
        public string CommitId { get; set; }
        public int? PullRequestId { get; set; }
        public string Message { get; set; }
        public DateTime SyncedAt { get; set; }
        public string DevOpsUrl { get; set; }
    }

    /// <summary>
    /// Request to pull model from DevOps
    /// </summary>
    public class PullModelFromDevOpsRequestDto
    {
        public Guid ModelId { get; set; }
        public string CommitId { get; set; } // Optional: specific commit, otherwise use branch
    }

    /// <summary>
    /// Result of pulling model from DevOps
    /// </summary>
    public class PullModelFromDevOpsResultDto
    {
        public bool Success { get; set; }
        public string DbmlContent { get; set; }
        public string CommitId { get; set; }
        public string Author { get; set; }
        public DateTime CommitDate { get; set; }
        public string Message { get; set; }
    }

    // ============ SYNC HISTORY ============

    /// <summary>
    /// Record of a model-DevOps sync operation
    /// </summary>
    public class ModelSyncHistoryDto
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid ModelId { get; set; }
        public string SyncDirection { get; set; } // "push" (to DevOps), "pull" (from DevOps)
        public string Status { get; set; } // "pending", "in_progress", "completed", "failed"
        public string DevOpsCommitId { get; set; }
        public string LocalVersionId { get; set; }
        public string Details { get; set; }
        public DateTime InitiatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
        public string InitiatedBy { get; set; }
    }

    // ============ SETTINGS & CONFIGURATION ============

    /// <summary>
    /// DevOps settings for the application
    /// </summary>
    public class ApplicationDevOpsSettingsDto
    {
        public string DefaultOrganizationUrl { get; set; }
        public string DefaultProjectId { get; set; }
        public bool AutoSyncByDefault { get; set; } = true;
        public int SyncIntervalSeconds { get; set; } = 3600; // 1 hour
        public bool RequireApprovalForSync { get; set; } = false;
    }

    /// <summary>
    /// Request to configure DevOps settings
    /// </summary>
    public class ConfigureDevOpsSettingsRequestDto
    {
        public string DefaultOrganizationUrl { get; set; }
        public string DefaultProjectId { get; set; }
        public bool AutoSyncByDefault { get; set; }
        public int SyncIntervalSeconds { get; set; }
        public bool RequireApprovalForSync { get; set; }
    }

    /// <summary>
    /// User's DevOps linking with personal access token
    /// </summary>
    public class UserDevOpsLinkingDto
    {
        public string UserId { get; set; }
        public string OrganizationUrl { get; set; }
        public bool IsLinked { get; set; }
        public DateTime? LinkedAt { get; set; }
        public string LinkedBy { get; set; } // "user_manual" or "admin_system"
    }
}
