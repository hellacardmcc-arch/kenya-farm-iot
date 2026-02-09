# TypeORM Usage Guide

This project supports both **raw SQL queries** (via `pg` pool) and **TypeORM** (via entities and repositories). You can use either approach depending on your needs.

## Setup

The TypeORM DataSource is configured in `src/data-source.ts`. To use TypeORM in your code, initialize it first:

```typescript
import { initializeDatabase, getDataSource } from './db/typeorm';
import { Farmer } from '../entities';

// Initialize before using
await initializeDatabase();
```

## Using TypeORM Repositories

### Basic CRUD Operations

```typescript
import { initializeDatabase, getDataSource } from './db/typeorm';
import { Farmer } from '../entities';

// Get repository
const farmerRepo = getDataSource().getRepository(Farmer);

// Create
const newFarmer = farmerRepo.create({
  phone: '0712345678',
  passwordHash: 'hashed_password',
  name: 'John Doe',
  county: 'Nairobi'
});
await farmerRepo.save(newFarmer);

// Read
const farmer = await farmerRepo.findOne({ where: { phone: '0712345678' } });
const allFarmers = await farmerRepo.find();

// Update
farmer.name = 'Jane Doe';
await farmerRepo.save(farmer);

// Delete
await farmerRepo.remove(farmer);
```

### Using Relations

```typescript
import { Sensor, Reading } from '../entities';

// Get farmer with sensors
const farmer = await farmerRepo.findOne({
  where: { id: farmerId },
  relations: ['sensors']
});

// Get sensor with readings
const sensorRepo = getDataSource().getRepository(Sensor);
const sensor = await sensorRepo.findOne({
  where: { id: sensorId },
  relations: ['readings']
});

// Create sensor for farmer
const sensor = sensorRepo.create({
  farmerId: farmer.id,
  name: 'Soil Sensor 1',
  sensorType: 'soil_moisture',
  location: 'Field A'
});
await sensorRepo.save(sensor);
```

### Using QueryBuilder

```typescript
// Complex queries
const farmers = await farmerRepo
  .createQueryBuilder('farmer')
  .leftJoinAndSelect('farmer.sensors', 'sensor')
  .where('farmer.county = :county', { county: 'Nairobi' })
  .andWhere('sensor.isActive = :active', { active: true })
  .getMany();

// Aggregations
const result = await getDataSource()
  .getRepository(Reading)
  .createQueryBuilder('reading')
  .select('AVG(reading.value)', 'avgValue')
  .where('reading.sensorId = :sensorId', { sensorId })
  .getRawOne();
```

## Migrations

### Run TypeORM Migrations

```bash
npm run migrate:typeorm
```

Or directly:
```bash
npx ts-node src/scripts/run-typeorm-migrations.ts
```

### Generate Migration from Entities

```bash
npx typeorm migration:generate src/migrations/MigrationName -d src/data-source.ts
```

### Create Empty Migration

```bash
npx typeorm migration:create src/migrations/MigrationName
```

## Integration with Existing Code

You can use TypeORM alongside the existing `pg` pool:

```typescript
import { pool } from './db'; // Raw SQL
import { getDataSource } from './db/typeorm'; // TypeORM

// Use raw SQL for complex queries
const { rows } = await pool.query('SELECT * FROM farmers WHERE county = $1', ['Nairobi']);

// Use TypeORM for entity operations
const farmerRepo = getDataSource().getRepository(Farmer);
const farmer = await farmerRepo.findOne({ where: { county: 'Nairobi' } });
```

## Graceful Shutdown

Always close the database connection when shutting down:

```typescript
import { closeDatabase } from './db/typeorm';

// On app shutdown
process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
});
```

## Best Practices

1. **Initialize once**: Call `initializeDatabase()` at app startup, not in every route handler
2. **Use repositories**: Prefer repositories over EntityManager for better type safety
3. **Handle errors**: Wrap TypeORM operations in try/catch blocks
4. **Use transactions**: For multiple related operations:

```typescript
await getDataSource().transaction(async (manager) => {
  const farmer = manager.create(Farmer, { ... });
  await manager.save(farmer);
  
  const sensor = manager.create(Sensor, { farmerId: farmer.id, ... });
  await manager.save(sensor);
});
```

5. **Don't use synchronize**: Keep `synchronize: false` in production. Use migrations instead.
