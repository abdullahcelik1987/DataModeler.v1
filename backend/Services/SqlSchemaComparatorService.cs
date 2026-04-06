using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using DataModeler.API.DTOs;

namespace DataModeler.Services
{
    /// <summary>
    /// Service for converting change detection results into SQL-focused migration plans
    /// Analyzes changes to determine:
    /// - Dependencies between changes
    /// - Execution order (respecting foreign keys, constraints)
    /// - Potential conflicts or data loss
    /// - Migration complexity and risk level
    /// </summary>
    public interface ISqlSchemaComparatorService
    {
        Task<SqlMigrationPlanDto> GenerateMigrationPlanAsync(
            ModelChangeDetectionResultDto changeDetection,
            string? databaseDialect = "postgresql");
    }

    public class SqlSchemaComparatorService : ISqlSchemaComparatorService
    {
        private readonly ILogger<SqlSchemaComparatorService> _logger;

        public SqlSchemaComparatorService(ILogger<SqlSchemaComparatorService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Generates a SQL migration plan from detected changes
        /// </summary>
        public async Task<SqlMigrationPlanDto> GenerateMigrationPlanAsync(
            ModelChangeDetectionResultDto changeDetection,
            string? databaseDialect = "postgresql")
        {
            try
            {
                _logger.LogInformation(
                    $"Generating SQL migration plan for {databaseDialect} " +
                    $"with {changeDetection.TotalChanges} changes");

                var plan = new SqlMigrationPlanDto
                {
                    DetectedAt = DateTime.UtcNow,
                    DatabaseDialect = databaseDialect ?? "postgresql",
                    Complexity = CalculateComplexity(changeDetection),
                    RiskLevel = CalculateRiskLevel(changeDetection),
                    EstimatedDuration = EstimateDuration(changeDetection),
                    MigrationStages = new List<MigrationStageDto>(),
                    ValidationIssues = new List<ValidationIssueDto>(),
                    DataLossWarnings = new List<DataLossWarningDto>()
                };

                // Validate for potential issues
                ValidateChanges(changeDetection, plan);

                // Group changes into logical stages
                GroupChangesIntoStages(changeDetection, plan);

                // Determine execution order within stages
                OrderChangesWithinStages(plan);

                // Calculate dependencies
                CalculateDependencies(plan);

                // Generate migration summary
                plan.Summary = GenerateSummary(plan);

                _logger.LogInformation(
                    $"Migration plan generated with {plan.MigrationStages.Count} stages " +
                    $"and complexity level: {plan.Complexity}");

                return await Task.FromResult(plan);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating SQL migration plan");
                throw new InvalidOperationException("Failed to generate migration plan", ex);
            }
        }

        private MigrationComplexity CalculateComplexity(ModelChangeDetectionResultDto changes)
        {
            var score = 0;

            // Table operation complexity
            score += (changes.TableChanges.Count(c => c.ChangeType == ChangeType.Removed) * 5);
            score += (changes.TableChanges.Count(c => c.ChangeType == ChangeType.Added) * 2);

            // Column change complexity
            score += changes.ColumnChanges
                .Where(c => c.ChangeType == ChangeType.Removed && !c.IsNullable)
                .Count() * 3;

            // Foreign key changes complexity
            score += changes.RelationshipChanges.Count() * 3;

            // Index changes complexity
            score += changes.IndexChanges.Count();

            return score switch
            {
                <= 5 => MigrationComplexity.Simple,
                <= 15 => MigrationComplexity.Moderate,
                <= 30 => MigrationComplexity.Complex,
                _ => MigrationComplexity.VeryComplex
            };
        }

        private MigrationRiskLevel CalculateRiskLevel(ModelChangeDetectionResultDto changes)
        {
            var hasDataLoss = changes.ColumnChanges.Any(c =>
                c.ChangeType == ChangeType.Removed ||
                (c.ChangeType == ChangeType.Modified &&
                 c.PropertyName == "nullable" &&
                 c.NewValue == "False"));

            var hasTableDrop = changes.TableChanges.Any(c => c.ChangeType == ChangeType.Removed);

            var hasConstraintChanges = changes.RelationshipChanges.Count > 0;

            if (hasTableDrop && hasDataLoss)
                return MigrationRiskLevel.Critical;

            if (hasTableDrop || (hasDataLoss && hasConstraintChanges))
                return MigrationRiskLevel.High;

            if (hasDataLoss || hasConstraintChanges)
                return MigrationRiskLevel.Medium;

            return MigrationRiskLevel.Low;
        }

        private TimeSpan EstimateDuration(ModelChangeDetectionResultDto changes)
        {
            var baseMs = 100; // Base execution time
            baseMs += changes.TableChanges.Count * 50;
            baseMs += changes.ColumnChanges.Count * 20;
            baseMs += changes.RelationshipChanges.Count * 75;
            baseMs += changes.IndexChanges.Count * 100;

            // Add safety margin (add 50%)
            baseMs = (int)(baseMs * 1.5);

            return TimeSpan.FromMilliseconds(baseMs);
        }

        private void ValidateChanges(
            ModelChangeDetectionResultDto changes,
            SqlMigrationPlanDto plan)
        {
            // Check for non-nullable columns without defaults
            foreach (var colChange in changes.ColumnChanges
                .Where(c => c.ChangeType == ChangeType.Added && !c.IsNullable))
            {
                plan.ValidationIssues.Add(new ValidationIssueDto
                {
                    Severity = IssueSeverity.Warning,
                    Type = IssueType.MissingDefault,
                    Message = $"Adding non-nullable column '{colChange.TableName}.{colChange.ColumnName}' " +
                             $"without default value. Existing rows will need a default value.",
                    AffectedEntity = $"{colChange.TableName}.{colChange.ColumnName}",
                    Recommendation = "Provide a default value or set the column as nullable initially"
                });

                plan.DataLossWarnings.Add(new DataLossWarningDto
                {
                    WarningType = DataLossType.RequiredFieldAdded,
                    TableName = colChange.TableName,
                    ColumnName = colChange.ColumnName,
                    Message = "Adding NOT NULL column without default to existing table",
                    Severity = DataLossSeverity.High
                });
            }

            // Check for column type changes
            foreach (var colChange in changes.ColumnChanges
                .Where(c => c.ChangeType == ChangeType.Modified && c.PropertyName == "type"))
            {
                plan.ValidationIssues.Add(new ValidationIssueDto
                {
                    Severity = IssueSeverity.Warning,
                    Type = IssueType.TypeChange,
                    Message = $"Changing column type '{colChange.TableName}.{colChange.ColumnName}' " +
                             $"from {colChange.OldValue} to {colChange.NewValue}. " +
                             $"Data migration may fail.",
                    AffectedEntity = $"{colChange.TableName}.{colChange.ColumnName}",
                    Recommendation = "Review data compatibility before migration"
                });
            }

            // Check for table drops with data loss
            foreach (var tableChange in changes.TableChanges
                .Where(t => t.ChangeType == ChangeType.Removed))
            {
                plan.ValidationIssues.Add(new ValidationIssueDto
                {
                    Severity = IssueSeverity.Critical,
                    Type = IssueType.DataLoss,
                    Message = $"Dropping table '{tableChange.TableName}'. " +
                             $"All data in this table will be permanently deleted.",
                    AffectedEntity = tableChange.TableName,
                    Recommendation = "Backup table before dropping or verify this is intentional"
                });

                plan.DataLossWarnings.Add(new DataLossWarningDto
                {
                    WarningType = DataLossType.TableDropped,
                    TableName = tableChange.TableName,
                    Message = $"Table '{tableChange.TableName}' will be dropped permanently",
                    Severity = DataLossSeverity.Critical
                });
            }

            // Check for column drops
            foreach (var colChange in changes.ColumnChanges
                .Where(c => c.ChangeType == ChangeType.Removed))
            {
                plan.DataLossWarnings.Add(new DataLossWarningDto
                {
                    WarningType = DataLossType.ColumnDropped,
                    TableName = colChange.TableName,
                    ColumnName = colChange.ColumnName,
                    Message = $"Column '{colChange.TableName}.{colChange.ColumnName}' will be dropped",
                    Severity = DataLossSeverity.High
                });
            }

            // Check for circular foreign key dependencies
            ValidateForeignKeyDependencies(changes.RelationshipChanges, plan);
        }

        private void ValidateForeignKeyDependencies(
            List<RelationshipChangeDto> relationships,
            SqlMigrationPlanDto plan)
        {
            var edges = relationships.Where(r => r.ChangeType != ChangeType.Removed)
                .Select(r => (r.ToTable, r.FromTable))
                .ToList();

            // Simple cycle detection using DFS
            var visited = new HashSet<string>();
            var recursionStack = new HashSet<string>();

            foreach (var (toT, fromT) in edges)
            {
                if (!visited.Contains(fromT))
                {
                    if (HasCycle(fromT, edges, visited, recursionStack, plan))
                    {
                        plan.ValidationIssues.Add(new ValidationIssueDto
                        {
                            Severity = IssueSeverity.Warning,
                            Type = IssueType.CircularDependency,
                            Message = "Circular foreign key dependency detected. " +
                                    "Disable constraints temporarily during migration.",
                            Recommendation = "Use --disable-triggers or similar database option"
                        });
                        break;
                    }
                }
            }
        }

        private bool HasCycle(
            string node,
            List<(string, string)> edges,
            HashSet<string> visited,
            HashSet<string> stack,
            SqlMigrationPlanDto plan)
        {
            visited.Add(node);
            stack.Add(node);

            foreach (var (_, child) in edges.Where(e => e.Item2 == node))
            {
                if (!visited.Contains(child))
                {
                    if (HasCycle(child, edges, visited, stack, plan))
                        return true;
                }
                else if (stack.Contains(child))
                {
                    return true;
                }
            }

            stack.Remove(node);
            return false;
        }

        private void GroupChangesIntoStages(
            ModelChangeDetectionResultDto changes,
            SqlMigrationPlanDto plan)
        {
            // Stage 1: Remove constraints and indexes
            var stage1 = new MigrationStageDto
            {
                StageNumber = 1,
                StageName = "Remove Constraints & Indexes",
                Description = "Drop foreign keys, constraints, and indexes to allow column/table modifications",
                Operations = new List<MigrationOperationDto>()
            };

            // Drop foreign keys first
            foreach (var rel in changes.RelationshipChanges
                .Where(r => r.ChangeType == ChangeType.Removed || r.ChangeType == ChangeType.Modified))
            {
                stage1.Operations.Add(new MigrationOperationDto
                {
                    OperationType = MigrationOperationType.DropForeignKey,
                    TableName = rel.FromTable,
                    ConstraintName = $"fk_{rel.FromTable}_{rel.FromColumn}_{rel.ToTable}",
                    Reversible = true,
                    RiskLevel = MigrationRiskLevel.Low
                });
            }

            // Drop indexes that will be recreated
            foreach (var idx in changes.IndexChanges
                .Where(i => i.ChangeType == ChangeType.Removed || i.ChangeType == ChangeType.Modified))
            {
                stage1.Operations.Add(new MigrationOperationDto
                {
                    OperationType = MigrationOperationType.DropIndex,
                    TableName = idx.TableName,
                    IndexName = idx.IndexName ?? $"idx_{idx.TableName}_{string.Join("_", idx.Columns)}",
                    Reversible = true,
                    RiskLevel = MigrationRiskLevel.Low
                });
            }

            if (stage1.Operations.Any())
                plan.MigrationStages.Add(stage1);

            // Stage 2: Modify tables (add/drop/alter columns, drop tables)
            var stage2 = new MigrationStageDto
            {
                StageNumber = 2,
                StageName = "Modify Tables",
                Description = "Add, remove, or alter columns; drop obsolete tables",
                Operations = new List<MigrationOperationDto>()
            };

            // Drop tables first
            foreach (var tbl in changes.TableChanges
                .Where(t => t.ChangeType == ChangeType.Removed))
            {
                stage2.Operations.Add(new MigrationOperationDto
                {
                    OperationType = MigrationOperationType.DropTable,
                    TableName = tbl.TableName,
                    Reversible = false,
                    RiskLevel = MigrationRiskLevel.Critical
                });
            }

            // Add tables
            foreach (var tbl in changes.TableChanges
                .Where(t => t.ChangeType == ChangeType.Added))
            {
                stage2.Operations.Add(new MigrationOperationDto
                {
                    OperationType = MigrationOperationType.CreateTable,
                    TableName = tbl.TableName,
                    Reversible = true,
                    RiskLevel = MigrationRiskLevel.Low
                });
            }

            // Modify columns
            foreach (var col in changes.ColumnChanges)
            {
                var opType = col.ChangeType switch
                {
                    ChangeType.Added => MigrationOperationType.AddColumn,
                    ChangeType.Removed => MigrationOperationType.DropColumn,
                    ChangeType.Modified => MigrationOperationType.AlterColumn,
                    _ => MigrationOperationType.AlterColumn
                };

                stage2.Operations.Add(new MigrationOperationDto
                {
                    OperationType = opType,
                    TableName = col.TableName,
                    ColumnName = col.ColumnName,
                    DataType = col.DataType,
                    IsNullable = col.IsNullable,
                    Reversible = col.ChangeType != ChangeType.Removed,
                    RiskLevel = col.ChangeType == ChangeType.Removed ?
                        MigrationRiskLevel.High : MigrationRiskLevel.Medium
                });
            }

            if (stage2.Operations.Any())
                plan.MigrationStages.Add(stage2);

            // Stage 3: Create constraints and indexes
            var stage3 = new MigrationStageDto
            {
                StageNumber = 3,
                StageName = "Create Constraints & Indexes",
                Description = "Create foreign keys, constraints, and indexes",
                Operations = new List<MigrationOperationDto>()
            };

            // Create foreign keys
            foreach (var rel in changes.RelationshipChanges
                .Where(r => r.ChangeType == ChangeType.Added || r.ChangeType == ChangeType.Modified))
            {
                stage3.Operations.Add(new MigrationOperationDto
                {
                    OperationType = MigrationOperationType.CreateForeignKey,
                    TableName = rel.FromTable,
                    ColumnName = rel.FromColumn,
                    ReferencedTable = rel.ToTable,
                    ReferencedColumn = rel.ToColumn,
                    ConstraintName = $"fk_{rel.FromTable}_{rel.FromColumn}_{rel.ToTable}",
                    Reversible = true,
                    RiskLevel = MigrationRiskLevel.Low
                });
            }

            // Create indexes
            foreach (var idx in changes.IndexChanges
                .Where(i => i.ChangeType == ChangeType.Added || i.ChangeType == ChangeType.Modified))
            {
                stage3.Operations.Add(new MigrationOperationDto
                {
                    OperationType = MigrationOperationType.CreateIndex,
                    TableName = idx.TableName,
                    IndexName = idx.IndexName ?? $"idx_{idx.TableName}_{string.Join("_", idx.Columns)}",
                    Columns = idx.Columns,
                    IsUnique = idx.IsUnique,
                    Reversible = true,
                    RiskLevel = MigrationRiskLevel.Low
                });
            }

            if (stage3.Operations.Any())
                plan.MigrationStages.Add(stage3);
        }

        private void OrderChangesWithinStages(SqlMigrationPlanDto plan)
        {
            foreach (var stage in plan.MigrationStages)
            {
                // Sort operations by risk level (low → high)
                stage.Operations = stage.Operations
                    .OrderBy(o => o.RiskLevel)
                    .ToList();

                // For stage 2, drop operations should come before modify operations
                var dropOps = stage.Operations
                    .Where(o => o.OperationType == MigrationOperationType.DropTable ||
                               o.OperationType == MigrationOperationType.DropColumn)
                    .ToList();

                var otherOps = stage.Operations
                    .Where(o => !dropOps.Contains(o))
                    .ToList();

                stage.Operations = dropOps.Concat(otherOps).ToList();
            }
        }

        private void CalculateDependencies(SqlMigrationPlanDto plan)
        {
            for (int i = 0; i < plan.MigrationStages.Count - 1; i++)
            {
                plan.MigrationStages[i].DependsOnStage = null; // Stages are sequential
            }
        }

        private string GenerateSummary(SqlMigrationPlanDto plan)
        {
            var summary = new System.Text.StringBuilder();

            summary.AppendLine($"# SQL Migration Plan - {plan.DatabaseDialect.ToUpper()}");
            summary.AppendLine();
            summary.AppendLine($"**Complexity:** {plan.Complexity}");
            summary.AppendLine($"**Risk Level:** {plan.RiskLevel}");
            summary.AppendLine($"**Estimated Duration:** ~{(int)plan.EstimatedDuration.TotalMilliseconds}ms");
            summary.AppendLine();
            summary.AppendLine($"## Stages ({plan.MigrationStages.Count})");

            foreach (var stage in plan.MigrationStages)
            {
                summary.AppendLine($"### Stage {stage.StageNumber}: {stage.StageName}");
                summary.AppendLine($"- Operations: {stage.Operations.Count}");
                summary.AppendLine($"- Description: {stage.Description}");
            }

            if (plan.ValidationIssues.Any())
            {
                summary.AppendLine();
                summary.AppendLine($"## Validation Issues ({plan.ValidationIssues.Count})");
                foreach (var issue in plan.ValidationIssues.Where(i => i.Severity == IssueSeverity.Critical))
                {
                    summary.AppendLine($"- **CRITICAL:** {issue.Message}");
                }
            }

            if (plan.DataLossWarnings.Any())
            {
                summary.AppendLine();
                summary.AppendLine($"## Data Loss Warnings ({plan.DataLossWarnings.Count})");
                foreach (var warning in plan.DataLossWarnings.Where(w => w.Severity == DataLossSeverity.Critical))
                {
                    summary.AppendLine($"- {warning.Message}");
                }
            }

            return summary.ToString();
        }
    }

