import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const registrationSchema = z.object({
  name: z.string().trim().min(20).max(60),
  email: z.string().trim().email().max(254),
  address: z.string().trim().min(1).max(400),
  password: z.string()
    .min(8)
    .max(16)
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[^A-Za-z0-9\s]/, 'Password must include a special character'),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string()
    .min(8)
    .max(16)
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[^A-Za-z0-9\s]/, 'Password must include a special character'),
});

function createToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.startsWith('replace_')) {
    throw new Error('Set a private JWT_SECRET in server/.env before using authentication');
  }

  return jwt.sign({ role: user.role }, secret, {
    subject: String(user.id),
    expiresIn: '1d',
  });
}

function jwtIsConfigured() {
  const secret = process.env.JWT_SECRET;
  return Boolean(secret && !secret.startsWith('replace_'));
}

router.post('/register', async (request, response) => {
  const parsed = registrationSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      message: 'Please check the signup details',
      errors: parsed.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
    });
  }

  const { name, email, address, password } = parsed.data;

  if (!jwtIsConfigured()) {
    return response.status(503).json({ message: 'Authentication is not configured on the server' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, address, role)
       VALUES ($1, $2, $3, $4, 'user')
       RETURNING id, name, email, address, role`,
      [name, email.toLowerCase(), passwordHash, address],
    );

    const user = result.rows[0];
    const token = createToken(user);
    return response.status(201).json({ user, token });
  } catch (error) {
    if (error.code === '23505') {
      return response.status(409).json({ message: 'An account with this email already exists' });
    }
    console.error('Signup failed:', error.message);
    return response.status(500).json({ message: 'Could not create the account' });
  }
});

router.post('/login', async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: 'Enter a valid email and password' });
  }

  if (!jwtIsConfigured()) {
    return response.status(503).json({ message: 'Authentication is not configured on the server' });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, address, role, password_hash
       FROM users WHERE email = $1`,
      [parsed.data.email.toLowerCase()],
    );

    const user = result.rows[0];
    const passwordMatches = user && await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!passwordMatches) {
      return response.status(401).json({ message: 'Email or password is incorrect' });
    }

    const { password_hash: _passwordHash, ...publicUser } = user;
    const token = createToken(publicUser);
    return response.json({ user: publicUser, token });
  } catch (error) {
    console.error('Login failed:', error.message);
    return response.status(500).json({ message: 'Could not log in' });
  }
});

router.put('/password', requireAuth, async (request, response) => {
  const parsed = passwordChangeSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      message: 'New password must be 8–16 characters with an uppercase letter and a special character',
    });
  }

  try {
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [request.user.id],
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.password_hash))) {
      return response.status(401).json({ message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, request.user.id],
    );
    return response.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Could not update password:', error.message);
    return response.status(500).json({ message: 'Could not update password' });
  }
});

export default router;
