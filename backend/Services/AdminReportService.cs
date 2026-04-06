using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace DataModeler.Services
{
    public class AdminReportService
    {
        private readonly ILogger<AdminReportService> _logger;
        public AdminReportService(ILogger<AdminReportService> logger) => _logger = logger;
        public async Task<object> GenerateReportAsync(string type) => await Task.FromResult(new { message = "Disabled" });
        public async Task<object> GetPerformanceMetricsAsync(DateTime start, DateTime end) => await Task.FromResult(new { message = "Disabled" });
    }
}
