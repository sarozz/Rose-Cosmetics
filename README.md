# Rose Cosmetics — POS & Inventory System

Online-only, barcode-driven point-of-sale and inventory platform for a single
cosmetics store. Built to the blueprint (`rose_cosmetics_pos_blueprint_v2.pdf`).

> **Status:** Phase 1 — Foundations. No business logic is wired up yet. The
> repository contains the project skeleton, data model, auth scaffolding, and
> CI. Features land in later phases.

## Stack

| Layer        | Choice                                              |
| ------------ | --------------------------------------------------- |
| Framework    | Next.js (App Router) + TypeScript                   |
| Styling      | Tailwind CSS                                        |
| Validation   | Zod + React Hook Form                               |
| Data access  | Prisma ORM                                          |
| Database     | PostgreSQL (Supabase)                               |
| Auth         | Supabase Auth (`@supabase/ssr`)                     |
| Storage      | Supabase Storage                                    |
| Hosting      | Vercel (app) + Supabase (managed Postgres)          |
| Tests        | Vitest (unit) + Playwright (e2e)                    |

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template and fill in Supabase + DB values
cp .env.example .env.local

# 3. Generate the Prisma client and push the schema to your dev database
npx prisma generate
npx prisma migrate dev --name init

# 4. Run the dev server
npm run dev
```

The app runs at `http://localhost:3000`.

## Scripts

| Command                  | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| `npm run dev`            | Next.js dev server                        |
| `npm run build`          | Production build                          |
| `npm run start`          | Serve the production build                |
| `npm run lint`           | ESLint (Next.js config)                   |
| `npm run typecheck`      | `tsc --noEmit`                            |
| `npm test`               | Vitest unit tests (run once)              |
| `npm run test:watch`     | Vitest in watch mode                      |
| `npm run test:e2e`       | Playwright end-to-end suite               |
| `npm run prisma:migrate` | Create/apply a migration in dev           |
| `npm run prisma:studio`  | Open Prisma Studio                        |

## Repository layout

```
.
├── e2e/                    # Playwright end-to-end tests
├── prisma/
│   └── schema.prisma       # Ledger-based data model (core + Telegram)
├── src/
│   ├── app/                # App Router routes
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── env.ts          # Zod-validated env parsing
│   │   ├── prisma.ts       # Shared Prisma client
│   │   └── supabase/       # Browser, server, and middleware clients
│   └── middleware.ts       # Session refresh for Supabase Auth
├── tests/unit/             # Vitest setup + unit tests
├── .github/workflows/ci.yml
└── ...config files
```

## Environment variables

Defined in `src/lib/env.ts` and documented in `.env.example`. Secrets
(`SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
`CRON_SECRET`) **must never** carry the `NEXT_PUBLIC_` prefix — only anon keys
may reach the browser.

## Data model

See [`prisma/schema.prisma`](./prisma/schema.prisma). Inventory follows the
ledger pattern from blueprint §12:

- Every stock change creates an `InventoryMovement` row.
- `products.currentStock` is a convenience snapshot updated only inside the
  same transaction as the ledger write.
- `sale_items.unitPrice` is captured at sale time so price history stays
  immutable.
- Telegram notifications (blueprint §24) use an outbox pattern via
  `NotificationJob` rows written inside the business transaction.

## Delivery plan

The blueprint explicitly warns against building the whole system in one shot.
Work is split into phases with review gates:

| Phase | Target                       | Status            |
| ----- | ---------------------------- | ----------------- |
| 0     | Discovery                    | Done              |
| 1     | Foundations                  | **In progress**   |
| 2     | Catalog + receiving          | Planned           |
| 3     | POS core                     | Planned           |
| 4     | Returns + reports            | Planned           |
| 5     | Hardening                    | Planned           |
| 6     | Launch                       | Planned           |

## Deployment (Vercel + Supabase)

First-time production setup. Steps marked 🧑 require the owner's dashboard
access — they cannot be automated from CI.

### 1. Create the Supabase project 🧑
1. Sign in at https://supabase.com/dashboard and click **New project**.
2. Project name: `rose-cosmetics-prod` (or similar). Pick a region near the
   store.
3. Set a strong database password and store it in a password manager.
4. Wait for the project to provision (~2 minutes).
5. Grab the four values you will need:
   - **Settings → API → Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Settings → API → Project API keys → anon/public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Settings → API → Project API keys → service_role** → `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - **Settings → Database → Connection string → URI** → used for both
     `DATABASE_URL` (pooled, port `6543`, append `?pgbouncer=true&connection_limit=1`) and
     `DIRECT_URL` (non-pooled, port `5432`) — see `.env.example`.

### 2. Apply the schema to Supabase 🧑
Run this once locally against the production database **before the first
Vercel deploy**:

```bash
# Use the DIRECT_URL (port 5432) for migrations
DATABASE_URL="<DIRECT_URL>" npx prisma migrate deploy
```

Repeat this after every merged PR that changes `prisma/schema.prisma`.
(Automating it safely is a later-phase task — for now, one deliberate
command beats a silent build-time migration.)

### 3. Import the repo into Vercel 🧑
1. Sign in at https://vercel.com and click **Add New → Project**.
2. Import `sarozz/Rose-Cosmetics`.
3. Framework preset: **Next.js** (auto-detected).
4. Add environment variables under **Environment Variables** — paste every
   key from `.env.example`, scoped to **Production** (and optionally
   Preview):
   - `DATABASE_URL`, `DIRECT_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (mark as secret; do **not** expose to build
     logs)
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID` (can be left blank for
     the first deploy — §24 wiring lands later)
   - `CRON_SECRET` (generate with `openssl rand -hex 32`)
5. Click **Deploy**. The build runs `prisma generate && next build` and the
   landing page should render at the assigned `*.vercel.app` URL.

### 4. Verify
- Open the Vercel URL — the landing page lists the delivery phases.
- Confirm no secrets leaked to the browser: DevTools → Network → view the
  HTML source and search for `TELEGRAM_BOT_TOKEN` / `SUPABASE_SERVICE_ROLE_KEY`.
  Neither should appear.
- CI (`.github/workflows/ci.yml`) keeps lint/typecheck/test/build green on
  every PR.

## Blueprint rules to preserve

These rules are permanent, not phase-specific:

1. **Server is the source of truth** for stock, prices, and totals.
2. **No stock-affecting action** may bypass the inventory ledger.
3. **Transactions** wrap checkout, stock intake, returns, and adjustments.
4. **Every adjustment** records `created_by`, a reason code, and a note.
5. **Telegram messages** are queued inside the business transaction and sent
   only after commit.
6. **Tests** accompany every service before a module is marked done.
