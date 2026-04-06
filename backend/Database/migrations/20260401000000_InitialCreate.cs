using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DataModeler.API.Database.migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:uuid-ossp", ",,");

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuid_generate_v4()"),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    email_lower = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    password_hash = table.Column<string>(type: "character varying(255)", nullable: true),
                    azure_ad_id = table.Column<string>(type: "character varying(255)", nullable: true),
                    ldap_distinguished_name = table.Column<string>(type: "character varying(500)", nullable: true),
                    is_super_admin = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    last_login = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "models",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuid_generate_v4()"),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    repository_id = table.Column<Guid>(type: "uuid", nullable: true),
                    database_dialect = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true, defaultValue: "PostgreSQL"),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_models", x => x.id);
                    table.ForeignKey(
                        name: "FK_models_users_owner_id",
                        column: x => x.owner_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuid_generate_v4()"),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    model_id = table.Column<Guid>(type: "uuid", nullable: true),
                    target_table_name = table.Column<string>(type: "text", nullable: true),
                    ip_address = table.Column<string>(type: "text", nullable: true),
                    user_agent = table.Column<string>(type: "text", nullable: true),
                    details = table.Column<string>(type: "text", nullable: true),
                    timestamp = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.id);
                    table.ForeignKey(
                        name: "FK_audit_logs_models_model_id",
                        column: x => x.model_id,
                        principalTable: "models",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_audit_logs_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "model_versions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuid_generate_v4()"),
                    model_id = table.Column<Guid>(type: "uuid", nullable: false),
                    dbml_content = table.Column<string>(type: "text", nullable: false),
                    version_number = table.Column<int>(type: "integer", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    change_summary = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    parent_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    branch_name = table.Column<string>(type: "text", nullable: false, defaultValue: "main"),
                    is_locked = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_model_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_model_versions_model_versions_parent_version_id",
                        column: x => x.parent_version_id,
                        principalTable: "model_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_model_versions_models_model_id",
                        column: x => x.model_id,
                        principalTable: "models",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_model_versions_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "model_changes",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigserial", nullable: false),
                    model_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    change_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    sql_script = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_model_changes", x => x.id);
                    table.ForeignKey(
                        name: "FK_model_changes_models_model_id",
                        column: x => x.model_id,
                        principalTable: "models",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_model_changes_model_versions_version_id",
                        column: x => x.version_id,
                        principalTable: "model_versions",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_model_changes_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "model_collaborators",
                columns: table => new
                {
                    model_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    assigned_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    assigned_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_model_collaborators", x => new { x.model_id, x.user_id });
                    table.ForeignKey(
                        name: "FK_model_collaborators_models_model_id",
                        column: x => x.model_id,
                        principalTable: "models",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_model_collaborators_users_assigned_by",
                        column: x => x.assigned_by,
                        principalTable: "users",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_model_collaborators_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "model_group_permissions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuid_generate_v4()"),
                    model_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ad_group_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_model_group_permissions", x => x.id);
                    table.ForeignKey(
                        name: "FK_model_group_permissions_models_model_id",
                        column: x => x.model_id,
                        principalTable: "models",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "editing_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuid_generate_v4()"),
                    model_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    ended_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_editing_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_editing_sessions_models_model_id",
                        column: x => x.model_id,
                        principalTable: "models",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_editing_sessions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "yjs_updates",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigserial", nullable: false),
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    update = table.Column<byte[]>(type: "bytea", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_yjs_updates", x => x.id);
                    table.ForeignKey(
                        name: "FK_yjs_updates_editing_sessions_session_id",
                        column: x => x.session_id,
                        principalTable: "editing_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ad_settings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuid_generate_v4()"),
                    setting_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    setting_value = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ad_settings", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "devops_settings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuid_generate_v4()"),
                    setting_key = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    setting_value = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_devops_settings", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "repository_connections",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuid_generate_v4()"),
                    connection_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    repo_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    repo_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    auth_token = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_repository_connections", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_models_owner",
                table: "models",
                column: "owner_id");

            migrationBuilder.CreateIndex(
                name: "idx_models_created_at",
                table: "models",
                column: "created_at",
                descending: new bool[] { true });

            migrationBuilder.CreateIndex(
                name: "idx_audit_logs_user_id",
                table: "audit_logs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "idx_audit_logs_model_id",
                table: "audit_logs",
                column: "model_id");

            migrationBuilder.CreateIndex(
                name: "idx_audit_logs_action",
                table: "audit_logs",
                column: "action");

            migrationBuilder.CreateIndex(
                name: "idx_audit_logs_timestamp",
                table: "audit_logs",
                column: "timestamp",
                descending: new bool[] { true });

            migrationBuilder.CreateIndex(
                name: "IX_model_changes_model_id",
                table: "model_changes",
                column: "model_id");

            migrationBuilder.CreateIndex(
                name: "IX_model_changes_user_id",
                table: "model_changes",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_model_changes_created_at",
                table: "model_changes",
                column: "created_at",
                descending: new bool[] { true });

            migrationBuilder.CreateIndex(
                name: "IX_model_collaborators_user_id",
                table: "model_collaborators",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_model_collaborators_role",
                table: "model_collaborators",
                column: "role");

            migrationBuilder.CreateIndex(
                name: "IX_model_group_permissions_model_id",
                table: "model_group_permissions",
                column: "model_id");

            migrationBuilder.CreateIndex(
                name: "IX_editing_sessions_model_id",
                table: "editing_sessions",
                column: "model_id");

            migrationBuilder.CreateIndex(
                name: "IX_editing_sessions_user_id",
                table: "editing_sessions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_yjs_updates_session_id",
                table: "yjs_updates",
                column: "session_id");

            migrationBuilder.CreateIndex(
                name: "idx_users_email_lower",
                table: "users",
                column: "email_lower",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_users_azure_ad_id",
                table: "users",
                column: "azure_ad_id");

            migrationBuilder.CreateIndex(
                name: "IX_model_versions_model_id",
                table: "model_versions",
                column: "model_id");

            migrationBuilder.CreateIndex(
                name: "IX_model_versions_version_number",
                table: "model_versions",
                columns: new[] { "model_id", "version_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_model_versions_created_by",
                table: "model_versions",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_ad_settings_setting_key",
                table: "ad_settings",
                column: "setting_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_devops_settings_setting_key",
                table: "devops_settings",
                column: "setting_key",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "yjs_updates");

            migrationBuilder.DropTable(
                name: "ad_settings");

            migrationBuilder.DropTable(
                name: "devops_settings");

            migrationBuilder.DropTable(
                name: "repository_connections");

            migrationBuilder.DropTable(
                name: "model_group_permissions");

            migrationBuilder.DropTable(
                name: "model_collaborators");

            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "model_changes");

            migrationBuilder.DropTable(
                name: "editing_sessions");

            migrationBuilder.DropTable(
                name: "model_versions");

            migrationBuilder.DropTable(
                name: "models");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
