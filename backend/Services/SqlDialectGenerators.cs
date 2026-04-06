using System;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;

namespace DataModeler.Services
{
    public interface ISqlDialectGenerator
    {
        string GenerateCreateTableStatement(object model);
        string EscapeIdentifier(string identifier);
    }

    public class PostgreSqlDialectGenerator : ISqlDialectGenerator
    {
        private readonly ILogger<PostgreSqlDialectGenerator> _logger;
        public PostgreSqlDialectGenerator(ILogger<PostgreSqlDialectGenerator> logger) => _logger = logger;
        public string GenerateCreateTableStatement(object model) => string.Empty;
        public string EscapeIdentifier(string identifier) => string.IsNullOrEmpty(identifier) ? string.Empty : ("`" + identifier + "`");
    }

    public class SqlDialectGenerators
    {
        private readonly ILogger<SqlDialectGenerators> _logger;
        public SqlDialectGenerators(ILogger<SqlDialectGenerators> logger) => _logger = logger;
    }
}
