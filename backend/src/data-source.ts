import { DataSource } from 'typeorm';
import * as path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL, // Render provides this
  synchronize: false, // NEVER true in production
  logging: true,
  entities: [path.join(__dirname, '../entities/*.{js,ts}')],
  migrations: [path.join(__dirname, '../migrations/*.{js,ts}')],
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  extra: {
    ssl: isProduction ? { rejectUnauthorized: false } : false
  }
});
