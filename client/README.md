# Magadh Ventures — Client

Next.js 16 (App Router, `cacheComponents`) + React 19 + Tailwind v4 + shadcn/ui (Base UI)
frontend for the Magadh Ventures prototype. It talks to the Express API in `../server`
using **axios**. All data is synthetic; this is a demo, not a medical service.

> `AGENTS.md` applies: this Next.js version differs from older releases. Read the bundled
> docs in `node_modules/next/dist/docs/` before changing framework-level code.

## Setup
```bash
pnpm install
cp .env.example .env.local     # set NEXT_PUBLIC_API_URL if the API isn't on :5000
pnpm dev                       # http://localhost:3000
```
Start the API first (`pnpm seed && pnpm dev` in `server/`), and make sure the server's
`CLIENT_URL` is `http://localhost:3000` (CORS and the CSRF origin check depend on it).
Use `localhost` (not `127.0.0.1`) in the browser so the origins match.

`packageManager` was repinned from `pnpm@11.12.0` (reported as a broken release by pnpm)
to `pnpm@11.28.8`.

## Environment (public values only)
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL incl. `/api/v1` (default `http://localhost:5000/api/v1`) |
| `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS` | `true` shows one-click demo logins on `/login`. **Read at build time.** Always on in `pnpm dev`; off in production builds unless set. When off, the demo credentials are stripped from the JS bundle. |

## Scripts
`pnpm dev` · `pnpm build` · `pnpm start` · `pnpm lint`

## Routes
| Route | Who | What |
|---|---|---|
| `/`, `/privacy` | public | landing, privacy & AI limitations |
| `/login`, `/register` | guests | sign-in; sign-up → 6-digit OTP → account |
| `/patient`, `/patient/profile` | patient | profile completeness; full health-profile form (allergies, medications, history, consents) |
| `/doctor`, `/doctor/profile` | doctor | verification status; credentials form (licence change asks for confirmation) |
| `/admin`, `/admin/doctors`, `/admin/audit-logs` | admin | verification queue + review dialog; filterable audit log |
| `/partner`, `/responder` | partner / responder | honest "coming soon" dashboards |

## How it works
- **API client** (`lib/api/client.ts`): axios with `withCredentials` (auth is HttpOnly cookies set
  by the API; JavaScript never sees a token). On a 401 it refreshes the session once (concurrent
  401s share one refresh), retries the request, and signals the app if refresh fails. Errors are
  normalised to `ApiClientError` (`status`, `code`, per-field messages).
  **Do not add custom request headers**: the API's CORS policy only allows `Content-Type`,
  `Origin` and `Authorization`.
- **Auth** (`features/auth`): `AuthProvider` + TanStack Query hold the session. It is deliberately
  client-side: in production the API usually lives on another site, so a Next.js server can't read
  its cookies. `RoleGuard`/`GuestGuard` are navigation helpers only; **the API enforces access**.
  Post-login redirects (`?next=`) are restricted to the user's own area (no open redirects).
- **Forms**: React Hook Form + Zod mirroring the API's rules; server field errors are mapped back
  onto the form. Profile forms send only changed fields, which keeps the audit log accurate.
- **Layout**: shared dashboard shell (navy sidebar, top bar, account menu, mobile drawer).
- **Fonts**: Geist via the `geist` package (self-hosted, no Google Fonts fetch at build time).

## Differences from the supplied boilerplate
- Fixed the circular `--font-sans: var(--font-sans)` so Geist actually applies; swapped Google
  font fetching for the `geist` package. Retheme in `app/globals.css` (single light theme).
- `next.config.ts`: added a build-time default for `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS`.
- `components/ui/toast.tsx`: toast stack lifted (`bottom-20`) so it never covers the sticky Save bar.
- Replaced the default `app/page.tsx`.

## Known issues / status
- `pnpm lint` reports 2 errors in **shadcn-generated** files I did not modify
  (`components/ui/carousel.tsx`, `hooks/use-mobile.ts`: `react-hooks/set-state-in-effect`).
  All app code is lint-clean.
- Verified: type-check, production build (14 routes), and a browser run against the real API
  covering sign-up + OTP, HttpOnly cookies, profile validation/save/persistence, role guards and
  the admin overview. A later part of that run did not complete cleanly (see the hand-off notes),
  so the admin verification dialog, doctor licence-change confirmation, partner/responder pages
  and `?next=` redirects were not confirmed end to end.
