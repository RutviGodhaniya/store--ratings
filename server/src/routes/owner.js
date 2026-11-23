import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('store_owner'));

router.get('/dashboard', async (request, response) => {
  try {
    const storeResult = await pool.query(
      `SELECT s.id, s.name, s.email, s.address,
              ROUND(AVG(r.score)::numeric, 2) AS average_rating,
              COUNT(r.id)::int AS rating_count
       FROM stores s
       LEFT JOIN ratings r ON r.store_id = s.id
       WHERE s.owner_user_id = $1
       GROUP BY s.id`,
      [request.user.id],
    );

    if (storeResult.rowCount === 0) {
      return response.json({ store: null, ratings: [] });
    }

    const store = storeResult.rows[0];
    const ratingsResult = await pool.query(
      `SELECT u.name AS user_name, u.email AS user_email,
              r.score, r.updated_at
       FROM ratings r
       JOIN users u ON u.id = r.user_id
       WHERE r.store_id = $1
       ORDER BY r.updated_at DESC, r.id DESC`,
      [store.id],
    );

    return response.json({ store, ratings: ratingsResult.rows });
  } catch (error) {
    console.error('Could not load owner dashboard:', error.message);
    return response.status(500).json({ message: 'Could not load store-owner dashboard' });
  }
});

export default router;
