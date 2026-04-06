-- DataModeler.v1 PostgreSQL Schema
-- Created for web-based DBML modeling tool

-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_lower VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  azure_ad_id VARCHAR(255),
  ldap_distinguished_name VARCHAR(500),
  is_super_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email_lower ON users(email_lower);
CREATE INDEX idx_users_azure_ad_id ON users(azure_ad_id);

-- ============================================================================
-- MODELS & VERSIONING
-- ============================================================================

CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT,
  repository_id UUID,
  database_dialect VARCHAR(50), -- 'PostgreSQL', 'SqlServer', 'MySQL', 'Oracle'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_models_owner ON models(owner_id);
CREATE INDEX idx_models_created_at ON models(created_at DESC);

-- Model versions for Git-like history
CREATE TABLE model_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  dbml_content TEXT NOT NULL,
  version_number INT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  change_summary VARCHAR(500),
  parent_version_id UUID REFERENCES model_versions(id),
  branch_name VARCHAR(100) DEFAULT 'main',
  is_locked BOOLEAN DEFAULT false
);

CREATE INDEX idx_model_versions_model_id ON model_versions(model_id);
CREATE INDEX idx_model_versions_version_number ON model_versions(model_id, version_number);
CREATE INDEX idx_model_versions_created_by ON model_versions(created_by);
CREATE UNIQUE INDEX uidx_model_version_per_model ON model_versions(model_id, version_number);

-- Model changes (SQL migrations)
CREATE TABLE model_changes (
  id BIGSERIAL PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  version_id UUID REFERENCES model_versions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  change_type VARCHAR(50), -- 'structure', 'data', 'constraint'
  sql_script TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_model_changes_model_id ON model_changes(model_id);
CREATE INDEX idx_model_changes_user_id ON model_changes(user_id);
CREATE INDEX idx_model_changes_created_at ON model_changes(created_at DESC);

-- ============================================================================
-- COLLABORATION & ACCESS CONTROL
-- ============================================================================

CREATE TABLE model_collaborators (
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'viewer', 'editor', 'owner'
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  PRIMARY KEY (model_id, user_id)
);

CREATE INDEX idx_model_collaborators_user_id ON model_collaborators(user_id);
CREATE INDEX idx_model_collaborators_role ON model_collaborators(role);

-- Model-level group assignments (AD groups)
CREATE TABLE model_group_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  ad_group_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'viewer', 'editor', 'owner'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_model_group_permissions_model_id ON model_group_permissions(model_id);

-- ============================================================================
-- AUDIT & LOGGING
-- ============================================================================

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- 'login', 'create_model', 'edit_model', 'delete_model', 'save_version', 'export'
  model_id UUID REFERENCES models(id),
  target_table_name VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_model_id ON audit_logs(model_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Model real-time editing sessions
CREATE TABLE editing_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  cursor_position INT,
  session_color VARCHAR(7), -- Hex color for user cursor
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_editing_sessions_model_id ON editing_sessions(model_id);
CREATE INDEX idx_editing_sessions_user_id ON editing_sessions(user_id);

-- ============================================================================
-- SETTINGS & CONFIGURATION
-- ============================================================================

-- Active Directory Settings
CREATE TABLE ad_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_type VARCHAR(50) NOT NULL, -- 'ldap', 'azure_ad'
  is_enabled BOOLEAN DEFAULT false,
  config JSONB NOT NULL, -- Encrypted JSON with connection details
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  test_status VARCHAR(20), -- 'pending', 'success', 'failed'
  test_message TEXT,
  test_timestamp TIMESTAMP
);

-- Azure DevOps Settings
CREATE TABLE devops_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_url VARCHAR(500) NOT NULL,
  collection_name VARCHAR(255) NOT NULL,
  pat_token VARCHAR(500), -- Personal Access Token (encrypted)
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  test_status VARCHAR(20),
  test_message TEXT,
  test_timestamp TIMESTAMP
);

-- Repository Connections
CREATE TABLE repository_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  connection_string VARCHAR(1000), -- Encrypted
  database_type VARCHAR(50) NOT NULL, -- 'PostgreSQL', 'SqlServer', 'MySQL', 'Oracle'
  is_default BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_repository_connections_created_by ON repository_connections(created_by);
CREATE INDEX idx_repository_connections_is_default ON repository_connections(is_default);

-- ============================================================================
-- REAL-TIME SYNC STATE
-- ============================================================================

-- WebSocket sync updates (for yjs CRDT state)
CREATE TABLE yjs_updates (
  id BIGSERIAL PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  update_binary BYTEA NOT NULL, -- Serialized yjs update
  version_clock INT NOT NULL, -- Lamport clock for ordering
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_yjs_updates_model_id ON yjs_updates(model_id);
CREATE INDEX idx_yjs_updates_created_at ON yjs_updates(created_at DESC);

-- ============================================================================
-- DATA INTEGRITY TRIGGERS
-- ============================================================================

-- Auto-update 'updated_at' on users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();

-- Auto-update 'updated_at' on models
CREATE OR REPLACE FUNCTION update_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_models_updated_at
BEFORE UPDATE ON models
FOR EACH ROW
EXECUTE FUNCTION update_models_updated_at();

-- Auto-update 'updated_at' on devops_settings
CREATE OR REPLACE FUNCTION update_devops_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_devops_settings_updated_at
BEFORE UPDATE ON devops_settings
FOR EACH ROW
EXECUTE FUNCTION update_devops_settings_updated_at();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert super admin user
INSERT INTO users (email, email_lower, password_hash, is_super_admin, is_active)
VALUES (
  'admin@datamodeler.local',
  'admin@datamodeler.local',
  '$2b$12$PEHvZtHkPnYyI8R1B6vG6OHUJ7bCvHHmQ1z.TgaJ0PrPn9gxLqVyi', -- bcrypt hash of 'ktdm123456'
  true,
  true
)
ON CONFLICT (email_lower) DO NOTHING;

COMMIT;
