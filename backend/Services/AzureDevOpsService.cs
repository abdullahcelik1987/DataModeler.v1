using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace DataModeler.Services
{
    public interface IAzureDevOpsService
    {
        Task<object> GetRepositoriesAsync();
        Task<object> GetPullRequestsAsync();
    }

    public class AzureDevOpsService : IAzureDevOpsService
    {
        private readonly ILogger<AzureDevOpsService> _logger;
        public AzureDevOpsService(ILogger<AzureDevOpsService> logger) => _logger = logger;
        public async Task<object> GetRepositoriesAsync() => await Task.FromResult(new List<object>());
        public async Task<object> GetPullRequestsAsync() => await Task.FromResult(new List<object>());
    }
}
