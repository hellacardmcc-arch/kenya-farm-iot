#!/usr/bin/env ts-node
/**
 * Run TypeORM migrations
 * Usage: npx ts-node src/scripts/run-typeorm-migrations.ts
 */

import "reflect-metadata";
import { runTypeOrmMigrations, closeDatabase } from "../db/typeorm";

async function main() {
  try {
    console.log("🔄 Starting TypeORM migrations...");
    await runTypeOrmMigrations();
    console.log("✅ Migrations completed successfully");
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await closeDatabase().catch(() => {});
    process.exit(1);
  }
}

main();
