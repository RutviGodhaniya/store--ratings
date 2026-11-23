import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const ratingSchema = z.object({ score: z.coerce.number().int().min(1).max(5) });

router.get('/', requireAuth, async (request, response) => {
  const search = String(request.query.search || '').trim();
  const sortColumns = {
    name: 's.name',
    address: 's.address',
    overall_rating: 'overall_rating',
  };
  const sortColumn = sortColumns[request.query.sortBy] || sortColumns.name;
  const direction = String(request.query.order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.email, s.address,
              ROUND(AVG(r.score)::numeric, 2) AS overall_rating,
              COUNT(r.id)::int AS rating_count,
              MAX(r.score) FILTER (WHERE r.user_id = $1) AS user_rating
       FROM stores s
       LEFT JOIN ratings r ON r.store_id = s.id
       WHERE s.name ILIKE $2 OR s.address ILIKE $2
       GROUP BY s.id
       ORDER BY ${sortColumn} ${direction}, s.id ASC`,
      [request.user.id, `%${search}%`],
    );
    return response.json({ stores: result.rows });
  } catch (error) {
    console.error('Could not load stores:', error.message);
    return response.status(500).json({ message: 'Could not load stores' });
  }
});

router.put('/:storeId/rating', requireAuth, requireRole('user'), async (request, response) => {
  const parsed = ratingSchema.safeParse(request.body);
  const storeId = Number(request.params.storeId);
  if (!Number.isSafeInteger(storeId) || storeId < 1 || !parsed.success) {
    return response.status(400).json({ message: 'Choose a store and a rating from 1 to 5' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO ratings (user_id, store_id, score)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, store_id)
       DO UPDATE SET score = EXCLUDED.score, updated_at = NOW()
       RETURNING id, store_id, score, updated_at`,
      [request.user.id, storeId, parsed.data.score],
    );
    return response.json({ rating: result.rows[0] });
  } catch (error) {
    if (error.code === '23503') {
      return response.status(404).json({ message: 'That store was not found' });
    }
    console.error('Could not save rating:', error.message);
    return response.status(500).json({ message: 'Could not save your rating' });
  }
});

export default router;
