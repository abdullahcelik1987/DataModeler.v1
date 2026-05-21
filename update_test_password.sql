-- Create test user password (bcrypt hash of "testpassword123")
UPDATE users 
SET password_hash = '$2b$12$K9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jKMom' 
WHERE email = 'test@example.com';

SELECT id, email, password_hash FROM users WHERE email = 'test@example.com';
