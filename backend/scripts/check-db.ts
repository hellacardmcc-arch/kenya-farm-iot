/**
 * Check database connection and create database if needed
 */
import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  // Try to get connection details from .env
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/farmdb';
  const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  
  if (!urlMatch) {
    console.error('Invalid DATABASE_URL format');
    process.exit(1);
  }

  const [, user, password, host, port, dbName] = urlMatch;
  
  console.log(`Attempting to connect to PostgreSQL:`);
  console.log(`  Host: ${host}`);
  console.log(`  Port: ${port}`);
  console.log(`  User: ${user}`);
  console.log(`  Database: ${dbName}\n`);

  // Connect to postgres database (not farmdb)
  const adminClient = new Client({
    host,
    port: parseInt(port),
    user,
    password,
    database: 'postgres', // Connect to default postgres DB
  });

  try {
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check if farmdb exists
    const dbCheck = await adminClient.query(
      "SELECT datname FROM pg_database WHERE datname = 'farmdb'"
    );

    if (dbCheck.rows.length === 0) {
      console.log('Creating database farmdb...');
      await adminClient.query('CREATE DATABASE farmdb');
      console.log('✅ Database farmdb created');
    } else {
      console.log('✅ Database farmdb already exists');
    }

    // Now test connection to farmdb
    await adminClient.end();
    const farmClient = new Client({
      host,
      port: parseInt(port),
      user,
      password,
      database: dbName,
    });

    await farmClient.connect();
    console.log('✅ Successfully connected to farmdb');
    await farmClient.end();
    console.log('\n✅ Database is ready! Restart your backend server.');
  } catch (err: any) {
    console.error('❌ Database error:', err.message);
    if (err.code === '28P01') {
      console.error('   Authentication failed. Check your PostgreSQL password in .env');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('   Cannot connect to PostgreSQL. Is it running?');
    }
    process.exit(1);
  }
}

main();
