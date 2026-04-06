using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace DataModeler.Services
{
    public class WebSocketConnectionManager
    {
        private readonly ILogger<WebSocketConnectionManager> _logger;
        public WebSocketConnectionManager(ILogger<WebSocketConnectionManager> logger) => _logger = logger;
        public async Task RegisterUserAsync(Guid modelId, string userId, string name) => await Task.CompletedTask;
        public async Task UnregisterUserAsync(Guid modelId, string userId) => await Task.CompletedTask;
        public async Task BroadcastMessageAsync(Guid modelId, object message) => await Task.CompletedTask;
    }
}
