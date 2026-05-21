using System.Security.Claims;
using DataModeler.API.Data;
using DataModeler.API.DTOs;
using DataModeler.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DataModeler.API.Controllers;

[ApiController]
[Route("api/change-requests")]
[Authorize]
[EnableCors("AllowFrontend")]
public class ChangeRequestsController : ControllerBase
{
    private const string PendingViewPermission = "change_requests.pending.view";

    private readonly IChangeRequestService _changeRequestService;
    private readonly DataModelerDbContext _context;
    private readonly ILogger<ChangeRequestsController> _logger;

    public ChangeRequestsController(
        IChangeRequestService changeRequestService,
        DataModelerDbContext context,
        ILogger<ChangeRequestsController> logger)
    {
        _changeRequestService = changeRequestService;
        _context = context;
        _logger = logger;
    }

    [HttpGet("my")]
    public async Task<ActionResult<List<ChangeRequestListItemDto>>> GetMyRequests(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        var list = await _changeRequestService.GetMyRequestsAsync(userId, cancellationToken);
        return Ok(list);
    }

    [HttpGet("pending")]
    public async Task<ActionResult<List<ChangeRequestListItemDto>>> GetPendingApprovals(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        if (!await CanAccessPendingScreenAsync(userId, cancellationToken))
        {
            return Forbid();
        }

        var list = await _changeRequestService.GetPendingApprovalsAsync(userId, cancellationToken);
        return Ok(list);
    }

    [HttpGet("list")]
    public async Task<ActionResult<List<ChangeRequestListItemDto>>> GetFiltered([FromQuery] ChangeRequestFilterDto filter, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        var mode = string.Equals(filter.Mode, "pending", StringComparison.OrdinalIgnoreCase) ? "pending" : "mine";
        if (mode == "pending" && !await CanAccessPendingScreenAsync(userId, cancellationToken))
        {
            return Forbid();
        }

        var list = await _changeRequestService.GetFilteredRequestsAsync(userId, filter, cancellationToken);
        return Ok(list);
    }

