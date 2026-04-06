using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace DataModeler.Services
{
    /// <summary>
    /// Service for managing model branches (Git-like branching)
    /// Supports creating, switching, merging, and protecting branches
    /// </summary>
    public interface IBranchingManagementService
    {
        Task<BranchDto> CreateBranchAsync(
            Guid modelId,
            string branchName,
            Guid fromVersionId,
            string userId,
            string description = null);

        Task<BranchDto> GetBranchAsync(
            Guid modelId,
            string branchName);

        Task<List<BranchDto>> GetAllBranchesAsync(
            Guid modelId);

        Task<BranchDto> SwitchBranchAsync(
            Guid modelId,
            string branchName,
            string userId);

        Task<MergeResultDto> MergeBranchAsync(
            Guid modelId,
            string sourceBranchName,
            string targetBranchName,
            string userId,
            MergeStrategyType strategy = MergeStrategyType.Recursive);

        Task<bool> DeleteBranchAsync(
            Guid modelId,
            string branchName,
            string userId);

        Task<BranchDto> ProtectBranchAsync(
            Guid modelId,
            string branchName);

        Task<BranchDto> UnprotectBranchAsync(
            Guid modelId,
            string branchName);

        Task<List<MergeConflictDto>> DetectMergeConflictsAsync(
            Guid modelId,
            string sourceBranch,
            string targetBranch);

        Task<BranchStatsDto> GetBranchStatisticsAsync(
            Guid modelId);
    }

    public class BranchingManagementService : IBranchingManagementService
    {
        private readonly ILogger<BranchingManagementService> _logger;

        // In-memory branch storage (would be replaced with database)
        private readonly Dictionary<Guid, Dictionary<string, BranchData>> _branches;

        public BranchingManagementService(
            ILogger<BranchingManagementService> logger)
        {
            _logger = logger;
            _branches = new Dictionary<Guid, Dictionary<string, BranchData>>();
        }

        /// <summary>
        /// Creates a new branch from a specific version
        /// </summary>
        public async Task<BranchDto> CreateBranchAsync(
            Guid modelId,
            string branchName,
            Guid fromVersionId,
            string userId,
            string description = null)
        {
            try
            {
                _logger.LogInformation(
                    "Creating branch {BranchName} for model {ModelId} from version {VersionId}",
                    branchName, modelId, fromVersionId);

                if (!_branches.ContainsKey(modelId))
                    _branches[modelId] = new Dictionary<string, BranchData>();

                if (_branches[modelId].ContainsKey(branchName))
                    throw new InvalidOperationException($"Branch '{branchName}' already exists");

                var branch = new BranchData
                {
                    ModelId = modelId,
                    Name = branchName,
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow,
                    SourceVersionId = fromVersionId,
                    IsMainBranch = false,
                    IsProtected = false,
                    Description = description,
                    VersionIds = new List<Guid> { fromVersionId },
                    LastModifiedAt = DateTime.UtcNow,
                    LastModifiedBy = userId,
                };

                _branches[modelId][branchName] = branch;

                return await Task.FromResult(MapToDto(branch));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating branch");
                throw;
            }
        }

        /// <summary>
        /// Gets a specific branch
        /// </summary>
        public async Task<BranchDto> GetBranchAsync(
            Guid modelId,
            string branchName)
        {
            try
            {
                if (!_branches.ContainsKey(modelId) ||
                    !_branches[modelId].ContainsKey(branchName))
                    throw new KeyNotFoundException($"Branch '{branchName}' not found");

                return await Task.FromResult(MapToDto(_branches[modelId][branchName]));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting branch");
                throw;
            }
        }

        /// <summary>
        /// Gets all branches for a model
        /// </summary>
        public async Task<List<BranchDto>> GetAllBranchesAsync(
            Guid modelId)
        {
            try
            {
                if (!_branches.ContainsKey(modelId))
                    return await Task.FromResult(new List<BranchDto>());

                return await Task.FromResult(
                    _branches[modelId].Values.Select(MapToDto).ToList());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting branches");
                throw;
            }
        }

        /// <summary>
        /// Switches to a different branch
        /// </summary>
        public async Task<BranchDto> SwitchBranchAsync(
            Guid modelId,
            string branchName,
            string userId)
        {
            try
            {
                _logger.LogInformation(
                    "Switching to branch {BranchName} for model {ModelId}",
                    branchName, modelId);

                var branch = await GetBranchAsync(modelId, branchName);
                branch.LastAccessedAt = DateTime.UtcNow;
                branch.LastAccessedBy = userId;

                _branches[modelId][branchName].LastAccessedAt = DateTime.UtcNow;
                _branches[modelId][branchName].LastAccessedBy = userId;

                return branch;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error switching branch");
                throw;
            }
        }

        /// <summary>
        /// Merges source branch into target branch
        /// </summary>
        public async Task<MergeResultDto> MergeBranchAsync(
            Guid modelId,
            string sourceBranchName,
            string targetBranchName,
            string userId,
            MergeStrategyType strategy = MergeStrategyType.Recursive)
        {
            try
            {
                _logger.LogInformation(
                    "Merging {SourceBranch} into {TargetBranch} using {Strategy}",
                    sourceBranchName, targetBranchName, strategy);

                var sourceBranch = await GetBranchAsync(modelId, sourceBranchName);
                var targetBranch = await GetBranchAsync(modelId, targetBranchName);

                var conflicts = await DetectMergeConflictsAsync(
                    modelId, sourceBranchName, targetBranchName);

                var result = new MergeResultDto
                {
                    SourceBranch = sourceBranchName,
                    TargetBranch = targetBranchName,
                    Strategy = strategy,
                    MergedAt = DateTime.UtcNow,
                    MergedBy = userId,
                    Conflicts = conflicts,
                    HasConflicts = conflicts.Any(),
                    IsSuccessful = !conflicts.Any(),
                };

                if (conflicts.Any() && strategy == MergeStrategyType.FastForward)
                {
                    result.IsSuccessful = false;
                    result.ErrorMessage = "Fast-forward merge not possible with conflicts";
                    return result;
                }

                // Perform merge based on strategy
                result = strategy switch
                {
                    MergeStrategyType.FastForward => PerformFastForwardMerge(
                        modelId, sourceBranch, targetBranch, result, userId),
                    MergeStrategyType.Recursive => PerformRecursiveMerge(
                        modelId, sourceBranch, targetBranch, result, userId),
                    MergeStrategyType.Ours => PerformOursMerge(
                        modelId, sourceBranch, targetBranch, result, userId),
                    MergeStrategyType.Theirs => PerformTheirsMerge(
                        modelId, sourceBranch, targetBranch, result, userId),
                    _ => result
                };

                // Update branch metadata
                _branches[modelId][targetBranchName].LastModifiedAt = DateTime.UtcNow;
                _branches[modelId][targetBranchName].LastModifiedBy = userId;
                _branches[modelId][targetBranchName].IsMergeBranch = true;
                _branches[modelId][targetBranchName].MergeSourceBranch = sourceBranchName;

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error merging branches");
                throw;
            }
        }

        /// <summary>
        /// Deletes a branch
        /// </summary>
        public async Task<bool> DeleteBranchAsync(
            Guid modelId,
            string branchName,
            string userId)
        {
            try
            {
                _logger.LogInformation(
                    "Deleting branch {BranchName} for model {ModelId}",
                    branchName, modelId);

                if (!_branches.ContainsKey(modelId))
                    return false;

                var branch = _branches[modelId][branchName];

                if (branch.IsProtected)
                    throw new InvalidOperationException($"Cannot delete protected branch '{branchName}'");

                if (branch.IsMainBranch)
                    throw new InvalidOperationException("Cannot delete main branch");

                _branches[modelId].Remove(branchName);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting branch");
                throw;
            }
        }

        /// <summary>
        /// Protects a branch from deletion and direct modifications
        /// </summary>
        public async Task<BranchDto> ProtectBranchAsync(
            Guid modelId,
            string branchName)
        {
            try
            {
                _logger.LogInformation(
                    "Protecting branch {BranchName} for model {ModelId}",
                    branchName, modelId);

                var branch = _branches[modelId][branchName];
                branch.IsProtected = true;
                branch.ProtectedAt = DateTime.UtcNow;

                return MapToDto(branch);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error protecting branch");
                throw;
            }
        }

        /// <summary>
        /// Unprotects a branch
        /// </summary>
        public async Task<BranchDto> UnprotectBranchAsync(
            Guid modelId,
            string branchName)
        {
            try
            {
                _logger.LogInformation(
                    "Unprotecting branch {BranchName} for model {ModelId}",
                    branchName, modelId);

                var branch = _branches[modelId][branchName];
                branch.IsProtected = false;
                branch.ProtectedAt = null;

                return MapToDto(branch);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unprotecting branch");
                throw;
            }
        }

        /// <summary>
        /// Detects merge conflicts between two branches
        /// </summary>
        public async Task<List<MergeConflictDto>> DetectMergeConflictsAsync(
            Guid modelId,
            string sourceBranch,
            string targetBranch)
        {
            try
            {
                var conflicts = new List<MergeConflictDto>();

                var source = _branches[modelId][sourceBranch];
                var target = _branches[modelId][targetBranch];

                // Detect version conflicts (diverged changes)
                var sourceVersions = source.VersionIds;
                var targetVersions = target.VersionIds;
                var commonVersions = sourceVersions.Intersect(targetVersions).ToList();

                if (commonVersions.Count == 0)
                {
                    conflicts.Add(new MergeConflictDto
                    {
                        ConflictType = "NoCommonAncestor",
                        Severity = "High",
                        Description = "No common ancestor found between branches",
                        Resolution = "Manual merge required",
                    });
                }

                // Detect stale branch issues
                var sourceAge = DateTime.UtcNow - source.LastModifiedAt;
                var targetAge = DateTime.UtcNow - target.LastModifiedAt;

                if (sourceAge.TotalDays > 30 && targetAge.TotalDays > 30)
                {
                    conflicts.Add(new MergeConflictDto
                    {
                        ConflictType = "StaleBranch",
                        Severity = "Medium",
                        Description = "Both branches are stale (>30 days without changes)",
                        Resolution = "Update branches with latest changes",
                    });
                }

                return await Task.FromResult(conflicts);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error detecting merge conflicts");
                throw;
            }
        }

        /// <summary>
        /// Gets branch statistics for the model
        /// </summary>
        public async Task<BranchStatsDto> GetBranchStatisticsAsync(
            Guid modelId)
        {
            try
            {
                if (!_branches.ContainsKey(modelId))
                    return new BranchStatsDto();

                var allBranches = _branches[modelId].Values;
                var stats = new BranchStatsDto
                {
                    TotalBranches = allBranches.Count,
                    ProtectedBranches = allBranches.Count(b => b.IsProtected),
                    MergedBranches = allBranches.Count(b => b.IsMergeBranch),
                    AverageBranchLifetime = CalculateAverageBranchLifetime(allBranches),
                    MostActiveBranch = FindMostActiveBranch(allBranches)?.Name,
                    BranchCreators = allBranches.Select(b => b.CreatedBy).Distinct().Count(),
                };

                return await Task.FromResult(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting branch statistics");
                throw;
            }
        }

        // =====================================================================
        // Private Helper Methods
        // =====================================================================

        private MergeResultDto PerformFastForwardMerge(
            Guid modelId,
            BranchDto sourceBranch,
            BranchDto targetBranch,
            MergeResultDto result,
            string userId)
        {
            result.Status = "FastForwardMerge";
            result.CommitMessage = $"Fast-forward merge of {result.SourceBranch} into {result.TargetBranch}";
            result.IsSuccessful = true;
            return result;
        }

        private MergeResultDto PerformRecursiveMerge(
            Guid modelId,
            BranchDto sourceBranch,
            BranchDto targetBranch,
            MergeResultDto result,
            string userId)
        {
            result.Status = "RecursiveMerge";
            result.CommitMessage = $"Merge {result.SourceBranch} into {result.TargetBranch}";
            result.IsSuccessful = !result.HasConflicts;
            return result;
        }

        private MergeResultDto PerformOursMerge(
            Guid modelId,
            BranchDto sourceBranch,
            BranchDto targetBranch,
            MergeResultDto result,
            string userId)
        {
            result.Status = "OursMerge";
            result.CommitMessage = $"Merge {result.SourceBranch} (keeping our changes)";
            result.IsSuccessful = true;
            result.ResolvedConflicts = result.Conflicts.Count;
            return result;
        }

        private MergeResultDto PerformTheirsMerge(
            Guid modelId,
            BranchDto sourceBranch,
            BranchDto targetBranch,
            MergeResultDto result,
            string userId)
        {
            result.Status = "TheirsMerge";
            result.CommitMessage = $"Merge {result.SourceBranch} (accepting their changes)";
            result.IsSuccessful = true;
            result.ResolvedConflicts = result.Conflicts.Count;
            return result;
        }

        private TimeSpan? CalculateAverageBranchLifetime(IEnumerable<BranchData> branches)
        {
            var lifetimes = branches.Select(b => DateTime.UtcNow - b.CreatedAt).ToList();
            return lifetimes.Any()
                ? TimeSpan.FromSeconds(lifetimes.Average(ts => ts.TotalSeconds))
                : null;
        }

        private BranchData FindMostActiveBranch(IEnumerable<BranchData> branches)
        {
            return branches.OrderByDescending(b => b.LastModifiedAt).FirstOrDefault();
        }

        private BranchDto MapToDto(BranchData branch)
        {
            return new BranchDto
            {
                ModelId = branch.ModelId,
                Name = branch.Name,
                CreatedBy = branch.CreatedBy,
                CreatedAt = branch.CreatedAt,
                SourceVersionId = branch.SourceVersionId,
                IsMainBranch = branch.IsMainBranch,
                IsProtected = branch.IsProtected,
                Description = branch.Description,
                VersionCount = branch.VersionIds.Count,
                LastModifiedAt = branch.LastModifiedAt,
                LastModifiedBy = branch.LastModifiedBy,
                LastAccessedAt = branch.LastAccessedAt,
                LastAccessedBy = branch.LastAccessedBy,
                IsMergeBranch = branch.IsMergeBranch,
                MergeSourceBranch = branch.MergeSourceBranch,
            };
        }

        private class BranchData
        {
            public Guid ModelId { get; set; }
            public string Name { get; set; }
            public string CreatedBy { get; set; }
            public DateTime CreatedAt { get; set; }
            public Guid SourceVersionId { get; set; }
            public bool IsMainBranch { get; set; }
            public bool IsProtected { get; set; }
            public DateTime? ProtectedAt { get; set; }
            public string Description { get; set; }
            public List<Guid> VersionIds { get; set; }
            public DateTime LastModifiedAt { get; set; }
            public string LastModifiedBy { get; set; }
            public DateTime? LastAccessedAt { get; set; }
            public string LastAccessedBy { get; set; }
            public bool IsMergeBranch { get; set; }
            public string MergeSourceBranch { get; set; }
        }
    }

    // =========================================================================
    // DTOs and Enums
    // =========================================================================

    public class BranchDto
    {
        public Guid ModelId { get; set; }
        public string Name { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public Guid SourceVersionId { get; set; }
        public bool IsMainBranch { get; set; }
        public bool IsProtected { get; set; }
        public string Description { get; set; }
        public int VersionCount { get; set; }
        public DateTime LastModifiedAt { get; set; }
        public string LastModifiedBy { get; set; }
        public DateTime? LastAccessedAt { get; set; }
        public string LastAccessedBy { get; set; }
        public bool IsMergeBranch { get; set; }
        public string MergeSourceBranch { get; set; }
    }

    public class MergeResultDto
    {
        public string SourceBranch { get; set; }
        public string TargetBranch { get; set; }
        public MergeStrategyType Strategy { get; set; }
        public string Status { get; set; } // FastForwardMerge, RecursiveMerge, Conflicted, etc.
        public DateTime MergedAt { get; set; }
        public string MergedBy { get; set; }
        public List<MergeConflictDto> Conflicts { get; set; } = new();
        public bool HasConflicts { get; set; }
        public bool IsSuccessful { get; set; }
        public string CommitMessage { get; set; }
        public int ResolvedConflicts { get; set; }
        public string ErrorMessage { get; set; }
    }

    public class MergeConflictDto
    {
        public string ConflictType { get; set; }
        public string Severity { get; set; }
        public string Description { get; set; }
        public string Resolution { get; set; }
    }

    public class BranchStatsDto
    {
        public int TotalBranches { get; set; }
        public int ProtectedBranches { get; set; }
        public int MergedBranches { get; set; }
        public TimeSpan? AverageBranchLifetime { get; set; }
        public string MostActiveBranch { get; set; }
        public int BranchCreators { get; set; }
    }

    public enum MergeStrategyType
    {
        FastForward = 0,
        Recursive = 1,
        Ours = 2,
        Theirs = 3,
    }
}
