using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;
using Microsoft.EntityFrameworkCore;
using DataModeler.API.Data;
using DataModeler.API.Models;
using DataModeler.API.DTOs;
using DataModeler.API.Services;

namespace DataModeler.API.Controllers;

[ApiController]
[Route("api/models")]
[EnableCors("AllowFrontend")]
public class ModelsController : ControllerBase
{
    private readonly DataModelerDbContext _context;
    private readonly IDbmlParserService _dbmlParser;
    private readonly ILogger<ModelsController> _logger;

    public ModelsController(
        DataModelerDbContext context,
        IDbmlParserService dbmlParser,
        ILogger<ModelsController> logger)
    {
        _context = context;
        _dbmlParser = dbmlParser;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value
                       ?? User.FindFirst("nameid")?.Value;

        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private async Task<bool> UserHasAccessAsync(Guid modelId, string minimumRole = "viewer")
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users.FindAsync(userId);

        if (user?.IsSuperAdmin == true)
            return true;

        var collaboration = await _context.ModelCollaborators
            .FirstOrDefaultAsync(c => c.ModelId == modelId && c.UserId == userId);

        if (collaboration != null)
        {
            var roleHierarchy = new Dictionary<string, int> { { "viewer", 1 }, { "editor", 2 }, { "owner", 3 } };
            return roleHierarchy.GetValueOrDefault(collaboration.Role, 0) >= roleHierarchy.GetValueOrDefault(minimumRole, 0);
        }

        return false;
    }

    // ============ Model CRUD ============

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<ModelListDto>>> GetModels()
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users.FindAsync(userId);

        IQueryable<Model> query;

        if (user?.IsSuperAdmin == true)
            query = _context.Models.AsQueryable();
        else
            query = _context.Models
                .Where(m => m.OwnerId == userId || m.Collaborators.Any(c => c.UserId == userId));

        var models = await query
            .Include(m => m.Owner)
            .Include(m => m.ModelGroup)
            .Include(m => m.Collaborators)
            .Include(m => m.Versions)
            .OrderByDescending(m => m.UpdatedAt)
            .Select(m => new ModelListDto
            {
                Id = m.Id,
                Name = m.Name,
                Description = m.Description,
                OwnerEmail = m.Owner!.Email,
                DatabaseDialect = m.DatabaseDialect,
                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt,
                YourRole = m.OwnerId == userId
                    ? "owner"
                    : (m.Collaborators.Where(c => c.UserId == userId).Select(c => c.Role).FirstOrDefault() ?? "viewer"),
                LatestVersion = m.Versions.OrderByDescending(v => v.VersionNumber).Select(v => v.VersionNumber).FirstOrDefault(),
                ModelGroupId = m.ModelGroupId,
                ModelGroupName = m.ModelGroup != null ? m.ModelGroup.Name : null
            })
            .ToListAsync();

