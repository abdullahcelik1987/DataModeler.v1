using System.ComponentModel.DataAnnotations.Schema;

namespace DataModeler.API.Models;

/// <summary>
/// Represents a user in the system (from AD or local auth)
/// </summary>
[Table("users")]
public class User
{
    [Column("id")]
    public Guid Id { get; set; }
    
    [Column("email")]
    public string Email { get; set; } = string.Empty;
    
    [Column("email_lower")]
    public string EmailLower { get; set; } = string.Empty;
    
    [Column("password_hash")]
    public string? PasswordHash { get; set; }
    
    [Column("azure_ad_id")]
    public string? AzureAdId { get; set; }
    
    [Column("ldap_distinguished_name")]
    public string? LdapDistinguishedName { get; set; }
    
    [Column("is_super_admin")]
    public bool IsSuperAdmin { get; set; }
    
    [Column("is_active")]
    public bool IsActive { get; set; } = true;
    
    [Column("last_login")]
    public DateTime? LastLogin { get; set; }
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Model> OwnedModels { get; set; } = new List<Model>();
    public ICollection<ModelCollaborator> Collaborations { get; set; } = new List<ModelCollaborator>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public ICollection<UserApplicationRole> ApplicationRoles { get; set; } = new List<UserApplicationRole>();
    public ICollection<ChangeRequest> ChangeRequests { get; set; } = new List<ChangeRequest>();
    public ICollection<ChangeRequestApprovalLog> ChangeRequestApprovalLogs { get; set; } = new List<ChangeRequestApprovalLog>();
}

/// <summary>
/// Represents a DBML data model
/// </summary>
[Table("models")]
public class Model
{
    [Column("id")]
    public Guid Id { get; set; }
    [Column("name")]
    public string Name { get; set; } = string.Empty;
    [Column("owner_id")]
    public Guid OwnerId { get; set; }
    [Column("description")]
    public string? Description { get; set; }
    [Column("repository_id")]
    public Guid? RepositoryId { get; set; }
    [Column("model_group_id")]
    public Guid? ModelGroupId { get; set; }
    [Column("database_dialect")]
    public string DatabaseDialect { get; set; } = "PostgreSQL";
    [Column("project_metadata_json")]
    public string ProjectMetadataJson { get; set; } = "{}";
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User? Owner { get; set; }
    public ModelGroup? ModelGroup { get; set; }
    public ICollection<ModelVersion> Versions { get; set; } = new List<ModelVersion>();
    public ICollection<ModelChange> Changes { get; set; } = new List<ModelChange>();
    public ICollection<ModelCollaborator> Collaborators { get; set; } = new List<ModelCollaborator>();
    public ICollection<ModelGroupPermission> GroupPermissions { get; set; } = new List<ModelGroupPermission>();
}

/// <summary>
/// Logical group for organizing models in the UI
/// </summary>
[Table("model_groups")]
public class ModelGroup
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("created_by")]
    public Guid? CreatedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Model> Models { get; set; } = new List<Model>();
}

/// <summary>
/// Represents a version/snapshot of a model (Git-like history)
/// </summary>
[Table("model_versions")]
public class ModelVersion
{
    [Column("id")]
    public Guid Id { get; set; }
    [Column("model_id")]
    public Guid ModelId { get; set; }
    [Column("dbml_content")]
    public string DbmlContent { get; set; } = string.Empty;
    [Column("version_number")]
    public int VersionNumber { get; set; }
    [Column("created_by")]
    public Guid CreatedBy { get; set; }
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("change_summary")]
    public string? ChangeSummary { get; set; }
    [Column("parent_version_id")]
    public Guid? ParentVersionId { get; set; }
    [Column("branch_name")]
    public string BranchName { get; set; } = "main";
    [Column("is_locked")]
    public bool IsLocked { get; set; }

    // Navigation properties
    public Model? Model { get; set; }
    public User? Creator { get; set; }
    public ModelVersion? ParentVersion { get; set; }
}

/// <summary>
/// Represents a SQL change/migration generated from model changes
/// </summary>
[Table("model_changes")]
public class ModelChange
{
    [Column("id")]
    public long Id { get; set; }
    [Column("model_id")]
    public Guid ModelId { get; set; }
    [Column("version_id")]
    public Guid? VersionId { get; set; }
    [Column("user_id")]
    public Guid UserId { get; set; }
    [Column("change_type")]
    public string ChangeType { get; set; } = "structure"; // structure, data, constraint
    [Column("sql_script")]
    public string? SqlScript { get; set; }
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Model? Model { get; set; }
    public User? User { get; set; }
}

/// <summary>
/// Represents access permission to a model
/// </summary>
[Table("model_collaborators")]
public class ModelCollaborator
{
    [Column("model_id")]
    public Guid ModelId { get; set; }
    [Column("user_id")]
    public Guid UserId { get; set; }
    [Column("role")]
    public string Role { get; set; } = "viewer"; // viewer, editor, owner
    [Column("assigned_at")]
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    [Column("assigned_by")]
    public Guid? AssignedBy { get; set; }

    // Navigation properties
    public Model? Model { get; set; }
    public User? User { get; set; }
}

