using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DataModeler.API.Data;
using DataModeler.API.Models;
using DataModeler.API.Services;
using DataModeler.API.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace DataModeler.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly DataModelerDbContext _context;
    private readonly ITokenService _tokenService;
    private readonly ILdapAuthService _ldapAuthService;
    private readonly IAzureAdService _azureAdService;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        DataModelerDbContext context,
        ITokenService tokenService,
        ILdapAuthService ldapAuthService,
        IAzureAdService azureAdService,
        ILogger<AdminController> logger)
    {
        _context = context;
        _tokenService = tokenService;
        _ldapAuthService = ldapAuthService;
        _azureAdService = azureAdService;
        _logger = logger;
    }

    private async Task<bool> IsSuperAdminAsync()
    {
        // Different token handlers may expose user id as sub, nameid or NameIdentifier
        var userIdStr = User.FindFirst("sub")?.Value
                        ?? User.FindFirst("nameid")?.Value
                        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userIdStr)) return false;
        if (!Guid.TryParse(userIdStr, out var userId)) return false;

        var user = await _context.Users.FindAsync(userId);
        return user?.IsSuperAdmin ?? false;
    }

    private static string GetCfg(Dictionary<string, object> cfg, string key)
    {
        foreach (var pair in cfg)
        {
            if (string.Equals(pair.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                return pair.Value?.ToString() ?? string.Empty;
            }
        }

        return string.Empty;
    }

    private static string GetCfgAny(Dictionary<string, object> cfg, params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = GetCfg(cfg, key);
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return string.Empty;
    }

    // ============ AD Settings Management ============

    [HttpGet("settings/ad")]
    public async Task<ActionResult<AdSettingsDto>> GetAdSettings()
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        var settings = await _context.AdSettings.ToListAsync();
        var dto = new AdSettingsDto
        {
            Ldap = MapAdSettingDto(settings.FirstOrDefault(s => s.ProviderType == "ldap")),
            AzureAd = MapAdSettingDto(settings.FirstOrDefault(s => s.ProviderType == "azure_ad"))
        };

        return Ok(dto);
    }

    [HttpPost("settings/ad")]
    public async Task<ActionResult<ApiResponse>> SaveAdSettings([FromBody] SaveAdSettingsRequestDto request)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        try
        {
            foreach (var provider in request.Providers)
            {
                var setting = await _context.AdSettings
                    .FirstOrDefaultAsync(s => s.ProviderType == provider.Type);

                if (setting == null)
                {
                    setting = new AdSettings()
                    {
                        Id = Guid.NewGuid(),
                        ProviderType = provider.Type,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.AdSettings.Add(setting);
                }

                setting.ConfigJson = System.Text.Json.JsonSerializer.Serialize(provider.Config);
                setting.IsEnabled = provider.IsEnabled;
                setting.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation($"AD settings updated by user");

            return Ok(new ApiResponse { Success = true, Message = "AD settings saved successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error saving AD settings: {ex.Message}");
            return BadRequest(new ApiResponse { Success = false, Message = $"Error: {ex.Message}" });
        }
    }

    [HttpPost("settings/ad/test-connection")]
    public async Task<ActionResult<TestConnectionResponseDto>> TestAdConnection([FromBody] TestAdConnectionRequestDto request)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        try
        {
            var response = new TestConnectionResponseDto { Provider = request.Provider };

            if (request.Provider == "ldap")
            {
                var ldapConfig = new LdapConfig
                {
                    Server   = GetCfgAny(request.Config, "server", "host", "ldapServer"),
                    Port     = int.TryParse(GetCfgAny(request.Config, "port", "ldapPort"), out var p) ? p : 389,
                    BaseDn   = GetCfgAny(request.Config, "baseDn", "baseDN", "searchBase", "dn"),
                    AdminUsername = GetCfgAny(request.Config, "adminUsername", "bindDn", "bindDN", "username"),
                    AdminPassword = GetCfgAny(request.Config, "adminPassword", "bindPassword", "password"),
                    UseSSL   = bool.TryParse(GetCfgAny(request.Config, "useSSL", "useSsl", "ssl"), out var ssl) && ssl
                };

                if (string.IsNullOrEmpty(ldapConfig.Server))
                {
                    response.IsSuccessful = false;
                    response.Message = "Server address is required.";
                }
                else
                {
                    var (success, detail) = await _ldapAuthService.TestConnectionDetailedAsync(ldapConfig);
                    response.IsSuccessful = success;
                    response.Message = success
                        ? "LDAP connection successful!"
                        : (string.IsNullOrWhiteSpace(detail)
                            ? "LDAP bind failed. Check server, port and credentials."
                            : detail);
                }
            }
            else if (request.Provider == "azure_ad")
            {
                response.IsSuccessful = false;
                response.Message = "Azure AD connection testing is not yet configured.";
            }
            else
            {
                response.IsSuccessful = false;
                response.Message = "Unknown provider.";
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error testing AD connection: {ex.Message}");
            return Ok(new TestConnectionResponseDto
            {
                Provider = request.Provider,
                IsSuccessful = false,
                Message = $"Connection test failed: {ex.Message}"
            });
        }
    }

    // ============ DevOps Settings Management ============

    [HttpGet("settings/devops")]
    public async Task<ActionResult<DevopsSettingsDto>> GetDevopsSettings()
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        var setting = await _context.DevopsSettings.FirstOrDefaultAsync();
        if (setting == null)
            return Ok(new DevopsSettingsDto { IsConfigured = false });

        return Ok(new DevopsSettingsDto
        {
            IsConfigured = true,
            IsEnabled = setting.IsEnabled,
            HasPersonalAccessToken = !string.IsNullOrWhiteSpace(setting.PatToken),
            ServerUrl = setting.InstanceUrl,
            CollectionName = setting.CollectionName
        });
    }

    [HttpPost("settings/devops")]
    public async Task<ActionResult<ApiResponse>> SaveDevopsSettings([FromBody] SaveDevopsSettingsRequestDto request)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        try
        {
            var setting = await _context.DevopsSettings.FirstOrDefaultAsync();

            if (setting == null)
            {
                setting = new DevopsSettings
                {
                    Id = Guid.NewGuid(),
                    CreatedAt = DateTime.UtcNow
                };
                _context.DevopsSettings.Add(setting);
            }

            setting.InstanceUrl = request.ServerUrl?.Trim() ?? string.Empty;
            setting.CollectionName = request.CollectionName?.Trim() ?? string.Empty;
            setting.IsEnabled = request.IsEnabled;
            if (!string.IsNullOrWhiteSpace(request.PersonalAccessToken))
            {
                setting.PatToken = request.PersonalAccessToken.Trim();
            }
            setting.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"DevOps settings updated");

            return Ok(new ApiResponse { Success = true, Message = "DevOps settings saved successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error saving DevOps settings: {ex.Message}");
            return BadRequest(new ApiResponse { Success = false, Message = $"Error: {ex.Message}" });
        }
    }

    [HttpGet("settings/devops/repository-mappings")]
    public async Task<ActionResult<List<DevopsRepositoryMappingDto>>> GetDevopsRepositoryMappings()
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        var mappings = await _context.DevopsRepositoryMappings
            .AsNoTracking()
            .Include(x => x.Model)
            .OrderBy(x => x.Model!.Name)
            .Select(x => new DevopsRepositoryMappingDto
            {
                Id = x.Id,
                ModelId = x.ModelId,
                ModelName = x.Model != null ? x.Model.Name : string.Empty,
                ProjectName = x.ProjectName,
                RepositoryName = x.RepositoryName,
                BranchName = x.BranchName,
                FilePath = x.FilePath,
                IsEnabled = x.IsEnabled,
                UpdatedAt = x.UpdatedAt
            })
            .ToListAsync();

        return Ok(mappings);
    }

    [HttpPost("settings/devops/repository-mappings")]
    public async Task<ActionResult<ApiResponse>> SaveDevopsRepositoryMapping([FromBody] SaveDevopsRepositoryMappingRequestDto request)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        if (request.ModelId == Guid.Empty)
            return BadRequest(new ApiResponse { Success = false, Message = "ModelId is required" });
        if (string.IsNullOrWhiteSpace(request.ProjectName) || string.IsNullOrWhiteSpace(request.RepositoryName))
            return BadRequest(new ApiResponse { Success = false, Message = "ProjectName and RepositoryName are required" });

        var model = await _context.Models.AsNoTracking().FirstOrDefaultAsync(m => m.Id == request.ModelId);
        if (model == null)
            return NotFound(new ApiResponse { Success = false, Message = "Model not found" });

        var filePath = request.FilePath?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(filePath))
            filePath = $"/models/{model.Name}.dbml";
        if (!filePath.StartsWith('/'))
            filePath = "/" + filePath;

        var mapping = await _context.DevopsRepositoryMappings.FirstOrDefaultAsync(x => x.ModelId == request.ModelId);
        if (mapping == null)
        {
            mapping = new DevopsRepositoryMapping
            {
                Id = Guid.NewGuid(),
                ModelId = request.ModelId,
                CreatedAt = DateTime.UtcNow
            };
            _context.DevopsRepositoryMappings.Add(mapping);
        }

        mapping.ProjectName = request.ProjectName.Trim();
        mapping.RepositoryName = request.RepositoryName.Trim();
        mapping.BranchName = string.IsNullOrWhiteSpace(request.BranchName) ? "main" : request.BranchName.Trim();
        mapping.FilePath = filePath;
        mapping.IsEnabled = request.IsEnabled;
        mapping.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse { Success = true, Message = "DevOps repository mapping saved" });
    }

    [HttpDelete("settings/devops/repository-mappings/{modelId:guid}")]
    public async Task<ActionResult<ApiResponse>> DeleteDevopsRepositoryMapping([FromRoute] Guid modelId)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        var mapping = await _context.DevopsRepositoryMappings.FirstOrDefaultAsync(x => x.ModelId == modelId);
        if (mapping == null)
            return NotFound(new ApiResponse { Success = false, Message = "Mapping not found" });

        _context.DevopsRepositoryMappings.Remove(mapping);
        await _context.SaveChangesAsync();

        return Ok(new ApiResponse { Success = true, Message = "DevOps repository mapping deleted" });
    }

    // ============ Workflow Designer Management ============

    [HttpPost("workflow-templates")]
    public async Task<ActionResult<WorkflowTemplateResponseDto>> SaveWorkflowTemplate([FromBody] SaveWorkflowTemplateRequestDto request)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        try
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new WorkflowTemplateResponseDto
                {
                    Success = false,
                    Message = "Template name is required"
                });

            if (request.Stages == null || request.Stages.Count == 0)
                return BadRequest(new WorkflowTemplateResponseDto
                {
                    Success = false,
                    Message = "Workflow must have at least one stage"
                });

            // Validate each stage
            foreach (var stage in request.Stages)
            {
                if (string.IsNullOrWhiteSpace(stage.Name) || 
                    string.IsNullOrWhiteSpace(stage.RequiredRole) || 
                    string.IsNullOrWhiteSpace(stage.PendingStatus))
                {
                    return BadRequest(new WorkflowTemplateResponseDto
                    {
                        Success = false,
                        Message = "All stages must have name, required role, and pending status"
                    });
                }
            }

            var normalizedName = request.Name.Trim();
            var template = await _context.WorkflowTemplates
                .FirstOrDefaultAsync(x => x.Name.ToLower() == normalizedName.ToLower());

            if (template == null)
            {
                template = new WorkflowTemplate
                {
                    Id = Guid.NewGuid(),
                    Name = normalizedName,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = false
                };
                _context.WorkflowTemplates.Add(template);
            }

            template.Name = normalizedName;
            template.Description = request.Description?.Trim();
            template.StagesJson = System.Text.Json.JsonSerializer.Serialize(request.Stages);
            template.UpdatedAt = DateTime.UtcNow;

            // Save screen action is "Save and Activate", so always activate the saved template.
            template.IsActive = true;
            var others = await _context.WorkflowTemplates
                .Where(x => x.Id != template.Id && x.IsActive)
                .ToListAsync();

            foreach (var other in others)
            {
                other.IsActive = false;
                other.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Workflow template '{request.Name}' saved with {request.Stages.Count} stages");

            return Ok(new WorkflowTemplateResponseDto
            {
                Success = true,
                Message = "Workflow template saved successfully",
                TemplateName = request.Name,
                StageCount = request.Stages.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error saving workflow template: {ex.Message}");
            return BadRequest(new WorkflowTemplateResponseDto
            {
                Success = false,
                Message = $"Error: {ex.Message}"
            });
        }
    }

    [HttpGet("workflow-templates")]
    public async Task<ActionResult<List<WorkflowTemplateDto>>> GetWorkflowTemplates()
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        try
        {
            var templates = await _context.WorkflowTemplates
                .AsNoTracking()
                .OrderByDescending(x => x.IsActive)
                .ThenByDescending(x => x.UpdatedAt)
                .ToListAsync();

            var dtos = new List<WorkflowTemplateDto>(templates.Count);
            foreach (var t in templates)
            {
                var stages = DeserializeWorkflowStagesSafe(t.StagesJson);
                dtos.Add(new WorkflowTemplateDto
                {
                    Id = t.Id,
                    Name = t.Name,
                    Description = t.Description,
                    Stages = stages,
                    IsActive = t.IsActive,
                    UpdatedAt = t.UpdatedAt
                });
            }

            return Ok(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error fetching workflow templates: {ex.Message}");
            return BadRequest(new ApiResponse { Success = false, Message = $"Error: {ex.Message}" });
        }
    }

    [HttpPut("workflow-templates/{id:guid}/activate")]
    public async Task<ActionResult<ApiResponse>> ActivateWorkflowTemplate([FromRoute] Guid id)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        try
        {
            var selectedTemplate = await _context.WorkflowTemplates.FirstOrDefaultAsync(x => x.Id == id);
            if (selectedTemplate == null)
                return NotFound(new ApiResponse { Success = false, Message = "Workflow template not found" });

            var now = DateTime.UtcNow;
            var activeTemplates = await _context.WorkflowTemplates.Where(x => x.IsActive).ToListAsync();
            foreach (var template in activeTemplates)
            {
                template.IsActive = false;
                template.UpdatedAt = now;
            }

            selectedTemplate.IsActive = true;
            selectedTemplate.UpdatedAt = now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse { Success = true, Message = "Workflow template activated" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error activating workflow template: {ex.Message}");
            return BadRequest(new ApiResponse { Success = false, Message = $"Error: {ex.Message}" });
        }
    }

    [HttpDelete("workflow-templates/{id:guid}")]
    public async Task<ActionResult<ApiResponse>> DeleteWorkflowTemplate([FromRoute] Guid id)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        try
        {
            var template = await _context.WorkflowTemplates.FirstOrDefaultAsync(x => x.Id == id);
            if (template == null)
                return NotFound(new ApiResponse { Success = false, Message = "Workflow template not found" });

            var wasActive = template.IsActive;
            _context.WorkflowTemplates.Remove(template);

            if (wasActive)
            {
                var fallbackTemplate = await _context.WorkflowTemplates
                    .Where(x => x.Id != id)
                    .OrderByDescending(x => x.UpdatedAt)
                    .FirstOrDefaultAsync();

                if (fallbackTemplate != null)
                {
                    fallbackTemplate.IsActive = true;
                    fallbackTemplate.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse { Success = true, Message = "Workflow template deleted" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error deleting workflow template: {ex.Message}");
            return BadRequest(new ApiResponse { Success = false, Message = $"Error: {ex.Message}" });
        }
    }

    private static List<WorkflowStageDto> DeserializeWorkflowStagesSafe(string? stagesJson)
    {
        if (string.IsNullOrWhiteSpace(stagesJson))
        {
            return new List<WorkflowStageDto>();
        }

        try
        {
            // Current format: JSON array of stages
            if (stagesJson.TrimStart().StartsWith("[", StringComparison.Ordinal))
            {
                return System.Text.Json.JsonSerializer.Deserialize<List<WorkflowStageDto>>(stagesJson) ?? new List<WorkflowStageDto>();
            }

            // Legacy format: object wrapper like { "Stages": [ ... ] }
            using var doc = System.Text.Json.JsonDocument.Parse(stagesJson);
            if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Object)
            {
                foreach (var prop in doc.RootElement.EnumerateObject())
                {
                    if ((string.Equals(prop.Name, "Stages", StringComparison.OrdinalIgnoreCase)
                        || string.Equals(prop.Name, "stages", StringComparison.OrdinalIgnoreCase))
                        && prop.Value.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        return System.Text.Json.JsonSerializer.Deserialize<List<WorkflowStageDto>>(prop.Value.GetRawText()) ?? new List<WorkflowStageDto>();
                    }
                }
            }
        }
        catch
        {
            // Intentionally swallow parsing errors and return empty list.
        }

        return new List<WorkflowStageDto>();
    }

    // ============ Audit Logs Management ============

    [HttpGet("audit-logs")]
    public async Task<ActionResult<AuditLogsPageDto>> GetAuditLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? userId = null,
        [FromQuery] string? action = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        try
        {
            var query = _context.AuditLogs.AsQueryable();

            if (!string.IsNullOrEmpty(userId))
                query = query.Where(x => x.UserId.ToString() == userId);

            if (!string.IsNullOrEmpty(action))
                query = query.Where(x => x.Action == action);

            if (fromDate.HasValue)
                query = query.Where(x => x.CreatedAt >= fromDate);

            if (toDate.HasValue)
                query = query.Where(x => x.CreatedAt <= toDate.Value.AddDays(1));

            var total = await query.CountAsync();
            var logList = await query
                .OrderByDescending(x => x.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            
            var logs = logList.Select(x => new AuditLogDto { CreatedAt = x.CreatedAt }).ToList();

            return Ok(new AuditLogsPageDto
            {
                Total = total,
                Page = page,
                PageSize = pageSize,
                Logs = logs
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error retrieving audit logs: {ex.Message}");
            return BadRequest(new ApiResponse { Success = false, Message = $"Error: {ex.Message}" });
        }
    }

    [HttpPost("audit-logs/export")]
    public async Task<IActionResult> ExportAuditLogs([FromBody] ExportAuditLogsRequestDto request)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        try
        {
            var query = _context.AuditLogs.AsQueryable();

            if (request.FromDate.HasValue)
                query = query.Where(x => x.CreatedAt >= request.FromDate);

            if (request.ToDate.HasValue)
                query = query.Where(x => x.CreatedAt <= request.ToDate.Value.AddDays(1));

            var logs = await query
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    x.CreatedAt,
                    x.Action,
                    UserEmail = x.User != null ? x.User.Email : "Unknown",
                    x.Details
                })
                .ToListAsync();

            var csv = "Date,Action,User,Details\n";
            foreach (var log in logs)
            {
                var details = log.Details?.Replace("\"", "\"\"") ?? "";
                csv += $"\"{log.CreatedAt:yyyy-MM-dd HH:mm:ss}\",\"{log.Action}\",\"{log.UserEmail}\",\"{details}\"\n";
            }

            return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "audit-logs.csv");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error exporting audit logs: {ex.Message}");
            return BadRequest(new ApiResponse { Success = false, Message = $"Error: {ex.Message}" });
        }
    }

    // ============ Repository Connections ============

    [HttpGet("repositories")]
    public async Task<ActionResult<List<RepositoryConnectionDto>>> GetRepositories()
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        var repos = await _context.DevopsSettings
            .Select(x => new RepositoryConnectionDto
            {
                Id = x.Id,
                Name = "Default Repository",
                IsDefault = true,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync();

        return Ok(repos);
    }

    [HttpPost("repositories/test")]
    public async Task<ActionResult<ApiResponse>> TestRepositoryConnection([FromBody] TestRepositoryRequestDto request)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        try
        {
            // In Phase 5, this will implement actual Azure DevOps connection testing
            // For now, basic validation only
            if (string.IsNullOrEmpty(request.ServerUrl) || string.IsNullOrEmpty(request.PersonalAccessToken))
                return BadRequest(new ApiResponse 
                { 
                    Success = false, 
                    Message = "ServerUrl and PersonalAccessToken are required" 
                });

            return Ok(new ApiResponse 
            { 
                Success = true, 
                Message = "Repository connection test successful (mock)" 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error testing repository connection: {ex.Message}");
            return BadRequest(new ApiResponse { Success = false, Message = $"Error: {ex.Message}" });
        }
    }

    // ============ Database Systems & Data Types ============

    [HttpGet("database-systems")]
    public async Task<ActionResult<List<DatabaseSystemDto>>> GetDatabaseSystems()
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        var systems = await _context.DatabaseSystems
            .Include(s => s.DataTypes)
            .OrderBy(s => s.Name)
            .ToListAsync();

        return Ok(systems.Select(MapDatabaseSystemDto).ToList());
    }

    [HttpGet("database-type-catalog")]
    public async Task<ActionResult<List<DatabaseSystemDto>>> GetDatabaseTypeCatalog()
    {
        var systems = await _context.DatabaseSystems
            .Where(s => s.IsActive)
            .Include(s => s.DataTypes.Where(dt => dt.IsActive))
            .OrderBy(s => s.Name)
            .ToListAsync();

        return Ok(systems.Select(MapDatabaseSystemDto).ToList());
    }

    [HttpPost("database-systems")]
    public async Task<ActionResult<DatabaseSystemDto>> CreateDatabaseSystem([FromBody] CreateDatabaseSystemRequestDto request)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        var name = request.Name?.Trim() ?? string.Empty;
        if (name.Length == 0)
            return BadRequest(new ApiResponse { Success = false, Message = "Database system name is required." });

        var key = NormalizeDatabaseSystemKey(request.Key, name);
        var exists = await _context.DatabaseSystems.AnyAsync(s => s.Name.ToLower() == name.ToLower() || s.Key == key);
        if (exists)
            return Conflict(new ApiResponse { Success = false, Message = "Database system already exists." });

        var entity = new DatabaseSystem
        {
            Id = Guid.NewGuid(),
            Name = name,
            Key = key,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.DatabaseSystems.Add(entity);
        await _context.SaveChangesAsync();
        return Ok(MapDatabaseSystemDto(entity));
    }

    [HttpPut("database-systems/{systemId:guid}")]
    public async Task<ActionResult<DatabaseSystemDto>> UpdateDatabaseSystem(Guid systemId, [FromBody] UpdateDatabaseSystemRequestDto request)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        var entity = await _context.DatabaseSystems.FirstOrDefaultAsync(s => s.Id == systemId);
        if (entity == null)
            return NotFound(new ApiResponse { Success = false, Message = "Database system not found." });

        var name = request.Name?.Trim() ?? string.Empty;
        if (name.Length == 0)
            return BadRequest(new ApiResponse { Success = false, Message = "Database system name is required." });

        var duplicateName = await _context.DatabaseSystems.AnyAsync(s => s.Id != systemId && s.Name.ToLower() == name.ToLower());
        if (duplicateName)
            return Conflict(new ApiResponse { Success = false, Message = "Database system name already exists." });

        entity.Name = name;
        entity.IsActive = request.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var refreshed = await _context.DatabaseSystems.Include(s => s.DataTypes).FirstAsync(s => s.Id == systemId);
        return Ok(MapDatabaseSystemDto(refreshed));
    }

    [HttpDelete("database-systems/{systemId:guid}")]
    public async Task<ActionResult<ApiResponse>> DeleteDatabaseSystem(Guid systemId)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        var entity = await _context.DatabaseSystems.Include(s => s.DataTypes).FirstOrDefaultAsync(s => s.Id == systemId);
        if (entity == null)
            return NotFound(new ApiResponse { Success = false, Message = "Database system not found." });

        _context.DatabaseSystems.Remove(entity);
        await _context.SaveChangesAsync();

        return Ok(new ApiResponse { Success = true, Message = "Database system deleted." });
    }

    [HttpPost("database-systems/{systemId:guid}/data-types")]
    public async Task<ActionResult<DatabaseDataTypeDto>> CreateDatabaseDataType(Guid systemId, [FromBody] CreateDatabaseDataTypeRequestDto request)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        var system = await _context.DatabaseSystems.FirstOrDefaultAsync(s => s.Id == systemId);
        if (system == null)
            return NotFound(new ApiResponse { Success = false, Message = "Database system not found." });

        var typeName = request.Name?.Trim() ?? string.Empty;
        if (typeName.Length == 0)
            return BadRequest(new ApiResponse { Success = false, Message = "Data type name is required." });

        var duplicate = await _context.DatabaseDataTypes.AnyAsync(dt => dt.DatabaseSystemId == systemId && dt.Name.ToLower() == typeName.ToLower());
        if (duplicate)
            return Conflict(new ApiResponse { Success = false, Message = "Data type already exists for this system." });

        var normalizedParameters = NormalizeParameters(request.Parameters);
        var template = NormalizeInputTemplate(request.InputTemplate, typeName, normalizedParameters);
        if (!TemplateContainsAllParameters(template, normalizedParameters, out var missingParam))
        {
            return BadRequest(new ApiResponse { Success = false, Message = $"Template is missing parameter placeholder '{{{{{missingParam}}}}}'." });
        }

        var dataType = new DatabaseDataType
        {
            Id = Guid.NewGuid(),
            DatabaseSystemId = systemId,
            Name = typeName,
            InputTemplate = template,
            ParametersJson = SerializeParameters(normalizedParameters),
            RequiresLength = request.RequiresLength,
            SupportsPrecisionScale = request.SupportsPrecisionScale,
            IsActive = true,
            SortOrder = request.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.DatabaseDataTypes.Add(dataType);
        await _context.SaveChangesAsync();

        return Ok(MapDatabaseDataTypeDto(dataType));
    }

    [HttpPut("database-data-types/{dataTypeId:guid}")]
    public async Task<ActionResult<DatabaseDataTypeDto>> UpdateDatabaseDataType(Guid dataTypeId, [FromBody] UpdateDatabaseDataTypeRequestDto request)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        var dataType = await _context.DatabaseDataTypes.FirstOrDefaultAsync(dt => dt.Id == dataTypeId);
        if (dataType == null)
            return NotFound(new ApiResponse { Success = false, Message = "Data type not found." });

        var typeName = request.Name?.Trim() ?? string.Empty;
        if (typeName.Length == 0)
            return BadRequest(new ApiResponse { Success = false, Message = "Data type name is required." });

        var duplicate = await _context.DatabaseDataTypes.AnyAsync(dt => dt.Id != dataTypeId && dt.DatabaseSystemId == dataType.DatabaseSystemId && dt.Name.ToLower() == typeName.ToLower());
        if (duplicate)
            return Conflict(new ApiResponse { Success = false, Message = "Data type already exists for this system." });

        var normalizedParameters = NormalizeParameters(request.Parameters);
        var template = NormalizeInputTemplate(request.InputTemplate, typeName, normalizedParameters);
        if (!TemplateContainsAllParameters(template, normalizedParameters, out var missingParam))
        {
            return BadRequest(new ApiResponse { Success = false, Message = $"Template is missing parameter placeholder '{{{{{missingParam}}}}}'." });
        }

        dataType.Name = typeName;
        dataType.InputTemplate = template;
        dataType.ParametersJson = SerializeParameters(normalizedParameters);
        dataType.RequiresLength = request.RequiresLength;
        dataType.SupportsPrecisionScale = request.SupportsPrecisionScale;
        dataType.IsActive = request.IsActive;
        dataType.SortOrder = request.SortOrder;
        dataType.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(MapDatabaseDataTypeDto(dataType));
    }

    [HttpDelete("database-data-types/{dataTypeId:guid}")]
    public async Task<ActionResult<ApiResponse>> DeleteDatabaseDataType(Guid dataTypeId)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        var dataType = await _context.DatabaseDataTypes.FirstOrDefaultAsync(dt => dt.Id == dataTypeId);
        if (dataType == null)
            return NotFound(new ApiResponse { Success = false, Message = "Data type not found." });

        _context.DatabaseDataTypes.Remove(dataType);
        await _context.SaveChangesAsync();

        return Ok(new ApiResponse { Success = true, Message = "Data type deleted." });
    }

    [HttpGet("project-metadata/fields")]
    public async Task<ActionResult<List<ProjectMetadataFieldDefinitionDto>>> GetProjectMetadataFields()
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        var fields = await _context.ProjectMetadataFieldDefinitions
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.DisplayName)
            .ToListAsync();

        return Ok(fields.Select(MapProjectMetadataFieldDefinitionDto).ToList());
    }

    [HttpPut("project-metadata/fields")]
    public async Task<ActionResult<List<ProjectMetadataFieldDefinitionDto>>> SaveProjectMetadataFields([FromBody] SaveProjectMetadataFieldDefinitionsRequestDto request)
    {
        if (!await IsSuperAdminAsync())
            return Forbid();

        var incoming = request.Fields ?? new List<ProjectMetadataFieldDefinitionDto>();
        var existing = await _context.ProjectMetadataFieldDefinitions.ToListAsync();
        var existingByKey = existing.ToDictionary(x => x.FieldKey, StringComparer.OrdinalIgnoreCase);

        var incomingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var field in incoming)
        {
            var key = NormalizeFieldKey(field.FieldKey);
            if (string.IsNullOrWhiteSpace(key))
            {
                continue;
            }

            incomingKeys.Add(key);

            var displayName = string.IsNullOrWhiteSpace(field.DisplayName) ? key : field.DisplayName.Trim();
            var normalizedType = NormalizeFieldType(field.FieldType);
            var options = (field.Options ?? new List<string>())
                .Select(x => x?.Trim() ?? string.Empty)
                .Where(x => x.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (existingByKey.TryGetValue(key, out var entity))
            {
                entity.DisplayName = displayName;
                entity.FieldType = normalizedType;
                entity.SortOrder = field.SortOrder;
                entity.OptionsJson = JsonSerializer.Serialize(options);
                entity.IsActive = entity.IsSystem ? true : field.IsActive;
                entity.IsRequired = entity.IsSystem ? entity.IsRequired : field.IsRequired;
                entity.UpdatedAt = DateTime.UtcNow;
                continue;
            }

            _context.ProjectMetadataFieldDefinitions.Add(new ProjectMetadataFieldDefinition
            {
                Id = Guid.NewGuid(),
                FieldKey = key,
                DisplayName = displayName,
                FieldType = normalizedType,
                IsRequired = field.IsRequired,
                IsSystem = false,
                IsActive = field.IsActive,
                SortOrder = field.SortOrder,
                OptionsJson = JsonSerializer.Serialize(options),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        foreach (var entity in existing)
        {
            if (!entity.IsSystem && !incomingKeys.Contains(entity.FieldKey))
            {
                entity.IsActive = false;
                entity.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();

        var refreshed = await _context.ProjectMetadataFieldDefinitions
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.DisplayName)
            .ToListAsync();

        return Ok(refreshed.Select(MapProjectMetadataFieldDefinitionDto).ToList());
    }

    // ============ Helper Methods ============

    private static string NormalizeFieldKey(string? key)
    {
        var value = (key ?? string.Empty).Trim().ToLowerInvariant();
        value = Regex.Replace(value, "[^a-z0-9_]+", "_");
        value = Regex.Replace(value, "_+", "_").Trim('_');
        return value;
    }

    private static string NormalizeFieldType(string? fieldType)
    {
        var value = (fieldType ?? string.Empty).Trim().ToLowerInvariant();
        return value switch
        {
            "textarea" => "textarea",
            "select" => "select",
            _ => "text"
        };
    }

    private static ProjectMetadataFieldDefinitionDto MapProjectMetadataFieldDefinitionDto(ProjectMetadataFieldDefinition entity)
    {
        List<string> options;
        try
        {
            options = JsonSerializer.Deserialize<List<string>>(entity.OptionsJson ?? "[]") ?? new List<string>();
        }
        catch
        {
            options = new List<string>();
        }

        return new ProjectMetadataFieldDefinitionDto
        {
            Id = entity.Id,
            FieldKey = entity.FieldKey,
            DisplayName = entity.DisplayName,
            FieldType = entity.FieldType,
            IsRequired = entity.IsRequired,
            IsSystem = entity.IsSystem,
            IsActive = entity.IsActive,
            SortOrder = entity.SortOrder,
            Options = options
        };
    }

    private static string NormalizeDatabaseSystemKey(string? requestedKey, string fallbackName)
    {
        var source = string.IsNullOrWhiteSpace(requestedKey) ? fallbackName : requestedKey;
        var key = source.Trim().ToLowerInvariant();
        key = key.Replace(" ", "_");
        key = key.Replace("-", "_");
        return key;
    }

    private static DatabaseDataTypeDto MapDatabaseDataTypeDto(DatabaseDataType dt)
    {
        var parameters = ParseParameters(dt.ParametersJson);
        return new DatabaseDataTypeDto
        {
            Id = dt.Id,
            DatabaseSystemId = dt.DatabaseSystemId,
            Name = dt.Name,
            InputTemplate = string.IsNullOrWhiteSpace(dt.InputTemplate) ? dt.Name : dt.InputTemplate,
            Parameters = parameters,
            RequiresLength = dt.RequiresLength,
            SupportsPrecisionScale = dt.SupportsPrecisionScale,
            IsActive = dt.IsActive,
            SortOrder = dt.SortOrder,
        };
    }

    private static List<DatabaseDataTypeParameterDto> NormalizeParameters(List<DatabaseDataTypeParameterDto>? parameters)
    {
        var result = new List<DatabaseDataTypeParameterDto>();
        if (parameters == null) return result;

        foreach (var parameter in parameters)
        {
            var key = (parameter.Key ?? string.Empty).Trim();
            if (key.Length == 0) continue;

            var normalizedKey = Regex.Replace(key.ToLowerInvariant(), "[^a-z0-9_]", string.Empty);
            if (normalizedKey.Length == 0) continue;
            if (result.Any(x => x.Key == normalizedKey)) continue;

            var inputType = string.Equals(parameter.InputType, "number", StringComparison.OrdinalIgnoreCase) ? "number" : "text";
            result.Add(new DatabaseDataTypeParameterDto
            {
                Key = normalizedKey,
                Label = string.IsNullOrWhiteSpace(parameter.Label) ? normalizedKey : parameter.Label.Trim(),
                InputType = inputType,
                DefaultValue = parameter.DefaultValue?.Trim()
            });
        }

        return result;
    }

    private static string NormalizeInputTemplate(string? inputTemplate, string typeName, List<DatabaseDataTypeParameterDto> parameters)
    {
        var template = string.IsNullOrWhiteSpace(inputTemplate) ? typeName : inputTemplate.Trim();
        if (parameters.Count == 0)
        {
            return template;
        }

        return template;
    }

    private static bool TemplateContainsAllParameters(string template, List<DatabaseDataTypeParameterDto> parameters, out string missing)
    {
        foreach (var parameter in parameters)
        {
            if (!template.Contains($"{{{{{parameter.Key}}}}}", StringComparison.OrdinalIgnoreCase))
            {
                missing = parameter.Key;
                return false;
            }
        }

        missing = string.Empty;
        return true;
    }

    private static string SerializeParameters(List<DatabaseDataTypeParameterDto> parameters)
    {
        return JsonSerializer.Serialize(parameters);
    }

    private static List<DatabaseDataTypeParameterDto> ParseParameters(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new List<DatabaseDataTypeParameterDto>();

        try
        {
            return JsonSerializer.Deserialize<List<DatabaseDataTypeParameterDto>>(raw) ?? new List<DatabaseDataTypeParameterDto>();
        }
        catch
        {
            return new List<DatabaseDataTypeParameterDto>();
        }
    }

    private static DatabaseSystemDto MapDatabaseSystemDto(DatabaseSystem s)
    {
        return new DatabaseSystemDto
        {
            Id = s.Id,
            Name = s.Name,
            Key = s.Key,
            IsActive = s.IsActive,
            DataTypes = s.DataTypes
                .OrderBy(dt => dt.SortOrder)
                .ThenBy(dt => dt.Name)
                .Select(MapDatabaseDataTypeDto)
                .ToList(),
        };
    }

    private AdSettingDetailDto? MapAdSettingDto(AdSettings? setting)
    {
        if (setting == null) return null;

        try
        {
            var config = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(setting.ConfigJson ?? "{}") ?? new();

            return new AdSettingDetailDto
            {
                Type = setting.ProviderType,
                IsEnabled = setting.IsEnabled,
                Config = config,
                TestStatus = setting.TestStatus == "success",
                LastTestedAt = setting.TestTimestamp
            };
        }
        catch
        {
            return new AdSettingDetailDto
            {
                Type = setting.ProviderType,
                IsEnabled = setting.IsEnabled,
                Config = new()
            };
        }
    }
}
