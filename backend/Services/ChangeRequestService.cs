using System.Text;
using System.Text.Json;
using System.Net;
using System.Net.Http.Headers;
using DataModeler.API.Data;
using DataModeler.API.DTOs;
using DataModeler.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DataModeler.API.Services;

public class ChangeRequestService : IChangeRequestService
{
    private static readonly Dictionary<string, int> RoleHierarchy = new(StringComparer.OrdinalIgnoreCase)
    {
        { "viewer", 1 },
        { "data_steward", 1 },
        { "editor", 2 },
        { "developer", 2 },
        { "domain_architect", 2 },
        { "data_architect", 2 },
        { "owner", 3 },
        { "admin", 3 },
    };

    private static readonly string[] ModelScopedApplicationRolesByPriority =
    {
        "admin",
        "owner",
        "data_architect",
        "domain_architect",
        "developer",
        "editor",
        "data_steward",
        "viewer",
    };

    private static readonly string[] GlobalDefaultModelRolesByPriority =
    {
        "admin",
    };

    private readonly DataModelerDbContext _context;
    private readonly IDbmlParserService _dbmlParser;
    private readonly ILogger<ChangeRequestService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public ChangeRequestService(
        DataModelerDbContext context,
        IDbmlParserService dbmlParser,
        ILogger<ChangeRequestService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _context = context;
        _dbmlParser = dbmlParser;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    public async Task<ChangeRequestDetailDto> CreateAsync(Guid requesterId, CreateChangeRequestDto request, CancellationToken cancellationToken = default)
    {
        if (request == null)
        {
            throw new InvalidOperationException("Change request data is required.");
        }

        if (request.ModelId == Guid.Empty)
        {
            throw new InvalidOperationException("Model ID is required.");
        }

        if (string.IsNullOrWhiteSpace(request.NewDbmlSnapshot))
        {
            throw new InvalidOperationException("DBML content is required.");
        }

        var model = await _context.Models
            .Include(m => m.Versions)
            .Include(m => m.Owner)
            .Include(m => m.ModelGroup)
            .Include(m => m.Collaborators)
            .FirstOrDefaultAsync(m => m.Id == request.ModelId, cancellationToken);

        if (model == null)
        {
            throw new InvalidOperationException("Model not found.");
        }

        if (!await CanAccessModelAsync(requesterId, model, "editor", cancellationToken))
        {
            throw new InvalidOperationException("User is not allowed to create change requests for this model.");
        }

        var mainVersions = model.Versions
            .Where(v => v.BranchName == "main")
            .OrderByDescending(v => v.VersionNumber)
            .ToList();

        var newSnapshot = request.NewDbmlSnapshot ?? string.Empty;

        var oldSnapshot = ResolveOldSnapshot(mainVersions, newSnapshot);

        if (string.IsNullOrWhiteSpace(newSnapshot))
        {
            throw new InvalidOperationException("New DBML snapshot cannot be empty.");
        }

        var workflow = (request.WorkflowStages == null || request.WorkflowStages.Count == 0)
            ? await GetActiveWorkflowOrDefaultAsync(cancellationToken)
            : NormalizeWorkflow(request.WorkflowStages);

        var generatedSql = GenerateSqlScript(oldSnapshot, newSnapshot, model.DatabaseDialect);
        var requestCode = await GenerateNextChangeCodeAsync(cancellationToken);

        var changeRequest = new ChangeRequest
        {
            Id = Guid.NewGuid(),
            ModelId = model.Id,
            ChangeCode = requestCode,
            Title = string.IsNullOrWhiteSpace(request.Title) ? $"Change for {model.Name}" : request.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            RequesterId = requesterId,
            Status = request.SubmitForApproval ? workflow[0].PendingStatus : ChangeRequestStatuses.Draft,
            WorkflowStagesJson = JsonSerializer.Serialize(workflow),
            CurrentStageIndex = request.SubmitForApproval ? 0 : -1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Details = new ChangeRequestDetails
            {
                ChangeRequestId = Guid.Empty, // EF sets FK via relationship
                OldDbmlSnapshot = oldSnapshot,
                NewDbmlSnapshot = newSnapshot,
                GeneratedSql = generatedSql,
            }
        };

        _context.ChangeRequests.Add(changeRequest);

        AddApprovalLog(changeRequest.Id, requesterId, null, changeRequest.Status,
            request.SubmitForApproval
            ? "Change request created and submitted for approval."
            : "Change request created as draft.");

        await _context.SaveChangesAsync(cancellationToken);

        var created = await GetByIdAsync(changeRequest.Id, requesterId, cancellationToken);
        if (created == null)
        {
            throw new InvalidOperationException("Change request created but could not be loaded.");
        }

        return created;
    }

    private static string ResolveOldSnapshot(List<ModelVersion> mainVersions, string newSnapshot)
    {
        if (mainVersions.Count == 0)
        {
            return string.Empty;
        }

        var normalizedNew = NormalizeSnapshot(newSnapshot);

        var differentVersion = mainVersions
            .FirstOrDefault(v => NormalizeSnapshot(v.DbmlContent) != normalizedNew);

        if (differentVersion != null)
        {
            return differentVersion.DbmlContent;
        }

        return mainVersions.First().DbmlContent;
    }

    private static string NormalizeSnapshot(string snapshot)
    {
        return (snapshot ?? string.Empty)
            .Replace("\r\n", "\n")
            .Trim();
    }

    public async Task<List<ChangeRequestListItemDto>> GetFilteredRequestsAsync(Guid actorUserId, ChangeRequestFilterDto filter, CancellationToken cancellationToken = default)
    {
        var actor = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == actorUserId, cancellationToken);

        if (actor == null)
        {
            return new List<ChangeRequestListItemDto>();
        }

        var roleNames = await GetUserRoleNamesAsync(actorUserId, cancellationToken);
        var isAdmin = actor.IsSuperAdmin || roleNames.Contains("admin");
        var mode = string.Equals(filter.Mode, "pending", StringComparison.OrdinalIgnoreCase) ? "pending" : "mine";

        var status = string.IsNullOrWhiteSpace(filter.Status)
            ? null
            : filter.Status.Trim();

        var requester = string.IsNullOrWhiteSpace(filter.Requester)
            ? null
            : filter.Requester.Trim().ToLowerInvariant();

        var fromDate = NormalizeToUtc(filter.FromDate);
        var toDate = NormalizeToUtc(filter.ToDate);

        if (mode == "mine" && fromDate == null && toDate == null)
        {
            fromDate = DateTime.UtcNow.Date.AddDays(-7);
        }

        if (mode == "pending" && string.IsNullOrWhiteSpace(status))
        {
            status = "pending";
        }

        var query = _context.ChangeRequests
            .AsNoTracking()
            .Include(c => c.Model)
                .ThenInclude(m => m!.ModelGroup)
            .Include(c => c.Model)
                .ThenInclude(m => m!.Collaborators)
            .Include(c => c.Requester)
            .Include(c => c.ApprovalLogs)
            .AsQueryable();

        if (fromDate.HasValue)
        {
            query = query.Where(c => c.CreatedAt >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(c => c.CreatedAt <= toDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (string.Equals(status, "pending", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(c => c.Status == ChangeRequestStatuses.PendingBusiness || c.Status == ChangeRequestStatuses.PendingArchitect);
            }
            else
            {
                query = query.Where(c => c.Status == status);
            }
        }

        if (!string.IsNullOrWhiteSpace(requester))
        {
            query = query.Where(c => c.Requester != null && (
                c.Requester.EmailLower.Contains(requester) ||
                c.Requester.Email.ToLower().Contains(requester)));
        }

        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Take(500)
            .ToListAsync(cancellationToken);

        var candidateModelIds = items.Select(item => item.ModelId).Distinct().ToList();
        var visibleModelIds = await GetAccessibleModelIdsAsync(actorUserId, "viewer", candidateModelIds, cancellationToken);

        if (mode == "mine")
        {
            if (!isAdmin)
            {
                items = items
                    .Where(c => visibleModelIds.Contains(c.ModelId))
                    .ToList();
            }
        }
        else
        {
            if (!isAdmin)
            {
                var userOrganizationUnit = ExtractOrganizationUnit(actor.LdapDistinguishedName);
                items = items.Where(c =>
                        visibleModelIds.Contains(c.ModelId) &&
                        c.Model != null &&
                        CanUserApproveCurrentStage(
                            c,
                            ResolveEffectiveRoleForModel(c.Model, actorUserId, actor.IsSuperAdmin, userOrganizationUnit, roleNames),
                            actor.IsSuperAdmin))
                    .ToList();
            }
        }

        return items.Select(MapListItem).ToList();
    }

    public async Task<List<ChangeRequestListItemDto>> GetMyRequestsAsync(Guid requesterId, CancellationToken cancellationToken = default)
    {
        var items = await _context.ChangeRequests
            .AsNoTracking()
            .Include(c => c.Model)
            .Include(c => c.Requester)
            .Where(c => c.RequesterId == requesterId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

        return items.Select(MapListItem).ToList();
    }

    public async Task<List<ChangeRequestListItemDto>> GetPendingApprovalsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            return new List<ChangeRequestListItemDto>();
        }

        var roleNames = await GetUserRoleNamesAsync(userId, cancellationToken);
        var userOrganizationUnit = ExtractOrganizationUnit(user.LdapDistinguishedName);

        var requests = await _context.ChangeRequests
            .AsNoTracking()
            .Include(c => c.Model)
            .Include(c => c.Model!.ModelGroup)
            .Include(c => c.Model!.Collaborators)
            .Include(c => c.Requester)
            .Where(c => c.Status == ChangeRequestStatuses.PendingArchitect || c.Status == ChangeRequestStatuses.PendingBusiness)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

        var result = new List<ChangeRequestListItemDto>();
        foreach (var request in requests)
        {
            if (request.Model == null || !await CanAccessModelAsync(userId, request.Model, "viewer", cancellationToken))
            {
                continue;
            }

            var effectiveRole = ResolveEffectiveRoleForModel(request.Model, userId, user.IsSuperAdmin, userOrganizationUnit, roleNames);
            if (!CanUserApproveCurrentStage(request, effectiveRole, user.IsSuperAdmin))
            {
                continue;
            }

            result.Add(new ChangeRequestListItemDto
            {
                Id = request.Id,
                ChangeCode = request.ChangeCode,
                ModelId = request.ModelId,
                ModelName = request.Model?.Name ?? "Unknown",
                Title = request.Title,
                Description = request.Description,
                Status = request.Status,
                RequesterEmail = request.Requester?.Email ?? string.Empty,
                RequesterName = GetRequesterName(request.Requester?.Email),
                CreatedAt = request.CreatedAt,
                UpdatedAt = request.UpdatedAt,
            });
        }

        return result;
    }

    public async Task<bool> CanReadRequestAsync(Guid requestId, Guid actorUserId, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == actorUserId, cancellationToken);

        if (user == null)
        {
            return false;
        }

        if (user.IsSuperAdmin)
        {
            return true;
        }

        var request = await _context.ChangeRequests
            .AsNoTracking()
            .Include(c => c.Model)
                .ThenInclude(m => m!.ModelGroup)
            .Include(c => c.Model)
                .ThenInclude(m => m!.Collaborators)
            .FirstOrDefaultAsync(c => c.Id == requestId, cancellationToken);

        if (request?.Model == null)
        {
            return false;
        }

        return await CanAccessModelAsync(actorUserId, request.Model, "viewer", cancellationToken);
    }

    public async Task<ChangeRequestDetailDto?> GetByIdAsync(Guid requestId, Guid? actorUserId = null, CancellationToken cancellationToken = default)
    {
        var request = await _context.ChangeRequests
            .AsNoTracking()
            .Include(c => c.Model)
                .ThenInclude(m => m!.ModelGroup)
            .Include(c => c.Model)
                .ThenInclude(m => m!.Collaborators)
            .Include(c => c.Requester)
            .Include(c => c.Details)
            .Include(c => c.ApprovalLogs)
                .ThenInclude(log => log.Actor)
            .FirstOrDefaultAsync(c => c.Id == requestId, cancellationToken);

        if (request == null || request.Details == null)
        {
            return null;
        }

        var workflow = DeserializeWorkflow(request.WorkflowStagesJson);
        var canSubmit = false;
        var canApprove = false;
        var canReject = false;
        var canMerge = request.Status == ChangeRequestStatuses.Approved;

        if (actorUserId.HasValue && actorUserId.Value != Guid.Empty)
        {
            var actor = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == actorUserId.Value, cancellationToken);

            if (actor != null)
            {
                canSubmit = request.Status == ChangeRequestStatuses.Draft && request.RequesterId == actorUserId.Value;

                var roleNames = await GetUserRoleNamesAsync(actorUserId.Value, cancellationToken);
                var userOrganizationUnit = ExtractOrganizationUnit(actor.LdapDistinguishedName);
                var effectiveRole = request.Model == null
                    ? null
                    : ResolveEffectiveRoleForModel(request.Model, actorUserId.Value, actor.IsSuperAdmin, userOrganizationUnit, roleNames);
                var canActOnCurrentStage = CanUserApproveCurrentStage(request, effectiveRole, actor.IsSuperAdmin);
                canApprove = canActOnCurrentStage;
                canReject = canActOnCurrentStage;
            }
        }

        return new ChangeRequestDetailDto
        {
            Id = request.Id,
            ChangeCode = request.ChangeCode,
            ModelId = request.ModelId,
            ModelName = request.Model?.Name ?? "Unknown",
            DatabaseDialect = request.Model?.DatabaseDialect ?? "PostgreSQL",
            Title = request.Title,
            Description = request.Description,
            Status = request.Status,
            RequesterEmail = request.Requester?.Email ?? string.Empty,
            CreatedAt = request.CreatedAt,
            UpdatedAt = request.UpdatedAt,
            OldDbmlSnapshot = request.Details.OldDbmlSnapshot,
            NewDbmlSnapshot = request.Details.NewDbmlSnapshot,
            GeneratedSql = request.Details.GeneratedSql,
            WorkflowStages = workflow,
            CurrentStageIndex = request.CurrentStageIndex,
            CanSubmit = canSubmit,
            CanApprove = canApprove,
            CanReject = canReject,
            CanMerge = canMerge,
            VisualDiff = BuildVisualDiff(request.Details.OldDbmlSnapshot, request.Details.NewDbmlSnapshot),
            ApprovalLogs = request.ApprovalLogs
                .OrderBy(log => log.CreatedAt)
                .Select(log => new ChangeRequestApprovalLogDto
                {
                    Id = log.Id,
                    ActorEmail = log.Actor?.Email ?? string.Empty,
                    FromStatus = log.FromStatus,
                    ToStatus = log.ToStatus,
                    Comment = log.Comment,
                    CreatedAt = log.CreatedAt,
                })
                .ToList(),
        };
    }