/// <summary>
/// Represents group-level access to a model (for AD groups)
/// </summary>
[Table("model_group_permissions")]
public class ModelGroupPermission
{
    [Column("id")]
    public Guid Id { get; set; }
    [Column("model_id")]
    public Guid ModelId { get; set; }
    [Column("ad_group_name")]
    public string AdGroupName { get; set; } = string.Empty;
    [Column("role")]
    public string Role { get; set; } = "viewer"; // viewer, editor, owner
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Model? Model { get; set; }
}

/// <summary>
/// Audit log entry for compliance and debugging
/// </summary>
[Table("audit_logs")]
public class AuditLog
{
    [Column("id")]
    public long Id { get; set; }
    
    [Column("user_id")]
    public Guid? UserId { get; set; }
    
    [Column("action")]
    public string Action { get; set; } = string.Empty; // login, create_model, edit_model, etc
    
    [Column("model_id")]
    public Guid? ModelId { get; set; }
    
    [Column("target_table_name")]
    public string? TargetTableName { get; set; }
    
    [Column("ip_address")]
    public string? IpAddress { get; set; }
    
    [Column("user_agent")]
    public string? UserAgent { get; set; }
    
    [Column("details")]
    public string? Details { get; set; } // JSON serialized
    
    [Column("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // Alias for Timestamp

    // Navigation properties
    public User? User { get; set; }
    public Model? Model { get; set; }
}

/// <summary>
/// Represents an active editing session (for real-time collaboration)
/// </summary>
[Table("editing_sessions")]
public class EditingSession
{
    [Column("id")]
    public Guid Id { get; set; }
    [Column("model_id")]
    public Guid ModelId { get; set; }
    [Column("user_id")]
    public Guid UserId { get; set; }
    [Column("started_at")]
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    [Column("last_activity")]
    public DateTime LastActivity { get; set; } = DateTime.UtcNow;
    [Column("cursor_position")]
    public int? CursorPosition { get; set; }
    [Column("session_color")]
    public string? SessionColor { get; set; } // Hex color for cursor
    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public Model? Model { get; set; }
    public User? User { get; set; }
}

/// <summary>
/// Stores yjs CRDT updates for real-time sync
/// </summary>
[Table("yjs_updates")]
public class YjsUpdate
{
    [Column("id")]
    public long Id { get; set; }
    [Column("model_id")]
    public Guid ModelId { get; set; }
    [Column("user_id")]
    public Guid UserId { get; set; }
    [Column("update_binary")]
    public byte[] UpdateBinary { get; set; } = Array.Empty<byte>();
    [Column("version_clock")]
    public int VersionClock { get; set; } // Lamport clock for ordering
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Model? Model { get; set; }
    public User? User { get; set; }
}

/// <summary>
/// Stores Active Directory settings configuration
/// </summary>
[Table("ad_settings")]
public class AdSettings
{
    [Column("id")]
    public Guid Id { get; set; }
    [Column("provider_type")]
    public string ProviderType { get; set; } = "ldap"; // ldap or azure_ad
    [Column("is_enabled")]
    public bool IsEnabled { get; set; }
    [Column("config")]
    public string ConfigJson { get; set; } = "{}"; // Encrypted JSON with connection details
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [Column("test_status")]
    public string? TestStatus { get; set; } // pending, success, failed
    [Column("test_message")]
    public string? TestMessage { get; set; }
    [Column("test_timestamp")]
    public DateTime? TestTimestamp { get; set; }
}

/// <summary>
/// Stores Azure DevOps Server settings
/// </summary>
[Table("devops_settings")]
public class DevopsSettings
{
    [Column("id")]
    public Guid Id { get; set; }
    [Column("instance_url")]
    public string InstanceUrl { get; set; } = string.Empty;
    [Column("collection_name")]
    public string CollectionName { get; set; } = string.Empty;
    [Column("pat_token")]
    public string? PatToken { get; set; } // Encrypted
    [Column("is_enabled")]
    public bool IsEnabled { get; set; }
    [NotMapped]
    public string Config { get; set; } = "{}"; // JSON configuration
    [NotMapped]
    public string ConfigJson { get; set; } = "{}"; // Alias for Config
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [Column("test_status")]
    public string? TestStatus { get; set; }
    [Column("test_message")]
    public string? TestMessage { get; set; }
    [Column("test_timestamp")]
    public DateTime? TestTimestamp { get; set; }
}

/// <summary>
/// Stores database connection strings for SQL generation
/// </summary>
[Table("repository_connections")]
public class RepositoryConnection
{
    [Column("id")]
    public Guid Id { get; set; }
    [Column("name")]
    public string Name { get; set; } = string.Empty;
    [Column("connection_string")]
    public string? ConnectionString { get; set; } // Encrypted
    [Column("database_type")]
    public string DatabaseType { get; set; } = "PostgreSQL"; // PostgreSQL, SqlServer, MySQL, Oracle
    [Column("is_default")]
    public bool IsDefault { get; set; }
    [Column("is_enabled")]
    public bool IsEnabled { get; set; } = true;
    [Column("created_by")]
    public Guid CreatedBy { get; set; }
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User? Creator { get; set; }
}
