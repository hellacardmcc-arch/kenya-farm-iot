# TypeORM

- Init: `AppDataSource.initialize()` (done in `index.ts`).
- Repo: `AppDataSource.getRepository(Entity)`.
- Migrations: SQL in `src/db/migrations/`; run with `npm run db:migrate`.