    public async Task<ChangeRequestDetailDto?> SubmitAsync(Guid requestId, Guid actorUserId, string? comment, CancellationToken cancellationToken = default)
    {
        var request = await _context.ChangeRequests.FirstOrDefaultAsync(c => c.Id == requestId, cancellationToken);
        if (request == null)
        {
            return null;
        }

        if (request.RequesterId != actorUserId)
        {
            throw new InvalidOperationException("Only requester can submit this change request.");
        }

        var workflow = DeserializeWorkflow(request.WorkflowStagesJson);
        if (workflow.Count == 0)
        {
            throw new InvalidOperationException("Workflow stages are not configured.");
        }

        var fromStatus = request.Status;
        request.CurrentStageIndex = 0;
        request.Status = workflow[0].PendingStatus;
        request.UpdatedAt = DateTime.UtcNow;

        AddApprovalLog(request.Id, actorUserId, fromStatus, request.Status,
            string.IsNullOrWhiteSpace(comment) ? "Change request submitted for approval." : comment);

        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(request.Id, actorUserId, cancellationToken);
    }

    public async Task<ChangeRequestDetailDto?> ApproveAsync(Guid requestId, Guid actorUserId, string? comment, CancellationToken cancellationToken = default)
    {
        var request = await _context.ChangeRequests
            .Include(c => c.Details)
            .Include(c => c.Model)
                .ThenInclude(m => m!.ModelGroup)
            .Include(c => c.Model)
                .ThenInclude(m => m!.Collaborators)
            .FirstOrDefaultAsync(c => c.Id == requestId, cancellationToken);

        if (request == null)
        {
            return null;
        }

        if (request.Details == null)
        {
            throw new InvalidOperationException("Change request details are missing.");
        }

        var actor = await _context.Users.FirstOrDefaultAsync(u => u.Id == actorUserId, cancellationToken)
            ?? throw new InvalidOperationException("Actor not found.");

        var roleNames = await GetUserRoleNamesAsync(actorUserId, cancellationToken);
        var userOrganizationUnit = ExtractOrganizationUnit(actor.LdapDistinguishedName);
        var effectiveRole = request.Model == null
            ? null
            : ResolveEffectiveRoleForModel(request.Model, actorUserId, actor.IsSuperAdmin, userOrganizationUnit, roleNames);
        var workflow = DeserializeWorkflow(request.WorkflowStagesJson);
        if (!CanUserApproveCurrentStage(request, effectiveRole, actor.IsSuperAdmin))
        {
            throw new InvalidOperationException("User is not allowed to approve current workflow stage.");
        }

        var fromStatus = request.Status;
        var currentStage = workflow[request.CurrentStageIndex];
        var nextStageIndex = currentStage.ApproveToStageIndex;

        if (nextStageIndex.HasValue && nextStageIndex.Value >= 0 && nextStageIndex.Value < workflow.Count)
        {
            request.CurrentStageIndex = nextStageIndex.Value;
            request.Status = workflow[request.CurrentStageIndex].PendingStatus;
        }
        else
        {
            request.Status = ChangeRequestStatuses.Approved;
            request.CurrentStageIndex = Math.Max(0, workflow.Count - 1);
        }

        request.UpdatedAt = DateTime.UtcNow;

        AddApprovalLog(request.Id, actorUserId, fromStatus, request.Status,
            string.IsNullOrWhiteSpace(comment) ? "Approved workflow stage." : comment);

        var shouldArchive = request.Status == ChangeRequestStatuses.Approved;

        await _context.SaveChangesAsync(cancellationToken);

        if (shouldArchive)
        {
            _ = Task.Run(() => ArchiveApprovedRequestAsync(request.Id));
        }

        return await GetByIdAsync(request.Id, actorUserId, cancellationToken);
    }

