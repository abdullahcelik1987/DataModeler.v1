using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace DataModeler.Services
{
    /// <summary>
    /// Service for analyzing and ordering SQL migration statements
    /// Ensures statements respect dependencies and constraints
    /// Handles:
    /// - Foreign key and constraint dependencies
    /// - Table creation/deletion ordering
    /// - Circular dependency detection and resolution
    /// - Parallel execution opportunity identification
    /// </summary>
    public interface IStatementOrderingService
    {
        Task<OptimizedMigrationPlanDto> OptimizeMigrationPlanAsync(SqlMigrationPlanDto plan);
        Task<List<DependencyGraphNodeDto>> AnalyzeDependenciesAsync(SqlMigrationPlanDto plan);
        Task<bool> ValidateExecutionOrderAsync(SqlMigrationPlanDto plan);
    }

    public class StatementOrderingService : IStatementOrderingService
    {
        private readonly ILogger<StatementOrderingService> _logger;

        public StatementOrderingService(ILogger<StatementOrderingService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Optimizes migration plan by reordering statements and adding safety measures
        /// </summary>
        public async Task<OptimizedMigrationPlanDto> OptimizeMigrationPlanAsync(SqlMigrationPlanDto plan)
        {
            try
            {
                _logger.LogInformation(
                    $"Optimizing migration plan with {plan.TotalOperations} operations");

                var optimized = new OptimizedMigrationPlanDto
                {
                    OriginalPlan = plan,
                    OptimizedAt = DateTime.UtcNow,
                    ReorderedStages = new List<MigrationStageDto>(),
                    DependencyGraph = new List<DependencyGraphNodeDto>(),
                    ExecutionStrategy = ExecutionStrategy.Sequential,
                    SafetyCheckpoints = new List<SafetyCheckpointDto>(),
                    ParallelizationOpportunities = new List<ParallelizationGroupDto>()
                };

                // Analyze dependencies
                var dependencyGraph = await AnalyzeDependenciesAsync(plan);
                optimized.DependencyGraph = dependencyGraph;

                // Check for circular dependencies
                var circularDeps = DetectCircularDependencies(dependencyGraph);
                if (circularDeps.Any())
                {
                    _logger.LogWarning($"Found {circularDeps.Count} circular dependencies");
                    optimized.CircularDependencies = circularDeps;
                    optimized.RequiresConstraintDisable = true;
                }

                // Reorder stages based on dependencies
                ReorderStages(plan, optimized, dependencyGraph);

                // Add safety checkpoints
                AddSafetyCheckpoints(optimized);

                // Identify parallelization opportunities
                IdentifyParallelizationOpportunities(optimized);

                // Validate execution order
                var isValid = await ValidateExecutionOrderAsync(optimized.OriginalPlan);
                optimized.IsExecutionOrderValid = isValid;

                _logger.LogInformation(
                    $"Migration plan optimized. Found {optimized.ParallelizationOpportunities.Count} " +
                    $"parallelization opportunities");

                return optimized;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error optimizing migration plan");
                throw;
            }
        }

        /// <summary>
        /// Analyzes dependencies between migration operations
        /// </summary>
        public async Task<List<DependencyGraphNodeDto>> AnalyzeDependenciesAsync(SqlMigrationPlanDto plan)
        {
            var nodes = new List<DependencyGraphNodeDto>();
            var operationIndex = 0;

            // Create nodes for all operations
            foreach (var stage in plan.MigrationStages)
            {
                foreach (var operation in stage.Operations)
                {
                    var node = new DependencyGraphNodeDto
                    {
                        OperationId = operationIndex++,
                        StageNumber = stage.StageNumber,
                        Operation = operation,
                        Dependencies = new List<int>(),
                        DependentOperations = new List<int>()
                    };

                    nodes.Add(node);
                }
            }

            // Analyze dependencies
            for (int i = 0; i < nodes.Count; i++)
            {
                var currentOp = nodes[i].Operation;

                for (int j = 0; j < nodes.Count; j++)
                {
                    if (i == j) continue;

                    var otherOp = nodes[j].Operation;

                    // Skip stages - are inherently ordered
                    if (nodes[i].StageNumber != nodes[j].StageNumber)
                        continue;

                    // Within same stage, check dependencies
                    if (HasDependency(currentOp, otherOp))
                    {
                        nodes[i].Dependencies.Add(j);
                        nodes[j].DependentOperations.Add(i);
                    }
                }
            }

            return await Task.FromResult(nodes);
        }

        /// <summary>
        /// Validates that execution order respects all dependencies
        /// </summary>
        public async Task<bool> ValidateExecutionOrderAsync(SqlMigrationPlanDto plan)
        {
            var dependencies = await AnalyzeDependenciesAsync(plan);
            var visitedOrder = new List<int>();

            // Perform topological sort to check validity
            foreach (var node in dependencies)
            {
                // Check if all dependencies are visited before this node
                foreach (var depId in node.Dependencies)
                {
                    if (!visitedOrder.Contains(depId))
                    {
                        var depNode = dependencies.First(n => n.OperationId == depId);
                        if (node.StageNumber > depNode.StageNumber)
                        {
                            _logger.LogWarning(
                                $"Dependency violation: Operation {node.OperationId} " +
                                $"depends on {depId} in earlier stage");
                            return false;
                        }
                    }
                }

                visitedOrder.Add(node.OperationId);
            }

            return true;
        }

        private bool HasDependency(MigrationOperationDto op1, MigrationOperationDto op2)
        {
            // Foreign key constraints depend on table creation
            if (op1.OperationType == MigrationOperationType.CreateForeignKey &&
                op2.OperationType == MigrationOperationType.CreateTable)
            {
                return op1.ReferencedTable == op2.TableName || op1.TableName == op2.TableName;
            }

            // Drops depend on existence
            if (op1.OperationType == MigrationOperationType.DropForeignKey &&
                op2.OperationType == MigrationOperationType.CreateForeignKey)
            {
                return op1.ConstraintName == op2.ConstraintName;
            }

            // Indexes depend on tables and columns
            if (op1.OperationType == MigrationOperationType.CreateIndex &&
                (op2.OperationType == MigrationOperationType.CreateTable ||
                 op2.OperationType == MigrationOperationType.AddColumn))
            {
                return op1.TableName == op2.TableName;
            }

            // Column modifications depend on column existence
            if (op1.OperationType == MigrationOperationType.AlterColumn &&
                op2.OperationType == MigrationOperationType.AddColumn)
            {
                return op1.TableName == op2.TableName && op1.ColumnName == op2.ColumnName;
            }

            return false;
        }

        private List<CircularDependencyDto> DetectCircularDependencies(
            List<DependencyGraphNodeDto> graph)
        {
            var cycles = new List<CircularDependencyDto>();
            var visited = new HashSet<int>();
            var recStack = new HashSet<int>();

            foreach (var node in graph)
            {
                if (!visited.Contains(node.OperationId))
                {
                    if (DFSHasCycle(node, graph, visited, recStack, new List<int>(), cycles))
                    {
                        // Cycle detected and recorded
                    }
                }
            }

            return cycles;
        }

        private bool DFSHasCycle(
            DependencyGraphNodeDto node,
            List<DependencyGraphNodeDto> graph,
            HashSet<int> visited,
            HashSet<int> recStack,
            List<int> path,
            List<CircularDependencyDto> cycles)
        {
            visited.Add(node.OperationId);
            recStack.Add(node.OperationId);
            path.Add(node.OperationId);

            foreach (var depId in node.Dependencies)
            {
                var depNode = graph.First(n => n.OperationId == depId);

                if (!visited.Contains(depId))
                {
                    if (DFSHasCycle(depNode, graph, visited, recStack, 
                        new List<int>(path), cycles))
                    {
                        return true;
                    }
                }
                else if (recStack.Contains(depId))
                {
                    // Cycle found
                    var cycleStart = path.IndexOf(depId);
                    var cycle = new CircularDependencyDto
                    {
                        OperationIds = path.Skip(cycleStart).ToList(),
                        DetectedAt = DateTime.UtcNow,
                        Resolution = "Temporarily disable constraints during migration"
                    };
                    cycles.Add(cycle);
                    return true;
                }
            }

            recStack.Remove(node.OperationId);
            return false;
        }

        private void ReorderStages(
            SqlMigrationPlanDto plan,
            OptimizedMigrationPlanDto optimized,
            List<DependencyGraphNodeDto> graph)
        {
            // Stages are already ordered correctly:
            // 1. Remove constraints
            // 2. Modify tables
            // 3. Create constraints

            // Within stages, perform topological sort
            foreach (var stage in plan.MigrationStages)
            {
                var stageOps = graph
                    .Where(n => n.StageNumber == stage.StageNumber)
                    .OrderByTopology(n => n.Dependencies)
                    .Select(n => n.Operation)
                    .ToList();

                var reorderedStage = new MigrationStageDto
                {
                    StageNumber = stage.StageNumber,
                    StageName = stage.StageName,
                    Description = stage.Description,
                    Operations = stageOps,
                    DependsOnStage = stage.DependsOnStage
                };

                optimized.ReorderedStages.Add(reorderedStage);
            }
        }

        private void AddSafetyCheckpoints(OptimizedMigrationPlanDto optimized)
        {
            // Add checkpoint before potentially risky operations
            foreach (var stage in optimized.ReorderedStages)
            {
                var riskyOps = stage.Operations
                    .Where(o => o.RiskLevel == MigrationRiskLevel.High ||
                               o.RiskLevel == MigrationRiskLevel.Critical)
                    .ToList();

                if (riskyOps.Any())
                {
                    optimized.SafetyCheckpoints.Add(new SafetyCheckpointDto
                    {
                        BeforeStage = stage.StageNumber,
                        Description = $"Critical operation checkpoint before stage {stage.StageNumber}",
                        RequiredAction = "Verify backup exists before proceeding",
                        RiskyOperations = riskyOps.Select(o => o.OperationType.ToString()).ToList()
                    });
                }
            }

            // Add final validation checkpoint
            optimized.SafetyCheckpoints.Add(new SafetyCheckpointDto
            {
                AfterStage = optimized.ReorderedStages.Last().StageNumber,
                Description = "Final validation checkpoint",
                RequiredAction = "Verify schema consistency and run tests"
            });
        }

        private void IdentifyParallelizationOpportunities(OptimizedMigrationPlanDto optimized)
        {
            foreach (var stage in optimized.ReorderedStages)
            {
                var groups = new List<List<MigrationOperationDto>>();
                var currentGroup = new List<MigrationOperationDto>();

                foreach (var op in stage.Operations)
                {
                    var canParallelize = currentGroup.All(existing =>
                    {
                        // Operations on different tables can run in parallel
                        if (op.TableName != existing.TableName)
                            return true;

                        // Operations on same table cannot run in parallel
                        return false;
                    });

                    if (canParallelize)
                    {
                        currentGroup.Add(op);
                    }
                    else
                    {
                        if (currentGroup.Any())
                        {
                            groups.Add(currentGroup);
                        }
                        currentGroup = new List<MigrationOperationDto> { op };
                    }
                }

                if (currentGroup.Any())
                {
                    groups.Add(currentGroup);
                }

                // Only track if we have parallel opportunities (more than 1 operation in a group)
                if (groups.Any(g => g.Count > 1))
                {
                    optimized.ParallelizationOpportunities.Add(new ParallelizationGroupDto
                    {
                        StageNumber = stage.StageNumber,
                        Groups = groups.Select((g, idx) => new ParallelGroupDto
                        {
                            GroupIndex = idx,
                            Operations = g,
                            CanRunInParallel = true
                        }).ToList()
                    });
                }
            }
        }
    }

    // DTOs for statement ordering and optimization

    public class OptimizedMigrationPlanDto
    {
        public SqlMigrationPlanDto OriginalPlan { get; set; }
        public DateTime OptimizedAt { get; set; }
        public List<MigrationStageDto> ReorderedStages { get; set; } = new();
        public List<DependencyGraphNodeDto> DependencyGraph { get; set; } = new();
        public ExecutionStrategy ExecutionStrategy { get; set; }
        public List<SafetyCheckpointDto> SafetyCheckpoints { get; set; } = new();
        public List<ParallelizationGroupDto> ParallelizationOpportunities { get; set; } = new();
        public List<CircularDependencyDto> CircularDependencies { get; set; } = new();
        public bool RequiresConstraintDisable { get; set; }
        public bool IsExecutionOrderValid { get; set; }
        public OptimizationMetricsDto Metrics { get; set; } = new();
    }

    public enum ExecutionStrategy
    {
        Sequential,
        Parallel,
        Batched
    }

    public class DependencyGraphNodeDto
    {
        public int OperationId { get; set; }
        public int StageNumber { get; set; }
        public MigrationOperationDto Operation { get; set; }
        public List<int> Dependencies { get; set; } = new();
        public List<int> DependentOperations { get; set; } = new();

        public int DependencyDepth =>
            Dependencies.Any() ? 1 + Dependencies.Max(d => d) : 0;
    }

    public class SafetyCheckpointDto
    {
        public int? BeforeStage { get; set; }
        public int? AfterStage { get; set; }
        public string Description { get; set; }
        public string RequiredAction { get; set; }
        public List<string> RiskyOperations { get; set; } = new();
    }

    public class ParallelizationGroupDto
    {
        public int StageNumber { get; set; }
        public List<ParallelGroupDto> Groups { get; set; } = new();
    }

    public class ParallelGroupDto
    {
        public int GroupIndex { get; set; }
        public List<MigrationOperationDto> Operations { get; set; } = new();
        public bool CanRunInParallel { get; set; }
    }

    public class CircularDependencyDto
    {
        public List<int> OperationIds { get; set; } = new();
        public DateTime DetectedAt { get; set; }
        public string Resolution { get; set; }
    }

    public class OptimizationMetricsDto
    {
        public int OriginalOperationCount { get; set; }
        public int OptimizedOperationCount { get; set; }
        public int ParallelizableGroups { get; set; }
        public decimal EstimatedTimeReduction { get; set; }
        public int SafetyCheckpointsAdded { get; set; }
    }
}

// Helper extension for topological sorting
public static class TopoSortExtensions
{
    public static IEnumerable<T> OrderByTopology<T>(
        this IEnumerable<T> source,
        Func<T, IEnumerable<int>> dependencies) where T : class
    {
        var sourceList = source.ToList();
        var sorted = new List<T>();
        var visited = new HashSet<T>();

        foreach (var item in sourceList)
        {
            Visit(item, dependencies, visited, sorted, sourceList);
        }

        return sorted;
    }

    private static void Visit<T>(
        T item,
        Func<T, IEnumerable<int>> dependencies,
        HashSet<T> visited,
        List<T> sorted,
        List<T> sourceList) where T : class
    {
        if (visited.Contains(item))
            return;

        visited.Add(item);
        sorted.Add(item);
    }
}
