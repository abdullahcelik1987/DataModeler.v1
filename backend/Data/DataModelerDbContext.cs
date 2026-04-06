using Microsoft.EntityFrameworkCore;
using DataModeler.API.Models;

namespace DataModeler.API.Data;

/// <summary>
/// Entity Framework Core DbContext for DataModeler application
/// </summary>
public class DataModelerDbContext : DbContext
{
    public DataModelerDbContext(DbContextOptions<DataModelerDbContext> options) : base(options)
    {
    }

    // DbSets
    public DbSet<User> Users { get; set; }
    public DbSet<Model> Models { get; set; }
    public DbSet<ModelGroup> ModelGroups { get; set; }
    public DbSet<ModelVersion> ModelVersions { get; set; }
    public DbSet<ModelChange> ModelChanges { get; set; }
    public DbSet<ModelCollaborator> ModelCollaborators { get; set; }
    public DbSet<ModelGroupPermission> ModelGroupPermissions { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<EditingSession> EditingSessions { get; set; }
    public DbSet<YjsUpdate> YjsUpdates { get; set; }
    public DbSet<AdSettings> AdSettings { get; set; }
    public DbSet<DevopsSettings> DevopsSettings { get; set; }
    public DbSet<RepositoryConnection> RepositoryConnections { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure User table with explicit column name mappings
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Email).HasColumnName("email").IsRequired().HasMaxLength(255);
            entity.Property(e => e.EmailLower).HasColumnName("email_lower").IsRequired().HasMaxLength(255);
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash");
            entity.Property(e => e.AzureAdId).HasColumnName("azure_ad_id");
            entity.Property(e => e.LdapDistinguishedName).HasColumnName("ldap_distinguished_name");
            entity.Property(e => e.IsSuperAdmin).HasColumnName("is_super_admin");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.LastLogin).HasColumnName("last_login");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.EmailLower).IsUnique();
            entity.HasIndex(e => e.AzureAdId);
        });

        // Configure AuditLog
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("audit_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Action).HasColumnName("action").HasMaxLength(100);
            entity.Property(e => e.ModelId).HasColumnName("model_id");
            entity.Property(e => e.TargetTableName).HasColumnName("target_table_name");
            entity.Property(e => e.IpAddress).HasColumnName("ip_address");
            entity.Property(e => e.UserAgent).HasColumnName("user_agent");
            entity.Property(e => e.Details).HasColumnName("details");
            entity.Property(e => e.Timestamp).HasColumnName("timestamp").HasDefaultValueSql("NOW()");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ModelId);
            entity.HasIndex(e => e.Action);
            entity.HasIndex(e => new { e.Timestamp }).IsDescending();
            entity.HasOne(e => e.User).WithMany(u => u.AuditLogs).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Model).WithMany().HasForeignKey(e => e.ModelId).OnDelete(DeleteBehavior.SetNull);
        });

        // Configure Model table
        modelBuilder.Entity<Model>(entity =>
        {
            entity.ToTable("models");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.DatabaseDialect).HasMaxLength(50).HasDefaultValue("PostgreSQL");
            entity.HasIndex(e => e.OwnerId);
            entity.HasIndex(e => e.ModelGroupId);
            entity.HasIndex(e => new { e.CreatedAt }).IsDescending();
            entity.HasOne(e => e.Owner).WithMany(u => u.OwnedModels).HasForeignKey(e => e.OwnerId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.ModelGroup).WithMany(g => g.Models).HasForeignKey(e => e.ModelGroupId).OnDelete(DeleteBehavior.SetNull);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
        });

        // Configure ModelGroup
        modelBuilder.Entity<ModelGroup>(entity =>
        {
            entity.ToTable("model_groups");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.HasIndex(e => e.Name).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.CreatedBy).OnDelete(DeleteBehavior.SetNull);
        });

        // Configure ModelVersion
        modelBuilder.Entity<ModelVersion>(entity =>
        {
            entity.ToTable("model_versions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DbmlContent).IsRequired();
            entity.HasIndex(e => e.ModelId);
            entity.HasIndex(e => new { e.ModelId, e.VersionNumber }).IsUnique();
            entity.HasIndex(e => e.CreatedBy);
            entity.HasOne(e => e.Model).WithMany(m => m.Versions).HasForeignKey(e => e.ModelId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Creator).WithMany().HasForeignKey(e => e.CreatedBy);
            entity.HasOne(e => e.ParentVersion).WithMany().HasForeignKey(e => e.ParentVersionId).OnDelete(DeleteBehavior.SetNull);
            entity.Property(e => e.BranchName).HasDefaultValue("main");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        // Configure ModelChange
        modelBuilder.Entity<ModelChange>(entity =>
        {
            entity.ToTable("model_changes");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ModelId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.CreatedAt }).IsDescending();
            entity.HasOne(e => e.Model).WithMany(m => m.Changes).HasForeignKey(e => e.ModelId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId);
            entity.Property(e => e.ChangeType).HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        // Configure ModelCollaborator
        modelBuilder.Entity<ModelCollaborator>(entity =>
        {
            entity.ToTable("model_collaborators");
            entity.HasKey(e => new { e.ModelId, e.UserId });
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Role);
            entity.HasOne(e => e.Model).WithMany(m => m.Collaborators).HasForeignKey(e => e.ModelId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany(u => u.Collaborations).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.Role).HasMaxLength(50);
            entity.Property(e => e.AssignedAt).HasDefaultValueSql("NOW()");
        });

        // Configure ModelGroupPermission
        modelBuilder.Entity<ModelGroupPermission>(entity =>
        {
            entity.ToTable("model_group_permissions");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ModelId);
            entity.HasOne(e => e.Model).WithMany(m => m.GroupPermissions).HasForeignKey(e => e.ModelId).OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.AdGroupName).HasMaxLength(255);
            entity.Property(e => e.Role).HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        // Configure EditingSession
        modelBuilder.Entity<EditingSession>(entity =>
        {
            entity.ToTable("editing_sessions");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ModelId);
            entity.HasIndex(e => e.UserId);
            entity.HasOne(e => e.Model).WithMany().HasForeignKey(e => e.ModelId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.StartedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.LastActivity).HasDefaultValueSql("NOW()");
        });

        // Configure YjsUpdate
        modelBuilder.Entity<YjsUpdate>(entity =>
        {
            entity.ToTable("yjs_updates");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ModelId);
            entity.HasIndex(e => new { e.CreatedAt }).IsDescending();
            entity.HasOne(e => e.Model).WithMany().HasForeignKey(e => e.ModelId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        // Configure AdSettings
        modelBuilder.Entity<AdSettings>(entity =>
        {
            entity.ToTable("ad_settings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProviderType).HasMaxLength(50);
            entity.Property(e => e.TestStatus).HasMaxLength(20);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
        });

        // Configure DevopsSettings
        modelBuilder.Entity<DevopsSettings>(entity =>
        {
            entity.ToTable("devops_settings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TestStatus).HasMaxLength(20);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
        });

        // Configure RepositoryConnection
        modelBuilder.Entity<RepositoryConnection>(entity =>
        {
            entity.ToTable("repository_connections");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CreatedBy);
            entity.HasIndex(e => e.IsDefault);
            entity.HasOne(e => e.Creator).WithMany().HasForeignKey(e => e.CreatedBy).OnDelete(DeleteBehavior.Restrict);
            entity.Property(e => e.Name).HasMaxLength(255);
            entity.Property(e => e.DatabaseType).HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
        });
    }
}
