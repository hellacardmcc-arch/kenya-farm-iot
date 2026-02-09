import "reflect-metadata";
import { AppDataSource } from "../data-source";

/**
 * Initialize TypeORM DataSource connection
 * Call this before using any repositories or entities
 */
export async function initializeDatabase(): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("✅ TypeORM DataSource initialized successfully");
    } else {
      console.log("ℹ️  TypeORM DataSource already initialized");
    }
  } catch (error) {
    console.error("❌ Error initializing TypeORM DataSource:", error);
    throw error;
  }
}

/**
 * Close TypeORM DataSource connection
 * Call this when shutting down the application
 */
export async function closeDatabase(): Promise<void> {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log("✅ TypeORM DataSource closed successfully");
    }
  } catch (error) {
    console.error("❌ Error closing TypeORM DataSource:", error);
    throw error;
  }
}

/**
 * Run TypeORM migrations
 * This will execute pending migrations
 */
export async function runTypeOrmMigrations(): Promise<void> {
  try {
    await initializeDatabase();
    const migrations = await AppDataSource.runMigrations();
    if (migrations.length > 0) {
      console.log(`✅ Ran ${migrations.length} TypeORM migration(s):`);
      migrations.forEach((migration) => {
        console.log(`   - ${migration.name}`);
      });
    } else {
      console.log("ℹ️  No pending TypeORM migrations");
    }
  } catch (error) {
    console.error("❌ Error running TypeORM migrations:", error);
    throw error;
  }
}

/**
 * Revert the last migration
 */
export async function revertLastMigration(): Promise<void> {
  try {
    await initializeDatabase();
    await AppDataSource.undoLastMigration();
    console.log("✅ Reverted last migration");
  } catch (error) {
    console.error("❌ Error reverting migration:", error);
    throw error;
  }
}

/**
 * Check if database is connected
 */
export function isDatabaseConnected(): boolean {
  return AppDataSource.isInitialized;
}

/**
 * Get the TypeORM DataSource instance
 * Make sure to call initializeDatabase() first
 */
export function getDataSource() {
  if (!AppDataSource.isInitialized) {
    throw new Error(
      "DataSource not initialized. Call initializeDatabase() first."
    );
  }
  return AppDataSource;
}

// Export AppDataSource for direct access if needed
export { AppDataSource };
