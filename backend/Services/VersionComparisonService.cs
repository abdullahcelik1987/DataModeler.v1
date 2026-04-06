using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace DataModeler.Services
{
    /// <summary>
    /// Service for comparing DBML models and detecting structural differences
    /// Provides detailed change analysis and diff generation
    /// </summary>
    public interface IVersionComparisonService
    {
        Task<DetailedDiffDto> GenerateDetailedDiffAsync(
            string dbmlContent1,
            string dbmlContent2);

        Task<StructuralDiffDto> AnalyzeStructuralChangesAsync(
            string dbmlContent1,
            string dbmlContent2);

        Task<SimilarityScoreDto> CalculateSimilarityAsync(
            string dbmlContent1,
            string dbmlContent2);

        Task<DiffSummaryDto> GenerateDiffSummaryAsync(
            string dbmlContent1,
            string dbmlContent2);

        string GenerateUnifiedDiffFormat(
            string dbmlContent1,
            string dbmlContent2);

        string GenerateSideBySideDiffFormat(
            string dbmlContent1,
            string dbmlContent2);
    }

    public class VersionComparisonService : IVersionComparisonService
    {
        private readonly ILogger<VersionComparisonService> _logger;

        public VersionComparisonService(
            ILogger<VersionComparisonService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Generates detailed line-by-line diff
        /// </summary>
        public async Task<DetailedDiffDto> GenerateDetailedDiffAsync(
            string dbmlContent1,
            string dbmlContent2)
        {
            try
            {
                _logger.LogInformation("Generating detailed diff");

                var lines1 = dbmlContent1.Split('\n');
                var lines2 = dbmlContent2.Split('\n');

                var diff = new DetailedDiffDto
                {
                    OriginalContent = dbmlContent1,
                    ModifiedContent = dbmlContent2,
                    GeneratedAt = DateTime.UtcNow,
                    DiffLines = new List<DiffLineDto>(),
                };

                // Use simple diff algorithm (LCS - Longest Common Subsequence)
                var lcs = ComputeLCS(lines1, lines2);
                var i = 0;
                var j = 0;

                foreach (var line in lcs)
                {
                    // Skip lines until we find the LCS line in both
                    while (i < lines1.Length && lines1[i] != line)
                    {
                        diff.DiffLines.Add(new DiffLineDto
                        {
                            Type = "Removed",
                            LineNumber = i + 1,
                            Content = lines1[i],
                        });
                        i++;
                    }

                    while (j < lines2.Length && lines2[j] != line)
                    {
                        diff.DiffLines.Add(new DiffLineDto
                        {
                            Type = "Added",
                            LineNumber = j + 1,
                            Content = lines2[j],
                        });
                        j++;
                    }

                    if (i < lines1.Length && j < lines2.Length)
                    {
                        diff.DiffLines.Add(new DiffLineDto
                        {
                            Type = "Unchanged",
                            LineNumber = i + 1,
                            Content = line,
                        });
                        i++;
                        j++;
                    }
                }

                // Add remaining lines
                while (i < lines1.Length)
                {
                    diff.DiffLines.Add(new DiffLineDto
                    {
                        Type = "Removed",
                        LineNumber = i + 1,
                        Content = lines1[i],
                    });
                    i++;
                }

                while (j < lines2.Length)
                {
                    diff.DiffLines.Add(new DiffLineDto
                    {
                        Type = "Added",
                        LineNumber = j + 1,
                        Content = lines2[j],
                    });
                    j++;
                }

                diff.AddedLines = diff.DiffLines.Count(d => d.Type == "Added");
                diff.RemovedLines = diff.DiffLines.Count(d => d.Type == "Removed");
                diff.UnchangedLines = diff.DiffLines.Count(d => d.Type == "Unchanged");

                return await Task.FromResult(diff);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating detailed diff");
                throw;
            }
        }

        /// <summary>
        /// Analyzes structural changes (tables, columns, relationships)
        /// </summary>
        public async Task<StructuralDiffDto> AnalyzeStructuralChangesAsync(
            string dbmlContent1,
            string dbmlContent2)
        {
            try
            {
                _logger.LogInformation("Analyzing structural changes");

                var diff = new StructuralDiffDto
                {
                    AnalyzedAt = DateTime.UtcNow,
                    Changes = new List<StructuralChangeDto>(),
                };

                // Parse entities from both versions
                var tables1 = ExtractTables(dbmlContent1);
                var tables2 = ExtractTables(dbmlContent2);

                // Detect table changes
                foreach (var table in tables1)
                {
                    if (!tables2.ContainsKey(table.Key))
                    {
                        diff.Changes.Add(new StructuralChangeDto
                        {
                            ChangeType = "TableRemoved",
                            EntityName = table.Key,
                            Severity = "High",
                            Details = $"Table '{table.Key}' was removed",
                        });
                        diff.TablesRemoved++;
                    }
                    else
                    {
                        var columnDiff = CompareTables(table.Value, tables2[table.Key]);
                        foreach (var colChange in columnDiff)
                        {
                            diff.Changes.Add(colChange);
                        }
                    }
                }

                // Detect new tables
                foreach (var table in tables2)
                {
                    if (!tables1.ContainsKey(table.Key))
                    {
                        diff.Changes.Add(new StructuralChangeDto
                        {
                            ChangeType = "TableAdded",
                            EntityName = table.Key,
                            Severity = "Low",
                            Details = $"Table '{table.Key}' was added",
                        });
                        diff.TablesAdded++;
                    }
                }

                // Parse relationships
                var relationships1 = ExtractRelationships(dbmlContent1);
                var relationships2 = ExtractRelationships(dbmlContent2);

                // Detect relationship changes
                foreach (var rel in relationships1)
                {
                    if (!relationships2.Any(r =>
                        r.FromTable == rel.FromTable &&
                        r.ToTable == rel.ToTable &&
                        r.FromColumn == rel.FromColumn &&
                        r.ToColumn == rel.ToColumn))
                    {
                        diff.Changes.Add(new StructuralChangeDto
                        {
                            ChangeType = "RelationshipRemoved",
                            EntityName = $"{rel.FromTable}.{rel.FromColumn} → {rel.ToTable}.{rel.ToColumn}",
                            Severity = "Medium",
                            Details = $"Relationship removed",
                        });
                        diff.RelationshipsRemoved++;
                    }
                }

                // Detect new relationships
                foreach (var rel in relationships2)
                {
                    if (!relationships1.Any(r =>
                        r.FromTable == rel.FromTable &&
                        r.ToTable == rel.ToTable &&
                        r.FromColumn == rel.FromColumn &&
                        r.ToColumn == rel.ToColumn))
                    {
                        diff.Changes.Add(new StructuralChangeDto
                        {
                            ChangeType = "RelationshipAdded",
                            EntityName = $"{rel.FromTable}.{rel.FromColumn} → {rel.ToTable}.{rel.ToColumn}",
                            Severity = "Low",
                            Details = $"Relationship added",
                        });
                        diff.RelationshipsAdded++;
                    }
                }

                diff.TotalChanges = diff.Changes.Count;
                diff.SeverityScore = CalculateSeverityScore(diff.Changes);

                return await Task.FromResult(diff);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing structural changes");
                throw;
            }
        }

        /// <summary>
        /// Calculates similarity between two DBML models
        /// </summary>
        public async Task<SimilarityScoreDto> CalculateSimilarityAsync(
            string dbmlContent1,
            string dbmlContent2)
        {
            try
            {
                _logger.LogInformation("Calculating similarity score");

                var similarity = new SimilarityScoreDto
                {
                    CalculatedAt = DateTime.UtcNow,
                };

                // Levenshtein distance for overall similarity
                var levenshtein = ComputeLevenshteinDistance(dbmlContent1, dbmlContent2);
                var maxLength = Math.Max(dbmlContent1.Length, dbmlContent2.Length);
                similarity.ContentSimilarity = (1.0m - (levenshtein / (decimal)maxLength)) * 100;

                // Structural similarity
                var tables1 = ExtractTables(dbmlContent1);
                var tables2 = ExtractTables(dbmlContent2);
                var commonTables = tables1.Keys.Intersect(tables2.Keys).Count();
                similarity.StructuralSimilarity =
                    (commonTables / (decimal)Math.Max(tables1.Count, tables2.Count)) * 100;

                // Relationship similarity
                var rels1 = ExtractRelationships(dbmlContent1);
                var rels2 = ExtractRelationships(dbmlContent2);
                var commonRels = rels1.Intersect(rels2).Count();
                similarity.RelationshipSimilarity =
                    (commonRels / (decimal)Math.Max(rels1.Count, rels2.Count + 1)) * 100;

                // Overall similarity
                similarity.OverallSimilarity =
                    (similarity.ContentSimilarity +
                     similarity.StructuralSimilarity +
                     similarity.RelationshipSimilarity) / 3;

                similarity.IsSimilar = similarity.OverallSimilarity > 80;

                return await Task.FromResult(similarity);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating similarity");
                throw;
            }
        }

        /// <summary>
        /// Generates a high-level diff summary
        /// </summary>
        public async Task<DiffSummaryDto> GenerateDiffSummaryAsync(
            string dbmlContent1,
            string dbmlContent2)
        {
            try
            {
                var summary = new DiffSummaryDto
                {
                    GeneratedAt = DateTime.UtcNow,
                };

                // Get structural diff
                var structuralDiff = await AnalyzeStructuralChangesAsync(dbmlContent1, dbmlContent2);
                summary.StructuralChanges = structuralDiff;

                // Get detailed diff
                var detailedDiff = await GenerateDetailedDiffAsync(dbmlContent1, dbmlContent2);
                summary.DetailedDiff = detailedDiff;

                // Get similarity
                var similarity = await CalculateSimilarityAsync(dbmlContent1, dbmlContent2);
                summary.Similarity = similarity;

                // Generate summary text
                summary.SummaryText = GenerateSummaryText(
                    structuralDiff,
                    detailedDiff,
                    similarity);

                return summary;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating diff summary");
                throw;
            }
        }

        /// <summary>
        /// Generates diff in unified diff format (like git diff)
        /// </summary>
        public string GenerateUnifiedDiffFormat(
            string dbmlContent1,
            string dbmlContent2)
        {
            var lines1 = dbmlContent1.Split('\n');
            var lines2 = dbmlContent2.Split('\n');

            var output = new System.Text.StringBuilder();
            output.AppendLine("--- Original");
            output.AppendLine("+++ Modified");

            var i = 0;
            var j = 0;
            var contextLines = 3;

            while (i < lines1.Length || j < lines2.Length)
            {
                if (i < lines1.Length && j < lines2.Length && lines1[i] == lines2[j])
                {
                    output.AppendLine(" " + lines1[i]);
                    i++;
                    j++;
                }
                else if (i < lines1.Length && (j >= lines2.Length || !lines2.Skip(j).Take(contextLines).Contains(lines1[i])))
                {
                    output.AppendLine("-" + lines1[i]);
                    i++;
                }
                else if (j < lines2.Length)
                {
                    output.AppendLine("+" + lines2[j]);
                    j++;
                }
            }

            return output.ToString();
        }

        /// <summary>
        /// Generates diff in side-by-side format
        /// </summary>
        public string GenerateSideBySideDiffFormat(
            string dbmlContent1,
            string dbmlContent2)
        {
            var lines1 = dbmlContent1.Split('\n');
            var lines2 = dbmlContent2.Split('\n');

            var output = new System.Text.StringBuilder();
            output.AppendLine("|   | Original                           |   | Modified                           |");
            output.AppendLine("|---|---------------------------------------|---|---------------------------------------|");

            var maxLines = Math.Max(lines1.Length, lines2.Length);

            for (var i = 0; i < maxLines; i++)
            {
                var line1 = i < lines1.Length ? lines1[i] : "";
                var line2 = i < lines2.Length ? lines2[i] : "";

                var marker1 = line1 == line2 ? " " : (i < lines1.Length ? "-" : " ");
                var marker2 = line1 == line2 ? " " : (i < lines2.Length ? "+" : " ");

                var displayLine1 = line1.Length > 35 ? line1[..35] : line1.PadRight(35);
                var displayLine2 = line2.Length > 35 ? line2[..35] : line2.PadRight(35);

                output.AppendLine($"| {marker1} | {displayLine1} | {marker2} | {displayLine2} |");
            }

            return output.ToString();
        }

        // =====================================================================
        // Private Helper Methods
        // =====================================================================

        private List<string> ComputeLCS(string[] arr1, string[] arr2)
        {
            var m = arr1.Length;
            var n = arr2.Length;
            var dp = new int[m + 1, n + 1];

            for (var i = 1; i <= m; i++)
            {
                for (var j = 1; j <= n; j++)
                {
                    if (arr1[i - 1] == arr2[j - 1])
                        dp[i, j] = dp[i - 1, j - 1] + 1;
                    else
                        dp[i, j] = Math.Max(dp[i - 1, j], dp[i, j - 1]);
                }
            }

            var lcs = new List<string>();
            var x = m;
            var y = n;

            while (x > 0 && y > 0)
            {
                if (arr1[x - 1] == arr2[y - 1])
                {
                    lcs.Insert(0, arr1[x - 1]);
                    x--;
                    y--;
                }
                else if (dp[x - 1, y] > dp[x, y - 1])
                    x--;
                else
                    y--;
            }

            return lcs;
        }

        private int ComputeLevenshteinDistance(string s1, string s2)
        {
            var len1 = s1.Length;
            var len2 = s2.Length;
            var dp = new int[len1 + 1, len2 + 1];

            for (var i = 0; i <= len1; i++)
                dp[i, 0] = i;

            for (var j = 0; j <= len2; j++)
                dp[0, j] = j;

            for (var i = 1; i <= len1; i++)
            {
                for (var j = 1; j <= len2; j++)
                {
                    if (s1[i - 1] == s2[j - 1])
                        dp[i, j] = dp[i - 1, j - 1];
                    else
                        dp[i, j] = 1 + Math.Min(
                            Math.Min(dp[i - 1, j], dp[i, j - 1]),
                            dp[i - 1, j - 1]);
                }
            }

            return dp[len1, len2];
        }

        private Dictionary<string, string> ExtractTables(string content)
        {
            var tables = new Dictionary<string, string>();
            var regex = new Regex(@"Table\s+(\w+)\s*\{([^}]*)\}", RegexOptions.Multiline);

            foreach (Match match in regex.Matches(content))
            {
                tables[match.Groups[1].Value] = match.Groups[2].Value;
            }

            return tables;
        }

        private List<RelationshipInfo> ExtractRelationships(string content)
        {
            var rels = new List<RelationshipInfo>();
            var regex = new Regex(@"Ref:\s*(\w+)\.(\w+)\s*([<>-]+)\s*(\w+)\.(\w+)");

            foreach (Match match in regex.Matches(content))
            {
                rels.Add(new RelationshipInfo
                {
                    FromTable = match.Groups[1].Value,
                    FromColumn = match.Groups[2].Value,
                    ToTable = match.Groups[4].Value,
                    ToColumn = match.Groups[5].Value,
                });
            }

            return rels;
        }

        private List<StructuralChangeDto> CompareTables(string table1, string table2)
        {
            var changes = new List<StructuralChangeDto>();

            var columns1 = Regex.Matches(table1, @"(\w+)\s+(\w+)")
                .Cast<Match>()
                .ToDictionary(m => m.Groups[1].Value, m => m.Groups[2].Value);

            var columns2 = Regex.Matches(table2, @"(\w+)\s+(\w+)")
                .Cast<Match>()
                .ToDictionary(m => m.Groups[1].Value, m => m.Groups[2].Value);

            // Detect removed columns
            foreach (var col in columns1)
            {
                if (!columns2.ContainsKey(col.Key))
                {
                    changes.Add(new StructuralChangeDto
                    {
                        ChangeType = "ColumnRemoved",
                        EntityName = col.Key,
                        Severity = "Medium",
                        Details = $"Column '{col.Key}' of type '{col.Value}' was removed",
                    });
                }
            }

            // Detect new columns
            foreach (var col in columns2)
            {
                if (!columns1.ContainsKey(col.Key))
                {
                    changes.Add(new StructuralChangeDto
                    {
                        ChangeType = "ColumnAdded",
                        EntityName = col.Key,
                        Severity = "Low",
                        Details = $"Column '{col.Key}' of type '{col.Value}' was added",
                    });
                }
            }

            return changes;
        }

        private decimal CalculateSeverityScore(List<StructuralChangeDto> changes)
        {
            var score = changes.Sum(c => c.Severity switch
            {
                "Critical" => 4m,
                "High" => 3m,
                "Medium" => 2m,
                "Low" => 1m,
                _ => 0m
            });

            return Math.Min(score, 10m); // Cap at 10
        }

        private string GenerateSummaryText(
            StructuralDiffDto structuralDiff,
            DetailedDiffDto detailedDiff,
            SimilarityScoreDto similarity)
        {
            return $"Diff Summary:\n" +
                   $"- Tables: +{structuralDiff.TablesAdded} -{structuralDiff.TablesRemoved}\n" +
                   $"- Relationships: +{structuralDiff.RelationshipsAdded} -{structuralDiff.RelationshipsRemoved}\n" +
                   $"- Lines: +{detailedDiff.AddedLines} -{detailedDiff.RemovedLines}\n" +
                   $"- Similarity: {similarity.OverallSimilarity:F1}%\n" +
                   $"- Total Changes: {structuralDiff.TotalChanges}";
        }

        private class RelationshipInfo
        {
            public string FromTable { get; set; }
            public string FromColumn { get; set; }
            public string ToTable { get; set; }
            public string ToColumn { get; set; }
        }
    }

    // =========================================================================
    // DTOs
    // =========================================================================

    public class DetailedDiffDto
    {
        public string OriginalContent { get; set; }
        public string ModifiedContent { get; set; }
        public List<DiffLineDto> DiffLines { get; set; } = new();
        public int AddedLines { get; set; }
        public int RemovedLines { get; set; }
        public int UnchangedLines { get; set; }
        public DateTime GeneratedAt { get; set; }
    }

    public class DiffLineDto
    {
        public string Type { get; set; } // "Added", "Removed", "Unchanged"
        public int LineNumber { get; set; }
        public string Content { get; set; }
    }

    public class StructuralDiffDto
    {
        public List<StructuralChangeDto> Changes { get; set; } = new();
        public int TablesAdded { get; set; }
        public int TablesRemoved { get; set; }
        public int RelationshipsAdded { get; set; }
        public int RelationshipsRemoved { get; set; }
        public int TotalChanges { get; set; }
        public decimal SeverityScore { get; set; }
        public DateTime AnalyzedAt { get; set; }
    }

    public class StructuralChangeDto
    {
        public string ChangeType { get; set; }
        public string EntityName { get; set; }
        public string Severity { get; set; }
        public string Details { get; set; }
    }

    public class SimilarityScoreDto
    {
        public decimal ContentSimilarity { get; set; }
        public decimal StructuralSimilarity { get; set; }
        public decimal RelationshipSimilarity { get; set; }
        public decimal OverallSimilarity { get; set; }
        public bool IsSimilar { get; set; }
        public DateTime CalculatedAt { get; set; }
    }

    public class DiffSummaryDto
    {
        public StructuralDiffDto StructuralChanges { get; set; }
        public DetailedDiffDto DetailedDiff { get; set; }
        public SimilarityScoreDto Similarity { get; set; }
        public string SummaryText { get; set; }
        public DateTime GeneratedAt { get; set; }
    }
}
