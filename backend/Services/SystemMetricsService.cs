using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace DataModeler.Services
{
    public class SystemMetricsService
    {
        private readonly ILogger<SystemMetricsService> _logger;
        public SystemMetricsService(ILogger<SystemMetricsService> logger) => _logger = logger;
        public decimal GetCpuUsage() => 0m;
        public decimal GetMemoryUsage() => 0m;
        public decimal GetDiskUsage() => 0m;
        public async Task<object> GetSystemMetricsAsync() => await Task.FromResult(new { });
    }
}
