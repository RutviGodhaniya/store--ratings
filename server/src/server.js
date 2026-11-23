import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import authRouter from './routes/auth.js';
import storesRouter from './routes/stores.js';
import adminRouter from './routes/admin.js';
import ownerRouter from './routes/owner.js';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/stores', storesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/owner', ownerRouter);

app.get('/api/health', async (_request, response) => {
  try {
    const result = await pool.query('SELECT current_database() AS database');
    response.json({
      status: 'ok',
      message: 'API and database are connected',
      database: result.rows[0].database,
    });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    response.status(503).json({ status: 'error', message: 'Database connection failed' });
  }
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
