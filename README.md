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

## Blueprint rules to preserve

These rules are permanent, not phase-specific:

1. **Server is the source of truth** for stock, prices, and totals.
2. **No stock-affecting action** may bypass the inventory ledger.
3. **Transactions** wrap checkout, stock intake, returns, and adjustments.
4. **Every adjustment** records `created_by`, a reason code, and a note.
5. **Telegram messages** are queued inside the business transaction and sent
   only after commit.
6. **Tests** accompany every service before a module is marked done.
