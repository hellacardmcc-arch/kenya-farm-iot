import "reflect-metadata";
import dotenv from 'dotenv';
import app from './app';
import { AppDataSource } from './data-source';
import { runMigrations } from './db/runMigrations';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

// Initialize database connection and start server
AppDataSource.initialize()
  .then(async () => {
    console.log("✅ Database connected successfully");
    
    // Run SQL migrations (if using both systems)
    try {
      await runMigrations();
      console.log("✅ Migrations complete");
    } catch (migrationError) {
      console.error("⚠️ Migration error (continuing anyway):", migrationError);
    }
    
    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((error: unknown) => {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  });
