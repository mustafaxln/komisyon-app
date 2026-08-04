# AGENTS.md

## Cursor Cloud specific instructions

This is a single web product: **Pazaryeri Komisyon ve Kârlılık Hesaplayıcı** (a Turkish marketplace commission & profitability calculator). It has three parts: a PostgreSQL 16 database, an Express backend (`backend/`), and a React + Vite frontend (`frontend/`). Standard run/lint/build commands live in `README.md` and the `scripts` blocks of `backend/package.json` and `frontend/package.json`.

### Environment notes (Docker not available)

Docker/`docker compose` is **not** available in this VM, so the README's "single command" Docker path does not work here. Run the stack in local-dev mode instead: a natively-installed PostgreSQL server plus the two npm dev servers.

- PostgreSQL 16 is installed natively (not in a container). It does **not** auto-start on boot — start it each session with `sudo pg_ctlcluster 16 main start` before running the backend. Check status with `pg_lsclusters`.
- The DB role/database expected by `backend/.env` already exist in the snapshot: role `komisyon` / password `komisyon`, database `komisyon_db`, reachable at `localhost:5432`. Recreate only if missing (`sudo -u postgres psql`).
- `backend/.env` is git-ignored and already created from `backend/.env.example` (points `DATABASE_URL` at the local Postgres above). If it goes missing, run `cp backend/.env.example backend/.env`.

### Running the services (local dev)

1. Start Postgres: `sudo pg_ctlcluster 16 main start`
2. Initialize/seed the DB (idempotent; skips seed if data already present): `cd backend && npm run db:init`. Force a reseed with `npm run db:reset`. This also creates the admin user (`admin@komisyon.local` / `admin123`).
3. Backend API (nodemon, port 3001): `cd backend && npm run dev`. Health check: `curl http://localhost:3001/api/health` should report `"database":"connected"`.
4. Frontend (Vite, port 5173): `cd frontend && npm run dev`. Vite proxies `/api` → `http://localhost:3001` (see `frontend/vite.config.js`), so the backend must be running for the UI to load marketplace/commission data.

### Lint / build

- Frontend lint: `cd frontend && npm run lint` (oxlint). There is one pre-existing `no-unused-vars` warning in `src/api.js`; it is not an error.
- Frontend production build: `cd frontend && npm run build`. The backend has no lint or build step.
- There is no automated test suite in this repo.

### Gotchas

- Node 22 is installed and works, even though the Dockerfiles pin Node 20.
- The frontend UI and all validation/error messages are in Turkish.
- `POST /api/calculate` requires `salePrice`, `commissionRate`, and `baseType` (`ex_vat` | `inc_vat`); omitting `baseType` returns a 400.