    // DTOs for SQL Migration Planning

    public enum MigrationComplexity
    {
        Simple = 0,
        Moderate = 1,
        Complex = 2,
        VeryComplex = 3
    }

    public enum MigrationRiskLevel
    {
        Low = 0,
        Medium = 1,
        High = 2,
        Critical = 3
    }

    public enum IssueSeverity
    {
        Info = 0,
        Warning = 1,
        Error = 2,
        Critical = 3
    }

    public enum IssueType
    {
        MissingDefault,
        TypeChange,
        DataLoss,
        CircularDependency,
        PerformanceImpact
    }

    public enum DataLossType
    {
        ColumnDropped,
        TableDropped,
        RequiredFieldAdded,
        ConstraintViolation
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
        DropConstraint
    }

    public class SqlMigrationPlanDto
    {
        public DateTime DetectedAt { get; set; }
        public string DatabaseDialect { get; set; }
        public MigrationComplexity Complexity { get; set; }
        public MigrationRiskLevel RiskLevel { get; set; }
        public TimeSpan EstimatedDuration { get; set; }
        public List<MigrationStageDto> MigrationStages { get; set; } = new();
        public List<ValidationIssueDto> ValidationIssues { get; set; } = new();
        public List<DataLossWarningDto> DataLossWarnings { get; set; } = new();
        public string Summary { get; set; }

