using Novell.Directory.Ldap;
using DataModeler.API.Models;
using Microsoft.EntityFrameworkCore;
using DataModeler.API.Data;
using System.Text.Json;

namespace DataModeler.API.Services;

public interface ILdapAuthService
{
    Task<LdapUser?> AuthenticateAsync(string username, string password);
    Task<bool> TestConnectionAsync(LdapConfig config);
    Task<(bool Success, string? ErrorMessage)> TestConnectionDetailedAsync(LdapConfig config);
    Task<List<LdapUser>> SearchUsersAsync(string query, int maxResults = 50);
    Task<bool> HasEnabledConfigAsync();
}

public class LdapAuthService : ILdapAuthService
{
    private readonly ILogger<LdapAuthService> _logger;
    private readonly DataModelerDbContext _dbContext;

    public LdapAuthService(ILogger<LdapAuthService> logger, DataModelerDbContext dbContext)
    {
        _logger = logger;
        _dbContext = dbContext;
    }

    private static bool ShouldTrustAllServerCertificatesForLdap()
    {
        var overrideValue = Environment.GetEnvironmentVariable("LDAP_TRUST_ALL_CERTS");
        if (!string.IsNullOrWhiteSpace(overrideValue))
        {
            return overrideValue.Equals("true", StringComparison.OrdinalIgnoreCase)
                || overrideValue.Equals("1", StringComparison.OrdinalIgnoreCase)
                || overrideValue.Equals("yes", StringComparison.OrdinalIgnoreCase);
        }

        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        return string.Equals(environment, "Development", StringComparison.OrdinalIgnoreCase);
    }

    private static LdapConnection CreateConnection(LdapConfig config)
    {
        var connection = new LdapConnection { SecureSocketLayer = config.UseSSL };

        if (config.UseSSL && ShouldTrustAllServerCertificatesForLdap())
        {
            connection.UserDefinedServerCertValidationDelegate += (_, _, _, _) => true;
        }

        return connection;
    }

    public async Task<LdapUser?> AuthenticateAsync(string username, string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            return null;
        }

        var config = await LoadEnabledLdapConfigAsync();
        if (config == null)
        {
            _logger.LogWarning("LDAP authentication requested but no enabled LDAP configuration was found");
            return null;
        }

