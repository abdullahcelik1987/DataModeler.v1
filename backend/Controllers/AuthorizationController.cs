using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DataModeler.API.Data;
using DataModeler.API.Models;
using DataModeler.API.DTOs;
using DataModeler.API.Services;
using System.Text.Json;
using System.Security.Claims;

namespace DataModeler.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuthorizationController : ControllerBase
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);
    private static readonly HashSet<string> AllowedRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "viewer",
        "developer",
        "domain_architect",
        "data_architect",
        "admin",
        "data_steward",
        // Backward compatibility
        "editor",
        "owner"
    };

    private readonly DataModelerDbContext _dbContext;
    private readonly ILdapAuthService _ldapAuthService;
    private readonly ILogger<AuthorizationController> _logger;

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
        "admin",
    };

    public AuthorizationController(DataModelerDbContext dbContext, ILdapAuthService ldapAuthService, ILogger<AuthorizationController> logger)
    {
        _dbContext = dbContext;
        _ldapAuthService = ldapAuthService;
        _logger = logger;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("sub")?.Value
                       ?? User.FindFirst("nameid")?.Value
                       ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    private async Task<bool> IsCurrentUserSuperAdminAsync()
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue)
        {
            return false;
        }

        var currentUser = await _dbContext.Users.FindAsync(userId.Value);
        return currentUser?.IsSuperAdmin == true;
    }

    private static string DeriveUsername(User user)
    {
        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            var at = user.Email.IndexOf('@');
            return at > 0 ? user.Email[..at] : user.Email;
        }

        if (!string.IsNullOrWhiteSpace(user.LdapDistinguishedName))
        {
            var dn = user.LdapDistinguishedName;
            var cnPrefix = "CN=";
            if (dn.StartsWith(cnPrefix, StringComparison.OrdinalIgnoreCase))
            {
                var nextComma = dn.IndexOf(',');
                if (nextComma > cnPrefix.Length)
                {
                    return dn[cnPrefix.Length..nextComma];
                }
            }
        }

        return string.Empty;
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

    private static IReadOnlyList<string> ParsePermissions(string? permissionsJson)
    {
        if (string.IsNullOrWhiteSpace(permissionsJson))
        {
            return Array.Empty<string>();
        }

        try
        {
            return JsonSerializer.Deserialize<List<string>>(permissionsJson, SerializerOptions)
                ?.Where(permission => !string.IsNullOrWhiteSpace(permission))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(permission => permission, StringComparer.OrdinalIgnoreCase)
                .ToList()
                ?? new List<string>();
        }
        catch
        {
            return Array.Empty<string>();
        }
    }

    private static string NormalizeOuKey(string? value)
    {
        return (value ?? string.Empty).Trim().ToLowerInvariant();
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

        var normalizedUserOu = NormalizeOuKey(userOrganizationUnit);
        var normalizedModelOu = NormalizeOuKey(modelGroupName);
        if (string.IsNullOrWhiteSpace(normalizedUserOu) || string.IsNullOrWhiteSpace(normalizedModelOu))
        {
            return null;
        }

        if (!string.Equals(normalizedUserOu, normalizedModelOu, StringComparison.OrdinalIgnoreCase))
        {
            return null;
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

    /// <summary>
    /// Get all users (admin only)
    /// </summary>
    [HttpGet("users")]
    [Authorize]
    public async Task<IActionResult> GetUsers()
    {
        try
        {
            var userId = GetCurrentUserId();

            if (!userId.HasValue)
            {
                return Unauthorized();
            }

            var currentUser = await _dbContext.Users.FindAsync(userId.Value);
            if (currentUser?.IsSuperAdmin != true)
            {
                return Forbid();
            }

            var users = await _dbContext.Users
                .OrderBy(u => u.Email)
                .ToListAsync();

            var mappedUsers = users.Select(u => new UserDto
            {
                Id = u.Id,
                Email = u.Email,
                Username = DeriveUsername(u),
                OrganizationUnit = ExtractOrganizationUnit(u.LdapDistinguishedName),
                IsSuperAdmin = u.IsSuperAdmin,
                IsActive = u.IsActive,
                AuthSource = !string.IsNullOrEmpty(u.LdapDistinguishedName)
                    ? "ldap"
                    : (!string.IsNullOrEmpty(u.AzureAdId) ? "azure_ad" : "local"),
                LastLogin = u.LastLogin,
                CreatedAt = u.CreatedAt
            }).ToList();

            return Ok(new { success = true, data = mappedUsers });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving users");
            return StatusCode(500, new { message = "Error retrieving users" });
        }
    }

    [HttpGet("ldap-users")]
    [Authorize]
    public async Task<IActionResult> SearchLdapUsers([FromQuery] string q)
    {
        if (!await IsCurrentUserSuperAdminAsync())
        {
            return Forbid();
        }

        if (!await _ldapAuthService.HasEnabledConfigAsync())
        {
            return BadRequest(new
            {
                success = false,
                message = "LDAP is disabled or not configured. Enable LDAP in Admin > AD Settings and save first."
            });
        }

        var query = (q ?? string.Empty).Trim();
        if (query.Length < 2)
        {
            return BadRequest(new { success = false, message = "Search query must be at least 2 characters." });
        }

        var foundUsers = await _ldapAuthService.SearchUsersAsync(query, 100);
        var normalizedEmails = foundUsers
            .Select(u => (u.Email ?? string.Empty).Trim().ToLowerInvariant())
            .Where(e => !string.IsNullOrWhiteSpace(e))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var importedByEmail = normalizedEmails.Count == 0
            ? new Dictionary<string, User>(StringComparer.OrdinalIgnoreCase)
            : await _dbContext.Users
                .Where(u => normalizedEmails.Contains(u.EmailLower))
                .ToDictionaryAsync(u => u.EmailLower, u => u, StringComparer.OrdinalIgnoreCase);

        var data = foundUsers
            .Where(u => !string.IsNullOrWhiteSpace(u.Email))
            .GroupBy(u => u.Email.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(group =>
            {
                var ldapUser = group.First();
                var emailLower = ldapUser.Email.Trim().ToLowerInvariant();
                var imported = importedByEmail.TryGetValue(emailLower, out var existingUser);

                return new
                {
                    email = ldapUser.Email.Trim(),
                    username = ldapUser.Username,
                    displayName = ldapUser.DisplayName,
                    distinguishedName = ldapUser.DistinguishedName,
                    organizationUnit = ExtractOrganizationUnit(ldapUser.DistinguishedName),
                    isImported = imported,
                    userId = imported ? existingUser!.Id : (Guid?)null,
                    authSource = imported && !string.IsNullOrWhiteSpace(existingUser!.LdapDistinguishedName)
                        ? "ldap"
                        : (imported && !string.IsNullOrWhiteSpace(existingUser!.AzureAdId) ? "azure_ad" : (imported ? "local" : "ldap"))
                };
            })
            .OrderBy(x => x.displayName)
            .ThenBy(x => x.email)
            .ToList();

        return Ok(new
        {
            success = true,
            importedCount = data.Count(x => x.isImported),
            data
        });
    }

    [HttpPost("ldap-users/import")]
    [Authorize]
    public async Task<IActionResult> ImportLdapUser([FromBody] ImportLdapUserRequest request)
    {
        if (!await IsCurrentUserSuperAdminAsync())
        {
            return Forbid();
        }

        if (!await _ldapAuthService.HasEnabledConfigAsync())
        {
            return BadRequest(new
            {
                success = false,
                message = "LDAP is disabled or not configured. Enable LDAP in Admin > AD Settings and save first."
            });
        }

        var email = (request.Email ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new { success = false, message = "Email is required for import." });
        }

        var emailLower = email.ToLowerInvariant();
        var now = DateTime.UtcNow;

        var existingUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.EmailLower == emailLower);
        var created = false;

        if (existingUser == null)
        {
            existingUser = new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                EmailLower = emailLower,
                LdapDistinguishedName = (request.DistinguishedName ?? string.Empty).Trim(),
                IsActive = true,
                IsSuperAdmin = false,
                CreatedAt = now,
                UpdatedAt = now
            };

            _dbContext.Users.Add(existingUser);
            created = true;
        }
        else
        {
            var newDn = (request.DistinguishedName ?? string.Empty).Trim();
            if (!string.IsNullOrWhiteSpace(newDn) && !string.Equals(existingUser.LdapDistinguishedName, newDn, StringComparison.Ordinal))
            {
                existingUser.LdapDistinguishedName = newDn;
            }

            if (!existingUser.IsActive)
            {
                existingUser.IsActive = true;
            }

            existingUser.UpdatedAt = now;
        }

        await _dbContext.SaveChangesAsync();

        var authSource = !string.IsNullOrWhiteSpace(existingUser.LdapDistinguishedName)
            ? "ldap"
            : (!string.IsNullOrWhiteSpace(existingUser.AzureAdId) ? "azure_ad" : "local");

        return Ok(new
        {
            success = true,
            message = created ? "User imported successfully." : "User already exists and LDAP identity was updated.",
            created,
            data = new
            {
                id = existingUser.Id,
                email = existingUser.Email,
                username = DeriveUsername(existingUser),
                organizationUnit = ExtractOrganizationUnit(existingUser.LdapDistinguishedName),
                isSuperAdmin = existingUser.IsSuperAdmin,
                isActive = existingUser.IsActive,
                authSource
            }
        });
    }

    [HttpGet("ldap-users/search")]
    [Authorize]
    public async Task<IActionResult> SearchAndSyncLdapUsers([FromQuery] string q)
    {
        if (!await IsCurrentUserSuperAdminAsync())
        {
            return Forbid();
        }

        if (!await _ldapAuthService.HasEnabledConfigAsync())
        {
            return BadRequest(new
            {
                success = false,
                message = "LDAP is disabled or not configured. Enable LDAP in Admin > AD Settings and save first."
            });
        }

        var query = (q ?? string.Empty).Trim();
        if (query.Length < 2)
        {
            return BadRequest(new { message = "Search query must be at least 2 characters." });
        }

        var foundUsers = await _ldapAuthService.SearchUsersAsync(query, 100);

        if (foundUsers.Count == 0)
        {
            return Ok(new { success = true, syncedCount = 0, data = new List<UserDto>() });
        }

        var now = DateTime.UtcNow;
        var normalizedEmails = foundUsers
            .Select(u => u.Email.Trim())
            .Where(e => !string.IsNullOrWhiteSpace(e))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var existingUsers = await _dbContext.Users
            .Where(u => normalizedEmails.Select(e => e.ToLower()).Contains(u.EmailLower))
            .ToListAsync();

        var existingByEmail = existingUsers
            .ToDictionary(u => u.EmailLower, u => u, StringComparer.OrdinalIgnoreCase);

        var addedCount = 0;
        foreach (var ldapUser in foundUsers)
        {
            var email = ldapUser.Email.Trim();
            if (string.IsNullOrWhiteSpace(email))
            {
                continue;
            }

            var emailLower = email.ToLowerInvariant();
            if (existingByEmail.TryGetValue(emailLower, out var existing))
            {
                if (string.IsNullOrWhiteSpace(existing.LdapDistinguishedName) || existing.LdapDistinguishedName != ldapUser.DistinguishedName)
                {
                    existing.LdapDistinguishedName = ldapUser.DistinguishedName;
                    existing.UpdatedAt = now;
                }
            }
            else
            {
                var newUser = new User
                {
                    Id = Guid.NewGuid(),
                    Email = email,
                    EmailLower = emailLower,
                    LdapDistinguishedName = ldapUser.DistinguishedName,
                    IsActive = true,
                    IsSuperAdmin = false,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                _dbContext.Users.Add(newUser);
                existingByEmail[emailLower] = newUser;
                addedCount++;
            }
        }

        await _dbContext.SaveChangesAsync();

        var users = existingByEmail.Values
            .Select(u => new UserDto
            {
                Id = u.Id,
                Email = u.Email,
                Username = DeriveUsername(u),
                OrganizationUnit = ExtractOrganizationUnit(u.LdapDistinguishedName),
                IsSuperAdmin = u.IsSuperAdmin,
                IsActive = u.IsActive,
                AuthSource = !string.IsNullOrEmpty(u.LdapDistinguishedName)
                    ? "ldap"
                    : (!string.IsNullOrEmpty(u.AzureAdId) ? "azure_ad" : "local"),
                LastLogin = u.LastLogin,
                CreatedAt = u.CreatedAt
            })
            .OrderBy(u => u.Email)
            .ToList();

        return Ok(new { success = true, syncedCount = addedCount, data = users });
    }

    [HttpGet("app-roles")]
    [Authorize]
    public async Task<IActionResult> GetApplicationRoles()
    {
        if (!await IsCurrentUserSuperAdminAsync())
        {
            return Forbid();
        }

        var roles = await _dbContext.ApplicationRoles
            .Where(r => r.IsActive)
            .OrderBy(r => r.DisplayName)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.DisplayName,
                r.Description,
                permissions = ParsePermissions(r.PermissionsJson),
                r.IsSystem,
                r.IsActive,
                r.CreatedAt
            })
            .ToListAsync();

        return Ok(new { success = true, data = roles });
    }

    [HttpGet("app-permissions")]
    [Authorize]
    public async Task<IActionResult> GetApplicationPermissionCatalog()
    {
        if (!await IsCurrentUserSuperAdminAsync())
        {
            return Forbid();
        }

        return Ok(new { success = true, data = RolePermissionCatalog.Definitions });
    }

    [HttpPost("app-roles")]
    [Authorize]
    public async Task<IActionResult> CreateApplicationRole([FromBody] CreateApplicationRoleRequest request)
    {
        if (!await IsCurrentUserSuperAdminAsync())
        {
            return Forbid();
        }

        var normalizedName = (request.Name ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalizedName))
        {
            return BadRequest(new { message = "Role name is required." });
        }

        var exists = await _dbContext.ApplicationRoles.AnyAsync(r => r.Name == normalizedName);
        if (exists)
        {
            return BadRequest(new { message = "Role already exists." });
        }

        var role = new ApplicationRole
        {
            Id = Guid.NewGuid(),
            Name = normalizedName,
            DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? normalizedName : request.DisplayName.Trim(),
            Description = request.Description?.Trim(),
            PermissionsJson = JsonSerializer.Serialize(
                RolePermissionCatalog.NormalizePermissions(request.Permissions),
                SerializerOptions),
            IsSystem = false,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.ApplicationRoles.Add(role);
        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Role created successfully.",
            data = new
            {
                role.Id,
                role.Name,
                role.DisplayName,
                role.Description,
                permissions = ParsePermissions(role.PermissionsJson)
            }
        });
    }

    [HttpPut("app-roles/{roleId:guid}")]
    [Authorize]
    public async Task<IActionResult> UpdateApplicationRole(Guid roleId, [FromBody] UpdateApplicationRoleRequest request)
    {
        if (!await IsCurrentUserSuperAdminAsync())
        {
            return Forbid();
        }

        var role = await _dbContext.ApplicationRoles.FirstOrDefaultAsync(r => r.Id == roleId && r.IsActive);
        if (role == null)
        {
            return NotFound(new { message = "Role not found." });
        }

        role.DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? role.DisplayName : request.DisplayName.Trim();
        role.Description = request.Description?.Trim();
        role.PermissionsJson = JsonSerializer.Serialize(
            RolePermissionCatalog.NormalizePermissions(request.Permissions),
            SerializerOptions);
        role.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Role permissions updated successfully.",
            data = new
            {
                role.Id,
                role.Name,
                role.DisplayName,
                role.Description,
                permissions = ParsePermissions(role.PermissionsJson)
            }
        });
    }

    [HttpDelete("app-roles/{roleId:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteApplicationRole(Guid roleId)
    {
        if (!await IsCurrentUserSuperAdminAsync())
        {
            return Forbid();
        }

        var role = await _dbContext.ApplicationRoles.FindAsync(roleId);
        if (role == null)
        {
            return NotFound(new { message = "Role not found." });
        }

        if (role.IsSystem)
        {
            return BadRequest(new { message = "System roles cannot be deleted." });
        }

        var assigned = await _dbContext.UserApplicationRoles.AnyAsync(x => x.RoleId == roleId);
        if (assigned)
        {
            return BadRequest(new { message = "Role is assigned to users. Remove assignments first." });
        }

        _dbContext.ApplicationRoles.Remove(role);
        await _dbContext.SaveChangesAsync();

        return Ok(new { success = true, message = "Role deleted successfully." });
    }

    [HttpGet("user-roles/{userId:guid}")]
    [Authorize]
    public async Task<IActionResult> GetUserApplicationRoles(Guid userId)
    {
        if (!await IsCurrentUserSuperAdminAsync())
        {
            return Forbid();
        }

        var roles = await _dbContext.UserApplicationRoles
            .Where(x => x.UserId == userId)
            .Include(x => x.Role)
            .OrderBy(x => x.Role!.DisplayName)
            .Select(x => new
            {
                x.RoleId,
                x.AssignedAt,
                role = new
                {
                    x.Role!.Id,
                    x.Role.Name,
                    x.Role.DisplayName,
                    x.Role.Description,
                    x.Role.IsSystem
                }
            })
            .ToListAsync();

        return Ok(new { success = true, data = roles });
    }

    [HttpPost("assign-user-role")]
    [Authorize]
    public async Task<IActionResult> AssignUserRole([FromBody] AssignUserRoleRequest request)
    {
        if (!await IsCurrentUserSuperAdminAsync())
        {
            return Forbid();
        }

        var user = await _dbContext.Users.FindAsync(request.UserId);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        var role = await _dbContext.ApplicationRoles.FirstOrDefaultAsync(r => r.Id == request.RoleId && r.IsActive);
        if (role == null)
        {
            return NotFound(new { message = "Role not found." });
        }

        var exists = await _dbContext.UserApplicationRoles.AnyAsync(x => x.UserId == request.UserId && x.RoleId == request.RoleId);
        if (!exists)
        {
            _dbContext.UserApplicationRoles.Add(new UserApplicationRole
            {
                UserId = request.UserId,
                RoleId = request.RoleId,
                AssignedAt = DateTime.UtcNow,
                AssignedBy = GetCurrentUserId()
            });

            await _dbContext.SaveChangesAsync();
        }

        return Ok(new { success = true, message = "Role assigned successfully." });
    }

    [HttpDelete("user-roles/{userId:guid}/{roleId:guid}")]
    [Authorize]
    public async Task<IActionResult> RemoveUserRole(Guid userId, Guid roleId)
    {
        if (!await IsCurrentUserSuperAdminAsync())
        {
            return Forbid();
        }

        var assignment = await _dbContext.UserApplicationRoles
            .FirstOrDefaultAsync(x => x.UserId == userId && x.RoleId == roleId);

        if (assignment == null)
        {
            return NotFound(new { message = "User role assignment not found." });
        }

        _dbContext.UserApplicationRoles.Remove(assignment);
        await _dbContext.SaveChangesAsync();

        return Ok(new { success = true, message = "Role removed successfully." });
    }

    [HttpDelete("users/{userId:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteUser(Guid userId)
    {
        if (!await IsCurrentUserSuperAdminAsync())
        {
            return Forbid();
        }

        var currentUserId = GetCurrentUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized();
        }

        if (currentUserId.Value == userId)
        {
            return BadRequest(new { message = "You cannot delete the currently signed-in user." });
        }

        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        if (user.IsSuperAdmin)
        {
            return BadRequest(new { message = "Super admin users cannot be deleted from this screen." });
        }

        if (await _dbContext.Models.AnyAsync(m => m.OwnerId == userId))
        {
            return BadRequest(new { message = "This user owns one or more models. Reassign or delete those models first." });
        }

        if (await _dbContext.ModelVersions.AnyAsync(v => v.CreatedBy == userId))
        {
            return BadRequest(new { message = "This user has model version history. User deletion is blocked to preserve auditability." });
        }

        if (await _dbContext.ModelChanges.AnyAsync(c => c.UserId == userId))
        {
            return BadRequest(new { message = "This user has recorded model changes. User deletion is blocked to preserve change history." });
        }

        if (await _dbContext.RepositoryConnections.AnyAsync(r => r.CreatedBy == userId))
        {
            return BadRequest(new { message = "This user created repository connections. Reassign or remove those connections first." });
        }

        _dbContext.Users.Remove(user);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Super admin {CurrentUserId} deleted user {DeletedUserId}", currentUserId.Value, userId);

        return Ok(new { success = true, message = "User deleted successfully." });
    }

    [HttpPost("users/{userId:guid}/refresh-ldap")]
    [Authorize]
    public async Task<IActionResult> RefreshUserFromLdap(Guid userId)
    {
        if (!await IsCurrentUserSuperAdminAsync())
        {
            return Forbid();
        }

        if (!await _ldapAuthService.HasEnabledConfigAsync())
        {
            return BadRequest(new
            {
                success = false,
                message = "LDAP is disabled or not configured. Enable LDAP in Admin > AD Settings and save first."
            });
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            return NotFound(new { success = false, message = "User not found." });
        }

        if (string.IsNullOrWhiteSpace(user.Email))
        {
            return BadRequest(new { success = false, message = "User email is missing; LDAP refresh cannot be performed." });
        }

        var ldapUsers = await _ldapAuthService.SearchUsersAsync(user.Email.Trim(), 50);
        var exactMatch = ldapUsers.FirstOrDefault(x =>
            !string.IsNullOrWhiteSpace(x.Email) &&
            string.Equals(x.Email.Trim(), user.Email.Trim(), StringComparison.OrdinalIgnoreCase));

        if (exactMatch == null)
        {
            var currentUsername = DeriveUsername(user);
            if (!string.IsNullOrWhiteSpace(currentUsername))
            {
                exactMatch = ldapUsers.FirstOrDefault(x =>
                    string.Equals(x.Username?.Trim(), currentUsername.Trim(), StringComparison.OrdinalIgnoreCase));
            }
        }

        if (exactMatch == null)
        {
            return NotFound(new { success = false, message = "User could not be found in Active Directory." });
        }

        if (!string.IsNullOrWhiteSpace(exactMatch.Email))
        {
            user.Email = exactMatch.Email.Trim();
            user.EmailLower = user.Email.ToLowerInvariant();
        }

        user.LdapDistinguishedName = exactMatch.DistinguishedName?.Trim();
        user.IsActive = true;
        user.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "User information refreshed from Active Directory.",
            data = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                Username = DeriveUsername(user),
                OrganizationUnit = ExtractOrganizationUnit(user.LdapDistinguishedName),
                IsSuperAdmin = user.IsSuperAdmin,
                IsActive = user.IsActive,
                AuthSource = !string.IsNullOrWhiteSpace(user.LdapDistinguishedName)
                    ? "ldap"
                    : (!string.IsNullOrWhiteSpace(user.AzureAdId) ? "azure_ad" : "local"),
                LastLogin = user.LastLogin,
                CreatedAt = user.CreatedAt
            }
        });
    }

    /// <summary>
    /// Assign user to model with role (admin only)
    /// </summary>
    [HttpPost("assign-model-role")]
    [Authorize]
    public async Task<IActionResult> AssignModelRole([FromBody] AssignModelRoleRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            if (!currentUserId.HasValue)
            {
                return Unauthorized();
            }

            var currentUser = await _dbContext.Users.FindAsync(currentUserId.Value);
            if (currentUser?.IsSuperAdmin != true)
            {
                return Forbid();
            }

            var model = await _dbContext.Models.FindAsync(request.ModelId);
            if (model == null)
            {
                return NotFound(new { message = "Model not found" });
            }

            var targetUser = await _dbContext.Users.FindAsync(request.UserId);
            if (targetUser == null)
            {
                return NotFound(new { message = "User not found" });
            }

            var normalizedRole = (request.Role ?? string.Empty).Trim().ToLowerInvariant();
            if (!AllowedRoles.Contains(normalizedRole))
            {
                return BadRequest(new { message = "Invalid role. Allowed roles: viewer, developer, domain_architect, data_architect, admin, data_steward" });
            }

            // Check if assignment exists
            var existing = await _dbContext.ModelCollaborators
                .FirstOrDefaultAsync(mc => mc.ModelId == request.ModelId && mc.UserId == request.UserId);

            if (existing != null)
            {
                existing.Role = normalizedRole;
                _dbContext.ModelCollaborators.Update(existing);
            }
            else
            {
                var collaboration = new ModelCollaborator
                {
                    ModelId = request.ModelId,
                    UserId = request.UserId,
                    Role = normalizedRole,
                    AssignedBy = currentUserId.Value
                };

                _dbContext.ModelCollaborators.Add(collaboration);
            }

            await _dbContext.SaveChangesAsync();

            // Log action
            var auditLog = new AuditLog
            {
                UserId = currentUserId.Value,
                Action = "assign_model_role",
                ModelId = request.ModelId,
                Details = $"Assigned {normalizedRole} role to {targetUser.Email}",
                Timestamp = DateTime.UtcNow
            };

            _dbContext.AuditLogs.Add(auditLog);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation(
                "User {UserId} assigned {Role} role to {TargetUserId} for model {ModelId}",
                currentUserId.Value, normalizedRole, request.UserId, request.ModelId);

            return Ok(new { success = true, message = "Role assigned successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning model role");
            return StatusCode(500, new { message = "Error assigning role" });
        }
    }

    /// <summary>
    /// Get user's models and roles
    /// </summary>
    [HttpGet("user-models/{userId}")]
    [Authorize]
    public async Task<IActionResult> GetUserModels(Guid userId)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            if (!currentUserId.HasValue)
            {
                return Unauthorized();
            }

            // Only super admin or the user themselves can view
            var currentUser = await _dbContext.Users.FindAsync(currentUserId.Value);
            if (currentUser?.IsSuperAdmin != true && currentUserId.Value != userId)
            {
                return Forbid();
            }

            var targetUser = await _dbContext.Users.FindAsync(userId);
            if (targetUser == null)
            {
                return NotFound(new { message = "User not found." });
            }

            var targetUserOu = ExtractOrganizationUnit(targetUser.LdapDistinguishedName);
            var targetUserAppRoles = (await _dbContext.UserApplicationRoles
                    .Where(x => x.UserId == userId)
                    .Include(x => x.Role)
                    .Where(x => x.Role != null && x.Role.IsActive)
                    .Select(x => x.Role!.Name)
                    .ToListAsync())
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Select(name => name.Trim().ToLowerInvariant())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var models = (await _dbContext.Models
                    .Include(m => m.ModelGroup)
                    .Include(m => m.Collaborators)
                    .OrderBy(m => m.Name)
                    .ToListAsync())
                .Select(m =>
                {
                    var explicitRole = m.Collaborators.FirstOrDefault(c => c.UserId == userId)?.Role;
                    var defaultRole = ResolveDefaultRoleFromOu(targetUserOu, m.ModelGroup?.Name, targetUserAppRoles);

                    var effectiveRole = m.OwnerId == userId
                        ? "owner"
                        : (!string.IsNullOrWhiteSpace(explicitRole)
                            ? explicitRole!
                            : (!string.IsNullOrWhiteSpace(defaultRole) ? defaultRole! : "none"));

                    var roleSource = m.OwnerId == userId
                        ? "owner"
                        : (!string.IsNullOrWhiteSpace(explicitRole)
                            ? "explicit"
                            : (!string.IsNullOrWhiteSpace(defaultRole)
                                ? (string.Equals(defaultRole, "admin", StringComparison.OrdinalIgnoreCase)
                                    ? "default_global"
                                    : "default_ou")
                                : "none"));

                    return new
                    {
                        model = new
                        {
                            id = m.Id,
                            name = m.Name,
                            modelGroupName = m.ModelGroup != null ? m.ModelGroup.Name : null,
                            role = effectiveRole,
                            explicitRole,
                            defaultRole,
                            roleSource,
                            hasExplicitAssignment = !string.IsNullOrWhiteSpace(explicitRole)
                        }
                    };
                })
                .ToList();

            return Ok(new { success = true, data = models });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user models");
            return StatusCode(500, new { message = "Error retrieving user models" });
        }
    }

    /// <summary>
    /// Remove user from model
    /// </summary>
    [HttpDelete("remove-model-access")]
    [Authorize]
    public async Task<IActionResult> RemoveModelAccess([FromQuery] Guid modelId, [FromQuery] Guid userId)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            if (!currentUserId.HasValue)
            {
                return Unauthorized();
            }

            var currentUser = await _dbContext.Users.FindAsync(currentUserId.Value);
            if (currentUser?.IsSuperAdmin != true)
            {
                return Forbid();
            }

            var collaboration = await _dbContext.ModelCollaborators
                .FirstOrDefaultAsync(mc => mc.ModelId == modelId && mc.UserId == userId);

            if (collaboration == null)
            {
                return Ok(new { success = true, message = "User already has the default viewer role for this model." });
            }

            _dbContext.ModelCollaborators.Remove(collaboration);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("User {UserId} removed {TargetUserId} from model {ModelId}", 
                currentUserId.Value, userId, modelId);

            return Ok(new { success = true, message = "Model-specific role override removed. User now falls back to default OU-based role." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing model access");
            return StatusCode(500, new { message = "Error removing access" });
        }
    }
}

