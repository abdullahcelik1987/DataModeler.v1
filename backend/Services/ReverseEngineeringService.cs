using System.Data.Common;
using System.Text;
using System.Text.RegularExpressions;
using DataModeler.API.DTOs;
using Microsoft.Data.SqlClient;
using MySqlConnector;
using Npgsql;
using Oracle.ManagedDataAccess.Client;

namespace DataModeler.API.Services;

public class ReverseEngineeringService : IReverseEngineeringService
{
    private static readonly Regex SimpleIdentifierRegex = new("^[A-Za-z_][A-Za-z0-9_]*$", RegexOptions.Compiled);

    public async Task<List<ReverseEngineTableDto>> GetTablesAsync(ReverseEngineGetTablesRequestDto request, CancellationToken cancellationToken = default)
    {
        ValidateConnectionRequest(request);

        await using var connection = await OpenConnectionAsync(request, cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = BuildTableListSql(request.DatabaseType, request.Schema);
        AddTableListParameters(command, request);

        var result = new List<ReverseEngineTableDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var schema = reader.GetString(0);
            var tableName = reader.GetString(1);
            result.Add(new ReverseEngineTableDto
            {
                Schema = schema,
                Name = tableName,
                Identifier = string.IsNullOrWhiteSpace(schema) ? tableName : $"{schema}.{tableName}"
            });
        }

        return result;
    }

    public async Task<ReverseEngineGenerateDbmlResponseDto> GenerateDbmlAsync(ReverseEngineGenerateDbmlRequestDto request, CancellationToken cancellationToken = default)
    {
        ValidateConnectionRequest(request);
        if (request.SelectedTables == null || request.SelectedTables.Count == 0)
        {
            throw new InvalidOperationException("At least one table must be selected.");
        }

        await using var connection = await OpenConnectionAsync(request, cancellationToken);

        var selected = request.SelectedTables
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(ParseTableIdentifier)
            .DistinctBy(x => $"{x.Schema}.{x.Table}")
            .ToList();

        var selectedKeys = selected
            .Select(table => BuildQualifiedKey(table.Schema, table.Table))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var tableNameMap = BuildDbmlTableNameMap(selected);

        var sb = new StringBuilder();
        foreach (var table in selected)
        {
            var columns = await GetColumnsAsync(connection, request.DatabaseType, table.Schema, table.Table, cancellationToken);
            if (columns.Count == 0)
            {
                continue;
            }

            var tableKey = BuildQualifiedKey(table.Schema, table.Table);
            var dbmlTableName = tableNameMap[tableKey];

            sb.AppendLine($"Table {dbmlTableName} {{");
            foreach (var column in columns)
            {
                var attrs = new List<string>();
                if (column.IsPrimaryKey) attrs.Add("pk");
                if (!column.IsNullable) attrs.Add("not null");
                if (column.IsAutoIncrement) attrs.Add("increment");

                var attrsSegment = attrs.Count > 0 ? $" [{string.Join(", ", attrs)}]" : string.Empty;
                sb.AppendLine($"  {FormatIdentifier(column.Name)} {MapType(column)}{attrsSegment}");
            }
            sb.AppendLine("}");
            sb.AppendLine();
        }

        var relationLines = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var table in selected)
        {
            var foreignKeys = await GetForeignKeysAsync(connection, request.DatabaseType, table.Schema, table.Table, cancellationToken);
            foreach (var foreignKey in foreignKeys)
            {
                var sourceKey = BuildQualifiedKey(foreignKey.SourceSchema, foreignKey.SourceTable);
                var targetKey = BuildQualifiedKey(foreignKey.TargetSchema, foreignKey.TargetTable);

                if (!selectedKeys.Contains(sourceKey) || !selectedKeys.Contains(targetKey))
                {
                    continue;
                }

                if (!SimpleIdentifierRegex.IsMatch(foreignKey.SourceColumn) || !SimpleIdentifierRegex.IsMatch(foreignKey.TargetColumn))
                {
                    continue;
                }

                var sourceTableName = tableNameMap[sourceKey];
                var targetTableName = tableNameMap[targetKey];
                relationLines.Add($"Ref: {sourceTableName}.{foreignKey.SourceColumn} > {targetTableName}.{foreignKey.TargetColumn}");
            }
        }

