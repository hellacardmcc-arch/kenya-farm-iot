/**
 * Example: How to use TypeORM in your routes/services
 * 
 * Option 1: Use repositories (recommended)
 * ```typescript
 * import { initializeDatabase, getDataSource } from './db/typeorm';
 * import { Farmer } from '../entities';
 * 
 * // In your route handler:
 * await initializeDatabase();
 * const farmerRepo = getDataSource().getRepository(Farmer);
 * const farmers = await farmerRepo.find();
 * ```
 * 
 * Option 2: Use EntityManager
 * ```typescript
 * import { initializeDatabase, getDataSource } from './db/typeorm';
 * 
 * await initializeDatabase();
 * const em = getDataSource().manager;
 * const farmer = await em.findOne(Farmer, { where: { phone: '0712345678' } });
 * ```
 * 
 * Option 3: Use QueryBuilder
 * ```typescript
 * import { initializeDatabase, getDataSource } from './db/typeorm';
 * import { Farmer } from '../entities';
 * 
 * await initializeDatabase();
 * const farmers = await getDataSource()
 *   .getRepository(Farmer)
 *   .createQueryBuilder('farmer')
 *   .where('farmer.county = :county', { county: 'Nairobi' })
 *   .getMany();
 * ```
 */

export {};
