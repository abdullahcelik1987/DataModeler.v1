using System.Security.Claims;
using System.Text.Json;
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
    private static readonly Dictionary<string, int> RoleHierarchy = new(StringComparer.OrdinalIgnoreCase)
    {
        { "viewer", 1 },
        { "data_steward", 1 },
        { "editor", 2 },
        { "developer", 2 },
        { "domain_architect", 2 },
        { "data_architect", 2 },
        { "owner", 3 },
        { "admin", 3 }
    };

    private readonly DataModelerDbContext _context;
    private readonly IDbmlParserService _dbmlParser;
    private readonly IReverseEngineeringService _reverseEngineeringService;
    private readonly ILogger<ModelsController> _logger;

    private static readonly string[] ModelScopedApplicationRolesByPriority =
    {
        "admin",
        "owner",
        "data_architect",
        "domain_architect",
        "developer",
        "editor",
        "data_steward",
        "viewer"
    };

    private static readonly string[] GlobalDefaultModelRolesByPriority =
    {
        "admin"
    };

    public ModelsController(
        DataModelerDbContext context,
        IDbmlParserService dbmlParser,
        IReverseEngineeringService reverseEngineeringService,
        ILogger<ModelsController> logger)
    {
        _context = context;
        _dbmlParser = dbmlParser;
        _reverseEngineeringService = reverseEngineeringService;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value
                       ?? User.FindFirst("nameid")?.Value;

        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
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

    private static string NormalizeMetadataKey(string? key)
    {
        var input = (key ?? string.Empty).Trim().ToLowerInvariant();
        if (input.Length == 0)
        {
            return string.Empty;
        }

        var chars = input.Select(ch => char.IsLetterOrDigit(ch) ? ch : '_').ToArray();
        var compact = new string(chars);
        while (compact.Contains("__", StringComparison.Ordinal))
        {
            compact = compact.Replace("__", "_", StringComparison.Ordinal);
        }

        return compact.Trim('_');
    }

    private static Dictionary<string, string> DeserializeProjectMetadata(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json)
                ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }
        catch
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }
    }

    private static string SerializeProjectMetadata(Dictionary<string, string> metadata)
    {
        return JsonSerializer.Serialize(metadata ?? new Dictionary<string, string>());
    }

    private static Dictionary<string, string> NormalizeProjectMetadata(
        IDictionary<string, string>? raw,
        IEnumerable<ProjectMetadataFieldDefinition> activeFields,
        string modelName,
        string? description,
        string? databaseDialect,
        string ownerEmail,
        string? ownerGroup)
    {
        var normalized = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var input = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (raw != null)
        {
            foreach (var pair in raw)
            {
                var key = NormalizeMetadataKey(pair.Key);
                if (key.Length == 0)
                {
                    continue;
                }

                input[key] = pair.Value?.Trim() ?? string.Empty;
            }
        }

        foreach (var field in activeFields)
        {
            var key = NormalizeMetadataKey(field.FieldKey);
            if (key.Length == 0)
            {
                continue;
            }

            var value = input.TryGetValue(key, out var incoming) ? incoming : string.Empty;
            if (string.IsNullOrWhiteSpace(value) && field.IsRequired)
            {
                value = key switch
                {
                    "database_type" => databaseDialect ?? "PostgreSQL",
                    "description" => description ?? string.Empty,
                    "environment" => "Development",
                    "owner" => ownerEmail,
                    "owner_group" => ownerGroup ?? string.Empty,
                    "version" => "1.0.0",
                    "last_update" => DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    _ => string.Empty,
                };
            }

            if (!string.IsNullOrWhiteSpace(value))
            {
                normalized[key] = value.Trim();
            }
        }

        return normalized;
    }

    private async Task<HashSet<string>> GetUserApplicationRoleNamesAsync(Guid userId)
    {
        var roleNames = await _context.UserApplicationRoles
            .Where(x => x.UserId == userId)
            .Include(x => x.Role)
            .Where(x => x.Role != null && x.Role.IsActive)
            .Select(x => x.Role!.Name)
            .ToListAsync();

        return roleNames
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name.Trim().ToLowerInvariant())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
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

        // Data architects are globally scoped across all Organization Units.
        if (userApplicationRoles.Contains("data_architect"))
        {
            return "data_architect";
        }

        if (!OuMatchesModelGroup(userOrganizationUnit, modelGroupName))
        {
            return null;
        }

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

    private string? ResolveEffectiveRoleForModel(
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
            .FirstOrDefault(c => c.UserId == userId);

        if (explicitCollaboration != null)
        {
            return ApplyOuPolicyToRole(explicitCollaboration.Role, userOrganizationUnit, model.ModelGroup?.Name);
        }

        var defaultRole = ResolveDefaultRoleFromOu(userOrganizationUnit, model.ModelGroup?.Name, userApplicationRoles);
        return ApplyOuPolicyToRole(defaultRole, userOrganizationUnit, model.ModelGroup?.Name);
    }

    private async Task<bool> UserHasAccessAsync(Guid modelId, string minimumRole = "viewer")
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return false;
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return false;
        }

        if (user.IsSuperAdmin)
        {
            return true;
        }

        var model = await _context.Models
            .Include(m => m.ModelGroup)
            .Include(m => m.Collaborators)
            .FirstOrDefaultAsync(m => m.Id == modelId);

        if (model == null)
        {
            return false;
        }

        var userApplicationRoles = await GetUserApplicationRoleNamesAsync(userId);
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

    private async Task<bool> IsCurrentUserSuperAdminAsync()
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return false;
        }

        var user = await _context.Users.FindAsync(userId);
        return user?.IsSuperAdmin == true;
    }

    // ============ Model CRUD ============

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<ModelListDto>>> GetModels()
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users.FindAsync(userId);

        if (user == null)
        {
            return Ok(new List<ModelListDto>());
        }

        if (user.IsSuperAdmin)
        {
            var superAdminModels = await _context.Models
                .Include(m => m.Owner)
                .Include(m => m.ModelGroup)
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
                    YourRole = m.OwnerId == userId ? "owner" : "admin",
                    LatestVersion = m.Versions.OrderByDescending(v => v.VersionNumber).Select(v => v.VersionNumber).FirstOrDefault(),
                    ModelGroupId = m.ModelGroupId,
                    ModelGroupName = m.ModelGroup != null ? m.ModelGroup.Name : null
                })
                .ToListAsync();

            return Ok(superAdminModels);
        }

        var userApplicationRoles = await GetUserApplicationRoleNamesAsync(userId);
        var userOrganizationUnit = ExtractOrganizationUnit(user.LdapDistinguishedName);

        var models = await _context.Models
            .Include(m => m.Owner)
            .Include(m => m.ModelGroup)
            .Include(m => m.Collaborators)
            .Include(m => m.Versions)
            .OrderByDescending(m => m.UpdatedAt)
            .ToListAsync();

        var visibleModels = models
            .Select(m => new
            {
                Model = m,
                EffectiveRole = ResolveEffectiveRoleForModel(
                    m,
                    userId,
                    user.IsSuperAdmin,
                    userOrganizationUnit,
                    userApplicationRoles)
            })
            .Where(x => !string.IsNullOrWhiteSpace(x.EffectiveRole)
                && RoleHierarchy.GetValueOrDefault(x.EffectiveRole!, 0) >= RoleHierarchy.GetValueOrDefault("viewer", 0))
            .Select(x => new ModelListDto
            {
                Id = x.Model.Id,
                Name = x.Model.Name,
                Description = x.Model.Description,
                OwnerEmail = x.Model.Owner!.Email,
                DatabaseDialect = x.Model.DatabaseDialect,
                CreatedAt = x.Model.CreatedAt,
                UpdatedAt = x.Model.UpdatedAt,
                YourRole = x.EffectiveRole!,
                LatestVersion = x.Model.Versions.OrderByDescending(v => v.VersionNumber).Select(v => v.VersionNumber).FirstOrDefault(),
                ModelGroupId = x.Model.ModelGroupId,
                ModelGroupName = x.Model.ModelGroup?.Name
            })
            .ToList();

        return Ok(visibleModels);
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

        string? modelGroupName = null;
        if (request.ModelGroupId.HasValue)
        {
            var group = await _context.ModelGroups.FirstOrDefaultAsync(g => g.Id == request.ModelGroupId.Value);
            if (group == null)
            {
                return BadRequest("Model group not found");
            }

            modelGroupName = group.Name;
        }

        var activeFields = await _context.ProjectMetadataFieldDefinitions
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ToListAsync();

        var normalizedProjectMetadata = NormalizeProjectMetadata(
            request.ProjectMetadata,
            activeFields,
            request.Name,
            request.Description,
            request.DatabaseDialect,
            user.Email,
            modelGroupName);

        var model = new Model
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            OwnerId = userId,
            ModelGroupId = request.ModelGroupId,
            DatabaseDialect = request.DatabaseDialect ?? "PostgreSQL",
            ProjectMetadataJson = SerializeProjectMetadata(normalizedProjectMetadata),
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
            MapModelToDetailDto(model, initialVersion, "owner"));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ModelDetailDto>> GetModel(Guid id)
    {
        var userId = GetCurrentUserId();
        var model = await _context.Models
            .Include(m => m.Owner)
            .Include(m => m.ModelGroup)
            .Include(m => m.Collaborators)
            .Include(m => m.Versions)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (model == null)
            return NotFound();

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return Unauthorized();
        }

        var userApplicationRoles = await GetUserApplicationRoleNamesAsync(userId);
        var userOrganizationUnit = ExtractOrganizationUnit(user.LdapDistinguishedName);
        var effectiveRole = ResolveEffectiveRoleForModel(
            model,
            userId,
            user.IsSuperAdmin,
            userOrganizationUnit,
            userApplicationRoles);

        if (string.IsNullOrWhiteSpace(effectiveRole)
            || RoleHierarchy.GetValueOrDefault(effectiveRole, 0) < RoleHierarchy.GetValueOrDefault("viewer", 0))
        {
            return Forbid();
        }

        var latestVersion = model.Versions
            .Where(v => v.BranchName == "main")
            .OrderByDescending(v => v.VersionNumber)
            .FirstOrDefault();

        return Ok(MapModelToDetailDto(model, latestVersion, effectiveRole));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ModelDetailDto>> UpdateModel(Guid id, [FromBody] UpdateModelRequestDto request)
    {
        if (!await UserHasAccessAsync(id, "editor"))
            return Forbid();

        var userId = GetCurrentUserId();
        var model = await _context.Models
            .Include(m => m.Collaborators)
            .Include(m => m.ModelGroup)
            .Include(m => m.Owner)
            .Include(m => m.Versions)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (model == null)
            return NotFound();

        model.Name = request.Name ?? model.Name;
        model.Description = request.Description;
        model.DatabaseDialect = request.DatabaseDialect ?? model.DatabaseDialect;

        var activeFields = await _context.ProjectMetadataFieldDefinitions
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ToListAsync();

        var existingMetadata = DeserializeProjectMetadata(model.ProjectMetadataJson);
        if (request.ProjectMetadata != null)
        {
            foreach (var pair in request.ProjectMetadata)
            {
                var key = NormalizeMetadataKey(pair.Key);
                if (key.Length == 0)
                {
                    continue;
                }

                existingMetadata[key] = pair.Value ?? string.Empty;
            }
        }

        var normalizedProjectMetadata = NormalizeProjectMetadata(
            existingMetadata,
            activeFields,
            model.Name,
            model.Description,
            model.DatabaseDialect,
            model.Owner?.Email ?? string.Empty,
            model.ModelGroup?.Name);

        model.ProjectMetadataJson = SerializeProjectMetadata(normalizedProjectMetadata);
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

        var currentUser = await _context.Users.FindAsync(userId);
        var userRoles = currentUser != null ? await GetUserApplicationRoleNamesAsync(userId) : new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var userOu = currentUser != null ? ExtractOrganizationUnit(currentUser.LdapDistinguishedName) : string.Empty;
        var effectiveRole = ResolveEffectiveRoleForModel(
            model,
            userId,
            currentUser?.IsSuperAdmin == true,
            userOu,
            userRoles) ?? "viewer";

        return Ok(MapModelToDetailDto(model, latestVer, effectiveRole));
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
            var userApplicationRoles = await GetUserApplicationRoleNamesAsync(userId);
            var userOrganizationUnit = user != null ? ExtractOrganizationUnit(user.LdapDistinguishedName) : string.Empty;

            var accessibleModelIds = (await _context.Models
                .Include(m => m.ModelGroup)
                .Include(m => m.Collaborators)
                .ToListAsync())
                .Where(m => !string.IsNullOrWhiteSpace(ResolveEffectiveRoleForModel(
                    m,
                    userId,
                    false,
                    userOrganizationUnit,
                    userApplicationRoles)))
                .Select(m => m.Id)
                .ToList();

            visibleModels = _context.Models.Where(m => accessibleModelIds.Contains(m.Id));
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

    [HttpGet("project-metadata/fields")]
    [AllowAnonymous]
    public async Task<ActionResult<List<ProjectMetadataFieldDefinitionDto>>> GetProjectMetadataFields()
    {
        var fields = await _context.ProjectMetadataFieldDefinitions
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.DisplayName)
            .ToListAsync();

        var mapped = fields.Select(field =>
        {
            List<string> options;
            try
            {
                options = JsonSerializer.Deserialize<List<string>>(field.OptionsJson ?? "[]") ?? new List<string>();
            }
            catch
            {
                options = new List<string>();
            }

            return new ProjectMetadataFieldDefinitionDto
            {
                Id = field.Id,
                FieldKey = field.FieldKey,
                DisplayName = field.DisplayName,
                FieldType = field.FieldType,
                IsRequired = field.IsRequired,
                IsSystem = field.IsSystem,
                IsActive = field.IsActive,
                SortOrder = field.SortOrder,
                Options = options
            };
        }).ToList();

        return Ok(mapped);
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

    [HttpPost("reverse-engine/tables")]
    public async Task<ActionResult<List<ReverseEngineTableDto>>> GetReverseEngineTables([FromBody] ReverseEngineGetTablesRequestDto request, CancellationToken cancellationToken)
    {
        if (!await IsCurrentUserSuperAdminAsync())
        {
            return Forbid();
        }

        try
        {
            var tables = await _reverseEngineeringService.GetTablesAsync(request, cancellationToken);
            return Ok(tables);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Reverse-engine table discovery failed for database type {DatabaseType}", request.DatabaseType);
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("reverse-engine/generate-dbml")]
    public async Task<ActionResult<ReverseEngineGenerateDbmlResponseDto>> GenerateDbmlFromReverseEngine([FromBody] ReverseEngineGenerateDbmlRequestDto request, CancellationToken cancellationToken)
    {
        if (!await IsCurrentUserSuperAdminAsync())
        {
            return Forbid();
        }

        try
        {
            var result = await _reverseEngineeringService.GenerateDbmlAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Reverse-engine DBML generation failed for database type {DatabaseType}", request.DatabaseType);
            return BadRequest(new { message = ex.Message });
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
            .Include(m => m.Collaborators)
            .Include(m => m.ModelGroup)
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

        var currentUser = await _context.Users.FindAsync(userId);
        var userRoles = currentUser != null ? await GetUserApplicationRoleNamesAsync(userId) : new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var userOu = currentUser != null ? ExtractOrganizationUnit(currentUser.LdapDistinguishedName) : string.Empty;
        var effectiveRole = ResolveEffectiveRoleForModel(
            model,
            userId,
            currentUser?.IsSuperAdmin == true,
            userOu,
            userRoles) ?? "viewer";

        return Ok(MapModelToDetailDto(model, restoredVersion, effectiveRole));
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

    private ModelDetailDto MapModelToDetailDto(Model model, ModelVersion? version, string effectiveRole)
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

        var metadata = DeserializeProjectMetadata(model.ProjectMetadataJson);

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
            YourRole = effectiveRole,
            ModelGroupId = model.ModelGroupId,
            ModelGroupName = model.ModelGroup?.Name,
            ProjectMetadata = metadata
        };
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
