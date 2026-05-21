const jwt = require('jsonwebtoken');

const secret = process.env.DM_JWT_SECRET;
const userId = process.env.DM_USER_ID || '550e8400-e29b-41d4-a716-446655440000';
const userEmail = process.env.DM_USER_EMAIL || 'test@example.com';

if (!secret) {
  throw new Error('DM_JWT_SECRET environment variable is required.');
}

const token = jwt.sign(
  {
    sub: userId,
    email: userEmail,
    iat: Math.floor(Date.now() / 1000)
  },
  secret,
  { expiresIn: '1h' }
);

console.log(token);
