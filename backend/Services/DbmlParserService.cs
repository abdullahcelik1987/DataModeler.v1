using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using DataModeler.API.DTOs;

namespace DataModeler.API.Services;

/// <summary>
/// Service for parsing DBML format and converting to/from ERD data structures
/// </summary>
public class DbmlParserService : IDbmlParserService
{
    private readonly ILogger<DbmlParserService> _logger;

    public DbmlParserService(ILogger<DbmlParserService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Parse DBML content into structured ERD data
    /// </summary>
    public ErdDataDto ParseDbmlToErd(string dbmlContent)
    {
        var erdData = new ErdDataDto();
        var errors = new List<string>();

        try
        {
            if (string.IsNullOrWhiteSpace(dbmlContent))
                return erdData;

            // Remove comments
            var cleanedContent = RemoveComments(dbmlContent);

            // Extract tables
            var tablePattern = @"Table\s+([^\s\{]+)\s*(\{[^}]+\})";
            var tableMatches = Regex.Matches(cleanedContent, tablePattern, RegexOptions.IgnoreCase);

            foreach (Match tableMatch in tableMatches)
            {
                try
                {
                    var tableName = NormalizeTableToken(tableMatch.Groups[1].Value.Trim());
                    var tableContent = tableMatch.Groups[2].Value.Trim();

                    var tableNode = ParseTable(tableName, tableContent);
                    erdData.Nodes.Add(tableNode);
                }
                catch (Exception ex)
                {
                    errors.Add($"Error parsing table: {ex.Message}");
                }
            }

            // Extract relationships
            var relationshipPattern = @"Ref:\s*(?<left>[^\s]+)\s*(?<rel><>|<|>|-)\s*(?<right>[^\s]+)";
            var relationshipMatches = Regex.Matches(cleanedContent, relationshipPattern, RegexOptions.IgnoreCase);

            foreach (Match refMatch in relationshipMatches)
            {
                try
                {
                    if (!TryParseReferenceEndpoint(refMatch.Groups["left"].Value.Trim(), out var fromTable, out var fromColumn))
                        continue;

                    if (!TryParseReferenceEndpoint(refMatch.Groups["right"].Value.Trim(), out var toTable, out var toColumn))
                        continue;

                    var relationType = refMatch.Groups["rel"].Value;

                    var relationship = new DbmlRelationshipDto
                    {
                        FromTable = fromTable,
                        FromColumn = fromColumn,
                        ToTable = toTable,
                        ToColumn = toColumn,
                        RelationType = relationType == "<" ? "many_to_one" : "one_to_many"
                    };

                    erdData.Relationships.Add(relationship);
                }
                catch (Exception ex)
                {
                    errors.Add($"Error parsing relationship: {ex.Message}");
                }
            }

            erdData.ValidationErrors = errors;
            _logger.LogInformation($"Parsed DBML: {erdData.Nodes.Count} tables, {erdData.Relationships.Count} relationships");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error parsing DBML: {ex.Message}");
            erdData.ValidationErrors.Add($"Parse error: {ex.Message}");
        }

        return erdData;
    }

    /// <summary>
    /// Generate DBML content from nodes and relationships
    /// </summary>
    public string GenerateDbmlFromNodes(List<DbmlTableNodeDto> nodes, List<DbmlRelationshipDto> relationships)
    {
        var dbml = new System.Text.StringBuilder();

        dbml.AppendLine("Project \"Data Model\" {");
        dbml.AppendLine("  // Database dialect can be: PostgreSQL, MySQL, SqlServer, Oracle");
        dbml.AppendLine("  database_type: 'PostgreSQL'");
        dbml.AppendLine("}");
        dbml.AppendLine();

        // Generate table definitions
        foreach (var node in nodes)
        {
            dbml.AppendLine($"Table {node.TableName} {{");

            if (!string.IsNullOrEmpty(node.Note))
            {
                dbml.AppendLine($"  Note: '{node.Note.Replace("'", "\\'")}'");
            }

            foreach (var column in node.Columns)
            {
                var columnDef = new System.Text.StringBuilder();
                columnDef.Append($"  {column.ColumnName} {column.ColumnType}");

                var settings = new List<string>();
                if (column.IsPrimaryKey) settings.Add("pk");
                if (column.IsUnique) settings.Add("unique");
                if (column.IsNotNull) settings.Add("not null");
                if (column.IsAutoIncrement) settings.Add("increment");
                if (!string.IsNullOrEmpty(column.DefaultValue)) settings.Add($"default: {column.DefaultValue}");
                if (!string.IsNullOrEmpty(column.Note)) settings.Add($"note: '{column.Note.Replace("'", "\\'")}'");

                if (settings.Count > 0)
                    columnDef.Append($" [{string.Join(", ", settings)}]");

                dbml.AppendLine(columnDef.ToString());
            }

            dbml.AppendLine("}");
            dbml.AppendLine();
        }

        // Generate relationships
        foreach (var rel in relationships)
        {
            var relSymbol = rel.RelationType switch
            {
                "one_to_one" => "-",
                "many_to_many" => "<>",
                _ => ">"
            };
            dbml.AppendLine($"Ref: {rel.FromTable}.{rel.FromColumn} {relSymbol} {rel.ToTable}.{rel.ToColumn}");
        }

        return dbml.ToString();
    }

    /// <summary>
    /// Parse a single table definition from DBML
    /// </summary>
    private DbmlTableNodeDto ParseTable(string tableName, string tableContent)
    {
        var node = new DbmlTableNodeDto { TableName = tableName };

        // Extract table note
        var notePattern = "Note:\\s*['\"](?<note>[^'\"]*)['\"]";
        var noteMatch = Regex.Match(tableContent, notePattern);
        if (noteMatch.Success)
            node.Note = noteMatch.Groups["note"].Value;

        var lines = tableContent
            .Replace("{", string.Empty)
            .Replace("}", string.Empty)
            .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(line => line.Trim())
            .Where(line => !string.IsNullOrWhiteSpace(line));

        foreach (var rawLine in lines)
        {
            if (rawLine.StartsWith("Ref:", StringComparison.OrdinalIgnoreCase))
                continue;

            var line = rawLine;
            var commentIndex = line.IndexOf("//", StringComparison.Ordinal);
            if (commentIndex >= 0)
            {
                line = line.Substring(0, commentIndex).Trim();
            }

            if (string.IsNullOrWhiteSpace(line))
                continue;

            var nameSeparatorIndex = line.IndexOf(' ');
            if (nameSeparatorIndex <= 0)
                continue;

            var columnName = line.Substring(0, nameSeparatorIndex).Trim();
            if (columnName.Equals("Note", StringComparison.OrdinalIgnoreCase))
                continue;

            var remainder = line.Substring(nameSeparatorIndex + 1).Trim();
            if (string.IsNullOrWhiteSpace(remainder))
                continue;

            var settingsIndex = remainder.IndexOf(" [", StringComparison.Ordinal);
            var columnType = settingsIndex >= 0 ? remainder.Substring(0, settingsIndex).Trim() : remainder;
            var settingsText = settingsIndex >= 0 ? remainder.Substring(settingsIndex + 2).Trim() : string.Empty;

            if (settingsText.EndsWith("]", StringComparison.Ordinal))
            {
                settingsText = settingsText.Substring(0, settingsText.Length - 1).Trim();
            }

            var normalizedSettings = settingsText.ToLowerInvariant();
            var noteFromSettings = ExtractSettingValue(settingsText, "note");
            var defaultFromSettings = ExtractSettingValue(settingsText, "default");

            var column = new DbmlColumnDto
            {
                ColumnName = columnName,
                ColumnType = columnType,
                Note = string.IsNullOrEmpty(noteFromSettings) ? null : noteFromSettings,
                DefaultValue = string.IsNullOrEmpty(defaultFromSettings) ? null : defaultFromSettings,
                IsPrimaryKey = normalizedSettings.Contains("pk"),
                IsUnique = normalizedSettings.Contains("unique"),
                IsNotNull = normalizedSettings.Contains("not null"),
                IsAutoIncrement = normalizedSettings.Contains("increment")
            };

            node.Columns.Add(column);
        }

        return node;
    }

    /// <summary>
    /// Remove comments from DBML content
    /// </summary>
    private string RemoveComments(string content)
    {
        // Remove line comments (//)
        content = Regex.Replace(content, @"//.*?$", "", RegexOptions.Multiline);

        // Remove block comments (/* */)
        content = Regex.Replace(content, @"/\*[\s\S]*?\*/", "", RegexOptions.Multiline);

        return content;
    }

    private static string? ExtractSettingValue(string settingsText, string key)
    {
        if (string.IsNullOrWhiteSpace(settingsText))
            return null;

        var quotedPattern = $"{key}\\s*:\\s*'(?<value>[^']*)'|{key}\\s*:\\s*\"(?<double>[^\"]*)\"";
        var quotedMatch = Regex.Match(settingsText, quotedPattern, RegexOptions.IgnoreCase);
        if (quotedMatch.Success)
        {
            return quotedMatch.Groups["value"].Success
                ? quotedMatch.Groups["value"].Value
                : quotedMatch.Groups["double"].Value;
        }

        var plainPattern = $"{key}\\s*:\\s*(?<value>[^,\\]]+)";
        var plainMatch = Regex.Match(settingsText, plainPattern, RegexOptions.IgnoreCase);
        return plainMatch.Success ? plainMatch.Groups["value"].Value.Trim() : null;
    }

    private static bool TryParseReferenceEndpoint(string endpoint, out string tableName, out string columnName)
    {
        tableName = string.Empty;
        columnName = string.Empty;

        var endpointPattern = "^(?<table>(?:\"[^\"]+\"|\\[[^\\]]+\\]|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)(?:\\s*\\.\\s*(?:\"[^\"]+\"|\\[[^\\]]+\\]|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*))*)\\s*\\.\\s*(?<column>\"[^\"]+\"|\\[[^\\]]+\\]|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)$";
        var match = Regex.Match(endpoint, endpointPattern, RegexOptions.IgnoreCase);
        if (!match.Success)
        {
            return false;
        }

        tableName = NormalizeTableToken(match.Groups["table"].Value);
        columnName = NormalizeIdentifierToken(match.Groups["column"].Value);
        return !string.IsNullOrWhiteSpace(tableName) && !string.IsNullOrWhiteSpace(columnName);
    }

    private static string NormalizeTableToken(string tableToken)
    {
        if (string.IsNullOrWhiteSpace(tableToken))
            return string.Empty;

        var segments = tableToken
            .Split('.', StringSplitOptions.RemoveEmptyEntries)
            .Select(segment => NormalizeIdentifierToken(segment))
            .Where(segment => !string.IsNullOrWhiteSpace(segment))
            .ToList();

        if (segments.Count == 0)
            return string.Empty;

        return segments[^1];
    }

    private static string NormalizeIdentifierToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return string.Empty;

        var normalized = token.Trim();
        normalized = normalized.Trim('"', '`');

        if (normalized.StartsWith("[", StringComparison.Ordinal) && normalized.EndsWith("]", StringComparison.Ordinal) && normalized.Length > 1)
        {
            normalized = normalized.Substring(1, normalized.Length - 2);
        }

        return normalized.Trim();
    }

