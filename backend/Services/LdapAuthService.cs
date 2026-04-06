// using Novell.Directory.Ldap; // Removed - version conflicts - service disabled
using DataModeler.API.Models;
using Microsoft.EntityFrameworkCore;
using DataModeler.API.Data;

namespace DataModeler.API.Services;

/// <summary>
/// LDAP authentication service - DISABLED (package removed due to conflicts)
/// </summary>
public interface ILdapAuthService
{
    Task<LdapUser?> AuthenticateAsync(string username, string password);
    Task<bool> TestConnectionAsync(LdapConfig config);
}

/// <summary>
/// Stub implementation of LDAP authentication
/// </summary>
public class LdapAuthService : ILdapAuthService
{
    private readonly ILogger<LdapAuthService> _logger;

    public LdapAuthService(ILogger<LdapAuthService> logger, DataModelerDbContext dbContext)
    {
        _logger = logger;
    }

    public async Task<LdapUser?> AuthenticateAsync(string username, string password)
    {
        _logger.LogWarning("LDAP authentication is disabled");
        return await Task.FromResult((LdapUser?)null);
    }

    public async Task<bool> TestConnectionAsync(LdapConfig config)
    {
        _logger.LogWarning("LDAP test connection is disabled");
        return await Task.FromResult(false);
    }
}

// Supporting classes

public class LdapConfig
{
    public string Server { get; set; } = string.Empty;
    public int Port { get; set; } = 389;
    public string BaseDn { get; set; } = string.Empty;
    public string? AdminUsername { get; set; }
    public string? AdminPassword { get; set; }
    public bool UseSSL { get; set; }
}

public class LdapUser
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string DistinguishedName { get; set; } = string.Empty;
    public List<string> Groups { get; set; } = new();
}