        if (relationLines.Count > 0)
        {
            foreach (var relationLine in relationLines.OrderBy(line => line, StringComparer.OrdinalIgnoreCase))
            {
                sb.AppendLine(relationLine);
            }
        }

        return new ReverseEngineGenerateDbmlResponseDto
        {
            DbmlContent = sb.ToString().Trim(),
            ImportedTableCount = selected.Count
        };
    }

    private static DbConnection CreateConnection(ReverseEngineConnectionRequestDto request, string? hostOverride = null)
    {
        var dbType = NormalizeDbType(request.DatabaseType);
        var inputHost = string.IsNullOrWhiteSpace(hostOverride) ? request.Host : hostOverride;
        var (host, resolvedPort) = NormalizeHostAndPort(inputHost, request.Port, dbType);

        return dbType switch
        {
            "postgresql" => new NpgsqlConnection(new NpgsqlConnectionStringBuilder
            {
                Host = host,
                Port = resolvedPort > 0 ? resolvedPort : 5432,
                Database = request.DatabaseName,
                Username = request.Username,
                Password = request.Password,
                SslMode = ResolvePostgreSqlSslMode(host),
                Timeout = 15
            }.ConnectionString),
            "mysql" => new MySqlConnection(new MySqlConnectionStringBuilder
            {
                Server = host,
                Port = (uint)(resolvedPort > 0 ? resolvedPort : 3306),
                Database = request.DatabaseName,
                UserID = request.Username,
                Password = request.Password,
                SslMode = MySqlSslMode.None,
                ConnectionTimeout = 15,
                AllowPublicKeyRetrieval = true
            }.ConnectionString),
            "sqlserver" => new SqlConnection(new SqlConnectionStringBuilder
            {
                DataSource = host.Contains('\\')
                    ? host
                    : $"{host},{(resolvedPort > 0 ? resolvedPort : 1433)}",
                InitialCatalog = request.DatabaseName,
                UserID = request.Username,
                Password = request.Password,
                Encrypt = false,
                TrustServerCertificate = true,
                ConnectTimeout = 15,
                IntegratedSecurity = false
            }.ConnectionString),
            "oracle" => new OracleConnection(BuildOracleConnectionString(request.Username, request.Password, host, resolvedPort, request.DatabaseName)),
            _ => throw new InvalidOperationException("Unsupported database type")
        };
    }

    private static string BuildOracleConnectionString(string username, string password, string host, int port, string serviceName)
    {
        var dataSource = $"(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST={host})(PORT={(port > 0 ? port : 1521)}))(CONNECT_DATA=(SERVICE_NAME={serviceName})))";
        var builder = new OracleConnectionStringBuilder
        {
            UserID = username,
            Password = password,
            DataSource = dataSource,
        };

        if (string.Equals(username?.Trim(), "sys", StringComparison.OrdinalIgnoreCase))
        {
            builder.DBAPrivilege = "SYSDBA";
        }

        return builder.ConnectionString;
    }

    private static async Task<DbConnection> OpenConnectionAsync(ReverseEngineConnectionRequestDto request, CancellationToken cancellationToken)
    {
        var dbType = NormalizeDbType(request.DatabaseType);
        var (normalizedHost, normalizedPort) = NormalizeHostAndPort(request.Host, request.Port, dbType);
        var candidates = GetHostCandidates(normalizedHost).ToList();
        Exception? lastError = null;

        var normalizedRequest = new ReverseEngineConnectionRequestDto
        {
            DatabaseType = request.DatabaseType,
            Host = normalizedHost,
            Port = normalizedPort,
            DatabaseName = request.DatabaseName,
            Username = request.Username,
            Password = request.Password,
            Schema = request.Schema,
        };

        foreach (var host in candidates)
        {
            var connection = CreateConnection(normalizedRequest, host);
            try
            {
                await connection.OpenAsync(cancellationToken);
                return connection;
            }
            catch (Exception ex)
            {
                lastError = ex;
                await connection.DisposeAsync();
            }
        }

        throw BuildConnectionException(normalizedRequest, candidates, lastError);
    }

    private static IEnumerable<string> GetHostCandidates(string host)
    {
        yield return host;

        if (IsLocalHost(host) && IsRunningInContainer())
        {
            yield return "host.docker.internal";
        }
    }

    private static bool IsLocalHost(string host)
    {
        var normalized = ExtractHostOnly(host).Trim().ToLowerInvariant();
        return normalized is "localhost" or "127.0.0.1" or "::1";
    }

    private static (string Host, int Port) NormalizeHostAndPort(string host, int port, string dbType)
    {
        var normalizedHost = (host ?? string.Empty).Trim();
        var normalizedPort = port;

        if (string.IsNullOrWhiteSpace(normalizedHost))
        {
            return (normalizedHost, normalizedPort);
        }

        // Common UI input for SQL Server: "host,1433"
        if (dbType == "sqlserver" && normalizedHost.Contains(','))
        {
            var parts = normalizedHost.Split(',', 2, StringSplitOptions.TrimEntries);
            if (parts.Length == 2 && int.TryParse(parts[1], out var parsedPort))
            {
                normalizedHost = parts[0];
                if (normalizedPort <= 0)
                {
                    normalizedPort = parsedPort;
                }
            }
        }

        // Also support host:port for non-SQLServer inputs
        if (normalizedHost.Contains(':') && !normalizedHost.Contains("\\") && !normalizedHost.StartsWith("[", StringComparison.Ordinal))
        {
            var splitIndex = normalizedHost.LastIndexOf(':');
            if (splitIndex > 0 && splitIndex < normalizedHost.Length - 1)
            {
                var hostPart = normalizedHost[..splitIndex].Trim();
                var portPart = normalizedHost[(splitIndex + 1)..].Trim();
                if (int.TryParse(portPart, out var parsedPort))
                {
                    normalizedHost = hostPart;
                    if (normalizedPort <= 0)
                    {
                        normalizedPort = parsedPort;
                    }
                }
            }
        }

        return (normalizedHost, normalizedPort);
    }

    private static string ExtractHostOnly(string host)
    {
        var dbType = "sqlserver";
        var (normalizedHost, _) = NormalizeHostAndPort(host, 0, dbType);
        return normalizedHost;
    }

    private static SslMode ResolvePostgreSqlSslMode(string host)
    {
        // Cloud PostgreSQL endpoints (e.g. Supabase pooler) require TLS/SNI.
        return IsLocalHost(host) || string.Equals(host, "postgres", StringComparison.OrdinalIgnoreCase)
            ? SslMode.Disable
            : SslMode.Require;
    }

    private static bool IsRunningInContainer()
    {
        return string.Equals(
            Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"),
            "true",
            StringComparison.OrdinalIgnoreCase);
    }

    private static InvalidOperationException BuildConnectionException(
        ReverseEngineConnectionRequestDto request,
        IReadOnlyCollection<string> hostsTried,
        Exception? lastError)
    {
        var baseMessage = $"Failed to connect to {request.DatabaseType} at host '{request.Host}' and port {request.Port}.";
        if (IsLocalHost(request.Host) && IsRunningInContainer())
        {
            baseMessage += " Backend runs in Docker, so localhost points to the container itself. Use host.docker.internal or a Docker service name (for example postgres).";
        }

        if (hostsTried.Count > 1)
        {
            baseMessage += $" Hosts tried: {string.Join(", ", hostsTried)}.";
        }

        if (lastError != null && !string.IsNullOrWhiteSpace(lastError.Message))
        {
            baseMessage += $" Details: {lastError.Message}";
        }

        return new InvalidOperationException(baseMessage);
    }

    private static void ValidateConnectionRequest(ReverseEngineConnectionRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.DatabaseType)) throw new InvalidOperationException("Database type is required.");
        if (string.IsNullOrWhiteSpace(request.Host)) throw new InvalidOperationException("Host is required.");
        if (string.IsNullOrWhiteSpace(request.DatabaseName)) throw new InvalidOperationException("Database name is required.");
        if (string.IsNullOrWhiteSpace(request.Username)) throw new InvalidOperationException("Username is required.");
    }

    private static string NormalizeDbType(string dbType)
    {
        var normalized = (dbType ?? string.Empty).Trim().ToLowerInvariant();
        if (normalized is "postgres" or "postgresql") return "postgresql";
        if (normalized is "mysql") return "mysql";
        if (normalized is "sqlserver" or "sql server" or "mssql") return "sqlserver";
        if (normalized is "oracle") return "oracle";
        return normalized;
    }

    private static string BuildTableListSql(string dbType, string? schema)
    {
        return NormalizeDbType(dbType) switch
        {
            "postgresql" => string.IsNullOrWhiteSpace(schema)
                ? "SELECT table_schema, table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name"
                : "SELECT table_schema, table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema = @schema ORDER BY table_name",
            "mysql" => string.IsNullOrWhiteSpace(schema)
                ? "SELECT table_schema, table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema = @databaseName ORDER BY table_name"
                : "SELECT table_schema, table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema = @schema ORDER BY table_name",
            "sqlserver" => string.IsNullOrWhiteSpace(schema)
                ? "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' AND TABLE_CATALOG=@databaseName ORDER BY TABLE_SCHEMA, TABLE_NAME"
                : "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' AND TABLE_CATALOG=@databaseName AND TABLE_SCHEMA=@schema ORDER BY TABLE_NAME",
            "oracle" => "SELECT OWNER, TABLE_NAME FROM ALL_TABLES WHERE OWNER = :owner ORDER BY TABLE_NAME",
            _ => throw new InvalidOperationException("Unsupported database type")
        };
    }

    private static void AddTableListParameters(DbCommand command, ReverseEngineConnectionRequestDto request)
    {
        var dbType = NormalizeDbType(request.DatabaseType);
        if (dbType == "oracle")
        {
            AddParameter(command, ":owner", string.IsNullOrWhiteSpace(request.Schema) ? request.Username.ToUpperInvariant() : request.Schema!.ToUpperInvariant());
            return;
        }

        if (dbType == "mysql" || dbType == "sqlserver")
        {
            AddParameter(command, "@databaseName", request.DatabaseName);
        }

        if (!string.IsNullOrWhiteSpace(request.Schema) && dbType != "oracle")
        {
            AddParameter(command, "@schema", request.Schema);
        }
    }

    private async Task<List<ColumnInfo>> GetColumnsAsync(DbConnection connection, string dbType, string? schema, string tableName, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = BuildColumnSql(dbType);
        AddColumnParameters(command, dbType, schema, tableName);

        var result = new List<ColumnInfo>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            result.Add(new ColumnInfo
            {
                Name = reader.GetString(0),
                DataType = reader.IsDBNull(1) ? "text" : reader.GetString(1),
                IsNullable = !reader.IsDBNull(2) && (reader.GetString(2).Equals("YES", StringComparison.OrdinalIgnoreCase) || reader.GetString(2).Equals("Y", StringComparison.OrdinalIgnoreCase)),
                IsPrimaryKey = !reader.IsDBNull(3) && ReadIntFlag(reader, 3) == 1,
                IsAutoIncrement = !reader.IsDBNull(4) && ReadIntFlag(reader, 4) == 1,
                CharacterMaxLength = ReadNullableInt(reader, 5),
                NumericPrecision = ReadNullableInt(reader, 6),
                NumericScale = ReadNullableInt(reader, 7),
            });
        }

        return result;
    }

    private static string BuildColumnSql(string dbType)
    {
        return NormalizeDbType(dbType) switch
        {
            "postgresql" => @"SELECT c.column_name,
                                c.data_type,
                                c.is_nullable,
                                CASE WHEN tc.constraint_type='PRIMARY KEY' THEN 1 ELSE 0 END AS is_primary_key,
                                CASE WHEN c.column_default LIKE 'nextval(%' THEN 1 ELSE 0 END AS is_auto_increment,
                                c.character_maximum_length,
                                c.numeric_precision,
                                c.numeric_scale
                              FROM information_schema.columns c
                              LEFT JOIN information_schema.key_column_usage kcu
                                ON c.table_schema = kcu.table_schema AND c.table_name = kcu.table_name AND c.column_name = kcu.column_name
                              LEFT JOIN information_schema.table_constraints tc
                                ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema AND tc.table_name = c.table_name AND tc.constraint_type='PRIMARY KEY'
                              WHERE c.table_schema = @schema AND c.table_name = @tableName
                              ORDER BY c.ordinal_position",
            "mysql" => @"SELECT c.column_name,
                                c.data_type,
                                c.is_nullable,
                                CASE WHEN c.column_key='PRI' THEN 1 ELSE 0 END AS is_primary_key,
                                CASE WHEN c.extra LIKE '%auto_increment%' THEN 1 ELSE 0 END AS is_auto_increment,
                                c.character_maximum_length,
                                c.numeric_precision,
                                c.numeric_scale
                              FROM information_schema.columns c
                              WHERE c.table_schema = @schema AND c.table_name = @tableName
                              ORDER BY c.ordinal_position",
            "sqlserver" => @"SELECT c.COLUMN_NAME,
                                   c.DATA_TYPE,
                                   c.IS_NULLABLE,
                                   CASE WHEN EXISTS (
                                     SELECT 1
                                     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                                     JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                                       ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
                                     WHERE tc.TABLE_CATALOG = c.TABLE_CATALOG
                                       AND tc.TABLE_SCHEMA = c.TABLE_SCHEMA
                                       AND tc.TABLE_NAME = c.TABLE_NAME
                                       AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
                                       AND kcu.COLUMN_NAME = c.COLUMN_NAME
                                   ) THEN 1 ELSE 0 END AS is_primary_key,
                                   CASE WHEN COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') = 1 THEN 1 ELSE 0 END AS is_auto_increment,
                                   c.CHARACTER_MAXIMUM_LENGTH,
                                   c.NUMERIC_PRECISION,
                                   c.NUMERIC_SCALE
                               FROM INFORMATION_SCHEMA.COLUMNS c
                               WHERE c.TABLE_CATALOG = @databaseName AND c.TABLE_SCHEMA = @schema AND c.TABLE_NAME = @tableName
                               ORDER BY c.ORDINAL_POSITION",
            "oracle" => @"SELECT c.COLUMN_NAME,
                                LOWER(c.DATA_TYPE) AS DATA_TYPE,
                                c.NULLABLE,
                                CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS is_primary_key,
                                CASE WHEN c.IDENTITY_COLUMN = 'YES' THEN 1 ELSE 0 END AS is_auto_increment,
                                c.DATA_LENGTH,
                                c.DATA_PRECISION,
                                c.DATA_SCALE
                             FROM ALL_TAB_COLUMNS c
                             LEFT JOIN (
                               SELECT acc.OWNER, acc.TABLE_NAME, acc.COLUMN_NAME
                               FROM ALL_CONSTRAINTS ac
                               JOIN ALL_CONS_COLUMNS acc ON ac.OWNER = acc.OWNER AND ac.CONSTRAINT_NAME = acc.CONSTRAINT_NAME
                               WHERE ac.CONSTRAINT_TYPE = 'P'
                             ) pk ON pk.OWNER = c.OWNER AND pk.TABLE_NAME = c.TABLE_NAME AND pk.COLUMN_NAME = c.COLUMN_NAME
                             WHERE c.OWNER = :schema AND c.TABLE_NAME = :tableName
                             ORDER BY c.COLUMN_ID",
            _ => throw new InvalidOperationException("Unsupported database type")
        };
    }

    private static void AddColumnParameters(DbCommand command, string dbType, string? schema, string tableName)
    {
        var normalized = NormalizeDbType(dbType);
        if (normalized == "oracle")
        {
            AddParameter(command, ":schema", (schema ?? string.Empty).ToUpperInvariant());
            AddParameter(command, ":tableName", tableName.ToUpperInvariant());
            return;
        }

        var resolvedSchema = ResolveSchema(normalized, schema);
        AddParameter(command, "@schema", resolvedSchema);
        AddParameter(command, "@tableName", tableName);

        if (normalized == "sqlserver")
        {
            var builder = command.Connection?.ConnectionString ?? string.Empty;
            var catalog = new SqlConnectionStringBuilder(builder).InitialCatalog;
            AddParameter(command, "@databaseName", catalog);
        }
    }

    private static string ResolveSchema(string dbType, string? schema)
    {
        if (!string.IsNullOrWhiteSpace(schema))
        {
            return schema;
        }

        return dbType switch
        {
            "postgresql" => "public",
            "sqlserver" => "dbo",
            _ => string.Empty
        };
    }

    private static void AddParameter(DbCommand command, string name, object? value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value ?? DBNull.Value;
        command.Parameters.Add(parameter);
    }

    private static int ReadIntFlag(DbDataReader reader, int ordinal)
    {
        var value = reader.GetValue(ordinal);
        if (value is null || value is DBNull)
        {
            return 0;
        }

        return value switch
        {
            int i => i,
            short s => s,
            long l => unchecked((int)l),
            byte b => b,
            bool flag => flag ? 1 : 0,
            string text when int.TryParse(text, out var parsed) => parsed,
            _ => Convert.ToInt32(value)
        };
    }

    private static int? ReadNullableInt(DbDataReader reader, int ordinal)
    {
        if (reader.IsDBNull(ordinal))
        {
            return null;
        }

        var value = reader.GetValue(ordinal);
        if (value is null || value is DBNull)
        {
            return null;
        }

        return value switch
        {
            int i => i,
            short s => s,
            long l => unchecked((int)l),
            byte b => b,
            bool flag => flag ? 1 : 0,
            string text when int.TryParse(text, out var parsed) => parsed,
            _ => Convert.ToInt32(value)
        };
    }

        private async Task<List<ForeignKeyInfo>> GetForeignKeysAsync(DbConnection connection, string dbType, string? schema, string tableName, CancellationToken cancellationToken)
        {
                await using var command = connection.CreateCommand();
                command.CommandText = BuildForeignKeySql(dbType);
                AddForeignKeyParameters(command, dbType, schema, tableName);

                var result = new List<ForeignKeyInfo>();
                await using var reader = await command.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                {
                        result.Add(new ForeignKeyInfo
                        {
                                SourceSchema = reader.IsDBNull(0) ? string.Empty : reader.GetString(0),
                                SourceTable = reader.GetString(1),
                                SourceColumn = reader.GetString(2),
                                TargetSchema = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                                TargetTable = reader.GetString(4),
                                TargetColumn = reader.GetString(5),
                        });
                }

                return result;
        }

        private static string BuildForeignKeySql(string dbType)
        {
                return NormalizeDbType(dbType) switch
                {
                        "postgresql" => @"SELECT
                                                                    kcu.table_schema AS source_schema,
                                                                    kcu.table_name AS source_table,
                                                                    kcu.column_name AS source_column,
                                                                    ccu.table_schema AS target_schema,
                                                                    ccu.table_name AS target_table,
                                                                    ccu.column_name AS target_column
                                                                FROM information_schema.table_constraints tc
                                                                JOIN information_schema.key_column_usage kcu
                                                                    ON tc.constraint_name = kcu.constraint_name
                                                                 AND tc.table_schema = kcu.table_schema
                                                                JOIN information_schema.constraint_column_usage ccu
                                                                    ON ccu.constraint_name = tc.constraint_name
                                                                 AND ccu.constraint_schema = tc.table_schema
                                                                WHERE tc.constraint_type = 'FOREIGN KEY'
                                                                    AND kcu.table_schema = @schema
                                                                    AND kcu.table_name = @tableName
                                                                ORDER BY kcu.ordinal_position",
                        "mysql" => @"SELECT
                                                        kcu.TABLE_SCHEMA AS source_schema,
                                                        kcu.TABLE_NAME AS source_table,
                                                        kcu.COLUMN_NAME AS source_column,
                                                        kcu.REFERENCED_TABLE_SCHEMA AS target_schema,
                                                        kcu.REFERENCED_TABLE_NAME AS target_table,
                                                        kcu.REFERENCED_COLUMN_NAME AS target_column
                                                    FROM information_schema.KEY_COLUMN_USAGE kcu
                                                    WHERE kcu.TABLE_SCHEMA = @schema
                                                        AND kcu.TABLE_NAME = @tableName
                                                        AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
                                                    ORDER BY kcu.ORDINAL_POSITION",
                        "sqlserver" => @"SELECT
                                                                fk.TABLE_SCHEMA AS source_schema,
                                                                fk.TABLE_NAME AS source_table,
                                                                fk.COLUMN_NAME AS source_column,
                                                                pk.TABLE_SCHEMA AS target_schema,
                                                                pk.TABLE_NAME AS target_table,
                                                                pk.COLUMN_NAME AS target_column
                                                            FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
                                                            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE fk
                                                                ON rc.CONSTRAINT_NAME = fk.CONSTRAINT_NAME
                                                            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pk
                                                                ON rc.UNIQUE_CONSTRAINT_NAME = pk.CONSTRAINT_NAME
                                                             AND fk.ORDINAL_POSITION = pk.ORDINAL_POSITION
                                                            WHERE fk.TABLE_SCHEMA = @schema
                                                                AND fk.TABLE_NAME = @tableName
                                                            ORDER BY fk.ORDINAL_POSITION",
                        "oracle" => @"SELECT
                                                         acc.OWNER AS source_schema,
                                                         acc.TABLE_NAME AS source_table,
                                                         acc.COLUMN_NAME AS source_column,
                                                         rcc.OWNER AS target_schema,
                                                         rcc.TABLE_NAME AS target_table,
                                                         rcc.COLUMN_NAME AS target_column
                                                     FROM ALL_CONSTRAINTS ac
                                                     JOIN ALL_CONS_COLUMNS acc
                                                         ON ac.OWNER = acc.OWNER
                                                        AND ac.CONSTRAINT_NAME = acc.CONSTRAINT_NAME
                                                     JOIN ALL_CONSTRAINTS rc
                                                         ON ac.R_OWNER = rc.OWNER
                                                        AND ac.R_CONSTRAINT_NAME = rc.CONSTRAINT_NAME
                                                     JOIN ALL_CONS_COLUMNS rcc
                                                         ON rc.OWNER = rcc.OWNER
                                                        AND rc.CONSTRAINT_NAME = rcc.CONSTRAINT_NAME
                                                        AND acc.POSITION = rcc.POSITION
                                                     WHERE ac.CONSTRAINT_TYPE = 'R'
                                                         AND acc.OWNER = :schema
                                                         AND acc.TABLE_NAME = :tableName
                                                     ORDER BY acc.POSITION",
                        _ => throw new InvalidOperationException("Unsupported database type")
                };
        }

        private static void AddForeignKeyParameters(DbCommand command, string dbType, string? schema, string tableName)
        {
                var normalized = NormalizeDbType(dbType);
                if (normalized == "oracle")
                {
                        AddParameter(command, ":schema", (schema ?? string.Empty).ToUpperInvariant());
                        AddParameter(command, ":tableName", tableName.ToUpperInvariant());
                        return;
                }

                var resolvedSchema = ResolveSchema(normalized, schema);
                AddParameter(command, "@schema", resolvedSchema);
                AddParameter(command, "@tableName", tableName);
        }

        private static string BuildQualifiedKey(string? schema, string table)
        {
                return $"{(schema ?? string.Empty).Trim().ToLowerInvariant()}.{table.Trim().ToLowerInvariant()}";
        }

        private static Dictionary<string, string> BuildDbmlTableNameMap(List<(string? Schema, string Table)> selected)
        {
                var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                var usedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                foreach (var table in selected)
                {
                        var key = BuildQualifiedKey(table.Schema, table.Table);
                        var baseName = ToDbmlIdentifier(table.Table);
                        var candidate = baseName;

                        if (usedNames.Contains(candidate))
                        {
                                var schemaPrefix = string.IsNullOrWhiteSpace(table.Schema) ? "tbl" : ToDbmlIdentifier(table.Schema);
                                candidate = ToDbmlIdentifier($"{schemaPrefix}_{table.Table}");
                        }

                        var suffix = 2;
                        while (usedNames.Contains(candidate))
                        {
                                candidate = $"{baseName}_{suffix++}";
                        }

                        usedNames.Add(candidate);
                        map[key] = candidate;
                }

                return map;
        }

        private static string ToDbmlIdentifier(string raw)
        {
                var sanitized = Regex.Replace(raw ?? string.Empty, "[^A-Za-z0-9_]", "_");
                if (string.IsNullOrWhiteSpace(sanitized))
                {
                        sanitized = "table";
                }

                if (!char.IsLetter(sanitized[0]) && sanitized[0] != '_')
                {
                        sanitized = $"t_{sanitized}";
                }

                return sanitized;
        }

    private static (string? Schema, string Table) ParseTableIdentifier(string identifier)
    {
        var trimmed = identifier.Trim();
        if (trimmed.Contains('.'))
        {
            var parts = trimmed.Split('.', 2, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 2)
            {
                return (Unquote(parts[0]), Unquote(parts[1]));
            }
        }

        return (null, Unquote(trimmed));
    }

    private static string Unquote(string value)
    {
        return value.Trim().Trim('"', '\'', '[', ']', '`');
    }

    private static string FormatIdentifier(string name)
    {
        if (SimpleIdentifierRegex.IsMatch(name))
        {
            return name;
        }

        return $"\"{name.Replace("\"", "\\\"")}\"";
    }

    private static string FormatTableName(string? schema, string table)
    {
        if (string.IsNullOrWhiteSpace(schema))
        {
            return FormatIdentifier(table);
        }

        return $"{FormatIdentifier(schema)}.{FormatIdentifier(table)}";
    }

    private static string MapType(ColumnInfo column)
    {
        var normalized = (column.DataType ?? string.Empty).Trim().ToLowerInvariant();

        if (normalized is "character varying" or "varchar" && column.CharacterMaxLength.HasValue)
        {
            return $"varchar({column.CharacterMaxLength.Value})";
        }

        if ((normalized is "numeric" or "decimal") && column.NumericPrecision.HasValue)
        {
            if (column.NumericScale.HasValue)
            {
                return $"{normalized}({column.NumericPrecision.Value}, {column.NumericScale.Value})";
            }

            return $"{normalized}({column.NumericPrecision.Value})";
        }

        return string.IsNullOrWhiteSpace(normalized) ? "text" : normalized;
    }

    private sealed class ColumnInfo
    {
        public string Name { get; set; } = string.Empty;
        public string DataType { get; set; } = string.Empty;
        public bool IsNullable { get; set; }
        public bool IsPrimaryKey { get; set; }
        public bool IsAutoIncrement { get; set; }
        public int? CharacterMaxLength { get; set; }
        public int? NumericPrecision { get; set; }
        public int? NumericScale { get; set; }
    }

    private sealed class ForeignKeyInfo
    {
        public string SourceSchema { get; set; } = string.Empty;
        public string SourceTable { get; set; } = string.Empty;
        public string SourceColumn { get; set; } = string.Empty;
        public string TargetSchema { get; set; } = string.Empty;
        public string TargetTable { get; set; } = string.Empty;
        public string TargetColumn { get; set; } = string.Empty;
    }
}
