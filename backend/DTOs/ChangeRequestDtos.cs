using System;
using System.Collections.Generic;

namespace DataModeler.API.DTOs;

public static class ChangeRequestStatuses
{
    public const string Draft = "Draft";
    public const string PendingArchitect = "Pending_Architect";
    public const string PendingBusiness = "Pending_Business";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
    public const string Merged = "Merged";
}

public class ChangeRequestWorkflowStageDto
{
    public string Name { get; set; } = string.Empty;
    public string RequiredRole { get; set; } = string.Empty;
    public string PendingStatus { get; set; } = ChangeRequestStatuses.PendingBusiness;
    public int? ApproveToStageIndex { get; set; }
    public int? RejectToStageIndex { get; set; }
}

public class CreateChangeRequestDto
{
    public Guid ModelId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string NewDbmlSnapshot { get; set; } = string.Empty;
    public bool SubmitForApproval { get; set; } = true;
    public List<ChangeRequestWorkflowStageDto>? WorkflowStages { get; set; }
}

public class ChangeRequestListItemDto
{
    public Guid Id { get; set; }
    public string ChangeCode { get; set; } = string.Empty;
    public Guid ModelId { get; set; }
    public string ModelName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = ChangeRequestStatuses.Draft;
    public string RequesterEmail { get; set; } = string.Empty;
    public string RequesterName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ChangeRequestDiffColumnDto
{
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = "unchanged";
    public string? OldType { get; set; }
    public string? NewType { get; set; }
}

public class ChangeRequestDiffTableDto
{
    public string TableName { get; set; } = string.Empty;
    public string Status { get; set; } = "unchanged";
    public List<ChangeRequestDiffColumnDto> Columns { get; set; } = new();
}

public class ChangeRequestApprovalLogDto
{
    public Guid Id { get; set; }
    public string ActorEmail { get; set; } = string.Empty;
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = string.Empty;
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ChangeRequestDetailDto
{
    public Guid Id { get; set; }
    public string ChangeCode { get; set; } = string.Empty;
    public Guid ModelId { get; set; }
    public string ModelName { get; set; } = string.Empty;
    public string DatabaseDialect { get; set; } = "PostgreSQL";
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = ChangeRequestStatuses.Draft;
    public string RequesterEmail { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string OldDbmlSnapshot { get; set; } = string.Empty;
    public string NewDbmlSnapshot { get; set; } = string.Empty;
    public string GeneratedSql { get; set; } = string.Empty;
    public List<ChangeRequestWorkflowStageDto> WorkflowStages { get; set; } = new();
    public int CurrentStageIndex { get; set; }
    public bool CanSubmit { get; set; }
    public bool CanApprove { get; set; }
    public bool CanReject { get; set; }
    public bool CanMerge { get; set; }
    public List<ChangeRequestDiffTableDto> VisualDiff { get; set; } = new();
    public List<ChangeRequestApprovalLogDto> ApprovalLogs { get; set; } = new();
}

public class ChangeRequestActionDto
{
    public string? Comment { get; set; }
}

public class ChangeRequestFilterDto
{
    public string Mode { get; set; } = "mine";
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Requester { get; set; }
    public string? Status { get; set; }
}
