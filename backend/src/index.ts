import dotenv from 'dotenv';
import app from './app';
import { runMigrations } from './db/runMigrations';
import { testConnection } from './db';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

// Start server only if database connects
async function startServer() {
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('❌ FATAL: Cannot connect to database. Exiting.');
    process.exit(1);
  }

  await runMigrations();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Kenya Farm IoT running on port ${PORT}`);
    console.log(`🌍 Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