    /// <summary>
    /// Validate DBML syntax
    /// </summary>
    public List<string> ValidateDbml(string dbmlContent)
    {
        var errors = new List<string>();

        try
        {
            // Check for matching braces
            var openBraces = dbmlContent.Count(c => c == '{');
            var closeBraces = dbmlContent.Count(c => c == '}');

            if (openBraces != closeBraces)
                errors.Add($"Mismatched braces: {openBraces} open, {closeBraces} close");

            // Try to parse and collect any errors
            var erdData = ParseDbmlToErd(dbmlContent);
            errors.AddRange(erdData.ValidationErrors);

            // Check for duplicate table names
            var tableNames = new HashSet<string>();
            foreach (var node in erdData.Nodes)
            {
                if (tableNames.Contains(node.TableName))
                    errors.Add($"Duplicate table name: {node.TableName}");
                else
                    tableNames.Add(node.TableName);
            }

            // Check for invalid references
            foreach (var rel in erdData.Relationships)
            {
                if (!tableNames.Contains(rel.FromTable))
                    errors.Add($"Unknown table in relationship: {rel.FromTable}");
                if (!tableNames.Contains(rel.ToTable))
                    errors.Add($"Unknown table in relationship: {rel.ToTable}");
            }
        }
        catch (Exception ex)
        {
            errors.Add($"Validation error: {ex.Message}");
        }

        return errors;
    }
}
