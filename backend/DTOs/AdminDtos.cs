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
    public string? ServerUrl { get; set; }
    public string? ProjectName { get; set; }
    public string? RepositoryName { get; set; }
}

public class SaveDevopsSettingsRequestDto
{
    public string ServerUrl { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public string RepositoryName { get; set; } = string.Empty;
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

// ============ Generic Response DTOs ============

public class ApiResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}
