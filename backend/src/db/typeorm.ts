import "reflect-metadata";
import { AppDataSource } from "../data-source";

export async function initializeDatabase(): Promise<void> {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
}

export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
}

export function getDataSource() {
  if (!AppDataSource.isInitialized) throw new Error("DataSource not initialized. Call initializeDatabase() first.");
  return AppDataSource;
}

export { AppDataSource };