public class AssignModelRoleRequest
{
    public Guid ModelId { get; set; }
    public Guid UserId { get; set; }
    public string Role { get; set; } = "viewer"; // viewer, editor, owner
}

public class CreateApplicationRoleRequest
{
    public string Name { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? Description { get; set; }
    public List<string> Permissions { get; set; } = new();
}

public class UpdateApplicationRoleRequest
{
    public string? DisplayName { get; set; }
    public string? Description { get; set; }
    public List<string> Permissions { get; set; } = new();
}

public class AssignUserRoleRequest
{
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
}

public class ImportLdapUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string? DisplayName { get; set; }
    public string? DistinguishedName { get; set; }
}

public static class RolePermissionCatalog
{
    public static readonly IReadOnlyList<PermissionModuleDefinition> Definitions = new[]
    {
        new PermissionModuleDefinition(
            "models",
            "Data Models",
            new[]
            {
                new PermissionActionDefinition("models.view", "View Data Models screen"),
                new PermissionActionDefinition("models.create", "Create new model"),
                new PermissionActionDefinition("models.import", "Import model"),
                new PermissionActionDefinition("models.export", "Export model"),
                new PermissionActionDefinition("models.group.manage", "Manage model groups"),
                new PermissionActionDefinition("models.open", "Open model from list")
            }),
        new PermissionModuleDefinition(
            "designer",
            "Designer",
            new[]
            {
                new PermissionActionDefinition("designer.view", "View Designer screen"),
                new PermissionActionDefinition("designer.metadata.edit", "Edit project metadata"),
                new PermissionActionDefinition("designer.dbml.edit", "Edit DBML"),
                new PermissionActionDefinition("designer.dbml.search", "Search DBML"),
                new PermissionActionDefinition("designer.diagram.view", "View ER diagram"),
                new PermissionActionDefinition("designer.diagram.focus", "Search / focus ER diagram"),
                new PermissionActionDefinition("designer.diagram.fullscreen", "Open ER diagram fullscreen"),
                new PermissionActionDefinition("designer.table.create", "Create table"),
                new PermissionActionDefinition("designer.table.edit", "Edit table"),
                new PermissionActionDefinition("designer.save", "Save model changes")
            }),
        new PermissionModuleDefinition(
            "change_requests",
            "Change Requests",
            new[]
            {
                new PermissionActionDefinition("change_requests.view", "View Change Requests screen"),
                new PermissionActionDefinition("change_requests.open", "Open change request detail"),
                new PermissionActionDefinition("change_requests.create", "Create change request"),
                new PermissionActionDefinition("change_requests.submit", "Submit own draft change request"),
                new PermissionActionDefinition("change_requests.pending.view", "View Onay Bekleyenler tab"),
                new PermissionActionDefinition("change_requests.approve", "Approve pending change request"),
                new PermissionActionDefinition("change_requests.reject", "Reject pending change request"),
                new PermissionActionDefinition("change_requests.merge", "Mark approved request as merged"),
                new PermissionActionDefinition("change_requests.sql.download", "Download generated SQL script")
            }),
        new PermissionModuleDefinition(
            "admin.ad",
            "Admin Console / AD Settings",
            new[]
            {
                new PermissionActionDefinition("admin.ad.view", "View AD Settings"),
                new PermissionActionDefinition("admin.ad.edit", "Update AD Settings"),
                new PermissionActionDefinition("admin.ad.test", "Test AD connection")
            }),
        new PermissionModuleDefinition(
            "admin.users",
            "Admin Console / Users",
            new[]
            {
                new PermissionActionDefinition("admin.users.view", "View users"),
                new PermissionActionDefinition("admin.users.search_ad", "Search / sync AD users"),
                new PermissionActionDefinition("admin.users.delete", "Delete user"),
                new PermissionActionDefinition("admin.users.assign_model_role", "Assign model role to user"),
                new PermissionActionDefinition("admin.users.reset_model_role", "Reset model role to viewer"),
                new PermissionActionDefinition("admin.users.assign_app_role", "Assign persistent role to user"),
                new PermissionActionDefinition("admin.users.remove_app_role", "Remove persistent role from user")
            }),
        new PermissionModuleDefinition(
            "admin.roles",
            "Admin Console / Roles",
            new[]
            {
                new PermissionActionDefinition("admin.roles.view", "View role management"),
                new PermissionActionDefinition("admin.roles.create", "Create role"),
                new PermissionActionDefinition("admin.roles.edit", "Edit role permissions"),
                new PermissionActionDefinition("admin.roles.delete", "Delete custom role")
            }),
        new PermissionModuleDefinition(
            "admin.audit",
            "Admin Console / Audit Logs",
            new[]
            {
                new PermissionActionDefinition("admin.audit.view", "View audit logs"),
                new PermissionActionDefinition("admin.audit.export", "Export audit logs")
            }),
        new PermissionModuleDefinition(
            "admin.repositories",
            "Admin Console / Repositories",
            new[]
            {
                new PermissionActionDefinition("admin.repositories.view", "View repositories"),
                new PermissionActionDefinition("admin.repositories.test", "Test repository connection")
            }),
        new PermissionModuleDefinition(
            "admin.data_types",
            "Admin Console / Data Types",
            new[]
            {
                new PermissionActionDefinition("admin.data_types.view", "View database type catalog"),
                new PermissionActionDefinition("admin.data_types.edit", "Manage database systems and data types")
            }),
        new PermissionModuleDefinition(
            "admin.project_metadata",
            "Admin Console / Project Metadata",
            new[]
            {
                new PermissionActionDefinition("admin.project_metadata.view", "View project metadata field definitions"),
                new PermissionActionDefinition("admin.project_metadata.edit", "Manage project metadata field definitions")
            }),
        new PermissionModuleDefinition(
            "admin.workflow_designer",
            "Admin Console / Workflow Designer",
            new[]
            {
                new PermissionActionDefinition("admin.workflow_designer.view", "View workflow designer"),
                new PermissionActionDefinition("admin.workflow_designer.edit", "Edit workflow designer templates")
            })
    };

