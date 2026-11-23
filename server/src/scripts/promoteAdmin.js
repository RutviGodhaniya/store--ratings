import 'dotenv/config';
import { pool } from '../db.js';

const email = process.argv[2]?.trim().toLowerCase();

try {
  if (!email) {
    console.error('Usage: npm run promote-admin -- registered-email@example.com');
    process.exitCode = 1;
  } else {
    const result = await pool.query(
      `UPDATE users
       SET role = 'admin', updated_at = NOW()
       WHERE email = $1
       RETURNING email, role`,
      [email],
    );

    if (result.rowCount === 0) {
      console.error('No account found for that email. Sign up first, then run this command.');
      process.exitCode = 1;
    } else {
      console.log(`Updated ${result.rows[0].email} to role ${result.rows[0].role}.`);
    }
  }
} catch (error) {
  console.error('Could not update the account role:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
