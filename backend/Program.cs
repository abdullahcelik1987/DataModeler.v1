using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using DataModeler.API.Data;
using DataModeler.API.Models;
using DataModeler.API.Services;
using DataModeler.API.Utilities;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Explicitly add environment variables for Kubernetes support
builder.Configuration.AddEnvironmentVariables();
var config = builder.Configuration;

// JWT Authentication - check env variable first, then config file
var jwtSecretEnv = Environment.GetEnvironmentVariable("JWT__Secret");
var jwtConfigSecret = config["Jwt:Secret"];
var secret = string.IsNullOrEmpty(jwtSecretEnv) ? jwtConfigSecret : jwtSecretEnv;

if (string.IsNullOrEmpty(secret))
    throw new InvalidOperationException("JWT Secret not configured in environment or appsettings");

var key = Encoding.ASCII.GetBytes(secret);
var jwtSettings = config.GetSection("Jwt");

// Add services to the container
builder.Services.AddDbContext<DataModelerDbContext>(options =>
    options.UseNpgsql(config.GetConnectionString("DefaultConnection"))
);

builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// Add CORS
var allowedOrigins = config["CORS:AllowedOrigins"]?.Split(',') ?? new[] { "http://localhost:3000" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Add controllers
// Add services
// Stub implementations for dependencies not needed for local auth
builder.Services.AddScoped<ILdapAuthService, LdapAuthService>();
builder.Services.AddScoped<IAzureAdService, AzureAdService>();
builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IDbmlParserService, DbmlParserService>();

// Real-time collaboration services (DISABLED - WebSocketManager package removed)
// builder.Services.AddSingleton<WebSocketService>();
// builder.Services.AddScoped<WebSocketConnectionManager>();

// Azure DevOps integration services (disabled)
// builder.Services.AddHttpClient<IAzureDevOpsService, AzureDevOpsService>()
//     .ConfigureHttpClient(client =>
//     {
//         client.Timeout = TimeSpan.FromSeconds(30);
//     });

builder.Services.AddControllers()
    .AddJsonOptions(options => 
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

// Add Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "DataModeler API",
        Version = "v1",
        Description = "DBML-based data modeling tool API"
    });

    // Add JWT to Swagger
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme."
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] { }
        }
    });
});

var app = builder.Build();

// Apply migrations and seed database
using (var scope = app.Services.CreateScope())
{
    await EnsureDatabaseReadyAsync(scope.ServiceProvider, app.Environment);

    var dbContext = scope.ServiceProvider.GetRequiredService<DataModelerDbContext>();
    await EnsureModelGroupingSchemaAsync(dbContext);
    await SeedDevelopmentAdminAsync(dbContext, app.Environment);
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "DataModeler API v1");
        options.RoutePrefix = string.Empty;
    });
}

app.UseRouting();
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// Enable WebSocket support
var webSocketOptions = new WebSocketOptions()
{
    KeepAliveInterval = TimeSpan.FromMinutes(2)
};
app.UseWebSockets(webSocketOptions);

app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => Results.Json(new
{
    status = "healthy",
    timestamp = DateTime.UtcNow,
    version = "0.1.0"
})).WithName("Health").WithOpenApi();

app.Run();

