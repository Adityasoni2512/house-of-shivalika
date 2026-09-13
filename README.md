# House of Shivalika

Storefront and admin panel for a women's fast-fashion brand. Customers browse
and build a cart; orders are placed over WhatsApp rather than an online
checkout. No customer accounts, no payment gateway.

**Next.js 16 · React 19 · TypeScript · Tailwind v4 · Supabase · Cloudinary · Netlify**

## Documentation

| File | What it covers |
|---|---|
| [MASTER_PLAN.md](MASTER_PLAN.md) | The spec of record — every decision, the full schema, what is out of scope |
| [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md) | Everything needing a human: accounts, credentials, content, legal sign-off |
| [CLAUDE.md](CLAUDE.md) | Working conventions and the non-negotiable rules |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Admin panel is at `/admin`. Create the first admin with:

```bash
node --env-file=.env.local scripts/create-admin.mjs you@example.com "a-strong-password" "Your Name"
```

## Environment

Every key is documented in [.env.example](.env.example). Supabase and Cloudinary
credentials are required; `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` are
local tooling only and must **never** be added to Netlify.

## Database

Migrations live in `supabase/migrations/` and are applied with the Supabase CLI:

```bash
export SUPABASE_ACCESS_TOKEN=...
npx supabase db push
npx supabase gen types typescript --linked --schema public > src/lib/supabase/types.generated.ts
```

## Architecture in one paragraph

The browser never talks to the database. Storefront pages are Server Components
reading through the service-role key with ISR; admin pages are dynamic and
guarded by `requireAdmin()` on every page and every action. RLS is enabled on
all tables with no policies, so a leaked key yields nothing. The cart is
`localStorage` only — nothing is written until the lead form is submitted, at
which point prices and stock are re-verified server-side and the WhatsApp
message is built from the server's answer, not the browser's.

## Deployment

Netlify, configured in [netlify.toml](netlify.toml). **Not Vercel** — its free
Hobby tier prohibits commercial use. See SETUP_CHECKLIST.md §6.2.

A nightly function keeps the Supabase free tier from pausing, rolls up
analytics, prunes events past 180 days, and expires stale review invites.

## Scripts

```bash
node --env-file=.env.local scripts/create-admin.mjs <email> <password> "<name>"
node --env-file=.env.local scripts/seed-page-content.mjs      # load drafted page copy
node --env-file=.env.local scripts/clear-test-data.mjs        # run before launch
```
