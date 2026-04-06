using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DataModeler.Controllers
{
    /// <summary>
    /// WebSocket endpoint controller for real-time collaboration - DISABLED
    /// WebSocketManager package removed - requires alternative implementation
    /// </summary>
    [ApiController]
    [Route("api/collaboration")]
    [Authorize]
    public class CollaborationController : ControllerBase
    {
        [HttpPost("{modelId}/abandon")]
        public async Task<IActionResult> AbandonSession(Guid modelId)
        {
            return StatusCode(503, new { message = "Real-time collaboration is disabled" });
        }
    }
}
