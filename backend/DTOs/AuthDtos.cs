namespace DataModeler.API.DTOs;

using System.Text.Json.Serialization;

/// <summary>
/// Request for user login
/// </summary>
public class LoginRequestDto
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
    
    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;
    
    [JsonPropertyName("provider")]
    public string Provider { get; set; } = "local"; // "local", "ldap" or "azure_ad"
}

/// <summary>
/// Response with JWT token
/// </summary>
public class TokenResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
    public string TokenType { get; set; } = "Bearer";
}

/// <summary>
/// Login response with user info and token
/// </summary>
public class LoginResponseDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public UserDto? User { get; set; }
    public TokenResponseDto? Token { get; set; }
}

/// <summary>
/// User data transfer object
/// </summary>
public class UserDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public bool IsSuperAdmin { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Refresh token request
/// </summary>
public class RefreshTokenRequestDto
{
    public string RefreshToken { get; set; } = string.Empty;
}

/// <summary>
/// AD provider info
/// </summary>
public class AdProviderDto
{
    public string Type { get; set; } = string.Empty; // "ldap" or "azure_ad"
    public bool IsEnabled { get; set; }
    public string? Description { get; set; }
}

/// <summary>
/// AD providers list
/// </summary>
public class AdProvidersDto
{
    public List<AdProviderDto> Providers { get; set; } = new();
}
