using System;
using System.Collections.Generic;

namespace DataModeler.API.DTOs;

// ============ AD Settings DTOs ============

public class AdSettingsDto
{
    public AdSettingDetailDto? Ldap { get; set; }
    public AdSettingDetailDto? AzureAd { get; set; }
}

public class AdSettingDetailDto
{
    public string Type { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public Dictionary<string, object> Config { get; set; } = new();
    public bool? TestStatus { get; set; }
    public DateTime? LastTestedAt { get; set; }
}

public class SaveAdSettingsRequestDto
{
    public List<AdProviderSettingDto> Providers { get; set; } = new();
}

public class AdProviderSettingDto
{
    public string Type { get; set; } = string.Empty; // ldap or azure_ad
    public bool IsEnabled { get; set; }
    public Dictionary<string, object> Config { get; set; } = new();
}

public class TestAdConnectionRequestDto
{
    public string Provider { get; set; } = string.Empty; // ldap or azure_ad
    public Dictionary<string, object> Config { get; set; } = new();
}

public class TestConnectionResponseDto
{
    public string Provider { get; set; } = string.Empty;
    public bool IsSuccessful { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class LdapConfigDto
{
    public string Server { get; set; } = string.Empty;
    public int Port { get; set; } = 389;
    public string BaseDn { get; set; } = string.Empty;
    public string AdminUsername { get; set; } = string.Empty;
    public string AdminPassword { get; set; } = string.Empty;
    public bool UseSSL { get; set; }
}

public class AzureAdConfigDto
{
    public string TenantId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string Authority { get; set; } = string.Empty;
}

// ============ DevOps Settings DTOs ============

public class DevopsSettingsDto
{
    public bool IsConfigured { get; set; }
    public bool IsEnabled { get; set; }
    public bool HasPersonalAccessToken { get; set; }
    public string? ServerUrl { get; set; }
    public string? CollectionName { get; set; }
}

public class SaveDevopsSettingsRequestDto
{
    public string ServerUrl { get; set; } = string.Empty;
    public string CollectionName { get; set; } = string.Empty;
    public string? PersonalAccessToken { get; set; }
    public bool IsEnabled { get; set; } = true;
}

public class DevopsRepositoryMappingDto
{
    public Guid Id { get; set; }
    public Guid ModelId { get; set; }
    public string ModelName { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public string RepositoryName { get; set; } = string.Empty;
    public string BranchName { get; set; } = "main";
    public string FilePath { get; set; } = "/models/model.dbml";
    public bool IsEnabled { get; set; } = true;
    public DateTime UpdatedAt { get; set; }
}

public class SaveDevopsRepositoryMappingRequestDto
{
    public Guid ModelId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string RepositoryName { get; set; } = string.Empty;
    public string BranchName { get; set; } = "main";
    public string FilePath { get; set; } = "/models/model.dbml";
    public bool IsEnabled { get; set; } = true;
}

// ============ Audit Logs DTOs ============

public class AuditLogDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AuditLogsPageDto
{
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public List<AuditLogDto> Logs { get; set; } = new();
}

public class ExportAuditLogsRequestDto
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

// ============ Repository DTOs ============

public class RepositoryConnectionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TestRepositoryRequestDto
{
    public string ServerUrl { get; set; } = string.Empty;
    public string PersonalAccessToken { get; set; } = string.Empty;
}

// ============ Database System & Data Type DTOs ============

public class DatabaseDataTypeDto
{
    public Guid Id { get; set; }
    public Guid DatabaseSystemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string InputTemplate { get; set; } = string.Empty;
    public List<DatabaseDataTypeParameterDto> Parameters { get; set; } = new();
    public bool RequiresLength { get; set; }
    public bool SupportsPrecisionScale { get; set; }
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
}

public class DatabaseDataTypeParameterDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string InputType { get; set; } = "text"; // text | number
    public string? DefaultValue { get; set; }
}

public class DatabaseSystemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public List<DatabaseDataTypeDto> DataTypes { get; set; } = new();
}

public class CreateDatabaseSystemRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string? Key { get; set; }
}

public class UpdateDatabaseSystemRequestDto
{
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public class CreateDatabaseDataTypeRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string? InputTemplate { get; set; }
    public List<DatabaseDataTypeParameterDto>? Parameters { get; set; }
    public bool RequiresLength { get; set; }
    public bool SupportsPrecisionScale { get; set; }
    public int SortOrder { get; set; }
}

public class UpdateDatabaseDataTypeRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string? InputTemplate { get; set; }
    public List<DatabaseDataTypeParameterDto>? Parameters { get; set; }
    public bool RequiresLength { get; set; }
    public bool SupportsPrecisionScale { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

// ============ Project Metadata Field Definition DTOs ============

public class ProjectMetadataFieldDefinitionDto
{
    public Guid Id { get; set; }
    public string FieldKey { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string FieldType { get; set; } = "text";
    public bool IsRequired { get; set; }
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; }
    public List<string> Options { get; set; } = new();
    public int SortOrder { get; set; }
}

public class SaveProjectMetadataFieldDefinitionsRequestDto
{
    public List<ProjectMetadataFieldDefinitionDto> Fields { get; set; } = new();
}

// ============ Workflow Designer DTOs ============

public class WorkflowStageDto
{
    public string Name { get; set; } = string.Empty;
    public string RequiredRole { get; set; } = string.Empty;
    public string PendingStatus { get; set; } = string.Empty;
    public int? ApproveToStageIndex { get; set; }
    public int? RejectToStageIndex { get; set; }
}

public class SaveWorkflowTemplateRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<WorkflowStageDto> Stages { get; set; } = new();
}

public class WorkflowTemplateResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    public int StageCount { get; set; }
}

public class WorkflowTemplateDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<WorkflowStageDto> Stages { get; set; } = new();
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
}

// ============ Generic Response DTOs ============

public class ApiResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}