    public async Task<ChangeRequestDetailDto?> RejectAsync(Guid requestId, Guid actorUserId, string? comment, CancellationToken cancellationToken = default)
    {
        var request = await _context.ChangeRequests
            .Include(c => c.Model)
                .ThenInclude(m => m!.ModelGroup)
            .Include(c => c.Model)
                .ThenInclude(m => m!.Collaborators)
            .FirstOrDefaultAsync(c => c.Id == requestId, cancellationToken);

        if (request == null)
        {
            return null;
        }

        var actor = await _context.Users.FirstOrDefaultAsync(u => u.Id == actorUserId, cancellationToken)
            ?? throw new InvalidOperationException("Actor not found.");

        var roleNames = await GetUserRoleNamesAsync(actorUserId, cancellationToken);
        var userOrganizationUnit = ExtractOrganizationUnit(actor.LdapDistinguishedName);
        var effectiveRole = request.Model == null
            ? null
            : ResolveEffectiveRoleForModel(request.Model, actorUserId, actor.IsSuperAdmin, userOrganizationUnit, roleNames);
        if (!CanUserApproveCurrentStage(request, effectiveRole, actor.IsSuperAdmin))
        {
            throw new InvalidOperationException("User is not allowed to reject current workflow stage.");
        }

        var workflow = DeserializeWorkflow(request.WorkflowStagesJson);
        if (request.CurrentStageIndex < 0 || request.CurrentStageIndex >= workflow.Count)
        {
            throw new InvalidOperationException("Current workflow stage is invalid.");
        }

        var fromStatus = request.Status;
        var currentStage = workflow[request.CurrentStageIndex];
        var rejectTargetStageIndex = currentStage.RejectToStageIndex;

        if (rejectTargetStageIndex.HasValue
            && rejectTargetStageIndex.Value >= 0
            && rejectTargetStageIndex.Value < workflow.Count)
        {
            request.CurrentStageIndex = rejectTargetStageIndex.Value;
            request.Status = workflow[request.CurrentStageIndex].PendingStatus;
        }
        else
        {
            request.Status = ChangeRequestStatuses.Rejected;
            request.CurrentStageIndex = 0;
        }

        request.UpdatedAt = DateTime.UtcNow;

        AddApprovalLog(request.Id, actorUserId, fromStatus, request.Status,
            string.IsNullOrWhiteSpace(comment) ? "Rejected and sent back to requester." : comment);

        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(request.Id, actorUserId, cancellationToken);
    }

