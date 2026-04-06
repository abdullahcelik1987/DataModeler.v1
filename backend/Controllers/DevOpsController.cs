using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DataModeler.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DevOpsController : ControllerBase
    {
        private readonly ILogger<DevOpsController> _logger;

        public DevOpsController(ILogger<DevOpsController> logger)
        {
            _logger = logger;
        }

        [HttpPost("test-connection")]
        [Authorize(Roles = "editor,owner")]
        public async Task<IActionResult> TestConnectionAsync()
        {
            return StatusCode(503, new { message = "Azure DevOps integration is disabled" });
        }

        [HttpGet]
        [Authorize(Roles = "editor,owner")]
        public async Task<IActionResult> GetRepositoriesAsync()
        {
            return StatusCode(503, new { message = "Azure DevOps integration is disabled" });
        }
    }
}
