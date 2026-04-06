using DataModeler.API.Data;
using DataModeler.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DataModeler.API.Services;

/// <summary>
/// Unified authentication service supporting both LDAP and Azure AD
/// </summary>
public interface IAuthenticationService
{
    Task<(User?, string?)> LoginAsync(string email, string password, string provider);
    Task<bool> ValidateCredentialsAsync(string email, string password, string provider);
}

/// <summary>
/// Implementation of authentication service
/// </summary>
public class AuthenticationService : IAuthenticationService
{
    private readonly ILdapAuthService _ldapAuthService;
    private readonly IAzureAdService _azureAdService;
    private readonly DataModelerDbContext _dbContext;
    private readonly ILogger<AuthenticationService> _logger;

    public AuthenticationService(
        ILdapAuthService ldapAuthService,
        IAzureAdService azureAdService,
        DataModelerDbContext dbContext,
        ILogger<AuthenticationService> logger)
    {
        _ldapAuthService = ldapAuthService;
        _azureAdService = azureAdService;
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<(User?, string?)> LoginAsync(string email, string password, string provider)
    {
        try
        {
            // Support local, ldap, and azure_ad providers
            if (provider != "local" && provider != "ldap" && provider != "azure_ad")
            {
                provider = "local"; // Default to local provider
            }

            // Handle local authentication
            if (provider == "local")
            {
                var user = await _dbContext.Users
                    .FirstOrDefaultAsync(u => u.EmailLower == email.ToLower());

                if (user == null)
                {
                    _logger.LogWarning("Local authentication failed: User not found for email {Email}", email);
                    return (null, "Invalid email or password");
                }

                // Verify password
                if (string.IsNullOrEmpty(user.PasswordHash))
                {
                    _logger.LogWarning("Local authentication failed: No password set for user {Email}", email);
                    return (null, "Invalid email or password");
                }

                // Use BCrypt to verify password
                if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
                {
                    _logger.LogWarning("Local authentication failed: Invalid password for user {Email}", email);
                    return (null, "Invalid email or password");
                }

                if (!user.IsActive)
                {
                    _logger.LogWarning("Local authentication failed: User is inactive {Email}", email);
                    return (null, "User account is inactive");
                }

                // Update last login - temporarily disabled for testing
                //user.LastLogin = DateTime.UtcNow;
                //_dbContext.Users.Update(user);
                //await _dbContext.SaveChangesAsync();

                // Log audit - temporarily disabled until audit_logs table exists
                //var auditLog = new AuditLog
                //{
                //    UserId = user.Id,
                //    Action = "login",
                //    Timestamp = DateTime.UtcNow,
                //    Details = "Logged in via local authentication"
                //};

                //_dbContext.AuditLogs.Add(auditLog);
                //await _dbContext.SaveChangesAsync();

                _logger.LogInformation("User {Email} logged in successfully via local authentication", email);
                return (user, null);
            }

            LdapUser? ldapUser = null;
            AzureAdUser? azureAdUser = null;

            // Authenticate with the appropriate provider
            if (provider == "ldap")
            {
                ldapUser = await _ldapAuthService.AuthenticateAsync(email, password);
                if (ldapUser == null)
                {
                    _logger.LogWarning("LDAP authentication failed for user {Email}", email);
                    return (null, "LDAP authentication failed");
                }
            }
            else if (provider == "azure_ad")
            {
                azureAdUser = await _azureAdService.AuthenticateAsync(email, password);
                if (azureAdUser == null)
                {
                    _logger.LogWarning("Azure AD authentication failed for user {Email}", email);
                    return (null, "Azure AD authentication failed");
                }
            }

            // Get or create user in database
            var userEmail = ldapUser?.Email ?? azureAdUser?.Email ?? email;
            var adUser = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.EmailLower == userEmail.ToLower());

            if (adUser == null)
            {
                // Create new user from AD
                adUser = new User
                {
                    Id = Guid.NewGuid(),
                    Email = userEmail,
                    EmailLower = userEmail.ToLower(),
                    IsSuperAdmin = false,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                if (ldapUser != null)
                {
                    adUser.LdapDistinguishedName = ldapUser.DistinguishedName;
                }
                else if (azureAdUser != null)
                {
                    adUser.AzureAdId = azureAdUser.ObjectId;
                }

                _dbContext.Users.Add(adUser);
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("New user created from AD: {Email}", userEmail);
            }
            else
            {
                // Update user's last login and AD identifiers
                adUser.LastLogin = DateTime.UtcNow;

                if (ldapUser != null && string.IsNullOrEmpty(adUser.LdapDistinguishedName))
                {
                    adUser.LdapDistinguishedName = ldapUser.DistinguishedName;
                }
                else if (azureAdUser != null && string.IsNullOrEmpty(adUser.AzureAdId))
                {
                    adUser.AzureAdId = azureAdUser.ObjectId;
                }

                _dbContext.Users.Update(adUser);
                await _dbContext.SaveChangesAsync();
            }

            // Log authentication event
            var adAuditLog = new AuditLog
            {
                UserId = adUser.Id,
                Action = "login",
                Timestamp = DateTime.UtcNow,
                Details = $"Logged in via {provider}"
            };

            _dbContext.AuditLogs.Add(adAuditLog);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("User {Email} logged in successfully via {Provider}", userEmail, provider);

            return (adUser, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login for email {Email}", email);
            return (null, ex.Message);
        }
    }

    public async Task<bool> ValidateCredentialsAsync(string email, string password, string provider)
    {
        try
        {
            if (provider == "ldap")
            {
                var ldapUser = await _ldapAuthService.AuthenticateAsync(email, password);
                return ldapUser != null;
            }
            else if (provider == "azure_ad")
            {
                var azureAdUser = await _azureAdService.AuthenticateAsync(email, password);
                return azureAdUser != null;
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating credentials");
            return false;
        }
    }
}
