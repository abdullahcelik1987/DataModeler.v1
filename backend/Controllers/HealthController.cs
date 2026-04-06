using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DataModeler.API.Data;

namespace DataModeler.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly DataModelerDbContext _dbContext;

    public HealthController(DataModelerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetHealth()
    {
        try
        {
            // Test database connection
            var canConnect = await _dbContext.Database.CanConnectAsync();
            
            if (!canConnect)
            {
                return StatusCode(503, new
                {
                    status = "unhealthy",
                    message = "Database connection failed",
                    timestamp = DateTime.UtcNow
                });
            }

            return Ok(new
            {
                status = "healthy",
                message = "DataModeler API is running",
                timestamp = DateTime.UtcNow,
                version = "0.1.0",
                environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                status = "unhealthy",
                message = $"Health check failed: {ex.Message}",
                timestamp = DateTime.UtcNow
            });
        }
    }
}