        public int TotalOperations => MigrationStages.Sum(s => s.Operations.Count);
    }

    public class MigrationStageDto
    {
        public int StageNumber { get; set; }
        public string StageName { get; set; }
        public string Description { get; set; }
        public List<MigrationOperationDto> Operations { get; set; } = new();
        public int? DependsOnStage { get; set; }
    }

    public class MigrationOperationDto
    {
        public MigrationOperationType OperationType { get; set; }
        public string? TableName { get; set; }
        public string? ColumnName { get; set; }
        public string? ConstraintName { get; set; }
        public string? IndexName { get; set; }
        public string? DataType { get; set; }
        public bool? IsNullable { get; set; }
        public List<string>? Columns { get; set; }
        public bool? IsUnique { get; set; }
        public string? ReferencedTable { get; set; }
        public string? ReferencedColumn { get; set; }
        public bool Reversible { get; set; }
        public MigrationRiskLevel RiskLevel { get; set; }

        public override string ToString() =>
            $"{OperationType} on {TableName ?? "database"}";
    }

    public class ValidationIssueDto
    {
        public IssueSeverity Severity { get; set; }
        public IssueType Type { get; set; }
        public string Message { get; set; }
        public string? AffectedEntity { get; set; }
        public string? Recommendation { get; set; }
    }

    public class DataLossWarningDto
    {
        public DataLossType WarningType { get; set; }
        public DataLossSeverity Severity { get; set; }
        public string? TableName { get; set; }
        public string? ColumnName { get; set; }
        public string Message { get; set; }
    }
}
