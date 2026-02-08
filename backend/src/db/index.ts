import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

// Load .env from backend directory (works even if cwd is project root)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

export const pool = new Pool({ connectionString });
