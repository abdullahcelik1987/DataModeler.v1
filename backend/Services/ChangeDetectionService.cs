using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using DataModeler.API.Services;

namespace DataModeler.API.Services
{
    public interface IChangeDetectionService
    {
        Task<object> DetectChangesAsync(Guid modelId, string newContent);
    }

    public class ChangeDetectionService : IChangeDetectionService
    {
        private readonly ILogger<ChangeDetectionService> _logger;
        private readonly IDbmlParserService _dbmlParserService;

        public ChangeDetectionService(ILogger<ChangeDetectionService> logger, IDbmlParserService dbmlParserService)
        {
            _logger = logger;
            _dbmlParserService = dbmlParserService;
        }

        public async Task<object> DetectChangesAsync(Guid modelId, string newContent)
        {
            _logger.LogWarning("ChangeDetectionService is disabled");
            return await Task.FromResult(new { changes = new List<object>() });
        }
    }
}
