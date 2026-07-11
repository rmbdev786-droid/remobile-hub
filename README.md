# Remobile Hub

**Remobile Hub** is an internal marketplace operations system for synchronizing Foxway refurbished iPhone inventory with bol.com FBR offers and dropship orders. It centralizes catalog mapping, margin-aware pricing, stock protection, offer overrides, fulfillment tracking, operational audit logs, and channel configuration.

## Operational scope

| Workflow | Implementation |
|---|---|
| Catalog | Foxway catalog ingestion, normalized Grade A/B/C display, EAN mapping, manual approval, CSV/XLSX export |
| Pricing | Euro-cents arithmetic, margin-product VAT formula, upward price rounding, per-grade margin rules |
| Stock | Variant aggregation, configurable stock buffer, listing threshold, zero-stock pause behavior |
| Offers | bol.com refurbished FBR offers, buy-box state, inline manual price overrides, reset and suggestion actions |
| Orders | bol.com order ingestion, Foxway dropship creation, payment confirmation, shipment and tracking state |
| Audit | Expandable synchronization logs with counters, duration, status, and error details |
| Settings | Margin rules, grade mapping, stock rules, delivery promise, masked channel configuration |

## Architecture

| Layer | Technology |
|---|---|
| Web application | Next.js 15 App Router, React 19, TypeScript |
| API contracts | tRPC 11 and Zod |
| Database | PostgreSQL/Neon with Drizzle ORM |
| Authentication | Clerk, with local/demo fallback when unconfigured |
| Styling | Tailwind CSS 4 and Remobile's black/orange design tokens |
| Tests | Vitest |

The application uses integer euro cents at marketplace boundaries. Margin percentages are stored as decimal fractions—for example, `0.2500` represents **25%**—and are converted to whole percentages only in the settings interface.

## Local setup

```bash
pnpm install
# Configure the variables listed below in .env.local or your hosting dashboard
pnpm db:migrate
pnpm dev
```

Next.js loads variables from root-level `.env*` files; non-`NEXT_PUBLIC_` values remain server-only, while `NEXT_PUBLIC_` values are bundled for browser use.[^next-env]

### Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Live mode | PostgreSQL/Neon connection string; use SSL in production |
| `FOXWAY_API_KEY` | Live mode | Foxway API authentication |
| `FOXWAY_API_BASE_URL` | Optional | Foxway API base URL override |
| `FOXWAY_CATALOG_SLUG` | Live mode | Foxway catalog selected for synchronization |
| `BOL_CLIENT_ID` | Live mode | bol.com Retailer API OAuth client ID |
| `BOL_CLIENT_SECRET` | Live mode | bol.com Retailer API OAuth client secret |
| `BOL_API_BASE_URL` | Optional | bol.com Retailer API base URL override |
| `BOL_TOKEN_URL` | Optional | bol.com OAuth token endpoint override |
| `BOL_WEBHOOK_SECRET` | Recommended | Validates inbound bol.com webhook requests |
| `CRON_SECRET` | Production | Protects all `/api/cron/*` endpoints |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Authentication | Clerk browser key |
| `CLERK_SECRET_KEY` | Authentication | Clerk server key |

Never commit `.env.local` or production credentials. For local work, create `.env.local` from the variable table above. For managed environments, provide values through the hosting platform's encrypted secrets interface rather than storing an environment template in the repository.

## Database and migrations

The codebase-first schema source is `lib/db/schema.ts`. Drizzle generates and reads migrations from `drizzle/migrations`; the legacy SQL file directly under `drizzle/` is not part of the configured PostgreSQL migration path.

```bash
# Generate SQL after changing lib/db/schema.ts
pnpm db:generate

# Apply all unapplied migrations to DATABASE_URL
pnpm db:migrate
```

The initial migration creates products, supplier variants, EAN mappings, channel offers, orders, pricing rules, and synchronization logs. It also seeds the Grade B, Grade C+, and Grade C margin rules idempotently. Drizzle's documented codebase-first flow is to generate SQL migration files and then apply unapplied migrations to the database.[^drizzle-migrations]

Before running a production migration, back up the database, review the generated SQL, verify `DATABASE_URL` targets the intended environment, and run the migration once from a controlled release job.

## Synchronization schedules

`vercel.json` registers the following UTC schedules:

| Endpoint | Schedule | Frequency |
|---|---|---|
| `/api/cron/catalog` | `0 */6 * * *` | Every six hours |
| `/api/cron/price-stock` | `*/30 * * * *` | Every 30 minutes |
| `/api/cron/orders` | `*/15 * * * *` | Every 15 minutes |

Vercel cron invokes the configured production path with an HTTP `GET`, and its cron expressions are evaluated in UTC.[^vercel-cron] Each route accepts `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`. In production, configure a strong `CRON_SECRET` before enabling schedules.

The synchronization services preserve these business invariants:

1. **Manual price overrides are protected.** Automated price/stock sync still updates stock but omits price fields while `priceOverride` is active.
2. **Stock cannot go negative.** Supplier stock is aggregated across variants, the buffer is subtracted, and values below the listing threshold become zero.
3. **Margin pricing uses exact boundaries.** The engine calculates net cost divided by `(1 - margin)`, adds 21% VAT, then rounds upward to the configured increment.
4. **Grade mapping is explicit.** Foxway Grade A/B/C values map consistently to the operational badge system and bol.com refurbished condition contract.

## Demo and live behavior

When supplier or marketplace credentials are missing, the corresponding API client uses deterministic demo records. When `DATABASE_URL` is missing, the repository uses the in-memory demo store. This keeps local UI and tests usable, but **demo data is not persistent** and must not be treated as a production data source.

Live-operation checklist:

1. Configure PostgreSQL, Foxway, bol.com, Clerk, webhook, and cron secrets.
2. Run `pnpm db:migrate` against the intended production database.
3. Verify **Test connection** for Foxway and bol.com in Settings.
4. Run catalog synchronization and approve uncertain EAN mappings.
5. Review margin and stock rules before enabling offer synchronization.
6. Confirm scheduled requests authenticate successfully and inspect Sync Log errors.

## Quality commands

```bash
pnpm check       # TypeScript contract check
pnpm test        # Unit and regression suites
pnpm build       # Production Next.js build
```

The regression suite covers price calculation and rounding, margin normalization, stock aggregation, EAN validation and matching, API demo fallbacks, manual-override protection, and cron authentication.

## Application routes

| Route | Purpose |
|---|---|
| `/` | Operations dashboard |
| `/catalog` | Foxway catalog and EAN mapping |
| `/offers` | bol.com offers and inline price management |
| `/orders` | Order and dropship fulfillment tracking |
| `/sync-log` | Synchronization history and error inspection |
| `/settings` | Pricing, stock, grade, and channel configuration |

[^next-env]: [Next.js environment-variable guide](https://nextjs.org/docs/app/guides/environment-variables)
[^drizzle-migrations]: [Drizzle migration fundamentals](https://orm.drizzle.team/docs/migrations)
[^vercel-cron]: [Vercel Cron Jobs documentation](https://vercel.com/docs/cron-jobs)
