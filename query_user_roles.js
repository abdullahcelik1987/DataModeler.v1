const { Client } = require('pg');

const dbHost = process.env.DM_DB_HOST || 'localhost';
const dbPort = Number.parseInt(process.env.DM_DB_PORT || '5432', 10);
const dbName = process.env.DM_DB_NAME || 'datamodeler_app';
const dbUser = process.env.DM_DB_USER || 'datamodeler_user';
const dbPassword = process.env.DM_DB_PASSWORD;
const targetEmail = process.env.DM_TARGET_EMAIL || 'sdeveloper@kurumsal.local';

if (!dbPassword) {
  throw new Error('DM_DB_PASSWORD environment variable is required.');
}

const client = new Client({
  host: dbHost,
  port: dbPort,
  database: dbName,
  user: dbUser,
  password: dbPassword
});

async function checkUserRoles() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Step 1: Find user ID for target email
    const userQuery = 'SELECT id, email FROM users WHERE email = $1';
    const userResult = await client.query(userQuery, [targetEmail]);
    
    if (userResult.rows.length === 0) {
      console.log(`User not found: ${targetEmail}`);
      await client.end();
      return;
    }

    const userId = userResult.rows[0].id;
    console.log(`Found user ID: ${userId} for email: ${userResult.rows[0].email}`);

    // Step 2: Check application roles for this user
    const rolesQuery = `
      SELECT uar.role_name, uar.scope, uar.scope_value 
      FROM user_application_roles uar 
      WHERE uar.user_id = $1
    `;
    
    const rolesResult = await client.query(rolesQuery, [userId]);
    
    console.log(`\nUser Application Roles for ${targetEmail}:`);
    if (rolesResult.rows.length === 0) {
      console.log('NO - User has no application roles assigned');
    } else {
      console.log('YES - User has the following roles:');
      rolesResult.rows.forEach(row => {
        console.log(`  - ${row.role_name} (Scope: ${row.scope || 'global'}, Value: ${row.scope_value || 'N/A'})`);
      });
      
      const hasDeveloperRole = rolesResult.rows.some(r => r.role_name.toLowerCase().includes('developer'));
      console.log(`\nHas 'developer' role: ${hasDeveloperRole ? 'YES' : 'NO'}`);
    }

    await client.end();
  } catch (error) {
    console.error('Database Error:', error.message);
    process.exit(1);
  }
}

checkUserRoles();