    private static readonly HashSet<string> AllowedPermissions = Definitions
        .SelectMany(definition => definition.Actions)
        .Select(action => action.Key)
        .ToHashSet(StringComparer.OrdinalIgnoreCase);

    public static List<string> NormalizePermissions(IEnumerable<string>? permissions)
    {
        return (permissions ?? Array.Empty<string>())
            .Where(permission => !string.IsNullOrWhiteSpace(permission) && AllowedPermissions.Contains(permission))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(permission => permission, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public static List<string> GetDefaultPermissions(string roleName)
    {
        var normalizedRoleName = roleName.Trim().ToLowerInvariant();
        return normalizedRoleName switch
        {
            "viewer" => NormalizePermissions(new[] { "models.view", "designer.view", "designer.diagram.view" }),
            "developer" => NormalizePermissions(new[]
            {
                "models.view", "models.open", "models.import", "models.export",
                "change_requests.view", "change_requests.open", "change_requests.create", "change_requests.submit", "change_requests.sql.download",
                "designer.view", "designer.metadata.edit", "designer.dbml.edit", "designer.dbml.search",
                "designer.diagram.view", "designer.diagram.focus", "designer.diagram.fullscreen",
                "designer.table.create", "designer.table.edit", "designer.save"
            }),
            "domain_architect" => NormalizePermissions(new[]
            {
                "models.view", "models.open", "models.export",
                "change_requests.view", "change_requests.open", "change_requests.pending.view",
                "change_requests.approve", "change_requests.reject", "change_requests.sql.download",
                "designer.view", "designer.metadata.edit", "designer.dbml.edit", "designer.dbml.search",
                "designer.diagram.view", "designer.diagram.focus", "designer.diagram.fullscreen",
                "designer.table.edit", "designer.save"
            }),
            "data_architect" => NormalizePermissions(new[]
            {
                "models.view", "models.open", "models.create", "models.import", "models.export", "models.group.manage",
                "change_requests.view", "change_requests.open", "change_requests.create", "change_requests.submit",
                "change_requests.pending.view", "change_requests.approve", "change_requests.reject", "change_requests.merge", "change_requests.sql.download",
                "designer.view", "designer.metadata.edit", "designer.dbml.edit", "designer.dbml.search",
                "designer.diagram.view", "designer.diagram.focus", "designer.diagram.fullscreen",
                "designer.table.create", "designer.table.edit", "designer.save"
            }),
            "data_steward" => NormalizePermissions(new[]
            {
                "models.view", "models.open", "models.export",
                "change_requests.view", "change_requests.open", "change_requests.sql.download",
                "designer.view", "designer.metadata.edit", "designer.dbml.search", "designer.diagram.view", "designer.diagram.focus"
            }),
            "admin" => NormalizePermissions(AllowedPermissions),
            _ => new List<string>()
        };
    }
}

public record PermissionActionDefinition(string Key, string Label);

public record PermissionModuleDefinition(string Id, string Label, IReadOnlyList<PermissionActionDefinition> Actions);
