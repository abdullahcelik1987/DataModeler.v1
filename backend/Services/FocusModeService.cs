using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using DataModeler.API.Services;

namespace DataModeler.API.Services
{
    /// <summary>
    /// DISABLED: Service for managing diagram focus mode
    /// Causes dependency resolution errors - needs DTO refactoring
    /// </summary>
    public interface IFocusModeService
    {
        Task<object> CalculateFocusAsync(string modelId, string focusTableName, int maxDepth = 2);
        Task<List<object>> GetRelatedRelationshipsAsync(string modelId, string focusTableName, int maxDepth = 2);
        Task<object> GetFocusMetricsAsync(string modelId, string focusTableName);
    }

    public class FocusModeService : IFocusModeService
    {
        private readonly ILogger<FocusModeService> _logger;
        private readonly IDbmlParserService _dbmlParser;

        public FocusModeService(ILogger<FocusModeService> logger, IDbmlParserService dbmlParser)
        {
            _logger = logger;
            _dbmlParser = dbmlParser;
        }

        public async Task<object> CalculateFocusAsync(string modelId, string focusTableName, int maxDepth = 2)
        {
            _logger.LogWarning("FocusModeService is disabled");
            return await Task.FromResult(new { data = "disabled" });
        }

        public async Task<List<object>> GetRelatedRelationshipsAsync(string modelId, string focusTableName, int maxDepth = 2)
        {
            return await Task.FromResult(new List<object>());
        }

        public async Task<object> GetFocusMetricsAsync(string modelId, string focusTableName)
        {
            return await Task.FromResult(new { data = "disabled" });
        }
    }
}
