using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using DataModeler.API.DTOs;

namespace DataModeler.Services
{
    /// <summary>
    /// Service for finding and analyzing relationship paths between tables
    /// Supports depth-first and breadth-first traversal
    /// Detects circular dependencies and calculates shortest paths
    /// </summary>
    public interface IRelationshipPathTraversalService
    {
        Task<RelationshipPathDto> FindPathAsync(
            string modelId,
            string sourceTable,
            string targetTable);

        Task<List<RelationshipPathDto>> FindAllPathsAsync(
            string modelId,
            string sourceTable,
            string targetTable,
            int maxDepth = 5);

        Task<List<TableConnectionChainDto>> GetConnectionChainsAsync(
            string modelId,
            string tableNames);

        Task<CircularDependencyDetectionResultDto> DetectCircularDependenciesAsync(
            string modelId);

        Task<RelationshipGraphMetricsDto> GetGraphMetricsAsync(string modelId);
    }

    public class RelationshipPathTraversalService : IRelationshipPathTraversalService
    {
        private readonly ILogger<RelationshipPathTraversalService> _logger;

        public RelationshipPathTraversalService(
            ILogger<RelationshipPathTraversalService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Finds the shortest path between two tables using BFS
        /// </summary>
        public async Task<RelationshipPathDto> FindPathAsync(
            string modelId,
            string sourceTable,
            string targetTable)
        {
            try
            {
                _logger.LogInformation($"Finding path from '{sourceTable}' to '{targetTable}'");

                if (sourceTable == targetTable)
                {
                    return new RelationshipPathDto
                    {
                        SourceTable = sourceTable,
                        TargetTable = targetTable,
                        PathFound = true,
                        Distance = 0,
                        Steps = new List<PathStepDto> { new() { TableName = sourceTable, Level = 0 } },
                        IsCircular = false
                    };
                }

                var allRelationships = await GetAllRelationshipsAsync(modelId);
                var adjacencyList = BuildAdjacencyList(allRelationships);

                var result = BreadthFirstSearch(
                    adjacencyList,
                    sourceTable,
                    targetTable,
                    allRelationships);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finding path");
                throw;
            }
        }

        /// <summary>
        /// Finds all paths between two tables (potentially multiple)
        /// </summary>
        public async Task<List<RelationshipPathDto>> FindAllPathsAsync(
            string modelId,
            string sourceTable,
            string targetTable,
            int maxDepth = 5)
        {
            try
            {
                _logger.LogInformation(
                    $"Finding all paths from '{sourceTable}' to '{targetTable}' (max depth: {maxDepth})");

                var allRelationships = await GetAllRelationshipsAsync(modelId);
                var paths = new List<RelationshipPathDto>();

                var visited = new HashSet<string>();
                var currentPath = new List<string> { sourceTable };

                DepthFirstSearchAllPaths(
                    sourceTable,
                    targetTable,
                    visited,
                    currentPath,
                    maxDepth,
                    allRelationships,
                    paths);

                return paths.OrderBy(p => p.Distance).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finding all paths");
                throw;
            }
        }

        /// <summary>
        /// Gets connection chains for multiple tables
        /// </summary>
        public async Task<List<TableConnectionChainDto>> GetConnectionChainsAsync(
            string modelId,
            string tableNames)
        {
            var chains = new List<TableConnectionChainDto>();

            try
            {
                var tables = tableNames.Split(',')
                    .Select(t => t.Trim())
                    .Where(t => !string.IsNullOrEmpty(t))
                    .ToList();

                var allRelationships = await GetAllRelationshipsAsync(modelId);

                foreach (var table in tables)
                {
                    var chain = new TableConnectionChainDto
                    {
                        TableName = table,
                        ConnectedTables = new List<TableConnectionDto>(),
                        ChainStrength = 0,
                        FoundAt = DateTime.UtcNow
                    };

                    // Find incoming and outgoing connections
                    var incomingRels = allRelationships
                        .Where(r => r.ToTable == table)
                        .ToList();

                    var outgoingRels = allRelationships
                        .Where(r => r.FromTable == table)
                        .ToList();

                    // Add incoming connections
                    foreach (var rel in incomingRels)
                    {
                        chain.ConnectedTables.Add(new TableConnectionDto
                        {
                            ConnectedTableName = rel.FromTable,
                            ConnectionType = "incoming",
                            Cardinality = rel.RelationType ?? "one_to_many",
                            FromColumn = rel.FromColumn,
                            ToColumn = rel.ToColumn
                        });
                        chain.ChainStrength++;
                    }

                    // Add outgoing connections
                    foreach (var rel in outgoingRels)
                    {
                        chain.ConnectedTables.Add(new TableConnectionDto
                        {
                            ConnectedTableName = rel.ToTable,
                            ConnectionType = "outgoing",
                            Cardinality = rel.RelationType ?? "one_to_many",
                            FromColumn = rel.FromColumn,
                            ToColumn = rel.ToColumn
                        });
                        chain.ChainStrength++;
                    }

                    chains.Add(chain);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting connection chains");
            }

            return chains;
        }

        /// <summary>
        /// Detects circular dependencies in the relationship graph
        /// </summary>
        public async Task<CircularDependencyDetectionResultDto> DetectCircularDependenciesAsync(
            string modelId)
        {
            try
            {
                _logger.LogInformation("Detecting circular dependencies");

                var allRelationships = await GetAllRelationshipsAsync(modelId);
                var result = new CircularDependencyDetectionResultDto
                {
                    HasCircularDependencies = false,
                    CircularPaths = new List<CircularPathDto>(),
                    AffectedTables = new HashSet<string>(),
                    AnalysisTime = DateTime.UtcNow
                };

                var visited = new HashSet<string>();
                var recursionStack = new HashSet<string>();
                var circularPaths = new List<List<string>>();

                var allTables = GetAllTables(allRelationships);

                foreach (var table in allTables)
                {
                    if (!visited.Contains(table))
                    {
                        var path = new List<string>();
                        DepthFirstSearchCircular(
                            table,
                            visited,
                            recursionStack,
                            allRelationships,
                            path,
                            circularPaths);
                    }
                }

                if (circularPaths.Count > 0)
                {
                    result.HasCircularDependencies = true;

                    foreach (var path in circularPaths)
                    {
                        var tableCycle = new List<string>(path);
                        tableCycle.Add(path[0]); // Close the cycle

                        var circularPath = new CircularPathDto
                        {
                            Tables = tableCycle,
                            CycleLength = path.Count,
                            Severity = CalculateCycleSeverity(path, allRelationships)
                        };

                        result.CircularPaths.Add(circularPath);

                        foreach (var table in path)
                        {
                            result.AffectedTables.Add(table);
                        }
                    }
                }

                result.TotalCyclicDependencies = result.CircularPaths.Count;

                _logger.LogInformation(
                    $"Circular dependency detection complete: {result.TotalCyclicDependencies} cycles found");

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error detecting circular dependencies");
                throw;
            }
        }

        /// <summary>
        /// Gets metrics about the entire relationship graph
        /// </summary>
        public async Task<RelationshipGraphMetricsDto> GetGraphMetricsAsync(string modelId)
        {
            try
            {
                var allRelationships = await GetAllRelationshipsAsync(modelId);
                var allTables = GetAllTables(allRelationships);
                var circularResult = await DetectCircularDependenciesAsync(modelId);

                var metrics = new RelationshipGraphMetricsDto
                {
                    TotalTables = allTables.Count,
                    TotalRelationships = allRelationships.Count,
                    AverageConnectionsPerTable = allTables.Count > 0
                        ? (decimal)allRelationships.Count / allTables.Count
                        : 0,
                    HasCircularDependencies = circularResult.HasCircularDependencies,
                    CircularDependencyCount = circularResult.CircularPaths.Count,
                    AffectedTablesByCircularDeps = circularResult.AffectedTables.Count,
                    AnalyzedAt = DateTime.UtcNow
                };

                // Calculate isolated tables
                var connectedTables = new HashSet<string>();
                foreach (var rel in allRelationships)
                {
                    connectedTables.Add(rel.FromTable);
                    connectedTables.Add(rel.ToTable);
                }

                metrics.IsolatedTablesCount = allTables.Count - connectedTables.Count;

                // Find hub tables (most connected)
                var connectionCount = new Dictionary<string, int>();
                foreach (var rel in allRelationships)
                {
                    if (!connectionCount.ContainsKey(rel.FromTable))
                        connectionCount[rel.FromTable] = 0;
                    if (!connectionCount.ContainsKey(rel.ToTable))
                        connectionCount[rel.ToTable] = 0;

                    connectionCount[rel.FromTable]++;
                    connectionCount[rel.ToTable]++;
                }

                if (connectionCount.Count > 0)
                {
                    metrics.MostConnectedTable = connectionCount
                        .OrderByDescending(x => x.Value)
                        .First()
                        .Key;
                    metrics.MaxConnectionsPerTable = connectionCount
                        .OrderByDescending(x => x.Value)
                        .First()
                        .Value;
                }

                metrics.GraphDensity = Math.Round(
                    2m * allRelationships.Count / (allTables.Count * (allTables.Count - 1)),
                    4);

                return metrics;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating graph metrics");
                throw;
            }
        }

        // Private helper methods

        private Dictionary<string, List<string>> BuildAdjacencyList(
            List<RelationshipDto> relationships)
        {
            var adjacency = new Dictionary<string, List<string>>();

            foreach (var rel in relationships)
            {
                if (!adjacency.ContainsKey(rel.FromTable))
                    adjacency[rel.FromTable] = new List<string>();
                if (!adjacency.ContainsKey(rel.ToTable))
                    adjacency[rel.ToTable] = new List<string>();

                adjacency[rel.FromTable].Add(rel.ToTable);
                adjacency[rel.ToTable].Add(rel.FromTable);
            }

            return adjacency;
        }

        private RelationshipPathDto BreadthFirstSearch(
            Dictionary<string, List<string>> adjacency,
            string source,
            string target,
            List<RelationshipDto> allRelationships)
        {
            var queue = new Queue<(string Table, List<string> Path)>();
            var visited = new HashSet<string> { source };

            queue.Enqueue((source, new List<string> { source }));

            while (queue.Count > 0)
            {
                var (currentTable, path) = queue.Dequeue();

                if (currentTable == target)
                {
                    var steps = path
                        .Select((t, i) => new PathStepDto { TableName = t, Level = i })
                        .ToList();

                    return new RelationshipPathDto
                    {
                        SourceTable = source,
                        TargetTable = target,
                        PathFound = true,
                        Distance = path.Count - 1,
                        Steps = steps,
                        IsCircular = false
                    };
                }

                if (adjacency.TryGetValue(currentTable, out var neighbors))
                {
                    foreach (var neighbor in neighbors)
                    {
                        if (!visited.Contains(neighbor))
                        {
                            visited.Add(neighbor);
                            var newPath = new List<string>(path) { neighbor };
                            queue.Enqueue((neighbor, newPath));
                        }
                    }
                }
            }

            return new RelationshipPathDto
            {
                SourceTable = source,
                TargetTable = target,
                PathFound = false,
                Distance = -1,
                Steps = new List<PathStepDto>(),
                IsCircular = false
            };
        }

        private void DepthFirstSearchAllPaths(
            string current,
            string target,
            HashSet<string> visited,
            List<string> currentPath,
            int maxDepth,
            List<RelationshipDto> allRelationships,
            List<RelationshipPathDto> paths)
        {
            if (currentPath.Count > maxDepth)
                return;

            if (current == target && currentPath.Count > 1)
            {
                var steps = currentPath
                    .Select((t, i) => new PathStepDto { TableName = t, Level = i })
                    .ToList();

                paths.Add(new RelationshipPathDto
                {
                    SourceTable = currentPath[0],
                    TargetTable = target,
                    PathFound = true,
                    Distance = currentPath.Count - 1,
                    Steps = steps,
                    IsCircular = false
                });
                return;
            }

            visited.Add(current);

            var connectedTables = GetConnectedTables(current, allRelationships);
            foreach (var next in connectedTables)
            {
                if (!visited.Contains(next) || next == target)
                {
                    currentPath.Add(next);
                    DepthFirstSearchAllPaths(
                        next,
                        target,
                        visited,
                        currentPath,
                        maxDepth,
                        allRelationships,
                        paths);
                    currentPath.RemoveAt(currentPath.Count - 1);
                }
            }

            visited.Remove(current);
        }

        private void DepthFirstSearchCircular(
            string current,
            HashSet<string> visited,
            HashSet<string> recursionStack,
            List<RelationshipDto> allRelationships,
            List<string> path,
            List<List<string>> circularPaths)
        {
            visited.Add(current);
            recursionStack.Add(current);
            path.Add(current);

            var connectedTables = GetConnectedTables(current, allRelationships);
            foreach (var neighbor in connectedTables)
            {
                if (!visited.Contains(neighbor))
                {
                    DepthFirstSearchCircular(
                        neighbor,
                        visited,
                        recursionStack,
                        allRelationships,
                        path,
                        circularPaths);
                }
                else if (recursionStack.Contains(neighbor))
                {
                    var cycleStart = path.IndexOf(neighbor);
                    if (cycleStart >= 0)
                    {
                        circularPaths.Add(new List<string>(path.Skip(cycleStart)));
                    }
                }
            }

            path.RemoveAt(path.Count - 1);
            recursionStack.Remove(current);
        }

        private List<string> GetConnectedTables(
            string table,
            List<RelationshipDto> relationships)
        {
            var connected = new HashSet<string>();

            foreach (var rel in relationships)
            {
                if (rel.FromTable == table)
                    connected.Add(rel.ToTable);
                else if (rel.ToTable == table)
                    connected.Add(rel.FromTable);
            }

            return connected.ToList();
        }

        private List<string> GetAllTables(List<RelationshipDto> relationships)
        {
            var tables = new HashSet<string>();
            foreach (var rel in relationships)
            {
                tables.Add(rel.FromTable);
                tables.Add(rel.ToTable);
            }

            return tables.ToList();
        }

        private string CalculateCycleSeverity(
            List<string> cycle,
            List<RelationshipDto> allRelationships)
        {
            var cycleTables = new HashSet<string>(cycle);
            var cycleRelationships = allRelationships
                .Where(r => cycleTables.Contains(r.FromTable) && cycleTables.Contains(r.ToTable))
                .Count();

            if (cycle.Count == 2 && cycleRelationships >= 2)
                return "Critical"; // Direct circular reference

            if (cycle.Count <= 3)
                return "High"; // Short cycle

            return cycle.Count <= 5 ? "Medium" : "Low"; // Longer cycles are lower severity
        }

        private async Task<List<RelationshipDto>> GetAllRelationshipsAsync(string modelId)
        {
            // Placeholder - implement based on your data access layer
            return await Task.FromResult(new List<RelationshipDto>());
        }
    }

    // DTOs for Path Traversal

    public class RelationshipPathDto
    {
        public string SourceTable { get; set; }
        public string TargetTable { get; set; }
        public bool PathFound { get; set; }
        public int Distance { get; set; }
        public List<PathStepDto> Steps { get; set; } = new();
        public bool IsCircular { get; set; }

        public string PathVisualization =>
            string.Join(" → ", Steps.Select(s => s.TableName));
    }

    public class PathStepDto
    {
        public string TableName { get; set; }
        public int Level { get; set; }
    }

    public class TableConnectionChainDto
    {
        public string TableName { get; set; }
        public List<TableConnectionDto> ConnectedTables { get; set; } = new();
        public int ChainStrength { get; set; }
        public DateTime FoundAt { get; set; }
    }

    public class TableConnectionDto
    {
        public string ConnectedTableName { get; set; }
        public string ConnectionType { get; set; } // incoming or outgoing
        public string Cardinality { get; set; }
        public string FromColumn { get; set; }
        public string ToColumn { get; set; }
    }

    public class CircularDependencyDetectionResultDto
    {
        public bool HasCircularDependencies { get; set; }
        public List<CircularPathDto> CircularPaths { get; set; } = new();
        public HashSet<string> AffectedTables { get; set; } = new();
        public int TotalCyclicDependencies { get; set; }
        public DateTime AnalysisTime { get; set; }
    }

    public class CircularPathDto
    {
        public List<string> Tables { get; set; } = new();
        public int CycleLength { get; set; }
        public string Severity { get; set; } // Low, Medium, High, Critical

        public string TablesInCycle => string.Join(" → ", Tables);
    }

    public class RelationshipGraphMetricsDto
    {
        public int TotalTables { get; set; }
        public int TotalRelationships { get; set; }
        public decimal AverageConnectionsPerTable { get; set; }
        public bool HasCircularDependencies { get; set; }
        public int CircularDependencyCount { get; set; }
        public int AffectedTablesByCircularDeps { get; set; }
        public int IsolatedTablesCount { get; set; }
        public string MostConnectedTable { get; set; }
        public int MaxConnectionsPerTable { get; set; }
        public decimal GraphDensity { get; set; }
        public DateTime AnalyzedAt { get; set; }
    }
}
