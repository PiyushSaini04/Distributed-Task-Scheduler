import fs from 'fs';
import path from 'path';
import { getPool } from './connection';
import { logger } from '../logger/logger';

async function migrate(): Promise<void> {
  const pool = getPool();
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;

    const existing = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [file],
    );
    if (existing.rowCount && existing.rowCount > 0) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    logger.info({ event: 'migration_start', filename: file });

    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      logger.info({ event: 'migration_complete', filename: file });
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  }

  logger.info({ event: 'migrations_complete' });
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ event: 'migration_failed', error: err.message, stack: err.stack });
      process.exit(1);
    });
}

export { migrate };
