import "reflect-metadata";
import { DataSource } from "typeorm";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Determine if we're in production (Render)
const isProduction = process.env.NODE_ENV === "production";

// Parse database URL (Render provides this)
const databaseUrl = process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
  type: "postgres",
  url: databaseUrl,
  
  // For Render PostgreSQL with SSL
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  extra: isProduction ? { ssl: { rejectUnauthorized: false } } : {},
  
  // Entities and migrations
  entities: [
    path.join(__dirname, "./entities/*.entity{.ts,.js}")
  ],
  migrations: [
    path.join(__dirname, "./migrations/*{.ts,.js}")
  ],
  
  // Settings for Kenyan farm app
  synchronize: false, // NEVER true in production!
  logging: !isProduction, // Log only in development
  
  // Connection pool for Render free tier
  poolSize: 5, // Free tier has limited connections
  maxQueryExecutionTime: 5000, // 5 seconds timeout
});
