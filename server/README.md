# Magadh Ventures — Server

Express 5 + TypeScript + Mongoose API. **Phases 1–4 are implemented.**
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

## Phase 4 API

All endpoints below are under `/api/v1` and use the standard response envelope. Protected
endpoints require the authenticated role shown in parentheses.

| Route | Access | Purpose |
|---|---|---|
| `GET /doctors?specialty=&page=&limit=` | patient | Browse verified doctors |
| `GET /doctors/:id` | patient | View a verified doctor profile |
| `GET /doctors/:id/availability?from=YYYY-MM-DD&days=` | patient | View open 30-minute slots |
| `POST /appointments` | patient | Request an appointment |
| `GET /appointments` | patient, doctor | List the caller's appointments; supports `status`, `from`, `to`, `page`, and `limit` |
| `PATCH /appointments/:id/status` | patient, doctor | Cancel, confirm, or complete an appointment when permitted |
| `GET /donors/me`, `PUT /donors/me` | patient | Read or register/update a consented donor profile |
| `GET /donors/search` | patient | Search anonymous, consented donor availability |
| `POST /donor-requests`, `GET /donor-requests` | patient | Create and list simulated donor matches |
| `PATCH /donor-requests/:id/status` | patient | Cancel or fulfill the caller's request |
| `POST /emergencies` | patient | Create a simulated emergency case |
| `GET /emergencies` | patient, authorized responder | List visible cases; supports `status`, `page`, and `limit` |
| `GET /emergencies/:id` | patient, authorized responder | View an owned or assigned case |
| `POST /emergencies/:id/claim` | authorized responder | Claim an unassigned simulated case |
| `PATCH /emergencies/:id/status` | authorized responder | Advance a claimed case |
| `POST /emergencies/:id/cancel` | patient | Cancel the caller's active case |
| `GET /facilities` | patient, doctor, partner, admin | Browse verified facilities (partners see their own submissions; admins see all) |
| `POST /facilities` | partner | Submit a facility for admin verification |
| `GET /notifications`, `PATCH /notifications/:id/read` | authenticated user | Read the in-app simulated notification inbox |
| `GET /admin/overview` | admin | View prototype activity counts |
| `PATCH /admin/facilities/:id/verification` | admin | Verify or reject a facility |
| `PATCH /admin/responders/:id/authorization` | admin | Authorize an existing responder account |

Appointments use UTC and fixed 30-minute slots. Doctor availability is configured through the
doctor profile's `weeklyAvailability` field. Donor results never expose names or contact details.
Emergency cases, notifications, matching, estimated arrival times, and dashboard analytics are
prototype simulations; they do not contact donors, responders, hospitals, or emergency services.