        return Ok(models);
    }

    [HttpPost]
    public async Task<ActionResult<ModelDetailDto>> CreateModel([FromBody] CreateModelRequestDto request)
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users.FindAsync(userId);

        if (user == null)
            return Unauthorized();

        if (!user.IsSuperAdmin)
            return Forbid();

        if (request.ModelGroupId.HasValue)
        {
            var groupExists = await _context.ModelGroups.AnyAsync(g => g.Id == request.ModelGroupId.Value);
            if (!groupExists)
            {
                return BadRequest("Model group not found");
            }
        }

        var model = new Model
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            OwnerId = userId,
            ModelGroupId = request.ModelGroupId,
            DatabaseDialect = request.DatabaseDialect ?? "PostgreSQL",
            CreatedAt = DateTime.UtcNow
        };

        _context.Models.Add(model);

        // Add owner as collaborator
        var ownerCollaborator = new ModelCollaborator
        {
            ModelId = model.Id,
            UserId = userId,
            Role = "owner",
            AssignedBy = userId
        };
        _context.ModelCollaborators.Add(ownerCollaborator);

        // Create initial version
        var initialVersion = new ModelVersion
        {
            Id = Guid.NewGuid(),
            ModelId = model.Id,
            DbmlContent = request.InitialDbml ?? "Project \"" + model.Name + "\" {}",
            VersionNumber = 1,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
            ChangeSummary = "Initial version",
            BranchName = "main"
        };
        _context.ModelVersions.Add(initialVersion);

        await _context.SaveChangesAsync();

        _logger.LogInformation($"Model created: {model.Id} by {user.Email}");
        return CreatedAtAction(nameof(GetModel), new { id = model.Id }, 
            MapModelToDetailDto(model, initialVersion, userId));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ModelDetailDto>> GetModel(Guid id)
    {
        if (!await UserHasAccessAsync(id))
            return Forbid();

        var userId = GetCurrentUserId();
        var model = await _context.Models
            .Include(m => m.Owner)
            .Include(m => m.ModelGroup)
            .Include(m => m.Versions)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (model == null)
            return NotFound();

        var latestVersion = model.Versions
            .Where(v => v.BranchName == "main")
            .OrderByDescending(v => v.VersionNumber)
            .FirstOrDefault();

        return Ok(MapModelToDetailDto(model, latestVersion, userId));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ModelDetailDto>> UpdateModel(Guid id, [FromBody] UpdateModelRequestDto request)
    {
        if (!await UserHasAccessAsync(id, "editor"))
            return Forbid();

        var userId = GetCurrentUserId();
        var model = await _context.Models
            .Include(m => m.ModelGroup)
            .Include(m => m.Versions)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (model == null)
            return NotFound();

        model.Name = request.Name ?? model.Name;
        model.Description = request.Description;
        model.DatabaseDialect = request.DatabaseDialect ?? model.DatabaseDialect;
        model.UpdatedAt = DateTime.UtcNow;

        // Create new version if DBML content changed
        if (!string.IsNullOrEmpty(request.DbmlContent))
        {
            var latestVersion = model.Versions
                .OrderByDescending(v => v.VersionNumber)
                .FirstOrDefault();

            var newVersionNumber = (latestVersion?.VersionNumber ?? 0) + 1;

            var newVersion = new ModelVersion
            {
                Id = Guid.NewGuid(),
                ModelId = model.Id,
                DbmlContent = request.DbmlContent,
                VersionNumber = newVersionNumber,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow,
                ChangeSummary = request.ChangeSummary,
                ParentVersionId = latestVersion?.Id,
                BranchName = "main"
            };

            _context.ModelVersions.Add(newVersion);

        }

        _context.Models.Update(model);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Model updated: {id}");

        var latestVer = model.Versions
            .Where(v => v.BranchName == "main")
            .OrderByDescending(v => v.VersionNumber)
            .FirstOrDefault();

        return Ok(MapModelToDetailDto(model, latestVer, userId));
    }

    [HttpGet("groups")]
    public async Task<ActionResult<List<ModelGroupDto>>> GetModelGroups()
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users.FindAsync(userId);

        // Query ALL groups from model_groups table (includes empty groups)
        var allGroups = await _context.ModelGroups
            .OrderBy(g => g.Name)
            .ToListAsync();

        IQueryable<Model> visibleModels;
        if (user?.IsSuperAdmin == true)
        {
            visibleModels = _context.Models.AsQueryable();
        }
        else
        {
            visibleModels = _context.Models
                .Where(m => m.OwnerId == userId || m.Collaborators.Any(c => c.UserId == userId));
        }

        // Count models per group for visible models
        var modelCountsDict = await visibleModels
            .Where(m => m.ModelGroupId != null)
            .GroupBy(m => m.ModelGroupId)
            .Select(g => new { GroupId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.GroupId!.Value, x => x.Count);

        var result = allGroups.Select(g => new ModelGroupDto
        {
            Id = g.Id,
            Name = g.Name,
            ModelCount = modelCountsDict.GetValueOrDefault(g.Id, 0)
        }).ToList();

        var ungroupedCount = await visibleModels.CountAsync(m => m.ModelGroupId == null);

        result.Insert(0, new ModelGroupDto
        {
            Id = null,
            Name = "Ungrouped",
            ModelCount = ungroupedCount
        });

        return Ok(result);
    }

    [HttpPost("groups")]
    public async Task<ActionResult<ModelGroupDto>> CreateModelGroup([FromBody] CreateModelGroupRequestDto request)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        var trimmedName = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(trimmedName))
        {
            return BadRequest("Group name is required");
        }

        var exists = await _context.ModelGroups.AnyAsync(g => g.Name.ToLower() == trimmedName.ToLower());
        if (exists)
        {
            return Conflict("Group already exists");
        }

        var group = new ModelGroup
        {
            Id = Guid.NewGuid(),
            Name = trimmedName,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.ModelGroups.Add(group);
        await _context.SaveChangesAsync();

        return Ok(new ModelGroupDto
        {
            Id = group.Id,
            Name = group.Name,
            ModelCount = 0
        });
    }

    [HttpDelete("groups/{groupId}")]
    public async Task<ActionResult<ApiResponse>> DeleteModelGroup(Guid groupId)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        var user = await _context.Users.FindAsync(userId);
        if (user?.IsSuperAdmin != true)
        {
            return Forbid();
        }

        var group = await _context.ModelGroups.FindAsync(groupId);
        if (group == null)
        {
            return NotFound("Group not found");
        }

        var modelCount = await _context.Models.CountAsync(m => m.ModelGroupId == groupId);
        if (modelCount > 0)
        {
            return Conflict($"Group cannot be deleted because it contains {modelCount} model(s)");
        }

        _context.ModelGroups.Remove(group);
        await _context.SaveChangesAsync();

        return Ok(new ApiResponse
        {
            Success = true,
            Message = "Model group deleted successfully"
        });
    }

    [HttpPut("{id}/group")]
    public async Task<ActionResult<ApiResponse>> AssignModelGroup(Guid id, [FromBody] AssignModelGroupRequestDto request)
    {
        if (!await UserHasAccessAsync(id, "editor"))
        {
            return Forbid();
        }

        var model = await _context.Models.FindAsync(id);
        if (model == null)
        {
            return NotFound();
        }

        if (request.ModelGroupId.HasValue)
        {
            var exists = await _context.ModelGroups.AnyAsync(g => g.Id == request.ModelGroupId.Value);
            if (!exists)
            {
                return BadRequest("Model group not found");
            }
        }

        model.ModelGroupId = request.ModelGroupId;
        model.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new ApiResponse { Success = true, Message = "Model group updated" });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteModel(Guid id)
    {
        var model = await _context.Models.FindAsync(id);
        if (model == null)
            return NotFound();

        var userId = GetCurrentUserId();
        var user = await _context.Users.FindAsync(userId);

        if (model.OwnerId != userId && user?.IsSuperAdmin != true)
            return Forbid();

        _context.Models.Remove(model);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Model deleted: {id}");

        // AuditLog("delete_model", model.Id, $"Deleted model: {model.Name}");

        return Ok(new ApiResponse { Success = true, Message = "Model deleted successfully" });
    }

    [HttpPost("parse-dbml")]
    public ActionResult<ErdDataDto> ParseDbml([FromBody] ParseDbmlRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.DbmlContent))
        {
            return Ok(new ErdDataDto
            {
                ValidationErrors = new List<string> { "DBML content is empty" }
            });
        }

        try
        {
            var erdData = _dbmlParser.ParseDbmlToErd(request.DbmlContent);
            return Ok(erdData);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse DBML content");
            return Ok(new ErdDataDto
            {
                ValidationErrors = new List<string> { "Failed to parse DBML content" }
            });
        }
    }

    // ============ Model Versions ============

    [HttpGet("{modelId}/versions")]
    public async Task<ActionResult<List<ModelVersionDto>>> GetModelVersions(Guid modelId)
    {
        if (!await UserHasAccessAsync(modelId))
            return Forbid();

        var versions = await _context.ModelVersions
            .Where(v => v.ModelId == modelId && v.BranchName == "main")
            .Include(v => v.Creator)
            .OrderByDescending(v => v.VersionNumber)
            .Select(v => new ModelVersionDto
            {
                Id = v.Id,
                VersionNumber = v.VersionNumber,
                CreatedBy = v.Creator!.Email,
                CreatedAt = v.CreatedAt,
                ChangeSummary = v.ChangeSummary
            })
            .ToListAsync();

        return Ok(versions);
    }

    [HttpGet("{modelId}/versions/{versionNumber}")]
    public async Task<ActionResult<ModelVersionDetailDto>> GetModelVersion(Guid modelId, int versionNumber)
    {
        if (!await UserHasAccessAsync(modelId))
            return Forbid();

        var version = await _context.ModelVersions
            .Include(v => v.Creator)
            .FirstOrDefaultAsync(v => v.ModelId == modelId && v.VersionNumber == versionNumber);

        if (version == null)
            return NotFound();

        // Parse DBML to ERD data
        var erdData = _dbmlParser.ParseDbmlToErd(version.DbmlContent);

        return Ok(new ModelVersionDetailDto
        {
            Id = version.Id,
            VersionNumber = version.VersionNumber,
            DbmlContent = version.DbmlContent,
            CreatedBy = version.Creator!.Email,
            CreatedAt = version.CreatedAt,
            ChangeSummary = version.ChangeSummary,
            ErdData = erdData
        });
    }

    [HttpPost("{modelId}/restore-version/{versionNumber}")]
    public async Task<ActionResult<ModelDetailDto>> RestoreVersion(Guid modelId, int versionNumber)
    {
        if (!await UserHasAccessAsync(modelId, "editor"))
            return Forbid();

        var userId = GetCurrentUserId();
        var model = await _context.Models
            .Include(m => m.Versions)
            .FirstOrDefaultAsync(m => m.Id == modelId);

        if (model == null)
            return NotFound();

        var targetVersion = model.Versions.FirstOrDefault(v => v.VersionNumber == versionNumber);
        if (targetVersion == null)
            return NotFound("Version not found");

        var latestVersion = model.Versions
            .OrderByDescending(v => v.VersionNumber)
            .FirstOrDefault();

        var newVersionNumber = (latestVersion?.VersionNumber ?? 0) + 1;

        var restoredVersion = new ModelVersion
        {
            Id = Guid.NewGuid(),
            ModelId = modelId,
            DbmlContent = targetVersion.DbmlContent,
            VersionNumber = newVersionNumber,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
            ChangeSummary = $"Restored from version {versionNumber}",
            ParentVersionId = latestVersion?.Id,
            BranchName = "main"
        };

        _context.ModelVersions.Add(restoredVersion);
        model.UpdatedAt = DateTime.UtcNow;
        _context.Models.Update(model);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Model version restored: {modelId} - Version {versionNumber} -> {newVersionNumber}");

        // AuditLog("restore_version", modelId, $"Restored from version {versionNumber}");

        return Ok(MapModelToDetailDto(model, restoredVersion, userId));
    }

    // ============ Collaborators ============

    [HttpPost("{modelId}/collaborators")]
    public async Task<ActionResult<ApiResponse>> AddCollaborator(Guid modelId, [FromBody] AddCollaboratorRequestDto request)
    {
        if (!await UserHasAccessAsync(modelId, "owner"))
            return Forbid();

        var model = await _context.Models.FindAsync(modelId);
        if (model == null)
            return NotFound();

        var collaboratorUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.UserEmail);

        if (collaboratorUser == null)
            return BadRequest("User not found");

        var existing = await _context.ModelCollaborators
            .FirstOrDefaultAsync(c => c.ModelId == modelId && c.UserId == collaboratorUser.Id);

        if (existing != null)
            return BadRequest("User already has access to this model");

        var collaborator = new ModelCollaborator
        {
            ModelId = modelId,
            UserId = collaboratorUser.Id,
            Role = request.Role,
            AssignedBy = GetCurrentUserId()
        };

        _context.ModelCollaborators.Add(collaborator);
        await _context.SaveChangesAsync();

        // AuditLog("add_collaborator", modelId, 
        //     $"Added {request.UserEmail} with role {request.Role}");

        return Ok(new ApiResponse { Success = true, Message = "Collaborator added successfully" });
    }

    [HttpDelete("{modelId}/collaborators/{userId}")]
    public async Task<ActionResult<ApiResponse>> RemoveCollaborator(Guid modelId, Guid userId)
    {
        if (!await UserHasAccessAsync(modelId, "owner"))
            return Forbid();

        var collaborator = await _context.ModelCollaborators
            .FirstOrDefaultAsync(c => c.ModelId == modelId && c.UserId == userId);

        if (collaborator == null)
            return NotFound();

        _context.ModelCollaborators.Remove(collaborator);
        await _context.SaveChangesAsync();

        return Ok(new ApiResponse { Success = true, Message = "Collaborator removed successfully" });
    }

    // ============ Helper Methods ============

    private ModelDetailDto MapModelToDetailDto(Model model, ModelVersion? version, Guid userId)
    {
        ErdDataDto erdData;
        if (!string.IsNullOrWhiteSpace(version?.DbmlContent))
        {
            try
            {
                erdData = _dbmlParser.ParseDbmlToErd(version.DbmlContent);
            }
            catch
            {
                erdData = new ErdDataDto
                {
                    Nodes = new(),
                    Relationships = new(),
                    ValidationErrors = new List<string> { "Failed to parse DBML content" }
                };
            }
        }
        else
        {
            erdData = new ErdDataDto { Nodes = new(), Relationships = new() };
        }

        return new ModelDetailDto
        {
            Id = model.Id,
            Name = model.Name,
            Description = model.Description,
            OwnerEmail = model.Owner?.Email ?? string.Empty,
            DatabaseDialect = model.DatabaseDialect,
            CreatedAt = model.CreatedAt,
            UpdatedAt = model.UpdatedAt,
            LatestVersion = version?.VersionNumber ?? 0,
            DbmlContent = version?.DbmlContent ?? string.Empty,
            ErdData = erdData,
            YourRole = GetUserRoleForModel(model, userId),
            ModelGroupId = model.ModelGroupId,
            ModelGroupName = model.ModelGroup?.Name
        };
    }

    private string GetUserRoleForModel(Model model, Guid userId)
    {
        if (model.OwnerId == userId)
            return "owner";

        var collaboration = _context.ModelCollaborators
            .FirstOrDefault(c => c.ModelId == model.Id && c.UserId == userId);

        return collaboration?.Role ?? "viewer";
    }

    // private void AuditLog(string action, Guid modelId, string details) - DISABLED
    /*
    private void AuditLog(string action, Guid modelId, string details)
    {
        try
        {
            // Audit logging disabled - type mismatch issues
        }

            _context.AuditLogs.Add(auditLog);
            _context.SaveChanges();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, $"Failed to create audit log for action: {action}");
        }
    }
    */
}
