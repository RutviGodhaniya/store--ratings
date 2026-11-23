import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

const storeSchema = z.object({
  name: z.string().trim().min(20).max(60),
  email: z.string().trim().email().max(254),
  address: z.string().trim().min(1).max(400),
  ownerEmail: z.union([z.string().trim().email().max(254), z.literal('')]).optional(),
});

const userSchema = z.object({
  name: z.string().trim().min(20).max(60),
  email: z.string().trim().email().max(254),
  password: z.string()
    .min(8)
    .max(16)
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[^A-Za-z0-9\s]/, 'Password must include a special character'),
  address: z.string().trim().min(1).max(400),
  role: z.enum(['user', 'admin', 'store_owner']),
});

router.get('/summary', async (_request, response) => {
  try {
    const result = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM users) AS total_users,
         (SELECT COUNT(*) FROM stores) AS total_stores,
         (SELECT COUNT(*) FROM ratings) AS total_ratings`,
    );
    return response.json({ summary: result.rows[0] });
  } catch (error) {
    console.error('Could not load admin summary:', error.message);
    return response.status(500).json({ message: 'Could not load dashboard summary' });
  }
});

router.get('/stores', async (request, response) => {
  const search = `%${String(request.query.search || '').trim()}%`;
  const sortColumns = {
    name: 's.name',
    email: 's.email',
    address: 's.address',
    overall_rating: 'overall_rating',
  };
  const sortColumn = sortColumns[request.query.sortBy] || sortColumns.name;
  const direction = String(request.query.order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.email, s.address,
              ROUND(AVG(r.score)::numeric, 2) AS overall_rating,
              COUNT(r.id)::int AS rating_count
       FROM stores s
       LEFT JOIN ratings r ON r.store_id = s.id
       WHERE s.name ILIKE $1 OR s.email ILIKE $1 OR s.address ILIKE $1
       GROUP BY s.id
       ORDER BY ${sortColumn} ${direction} NULLS LAST, s.id ASC`,
      [search],
    );
    return response.json({ stores: result.rows });
  } catch (error) {
    console.error('Could not load admin stores:', error.message);
    return response.status(500).json({ message: 'Could not load stores' });
  }
});

router.get('/users', async (request, response) => {
  const search = `%${String(request.query.search || '').trim()}%`;
  const roles = ['user', 'admin', 'store_owner'];
  const role = roles.includes(request.query.role) ? request.query.role : 'all';
  const sortColumns = {
    name: 'u.name',
    email: 'u.email',
    address: 'u.address',
    role: 'u.role',
  };
  const sortColumn = sortColumns[request.query.sortBy] || sortColumns.name;
  const direction = String(request.query.order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.address, u.role,
              ROUND(AVG(r.score)::numeric, 2) AS store_rating
       FROM users u
       LEFT JOIN stores s ON s.owner_user_id = u.id
       LEFT JOIN ratings r ON r.store_id = s.id
       WHERE ($2 = 'all' OR u.role = $2)
         AND (u.name ILIKE $1 OR u.email ILIKE $1 OR u.address ILIKE $1 OR u.role ILIKE $1)
       GROUP BY u.id, s.id
       ORDER BY ${sortColumn} ${direction}, u.id ASC`,
      [search, role],
    );
    return response.json({ users: result.rows });
  } catch (error) {
    console.error('Could not load admin users:', error.message);
    return response.status(500).json({ message: 'Could not load users' });
  }
});

router.post('/users', async (request, response) => {
  const parsed = userSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      message: 'Please check the user details',
      errors: parsed.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
    });
  }

  const { name, email, password, address, role } = parsed.data;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, address, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, address, role`,
      [name, email.toLowerCase(), passwordHash, address, role],
    );
    return response.status(201).json({ user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return response.status(409).json({ message: 'An account with this email already exists' });
    }
    console.error('Could not create admin-managed user:', error.message);
    return response.status(500).json({ message: 'Could not create user' });
  }
});

router.post('/stores', async (request, response) => {
  const parsed = storeSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      message: 'Please check the store details',
      errors: parsed.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
    });
  }

  const { name, email, address, ownerEmail } = parsed.data;
  try {
    let ownerUserId = null;
    if (ownerEmail) {
      const ownerResult = await pool.query(
        `SELECT id FROM users WHERE email = $1 AND role = 'store_owner'`,
        [ownerEmail.toLowerCase()],
      );
      if (ownerResult.rowCount === 0) {
        return response.status(400).json({ message: 'Create a store-owner account first, then enter its email here' });
      }
      ownerUserId = ownerResult.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO stores (name, email, address, owner_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, address`,
      [name, email.toLowerCase(), address, ownerUserId],
    );
    return response.status(201).json({ store: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return response.status(409).json({ message: 'This store email is already used, or the owner already has a store' });
    }
    console.error('Could not create store:', error.message);
    return response.status(500).json({ message: 'Could not create store' });
  }
});

export default router;
