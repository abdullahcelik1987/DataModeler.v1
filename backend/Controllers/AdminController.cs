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
        var userId = User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId)) return false;

        var user = await _context.Users.FindAsync(Guid.Parse(userId));
        return user?.IsSuperAdmin ?? false;
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
                // LDAP service disabled
                response.IsSuccessful = false;
                response.Message = "LDAP connection testing is disabled";
            }
            else if (request.Provider == "azure_ad")
            {
                // Azure AD service disabled
                response.IsSuccessful = false;
                response.Message = "Azure AD connection testing is disabled";
            }
            else
            {
                response.IsSuccessful = false;
                response.Message = "Unknown provider";
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

        var config = System.Text.Json.JsonSerializer.Deserialize<
            Dictionary<string, object>>(setting.Config ?? "{}") ?? new ();

        return Ok(new DevopsSettingsDto
        {
            IsConfigured = true,
            ServerUrl = config.ContainsKey("serverUrl") ? config["serverUrl"]?.ToString() : null,
            ProjectName = config.ContainsKey("projectName") ? config["projectName"]?.ToString() : null,
            RepositoryName = config.ContainsKey("repositoryName") ? config["repositoryName"]?.ToString() : null
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

            var config = new
            {
                request.ServerUrl,
                request.ProjectName,
                request.RepositoryName
            };

            setting.ConfigJson = System.Text.Json.JsonSerializer.Serialize(config);
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

    // ============ Helper Methods ============

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
