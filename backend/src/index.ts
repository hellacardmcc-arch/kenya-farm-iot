import dotenv from 'dotenv';
import app from './app';
import { runMigrations } from './db/runMigrations';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  await runMigrations();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
