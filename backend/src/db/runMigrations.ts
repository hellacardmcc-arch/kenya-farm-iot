import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { pool } from './index';

const MIGRATIONS_DIR =
  process.env.MIGRATIONS_DIR ||
  join(process.cwd(), 'src', 'db', 'migrations');

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const file of files) {
      const version = file.replace('.sql', '');
      const { rows } = await client.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [version]
      );
      if (rows.length > 0) {
        console.log('Skip (already applied):', file);
        continue;
      }
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
      console.log('Applied:', file);
    }
  } finally {
    client.release();
  }
}
