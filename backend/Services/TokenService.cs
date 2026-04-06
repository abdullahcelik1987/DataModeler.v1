using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using DataModeler.API.DTOs;

namespace DataModeler.API.Services;

/// <summary>
/// JWT Token generation and validation service
/// </summary>
public interface ITokenService
{
    TokenResponseDto GenerateToken(Guid userId, string email, bool isSuperAdmin);
    TokenResponseDto RefreshToken(string refreshToken);
    ClaimsPrincipal GetPrincipalFromExpiredToken(string token);
}

/// <summary>
/// Implementation of JWT token service
/// </summary>
public class TokenService : ITokenService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<TokenService> _logger;

    public TokenService(IConfiguration configuration, ILogger<TokenService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public TokenResponseDto GenerateToken(Guid userId, string email, bool isSuperAdmin)
    {
        try
        {
            // Get JWT Secret from environment variable first (Kubernetes), then config
            var jwtSecretEnv = Environment.GetEnvironmentVariable("JWT__Secret");
            var jwtSettings = _configuration.GetSection("Jwt");
            var jwtConfigSecret = jwtSettings["Secret"];
            var secret = string.IsNullOrEmpty(jwtSecretEnv) ? jwtConfigSecret : jwtSecretEnv;
            
            if (string.IsNullOrEmpty(secret))
                throw new InvalidOperationException("JWT Secret not configured");
            
            var key = Encoding.ASCII.GetBytes(secret);
            var issuer = jwtSettings["Issuer"] ?? "https://datamodeler.local";
            var audience = jwtSettings["Audience"] ?? "datamodeler-api";
            var expiresInMinutes = int.Parse(jwtSettings["ExpiresInMinutes"] ?? "60");

            var tokenHandler = new JwtSecurityTokenHandler();

            var claims = new List<Claim>
            {
                new Claim("sub", userId.ToString()),
                new Claim("email", email),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.NameIdentifier, userId.ToString())
            };

            if (isSuperAdmin)
            {
                claims.Add(new Claim(ClaimTypes.Role, "SuperAdmin"));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(expiresInMinutes),
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var accessToken = tokenHandler.WriteToken(token);

            // Generate refresh token (simple implementation - store in DB in production)
            var refreshToken = GenerateRefreshToken();

            _logger.LogInformation("Token generated for user {UserId} ({Email})", userId, email);

            return new TokenResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresIn = expiresInMinutes * 60,
                TokenType = "Bearer"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating JWT token");
            throw;
        }
    }

    public TokenResponseDto RefreshToken(string refreshToken)
    {
        try
        {
            // In production, validate refresh token against database
            // For now, we'll accept any non-empty token
            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                throw new InvalidOperationException("Invalid refresh token");
            }

            // In a real implementation, look up the refresh token in the database
            // and verify it hasn't expired or been revoked
            _logger.LogInformation("Token refreshed");

            // For now, return a new token with placeholder values
            // This will be properly implemented with database storage
            return GenerateToken(Guid.Empty, "user@example.com", false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing token");
            throw;
        }
    }

    public ClaimsPrincipal GetPrincipalFromExpiredToken(string token)
    {
        try
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var secret = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret not configured");
            var key = Encoding.ASCII.GetBytes(secret);

            var tokenHandler = new JwtSecurityTokenHandler();
            var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = jwtSettings["Issuer"],
                ValidateAudience = true,
                ValidAudience = jwtSettings["Audience"],
                ValidateLifetime = false // Don't validate expiry for refresh token validation
            }, out SecurityToken validatedToken);

            return principal;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating expired token");
            throw;
        }
    }

    private static string GenerateRefreshToken()
    {
        var randomNumber = new byte[64];
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }
    }
}
