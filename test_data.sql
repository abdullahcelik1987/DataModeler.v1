-- Insert test user
INSERT INTO users (id, email, name, password_hash, created_at, updated_at, last_login)
VALUES ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'test@example.com', 'Test User', 'hash', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test model
INSERT INTO models (id, name, description, owner_id, created_at, updated_at, last_modified_by)
VALUES ('660e8400-e29b-41d4-a716-446655440001'::uuid, 'Test Model', 'Test Description', '550e8400-e29b-41d4-a716-446655440000'::uuid, NOW(), NOW(), '550e8400-e29b-41d4-a716-446655440000'::uuid)
ON CONFLICT (id) DO NOTHING;

-- Insert test model version
INSERT INTO model_versions (id, model_id, version_number, dbml_content, branch_name, created_by, created_at, updated_at)
VALUES ('770e8400-e29b-41d4-a716-446655440002'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, 1, 'Project test_db { Note: "Test" }', 'main', '550e8400-e29b-41d4-a716-446655440000'::uuid, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

SELECT COUNT(*) as model_count FROM models;
SELECT COUNT(*) as user_count FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
