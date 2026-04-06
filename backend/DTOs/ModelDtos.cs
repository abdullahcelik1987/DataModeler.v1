using System;
using System.Collections.Generic;

namespace DataModeler.API.DTOs;

// ============ Model CRUD DTOs ============

public class ModelListDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string OwnerEmail { get; set; } = string.Empty;
    public string DatabaseDialect { get; set; } = "PostgreSQL";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string YourRole { get; set; } = "viewer"; // viewer, editor, owner
    public int LatestVersion { get; set; }
    public Guid? ModelGroupId { get; set; }
    public string? ModelGroupName { get; set; }
}

public class ModelDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string OwnerEmail { get; set; } = string.Empty;
    public string DatabaseDialect { get; set; } = "PostgreSQL";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int LatestVersion { get; set; }
    public string DbmlContent { get; set; } = string.Empty;
    public ErdDataDto ErdData { get; set; } = new();
    public string YourRole { get; set; } = "viewer";
    public Guid? ModelGroupId { get; set; }
    public string? ModelGroupName { get; set; }
}

public class CreateModelRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? DatabaseDialect { get; set; }
    public string? InitialDbml { get; set; }
    public Guid? ModelGroupId { get; set; }
}

public class UpdateModelRequestDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? DatabaseDialect { get; set; }
    public string? DbmlContent { get; set; }
    public string? ChangeSummary { get; set; }
}

public class CreateModelGroupRequestDto
{
    public string Name { get; set; } = string.Empty;
}

public class AssignModelGroupRequestDto
{
    public Guid? ModelGroupId { get; set; }
}

public class ModelGroupDto
{
    public Guid? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int ModelCount { get; set; }
}

// ============ Model Version DTOs ============

public class ModelVersionDto
{
    public Guid Id { get; set; }
    public int VersionNumber { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? ChangeSummary { get; set; }
}

public class ModelVersionDetailDto
{
    public Guid Id { get; set; }
    public int VersionNumber { get; set; }
    public string DbmlContent { get; set; } = string.Empty;
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? ChangeSummary { get; set; }
    public ErdDataDto ErdData { get; set; } = new();
}

// ============ Collaborator DTOs ============

public class AddCollaboratorRequestDto
{
    public string UserEmail { get; set; } = string.Empty;
    public string Role { get; set; } = "viewer"; // viewer, editor, owner
}

// ============ DBML Parsing DTOs ============

public class ParseDbmlRequestDto
{
    public string DbmlContent { get; set; } = string.Empty;
}

public class GenerateDbmlRequestDto
{
    public List<DbmlTableNodeDto> Nodes { get; set; } = new();
    public List<DbmlRelationshipDto> Relationships { get; set; } = new();
}

// ============ ERD Data DTOs ============

public class ErdDataDto
{
    public List<DbmlTableNodeDto> Nodes { get; set; } = new();
    public List<DbmlRelationshipDto> Relationships { get; set; } = new();
    public List<string> ValidationErrors { get; set; } = new();
}

public class DbmlTableNodeDto
{
    public string TableName { get; set; } = string.Empty;
    public string? TableAlias { get; set; }
    public string? Note { get; set; }
    public List<DbmlColumnDto> Columns { get; set; } = new();
}

public class DbmlColumnDto
{
    public string ColumnName { get; set; } = string.Empty;
    public string ColumnType { get; set; } = string.Empty;
    public bool IsPrimaryKey { get; set; }
    public bool IsUnique { get; set; }
    public bool IsNotNull { get; set; }
    public bool IsAutoIncrement { get; set; }
    public string? DefaultValue { get; set; }
    public string? Note { get; set; }
}

public class DbmlRelationshipDto
{
    public string FromTable { get; set; } = string.Empty;
    public string FromColumn { get; set; } = string.Empty;
    public string ToTable { get; set; } = string.Empty;
    public string ToColumn { get; set; } = string.Empty;
    public string RelationType { get; set; } = "one_to_many"; // one_to_one, one_to_many, many_to_many
}
