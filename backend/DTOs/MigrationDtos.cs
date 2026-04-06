using System;
using System.Collections.Generic;

namespace DataModeler.API.DTOs;

// ============ Enums ============

public enum ChangeType
{
    Added,
    Removed,
    Modified,
    Renamed
}

public enum MigrationComplexity
{
    Simple,
    Moderate,
    Complex,
    VeryComplex
}

public enum MigrationRiskLevel
{
    Low,
    Medium,
    High,
    Critical
}

public enum IssueSeverity
{
    Info,
    Warning,
    Error,
    Critical
}

public enum IssueType
{
    MissingDefault,
    TypeChange,
    DataLoss,
    CircularDependency,
    ConstraintViolation,
    PerformanceImpact
}

public enum DataLossType
{
    RequiredFieldAdded,
    TableDropped,
    ColumnDropped,
    ConstraintRemoved,
    TypeConversion
}

public enum DataLossSeverity
{
    Low,
    Medium,
    High,
    Critical
}

public enum MigrationOperationType
{
    CreateTable,
    DropTable,
    AddColumn,
    DropColumn,
    AlterColumn,
    CreateForeignKey,
    DropForeignKey,
    CreateIndex,
    DropIndex,
    CreateEnum,
    DropEnum,
    AlterEnum,
    CreateConstraint,
    DropConstraint,
    RenameTable,
    RenameColumn
}

// ============ Change Detection DTOs ============

public class ModelChangeDetectionResultDto
{
    public List<TableChangeDto> TableChanges { get; set; } = new();
    public List<ColumnChangeDto> ColumnChanges { get; set; } = new();
    public List<RelationshipChangeDto> RelationshipChanges { get; set; } = new();
    public List<IndexChangeDto> IndexChanges { get; set; } = new();
    public int TotalChanges => TableChanges.Count + ColumnChanges.Count + RelationshipChanges.Count + IndexChanges.Count;
    public DateTime DetectedAt { get; set; } = DateTime.UtcNow;
}

public class TableChangeDto
{
    public string TableName { get; set; } = string.Empty;
    public ChangeType ChangeType { get; set; }
    public string? OldTableName { get; set; } // For rename
    public string? Note { get; set; }
}

public class ColumnChangeDto
{
    public string TableName { get; set; } = string.Empty;
    public string ColumnName { get; set; } = string.Empty;
    public string? OldColumnName { get; set; } // For rename
    public ChangeType ChangeType { get; set; }
    public string? ColumnType { get; set; }
    public string? DataType { get; set; }
    public bool IsNullable { get; set; } = true;
    public bool IsPrimaryKey { get; set; }
    public string? DefaultValue { get; set; }
    public string? PropertyName { get; set; }
    public string? OldPropertyValue { get; set; } // For modified
    public string? NewPropertyValue { get; set; } // For modified
    public string? OldValue { get; set; } // Alias for OldPropertyValue
    public string? NewValue { get; set; } // Alias for NewPropertyValue
}

public class IndexChangeDto
{
    public string TableName { get; set; } = string.Empty;
    public string IndexName { get; set; } = string.Empty;
    public ChangeType ChangeType { get; set; }
    public List<string> Columns { get; set; } = new();
    public bool IsUnique { get; set; }
}

public class RelationshipChangeDto
{
    public string FromTable { get; set; } = string.Empty;
    public string FromColumn { get; set; } = string.Empty;
    public string ToTable { get; set; } = string.Empty;
    public string ToColumn { get; set; } = string.Empty;
    public ChangeType ChangeType { get; set; }
    public string RelationType { get; set; } = "one_to_many";
}

// ============ Relationship DTOs ============

public class RelationshipDto
{
    public string FromTable { get; set; } = string.Empty;
    public string FromColumn { get; set; } = string.Empty;
    public string ToTable { get; set; } = string.Empty;
    public string ToColumn { get; set; } = string.Empty;
    public string RelationType { get; set; } = "one_to_many";
}

// ============ Migration Plan DTOs ============

public class SqlMigrationPlanDto
{
    public DateTime DetectedAt { get; set; }
    public string DatabaseDialect { get; set; } = "postgresql";
    public MigrationComplexity Complexity { get; set; }
    public MigrationRiskLevel RiskLevel { get; set; }
    public TimeSpan EstimatedDuration { get; set; }
    public List<MigrationStageDto> MigrationStages { get; set; } = new();
    public List<ValidationIssueDto> ValidationIssues { get; set; } = new();
    public List<DataLossWarningDto> DataLossWarnings { get; set; } = new();
    public string Summary { get; set; } = string.Empty;
}

public class MigrationStageDto
{
    public int StageNumber { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? StageName { get; set; }
    public List<string> SqlStatements { get; set; } = new();
    public List<MigrationOperationDto> Operations { get; set; } = new();
    public List<TableChangeDto>? TableChanges { get; set; }
    public List<ColumnChangeDto>? ColumnChanges { get; set; }
    public List<RelationshipChangeDto>? RelationshipChanges { get; set; }
    public TimeSpan ExpectedDuration { get; set; }
    public bool CanRunInParallel { get; set; }
    public List<int>? DependsOnStages { get; set; } // List of stage numbers this depends on
    public List<string> Notes { get; set; } = new();
}

public class ValidationIssueDto
{
    public IssueSeverity Severity { get; set; } = IssueSeverity.Info;
    public IssueType? Type { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? AffectedObject { get; set; } // Table or column name
    public string? AffectedEntity { get; set; }
    public string? Recommendation { get; set; }
}

public class DataLossWarningDto
{
    public DataLossType? WarningType { get; set; }
    public string Warning { get; set; } = string.Empty;
    public string? TableName { get; set; }
    public string? ColumnName { get; set; }
    public string? AffectedTable { get; set; }
    public string? AffectedColumn { get; set; }
    public string Message { get; set; } = string.Empty;
    public DataLossSeverity Severity { get; set; } = DataLossSeverity.Medium;
    public string Mitigation { get; set; } = string.Empty;
}

public class MigrationOperationDto
{
    public MigrationOperationType OperationType { get; set; }
    public string? TableName { get; set; }
    public string? ColumnName { get; set; }
    public string? NewColumnName { get; set; }
    public string? DataType { get; set; }
    public bool? IsNullable { get; set; }
    public string? DefaultValue { get; set; }
    public string? ConstraintName { get; set; }
    public string? ReferencedTable { get; set; }
    public string? ReferencedColumn { get; set; }
    public string? IndexName { get; set; }
    public List<string> IndexColumns { get; set; } = new();
    public bool IsUnique { get; set; }
}

// ============ Statement Ordering DTOs ============

public class SqlOrderingResultDto
{
    public List<MigrationStageDto> ReorderedStages { get; set; } = new();
    public Dictionary<string, List<int>> DependencyMap { get; set; } = new();
    public List<string> ExecutionOrder { get; set; } = new();
}