    public async Task<ChangeRequestDetailDto?> MarkMergedAsync(Guid requestId, Guid actorUserId, string? comment, CancellationToken cancellationToken = default)
    {
        var request = await _context.ChangeRequests.FirstOrDefaultAsync(c => c.Id == requestId, cancellationToken);
        if (request == null)
        {
            return null;
        }

        if (request.Status != ChangeRequestStatuses.Approved)
        {
            throw new InvalidOperationException("Only approved requests can be marked as merged.");
        }

        var fromStatus = request.Status;
        request.Status = ChangeRequestStatuses.Merged;
        request.UpdatedAt = DateTime.UtcNow;

        AddApprovalLog(request.Id, actorUserId, fromStatus, request.Status,
            string.IsNullOrWhiteSpace(comment) ? "Change request marked as merged." : comment);

        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(request.Id, actorUserId, cancellationToken);
    }

    public async Task<bool> DeleteAndRollbackAsync(Guid requestId, Guid actorUserId, CancellationToken cancellationToken = default)
    {
        var request = await _context.ChangeRequests
            .Include(c => c.Model)
            .Include(c => c.Details)
            .FirstOrDefaultAsync(c => c.Id == requestId, cancellationToken);

        if (request == null)
        {
            return false;
        }

        if (request.Model == null)
        {
            throw new InvalidOperationException("Related model for change request could not be found.");
        }

        var oldSnapshot = request.Details?.OldDbmlSnapshot ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(oldSnapshot))
        {
            var latestMainVersion = await _context.ModelVersions
                .Where(v => v.ModelId == request.ModelId && v.BranchName == "main")
                .OrderByDescending(v => v.VersionNumber)
                .FirstOrDefaultAsync(cancellationToken);

            var oldNormalized = NormalizeSnapshot(oldSnapshot);
            var latestNormalized = NormalizeSnapshot(latestMainVersion?.DbmlContent ?? string.Empty);

            // If latest model content differs from the previous snapshot in CR, add a rollback version.
            if (!string.Equals(oldNormalized, latestNormalized, StringComparison.Ordinal))
            {
                var nextVersionNumber = (latestMainVersion?.VersionNumber ?? 0) + 1;
                _context.ModelVersions.Add(new ModelVersion
                {
                    Id = Guid.NewGuid(),
                    ModelId = request.ModelId,
                    DbmlContent = oldSnapshot,
                    VersionNumber = nextVersionNumber,
                    CreatedBy = actorUserId,
                    CreatedAt = DateTime.UtcNow,
                    ChangeSummary = $"Rollback due to deleted change request {request.ChangeCode}",
                    ParentVersionId = latestMainVersion?.Id,
                    BranchName = "main",
                    IsLocked = false,
                });

                request.Model.UpdatedAt = DateTime.UtcNow;
            }
        }

        _context.ChangeRequests.Remove(request);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private List<ChangeRequestWorkflowStageDto> GetDefaultWorkflow()
    {
        return new List<ChangeRequestWorkflowStageDto>
        {
            new()
            {
                Name = "Business Domain Architect",
                RequiredRole = "domain_architect",
                PendingStatus = ChangeRequestStatuses.PendingBusiness,
                ApproveToStageIndex = 1,
                RejectToStageIndex = null,
            },
            new()
            {
                Name = "Data Architect",
                RequiredRole = "data_architect",
                PendingStatus = ChangeRequestStatuses.PendingArchitect,
                ApproveToStageIndex = null,
                RejectToStageIndex = 0,
            },
        };
    }