static async Task EnsureDatabaseReadyAsync(IServiceProvider services, IWebHostEnvironment environment)
{
    using var scope = services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<DataModelerDbContext>();

    await dbContext.Database.MigrateAsync();

    if (await TableExistsAsync(dbContext, "users"))
    {
        return;
    }

    if (!environment.IsDevelopment())
    {
        throw new InvalidOperationException("Database migration history exists, but required tables are missing.");
    }

    await dbContext.Database.ExecuteSqlRawAsync("DROP SCHEMA IF EXISTS public CASCADE;");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE SCHEMA public;");
    await dbContext.Database.ExecuteSqlRawAsync("GRANT ALL ON SCHEMA public TO postgres;");
    await dbContext.Database.ExecuteSqlRawAsync("GRANT ALL ON SCHEMA public TO public;");

    using var repairScope = services.CreateScope();
    var repairDbContext = repairScope.ServiceProvider.GetRequiredService<DataModelerDbContext>();
    await repairDbContext.Database.MigrateAsync();

    if (await TableExistsAsync(repairDbContext, "users"))
    {
        return;
    }

    await repairDbContext.Database.ExecuteSqlRawAsync("DROP SCHEMA IF EXISTS public CASCADE;");
    await repairDbContext.Database.ExecuteSqlRawAsync("CREATE SCHEMA public;");
    await repairDbContext.Database.ExecuteSqlRawAsync("GRANT ALL ON SCHEMA public TO postgres;");
    await repairDbContext.Database.ExecuteSqlRawAsync("GRANT ALL ON SCHEMA public TO public;");
    await repairDbContext.Database.EnsureCreatedAsync();

    if (!await TableExistsAsync(repairDbContext, "users"))
    {
        throw new InvalidOperationException("Database schema repair completed, but required tables are still missing.");
    }
}

static async Task<bool> TableExistsAsync(DataModelerDbContext dbContext, string tableName)
{
    var connection = dbContext.Database.GetDbConnection();
    var shouldClose = connection.State != System.Data.ConnectionState.Open;

    if (shouldClose)
    {
        await connection.OpenAsync();
    }

    try
    {
        await using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = @tableName
            );";

        var parameter = command.CreateParameter();
        parameter.ParameterName = "tableName";
        parameter.Value = tableName;
        command.Parameters.Add(parameter);

        var result = await command.ExecuteScalarAsync();
        return result is bool exists && exists;
    }
    finally
    {
        if (shouldClose)
        {
            await connection.CloseAsync();
        }
    }
}

static async Task SeedDevelopmentAdminAsync(DataModelerDbContext dbContext, IWebHostEnvironment environment)
{
    if (!environment.IsDevelopment())
    {
        return;
    }

    const string adminEmail = "admin@datamodeler.local";
    const string adminPassword = "ktdm123456";
    var normalizedEmail = adminEmail.ToLowerInvariant();

    var adminUser = await dbContext.Users.SingleOrDefaultAsync(user => user.EmailLower == normalizedEmail);
    if (adminUser is null)
    {
        adminUser = new User
        {
            Id = Guid.NewGuid(),
            Email = adminEmail,
            EmailLower = normalizedEmail,
            IsActive = true,
            IsSuperAdmin = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.Users.Add(adminUser);
    }

    adminUser.Email = adminEmail;
    adminUser.EmailLower = normalizedEmail;
    adminUser.PasswordHash = PasswordHasher.HashPassword(adminPassword);
    adminUser.IsActive = true;
    adminUser.IsSuperAdmin = true;
    adminUser.UpdatedAt = DateTime.UtcNow;

    await dbContext.SaveChangesAsync();
}

static async Task EnsureModelGroupingSchemaAsync(DataModelerDbContext dbContext)
{
    await dbContext.Database.ExecuteSqlRawAsync(@"
        CREATE TABLE IF NOT EXISTS model_groups (
            id uuid PRIMARY KEY,
            name character varying(255) NOT NULL UNIQUE,
            created_by uuid NULL,
            created_at timestamp without time zone NOT NULL DEFAULT NOW()
        );

        ALTER TABLE models ADD COLUMN IF NOT EXISTS model_group_id uuid NULL;
        CREATE INDEX IF NOT EXISTS idx_models_model_group_id ON models(model_group_id);
        CREATE INDEX IF NOT EXISTS idx_model_groups_name ON model_groups(name);

        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_models_model_groups_model_group_id'
            ) THEN
                ALTER TABLE models
                ADD CONSTRAINT fk_models_model_groups_model_group_id
                FOREIGN KEY (model_group_id)
                REFERENCES model_groups(id)
                ON DELETE SET NULL;
            END IF;
        END $$;
    ");
}
