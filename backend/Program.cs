using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using DataModeler.API.Data;
using DataModeler.API.Models;
using DataModeler.API.Services;
using DataModeler.API.Utilities;
using System.Text;
using System.Text.Json;
using DataModeler.API.Controllers;

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
builder.Services.AddScoped<IReverseEngineeringService, ReverseEngineeringService>();
builder.Services.AddScoped<IChangeRequestService, ChangeRequestService>();

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
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
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
    await EnsureApplicationRoleSchemaAsync(dbContext);
    await EnsureProjectMetadataSchemaAsync(dbContext);
    await EnsureDatabaseTypeCatalogSchemaAsync(dbContext);
    await EnsureChangeRequestSchemaAsync(dbContext);
    await EnsureDevOpsArchiveSchemaAsync(dbContext);
    await SeedDevelopmentAdminAsync(dbContext, app.Environment);
    await SeedDefaultApplicationRolesAsync(dbContext);
    await SeedDefaultDatabaseTypeCatalogAsync(dbContext);
    await SeedDefaultAdProvidersAsync(dbContext);
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
    var destructiveRepairEnabled = IsDestructiveRepairEnabled();

    try
    {
        await dbContext.Database.MigrateAsync();
    }
    catch (Exception ex)
    {
        if (await TableExistsAsync(dbContext, "users") && IsKnownMigrationHistoryMismatch(ex))
        {
            Console.WriteLine("Warning: EF migration history mismatch detected. Continuing with existing database schema without destructive reset.");
            return;
        }

        if (!environment.IsDevelopment())
        {
            throw;
        }

        if (!destructiveRepairEnabled)
        {
            throw;
        }

        await dbContext.Database.ExecuteSqlRawAsync("DROP SCHEMA IF EXISTS public CASCADE;");
        await dbContext.Database.ExecuteSqlRawAsync("CREATE SCHEMA public;");
        await dbContext.Database.ExecuteSqlRawAsync("GRANT ALL ON SCHEMA public TO postgres;");
        await dbContext.Database.ExecuteSqlRawAsync("GRANT ALL ON SCHEMA public TO public;");
        await dbContext.Database.EnsureCreatedAsync();
    }

    if (await TableExistsAsync(dbContext, "users"))
    {
        return;
    }

    if (!environment.IsDevelopment())
    {
        throw new InvalidOperationException("Database migration history exists, but required tables are missing.");
    }

    if (!destructiveRepairEnabled)
    {
        throw new InvalidOperationException(
            "Database schema is inconsistent (users table is missing). " +
            "Set ALLOW_DESTRUCTIVE_DB_REPAIR=true only if you intentionally want to recreate schema and lose data.");
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

static bool IsDestructiveRepairEnabled()
{
    var rawValue = Environment.GetEnvironmentVariable("ALLOW_DESTRUCTIVE_DB_REPAIR");
    return string.Equals(rawValue, "true", StringComparison.OrdinalIgnoreCase)
        || string.Equals(rawValue, "1", StringComparison.OrdinalIgnoreCase)
        || string.Equals(rawValue, "yes", StringComparison.OrdinalIgnoreCase);
}

static bool IsKnownMigrationHistoryMismatch(Exception ex)
{
    Exception? current = ex;
    while (current != null)
    {
        if (current is Npgsql.PostgresException pgEx)
        {
            var missingConstraintError = pgEx.SqlState == "42704"
                && pgEx.MessageText.Contains("constraint", StringComparison.OrdinalIgnoreCase)
                && pgEx.MessageText.Contains("does not exist", StringComparison.OrdinalIgnoreCase);

            var missingHistoryTableError = pgEx.SqlState == "42P01"
                && pgEx.MessageText.Contains("__EFMigrationsHistory", StringComparison.OrdinalIgnoreCase);

            if (missingConstraintError || missingHistoryTableError)
            {
                return true;
            }
        }

        current = current.InnerException;
    }

    return false;
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

static async Task EnsureApplicationRoleSchemaAsync(DataModelerDbContext dbContext)
{
    await dbContext.Database.ExecuteSqlRawAsync(@"
        CREATE TABLE IF NOT EXISTS application_roles (
            id uuid PRIMARY KEY,
            name character varying(100) NOT NULL UNIQUE,
            display_name character varying(150) NOT NULL,
            description character varying(500) NULL,
            permissions_json text NULL,
            is_system boolean NOT NULL DEFAULT false,
            is_active boolean NOT NULL DEFAULT true,
            created_at timestamp without time zone NOT NULL DEFAULT NOW(),
            updated_at timestamp without time zone NOT NULL DEFAULT NOW()
        );

        ALTER TABLE application_roles
        ADD COLUMN IF NOT EXISTS permissions_json text NULL;

        CREATE TABLE IF NOT EXISTS user_application_roles (
            user_id uuid NOT NULL,
            role_id uuid NOT NULL,
            assigned_at timestamp without time zone NOT NULL DEFAULT NOW(),
            assigned_by uuid NULL,
            PRIMARY KEY (user_id, role_id)
        );

        CREATE INDEX IF NOT EXISTS idx_user_application_roles_role_id ON user_application_roles(role_id);
        CREATE INDEX IF NOT EXISTS idx_application_roles_is_active ON application_roles(is_active);

        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_user_application_roles_users_user_id'
            ) THEN
                ALTER TABLE user_application_roles
                ADD CONSTRAINT fk_user_application_roles_users_user_id
                FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_user_application_roles_application_roles_role_id'
            ) THEN
                ALTER TABLE user_application_roles
                ADD CONSTRAINT fk_user_application_roles_application_roles_role_id
                FOREIGN KEY (role_id)
                REFERENCES application_roles(id)
                ON DELETE CASCADE;
            END IF;
        END $$;
    ");
}

static async Task EnsureProjectMetadataSchemaAsync(DataModelerDbContext dbContext)
{
    await dbContext.Database.ExecuteSqlRawAsync(@"
        CREATE TABLE IF NOT EXISTS project_metadata_field_definitions (
            id uuid PRIMARY KEY,
            field_key character varying(100) NOT NULL UNIQUE,
            display_name character varying(150) NOT NULL,
            field_type character varying(30) NOT NULL DEFAULT 'text',
            is_required boolean NOT NULL DEFAULT false,
            is_system boolean NOT NULL DEFAULT false,
            is_active boolean NOT NULL DEFAULT true,
            options_json text NOT NULL DEFAULT '[]',
            sort_order integer NOT NULL DEFAULT 0,
            created_at timestamp without time zone NOT NULL DEFAULT NOW(),
            updated_at timestamp without time zone NOT NULL DEFAULT NOW()
        );

        ALTER TABLE models
        ADD COLUMN IF NOT EXISTS project_metadata_json text NOT NULL DEFAULT '{{}}';

        CREATE INDEX IF NOT EXISTS idx_project_metadata_fields_active_sort
            ON project_metadata_field_definitions(is_active, sort_order);
    ");

    var defaults = new[]
    {
        new { Key = "database_type", Name = "Database Type", Type = "select", Required = true, System = true, Sort = 10, Options = new[] { "PostgreSQL", "MySQL", "SQL Server", "Oracle", "SQLite" } },
        new { Key = "description", Name = "Description", Type = "textarea", Required = true, System = true, Sort = 20, Options = Array.Empty<string>() },
        new { Key = "environment", Name = "Environment", Type = "select", Required = true, System = true, Sort = 30, Options = new[] { "Development", "Test", "Staging", "Production" } },
        new { Key = "owner", Name = "Owner User", Type = "text", Required = true, System = true, Sort = 40, Options = Array.Empty<string>() },
        new { Key = "owner_group", Name = "Owner Group", Type = "text", Required = true, System = true, Sort = 50, Options = Array.Empty<string>() },
        new { Key = "version", Name = "Version", Type = "text", Required = false, System = true, Sort = 60, Options = Array.Empty<string>() },
        new { Key = "contact", Name = "Contact", Type = "text", Required = false, System = true, Sort = 70, Options = Array.Empty<string>() },
        new { Key = "last_update", Name = "Last Update", Type = "text", Required = false, System = true, Sort = 90, Options = Array.Empty<string>() },
    };

    foreach (var field in defaults)
    {
        var existing = await dbContext.ProjectMetadataFieldDefinitions
            .FirstOrDefaultAsync(x => x.FieldKey == field.Key);

        if (existing == null)
        {
            dbContext.ProjectMetadataFieldDefinitions.Add(new ProjectMetadataFieldDefinition
            {
                Id = Guid.NewGuid(),
                FieldKey = field.Key,
                DisplayName = field.Name,
                FieldType = field.Type,
                IsRequired = field.Required,
                IsSystem = field.System,
                IsActive = true,
                SortOrder = field.Sort,
                OptionsJson = JsonSerializer.Serialize(field.Options),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }
        else
        {
            existing.IsSystem = true;
            existing.IsRequired = field.Required;
            existing.DisplayName = field.Name;
            existing.FieldType = field.Type;
            existing.SortOrder = field.Sort;
            existing.IsActive = true;
            existing.OptionsJson = JsonSerializer.Serialize(field.Options);
            existing.UpdatedAt = DateTime.UtcNow;
        }
    }

    var businessDomainField = await dbContext.ProjectMetadataFieldDefinitions
        .FirstOrDefaultAsync(field => field.FieldKey == "business_domain");
    if (businessDomainField != null)
    {
        businessDomainField.IsActive = false;
        businessDomainField.UpdatedAt = DateTime.UtcNow;
    }

    await dbContext.SaveChangesAsync();
}

static async Task SeedDefaultAdProvidersAsync(DataModelerDbContext dbContext)
{
    // Ensure the LDAP provider entry exists so it appears in the login dropdown.
    // The admin can then configure the actual server details via Admin → AD Settings.
    var ldapExists = await dbContext.AdSettings.AnyAsync(s => s.ProviderType == "ldap");
    if (!ldapExists)
    {
        var defaultLdapConfig = System.Text.Json.JsonSerializer.Serialize(new
        {
            server = "",
            port = 389,
            baseDn = "",
            bindDn = "",
            bindPassword = "",
            useSsl = false,
            userSearchFilter = "(sAMAccountName={0})"
        });

        dbContext.AdSettings.Add(new DataModeler.API.Models.AdSettings
        {
            Id = Guid.NewGuid(),
            ProviderType = "ldap",
            IsEnabled = true,
            ConfigJson = defaultLdapConfig,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync();
    }
}

static async Task SeedDefaultApplicationRolesAsync(DataModelerDbContext dbContext)
{
    var defaults = new[]
    {
        new { Name = "viewer", DisplayName = "Viewer", Description = "Read-only access" },
        new { Name = "developer", DisplayName = "Developer", Description = "Can create and edit models" },
        new { Name = "domain_architect", DisplayName = "Domain Architect", Description = "Designs bounded contexts and domain model structure" },
        new { Name = "data_architect", DisplayName = "Data Architect", Description = "Owns enterprise-level data architecture decisions" },
        new { Name = "admin", DisplayName = "Admin", Description = "Administrative control over models and permissions" },
        new { Name = "data_steward", DisplayName = "Data Steward", Description = "Maintains data quality and governance standards" }
    };

    foreach (var role in defaults)
    {
        var existing = await dbContext.ApplicationRoles
            .FirstOrDefaultAsync(x => x.Name == role.Name);

        var defaultPermissionsJson = JsonSerializer.Serialize(RolePermissionCatalog.GetDefaultPermissions(role.Name));

        if (existing == null)
        {
            dbContext.ApplicationRoles.Add(new ApplicationRole
            {
                Id = Guid.NewGuid(),
                Name = role.Name,
                DisplayName = role.DisplayName,
                Description = role.Description,
                PermissionsJson = defaultPermissionsJson,
                IsSystem = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
        else if (!existing.IsActive)
        {
            existing.IsActive = true;
            existing.PermissionsJson = string.IsNullOrWhiteSpace(existing.PermissionsJson)
                ? defaultPermissionsJson
                : existing.PermissionsJson;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else if (string.IsNullOrWhiteSpace(existing.PermissionsJson))
        {
            existing.PermissionsJson = defaultPermissionsJson;
            existing.UpdatedAt = DateTime.UtcNow;
        }
    }

    await dbContext.SaveChangesAsync();
}

static async Task EnsureDatabaseTypeCatalogSchemaAsync(DataModelerDbContext dbContext)
{
    await dbContext.Database.ExecuteSqlRawAsync(@"
        CREATE TABLE IF NOT EXISTS database_systems (
            id uuid PRIMARY KEY,
            name character varying(100) NOT NULL UNIQUE,
            key character varying(50) NOT NULL UNIQUE,
            is_active boolean NOT NULL DEFAULT true,
            created_at timestamp without time zone NOT NULL DEFAULT NOW(),
            updated_at timestamp without time zone NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS database_data_types (
            id uuid PRIMARY KEY,
            database_system_id uuid NOT NULL,
            name character varying(100) NOT NULL,
            input_template character varying(500) NOT NULL DEFAULT '',
            parameters_json text NOT NULL DEFAULT '[]',
            requires_length boolean NOT NULL DEFAULT false,
            supports_precision_scale boolean NOT NULL DEFAULT false,
            is_active boolean NOT NULL DEFAULT true,
            sort_order integer NOT NULL DEFAULT 0,
            created_at timestamp without time zone NOT NULL DEFAULT NOW(),
            updated_at timestamp without time zone NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_database_data_types_system_name UNIQUE (database_system_id, name)
        );

        CREATE INDEX IF NOT EXISTS idx_database_systems_is_active ON database_systems(is_active);
        CREATE INDEX IF NOT EXISTS idx_database_data_types_is_active ON database_data_types(is_active);
        CREATE INDEX IF NOT EXISTS idx_database_data_types_system_id ON database_data_types(database_system_id);

        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'database_data_types' AND column_name = 'input_template'
            ) THEN
                ALTER TABLE database_data_types ADD COLUMN input_template character varying(500) NOT NULL DEFAULT '';
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'database_data_types' AND column_name = 'parameters_json'
            ) THEN
                ALTER TABLE database_data_types ADD COLUMN parameters_json text NOT NULL DEFAULT '[]';
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_database_data_types_database_systems_database_system_id'
            ) THEN
                ALTER TABLE database_data_types
                ADD CONSTRAINT fk_database_data_types_database_systems_database_system_id
                FOREIGN KEY (database_system_id)
                REFERENCES database_systems(id)
                ON DELETE CASCADE;
            END IF;
        END $$;

        UPDATE database_data_types
        SET input_template = name
        WHERE input_template IS NULL OR btrim(input_template) = '';

        UPDATE database_data_types
        SET parameters_json = '[]'
        WHERE parameters_json IS NULL OR btrim(parameters_json) = '';
    ");
}

static async Task SeedDefaultDatabaseTypeCatalogAsync(DataModelerDbContext dbContext)
{
    var defaults = new[]
    {
        new
        {
            Name = "PostgreSQL",
            Key = "postgresql",
            Types = new[]
            {
                new { Name = "bigint", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 10 },
                new { Name = "integer", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 20 },
                new { Name = "smallint", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 30 },
                new { Name = "varchar", RequiresLength = true, SupportsPrecisionScale = false, SortOrder = 40 },
                new { Name = "char", RequiresLength = true, SupportsPrecisionScale = false, SortOrder = 50 },
                new { Name = "text", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 60 },
                new { Name = "boolean", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 70 },
                new { Name = "date", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 80 },
                new { Name = "timestamp", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 90 },
                new { Name = "numeric", RequiresLength = false, SupportsPrecisionScale = true, SortOrder = 100 },
                new { Name = "uuid", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 110 },
                new { Name = "jsonb", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 120 },
            }
        },
        new
        {
            Name = "MySQL",
            Key = "mysql",
            Types = new[]
            {
                new { Name = "bigint", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 10 },
                new { Name = "int", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 20 },
                new { Name = "smallint", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 30 },
                new { Name = "varchar", RequiresLength = true, SupportsPrecisionScale = false, SortOrder = 40 },
                new { Name = "char", RequiresLength = true, SupportsPrecisionScale = false, SortOrder = 50 },
                new { Name = "text", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 60 },
                new { Name = "boolean", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 70 },
                new { Name = "date", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 80 },
                new { Name = "datetime", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 90 },
                new { Name = "decimal", RequiresLength = false, SupportsPrecisionScale = true, SortOrder = 100 },
                new { Name = "json", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 110 },
            }
        },
        new
        {
            Name = "SQL Server",
            Key = "sqlserver",
            Types = new[]
            {
                new { Name = "bigint", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 10 },
                new { Name = "int", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 20 },
                new { Name = "smallint", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 30 },
                new { Name = "varchar", RequiresLength = true, SupportsPrecisionScale = false, SortOrder = 40 },
                new { Name = "nvarchar", RequiresLength = true, SupportsPrecisionScale = false, SortOrder = 50 },
                new { Name = "char", RequiresLength = true, SupportsPrecisionScale = false, SortOrder = 60 },
                new { Name = "nchar", RequiresLength = true, SupportsPrecisionScale = false, SortOrder = 70 },
                new { Name = "bit", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 80 },
                new { Name = "date", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 90 },
                new { Name = "datetime2", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 100 },
                new { Name = "decimal", RequiresLength = false, SupportsPrecisionScale = true, SortOrder = 110 },
                new { Name = "uniqueidentifier", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 120 },
            }
        },
        new
        {
            Name = "Oracle",
            Key = "oracle",
            Types = new[]
            {
                new { Name = "number", RequiresLength = false, SupportsPrecisionScale = true, SortOrder = 10 },
                new { Name = "varchar2", RequiresLength = true, SupportsPrecisionScale = false, SortOrder = 20 },
                new { Name = "char", RequiresLength = true, SupportsPrecisionScale = false, SortOrder = 30 },
                new { Name = "nvarchar2", RequiresLength = true, SupportsPrecisionScale = false, SortOrder = 40 },
                new { Name = "nchar", RequiresLength = true, SupportsPrecisionScale = false, SortOrder = 50 },
                new { Name = "clob", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 60 },
                new { Name = "date", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 70 },
                new { Name = "timestamp", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 80 },
            }
        },
        new
        {
            Name = "SQLite",
            Key = "sqlite",
            Types = new[]
            {
                new { Name = "integer", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 10 },
                new { Name = "real", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 20 },
                new { Name = "text", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 30 },
                new { Name = "blob", RequiresLength = false, SupportsPrecisionScale = false, SortOrder = 40 },
                new { Name = "numeric", RequiresLength = false, SupportsPrecisionScale = true, SortOrder = 50 },
                new { Name = "varchar", RequiresLength = true, SupportsPrecisionScale = false, SortOrder = 60 },
            }
        },
    };

    foreach (var dbms in defaults)
    {
        var system = await dbContext.DatabaseSystems.FirstOrDefaultAsync(x => x.Key == dbms.Key);
        if (system == null)
        {
            system = new DatabaseSystem
            {
                Id = Guid.NewGuid(),
                Name = dbms.Name,
                Key = dbms.Key,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            dbContext.DatabaseSystems.Add(system);
            await dbContext.SaveChangesAsync();
        }

        foreach (var type in dbms.Types)
        {
            var existing = await dbContext.DatabaseDataTypes
                .FirstOrDefaultAsync(t => t.DatabaseSystemId == system.Id && t.Name == type.Name);

            if (existing == null)
            {
                dbContext.DatabaseDataTypes.Add(new DatabaseDataType
                {
                    Id = Guid.NewGuid(),
                    DatabaseSystemId = system.Id,
                    Name = type.Name,
                    InputTemplate = BuildDefaultInputTemplate(type.Name, type.RequiresLength, type.SupportsPrecisionScale),
                    ParametersJson = BuildDefaultParameterJson(type.RequiresLength, type.SupportsPrecisionScale),
                    RequiresLength = type.RequiresLength,
                    SupportsPrecisionScale = type.SupportsPrecisionScale,
                    IsActive = true,
                    SortOrder = type.SortOrder,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
            }
            else if (string.IsNullOrWhiteSpace(existing.InputTemplate))
            {
                existing.InputTemplate = BuildDefaultInputTemplate(existing.Name, existing.RequiresLength, existing.SupportsPrecisionScale);
                existing.ParametersJson = string.IsNullOrWhiteSpace(existing.ParametersJson)
                    ? BuildDefaultParameterJson(existing.RequiresLength, existing.SupportsPrecisionScale)
                    : existing.ParametersJson;
                existing.UpdatedAt = DateTime.UtcNow;
            }
        }
    }

    await dbContext.SaveChangesAsync();
}

static async Task EnsureChangeRequestSchemaAsync(DataModelerDbContext dbContext)
{
    await dbContext.Database.ExecuteSqlRawAsync(@"
        CREATE TABLE IF NOT EXISTS change_requests (
            id uuid PRIMARY KEY,
            model_id uuid NOT NULL,
            title character varying(255) NOT NULL,
            description text NULL,
            requester_id uuid NOT NULL,
            status character varying(64) NOT NULL,
            workflow_stages_json text NOT NULL DEFAULT '[]',
            current_stage_index integer NOT NULL DEFAULT -1,
            created_at timestamp without time zone NOT NULL DEFAULT NOW(),
            updated_at timestamp without time zone NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS change_request_details (
            change_request_id uuid PRIMARY KEY,
            old_dbml_snapshot text NOT NULL,
            new_dbml_snapshot text NOT NULL,
            generated_sql text NOT NULL
        );

        CREATE TABLE IF NOT EXISTS change_request_approval_logs (
            id uuid PRIMARY KEY,
            change_request_id uuid NOT NULL,
            action_by uuid NOT NULL,
            from_status character varying(64) NULL,
            to_status character varying(64) NOT NULL,
            comment character varying(2000) NULL,
            created_at timestamp without time zone NOT NULL DEFAULT NOW()
        );

        CREATE SEQUENCE IF NOT EXISTS change_request_code_seq START WITH 1 INCREMENT BY 1;

        ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS change_code character varying(16);

        UPDATE change_requests
        SET change_code = 'CR-' || LPAD(nextval('change_request_code_seq')::text, 5, '0')
        WHERE change_code IS NULL OR btrim(change_code) = '';

        SELECT setval(
            'change_request_code_seq',
            GREATEST(
                1,
                COALESCE(
                    (
                        SELECT MAX(NULLIF(regexp_replace(change_code, '[^0-9]', '', 'g'), '')::bigint)
                        FROM change_requests
                    ),
                    0
                )
            ),
            true
        );

        CREATE UNIQUE INDEX IF NOT EXISTS ux_change_requests_change_code ON change_requests(change_code);
        ALTER TABLE change_requests ALTER COLUMN change_code SET NOT NULL;

        CREATE INDEX IF NOT EXISTS idx_change_requests_model_id ON change_requests(model_id);
        CREATE INDEX IF NOT EXISTS idx_change_requests_requester_id ON change_requests(requester_id);
        CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
        CREATE INDEX IF NOT EXISTS idx_change_requests_created_at ON change_requests(created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_change_request_approval_logs_change_request_id ON change_request_approval_logs(change_request_id);
        CREATE INDEX IF NOT EXISTS idx_change_request_approval_logs_action_by ON change_request_approval_logs(action_by);
        CREATE INDEX IF NOT EXISTS idx_change_request_approval_logs_created_at ON change_request_approval_logs(created_at DESC);

        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_change_requests_models_model_id'
            ) THEN
                ALTER TABLE change_requests
                ADD CONSTRAINT fk_change_requests_models_model_id
                FOREIGN KEY (model_id)
                REFERENCES models(id)
                ON DELETE CASCADE;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_change_requests_users_requester_id'
            ) THEN
                ALTER TABLE change_requests
                ADD CONSTRAINT fk_change_requests_users_requester_id
                FOREIGN KEY (requester_id)
                REFERENCES users(id)
                ON DELETE RESTRICT;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_change_request_details_change_requests_change_request_id'
            ) THEN
                ALTER TABLE change_request_details
                ADD CONSTRAINT fk_change_request_details_change_requests_change_request_id
                FOREIGN KEY (change_request_id)
                REFERENCES change_requests(id)
                ON DELETE CASCADE;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_change_request_approval_logs_change_requests_change_request_id'
            ) THEN
                ALTER TABLE change_request_approval_logs
                ADD CONSTRAINT fk_change_request_approval_logs_change_requests_change_request_id
                FOREIGN KEY (change_request_id)
                REFERENCES change_requests(id)
                ON DELETE CASCADE;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_change_request_approval_logs_users_action_by'
            ) THEN
                ALTER TABLE change_request_approval_logs
                ADD CONSTRAINT fk_change_request_approval_logs_users_action_by
                FOREIGN KEY (action_by)
                REFERENCES users(id)
                ON DELETE RESTRICT;
            END IF;
        END $$;
    ");
}

static async Task EnsureDevOpsArchiveSchemaAsync(DataModelerDbContext dbContext)
{
    await dbContext.Database.ExecuteSqlRawAsync(@"
        CREATE TABLE IF NOT EXISTS devops_settings (
            id uuid PRIMARY KEY,
            instance_url text NOT NULL DEFAULT '',
            collection_name text NOT NULL DEFAULT '',
            pat_token text NULL,
            is_enabled boolean NOT NULL DEFAULT false,
            created_at timestamp without time zone NOT NULL DEFAULT NOW(),
            updated_at timestamp without time zone NOT NULL DEFAULT NOW(),
            test_status character varying(20) NULL,
            test_message text NULL,
            test_timestamp timestamp without time zone NULL
        );

        ALTER TABLE devops_settings ADD COLUMN IF NOT EXISTS instance_url text NOT NULL DEFAULT '';
        ALTER TABLE devops_settings ADD COLUMN IF NOT EXISTS collection_name text NOT NULL DEFAULT '';
        ALTER TABLE devops_settings ADD COLUMN IF NOT EXISTS pat_token text NULL;
        ALTER TABLE devops_settings ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT false;
        ALTER TABLE devops_settings ADD COLUMN IF NOT EXISTS created_at timestamp without time zone NOT NULL DEFAULT NOW();
        ALTER TABLE devops_settings ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone NOT NULL DEFAULT NOW();
        ALTER TABLE devops_settings ADD COLUMN IF NOT EXISTS test_status character varying(20) NULL;
        ALTER TABLE devops_settings ADD COLUMN IF NOT EXISTS test_message text NULL;
        ALTER TABLE devops_settings ADD COLUMN IF NOT EXISTS test_timestamp timestamp without time zone NULL;

        CREATE TABLE IF NOT EXISTS devops_repository_mappings (
            id uuid PRIMARY KEY,
            model_id uuid NOT NULL,
            project_name character varying(255) NOT NULL,
            repository_name character varying(255) NOT NULL,
            branch_name character varying(255) NOT NULL DEFAULT 'main',
            file_path character varying(500) NOT NULL,
            is_enabled boolean NOT NULL DEFAULT true,
            created_at timestamp without time zone NOT NULL DEFAULT NOW(),
            updated_at timestamp without time zone NOT NULL DEFAULT NOW()
        );

        CREATE UNIQUE INDEX IF NOT EXISTS uq_devops_repository_mappings_model_id
            ON devops_repository_mappings(model_id);
        CREATE INDEX IF NOT EXISTS idx_devops_repository_mappings_enabled
            ON devops_repository_mappings(is_enabled);

        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_devops_repository_mappings_models_model_id'
            ) THEN
                ALTER TABLE devops_repository_mappings
                ADD CONSTRAINT fk_devops_repository_mappings_models_model_id
                FOREIGN KEY (model_id)
                REFERENCES models(id)
                ON DELETE CASCADE;
            END IF;
        END $$;
    ");
}

static string BuildDefaultInputTemplate(string name, bool requiresLength, bool supportsPrecisionScale)
{
    if (requiresLength)
    {
        return $"{name}({{{{length}}}})";
    }

    if (supportsPrecisionScale)
    {
        return $"{name}({{{{precision}}}},{{{{scale}}}})";
    }

    return name;
}

static string BuildDefaultParameterJson(bool requiresLength, bool supportsPrecisionScale)
{
    if (requiresLength)
    {
    return "[{\"Key\":\"length\",\"Label\":\"Length\",\"InputType\":\"number\",\"DefaultValue\":\"255\"}]";
    }

    if (supportsPrecisionScale)
    {
        return "[{\"Key\":\"precision\",\"Label\":\"Precision\",\"InputType\":\"number\",\"DefaultValue\":\"18\"},{\"Key\":\"scale\",\"Label\":\"Scale\",\"InputType\":\"number\",\"DefaultValue\":\"2\"}]";
    }

    return "[]";
}