    private async Task<List<ChangeRequestWorkflowStageDto>> GetActiveWorkflowOrDefaultAsync(CancellationToken cancellationToken)
    {
        var activeTemplate = await _context.WorkflowTemplates
            .AsNoTracking()
            .Where(t => t.IsActive)
            .OrderByDescending(t => t.UpdatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (activeTemplate == null || string.IsNullOrWhiteSpace(activeTemplate.StagesJson))
        {
            return GetDefaultWorkflow();
        }

        try
        {
            List<ChangeRequestWorkflowStageDto>? parsedStages;
            var raw = activeTemplate.StagesJson.TrimStart();

            if (raw.StartsWith("[", StringComparison.Ordinal))
            {
                parsedStages = JsonSerializer.Deserialize<List<ChangeRequestWorkflowStageDto>>(activeTemplate.StagesJson);
            }
            else
            {
                parsedStages = null;
                using var doc = JsonDocument.Parse(activeTemplate.StagesJson);
                if (doc.RootElement.ValueKind == JsonValueKind.Object)
                {
                    foreach (var prop in doc.RootElement.EnumerateObject())
                    {
                        if ((string.Equals(prop.Name, "Stages", StringComparison.OrdinalIgnoreCase)
                            || string.Equals(prop.Name, "stages", StringComparison.OrdinalIgnoreCase))
                            && prop.Value.ValueKind == JsonValueKind.Array)
                        {
                            parsedStages = JsonSerializer.Deserialize<List<ChangeRequestWorkflowStageDto>>(prop.Value.GetRawText());
                            break;
                        }
                    }
                }
            }

            if (parsedStages != null && parsedStages.Count > 0)
            {
                return NormalizeWorkflow(parsedStages);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Active workflow template could not be parsed, falling back to default workflow.");
        }

        return GetDefaultWorkflow();
    }

    private static List<ChangeRequestWorkflowStageDto> NormalizeWorkflow(List<ChangeRequestWorkflowStageDto> input)
    {
        var candidateStages = input
            .Where(stage => !string.IsNullOrWhiteSpace(stage.RequiredRole))
            .ToList();

        var normalized = new List<ChangeRequestWorkflowStageDto>();
        for (var i = 0; i < candidateStages.Count; i++)
        {
            var stage = candidateStages[i];
            int? approveTarget = stage.ApproveToStageIndex;
            int? rejectTarget = stage.RejectToStageIndex;

            if (!approveTarget.HasValue && i + 1 < candidateStages.Count)
            {
                approveTarget = i + 1;
            }

            if (approveTarget.HasValue && (approveTarget.Value < 0 || approveTarget.Value >= candidateStages.Count || approveTarget.Value == i))
            {
                approveTarget = null;
            }

            if (rejectTarget.HasValue && (rejectTarget.Value < 0 || rejectTarget.Value >= candidateStages.Count || rejectTarget.Value == i))
            {
                rejectTarget = null;
            }

            normalized.Add(new ChangeRequestWorkflowStageDto
            {
                Name = string.IsNullOrWhiteSpace(stage.Name) ? stage.RequiredRole : stage.Name.Trim(),
                RequiredRole = stage.RequiredRole.Trim().ToLowerInvariant(),
                PendingStatus = string.IsNullOrWhiteSpace(stage.PendingStatus)
                    ? ChangeRequestStatuses.PendingBusiness
                    : stage.PendingStatus.Trim(),
                ApproveToStageIndex = approveTarget,
                RejectToStageIndex = rejectTarget,
            });
        }

        if (normalized.Count == 0)
        {
            throw new InvalidOperationException("Workflow stages are invalid.");
        }

        return normalized;
    }

    private static List<ChangeRequestWorkflowStageDto> DeserializeWorkflow(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new List<ChangeRequestWorkflowStageDto>();
        }

        try
        {
            return JsonSerializer.Deserialize<List<ChangeRequestWorkflowStageDto>>(json) ?? new List<ChangeRequestWorkflowStageDto>();
        }
        catch
        {
            return new List<ChangeRequestWorkflowStageDto>();
        }
    }

    private bool CanUserApproveCurrentStage(ChangeRequest request, string? effectiveRole, bool isSuperAdmin)
    {
        if (isSuperAdmin)
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(effectiveRole))
        {
            return false;
        }

        if (string.Equals(effectiveRole, "admin", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var workflow = DeserializeWorkflow(request.WorkflowStagesJson);
        if (workflow.Count == 0)
        {
            return false;
        }

        var stageIndex = request.CurrentStageIndex;
        if (stageIndex < 0 || stageIndex >= workflow.Count)
        {
            return false;
        }

        var requiredRole = workflow[stageIndex].RequiredRole.Trim().ToLowerInvariant();
        return DoesRoleMatchRequiredRole(requiredRole, new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            effectiveRole.Trim().ToLowerInvariant()
        });
    }

    private static bool DoesRoleMatchRequiredRole(string requiredRole, ISet<string> roleNames)
    {
        if (roleNames.Contains(requiredRole))
        {
            return true;
        }

        if (requiredRole == "domain_architect"
            || requiredRole == "business_domain_architect"
            || requiredRole == "business-architect"
            || requiredRole == "business_architect")
        {
            return roleNames.Contains("domain_architect")
                || roleNames.Contains("business_domain_architect")
                || roleNames.Contains("business-architect")
                || roleNames.Contains("business_architect");
        }

        return false;
    }

    private static bool CanUserSeePendingByRole(string status, ISet<string> roleNames, bool isSuperAdmin)
    {
        if (isSuperAdmin || roleNames.Contains("admin"))
        {
            return status == ChangeRequestStatuses.PendingBusiness || status == ChangeRequestStatuses.PendingArchitect;
        }

        if (status == ChangeRequestStatuses.PendingBusiness)
        {
            return roleNames.Contains("domain_architect")
                || roleNames.Contains("business_domain_architect")
                || roleNames.Contains("business-architect")
                || roleNames.Contains("business_architect");
        }

        if (status == ChangeRequestStatuses.PendingArchitect)
        {
            return roleNames.Contains("data_architect");
        }

        return false;
    }

    private async Task<HashSet<string>> GetUserRoleNamesAsync(Guid userId, CancellationToken cancellationToken)
    {
        var roles = await _context.UserApplicationRoles
            .AsNoTracking()
            .Include(ur => ur.Role)
            .Where(ur => ur.UserId == userId && ur.Role != null && ur.Role.IsActive)
            .Select(ur => ur.Role!.Name)
            .ToListAsync(cancellationToken);

        return roles.Select(r => r.ToLowerInvariant()).ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private static string ExtractOrganizationUnit(string? distinguishedName)
    {
        if (string.IsNullOrWhiteSpace(distinguishedName))
        {
            return string.Empty;
        }

        var ous = distinguishedName
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Trim())
            .Where(part => part.StartsWith("OU=", StringComparison.OrdinalIgnoreCase) && part.Length > 3)
            .Select(part => part[3..].Trim())
            .Where(part => !string.IsNullOrWhiteSpace(part))
            .ToList();

        return ous.Count == 0 ? string.Empty : string.Join(" / ", ous);
    }

    private static string NormalizeOuKey(string? value)
    {
        return (value ?? string.Empty).Trim().ToLowerInvariant();
    }

    private static string NormalizeRoleName(string? roleName)
    {
        var normalized = (roleName ?? string.Empty).Trim().ToLowerInvariant();
        return normalized switch
        {
            "business_domain_architect" => "domain_architect",
            "business-architect" => "domain_architect",
            "business_architect" => "domain_architect",
            _ => normalized,
        };
    }

    private static bool OuMatchesModelGroup(string userOrganizationUnit, string? modelGroupName)
    {
        var normalizedUserOu = NormalizeOuKey(userOrganizationUnit);
        var normalizedModelOu = NormalizeOuKey(modelGroupName);
        if (string.IsNullOrWhiteSpace(normalizedUserOu) || string.IsNullOrWhiteSpace(normalizedModelOu))
        {
            return false;
        }

        var userOuParts = normalizedUserOu.Split('/').Select(part => part.Trim()).ToList();
        var modelOuParts = normalizedModelOu.Split('/').Select(part => part.Trim()).ToList();

        return modelOuParts.All(modelPart =>
            userOuParts.Any(userPart => userPart.Equals(modelPart, StringComparison.OrdinalIgnoreCase)));
    }

    private static bool IsGloballyScopedRole(string normalizedRole)
    {
        return normalizedRole == "admin" || normalizedRole == "data_architect";
    }

    private static string? ApplyOuPolicyToRole(
        string? candidateRole,
        string userOrganizationUnit,
        string? modelGroupName)
    {
        var normalizedRole = NormalizeRoleName(candidateRole);
        if (string.IsNullOrWhiteSpace(normalizedRole))
        {
            return null;
        }

        if (normalizedRole == "owner")
        {
            return normalizedRole;
        }

        if (IsGloballyScopedRole(normalizedRole))
        {
            return normalizedRole;
        }

        return OuMatchesModelGroup(userOrganizationUnit, modelGroupName)
            ? normalizedRole
            : null;
    }

    private static string? ResolveGlobalDefaultRole(ISet<string> userApplicationRoles)
    {
        foreach (var roleName in GlobalDefaultModelRolesByPriority)
        {
            if (userApplicationRoles.Contains(roleName))
            {
                return roleName;
            }
        }

        return null;
    }

    private static string? ResolveDefaultRoleFromOu(
        string userOrganizationUnit,
        string? modelGroupName,
        ISet<string> userApplicationRoles)
    {
        if (userApplicationRoles.Count == 0)
        {
            return null;
        }

        var globalDefaultRole = ResolveGlobalDefaultRole(userApplicationRoles);
        if (!string.IsNullOrWhiteSpace(globalDefaultRole))
        {
            return globalDefaultRole;
        }

        // Data architects are globally scoped across models.
        if (userApplicationRoles.Contains("data_architect"))
        {
            return "data_architect";
        }

        if (!OuMatchesModelGroup(userOrganizationUnit, modelGroupName))
        {
            return null;
        }

        // Domain architects are scoped by matching Organization Unit.
        if (userApplicationRoles.Contains("domain_architect")
            || userApplicationRoles.Contains("business_domain_architect")
            || userApplicationRoles.Contains("business-architect")
            || userApplicationRoles.Contains("business_architect"))
        {
            return "domain_architect";
        }

        foreach (var roleName in ModelScopedApplicationRolesByPriority)
        {
            if (userApplicationRoles.Contains(roleName))
            {
                return roleName;
            }
        }

        return null;
    }

    private static string? ResolveEffectiveRoleForModel(
        Model model,
        Guid userId,
        bool isSuperAdmin,
        string userOrganizationUnit,
        ISet<string> userApplicationRoles)
    {
        if (isSuperAdmin)
        {
            return "admin";
        }

        if (model.OwnerId == userId)
        {
            return "owner";
        }

        var explicitCollaboration = model.Collaborators
            .FirstOrDefault(collaborator => collaborator.UserId == userId);

        if (explicitCollaboration != null)
        {
            return ApplyOuPolicyToRole(explicitCollaboration.Role, userOrganizationUnit, model.ModelGroup?.Name);
        }

        var defaultRole = ResolveDefaultRoleFromOu(userOrganizationUnit, model.ModelGroup?.Name, userApplicationRoles);
        return ApplyOuPolicyToRole(defaultRole, userOrganizationUnit, model.ModelGroup?.Name);
    }

    private async Task<bool> CanAccessModelAsync(Guid userId, Model model, string minimumRole, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            return false;
        }

        if (user.IsSuperAdmin)
        {
            return true;
        }

        var userApplicationRoles = await GetUserRoleNamesAsync(userId, cancellationToken);
        var userOrganizationUnit = ExtractOrganizationUnit(user.LdapDistinguishedName);
        var effectiveRole = ResolveEffectiveRoleForModel(
            model,
            userId,
            user.IsSuperAdmin,
            userOrganizationUnit,
            userApplicationRoles);

        if (string.IsNullOrWhiteSpace(effectiveRole))
        {
            return false;
        }

        return RoleHierarchy.GetValueOrDefault(effectiveRole, 0) >= RoleHierarchy.GetValueOrDefault(minimumRole, 0);
    }

