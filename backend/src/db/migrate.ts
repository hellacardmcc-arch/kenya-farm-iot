import dotenv from 'dotenv';
import path from 'path';

// Load .env before importing anything that needs DATABASE_URL
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

// Dynamic import after env is loaded
(async () => {
  try {
    const { runMigrations } = await import('./runMigrations');
    await runMigrations();
    console.log('✅ Migrations complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
})();
