# Magadh Ventures — Server

Express 5 + TypeScript + Mongoose API. **Phases 1–2 (foundation, auth & profiles) are complete.**
All data in the prototype is synthetic; do not use it with real patient data.

## Requirements
- Node.js 22+
- pnpm 11 (`devEngines` enforces it — `npx` will refuse to run; use `pnpm exec`)
- MongoDB (Atlas or local) and Redis (local Docker or Upstash)

## Setup
```bash
pnpm install
cp .env.example .env     # fill in DATABASE_URL and the two token secrets
pnpm seed                # demo accounts (development only)
pnpm dev                 # http://localhost:5000
```
`pnpm-workspace.yaml` (`allowBuilds`) approves the `bcrypt`/`esbuild` install scripts
under pnpm 11 — commit it.

## Demo accounts (after `pnpm seed`)
Password for all: `Demo@12345` (override with `SEED_PASSWORD`). The seed is re-runnable and
never overwrites an existing password. It refuses to run when `NODE_ENV=production`.

| Role | Email | Notes |
|---|---|---|
| patient | patient@demo.magadh.test | has a filled-in profile |
| doctor | doctor@demo.magadh.test | **verified** |
| doctor | doctor.pending@demo.magadh.test | **pending**: use it to demo admin verification |
| admin | admin@demo.magadh.test | |
| partner | partner@demo.magadh.test | facility link arrives in Phase 4 |
| responder | responder@demo.magadh.test | assignment flow arrives in Phase 4 |

## Scripts
| Command | What it does |
|---|---|
| `pnpm dev` | tsx watch |
| `pnpm typecheck` | `tsc --noEmit` (strict, src only) |
| `pnpm exec tsc -p tsconfig.test.json` | type-check src **and** tests |
| `pnpm build` / `pnpm start` | compile to `dist/` and run |
| `pnpm test` | unit tests; integration suites are **skipped** without a test DB |
| `pnpm test:integration` | full suite; requires `TEST_DATABASE_URL` |
| `pnpm seed` | demo data |

### Running the integration tests
They need MongoDB and Redis, and they **delete data**, so point them at throwaway resources:
```bash
TEST_DATABASE_URL=mongodb://127.0.0.1:27017/magadh_test pnpm test:integration
# optional: TEST_REDIS_URL (defaults to redis://127.0.0.1:6379/1)
```
The database name must end in `_test`; the suite refuses to run otherwise.

## Email in development
With no `RESEND_API_KEY`, emails are simulated: the server log prints a
`[SIMULATED EMAIL]` block that contains your OTP. In production the same situation returns
503 rather than pretending a mail was sent.

## Layout
`config/` · `constants/` · `middlewares/` · `routes/` → `controllers/` → `services/` →
`repository/` (all Mongoose queries) · `models/` · `validators/` (Zod) · `utils/` ·
`emails/` · `scripts/` · `types/`

## Conventions
- ESM + `nodenext`: relative imports end in `.js`.
- **Identity:** patients and doctors are identified everywhere by their `User` `_id`
  (profile collections are keyed by `userId`).
- Controllers parse input with Zod (`.strict()`: unknown fields are rejected), call a service,
  and never touch models. Services never touch Mongoose directly.
- Errors: throw an `ApiError` subclass; the error middleware maps Zod, Mongoose, duplicate-key
  and body-parser errors to one JSON shape.