    private async Task<HashSet<Guid>> GetAccessibleModelIdsAsync(
        Guid userId,
        string minimumRole,
        IReadOnlyCollection<Guid> candidateModelIds,
        CancellationToken cancellationToken)
    {
        if (candidateModelIds.Count == 0)
        {
            return new HashSet<Guid>();
        }

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            return new HashSet<Guid>();
        }

        if (user.IsSuperAdmin)
        {
            return candidateModelIds.ToHashSet();
        }

        var models = await _context.Models
            .AsNoTracking()
            .Include(m => m.ModelGroup)
            .Include(m => m.Collaborators)
            .Where(m => candidateModelIds.Contains(m.Id))
            .ToListAsync(cancellationToken);

        var userApplicationRoles = await GetUserRoleNamesAsync(userId, cancellationToken);
        var userOrganizationUnit = ExtractOrganizationUnit(user.LdapDistinguishedName);

        var allowed = new HashSet<Guid>();
        foreach (var model in models)
        {
            var effectiveRole = ResolveEffectiveRoleForModel(
                model,
                userId,
                user.IsSuperAdmin,
                userOrganizationUnit,
                userApplicationRoles);

            if (!string.IsNullOrWhiteSpace(effectiveRole)
                && RoleHierarchy.GetValueOrDefault(effectiveRole, 0) >= RoleHierarchy.GetValueOrDefault(minimumRole, 0))
            {
                allowed.Add(model.Id);
            }
        }

