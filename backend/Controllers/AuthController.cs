using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;
using DataModeler.API.DTOs;
using DataModeler.API.Services;
using DataModeler.API.Data;
using Microsoft.EntityFrameworkCore;

namespace DataModeler.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableCors("AllowFrontend")]
public class AuthController : ControllerBase
{
    private readonly IAuthenticationService _authService;
    private readonly ITokenService _tokenService;
    private readonly DataModelerDbContext _dbContext;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IAuthenticationService authService,
        ITokenService tokenService,
        DataModelerDbContext dbContext,
        ILogger<AuthController> logger)
    {
        _authService = authService;
        _tokenService = tokenService;
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Login endpoint supporting LDAP and Azure AD
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new LoginResponseDto
                {
                    Success = false,
                    Message = "Email and password are required"
                });
            }

            // Authenticate user with AD provider
            var (user, error) = await _authService.LoginAsync(request.Email, request.Password, request.Provider);

            if (user == null)
            {
                _logger.LogWarning("Login failed for email {Email}", request.Email);
                return Unauthorized(new LoginResponseDto
                {
                    Success = false,
                    Message = error ?? "Authentication failed"
                });
            }

            if (!user.IsActive)
            {
                return Unauthorized(new LoginResponseDto
                {
                    Success = false,
                    Message = "User account is inactive"
                });
            }

            // Generate JWT token
            var token = _tokenService.GenerateToken(user.Id, user.Email, user.IsSuperAdmin);

            var response = new LoginResponseDto
            {
                Success = true,
                Message = "Login successful",
                User = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    Username = user.Email.Contains('@') ? user.Email.Split('@')[0] : user.Email,
                    IsSuperAdmin = user.IsSuperAdmin,
                    IsActive = user.IsActive,
                    CreatedAt = user.CreatedAt
                },
                Token = token
            };

            _logger.LogInformation("User {Email} logged in successfully", user.Email);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login - Exception: {ExceptionMessage}", ex.Message);
            if (ex.InnerException != null)
            {
                _logger.LogError(ex.InnerException, "Inner Exception: {InnerMessage}", ex.InnerException.Message);
            }
            return StatusCode(500, new LoginResponseDto
            {
                Success = false,
                Message = $"Login error: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Refresh JWT token
    /// </summary>
    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public IActionResult RefreshToken([FromBody] RefreshTokenRequestDto request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.RefreshToken))
            {
                return BadRequest(new { message = "Refresh token is required" });
            }

            var token = _tokenService.RefreshToken(request.RefreshToken);

            _logger.LogInformation("Token refreshed");
            return Ok(token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing token");
            return StatusCode(500, new { message = "Error refreshing token" });
        }
    }

    /// <summary>
    /// Validate current token
    /// </summary>
    [HttpPost("validate-token")]
    [Authorize]
    public async Task<IActionResult> ValidateToken()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("sub")?.Value
                           ?? User.FindFirst("nameid")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { valid = false });
            }

            var user = await _dbContext.Users.FindAsync(userId);

            if (user == null || !user.IsActive)
            {
                return Unauthorized(new { valid = false });
            }

            return Ok(new
            {
                valid = true,
                user = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    Username = user.Email.Contains('@') ? user.Email.Split('@')[0] : user.Email,
                    IsSuperAdmin = user.IsSuperAdmin,
                    IsActive = user.IsActive,
                    CreatedAt = user.CreatedAt
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating token");
            return StatusCode(500, new { valid = false, message = "Error validating token" });
        }
    }

    /// <summary>
    /// Get available AD providers
    /// </summary>
    [HttpGet("providers")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProviders()
    {
        try
        {
            _logger.LogInformation("GetProviders called");
            
            List<AdProviderDto> providers = new();
            
            try
            {
                // Try to query AD settings from database
                var dbProviders = await _dbContext.AdSettings
                    .Where(s => s.IsEnabled)
                    .Select(s => new AdProviderDto
                    {
                        Type = s.ProviderType,
                        IsEnabled = s.IsEnabled,
                        Description = s.ProviderType == "ldap" ? "On-premises Active Directory" : "Azure AD / Entra ID"
                    })
                    .ToListAsync();
                
                providers = dbProviders ?? new List<AdProviderDto>();
                _logger.LogInformation($"Successfully queried AdSettings, found {providers.Count} providers");
            }
            catch (Exception dbEx)
            {
                _logger.LogWarning($"AdSettings query failed (likely table doesn't exist yet): {dbEx.Message}. Returning empty provider list.");
                // Return empty list if table doesn't exist - will be populated after migrations
                providers = new List<AdProviderDto>();
            }

            // Always include 'local' provider as fallback
            if (!providers.Any(p => p.Type == "local"))
            {
                providers.Insert(0, new AdProviderDto
                {
                    Type = "local",
                    IsEnabled = true,
                    Description = "Local Authentication"
                });
            }

            return Ok(new AdProvidersDto { Providers = providers });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in GetProviders");
            return StatusCode(500, new { message = "Error retrieving providers", error = ex.Message });
        }
    }

    /// <summary>
    /// Logout endpoint (client-side token deletion recommended)
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("sub")?.Value
                           ?? User.FindFirst("nameid")?.Value;

            if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var userId))
            {
                var auditLog = new DataModeler.API.Models.AuditLog
                {
                    UserId = userId,
                    Action = "logout",
                    Timestamp = DateTime.UtcNow
                };

                _dbContext.AuditLogs.Add(auditLog);
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("User {UserId} logged out", userId);
            }

            return Ok(new { message = "Logged out successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during logout");
            return StatusCode(500, new { message = "Error during logout" });
        }
    }
}
