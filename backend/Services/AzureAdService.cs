// using Microsoft.Identity.Client; // Removed - version conflicts
using DataModeler.API.Data;
using Microsoft.EntityFrameworkCore;

namespace DataModeler.API.Services;

/// <summary>
/// Azure AD (Entra ID) authentication service
/// </summary>
public interface IAzureAdService
{
    Task<AzureAdUser?> AuthenticateAsync(string username, string password);
    Task<bool> TestConnectionAsync(AzureAdConfig config);
    string GetAuthorizationUrl(string redirectUri);
    Task<AzureAdUser?> GetTokenAsync(string code, string redirectUri);
}

/// <summary>
/// Implementation of Azure AD authentication
/// </summary>
public class AzureAdService : IAzureAdService
{
    private readonly ILogger<AzureAdService> _logger;
    private readonly DataModelerDbContext _dbContext;
    // private IPublicClientApplication? _publicClientApp; // Removed - Microsoft.Identity.Client package removed

    public AzureAdService(ILogger<AzureAdService> logger, DataModelerDbContext dbContext)
    {
        _logger = logger;
        _dbContext = dbContext;
    }

    public async Task<AzureAdUser?> AuthenticateAsync(string username, string password)
    {
        _logger.LogWarning("Azure AD authentication not available - Microsoft.Identity.Client package removed");
        return await Task.FromResult<AzureAdUser?>(null);
    }

    public async Task<bool> TestConnectionAsync(AzureAdConfig config)
    {
        _logger.LogWarning("Azure AD test connection not available - Microsoft.Identity.Client package removed");
        return await Task.FromResult(false);
    }

    public string GetAuthorizationUrl(string redirectUri)
    {
        _logger.LogWarning("Azure AD authorization URL not available - Microsoft.Identity.Client package removed");
        return string.Empty;
    }

    public async Task<AzureAdUser?> GetTokenAsync(string code, string redirectUri)
    {
        _logger.LogWarning("Azure AD token exchange not available - Microsoft.Identity.Client package removed");
        return await Task.FromResult<AzureAdUser?>(null);
    }
}

// Supporting classes

public class AzureAdConfig
{
    public string TenantId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string ResourceId { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
}

public class AzureAdUser
{
    public string Email { get; set; } = string.Empty;
    public string ObjectId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public List<string> Groups { get; set; } = new();
}