        return allowed;
    }

    private static ChangeRequestListItemDto MapListItem(ChangeRequest request)
    {
        return new ChangeRequestListItemDto
        {
            Id = request.Id,
            ChangeCode = request.ChangeCode,
            ModelId = request.ModelId,
            ModelName = request.Model?.Name ?? "Unknown",
            Title = request.Title,
            Description = request.Description,
            Status = request.Status,
            RequesterEmail = request.Requester?.Email ?? string.Empty,
            RequesterName = GetRequesterName(request.Requester?.Email),
            CreatedAt = request.CreatedAt,
            UpdatedAt = request.UpdatedAt,
        };
    }

    private static string GetRequesterName(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return string.Empty;
        }

        var atIndex = email.IndexOf('@');
        return atIndex <= 0 ? email : email[..atIndex];
    }

    private static DateTime? NormalizeToUtc(DateTime? value)
    {
        if (!value.HasValue)
        {
            return null;
        }

        return value.Value.Kind switch
        {
            DateTimeKind.Utc => value.Value,
            DateTimeKind.Local => value.Value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value.Value, DateTimeKind.Utc),
        };
    }

    private async Task<string> GenerateNextChangeCodeAsync(CancellationToken cancellationToken)
    {
        var nextValue = await _context.Database
            .SqlQueryRaw<long>("SELECT nextval('change_request_code_seq') AS \"Value\"")
            .SingleAsync(cancellationToken);

        return $"CR-{nextValue:D5}";
    }

    private void AddApprovalLog(
        Guid changeRequestId,
        Guid actorUserId,
        string? fromStatus,
        string toStatus,
        string? comment)
    {
        _context.ChangeRequestApprovalLogs.Add(new ChangeRequestApprovalLog
        {
            Id = Guid.NewGuid(),
            ChangeRequestId = changeRequestId,
            ActionBy = actorUserId,
            FromStatus = fromStatus,
            ToStatus = toStatus,
            Comment = comment,
            CreatedAt = DateTime.UtcNow,
        });
    }

    private string GenerateSqlScript(string oldDbml, string newDbml, string databaseDialect)
    {
        var oldErd = _dbmlParser.ParseDbmlToErd(oldDbml ?? string.Empty);
        var newErd = _dbmlParser.ParseDbmlToErd(newDbml ?? string.Empty);

        var oldTables = oldErd.Nodes.ToDictionary(t => t.TableName, t => t, StringComparer.OrdinalIgnoreCase);
        var newTables = newErd.Nodes.ToDictionary(t => t.TableName, t => t, StringComparer.OrdinalIgnoreCase);

        var sb = new StringBuilder();
        sb.AppendLine($"-- Generated SQL Script ({databaseDialect})");
        sb.AppendLine($"-- Generated At: {DateTime.UtcNow:O}");
        sb.AppendLine();

        foreach (var added in newTables.Values.Where(t => !oldTables.ContainsKey(t.TableName)))
        {
            sb.AppendLine(GenerateCreateTable(databaseDialect, added));
            sb.AppendLine();
        }

        foreach (var removed in oldTables.Values.Where(t => !newTables.ContainsKey(t.TableName)))
        {
            sb.AppendLine($"DROP TABLE {EscapeIdentifier(databaseDialect, removed.TableName)};");
            sb.AppendLine();
        }

        foreach (var table in newTables.Values.Where(t => oldTables.ContainsKey(t.TableName)))
        {
            var previous = oldTables[table.TableName];
            var oldColumns = previous.Columns.ToDictionary(c => c.ColumnName, c => c, StringComparer.OrdinalIgnoreCase);
            var newColumns = table.Columns.ToDictionary(c => c.ColumnName, c => c, StringComparer.OrdinalIgnoreCase);

            foreach (var addedColumn in newColumns.Values.Where(c => !oldColumns.ContainsKey(c.ColumnName)))
            {
                sb.AppendLine($"ALTER TABLE {EscapeIdentifier(databaseDialect, table.TableName)} ADD {BuildColumnDef(databaseDialect, addedColumn)};");
            }

            foreach (var removedColumn in oldColumns.Values.Where(c => !newColumns.ContainsKey(c.ColumnName)))
            {
                sb.AppendLine($"ALTER TABLE {EscapeIdentifier(databaseDialect, table.TableName)} DROP COLUMN {EscapeIdentifier(databaseDialect, removedColumn.ColumnName)};");
            }

            foreach (var sameColumn in newColumns.Values.Where(c => oldColumns.ContainsKey(c.ColumnName)))
            {
                var oldColumn = oldColumns[sameColumn.ColumnName];
                if (!string.Equals(oldColumn.ColumnType, sameColumn.ColumnType, StringComparison.OrdinalIgnoreCase)
                    || oldColumn.IsNotNull != sameColumn.IsNotNull)
                {
                    sb.AppendLine(GenerateAlterColumn(databaseDialect, table.TableName, sameColumn));
                }
            }
        }

        return sb.ToString().Trim();
    }

    private static string GenerateCreateTable(string dialect, DbmlTableNodeDto table)
    {
        var cols = table.Columns.Select(c => BuildColumnDef(dialect, c));
        return $"CREATE TABLE {EscapeIdentifier(dialect, table.TableName)} (\n  {string.Join(",\n  ", cols)}\n);";
    }

    private static string BuildColumnDef(string dialect, DbmlColumnDto column)
    {
        var attrs = new List<string>();
        if (column.IsPrimaryKey) attrs.Add("PRIMARY KEY");
        if (column.IsNotNull) attrs.Add("NOT NULL");
        if (column.IsUnique) attrs.Add("UNIQUE");

        var increment = column.IsAutoIncrement
            ? dialect.Trim().ToLowerInvariant() switch
            {
                "postgresql" => " GENERATED BY DEFAULT AS IDENTITY",
                "sqlserver" => " IDENTITY(1,1)",
                "mysql" => " AUTO_INCREMENT",
                "oracle" => " GENERATED BY DEFAULT AS IDENTITY",
                _ => string.Empty,
            }
            : string.Empty;

        var attrText = attrs.Count > 0 ? " " + string.Join(" ", attrs) : string.Empty;
        return $"{EscapeIdentifier(dialect, column.ColumnName)} {column.ColumnType}{increment}{attrText}";
    }

    private static string GenerateAlterColumn(string dialect, string tableName, DbmlColumnDto column)
    {
        var d = dialect.Trim().ToLowerInvariant();
        var table = EscapeIdentifier(dialect, tableName);
        var name = EscapeIdentifier(dialect, column.ColumnName);
        var nullClause = column.IsNotNull ? "NOT NULL" : "NULL";

        return d switch
        {
            "sqlserver" => $"ALTER TABLE {table} ALTER COLUMN {name} {column.ColumnType} {nullClause};",
            "mysql" => $"ALTER TABLE {table} MODIFY COLUMN {name} {column.ColumnType} {nullClause};",
            "oracle" => column.IsNotNull
                ? $"ALTER TABLE {table} MODIFY ({name} {column.ColumnType} NOT NULL);"
                : $"ALTER TABLE {table} MODIFY ({name} {column.ColumnType} NULL);",
            _ => $"ALTER TABLE {table} ALTER COLUMN {name} TYPE {column.ColumnType};",
        };
    }

    private static string EscapeIdentifier(string dialect, string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return name;

        var d = dialect.Trim().ToLowerInvariant();
        return d switch
        {
            "sqlserver" => $"[{name}]",
            "mysql" => $"`{name}`",
            _ => $"\"{name}\"",
        };
    }

    private List<ChangeRequestDiffTableDto> BuildVisualDiff(string oldDbml, string newDbml)
    {
        var oldErd = _dbmlParser.ParseDbmlToErd(oldDbml ?? string.Empty);
        var newErd = _dbmlParser.ParseDbmlToErd(newDbml ?? string.Empty);

        var oldTables = oldErd.Nodes.ToDictionary(t => t.TableName, t => t, StringComparer.OrdinalIgnoreCase);
        var newTables = newErd.Nodes.ToDictionary(t => t.TableName, t => t, StringComparer.OrdinalIgnoreCase);

        var tableNames = oldTables.Keys.Union(newTables.Keys, StringComparer.OrdinalIgnoreCase)
            .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var result = new List<ChangeRequestDiffTableDto>();

        foreach (var tableName in tableNames)
        {
            if (!oldTables.ContainsKey(tableName))
            {
                result.Add(new ChangeRequestDiffTableDto
                {
                    TableName = tableName,
                    Status = "added",
                    Columns = newTables[tableName].Columns.Select(c => new ChangeRequestDiffColumnDto
                    {
                        Name = c.ColumnName,
                        Status = "added",
                        NewType = c.ColumnType,
                    }).ToList(),
                });
                continue;
            }

            if (!newTables.ContainsKey(tableName))
            {
                result.Add(new ChangeRequestDiffTableDto
                {
                    TableName = tableName,
                    Status = "removed",
                    Columns = oldTables[tableName].Columns.Select(c => new ChangeRequestDiffColumnDto
                    {
                        Name = c.ColumnName,
                        Status = "removed",
                        OldType = c.ColumnType,
                    }).ToList(),
                });
                continue;
            }

            var oldColumns = oldTables[tableName].Columns.ToDictionary(c => c.ColumnName, c => c, StringComparer.OrdinalIgnoreCase);
            var newColumns = newTables[tableName].Columns.ToDictionary(c => c.ColumnName, c => c, StringComparer.OrdinalIgnoreCase);
            var columnNames = oldColumns.Keys.Union(newColumns.Keys, StringComparer.OrdinalIgnoreCase)
                .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
                .ToList();

            var columns = new List<ChangeRequestDiffColumnDto>();
            foreach (var columnName in columnNames)
            {
                if (!oldColumns.ContainsKey(columnName))
                {
                    columns.Add(new ChangeRequestDiffColumnDto
                    {
                        Name = columnName,
                        Status = "added",
                        NewType = newColumns[columnName].ColumnType,
                    });
                    continue;
                }

                if (!newColumns.ContainsKey(columnName))
                {
                    columns.Add(new ChangeRequestDiffColumnDto
                    {
                        Name = columnName,
                        Status = "removed",
                        OldType = oldColumns[columnName].ColumnType,
                    });
                    continue;
                }

                var oldColumn = oldColumns[columnName];
                var newColumn = newColumns[columnName];
                var changed = !string.Equals(oldColumn.ColumnType, newColumn.ColumnType, StringComparison.OrdinalIgnoreCase)
                              || oldColumn.IsNotNull != newColumn.IsNotNull
                              || oldColumn.IsPrimaryKey != newColumn.IsPrimaryKey;

                columns.Add(new ChangeRequestDiffColumnDto
                {
                    Name = columnName,
                    Status = changed ? "changed" : "unchanged",
                    OldType = oldColumn.ColumnType,
                    NewType = newColumn.ColumnType,
                });
            }

            result.Add(new ChangeRequestDiffTableDto
            {
                TableName = tableName,
                Status = columns.Any(c => c.Status != "unchanged") ? "changed" : "unchanged",
                Columns = columns,
            });
        }

        return result;
    }

    private async Task ArchiveApprovedRequestAsync(Guid requestId)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var archiveContext = scope.ServiceProvider.GetRequiredService<DataModelerDbContext>();

            var request = await archiveContext.ChangeRequests
                .Include(c => c.Model)
                .Include(c => c.Details)
                .FirstOrDefaultAsync(c => c.Id == requestId);

            if (request?.Model == null || request.Details == null)
            {
                return;
            }

            var settings = await archiveContext.DevopsSettings.AsNoTracking().FirstOrDefaultAsync();
            if (settings == null || !settings.IsEnabled || string.IsNullOrWhiteSpace(settings.InstanceUrl) || string.IsNullOrWhiteSpace(settings.PatToken))
            {
                _logger.LogWarning("Approved change request {RequestId} could not be archived: Azure DevOps settings missing or disabled.", requestId);
                return;
            }

            var mapping = await archiveContext.DevopsRepositoryMappings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ModelId == request.ModelId && x.IsEnabled);

            if (mapping == null)
            {
                _logger.LogWarning("Approved change request {RequestId} could not be archived: no enabled repository mapping for model {ModelId}.", requestId, request.ModelId);
                return;
            }

            var dbmlPath = NormalizeRepoPath(mapping.FilePath);
            var sqlPath = BuildSqlArchivePath(dbmlPath, request.Model.Name, request.Id, request.UpdatedAt);
            var commitMessage = $"Archive approved change request #{request.Id} for model '{request.Model.Name}'";

            var files = new List<ArchiveFileChange>
            {
                new(dbmlPath, request.Details.NewDbmlSnapshot),
                new(sqlPath, request.Details.GeneratedSql)
            };

            var commitId = await PushFilesToAzureDevOpsAsync(
                settings.InstanceUrl,
                settings.PatToken,
                mapping.ProjectName,
                mapping.RepositoryName,
                mapping.BranchName,
                commitMessage,
                files);

            _logger.LogInformation(
                "Approved change request {RequestId} archived to Azure DevOps. Project={Project} Repository={Repository} Branch={Branch} Commit={CommitId}",
                requestId,
                mapping.ProjectName,
                mapping.RepositoryName,
                mapping.BranchName,
                commitId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to archive approved change request {RequestId}", requestId);
        }
    }

    private static string NormalizeRepoPath(string path)
    {
        var normalized = string.IsNullOrWhiteSpace(path) ? "/models/model.dbml" : path.Trim();
        normalized = normalized.Replace("\\", "/");
        return normalized.StartsWith('/') ? normalized : "/" + normalized;
    }

    private static string BuildSqlArchivePath(string dbmlPath, string modelName, Guid requestId, DateTime updatedAt)
    {
        var trimmedPath = dbmlPath.Trim('/');
        var folder = "models";
        var slashIndex = trimmedPath.LastIndexOf('/');
        if (slashIndex > 0)
        {
            folder = trimmedPath[..slashIndex];
        }

        var safeModelName = new string(modelName
            .Select(ch => char.IsLetterOrDigit(ch) ? char.ToLowerInvariant(ch) : '_')
            .ToArray())
            .Trim('_');
        if (string.IsNullOrWhiteSpace(safeModelName))
        {
            safeModelName = "model";
        }

        var timestamp = updatedAt.ToUniversalTime().ToString("yyyyMMdd_HHmmss");
        return $"/{folder}/sql/{safeModelName}_{timestamp}_cr_{requestId:N}.sql";
    }

    private async Task<string> PushFilesToAzureDevOpsAsync(
        string instanceUrl,
        string patToken,
        string projectName,
        string repositoryName,
        string branchName,
        string commitMessage,
        IReadOnlyList<ArchiveFileChange> files)
    {
        if (files.Count == 0)
        {
            throw new InvalidOperationException("No files to archive.");
        }

        using var client = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(45)
        };

        var auth = Convert.ToBase64String(Encoding.ASCII.GetBytes($":{patToken}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", auth);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var apiBase = $"{instanceUrl.TrimEnd('/')}/{Uri.EscapeDataString(projectName)}/_apis/git/repositories/{Uri.EscapeDataString(repositoryName)}";
        var oldObjectId = await GetBranchObjectIdAsync(client, apiBase, branchName);

        var changes = new List<object>(files.Count);
        foreach (var file in files)
        {
            var filePath = NormalizeRepoPath(file.Path);
            var changeType = await FileExistsOnBranchAsync(client, apiBase, branchName, filePath) ? "edit" : "add";
            changes.Add(new
            {
                changeType,
                item = new { path = filePath },
                newContent = new
                {
                    content = file.Content ?? string.Empty,
                    contentType = "rawtext"
                }
            });
        }

        var payload = new
        {
            refUpdates = new[]
            {
                new
                {
                    name = $"refs/heads/{branchName}",
                    oldObjectId
                }
            },
            commits = new[]
            {
                new
                {
                    comment = commitMessage,
                    changes
                }
            }
        };

        var pushUrl = $"{apiBase}/pushes?api-version=7.1-preview.2";
        using var request = new HttpRequestMessage(HttpMethod.Post, pushUrl)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };

        using var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Azure DevOps push failed ({(int)response.StatusCode} {response.StatusCode}): {body}");
        }

        using var document = JsonDocument.Parse(body);
        if (document.RootElement.TryGetProperty("commits", out var commitsElement)
            && commitsElement.ValueKind == JsonValueKind.Array
            && commitsElement.GetArrayLength() > 0)
        {
            var firstCommit = commitsElement[0];
            if (firstCommit.TryGetProperty("commitId", out var commitIdElement))
            {
                return commitIdElement.GetString() ?? "unknown";
            }
        }

        return "unknown";
    }

    private static async Task<string> GetBranchObjectIdAsync(HttpClient client, string apiBase, string branchName)
    {
        var refsUrl = $"{apiBase}/refs?filter={Uri.EscapeDataString($"heads/{branchName}")}&api-version=7.1-preview.1";
        using var response = await client.GetAsync(refsUrl);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Could not read Azure DevOps branch '{branchName}' ({(int)response.StatusCode} {response.StatusCode}): {body}");
        }

        using var document = JsonDocument.Parse(body);
        if (!document.RootElement.TryGetProperty("value", out var refsElement)
            || refsElement.ValueKind != JsonValueKind.Array
            || refsElement.GetArrayLength() == 0)
        {
            throw new InvalidOperationException($"Azure DevOps branch '{branchName}' not found.");
        }

        var firstRef = refsElement[0];
        if (!firstRef.TryGetProperty("objectId", out var objectIdElement))
        {
            throw new InvalidOperationException($"Azure DevOps branch '{branchName}' does not provide an objectId.");
        }

        return objectIdElement.GetString() ?? throw new InvalidOperationException($"Azure DevOps branch '{branchName}' objectId is empty.");
    }

    private static async Task<bool> FileExistsOnBranchAsync(HttpClient client, string apiBase, string branchName, string filePath)
    {
        var itemUrl = $"{apiBase}/items?path={Uri.EscapeDataString(filePath)}&versionDescriptor.version={Uri.EscapeDataString(branchName)}&versionDescriptor.versionType=branch&includeContentMetadata=true&api-version=7.1-preview.1";
        using var response = await client.GetAsync(itemUrl);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Could not check file '{filePath}' on branch '{branchName}' ({(int)response.StatusCode} {response.StatusCode}): {body}");
        }

        return true;
    }

    private sealed record ArchiveFileChange(string Path, string Content);
}
