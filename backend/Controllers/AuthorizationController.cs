using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DataModeler.API.Data;
using DataModeler.API.Models;
using DataModeler.API.DTOs;
using System.Text.Json;

namespace DataModeler.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuthorizationController : ControllerBase
{
    private readonly DataModelerDbContext _dbContext;
    private readonly ILogger<AuthorizationController> _logger;

    public AuthorizationController(DataModelerDbContext dbContext, ILogger<AuthorizationController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
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
            var userIdClaim = User.FindFirst("sub")?.Value ?? User.FindFirst("nameid")?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized();
            }

            var currentUser = await _dbContext.Users.FindAsync(userId);
            if (currentUser?.IsSuperAdmin != true)
            {
                return Forbid();
            }

            var users = await _dbContext.Users
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    Email = u.Email,
                    IsSuperAdmin = u.IsSuperAdmin,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = users });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving users");
            return StatusCode(500, new { message = "Error retrieving users" });
        }
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
            var userIdClaim = User.FindFirst("sub")?.Value ?? User.FindFirst("nameid")?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var currentUserId))
            {
                return Unauthorized();
            }

            var currentUser = await _dbContext.Users.FindAsync(currentUserId);
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

            // Check if assignment exists
            var existing = await _dbContext.ModelCollaborators
                .FirstOrDefaultAsync(mc => mc.ModelId == request.ModelId && mc.UserId == request.UserId);

            if (existing != null)
            {
                existing.Role = request.Role;
                _dbContext.ModelCollaborators.Update(existing);
            }
            else
            {
                var collaboration = new ModelCollaborator
                {
                    ModelId = request.ModelId,
                    UserId = request.UserId,
                    Role = request.Role,
                    AssignedBy = currentUserId
                };

                _dbContext.ModelCollaborators.Add(collaboration);
            }

            await _dbContext.SaveChangesAsync();

            // Log action
            var auditLog = new AuditLog
            {
                UserId = currentUserId,
                Action = "assign_model_role",
                ModelId = request.ModelId,
                Details = $"Assigned {request.Role} role to {targetUser.Email}",
                Timestamp = DateTime.UtcNow
            };

            _dbContext.AuditLogs.Add(auditLog);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation(
                "User {UserId} assigned {Role} role to {TargetUserId} for model {ModelId}",
                currentUserId, request.Role, request.UserId, request.ModelId);

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
            var currentUserIdClaim = User.FindFirst("sub")?.Value ?? User.FindFirst("nameid")?.Value;
            
            if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out var currentUserId))
            {
                return Unauthorized();
            }

            // Only super admin or the user themselves can view
            var currentUser = await _dbContext.Users.FindAsync(currentUserId);
            if (currentUser?.IsSuperAdmin != true && currentUserId != userId)
            {
                return Forbid();
            }

            var models = await _dbContext.ModelCollaborators
                .Where(mc => mc.UserId == userId)
                .Include(mc => mc.Model)
                .Select(mc => new
                {
                    model = new
                    {
                        id = mc.Model!.Id,
                        name = mc.Model.Name,
                        role = mc.Role
                    }
                })
                .ToListAsync();

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
            var userIdClaim = User.FindFirst("sub")?.Value ?? User.FindFirst("nameid")?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var currentUserId))
            {
                return Unauthorized();
            }

            var currentUser = await _dbContext.Users.FindAsync(currentUserId);
            if (currentUser?.IsSuperAdmin != true)
            {
                return Forbid();
            }

            var collaboration = await _dbContext.ModelCollaborators
                .FirstOrDefaultAsync(mc => mc.ModelId == modelId && mc.UserId == userId);

            if (collaboration == null)
            {
                return NotFound(new { message = "Collaboration not found" });
            }

            _dbContext.ModelCollaborators.Remove(collaboration);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("User {UserId} removed {TargetUserId} from model {ModelId}", 
                currentUserId, userId, modelId);

            return Ok(new { success = true, message = "Access removed successfully" });
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
