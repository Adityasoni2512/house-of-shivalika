# House of Shivalika — working conventions

Read [MASTER_PLAN.md](MASTER_PLAN.md) first. It is the spec of record: every
decision, the full schema, and what is deliberately out of scope. If a decision
changes, change it there before changing code.

[SETUP_CHECKLIST.md](SETUP_CHECKLIST.md) tracks everything that needs a human —
accounts, credentials, content, legal sign-off.

## What this is

A women's fast-fashion storefront with **no online payment**. Customers browse,
build a cart, and hand off to WhatsApp. Orders are entered by hand in the admin
panel afterwards. No customer accounts.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase
Postgres · Cloudinary · deployed to Netlify.

## Non-negotiable rules

1. **The browser never talks to the database.** No Supabase client is shipped to
   the client. All reads happen in Server Components, all writes in Server
   Actions or Route Handlers, using the service-role key. `src/lib/supabase/admin.ts`
   imports `server-only` so an accidental client import is a build error.

2. **RLS is enabled on every table with no policies.** Anon and authenticated
   roles get nothing. This is defence in depth, not the access control — the
   access control is `requireAdmin()`.

3. **`requireAdmin()` at the top of every admin page and every mutating action.**
   The proxy (`src/proxy.ts`) redirects unauthenticated users, but it is a
   convenience, never the security boundary.

4. **Validate on the server, always.** Client validation is a courtesy. Every
   Server Action re-parses its input with Zod even when the form already did.

5. **Never trust the cart.** It lives in `localStorage`. Prices and stock are
   re-verified server-side in `submitLeadAction` before the WhatsApp handoff,
   and the outgoing message is built from the server's result.

6. **Stock is never adjusted automatically.** Orders arrive by WhatsApp and are
   entered by hand, so the admin explicitly confirms when stock should move.
   Silently decrementing on save would double-count any edited order.

## Patterns worth knowing

**Supabase `.select()` strings must be single string literals.** Concatenating
them defeats type inference and collapses the row type to `GenericStringError`.

**Variants are reconciled, not replaced, when saving a product.** They carry
stock counts; delete-then-insert would zero them on every edit. Images *are*
replaced wholesale — they carry nothing worth preserving.

**`order_items` stores snapshots** of product name, SKU, size, image and price.
A historical order must render correctly after a product is renamed, re-priced
or deleted.

**`published_at` is set once**, on a product's first activation. It is what
"New Arrivals" sorts on, so re-activating an old product must not jump the queue.

**Filter state lives in the URL**, never component state — shareable, indexable,
back-button safe, and server-renderable.

**`products.attributes` (jsonb) is the escape hatch** for fields the client adds
later. Graduate a field to a real column only when it needs filtering.

**Storage access is always wrapped.** `localStorage` throws in private windows
and with site data blocked. Every access degrades gracefully.

## Conventions

- Serif (`font-serif`, Instrument Serif) for headings; Inter for everything else.
- `label-caps` for nav, buttons and eyebrows — this carries most of the visual
  identity.
- Product images are locked to 3:4 via `.ratio-product`. Do not vary this.
- Radius 2px. Hairline borders, not shadows. Colour transitions, not transforms.
- Storefront components are hand-built. shadcn-style primitives are for admin.
- British spelling in UI copy ("colour", "organisation").
- Focus rings are never removed.

## Commands

```bash
npm run dev                                          # localhost:3000
npm run build                                        # production build
npx tsc --noEmit                                     # type-check
npx supabase db push                                 # apply migrations
npx supabase gen types typescript --linked --schema public > src/lib/supabase/types.generated.ts

node --env-file=.env.local scripts/create-admin.mjs <email> <password> "<name>"
node --env-file=.env.local scripts/seed-page-content.mjs
node --env-file=.env.local scripts/clear-test-data.mjs   # run before launch
```

`SUPABASE_ACCESS_TOKEN` must be exported (or in `.env.local`) for `supabase`
CLI commands.

## Before launch

Run `scripts/clear-test-data.mjs` — the database currently contains a test
product and two test categories used during development.
