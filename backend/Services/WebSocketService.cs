using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace DataModeler.Services
{
    /// <summary>
    /// Manages WebSocket connections, presence, and real-time messaging for collaborative editing
    /// </summary>
    public class WebSocketService
    {
        private readonly ILogger<WebSocketService> _logger;
        
        // Model ID -> Set of connected users with their WebSocket connections
        private readonly ConcurrentDictionary<Guid, Dictionary<string, UserConnection>> _activeConnections;
        
        // User ID -> User presence information
        private readonly ConcurrentDictionary<string, UserPresence> _userPresence;
        
        public WebSocketService(ILogger<WebSocketService> logger)
        {
            _logger = logger;
            _activeConnections = new ConcurrentDictionary<Guid, Dictionary<string, UserConnection>>();
            _userPresence = new ConcurrentDictionary<string, UserPresence>();
        }

        /// <summary>
        /// Register a new WebSocket connection for a user on a specific model
        /// </summary>
        public async Task RegisterConnectionAsync(Guid modelId, string userId, string userName, WebSocket webSocket)
        {
            try
            {
                var userConnection = new UserConnection
                {
                    UserId = userId,
                    UserName = userName,
                    WebSocket = webSocket,
                    ConnectedAt = DateTime.UtcNow,
                    CursorPosition = new CursorPosition { Line = 0, Column = 0 }
                };

                // Add connection to model room
                _activeConnections.AddOrUpdate(modelId,
                    new Dictionary<string, UserConnection> { { userId, userConnection } },
                    (_, connections) =>
                    {
                        connections[userId] = userConnection;
                        return connections;
                    });

                // Register user presence
                _userPresence.AddOrUpdate(userId,
                    new UserPresence
                    {
                        UserId = userId,
                        UserName = userName,
                        Color = GenerateUserColor(userId),
                        ModelId = modelId,
                        ConnectedAt = DateTime.UtcNow,
                        IsActive = true
                    },
                    (_, presence) =>
                    {
                        presence.IsActive = true;
                        presence.ModelId = modelId;
                        return presence;
                    });

                _logger.LogInformation($"User {userName} ({userId}) connected to model {modelId}");

                // Broadcast user joined message
                await BroadcastMessageAsync(modelId, new
                {
                    type = "user_joined",
                    user = new
                    {
                        id = userId,
                        name = userName,
                        color = _userPresence[userId].Color,
                        connectedAt = DateTime.UtcNow
                    }
                });

                // Send current presence to new user
                await SendPresenceListAsync(modelId, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error registering connection: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Unregister a WebSocket connection and cleanup
        /// </summary>
        public async Task UnregisterConnectionAsync(Guid modelId, string userId)
        {
            try
            {
                if (_activeConnections.TryGetValue(modelId, out var connections))
                {
                    if (connections.TryGetValue(userId, out var userConnection))
                    {
                        connections.Remove(userId);
                        userConnection.WebSocket?.Dispose();
                    }

                    // Remove model room if empty
                    if (connections.Count == 0)
                    {
                        _activeConnections.TryRemove(modelId, out _);
                    }
                }

                // Mark user as inactive
                if (_userPresence.TryGetValue(userId, out var presence))
                {
                    presence.IsActive = false;
                    presence.DisconnectedAt = DateTime.UtcNow;
                }

                _logger.LogInformation($"User {userId} disconnected from model {modelId}");

                // Broadcast user left message
                await BroadcastMessageAsync(modelId, new
                {
                    type = "user_left",
                    userId = userId,
                    disconnectedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error unregistering connection: {ex.Message}");
            }
        }

        /// <summary>
        /// Broadcast a message to all users in a model room
        /// </summary>
        public async Task BroadcastMessageAsync(Guid modelId, object message)
        {
            if (!_activeConnections.TryGetValue(modelId, out var connections))
            {
                return;
            }

            var jsonMessage = JsonSerializer.Serialize(message);
            var buffer = Encoding.UTF8.GetBytes(jsonMessage);

            var disconnectedUsers = new List<string>();

            foreach (var kvp in connections)
            {
                var userId = kvp.Key;
                var userConnection = kvp.Value;

                if (userConnection.WebSocket?.State == WebSocketState.Open)
                {
                    try
                    {
                        await userConnection.WebSocket.SendAsync(
                            new ArraySegment<byte>(buffer),
                            WebSocketMessageType.Text,
                            true,
                            CancellationToken.None);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning($"Error sending message to {userId}: {ex.Message}");
                        disconnectedUsers.Add(userId);
                    }
                }
                else
                {
                    disconnectedUsers.Add(userId);
                }
            }

            // Cleanup disconnected users
            foreach (var userId in disconnectedUsers)
            {
                await UnregisterConnectionAsync(modelId, userId);
            }
        }

        /// <summary>
        /// Send a message to a specific user
        /// </summary>
        public async Task SendMessageToUserAsync(Guid modelId, string userId, object message)
        {
            if (!_activeConnections.TryGetValue(modelId, out var connections))
            {
                return;
            }

            if (connections.TryGetValue(userId, out var userConnection) && 
                userConnection.WebSocket?.State == WebSocketState.Open)
            {
                try
                {
                    var jsonMessage = JsonSerializer.Serialize(message);
                    var buffer = Encoding.UTF8.GetBytes(jsonMessage);

                    await userConnection.WebSocket.SendAsync(
                        new ArraySegment<byte>(buffer),
                        WebSocketMessageType.Text,
                        true,
                        CancellationToken.None);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"Error sending message to {userId}: {ex.Message}");
                    await UnregisterConnectionAsync(modelId, userId);
                }
            }
        }

        /// <summary>
        /// Broadcast editor changes to all users except the sender
        /// </summary>
        public async Task BroadcastEditorChangeAsync(Guid modelId, string senderId, object editorChange)
        {
            if (!_activeConnections.TryGetValue(modelId, out var connections))
            {
                return;
            }

            var message = new
            {
                type = "editor_change",
                senderId = senderId,
                change = editorChange,
                timestamp = DateTime.UtcNow
            };

            var jsonMessage = JsonSerializer.Serialize(message);
            var buffer = Encoding.UTF8.GetBytes(jsonMessage);

            var disconnectedUsers = new List<string>();

            foreach (var kvp in connections)
            {
                var userId = kvp.Key;
                var userConnection = kvp.Value;

                // Don't send back to sender for local echo prevention
                if (userId == senderId)
                {
                    continue;
                }

                if (userConnection.WebSocket?.State == WebSocketState.Open)
                {
                    try
                    {
                        await userConnection.WebSocket.SendAsync(
                            new ArraySegment<byte>(buffer),
                            WebSocketMessageType.Text,
                            true,
                            CancellationToken.None);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning($"Error broadcasting change to {userId}: {ex.Message}");
                        disconnectedUsers.Add(userId);
                    }
                }
                else
                {
                    disconnectedUsers.Add(userId);
                }
            }

            // Cleanup disconnected users
            foreach (var userId in disconnectedUsers)
            {
                await UnregisterConnectionAsync(modelId, userId);
            }
        }

        /// <summary>
        /// Update cursor position for a user
        /// </summary>
        public async Task UpdateCursorPositionAsync(Guid modelId, string userId, int line, int column)
        {
            if (_activeConnections.TryGetValue(modelId, out var connections) &&
                connections.TryGetValue(userId, out var userConnection))
            {
                userConnection.CursorPosition = new CursorPosition { Line = line, Column = column };

                // Broadcast cursor update
                var userPresence = _userPresence[userId];
                await BroadcastMessageAsync(modelId, new
                {
                    type = "cursor_update",
                    userId = userId,
                    userName = userPresence.UserName,
                    color = userPresence.Color,
                    position = new { line, column },
                    timestamp = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// Get all active users in a model
        /// </summary>
        public List<ActiveUserInfo> GetActiveUsersInModel(Guid modelId)
        {
            if (!_activeConnections.TryGetValue(modelId, out var connections))
            {
                return new List<ActiveUserInfo>();
            }

            return connections.Values
                .Select(conn => new ActiveUserInfo
                {
                    UserId = conn.UserId,
                    UserName = conn.UserName,
                    ConnectedAt = conn.ConnectedAt,
                    Color = _userPresence.ContainsKey(conn.UserId) ? _userPresence[conn.UserId].Color : "#000000",
                    CursorLine = conn.CursorPosition.Line,
                    CursorColumn = conn.CursorPosition.Column
                })
                .ToList();
        }

        /// <summary>
        /// Send presence list to a specific user
        /// </summary>
        private async Task SendPresenceListAsync(Guid modelId, string userId)
        {
            var activeUsers = GetActiveUsersInModel(modelId);
            
            var presenceList = activeUsers
                .Where(u => u.UserId != userId) // Don't include self
                .Select(u => new
                {
                    id = u.UserId,
                    name = u.UserName,
                    color = u.Color,
                    cursorPosition = new { line = u.CursorLine, column = u.CursorColumn },
                    connectedAt = u.ConnectedAt
                })
                .ToList();

            await SendMessageToUserAsync(modelId, userId, new
            {
                type = "presence_list",
                users = presenceList,
                timestamp = DateTime.UtcNow
            });
        }

        /// <summary>
        /// Generate a consistent color for a user based on their ID
        /// </summary>
        private string GenerateUserColor(string userId)
        {
            var hash = userId.GetHashCode();
            var colors = new[]
            {
                "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
                "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B88B", "#ABEBC6"
            };
            var index = Math.Abs(hash) % colors.Length;
            return colors[index];
        }

        /// <summary>
        /// Check if a user is connected to a model
        /// </summary>
        public bool IsUserConnected(Guid modelId, string userId)
        {
            if (_activeConnections.TryGetValue(modelId, out var connections))
            {
                return connections.ContainsKey(userId);
            }
            return false;
        }

        /// <summary>
        /// Get connection count for a model
        /// </summary>
        public int GetConnectionCount(Guid modelId)
        {
            if (_activeConnections.TryGetValue(modelId, out var connections))
            {
                return connections.Count;
            }
            return 0;
        }
    }

    /// <summary>
    /// Represents an active WebSocket connection for a user
    /// </summary>
    public class UserConnection
    {
        public string UserId { get; set; }
        public string UserName { get; set; }
        public WebSocket WebSocket { get; set; }
        public DateTime ConnectedAt { get; set; }
        public CursorPosition CursorPosition { get; set; }
    }

    /// <summary>
    /// Represents user presence information
    /// </summary>
    public class UserPresence
    {
        public string UserId { get; set; }
        public string UserName { get; set; }
        public string Color { get; set; }
        public Guid ModelId { get; set; }
        public DateTime ConnectedAt { get; set; }
        public DateTime? DisconnectedAt { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Represents cursor position in editor
    /// </summary>
    public class CursorPosition
    {
        public int Line { get; set; }
        public int Column { get; set; }
    }

    /// <summary>
    /// Information about an active user in a model
    /// </summary>
    public class ActiveUserInfo
    {
        public string UserId { get; set; }
        public string UserName { get; set; }
        public DateTime ConnectedAt { get; set; }
        public string Color { get; set; }
        public int CursorLine { get; set; }
        public int CursorColumn { get; set; }
    }
}
