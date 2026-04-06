using System.Security.Cryptography;
using System.Text;

namespace DataModeler.API.Utilities;

/// <summary>
/// Password hashing and verification utility using BCrypt algorith
/// Note: In production, consider using Microsoft.AspNetCore.Identity
/// </summary>
public static class PasswordHasher
{
    private const int WorkFactor = 12; // BCrypt work factor (cost)

    /// <summary>
    /// Hash a password using BCrypt
    /// </summary>
    public static string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);
    }

    /// <summary>
    /// Verify a password against its hash
    /// </summary>
    public static bool VerifyPassword(string password, string hash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Check if a password hash needs to be updated (re-hashed with new work factor)
    /// </summary>
    public static bool NeedsRehash(string hash)
    {
        try
        {
            // Parse the work factor from the hash
            var parts = hash.Split('$');
            if (parts.Length < 4)
                return true;

            var currentWorkFactor = int.Parse(parts[2]);
            return currentWorkFactor < WorkFactor;
        }
        catch
        {
            return true;
        }
    }
}