        return await Task.Run(() => AuthenticateInternal(config, username, password));
    }

    public Task<bool> TestConnectionAsync(LdapConfig config)
    {
        return TestConnectionDetailedAsync(config).ContinueWith(task => task.Result.Success);
    }

    public Task<(bool Success, string? ErrorMessage)> TestConnectionDetailedAsync(LdapConfig config)
    {
        return Task.Run(() =>
        {
            try
            {
                using var conn = CreateConnection(config);
                conn.Connect(config.Server, config.Port);

                var bound = false;
                string? lastBindError = null;
                if (!string.IsNullOrWhiteSpace(config.AdminUsername) && !string.IsNullOrWhiteSpace(config.AdminPassword))
                {
                    foreach (var candidate in BuildBindCandidates(config))
                    {
                        try
                        {
                            conn.Bind(candidate, config.AdminPassword);
                            if (conn.Bound)
                            {
                                bound = true;
                                break;
                            }
                        }
                        catch (LdapException ex)
                        {
                            lastBindError = ex.ResultCode == 49
                                ? "LDAP bind failed: Invalid credentials. Check admin username/password and bind format (UPN, DOMAIN\\user, or CN=...)."
                                : $"LDAP test failed ({ex.ResultCode}): {ex.Message}";
                        }
                    }
                }
                else
                {
                    conn.Bind(string.Empty, string.Empty);
                    bound = conn.Bound;
                }

                _logger.LogInformation("LDAP test to {Server}:{Port} => Bound={Bound}", config.Server, config.Port, bound);
                return bound
                    ? (true, (string?)null)
                    : (false, lastBindError ?? "LDAP bind failed. Check server, port and credentials.");
            }
            catch (LdapException ex)
            {
                _logger.LogWarning("LDAP test failed [{Code}]: {Msg}", ex.ResultCode, ex.Message);
                var detail = ex.ResultCode == 49
                    ? "LDAP bind failed: Invalid credentials. Check admin username/password and bind format (UPN, DOMAIN\\user, or CN=...)."
                    : $"LDAP test failed ({ex.ResultCode}): {ex.Message}";
                return (false, detail);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("LDAP test error: {Msg}", ex.Message);
                return (false, $"LDAP test error: {ex.Message}");
            }
        });
    }

    public async Task<List<LdapUser>> SearchUsersAsync(string query, int maxResults = 50)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new List<LdapUser>();
        }

        var config = await LoadEnabledLdapConfigAsync();
        if (config == null)
        {
            _logger.LogWarning("LDAP user search requested but no enabled LDAP configuration was found");
            return new List<LdapUser>();
        }

        return await Task.Run(() => SearchUsersInternal(config, query.Trim(), maxResults));
    }

    public async Task<bool> HasEnabledConfigAsync()
    {
        return await _dbContext.AdSettings
            .AsNoTracking()
            .AnyAsync(x => x.ProviderType == "ldap" && x.IsEnabled && !string.IsNullOrWhiteSpace(x.ConfigJson));
    }

    private async Task<LdapConfig?> LoadEnabledLdapConfigAsync()
    {
        var setting = await _dbContext.AdSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ProviderType == "ldap" && x.IsEnabled);

        if (setting == null || string.IsNullOrWhiteSpace(setting.ConfigJson))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<LdapConfig>(
                setting.ConfigJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize LDAP configuration");
            return null;
        }
    }

    private LdapUser? AuthenticateInternal(LdapConfig config, string username, string password)
    {
        try
        {
            using var adminConnection = CreateConnection(config);
            adminConnection.Connect(config.Server, config.Port);

            if (!string.IsNullOrWhiteSpace(config.AdminUsername) && !string.IsNullOrWhiteSpace(config.AdminPassword))
            {
                var adminBound = false;
                foreach (var candidate in BuildBindCandidates(config))
                {
                    try
                    {
                        adminConnection.Bind(candidate, config.AdminPassword);
                        if (adminConnection.Bound)
                        {
                            adminBound = true;
                            break;
                        }
                    }
                    catch (LdapException)
                    {
                        // Try next candidate format.
                    }
                }

                if (!adminBound)
                {
                    _logger.LogWarning("LDAP admin bind failed for all candidate formats");
                    return null;
                }
            }

            var escapedUsername = LdapFilterEscape(username.Trim());
            var accountName = username.Contains('@') ? username.Split('@')[0] : username;
            var escapedSam = LdapFilterEscape(accountName);
            var filter = $"(|(userPrincipalName={escapedUsername})(mail={escapedUsername})(sAMAccountName={escapedSam}))";
            var attributes = new[] { "distinguishedName", "mail", "displayName", "cn", "memberOf", "sAMAccountName", "userPrincipalName" };

            var search = adminConnection.Search(
                config.BaseDn,
                LdapConnection.ScopeSub,
                filter,
                attributes,
                false);

            if (!search.HasMore())
            {
                _logger.LogWarning("LDAP user search returned no results for {Username}", username);
                return null;
            }

            var entry = search.Next();
            var distinguishedName = entry.Dn;

            using var userConnection = CreateConnection(config);
            userConnection.Connect(config.Server, config.Port);
            userConnection.Bind(distinguishedName, password);

            if (!userConnection.Bound)
            {
                return null;
            }

            var email = GetAttribute(entry, "mail")
                     ?? GetAttribute(entry, "userPrincipalName")
                     ?? username;

            return new LdapUser
            {
                Username = GetAttribute(entry, "sAMAccountName") ?? accountName,
                Email = email,
                DisplayName = GetAttribute(entry, "displayName") ?? GetAttribute(entry, "cn") ?? username,
                DistinguishedName = distinguishedName,
                Groups = GetAttributes(entry, "memberOf")
            };
        }
        catch (LdapException ex)
        {
            _logger.LogWarning("LDAP authentication failed [{Code}] for {Username}: {Message}", ex.ResultCode, username, ex.Message);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "LDAP authentication error for {Username}", username);
            return null;
        }
    }

    private List<LdapUser> SearchUsersInternal(LdapConfig config, string query, int maxResults)
    {
        var results = new List<LdapUser>();

        try
        {
            using var conn = CreateConnection(config);
            conn.Connect(config.Server, config.Port);

            if (!string.IsNullOrWhiteSpace(config.AdminUsername) && !string.IsNullOrWhiteSpace(config.AdminPassword))
            {
                var adminBound = false;
                foreach (var candidate in BuildBindCandidates(config))
                {
                    try
                    {
                        conn.Bind(candidate, config.AdminPassword);
                        if (conn.Bound)
                        {
                            adminBound = true;
                            break;
                        }
                    }
                    catch (LdapException)
                    {
                        // Try next candidate format.
                    }
                }

                if (!adminBound)
                {
                    _logger.LogWarning("LDAP admin bind failed for user search");
                    return results;
                }
            }

            var escaped = LdapFilterEscape(query);
            var filter = $"(&(objectClass=user)(|(userPrincipalName=*{escaped}*)(mail=*{escaped}*)(sAMAccountName=*{escaped}*)(displayName=*{escaped}*)))";
            var attributes = new[] { "distinguishedName", "mail", "displayName", "cn", "memberOf", "sAMAccountName", "userPrincipalName" };

            var search = conn.Search(config.BaseDn, LdapConnection.ScopeSub, filter, attributes, false);

            var seenEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var baseDomain = BuildDomainFromBaseDn(config.BaseDn);
            while (search.HasMore() && results.Count < maxResults)
            {
                var entry = search.Next();
                var sam = GetAttribute(entry, "sAMAccountName") ?? string.Empty;
                var email = GetAttribute(entry, "mail")
                         ?? GetAttribute(entry, "userPrincipalName")
                         ?? string.Empty;

                if (string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(sam) && !string.IsNullOrWhiteSpace(baseDomain))
                {
                    email = $"{sam}@{baseDomain}";
                }

                if (string.IsNullOrWhiteSpace(email))
                {
                    continue;
                }

                if (!seenEmails.Add(email))
                {
                    continue;
                }

                results.Add(new LdapUser
                {
                    Username = !string.IsNullOrWhiteSpace(sam) ? sam : email.Split('@')[0],
                    Email = email,
                    DisplayName = GetAttribute(entry, "displayName") ?? GetAttribute(entry, "cn") ?? email,
                    DistinguishedName = entry.Dn,
                    Groups = GetAttributes(entry, "memberOf")
                });
            }
        }
        catch (LdapException ex)
        {
            _logger.LogWarning("LDAP search failed [{Code}] for query '{Query}': {Message}", ex.ResultCode, query, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "LDAP search error for query '{Query}'", query);
        }

        return results;
    }

    private static string BuildDomainFromBaseDn(string? baseDn)
    {
        if (string.IsNullOrWhiteSpace(baseDn))
        {
            return string.Empty;
        }

        var dcParts = baseDn
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Trim())
            .Where(part => part.StartsWith("DC=", StringComparison.OrdinalIgnoreCase))
            .Select(part => part[3..].Trim())
            .Where(part => part.Length > 0)
            .ToList();

        return dcParts.Count == 0 ? string.Empty : string.Join('.', dcParts);
    }

    private static List<string> BuildBindCandidates(LdapConfig config)
    {
        var candidates = new List<string>();
        var admin = (config.AdminUsername ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(admin))
        {
            return candidates;
        }

        candidates.Add(admin);

        var sam = admin;
        if (admin.Contains('@'))
        {
            sam = admin.Split('@')[0];
            if (!string.IsNullOrWhiteSpace(sam))
            {
                candidates.Add(sam);
            }
        }
        else if (admin.Contains('\\'))
        {
            sam = admin.Split('\\').LastOrDefault() ?? admin;
            if (!string.IsNullOrWhiteSpace(sam))
            {
                candidates.Add(sam);
            }
        }

        var fqdn = BuildDomainFromBaseDn(config.BaseDn);
        if (!string.IsNullOrWhiteSpace(sam) && !string.IsNullOrWhiteSpace(fqdn))
        {
            var netbios = fqdn.Split('.', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(netbios))
            {
                candidates.Add($"{netbios}\\{sam}");
            }

            candidates.Add($"{sam}@{fqdn}");
        }

        if (!string.IsNullOrWhiteSpace(sam) && !string.IsNullOrWhiteSpace(config.BaseDn))
        {
            candidates.Add($"CN={sam},CN=Users,{config.BaseDn}");
        }

        return candidates
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string? GetAttribute(LdapEntry entry, string attributeName)
    {
        try
        {
            return entry.GetAttribute(attributeName)?.StringValue;
        }
        catch (KeyNotFoundException)
        {
            return null;
        }
    }

    private static List<string> GetAttributes(LdapEntry entry, string attributeName)
    {
        try
        {
            var attr = entry.GetAttribute(attributeName);
            if (attr == null)
            {
                return new List<string>();
            }

            return attr.StringValueArray?.ToList() ?? new List<string>();
        }
        catch (KeyNotFoundException)
        {
            return new List<string>();
        }
    }

    private static string LdapFilterEscape(string value)
    {
        return value
            .Replace("\\", "\\5c")
            .Replace("*", "\\2a")
            .Replace("(", "\\28")
            .Replace(")", "\\29")
            .Replace("\0", "\\00");
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
