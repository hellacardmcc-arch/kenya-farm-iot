# Kenya Farm IoT

Full-stack IoT dashboard for smart farming in Kenya: **Node.js/Express** backend, **React/Vite** frontend, **PostgreSQL**, JWT auth, and SMS (Africa's Talking).

## Project structure

```
kenya-farm-iot/
├── backend/           # Express API (Node 18, TypeScript)
│   ├── package.json
│   ├── package-lock.json
│   ├── Dockerfile
│   ├── src/
│   │   ├── app.ts
│   │   ├── index.ts
│   │   ├── db/        # PostgreSQL, migrations
│   │   ├── middleware/
│   │   └── routes/   # auth, farmers
│   └── .env          # (create from .env.example; not committed)
├── frontend/          # React + Vite + Tailwind
│   ├── package.json
│   ├── package-lock.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
├── docs/              # Installation & User manuals (PDF)
├── .gitignore
├── render.yaml        # Optional: Render.com deployment
└── README.md
```

## Required files checklist

| Item | Location |
|------|----------|
| package.json | `backend/`, `frontend/` |
| package-lock.json | `backend/`, `frontend/` (and root if present) |
| .gitignore | Root (excludes `node_modules/`, `.env`) |
| Dockerfile | `backend/`, `frontend/` |
| render.yaml | Root (optional) |
| README.md | Root (this file) |

## Prerequisites

- **Node.js 18.x** (see `backend/package.json` engines)
- **PostgreSQL** (local or Docker)
- **npm** (or yarn)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/hellacardmcc-arch/kenya-farm-iot.git
cd kenya-farm-iot
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # or create .env with required vars
# Edit .env: set DATABASE_URL, JWT_SECRET at minimum
npm install
npm run db:migrate
npm run dev            # http://localhost:3000
```

### 3. Frontend

```bash
cd frontend
npm install
# Optional: create .env with VITE_API_URL=http://localhost:3000/api
npm run dev            # http://localhost:5173
```

### 4. Environment variables

**Backend (`.env` in `backend/`):**

- `PORT` – default 3000  
- `DATABASE_URL` – e.g. `postgresql://postgres:postgres@localhost:5432/farmdb`  
- `JWT_SECRET` – long random string  
- `FRONTEND_URL` – e.g. `http://localhost:5173` (CORS)

**Frontend (optional `.env` in `frontend/`):**

- `VITE_API_URL` – e.g. `http://localhost:3000/api` (omit in dev to use Vite proxy)

## Database

- Create DB: `CREATE DATABASE farmdb;`
- Run migrations: `cd backend && npm run db:migrate`
- Migrations live in `backend/src/db/migrations/*.sql`

## Run in production (build)

```bash
# Backend
cd backend && npm run build && npm start

# Frontend (build only; serve with nginx or static host)
cd frontend && npm run build
# Output in frontend/dist/
```

## Docker

- **Backend:** `docker build -t kenya-backend ./backend` then run with `DATABASE_URL` and `JWT_SECRET`.
- **Frontend:** `docker build -t kenya-frontend ./frontend` (serves on port 80 via nginx).

Use `docker-compose.yml` if present for full stack.

## .gitignore

Ensures these are **not** committed:

- `node_modules/`
- `.env`, `.env.local`
- `dist/`, `build/`
- Logs, IDE, OS files

## Docs

- **Installation manual:** `docs/Installation-Manual.pdf`
- **User manual:** `docs/User-Manual.pdf`

## License

MIT.
