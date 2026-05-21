using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace DataModeler.API.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkflowTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_editing_sessions_models_ModelId",
                table: "editing_sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_editing_sessions_users_UserId",
                table: "editing_sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_model_changes_model_versions_VersionId",
                table: "model_changes");

            migrationBuilder.DropForeignKey(
                name: "FK_model_changes_models_ModelId",
                table: "model_changes");

            migrationBuilder.DropForeignKey(
                name: "FK_model_changes_users_UserId",
                table: "model_changes");

            migrationBuilder.DropForeignKey(
                name: "FK_model_collaborators_models_ModelId",
                table: "model_collaborators");

            migrationBuilder.DropForeignKey(
                name: "FK_model_collaborators_users_AssignedBy",
                table: "model_collaborators");

            migrationBuilder.DropForeignKey(
                name: "FK_model_collaborators_users_UserId",
                table: "model_collaborators");

            migrationBuilder.DropForeignKey(
                name: "FK_model_group_permissions_models_ModelId",
                table: "model_group_permissions");

            migrationBuilder.DropForeignKey(
                name: "FK_model_versions_model_versions_ParentVersionId",
                table: "model_versions");

            migrationBuilder.DropForeignKey(
                name: "FK_model_versions_models_ModelId",
                table: "model_versions");

            migrationBuilder.DropForeignKey(
                name: "FK_model_versions_users_CreatedBy",
                table: "model_versions");

            migrationBuilder.DropForeignKey(
                name: "FK_models_users_OwnerId",
                table: "models");

            migrationBuilder.DropForeignKey(
                name: "FK_yjs_updates_editing_sessions_SessionId",
                table: "yjs_updates");

            migrationBuilder.DropIndex(
                name: "IX_model_collaborators_AssignedBy",
                table: "model_collaborators");

            migrationBuilder.DropIndex(
                name: "IX_devops_settings_setting_key",
                table: "devops_settings");

            migrationBuilder.DropIndex(
                name: "IX_ad_settings_setting_key",
                table: "ad_settings");

            migrationBuilder.DropColumn(
                name: "RepoUrl",
                table: "repository_connections");

            migrationBuilder.DropColumn(
                name: "EndedAt",
                table: "editing_sessions");

            migrationBuilder.DropColumn(
                name: "SettingKey",
                table: "devops_settings");

            migrationBuilder.DropColumn(
                name: "SettingKey",
                table: "ad_settings");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "yjs_updates",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "yjs_updates",
                newName: "created_at");

            migrationBuilder.RenameColumn(
                name: "Update",
                table: "yjs_updates",
                newName: "update_binary");

            migrationBuilder.RenameColumn(
                name: "SessionId",
                table: "yjs_updates",
                newName: "user_id");

            migrationBuilder.RenameIndex(
                name: "IX_yjs_updates_SessionId",
                table: "yjs_updates",
                newName: "IX_yjs_updates_user_id");

            migrationBuilder.RenameIndex(
                name: "idx_users_email_lower",
                table: "users",
                newName: "IX_users_email_lower");

            migrationBuilder.RenameIndex(
                name: "idx_users_email",
                table: "users",
                newName: "IX_users_email");

            migrationBuilder.RenameIndex(
                name: "idx_users_azure_ad_id",
                table: "users",
                newName: "IX_users_azure_ad_id");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "repository_connections",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "repository_connections",
                newName: "updated_at");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "repository_connections",
                newName: "created_at");

            migrationBuilder.RenameColumn(
                name: "RepoType",
                table: "repository_connections",
                newName: "database_type");

            migrationBuilder.RenameColumn(
                name: "ConnectionName",
                table: "repository_connections",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "AuthToken",
                table: "repository_connections",
                newName: "connection_string");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "models",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "models",
                newName: "description");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "models",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "models",
                newName: "updated_at");

            migrationBuilder.RenameColumn(
                name: "RepositoryId",
                table: "models",
                newName: "repository_id");

            migrationBuilder.RenameColumn(
                name: "OwnerId",
                table: "models",
                newName: "owner_id");

            migrationBuilder.RenameColumn(
                name: "DatabaseDialect",
                table: "models",
                newName: "database_dialect");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "models",
                newName: "created_at");

            migrationBuilder.RenameIndex(
                name: "idx_models_owner",
                table: "models",
                newName: "IX_models_owner_id");

            migrationBuilder.RenameIndex(
                name: "idx_models_created_at",
                table: "models",
                newName: "IX_models_created_at");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "model_versions",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "VersionNumber",
                table: "model_versions",
                newName: "version_number");

            migrationBuilder.RenameColumn(
                name: "ParentVersionId",
                table: "model_versions",
                newName: "parent_version_id");

            migrationBuilder.RenameColumn(
                name: "ModelId",
                table: "model_versions",
                newName: "model_id");

            migrationBuilder.RenameColumn(
                name: "IsLocked",
                table: "model_versions",
                newName: "is_locked");

            migrationBuilder.RenameColumn(
                name: "DbmlContent",
                table: "model_versions",
                newName: "dbml_content");

            migrationBuilder.RenameColumn(
                name: "CreatedBy",
                table: "model_versions",
                newName: "created_by");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "model_versions",
                newName: "created_at");

            migrationBuilder.RenameColumn(
                name: "ChangeSummary",
                table: "model_versions",
                newName: "change_summary");

            migrationBuilder.RenameColumn(
                name: "BranchName",
                table: "model_versions",
                newName: "branch_name");

            migrationBuilder.RenameIndex(
                name: "IX_model_versions_version_number",
                table: "model_versions",
                newName: "IX_model_versions_model_id_version_number");

            migrationBuilder.RenameIndex(
                name: "IX_model_versions_ParentVersionId",
                table: "model_versions",
                newName: "IX_model_versions_parent_version_id");

            migrationBuilder.RenameIndex(
                name: "IX_model_versions_ModelId",
                table: "model_versions",
                newName: "IX_model_versions_model_id");

            migrationBuilder.RenameIndex(
                name: "IX_model_versions_CreatedBy",
                table: "model_versions",
                newName: "IX_model_versions_created_by");

            migrationBuilder.RenameColumn(
                name: "Role",
                table: "model_group_permissions",
                newName: "role");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "model_group_permissions",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "ModelId",
                table: "model_group_permissions",
                newName: "model_id");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "model_group_permissions",
                newName: "created_at");

            migrationBuilder.RenameColumn(
                name: "AdGroupName",
                table: "model_group_permissions",
                newName: "ad_group_name");

            migrationBuilder.RenameIndex(
                name: "IX_model_group_permissions_ModelId",
                table: "model_group_permissions",
                newName: "IX_model_group_permissions_model_id");

            migrationBuilder.RenameColumn(
                name: "Role",
                table: "model_collaborators",
                newName: "role");

            migrationBuilder.RenameColumn(
                name: "AssignedBy",
                table: "model_collaborators",
                newName: "assigned_by");

            migrationBuilder.RenameColumn(
                name: "AssignedAt",
                table: "model_collaborators",
                newName: "assigned_at");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "model_collaborators",
                newName: "user_id");

            migrationBuilder.RenameColumn(
                name: "ModelId",
                table: "model_collaborators",
                newName: "model_id");

            migrationBuilder.RenameIndex(
                name: "IX_model_collaborators_Role",
                table: "model_collaborators",
                newName: "IX_model_collaborators_role");

            migrationBuilder.RenameIndex(
                name: "IX_model_collaborators_UserId",
                table: "model_collaborators",
                newName: "IX_model_collaborators_user_id");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "model_changes",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "VersionId",
                table: "model_changes",
                newName: "version_id");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "model_changes",
                newName: "user_id");

            migrationBuilder.RenameColumn(
                name: "SqlScript",
                table: "model_changes",
                newName: "sql_script");

            migrationBuilder.RenameColumn(
                name: "ModelId",
                table: "model_changes",
                newName: "model_id");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "model_changes",
                newName: "created_at");

            migrationBuilder.RenameColumn(
                name: "ChangeType",
                table: "model_changes",
                newName: "change_type");

            migrationBuilder.RenameIndex(
                name: "IX_model_changes_UserId",
                table: "model_changes",
                newName: "IX_model_changes_user_id");

            migrationBuilder.RenameIndex(
                name: "IX_model_changes_ModelId",
                table: "model_changes",
                newName: "IX_model_changes_model_id");

            migrationBuilder.RenameIndex(
                name: "IX_model_changes_CreatedAt",
                table: "model_changes",
                newName: "IX_model_changes_created_at");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "editing_sessions",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "editing_sessions",
                newName: "user_id");

            migrationBuilder.RenameColumn(
                name: "StartedAt",
                table: "editing_sessions",
                newName: "started_at");

            migrationBuilder.RenameColumn(
                name: "ModelId",
                table: "editing_sessions",
                newName: "model_id");

            migrationBuilder.RenameColumn(
                name: "IsActive",
                table: "editing_sessions",
                newName: "is_active");

            migrationBuilder.RenameIndex(
                name: "IX_editing_sessions_UserId",
                table: "editing_sessions",
                newName: "IX_editing_sessions_user_id");

            migrationBuilder.RenameIndex(
                name: "IX_editing_sessions_ModelId",
                table: "editing_sessions",
                newName: "IX_editing_sessions_model_id");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "devops_settings",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "devops_settings",
                newName: "updated_at");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "devops_settings",
                newName: "created_at");

            migrationBuilder.RenameColumn(
                name: "SettingValue",
                table: "devops_settings",
                newName: "test_message");

            migrationBuilder.RenameIndex(
                name: "idx_audit_logs_user_id",
                table: "audit_logs",
                newName: "IX_audit_logs_user_id");

            migrationBuilder.RenameIndex(
                name: "idx_audit_logs_timestamp",
                table: "audit_logs",
                newName: "IX_audit_logs_timestamp");

            migrationBuilder.RenameIndex(
                name: "idx_audit_logs_model_id",
                table: "audit_logs",
                newName: "IX_audit_logs_model_id");

            migrationBuilder.RenameIndex(
                name: "idx_audit_logs_action",
                table: "audit_logs",
                newName: "IX_audit_logs_action");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "ad_settings",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "ad_settings",
                newName: "updated_at");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "ad_settings",
                newName: "created_at");

            migrationBuilder.RenameColumn(
                name: "SettingValue",
                table: "ad_settings",
                newName: "test_message");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:uuid-ossp", ",,");

            migrationBuilder.AlterColumn<long>(
                name: "id",
                table: "yjs_updates",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigserial")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "yjs_updates",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AddColumn<Guid>(
                name: "model_id",
                table: "yjs_updates",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<int>(
                name: "version_clock",
                table: "yjs_updates",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<string>(
                name: "password_hash",
                table: "users",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ldap_distinguished_name",
                table: "users",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "last_login",
                table: "users",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "is_super_admin",
                table: "users",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<bool>(
                name: "is_active",
                table: "users",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<string>(
                name: "azure_ad_id",
                table: "users",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "id",
                table: "users",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldDefaultValueSql: "uuid_generate_v4()");

            migrationBuilder.AlterColumn<Guid>(
                name: "id",
                table: "repository_connections",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldDefaultValueSql: "uuid_generate_v4()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "repository_connections",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "repository_connections",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AddColumn<Guid>(
                name: "created_by",
                table: "repository_connections",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<bool>(
                name: "is_default",
                table: "repository_connections",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_enabled",
                table: "repository_connections",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<Guid>(
                name: "id",
                table: "models",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldDefaultValueSql: "uuid_generate_v4()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "models",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<string>(
                name: "database_dialect",
                table: "models",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "PostgreSQL",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true,
                oldDefaultValue: "PostgreSQL");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "models",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AddColumn<Guid>(
                name: "model_group_id",
                table: "models",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "project_metadata_json",
                table: "models",
                type: "text",
                nullable: false,
                defaultValue: "{}");

            migrationBuilder.AlterColumn<Guid>(
                name: "id",
                table: "model_versions",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldDefaultValueSql: "uuid_generate_v4()");

            migrationBuilder.AlterColumn<bool>(
                name: "is_locked",
                table: "model_versions",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "model_versions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<string>(
                name: "change_summary",
                table: "model_versions",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "id",
                table: "model_group_permissions",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldDefaultValueSql: "uuid_generate_v4()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "model_group_permissions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "assigned_at",
                table: "model_collaborators",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<long>(
                name: "id",
                table: "model_changes",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigserial")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "model_changes",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<string>(
                name: "change_type",
                table: "model_changes",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "id",
                table: "editing_sessions",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldDefaultValueSql: "uuid_generate_v4()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "started_at",
                table: "editing_sessions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<bool>(
                name: "is_active",
                table: "editing_sessions",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "cursor_position",
                table: "editing_sessions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "last_activity",
                table: "editing_sessions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<string>(
                name: "session_color",
                table: "editing_sessions",
                type: "text",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "id",
                table: "devops_settings",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldDefaultValueSql: "uuid_generate_v4()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "devops_settings",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "devops_settings",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AddColumn<string>(
                name: "collection_name",
                table: "devops_settings",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "instance_url",
                table: "devops_settings",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "is_enabled",
                table: "devops_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "pat_token",
                table: "devops_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "test_status",
                table: "devops_settings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "test_timestamp",
                table: "devops_settings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "timestamp",
                table: "audit_logs",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "audit_logs",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<long>(
                name: "id",
                table: "audit_logs",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldDefaultValueSql: "uuid_generate_v4()")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<Guid>(
                name: "id",
                table: "ad_settings",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldDefaultValueSql: "uuid_generate_v4()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "ad_settings",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "ad_settings",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AddColumn<string>(
                name: "config",
                table: "ad_settings",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "is_enabled",
                table: "ad_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "provider_type",
                table: "ad_settings",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "test_status",
                table: "ad_settings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "test_timestamp",
                table: "ad_settings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "application_roles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    display_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    permissions_json = table.Column<string>(type: "text", nullable: true),
                    is_system = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_application_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "change_requests",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    change_code = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    model_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requester_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    workflow_stages_json = table.Column<string>(type: "text", nullable: false),
                    current_stage_index = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_change_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_change_requests_models_model_id",
                        column: x => x.model_id,
                        principalTable: "models",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_change_requests_users_requester_id",
                        column: x => x.requester_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "database_systems",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    key = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_database_systems", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "devops_repository_mappings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    model_id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    repository_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    branch_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false, defaultValue: "main"),
                    file_path = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    is_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_devops_repository_mappings", x => x.id);
                    table.ForeignKey(
                        name: "FK_devops_repository_mappings_models_model_id",
                        column: x => x.model_id,
                        principalTable: "models",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "model_groups",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_model_groups", x => x.id);
                    table.ForeignKey(
                        name: "FK_model_groups_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "project_metadata_field_definitions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    field_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    display_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    field_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "text"),
                    is_required = table.Column<bool>(type: "boolean", nullable: false),
                    is_system = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    options_json = table.Column<string>(type: "text", nullable: false, defaultValue: "[]"),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_metadata_field_definitions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "workflow_templates",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    stages_json = table.Column<string>(type: "text", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workflow_templates", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "user_application_roles",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assigned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    assigned_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_application_roles", x => new { x.user_id, x.role_id });
                    table.ForeignKey(
                        name: "FK_user_application_roles_application_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "application_roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_application_roles_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "change_request_approval_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    change_request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action_by = table.Column<Guid>(type: "uuid", nullable: false),
                    from_status = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    to_status = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    comment = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_change_request_approval_logs", x => x.id);
                    table.ForeignKey(
                        name: "FK_change_request_approval_logs_change_requests_change_request~",
                        column: x => x.change_request_id,
                        principalTable: "change_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_change_request_approval_logs_users_action_by",
                        column: x => x.action_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "change_request_details",
                columns: table => new
                {
                    change_request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    old_dbml_snapshot = table.Column<string>(type: "text", nullable: false),
                    new_dbml_snapshot = table.Column<string>(type: "text", nullable: false),
                    generated_sql = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_change_request_details", x => x.change_request_id);
                    table.ForeignKey(
                        name: "FK_change_request_details_change_requests_change_request_id",
                        column: x => x.change_request_id,
                        principalTable: "change_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "database_data_types",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    database_system_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    input_template = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    parameters_json = table.Column<string>(type: "text", nullable: false),
                    requires_length = table.Column<bool>(type: "boolean", nullable: false),
                    supports_precision_scale = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_database_data_types", x => x.id);
                    table.ForeignKey(
                        name: "FK_database_data_types_database_systems_database_system_id",
                        column: x => x.database_system_id,
                        principalTable: "database_systems",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_yjs_updates_created_at",
                table: "yjs_updates",
                column: "created_at",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_yjs_updates_model_id",
                table: "yjs_updates",
                column: "model_id");

            migrationBuilder.CreateIndex(
                name: "IX_repository_connections_created_by",
                table: "repository_connections",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_repository_connections_is_default",
                table: "repository_connections",
                column: "is_default");

            migrationBuilder.CreateIndex(
                name: "IX_models_model_group_id",
                table: "models",
                column: "model_group_id");

            migrationBuilder.CreateIndex(
                name: "IX_application_roles_is_active",
                table: "application_roles",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "IX_application_roles_name",
                table: "application_roles",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_change_request_approval_logs_action_by",
                table: "change_request_approval_logs",
                column: "action_by");

            migrationBuilder.CreateIndex(
                name: "IX_change_request_approval_logs_change_request_id",
                table: "change_request_approval_logs",
                column: "change_request_id");

            migrationBuilder.CreateIndex(
                name: "IX_change_request_approval_logs_created_at",
                table: "change_request_approval_logs",
                column: "created_at",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_change_requests_change_code",
                table: "change_requests",
                column: "change_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_change_requests_created_at",
                table: "change_requests",
                column: "created_at",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_change_requests_model_id",
                table: "change_requests",
                column: "model_id");

            migrationBuilder.CreateIndex(
                name: "IX_change_requests_requester_id",
                table: "change_requests",
                column: "requester_id");

            migrationBuilder.CreateIndex(
                name: "IX_change_requests_status",
                table: "change_requests",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_database_data_types_database_system_id_name",
                table: "database_data_types",
                columns: new[] { "database_system_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_database_data_types_is_active",
                table: "database_data_types",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "IX_database_systems_is_active",
                table: "database_systems",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "IX_database_systems_key",
                table: "database_systems",
                column: "key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_database_systems_name",
                table: "database_systems",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_devops_repository_mappings_model_id",
                table: "devops_repository_mappings",
                column: "model_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_model_groups_created_by",
                table: "model_groups",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_model_groups_name",
                table: "model_groups",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_project_metadata_field_definitions_field_key",
                table: "project_metadata_field_definitions",
                column: "field_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_project_metadata_field_definitions_is_active_sort_order",
                table: "project_metadata_field_definitions",
                columns: new[] { "is_active", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "IX_user_application_roles_role_id",
                table: "user_application_roles",
                column: "role_id");

            migrationBuilder.AddForeignKey(
                name: "FK_editing_sessions_models_model_id",
                table: "editing_sessions",
                column: "model_id",
                principalTable: "models",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_editing_sessions_users_user_id",
                table: "editing_sessions",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_model_changes_models_model_id",
                table: "model_changes",
                column: "model_id",
                principalTable: "models",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_model_changes_users_user_id",
                table: "model_changes",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_model_collaborators_models_model_id",
                table: "model_collaborators",
                column: "model_id",
                principalTable: "models",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_model_collaborators_users_user_id",
                table: "model_collaborators",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_model_group_permissions_models_model_id",
                table: "model_group_permissions",
                column: "model_id",
                principalTable: "models",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_model_versions_model_versions_parent_version_id",
                table: "model_versions",
                column: "parent_version_id",
                principalTable: "model_versions",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_model_versions_models_model_id",
                table: "model_versions",
                column: "model_id",
                principalTable: "models",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_model_versions_users_created_by",
                table: "model_versions",
                column: "created_by",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_models_model_groups_model_group_id",
                table: "models",
                column: "model_group_id",
                principalTable: "model_groups",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_models_users_owner_id",
                table: "models",
                column: "owner_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_repository_connections_users_created_by",
                table: "repository_connections",
                column: "created_by",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_yjs_updates_models_model_id",
                table: "yjs_updates",
                column: "model_id",
                principalTable: "models",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_yjs_updates_users_user_id",
                table: "yjs_updates",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_editing_sessions_models_model_id",
                table: "editing_sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_editing_sessions_users_user_id",
                table: "editing_sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_model_changes_models_model_id",
                table: "model_changes");

            migrationBuilder.DropForeignKey(
                name: "FK_model_changes_users_user_id",
                table: "model_changes");

            migrationBuilder.DropForeignKey(
                name: "FK_model_collaborators_models_model_id",
                table: "model_collaborators");

            migrationBuilder.DropForeignKey(
                name: "FK_model_collaborators_users_user_id",
                table: "model_collaborators");

            migrationBuilder.DropForeignKey(
                name: "FK_model_group_permissions_models_model_id",
                table: "model_group_permissions");

            migrationBuilder.DropForeignKey(
                name: "FK_model_versions_model_versions_parent_version_id",
                table: "model_versions");

            migrationBuilder.DropForeignKey(
                name: "FK_model_versions_models_model_id",
                table: "model_versions");

            migrationBuilder.DropForeignKey(
                name: "FK_model_versions_users_created_by",
                table: "model_versions");

            migrationBuilder.DropForeignKey(
                name: "FK_models_model_groups_model_group_id",
                table: "models");

            migrationBuilder.DropForeignKey(
                name: "FK_models_users_owner_id",
                table: "models");

            migrationBuilder.DropForeignKey(
                name: "FK_repository_connections_users_created_by",
                table: "repository_connections");

            migrationBuilder.DropForeignKey(
                name: "FK_yjs_updates_models_model_id",
                table: "yjs_updates");

            migrationBuilder.DropForeignKey(
                name: "FK_yjs_updates_users_user_id",
                table: "yjs_updates");

            migrationBuilder.DropTable(
                name: "change_request_approval_logs");

            migrationBuilder.DropTable(
                name: "change_request_details");

            migrationBuilder.DropTable(
                name: "database_data_types");

            migrationBuilder.DropTable(
                name: "devops_repository_mappings");

            migrationBuilder.DropTable(
                name: "model_groups");

            migrationBuilder.DropTable(
                name: "project_metadata_field_definitions");

            migrationBuilder.DropTable(
                name: "user_application_roles");

            migrationBuilder.DropTable(
                name: "workflow_templates");

            migrationBuilder.DropTable(
                name: "change_requests");

            migrationBuilder.DropTable(
                name: "database_systems");

            migrationBuilder.DropTable(
                name: "application_roles");

            migrationBuilder.DropIndex(
                name: "IX_yjs_updates_created_at",
                table: "yjs_updates");

            migrationBuilder.DropIndex(
                name: "IX_yjs_updates_model_id",
                table: "yjs_updates");

            migrationBuilder.DropIndex(
                name: "IX_repository_connections_created_by",
                table: "repository_connections");

            migrationBuilder.DropIndex(
                name: "IX_repository_connections_is_default",
                table: "repository_connections");

            migrationBuilder.DropIndex(
                name: "IX_models_model_group_id",
                table: "models");

            migrationBuilder.DropColumn(
                name: "model_id",
                table: "yjs_updates");

            migrationBuilder.DropColumn(
                name: "version_clock",
                table: "yjs_updates");

            migrationBuilder.DropColumn(
                name: "created_by",
                table: "repository_connections");

            migrationBuilder.DropColumn(
                name: "is_default",
                table: "repository_connections");

            migrationBuilder.DropColumn(
                name: "is_enabled",
                table: "repository_connections");

            migrationBuilder.DropColumn(
                name: "model_group_id",
                table: "models");

            migrationBuilder.DropColumn(
                name: "project_metadata_json",
                table: "models");

            migrationBuilder.DropColumn(
                name: "cursor_position",
                table: "editing_sessions");

            migrationBuilder.DropColumn(
                name: "last_activity",
                table: "editing_sessions");

            migrationBuilder.DropColumn(
                name: "session_color",
                table: "editing_sessions");

            migrationBuilder.DropColumn(
                name: "collection_name",
                table: "devops_settings");

            migrationBuilder.DropColumn(
                name: "instance_url",
                table: "devops_settings");

            migrationBuilder.DropColumn(
                name: "is_enabled",
                table: "devops_settings");

            migrationBuilder.DropColumn(
                name: "pat_token",
                table: "devops_settings");

            migrationBuilder.DropColumn(
                name: "test_status",
                table: "devops_settings");

            migrationBuilder.DropColumn(
                name: "test_timestamp",
                table: "devops_settings");

            migrationBuilder.DropColumn(
                name: "config",
                table: "ad_settings");

            migrationBuilder.DropColumn(
                name: "is_enabled",
                table: "ad_settings");

            migrationBuilder.DropColumn(
                name: "provider_type",
                table: "ad_settings");

            migrationBuilder.DropColumn(
                name: "test_status",
                table: "ad_settings");

            migrationBuilder.DropColumn(
                name: "test_timestamp",
                table: "ad_settings");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "yjs_updates",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "yjs_updates",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "user_id",
                table: "yjs_updates",
                newName: "SessionId");

            migrationBuilder.RenameColumn(
                name: "update_binary",
                table: "yjs_updates",
                newName: "Update");

            migrationBuilder.RenameIndex(
                name: "IX_yjs_updates_user_id",
                table: "yjs_updates",
                newName: "IX_yjs_updates_SessionId");

            migrationBuilder.RenameIndex(
                name: "IX_users_email_lower",
                table: "users",
                newName: "idx_users_email_lower");

            migrationBuilder.RenameIndex(
                name: "IX_users_email",
                table: "users",
                newName: "idx_users_email");

            migrationBuilder.RenameIndex(
                name: "IX_users_azure_ad_id",
                table: "users",
                newName: "idx_users_azure_ad_id");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "repository_connections",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "updated_at",
                table: "repository_connections",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "repository_connections",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "repository_connections",
                newName: "ConnectionName");

            migrationBuilder.RenameColumn(
                name: "database_type",
                table: "repository_connections",
                newName: "RepoType");

            migrationBuilder.RenameColumn(
                name: "connection_string",
                table: "repository_connections",
                newName: "AuthToken");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "models",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "description",
                table: "models",
                newName: "Description");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "models",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "updated_at",
                table: "models",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "repository_id",
                table: "models",
                newName: "RepositoryId");

            migrationBuilder.RenameColumn(
                name: "owner_id",
                table: "models",
                newName: "OwnerId");

            migrationBuilder.RenameColumn(
                name: "database_dialect",
                table: "models",
                newName: "DatabaseDialect");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "models",
                newName: "CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_models_owner_id",
                table: "models",
                newName: "idx_models_owner");

            migrationBuilder.RenameIndex(
                name: "IX_models_created_at",
                table: "models",
                newName: "idx_models_created_at");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "model_versions",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "version_number",
                table: "model_versions",
                newName: "VersionNumber");

            migrationBuilder.RenameColumn(
                name: "parent_version_id",
                table: "model_versions",
                newName: "ParentVersionId");

            migrationBuilder.RenameColumn(
                name: "model_id",
                table: "model_versions",
                newName: "ModelId");

            migrationBuilder.RenameColumn(
                name: "is_locked",
                table: "model_versions",
                newName: "IsLocked");

            migrationBuilder.RenameColumn(
                name: "dbml_content",
                table: "model_versions",
                newName: "DbmlContent");

            migrationBuilder.RenameColumn(
                name: "created_by",
                table: "model_versions",
                newName: "CreatedBy");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "model_versions",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "change_summary",
                table: "model_versions",
                newName: "ChangeSummary");

            migrationBuilder.RenameColumn(
                name: "branch_name",
                table: "model_versions",
                newName: "BranchName");

            migrationBuilder.RenameIndex(
                name: "IX_model_versions_parent_version_id",
                table: "model_versions",
                newName: "IX_model_versions_ParentVersionId");

            migrationBuilder.RenameIndex(
                name: "IX_model_versions_model_id_version_number",
                table: "model_versions",
                newName: "IX_model_versions_version_number");

            migrationBuilder.RenameIndex(
                name: "IX_model_versions_model_id",
                table: "model_versions",
                newName: "IX_model_versions_ModelId");

            migrationBuilder.RenameIndex(
                name: "IX_model_versions_created_by",
                table: "model_versions",
                newName: "IX_model_versions_CreatedBy");

            migrationBuilder.RenameColumn(
                name: "role",
                table: "model_group_permissions",
                newName: "Role");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "model_group_permissions",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "model_id",
                table: "model_group_permissions",
                newName: "ModelId");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "model_group_permissions",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "ad_group_name",
                table: "model_group_permissions",
                newName: "AdGroupName");

            migrationBuilder.RenameIndex(
                name: "IX_model_group_permissions_model_id",
                table: "model_group_permissions",
                newName: "IX_model_group_permissions_ModelId");

            migrationBuilder.RenameColumn(
                name: "role",
                table: "model_collaborators",
                newName: "Role");

            migrationBuilder.RenameColumn(
                name: "assigned_by",
                table: "model_collaborators",
                newName: "AssignedBy");

            migrationBuilder.RenameColumn(
                name: "assigned_at",
                table: "model_collaborators",
                newName: "AssignedAt");

            migrationBuilder.RenameColumn(
                name: "user_id",
                table: "model_collaborators",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "model_id",
                table: "model_collaborators",
                newName: "ModelId");

            migrationBuilder.RenameIndex(
                name: "IX_model_collaborators_role",
                table: "model_collaborators",
                newName: "IX_model_collaborators_Role");

            migrationBuilder.RenameIndex(
                name: "IX_model_collaborators_user_id",
                table: "model_collaborators",
                newName: "IX_model_collaborators_UserId");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "model_changes",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "version_id",
                table: "model_changes",
                newName: "VersionId");

            migrationBuilder.RenameColumn(
                name: "user_id",
                table: "model_changes",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "sql_script",
                table: "model_changes",
                newName: "SqlScript");

            migrationBuilder.RenameColumn(
                name: "model_id",
                table: "model_changes",
                newName: "ModelId");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "model_changes",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "change_type",
                table: "model_changes",
                newName: "ChangeType");

            migrationBuilder.RenameIndex(
                name: "IX_model_changes_user_id",
                table: "model_changes",
                newName: "IX_model_changes_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_model_changes_model_id",
                table: "model_changes",
                newName: "IX_model_changes_ModelId");

            migrationBuilder.RenameIndex(
                name: "IX_model_changes_created_at",
                table: "model_changes",
                newName: "IX_model_changes_CreatedAt");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "editing_sessions",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "user_id",
                table: "editing_sessions",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "started_at",
                table: "editing_sessions",
                newName: "StartedAt");

            migrationBuilder.RenameColumn(
                name: "model_id",
                table: "editing_sessions",
                newName: "ModelId");

            migrationBuilder.RenameColumn(
                name: "is_active",
                table: "editing_sessions",
                newName: "IsActive");

            migrationBuilder.RenameIndex(
                name: "IX_editing_sessions_user_id",
                table: "editing_sessions",
                newName: "IX_editing_sessions_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_editing_sessions_model_id",
                table: "editing_sessions",
                newName: "IX_editing_sessions_ModelId");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "devops_settings",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "updated_at",
                table: "devops_settings",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "devops_settings",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "test_message",
                table: "devops_settings",
                newName: "SettingValue");

            migrationBuilder.RenameIndex(
                name: "IX_audit_logs_user_id",
                table: "audit_logs",
                newName: "idx_audit_logs_user_id");

            migrationBuilder.RenameIndex(
                name: "IX_audit_logs_timestamp",
                table: "audit_logs",
                newName: "idx_audit_logs_timestamp");

            migrationBuilder.RenameIndex(
                name: "IX_audit_logs_model_id",
                table: "audit_logs",
                newName: "idx_audit_logs_model_id");

            migrationBuilder.RenameIndex(
                name: "IX_audit_logs_action",
                table: "audit_logs",
                newName: "idx_audit_logs_action");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "ad_settings",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "updated_at",
                table: "ad_settings",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "ad_settings",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "test_message",
                table: "ad_settings",
                newName: "SettingValue");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:uuid-ossp", ",,");

            migrationBuilder.AlterColumn<long>(
                name: "Id",
                table: "yjs_updates",
                type: "bigserial",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "yjs_updates",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "users",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<string>(
                name: "password_hash",
                table: "users",
                type: "character varying(255)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ldap_distinguished_name",
                table: "users",
                type: "character varying(500)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "last_login",
                table: "users",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "is_super_admin",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<bool>(
                name: "is_active",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "users",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<string>(
                name: "azure_ad_id",
                table: "users",
                type: "character varying(255)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "id",
                table: "users",
                type: "uuid",
                nullable: false,
                defaultValueSql: "uuid_generate_v4()",
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "repository_connections",
                type: "uuid",
                nullable: false,
                defaultValueSql: "uuid_generate_v4()",
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "repository_connections",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "repository_connections",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AddColumn<string>(
                name: "RepoUrl",
                table: "repository_connections",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "models",
                type: "uuid",
                nullable: false,
                defaultValueSql: "uuid_generate_v4()",
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "models",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<string>(
                name: "DatabaseDialect",
                table: "models",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                defaultValue: "PostgreSQL",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldDefaultValue: "PostgreSQL");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "models",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "model_versions",
                type: "uuid",
                nullable: false,
                defaultValueSql: "uuid_generate_v4()",
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<bool>(
                name: "IsLocked",
                table: "model_versions",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "model_versions",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<string>(
                name: "ChangeSummary",
                table: "model_versions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "model_group_permissions",
                type: "uuid",
                nullable: false,
                defaultValueSql: "uuid_generate_v4()",
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "model_group_permissions",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "AssignedAt",
                table: "model_collaborators",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<long>(
                name: "Id",
                table: "model_changes",
                type: "bigserial",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "model_changes",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<string>(
                name: "ChangeType",
                table: "model_changes",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "editing_sessions",
                type: "uuid",
                nullable: false,
                defaultValueSql: "uuid_generate_v4()",
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<DateTime>(
                name: "StartedAt",
                table: "editing_sessions",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "editing_sessions",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AddColumn<DateTime>(
                name: "EndedAt",
                table: "editing_sessions",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "devops_settings",
                type: "uuid",
                nullable: false,
                defaultValueSql: "uuid_generate_v4()",
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "devops_settings",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "devops_settings",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AddColumn<string>(
                name: "SettingKey",
                table: "devops_settings",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<DateTime>(
                name: "timestamp",
                table: "audit_logs",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "audit_logs",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<Guid>(
                name: "id",
                table: "audit_logs",
                type: "uuid",
                nullable: false,
                defaultValueSql: "uuid_generate_v4()",
                oldClrType: typeof(long),
                oldType: "bigint")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "ad_settings",
                type: "uuid",
                nullable: false,
                defaultValueSql: "uuid_generate_v4()",
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "ad_settings",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "ad_settings",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AddColumn<string>(
                name: "SettingKey",
                table: "ad_settings",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_model_collaborators_AssignedBy",
                table: "model_collaborators",
                column: "AssignedBy");

            migrationBuilder.CreateIndex(
                name: "IX_devops_settings_setting_key",
                table: "devops_settings",
                column: "SettingKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ad_settings_setting_key",
                table: "ad_settings",
                column: "SettingKey",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_editing_sessions_models_ModelId",
                table: "editing_sessions",
                column: "ModelId",
                principalTable: "models",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_editing_sessions_users_UserId",
                table: "editing_sessions",
                column: "UserId",
                principalTable: "users",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_model_changes_model_versions_VersionId",
                table: "model_changes",
                column: "VersionId",
                principalTable: "model_versions",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_model_changes_models_ModelId",
                table: "model_changes",
                column: "ModelId",
                principalTable: "models",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_model_changes_users_UserId",
                table: "model_changes",
                column: "UserId",
                principalTable: "users",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_model_collaborators_models_ModelId",
                table: "model_collaborators",
                column: "ModelId",
                principalTable: "models",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_model_collaborators_users_AssignedBy",
                table: "model_collaborators",
                column: "AssignedBy",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_model_collaborators_users_UserId",
                table: "model_collaborators",
                column: "UserId",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_model_group_permissions_models_ModelId",
                table: "model_group_permissions",
                column: "ModelId",
                principalTable: "models",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_model_versions_model_versions_ParentVersionId",
                table: "model_versions",
                column: "ParentVersionId",
                principalTable: "model_versions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_model_versions_models_ModelId",
                table: "model_versions",
                column: "ModelId",
                principalTable: "models",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_model_versions_users_CreatedBy",
                table: "model_versions",
                column: "CreatedBy",
                principalTable: "users",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_models_users_OwnerId",
                table: "models",
                column: "OwnerId",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_yjs_updates_editing_sessions_SessionId",
                table: "yjs_updates",
                column: "SessionId",
                principalTable: "editing_sessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
