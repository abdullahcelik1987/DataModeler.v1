using System.ComponentModel.DataAnnotations.Schema;

namespace DataModeler.API.Models;

[Table("application_roles")]
public class ApplicationRole
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("display_name")]
    public string DisplayName { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("permissions_json")]
    public string? PermissionsJson { get; set; }

    [Column("is_system")]
    public bool IsSystem { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<UserApplicationRole> Users { get; set; } = new List<UserApplicationRole>();
}

[Table("user_application_roles")]
public class UserApplicationRole
{
    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("role_id")]
    public Guid RoleId { get; set; }

    [Column("assigned_at")]
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    [Column("assigned_by")]
    public Guid? AssignedBy { get; set; }

    public User? User { get; set; }
    public ApplicationRole? Role { get; set; }
}

[Table("project_metadata_field_definitions")]
public class ProjectMetadataFieldDefinition
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("field_key")]
    public string FieldKey { get; set; } = string.Empty;

    [Column("display_name")]
    public string DisplayName { get; set; } = string.Empty;

    [Column("field_type")]
    public string FieldType { get; set; } = "text";

    [Column("is_required")]
    public bool IsRequired { get; set; }

    [Column("is_system")]
    public bool IsSystem { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("options_json")]
    public string OptionsJson { get; set; } = "[]";

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("devops_repository_mappings")]
public class DevopsRepositoryMapping
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("model_id")]
    public Guid ModelId { get; set; }

    [Column("project_name")]
    public string ProjectName { get; set; } = string.Empty;

    [Column("repository_name")]
    public string RepositoryName { get; set; } = string.Empty;

    [Column("branch_name")]
    public string BranchName { get; set; } = "main";

    [Column("file_path")]
    public string FilePath { get; set; } = "/models/model.dbml";

    [Column("is_enabled")]
    public bool IsEnabled { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Model? Model { get; set; }
}

[Table("database_systems")]
public class DatabaseSystem
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("key")]
    public string Key { get; set; } = string.Empty;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<DatabaseDataType> DataTypes { get; set; } = new List<DatabaseDataType>();
}

[Table("database_data_types")]
public class DatabaseDataType
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("database_system_id")]
    public Guid DatabaseSystemId { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("input_template")]
    public string InputTemplate { get; set; } = string.Empty;

    [Column("parameters_json")]
    public string ParametersJson { get; set; } = "[]";

    [Column("requires_length")]
    public bool RequiresLength { get; set; }

    [Column("supports_precision_scale")]
    public bool SupportsPrecisionScale { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DatabaseSystem? DatabaseSystem { get; set; }
}

[Table("change_requests")]
public class ChangeRequest
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("change_code")]
    public string ChangeCode { get; set; } = string.Empty;

    [Column("model_id")]
    public Guid ModelId { get; set; }

    [Column("requester_id")]
    public Guid RequesterId { get; set; }

    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("status")]
    public string Status { get; set; } = string.Empty;

    [Column("workflow_stages_json")]
    public string WorkflowStagesJson { get; set; } = "[]";

    [Column("current_stage_index")]
    public int CurrentStageIndex { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Model? Model { get; set; }
    public User? Requester { get; set; }
    public ChangeRequestDetails? Details { get; set; }
    public ICollection<ChangeRequestApprovalLog> ApprovalLogs { get; set; } = new List<ChangeRequestApprovalLog>();
}

[Table("change_request_details")]
public class ChangeRequestDetails
{
    [Column("change_request_id")]
    public Guid ChangeRequestId { get; set; }

    [Column("old_dbml_snapshot")]
    public string OldDbmlSnapshot { get; set; } = string.Empty;

    [Column("new_dbml_snapshot")]
    public string NewDbmlSnapshot { get; set; } = string.Empty;

    [Column("generated_sql")]
    public string GeneratedSql { get; set; } = string.Empty;

    public ChangeRequest? ChangeRequest { get; set; }
}

[Table("change_request_approval_logs")]
public class ChangeRequestApprovalLog
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("change_request_id")]
    public Guid ChangeRequestId { get; set; }

    [Column("action_by")]
    public Guid ActionBy { get; set; }

    [Column("from_status")]
    public string? FromStatus { get; set; }

    [Column("to_status")]
    public string ToStatus { get; set; } = string.Empty;

    [Column("comment")]
    public string? Comment { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ChangeRequest? ChangeRequest { get; set; }
    public User? Actor { get; set; }
}