    [HttpGet("capabilities")]
    public async Task<ActionResult<object>> GetCapabilities(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        var canDelete = await IsAdminAsync(userId, cancellationToken);
        var canViewPending = await CanAccessPendingScreenAsync(userId, cancellationToken);
        return Ok(new
        {
            canDelete,
            canViewPending,
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ChangeRequestDetailDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        var request = await _changeRequestService.GetByIdAsync(id, userId, cancellationToken);
        if (request == null)
        {
            return NotFound();
        }

        if (!await CanReadRequestAsync(id, userId, cancellationToken))
        {
            return Forbid();
        }

        return Ok(request);
    }

    [HttpPost]
    public async Task<ActionResult<ChangeRequestDetailDto>> Create([FromBody] CreateChangeRequestDto dto, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        try
        {
            var created = await _changeRequestService.CreateAsync(userId, dto, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("CR creation failed with InvalidOperation: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CR creation failed with unexpected error");
            return StatusCode(500, new { message = $"Internal error: {ex.Message}" });
        }
    }

    [HttpPost("{id:guid}/submit")]
    public async Task<ActionResult<ChangeRequestDetailDto>> Submit(Guid id, [FromBody] ChangeRequestActionDto dto, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        try
        {
            var updated = await _changeRequestService.SubmitAsync(id, userId, dto?.Comment, cancellationToken);
            return updated == null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/approve")]
    public async Task<ActionResult<ChangeRequestDetailDto>> Approve(Guid id, [FromBody] ChangeRequestActionDto dto, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        try
        {
            var updated = await _changeRequestService.ApproveAsync(id, userId, dto?.Comment, cancellationToken);
            return updated == null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<ActionResult<ChangeRequestDetailDto>> Reject(Guid id, [FromBody] ChangeRequestActionDto dto, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        try
        {
            var updated = await _changeRequestService.RejectAsync(id, userId, dto?.Comment, cancellationToken);
            return updated == null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/merge")]
    public async Task<ActionResult<ChangeRequestDetailDto>> MarkMerged(Guid id, [FromBody] ChangeRequestActionDto dto, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        try
        {
            var updated = await _changeRequestService.MarkMergedAsync(id, userId, dto?.Comment, cancellationToken);
            return updated == null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        if (!await IsAdminAsync(userId, cancellationToken))
        {
            return Forbid();
        }

        try
        {
            var deleted = await _changeRequestService.DeleteAndRollbackAsync(id, userId, cancellationToken);
            if (!deleted)
            {
                return NotFound(new { message = "Change request not found." });
            }

            return Ok(new { message = "Change request deleted and rolled back successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}/sql")]
    public async Task<IActionResult> DownloadSql(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        if (!await CanReadRequestAsync(id, userId, cancellationToken))
        {
            return Forbid();
        }

        var request = await _changeRequestService.GetByIdAsync(id, userId, cancellationToken);
        if (request == null)
        {
            return NotFound();
        }

        var content = request.GeneratedSql ?? string.Empty;
        var bytes = System.Text.Encoding.UTF8.GetBytes(content);
        var filename = string.IsNullOrWhiteSpace(request.ChangeCode)
            ? $"change-request-{request.Id}.sql"
            : $"{request.ChangeCode.ToLowerInvariant()}.sql";

        return File(bytes, "application/sql", filename);
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("sub")?.Value
                          ?? User.FindFirst("nameid")?.Value;

        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private async Task<bool> CanReadRequestAsync(Guid requestId, Guid userId, CancellationToken cancellationToken)
    {
        return await _changeRequestService.CanReadRequestAsync(requestId, userId, cancellationToken);
    }

    private async Task<bool> CanAccessPendingScreenAsync(Guid userId, CancellationToken cancellationToken)
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

        var roles = await _context.UserApplicationRoles
            .AsNoTracking()
            .Include(x => x.Role)
            .Where(x => x.UserId == userId && x.Role != null && x.Role.IsActive)
            .Select(x => new
            {
                Name = x.Role!.Name,
                PermissionsJson = x.Role!.PermissionsJson,
            })
            .ToListAsync(cancellationToken);

        var roleNames = roles
            .Select(role => (role.Name ?? string.Empty).Trim().ToLowerInvariant())
            .Where(name => name.Length > 0)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (roleNames.Contains("admin")
            || roleNames.Contains("domain_architect")
            || roleNames.Contains("data_architect")
            || roleNames.Contains("business_domain_architect")
            || roleNames.Contains("business-architect")
            || roleNames.Contains("business_architect"))
        {
            return true;
        }

        foreach (var role in roles)
        {
            if (string.IsNullOrWhiteSpace(role.PermissionsJson))
            {
                continue;
            }

            try
            {
                var permissions = System.Text.Json.JsonSerializer.Deserialize<List<string>>(role.PermissionsJson) ?? new List<string>();
                if (permissions.Any(permission => string.Equals(permission?.Trim(), PendingViewPermission, StringComparison.OrdinalIgnoreCase)
                                               || string.Equals(permission?.Trim(), "change_requests.approve", StringComparison.OrdinalIgnoreCase)
                                               || string.Equals(permission?.Trim(), "change_requests.reject", StringComparison.OrdinalIgnoreCase)
                                               || string.Equals(permission?.Trim(), "change_requests.open", StringComparison.OrdinalIgnoreCase)))
                {
                    return true;
                }
            }
            catch
            {
                // Ignore malformed permissions JSON and continue checking other roles.
            }
        }

        return false;
    }

    private async Task<bool> IsAdminAsync(Guid userId, CancellationToken cancellationToken)
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

        return await _context.UserApplicationRoles
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .Join(_context.ApplicationRoles.AsNoTracking(), x => x.RoleId, r => r.Id, (_, r) => r)
            .AnyAsync(r => r.IsActive && r.Name == "admin", cancellationToken);
    }
}
