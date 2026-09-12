# House of Shivalika — Master Project Plan

> **Status:** Approved spec, pre-build
> **Last updated:** 2026-09-12
> **Owner:** Aditya
> **This file is the single source of truth.** Every decision below was confirmed by the client. If a decision changes, change it here first, then in code.

---

## Table of contents

1. [Project summary](#1-project-summary)
2. [Confirmed decisions](#2-confirmed-decisions)
3. [Technology stack](#3-technology-stack)
4. [Accounts, cost & upgrade path](#4-accounts-cost--upgrade-path)
5. [Architecture](#5-architecture)
6. [Data model](#6-data-model)
7. [Storefront specification](#7-storefront-specification)
8. [Admin panel specification](#8-admin-panel-specification)
9. [WhatsApp order flow](#9-whatsapp-order-flow)
10. [Review flow](#10-review-flow)
11. [Analytics specification](#11-analytics-specification)
12. [Design system](#12-design-system)
13. [SEO specification](#13-seo-specification)
14. [Security & privacy](#14-security--privacy)
15. [Repository structure](#15-repository-structure)
16. [Environment variables](#16-environment-variables)
17. [Build phases](#17-build-phases)
18. [Known risks & mitigations](#18-known-risks--mitigations)
19. [Open items — needed from client](#19-open-items--needed-from-client)
20. [Explicitly out of scope](#20-explicitly-out-of-scope)

---

## 1. Project summary

**House of Shivalika** is a women's fast-fashion clothing brand. This project delivers:

- A **public storefront** — browsable catalogue, product detail pages with sizes and stock, customer reviews, on-site search and filters.
- **No online payment.** Orders are placed by the customer over **WhatsApp**. The site builds a cart, captures a lead, and hands off to WhatsApp with a pre-filled message.
- An **admin panel** for the team to manage categories, products, sizes, stock, orders, leads, reviews, homepage banners, static page content, other admins and analytics.
- **First-party analytics** so the team can see what people view and where they drop off, without requiring customer accounts.

**Market:** India only. **Language:** English only. **Currency:** INR, prices inclusive of GST.

**Guiding principles**

1. Clean, minimal, editorial design — the clothes are the interface.
2. SEO-first — server-rendered, fast, structured data everywhere.
3. Start on free tiers, with a clear paid upgrade path and no vendor lock-in.
4. Everything the team will want to change (categories, sizes, product fields, page copy, banners, WhatsApp number) is **admin-editable**, not hardcoded.

---

## 2. Confirmed decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Brand name | **House of Shivalika** |
| 2 | Domain | Not owned yet — to be purchased (see §19) |
| 3 | Market | India only |
| 4 | Pricing | INR, **inclusive of GST**, no GSTIN displayed |
| 5 | Catalogue size | Will grow steadily — admin UX must scale past a few hundred SKUs |
| 6 | Categories | **Fully admin-managed**, nested tree. No hardcoded category list |
| 7 | Price band | Fast fashion |
| 8 | Colour variants | **Each colour is a separate product.** No colour dimension inside a product |
| 9 | Sizes | **Admin-managed size library**; admin picks applicable sizes per product |
| 10 | Stock | **Tracked per product × size**, decremented manually by admin |
| 11 | Product fields | Small required core + generic optional fields + extensible JSON attributes |
| 12 | Pricing display | **MRP strikethrough + selling price + discount % badge** |
| 13 | Made-to-order | Not supported |
| 14 | Media | **Images only.** No video |
| 15 | Collections | Not a separate concept — categories only |
| 16 | Cart | **Yes** — multi-item cart, single WhatsApp handoff |
| 17 | WhatsApp message | Product name, SKU, size, qty, price, product link, order total |
| 18 | WhatsApp integration | **Simple `wa.me` deep link.** No Business API |
| 19 | Lead capture | **Yes** — name + phone + pincode before WhatsApp redirect |
| 20 | Orders | **Created manually by admin.** Site creates *leads*, not orders |
| 21 | Order tracking | WhatsApp only. No customer-facing order lookup |
| 22 | Wishlist / back-in-stock | Not in v1 |
| 23 | Reviews | **Invite-only** — admin generates a private link, sends via WhatsApp |
| 24 | Review content | Star rating + title + text + **photo upload** |
| 25 | Fit feedback | Not in v1 |
| 26 | Moderation | **Mandatory admin approval** before any review is public |
| 27 | Verified buyer | **Manual admin flag** |
| 28 | Review rich snippets | Not enabled in v1 |
| 29 | Customer accounts | **None.** No registration, no login for customers |
| 30 | Analytics dashboard | Most-viewed products, view→WhatsApp conversion, category drop-off, traffic source, on-site search terms, size selections |
| 31 | First-party events | **Yes** — stored in own Postgres |
| 32 | Cookie banner | **Yes**, from day one |
| 33 | Ad pixels | Meta Pixel + Google Ads conversion tag (both free) |
| 34 | Admin roles | **No roles.** All admins equal. Admins can create other admins |
| 35 | Admin modules | Products, categories, sizes, stock, orders, leads, reviews, review invites, banners, static pages, admins, settings, analytics |
| 36 | Coupons | Not in v1 |
| 37 | CSV bulk upload | Not in v1 |
| 38 | Mobile admin | Not required (will still be responsive, not optimised) |
| 39 | Notifications | Not in v1 |
| 40 | Courier integration | Not in v1 — tracking pasted manually |
| 41 | Static pages | About, Contact, Size Guide, Shipping Policy, Returns & Exchange, Privacy Policy, Terms. **Copy to be drafted by us**, admin-editable |
| 42 | Blog | **Deferred.** Routes reserved, not built |
| 43 | Homepage | Hero → New Arrivals → Featured → Brand Story → Instagram link → Testimonials |
| 44 | Instagram | Link only, no feed embed |
| 45 | Languages | English only |
| 46 | Design direction | Ivory ground, near-black ink, one clay accent, editorial serif headings, generous whitespace |
| 47 | Design references | None given — direction proposed in §12 |
| 48 | Photography | AI-generated by client |
| 49 | Dark mode | No — light only |
| 50 | Gender dimension | **Not built.** Menswear handled later via a top-level category (see §18.6) |
| 51 | Timeline | ASAP |
| 52 | Preview | Local dev server (`localhost`) from day one |
| 53 | Account setup | Automate/script as much as possible |
| 54 | Version control | GitHub repo from the start |

---

## 3. Technology stack

| Layer | Choice | Rationale |
|---|---|---|
| **Framework** | **Next.js (latest stable, App Router) + React + TypeScript** | Best SEO story available — server rendering, ISR, metadata API, image optimisation, streaming. Single codebase for storefront + admin + API |
| **Styling** | **Tailwind CSS** with a custom design-token layer | Fast, consistent, no runtime cost. Tokens keep the brand centralised |
| **Admin UI kit** | **shadcn/ui** (Radix primitives) | Accessible tables, dialogs, forms, selects out of the box. Copied into the repo — no dependency lock-in. **Storefront is hand-built**, not shadcn, so it doesn't look like a dashboard |
| **Forms & validation** | **react-hook-form + Zod** | One Zod schema validates on client *and* server |
| **Database** | **Supabase (PostgreSQL)** | Free 500 MB Postgres + Auth + Storage + dashboard. Plain Postgres — portable to Neon/RDS/self-host any time |
| **DB access** | **`@supabase/supabase-js` + generated TypeScript types**, SQL migrations committed to the repo | No ORM layer to fight. Types regenerate from the live schema |
| **Admin auth** | **Supabase Auth** (email + password) | Zero extra vendor. Session in httpOnly cookies, `/admin` guarded by middleware |
| **Image storage & CDN** | **Cloudinary** (free tier) | 25 credits/mo covers storage + bandwidth + transforms. Automatic AVIF/WebP, on-the-fly resizing, responsive `srcset`. Far better than Supabase Storage's 5 GB/mo egress for an image-heavy store |
| **Hosting** | **Netlify (free tier)** | ⚠️ Vercel's Hobby tier **prohibits commercial use** — a revenue store on it violates their ToS. Netlify's free tier explicitly permits commercial use and has first-class Next.js support (App Router, ISR, image CDN). Cloudflare Workers is the fallback |
| **Domain & DNS** | **Cloudflare Registrar** | Sold at wholesale cost with no renewal markup, free WHOIS privacy, free DNS + CDN + SSL |
| **Product analytics** | **Own `analytics_events` table in Postgres** + GA4 + Meta Pixel + Google Ads tag | First-party data we own and can join to orders. GA4/Meta only for ad audiences, loaded **after consent** |
| **Cron** | Netlify Scheduled Functions | Keeps Supabase awake; future rollup jobs |
| **Source control** | **GitHub** (private repo) | CI via Netlify build hooks on push |

### Rejected alternatives, and why

- **Vercel Hobby** — commercial use is a ToS violation. Vercel **Pro at $20/mo is the best upgrade target** once there's revenue; migration from Netlify is a few hours.
- **Shopify / WooCommerce** — monthly cost from day one, heavy, fights the "minimal + custom" brief, and WhatsApp-only ordering is a hack in both.
- **Neon** — better raw Postgres free tier, but no bundled Auth or Storage. Supabase's bundle is worth more here.
- **PostHog** — genuinely useful (session replay, funnels). Deliberately deferred to keep v1 lean; it can be added in an afternoon later.

---

## 4. Accounts, cost & upgrade path

| Service | Plan | Cost now | Limits to watch | Upgrade trigger → cost |
|---|---|---|---|---|
| Cloudflare Registrar | Domain | **~₹1,000/yr** | — | — |
| Supabase | Free | **₹0** | 500 MB DB, 5 GB egress, 50k MAU, pauses after 7 days idle | DB > 400 MB or need backups → **Pro $25/mo** |
| Netlify | Free | **₹0** | 100 GB bandwidth/mo, 300 build min/mo | Bandwidth or team seats → **Pro $19/mo** |
| Cloudinary | Free | **₹0** | 25 credits/mo (storage + bandwidth + transforms) | ~15k monthly visitors → **Plus $89/mo** |
| GitHub | Free | **₹0** | Unlimited private repos | — |
| GA4 / Meta Pixel / Google Ads tag | Free | **₹0** | — | — |
| **Total** | | **≈ ₹1,000/year** | | First likely upgrade: **Supabase Pro**, at meaningful traffic |

Every component is portable: Postgres → any Postgres host; Next.js → any Node host; Cloudinary → any image CDN.

---

## 5. Architecture

```
                          ┌─────────────────────────┐
   Customer (no account)  │   Next.js on Netlify    │
        browser  ────────▶│  ┌───────────────────┐  │
                          │  │   Storefront      │  │  Server Components
                          │  │   (SSG + ISR)     │  │  render from Postgres
                          │  └───────────────────┘  │
                          │  ┌───────────────────┐  │
   Admin (Supabase Auth) ▶│  │   /admin panel    │  │  Server Actions
                          │  │   (dynamic SSR)   │  │  write to Postgres
                          │  └───────────────────┘  │
                          │  ┌───────────────────┐  │
   Browser beacon ───────▶│  │  /api/track       │  │  batched event ingest
                          │  └───────────────────┘  │
                          └───────────┬─────────────┘
                                      │ service-role key (server only)
                          ┌───────────▼─────────────┐
                          │   Supabase Postgres     │
                          │   + Supabase Auth       │
                          └─────────────────────────┘
                                      │
                          ┌───────────▼─────────────┐
                          │   Cloudinary (images)   │
                          └─────────────────────────┘
                                      │
                           wa.me deep link ──▶ WhatsApp (admin phone)
```

### Rules

1. **No database access from the browser.** The Supabase anon key is never shipped to the client. All reads happen in Server Components; all writes happen in Server Actions or Route Handlers using the service-role key. RLS is enabled with deny-by-default as defence in depth.
2. **Storefront pages are statically generated with ISR** (`revalidate: 60`) and revalidated on-demand via `revalidatePath` whenever an admin saves a product, category, banner or review. Fast pages, fresh data.
3. **Admin pages are always dynamic** (`force-dynamic`), never cached.
4. **The cart is client-side only** — React context persisted to `localStorage`. Nothing is written to the database until the lead form is submitted.
5. **Analytics events are buffered in the browser and flushed in batches** to `/api/track` (on 5-event batches, on route change, and on `visibilitychange`) so we never fire one request per interaction.

---

## 6. Data model

PostgreSQL. All tables `snake_case`, UUID primary keys except the high-volume events table (`bigserial`). All timestamps `timestamptz` defaulting to `now()`.

### 6.1 Admin & settings

```
admins
  id                uuid PK        -- equals auth.users.id
  email             text UNIQUE NOT NULL
  full_name         text
  is_active         boolean DEFAULT true
  created_by        uuid REFERENCES admins(id)
  created_at        timestamptz
  last_login_at     timestamptz

site_settings                       -- key/value, single source for editable globals
  key               text PK         -- whatsapp_number, brand_tagline, instagram_url,
                                    -- contact_email, contact_phone, announcement_bar,
                                    -- shipping_flat_rate, free_shipping_threshold,
                                    -- ga4_id, meta_pixel_id, google_ads_id
  value             jsonb NOT NULL
  updated_at        timestamptz
  updated_by        uuid REFERENCES admins(id)
```

### 6.2 Catalogue

```
categories                          -- self-referencing tree, admin-managed
  id                uuid PK
  name              text NOT NULL
  slug              text UNIQUE NOT NULL
  parent_id         uuid REFERENCES categories(id) ON DELETE RESTRICT
  description       text
  image_url         text
  position          int DEFAULT 0
  is_active         boolean DEFAULT true
  show_in_nav       boolean DEFAULT true
  seo_title         text
  seo_description   text
  created_at, updated_at

sizes                               -- the size library, admin-managed
  id                uuid PK
  label             text UNIQUE NOT NULL     -- 'XS','S','M','L','XL','XXL','Free Size'
  position          int DEFAULT 0
  is_active         boolean DEFAULT true

products
  id                uuid PK
  name              text NOT NULL            -- REQUIRED
  slug              text UNIQUE NOT NULL     -- REQUIRED, auto from name, editable
  sku               text UNIQUE NOT NULL     -- REQUIRED
  category_id       uuid NOT NULL REFERENCES categories(id)   -- REQUIRED
  mrp               numeric(10,2)            -- optional; strikethrough price
  price             numeric(10,2) NOT NULL   -- REQUIRED, inclusive of GST
  short_description text
  description       text                     -- long form, markdown
  colour_name       text                     -- optional, drives the colour filter
  colour_hex        text                     -- optional, for the filter swatch
  fabric            text                     -- optional
  care              text                     -- optional
  occasion          text                     -- optional
  attributes        jsonb DEFAULT '{}'       -- ESCAPE HATCH: arbitrary future fields
  status            text DEFAULT 'draft'     -- draft | active | archived
  is_featured       boolean DEFAULT false
  seo_title         text
  seo_description   text
  published_at      timestamptz              -- drives "New Arrivals" ordering
  created_at, updated_at

  -- computed in the UI: discount_pct = round((mrp - price) / mrp * 100)

product_images
  id                uuid PK
  product_id        uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE
  public_id         text NOT NULL            -- Cloudinary public_id
  url               text NOT NULL
  alt_text          text
  position          int DEFAULT 0            -- position 0 = primary/card image
  created_at

product_variants                    -- one row per product × size
  id                uuid PK
  product_id        uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE
  size_id           uuid NOT NULL REFERENCES sizes(id)
  sku               text UNIQUE               -- optional per-size SKU
  stock_qty         int NOT NULL DEFAULT 0
  is_active         boolean DEFAULT true
  created_at, updated_at
  UNIQUE (product_id, size_id)
```

> **Why `attributes jsonb`:** the client explicitly said product fields will change later. New optional fields (sleeve length, neckline, work type…) go into `attributes` with an admin-defined label, with zero migrations. If a field proves permanent and needs filtering, it graduates to a real column.

### 6.3 Leads & orders

```
leads                               -- created automatically at WhatsApp handoff
  id                uuid PK
  name              text NOT NULL
  phone             text NOT NULL
  pincode           text
  cart_snapshot     jsonb NOT NULL           -- full cart at handoff time
  cart_total        numeric(10,2)
  item_count        int
  status            text DEFAULT 'new'       -- new | contacted | converted | lost
  admin_notes       text
  visitor_id        uuid                     -- joins to analytics_events
  utm_source, utm_medium, utm_campaign  text
  converted_order_id uuid REFERENCES orders(id)
  created_at, updated_at

orders                              -- created MANUALLY by admin after the WhatsApp chat
  id                uuid PK
  order_number      text UNIQUE NOT NULL     -- HOS-0001, auto-incrementing
  lead_id           uuid REFERENCES leads(id)
  customer_name     text NOT NULL
  customer_phone    text NOT NULL
  customer_email    text
  address_line1     text
  address_line2     text
  city, state       text
  pincode           text
  status            text DEFAULT 'confirmed'
      -- confirmed | packed | shipped | delivered | cancelled | returned
  subtotal          numeric(10,2)
  discount          numeric(10,2) DEFAULT 0
  shipping_charge   numeric(10,2) DEFAULT 0
  total             numeric(10,2)
  payment_note      text                     -- "UPI received 12 Sep", etc.
  courier_name      text
  tracking_number   text
  admin_notes       text
  created_by        uuid REFERENCES admins(id)
  created_at, updated_at

order_items
  id                uuid PK
  order_id          uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE
  product_id        uuid REFERENCES products(id) ON DELETE SET NULL
  variant_id        uuid REFERENCES product_variants(id) ON DELETE SET NULL
  product_name      text NOT NULL            -- SNAPSHOT at order time
  sku               text                     -- SNAPSHOT
  size_label        text                     -- SNAPSHOT
  image_url         text                     -- SNAPSHOT
  unit_price        numeric(10,2) NOT NULL   -- SNAPSHOT
  qty               int NOT NULL
  line_total        numeric(10,2) NOT NULL
```

> **Why snapshots on `order_items`:** prices and product names change. A historical order must always show what was actually sold at what price, even after the product is renamed, re-priced or deleted.

### 6.4 Reviews

```
review_invites                      -- admin generates, sends via WhatsApp
  id                uuid PK
  token             text UNIQUE NOT NULL     -- 32-char cryptographically random
  product_id        uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE
  order_id          uuid REFERENCES orders(id) ON DELETE SET NULL
  customer_name     text
  customer_phone    text
  status            text DEFAULT 'pending'   -- pending | used | expired
  expires_at        timestamptz DEFAULT now() + interval '60 days'
  used_at           timestamptz
  created_by        uuid REFERENCES admins(id)
  created_at

reviews
  id                uuid PK
  product_id        uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE
  invite_id         uuid UNIQUE REFERENCES review_invites(id)  -- one review per invite
  reviewer_name     text NOT NULL
  rating            int NOT NULL CHECK (rating BETWEEN 1 AND 5)
  title             text
  body              text
  status            text DEFAULT 'pending'   -- pending | approved | rejected
  is_verified_buyer boolean DEFAULT false    -- manual admin flag
  admin_note        text
  approved_by       uuid REFERENCES admins(id)
  approved_at       timestamptz
  created_at

review_images
  id                uuid PK
  review_id         uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE
  public_id         text NOT NULL
  url               text NOT NULL
  position          int DEFAULT 0
```

### 6.5 Content

```
banners                             -- homepage hero / promo slots
  id                uuid PK
  title             text
  subtitle          text
  image_desktop     text NOT NULL
  image_mobile      text
  cta_label         text
  cta_url           text
  position          int DEFAULT 0
  is_active         boolean DEFAULT true
  starts_at         timestamptz
  ends_at           timestamptz

pages                               -- admin-editable static page copy
  id                uuid PK
  slug              text UNIQUE NOT NULL     -- about, contact, size-guide,
                                             -- shipping, returns, privacy, terms
  title             text NOT NULL
  body              text NOT NULL            -- markdown
  seo_title         text
  seo_description   text
  is_published      boolean DEFAULT true
  updated_at, updated_by
```

### 6.6 Analytics

```
analytics_events
  id                bigserial PK
  visitor_id        uuid NOT NULL            -- first-party, anonymous, localStorage
  session_id        uuid NOT NULL            -- rotates after 30 min idle
  event_type        text NOT NULL
  product_id        uuid REFERENCES products(id) ON DELETE SET NULL
  category_id       uuid REFERENCES categories(id) ON DELETE SET NULL
  size_label        text
  search_query      text
  path              text
  referrer_host     text
  utm_source, utm_medium, utm_campaign  text
  device_type       text                     -- mobile | tablet | desktop
  value             numeric(10,2)            -- cart total on whatsapp_click, etc.
  meta              jsonb DEFAULT '{}'
  created_at        timestamptz DEFAULT now()

  INDEX (created_at DESC)
  INDEX (event_type, created_at DESC)
  INDEX (product_id, event_type)
  INDEX (visitor_id, created_at)
```

**`event_type` enum (fixed list):**
`page_view`, `product_view`, `category_view`, `search`, `size_select`,
`add_to_cart`, `remove_from_cart`, `cart_view`, `lead_form_open`,
`lead_submitted`, `whatsapp_click`

**Retention:** a nightly job deletes raw events older than **180 days** after rolling them into `analytics_daily` (product_id, date, views, add_to_carts, whatsapp_clicks). This keeps us inside the 500 MB free tier indefinitely.

---

## 7. Storefront specification

### 7.1 Routes

| Route | Rendering | Purpose |
|---|---|---|
| `/` | ISR | Homepage |
| `/shop` | ISR | All products, filterable |
| `/shop/[...slug]` | ISR | Category & nested subcategory listing |
| `/product/[slug]` | ISR | Product detail |
| `/search?q=` | Dynamic | On-site search results |
| `/cart` | Client | Cart, lead form, WhatsApp handoff |
| `/review/[token]` | Dynamic, noindex | Invite-only review submission |
| `/about`, `/contact`, `/size-guide`, `/shipping`, `/returns`, `/privacy`, `/terms` | ISR | Static pages, copy from `pages` table |
| `/sitemap.xml`, `/robots.txt` | Generated | SEO |
| `/404`, `/500` | Static | Branded error pages |

> `/shop/[...slug]` is a **catch-all** on purpose. It supports arbitrary category nesting today and lets a `/shop/men/...` branch appear later without a single URL changing. See §18.6.

### 7.2 Global chrome

- **Announcement bar** — one line of admin-editable text, dismissible, sticky at top.
- **Header** — wordmark centre-left; nav built from active `show_in_nav` categories with dropdowns for children; search icon (opens overlay); cart icon with live item count. Sticky on scroll with a hairline bottom border. Mobile: hamburger → full-screen drawer.
- **Footer** — category links, static page links, Instagram link, contact email/phone, copyright. Newsletter signup is **not** in v1.
- **Cookie consent banner** — bottom sheet, "Accept" / "Decline". GA4, Meta Pixel and Google Ads tags load **only after Accept**. First-party analytics runs regardless (it is anonymous and cookieless — see §14.2).
- **Floating WhatsApp button** — bottom-right on all pages, opens a generic enquiry chat.

### 7.3 Homepage sections (in order)

1. **Hero** — full-bleed banner carousel from the `banners` table. Serif headline, thin-outline CTA. Single image if only one banner is active.
2. **New Arrivals** — 8 most recent active products by `published_at`, horizontal scroll on mobile.
3. **Shop by Category** — image tiles for top-level categories.
4. **Featured** — products with `is_featured = true`.
5. **Brand story** — short editorial block, image + text, copy from `pages`.
6. **Reviews strip** — 3 most recent approved reviews with photos.
7. **Instagram** — a single tile linking out to the profile. No feed embed.

### 7.4 Listing pages (`/shop`, `/shop/[...slug]`, `/search`)

- **Grid:** 2 columns mobile / 3 tablet / 4 desktop. Portrait **3:4** images. Generous gutters.
- **Product card:** primary image (secondary image on hover, desktop only), name, price, MRP strikethrough, `-XX%` badge, "Sold Out" overlay when every variant has `stock_qty = 0`.
- **Filters** (left rail on desktop, bottom sheet on mobile): Category, Size, Colour, Price range, In-stock only.
- **Sort:** Newest (default), Price ↑, Price ↓, Discount %.
- **Pagination:** "Load more" button that also updates the URL `?page=` so every page is crawlable and shareable.
- Filter and sort state lives in the **URL query string** — shareable, back-button-safe, and server-renderable.
- Empty state: a designed message plus a link back to `/shop`, never a blank grid.

### 7.5 Product detail page

- **Gallery** — vertical thumbnail rail + large image on desktop; swipeable carousel with dots on mobile. Click to open a zoom lightbox.
- **Right column** — breadcrumb, product name, price block (price, MRP strikethrough, discount badge), short description.
- **Size selector** — pills for every active variant. Out-of-stock sizes are shown but struck through and disabled. `Only N left` appears when `stock_qty <= 3`.
- **Quantity stepper**, capped at available `stock_qty`.
- **`Add to Cart`** (primary, solid) and **`Order on WhatsApp`** (secondary, outline — adds to cart and jumps straight to the lead form).
- Selecting a size fires a `size_select` event. Both buttons are disabled until a size is chosen.
- **Accordions** — Description, Fabric & Care, Size Guide (links to `/size-guide`), Shipping & Returns. Only accordions with content render.
- **Reviews block** — average rating, star distribution bar, individual reviews with photos, "Verified Buyer" chip, newest first, paginated.
- **You may also like** — 4 products from the same category.

### 7.6 Cart

- Line items with image, name, size, unit price, quantity stepper, remove.
- Order summary: subtotal, an admin-configurable shipping note, total.
- **`Continue on WhatsApp`** → opens the lead form (see §9).
- Empty cart shows a designed empty state with a link to `/shop`.
- Cart persists in `localStorage` across sessions.
- **Stock is re-validated server-side** when the lead form is submitted. If something sold out in the meantime, the customer is told before handoff.

---

## 8. Admin panel specification

Route prefix `/admin`. Protected by Next.js middleware — any unauthenticated request redirects to `/admin/login`. All admins have identical permissions. Left sidebar navigation, dense data tables, no marketing chrome.

| Module | Capabilities |
|---|---|
| **Dashboard** | Today/7d/30d tiles: product views, add-to-carts, WhatsApp clicks, leads. New leads needing contact. Reviews awaiting moderation. Low-stock alerts (`stock_qty <= 3`). Recent orders |
| **Products** | Searchable, filterable, paginated table (thumbnail, name, SKU, category, price, total stock, status). Create/edit with a live slug preview, drag-to-reorder image upload to Cloudinary, size selection from the library with a stock box per size, MRP/price with auto-calculated discount %, custom `attributes` key/value editor, SEO overrides. Duplicate product (essential when each colourway is its own product). Archive rather than hard-delete |
| **Categories** | Drag-and-drop tree with nesting, slug, image, nav visibility, active toggle, SEO fields. Delete is blocked while products or child categories reference it |
| **Sizes** | Manage the size library — add, rename, reorder, deactivate |
| **Stock** | Fast single-screen view of every variant with inline-editable `stock_qty`, filterable to low/out of stock. This is the screen used daily after WhatsApp orders |
| **Leads** | Table of site-captured leads: name, phone, pincode, cart contents, total, source/UTM, status. One-click "Open in WhatsApp". Update status. **"Convert to Order"** pre-fills a new order from the lead's cart |
| **Orders** | Manual creation with product search-and-add, quantity, price override, customer and address fields, shipping charge, status pipeline, courier + tracking number, internal notes. Printable order slip. Marking an order confirmed **prompts** to decrement the matching stock (a prompt, never silent) |
| **Reviews** | Moderation queue defaulting to `pending`. Preview with photos. Approve / Reject with a note. Toggle "Verified Buyer". Edit for typos. Unpublish an approved review |
| **Review invites** | Generate an invite for a product (optionally linked to an order), copy the link, or open WhatsApp with a pre-filled request message. Track pending/used/expired. Revoke |
| **Banners** | Upload desktop + mobile images, headline, CTA, schedule with start/end dates, drag to reorder, activate/deactivate |
| **Pages** | Markdown editor with live preview for the seven static pages. SEO fields. Publish toggle |
| **Admins** | List admins, invite a new admin by email (Supabase Auth invite), deactivate. An admin cannot deactivate themselves |
| **Analytics** | See §11.3 |
| **Settings** | WhatsApp number, brand tagline, announcement bar text, contact email/phone, Instagram URL, shipping note, GA4 / Meta Pixel / Google Ads IDs |

**Cross-cutting admin behaviour**

- Every mutation is a **Server Action** with Zod validation on the server. Never trust the client.
- Saving anything public calls `revalidatePath` / `revalidateTag` so the live site updates within seconds, not on the next ISR window.
- Optimistic UI with toast confirmations; destructive actions require a typed confirmation.
- Slugs are auto-generated but always manually overridable, with a uniqueness check.

---

## 9. WhatsApp order flow

```
Product page ──▶ select size ──▶ Add to Cart ──▶ Cart ──▶ "Continue on WhatsApp"
                                                            │
                                                            ▼
                                          ┌─────────────────────────────────┐
                                          │  Lead form (modal)              │
                                          │  Name*    Phone*    Pincode     │
                                          │  [ Continue to WhatsApp → ]     │
                                          └─────────────────────────────────┘
                                                            │
                       1. Zod-validate (Indian 10-digit phone, 6-digit PIN)
                       2. Re-check stock server-side
                       3. INSERT into leads (with cart snapshot + UTMs)
                       4. Fire `lead_submitted` + `whatsapp_click` events
                       5. window.open(wa.me link)   ← new tab
                                                            │
                                                            ▼
                                                   WhatsApp, pre-filled
                                                            │
                                   Admin replies, confirms, collects payment
                                                            │
                                                            ▼
                              Admin panel: Lead → "Convert to Order" → decrement stock
```

### Pre-filled message format

```
Hi House of Shivalika! I'd like to order:

1. Ivory Cotton Kurta
   SKU: HOS-1042 | Size: M | Qty: 1
   ₹1,299
   https://houseofshivalika.com/product/ivory-cotton-kurta

2. Sage Linen Co-ord Set
   SKU: HOS-1077 | Size: L | Qty: 2
   ₹3,598
   https://houseofshivalika.com/product/sage-linen-co-ord-set

------------------------------
Total: ₹4,897
Name: Priya Sharma
Phone: 98XXXXXXXX
Pincode: 560001
Ref: LEAD-0342
```

**Implementation notes**

- `https://wa.me/<number>?text=<encodeURIComponent(message)>` — no API, no token, no cost.
- The `Ref: LEAD-####` line lets the admin find the exact lead record instantly.
- The WhatsApp number comes from `site_settings`, so it can be changed without a deploy.
- Opened via `window.open(url, '_blank')` so the customer keeps the site tab.
- If the customer abandons after submitting the form, **the lead is already saved** — that's the whole point of capturing before the redirect.
- Phone validation: Indian mobile, `^[6-9]\d{9}$`, with an optional `+91` stripped.

---

## 10. Review flow

Reviews are **invite-only**. There is no public "Write a review" button anywhere on the site — that is what makes fake reviews impossible without also making customer accounts necessary.

```
Admin → Reviews → Review Invites → "New invite"
        pick product (+ optional order, customer name, phone)
                    │
                    ▼
        Token generated → https://houseofshivalika.com/review/<token>
                    │
        "Send on WhatsApp" opens wa.me with a pre-filled request
                    │
                    ▼
        Customer opens link (valid 60 days, single use, noindex)
        ┌──────────────────────────────────────┐
        │  Reviewing: Ivory Cotton Kurta       │
        │  ★ ★ ★ ★ ★                           │
        │  Your name *                         │
        │  Title                               │
        │  Your review *                       │
        │  Add photos (up to 4, 5 MB each)     │
        │  [ Submit ]                          │
        └──────────────────────────────────────┘
                    │
        INSERT review (status = pending) ; invite marked `used`
                    │
                    ▼
        Admin moderation queue → Approve / Reject
        (+ optional "Verified Buyer" flag)
                    │
                    ▼
        Live on the product page, product page revalidated
```

**Rules**

- An invalid, expired or already-used token renders a friendly "This link is no longer valid" page — never an error or a stack trace.
- One review per invite, enforced by the `UNIQUE` constraint on `reviews.invite_id`.
- Photos upload directly to Cloudinary via a **signed** upload (signature generated server-side; the API secret never reaches the browser), restricted to images, max 5 MB, max 4 files.
- Rate limit: max 5 submissions per IP per hour.
- Rejected reviews are retained for the record, never shown publicly.
- `noindex, nofollow` on all `/review/*` pages.

---

## 11. Analytics specification

### 11.1 What we collect

Anonymous, first-party, no personal data. A random `visitor_id` UUID in `localStorage` and a `session_id` that rotates after 30 minutes of inactivity. No IP addresses are stored, no fingerprinting, no cross-site tracking.

| Event | Fires when | Key fields |
|---|---|---|
| `page_view` | Every route change | `path`, `referrer_host`, UTMs, `device_type` |
| `product_view` | PDP visible ≥ 2s | `product_id`, `category_id` |
| `category_view` | Listing page render | `category_id` |
| `search` | Search submitted | `search_query`, result count |
| `size_select` | Size pill clicked | `product_id`, `size_label` |
| `add_to_cart` | Added to cart | `product_id`, `size_label`, `value` |
| `remove_from_cart` | Removed from cart | `product_id` |
| `cart_view` | Cart page opened | `value`, item count |
| `lead_form_open` | Lead modal opened | `value` |
| `lead_submitted` | Form submitted successfully | `value` |
| `whatsapp_click` | WhatsApp redirect fired | `value` |

### 11.2 How it's collected

- A small client hook buffers events and POSTs them to `/api/track` in batches — flushed at 5 events, on route change, or on `visibilitychange`/`pagehide` via `navigator.sendBeacon`.
- The server validates the `event_type` against the fixed enum, discards anything unrecognised, and bulk-inserts.
- The ingest route is rate-limited per visitor. Bots and known crawler UAs are dropped.
- `product_view` uses an IntersectionObserver with a 2-second dwell so accidental scroll-bys don't inflate the numbers.

### 11.3 Admin analytics dashboard

Date-range selector (Today / 7d / 30d / 90d / custom) on every panel.

1. **Funnel** — Product views → Add to cart → Cart view → Lead submitted → WhatsApp click, with conversion % at each step and absolute drop-off.
2. **Top products** — table ranked by views, with add-to-carts, WhatsApp clicks and a **view→WhatsApp conversion rate** per product. This is the single most actionable screen: high views + low conversion means the price, photos or copy are wrong.
3. **Category performance** — views, conversion rate and drop-off by category.
4. **Traffic sources** — grouped by referrer host and UTM source/medium/campaign.
5. **On-site search terms** — most searched, plus **searches that returned zero results** (a direct list of products to stock next).
6. **Size demand** — `size_select` and `add_to_cart` counts by size, overall and per category. Tells you what to reorder.
7. **Leads** — count over time, converted vs lost, average cart value.
8. **Devices** — mobile / tablet / desktop split.

### 11.4 Third-party tags

GA4, Meta Pixel and the Google Ads conversion tag are injected via `next/script` **only after cookie consent is accepted**, with IDs read from `site_settings` so they can be swapped without a deploy. They mirror `product_view`, `add_to_cart` and `whatsapp_click` (as the conversion event) to build ad audiences for later campaigns.

---

## 12. Design system

**Direction:** editorial, quiet, generous. Off-white ground, near-black ink, one warm clay accent. Hairline rules instead of shadows. Near-square corners. Photography does the talking; the UI recedes.

### 12.1 Colour tokens

```css
--paper:        #FBF9F6;   /* page background — warm ivory        */
--surface:      #FFFFFF;   /* cards, modals                        */
--ink:          #1A1815;   /* primary text, buttons                */
--ink-muted:    #78716B;   /* secondary text, meta                 */
--line:         #E7E2DB;   /* hairline borders, dividers           */
--accent:       #8F6551;   /* clay — links, active states, focus   */
--accent-soft:  #F2E9E4;   /* accent backgrounds, hover fills      */
--sale:         #A4342B;   /* discount badge only                  */
--success:      #4A6B52;   /* in stock, confirmations              */
```

Light mode only. No dark mode.

### 12.2 Typography

- **Display / headings:** `Instrument Serif` — editorial, high-contrast, quietly expensive. Used for the wordmark, section headings and product names on the PDP.
- **Body / UI:** `Inter` — neutral, superb at small sizes.
- **Eyebrows, nav, buttons, labels:** Inter, uppercase, `letter-spacing: 0.12em`, 11–12px, medium weight. This one detail carries most of the "sophisticated" feel.
- Both self-hosted via `next/font` — zero layout shift, no Google Fonts request, no consent issue.

| Token | Size / line-height | Usage |
|---|---|---|
| `display` | 48–72px / 1.05 | Hero headline |
| `h1` | 32–44px / 1.15 | Page titles |
| `h2` | 24–30px / 1.2 | Section headings |
| `h3` | 18–20px / 1.3 | Card titles, accordions |
| `body` | 15–16px / 1.65 | Paragraphs |
| `small` | 13px / 1.5 | Meta, captions |
| `label` | 11–12px / 1.4, `0.12em` tracking, uppercase | Nav, buttons, eyebrows |

### 12.3 Layout & components

- **Grid:** max content width 1440px, 24px gutters mobile / 48px desktop. Full-bleed imagery breaks the container deliberately.
- **Spacing scale:** 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Section vertical rhythm is 96–128px on desktop — the whitespace is the design.
- **Radius:** 2px everywhere. Pills (size selectors) are the only exception.
- **Borders:** 1px `--line`. **No box-shadows** except a barely-there lift on modals.
- **Buttons:** Primary — solid `--ink`, white label, uppercase tracked. Secondary — 1px `--ink` outline, transparent fill. Both are square-ish with 14×28px padding. Hover is a colour shift, never a transform.
- **Product image ratio:** locked at **3:4 portrait**, `object-fit: cover`. Non-negotiable — consistent ratio is 80% of why a fashion grid looks professional.
- **Motion:** 200ms `ease-out` fades and colour transitions only. No bounce, no slide-in-on-scroll, no parallax. Everything respects `prefers-reduced-motion`.
- **Focus:** 2px `--accent` outline with a 2px offset on every interactive element. Never removed.

### 12.4 Accessibility baseline

- All text meets WCAG AA contrast (`--ink` on `--paper` is ~15:1).
- Every image has meaningful `alt` text (admin-editable per image).
- Full keyboard navigation, visible focus, logical tab order, skip-to-content link.
- Modals, drawers and accordions use Radix primitives — correct ARIA and focus trapping for free.
- Form errors are announced, tied to inputs with `aria-describedby`, and never colour-only.

---

## 13. SEO specification

Because there is no checkout, **organic search and Instagram are the only acquisition channels.** SEO is not a nice-to-have here.

### 13.1 Technical

- **Server rendering + ISR** — every page returns complete HTML. No client-side data fetching for indexable content.
- **URL structure** — `/product/[slug]`, `/shop/[...slug]`. Lowercase, hyphenated, no IDs, no query strings in canonicals.
- **Canonical tags** on every page. Filtered listing views (`?size=M`) canonicalise to the clean category URL to prevent duplicate-content dilution.
- **`sitemap.xml`** generated from the database at build and on revalidation: homepage, all active categories, all active products, all published static pages, with `lastmod`.
- **`robots.txt`** — allow everything except `/admin`, `/api`, `/review`, `/cart`.
- **`noindex`** on `/cart`, `/review/*`, `/admin/*` and zero-result search pages.
- **404s** return a real 404 status with a branded page and links back into the catalogue.
- **Core Web Vitals** — target LCP < 2.0s, CLS < 0.05, INP < 200ms. Achieved via Cloudinary AVIF/WebP with correct `sizes`, explicit dimensions on every image, `priority` on the LCP image only, self-hosted fonts, and near-zero client JS on listing pages.

### 13.2 On-page

- `<title>`: `{Product Name} — {Category} | House of Shivalika`, overridable per product in admin.
- `<meta description>`: falls back to `short_description`, overridable in admin.
- Exactly one `<h1>` per page.
- Open Graph + Twitter Card tags with the primary product image for clean WhatsApp/Instagram link previews — this matters more than usual given WhatsApp is the sales channel.
- Breadcrumbs rendered visually **and** as `BreadcrumbList` JSON-LD.
- Descriptive internal linking: categories → products → related products.

### 13.3 Structured data (JSON-LD)

| Schema | Where | Notes |
|---|---|---|
| `Organization` | Root layout | Name, logo, Instagram `sameAs`, contact |
| `WebSite` + `SearchAction` | Root layout | Enables the sitelinks search box |
| `BreadcrumbList` | Category & product pages | |
| `Product` + `Offer` | Product pages | Name, image, description, SKU, brand, price, `priceCurrency: INR`, `availability` from live stock |
| `ItemList` | Category pages | |
| `FAQPage` | Size Guide, Shipping, Returns | Wins extra SERP real estate at zero cost |

`AggregateRating` is **intentionally omitted** in v1 — the client opted out of review rich snippets, and publishing rating markup on a thin review base invites a manual penalty. The hook is in the code, commented, ready to enable once there's a genuine review base.

### 13.4 Reserved for later

`/journal/*` routes and a `posts` table are **not built**, but the URL namespace and nav slot are reserved so the blog can be added without touching existing URLs.

---

## 14. Security & privacy

### 14.1 Security

- **Service-role key is server-only.** It lives in a Netlify environment variable and is never referenced in a client component. The anon key is not shipped to the browser either, since the client never talks to Supabase directly.
- **Row Level Security enabled on every table with deny-by-default policies.** Defence in depth: even a leaked anon key yields nothing.
- **Admin routes guarded by middleware** and re-checked inside every Server Action. Never rely on the middleware alone.
- **All input Zod-validated server-side**, including data that was already validated on the client.
- **Uploads:** signed Cloudinary uploads only. MIME and size validated server-side. No arbitrary file types.
- **Rate limiting** on `/api/track`, review submission and the lead form.
- **Secrets never committed.** `.env.local` is gitignored; `.env.example` documents every key with dummy values.
- **Security headers** via `next.config`: HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, a Content-Security-Policy allowing only Cloudinary, Google and Meta.
- **Admin passwords** managed by Supabase Auth (bcrypt, rate-limited). No custom auth code.

### 14.2 Privacy (DPDP Act 2023)

- **First-party analytics is anonymous and non-personal** — random UUID, no IP storage, no fingerprinting, no cross-site tracking. It runs regardless of consent, which is defensible under DPDP.
- **GA4, Meta Pixel and Google Ads load only after explicit consent.** Decline means those scripts are never injected at all.
- **The consent choice is stored** with a timestamp and honoured on subsequent visits; the banner is re-openable from the footer so consent can be withdrawn.
- **Leads contain personal data** (name, phone, pincode). The Privacy Policy must state what is collected, why, how long it's kept, and how to request deletion. Admin can delete any lead permanently.
- **Review photos** are user-submitted content; the review form carries an explicit consent line permitting display on the site.

---

## 15. Repository structure

```
house-of-shivalika/
├── MASTER_PLAN.md              ← this file
├── CLAUDE.md                   ← working conventions for AI-assisted development
├── README.md                   ← setup & deploy instructions
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── supabase/
│   ├── migrations/             ← numbered SQL migrations, committed
│   └── seed.sql                ← sizes, default pages, first admin
├── public/
└── src/
    ├── app/
    │   ├── (storefront)/
    │   │   ├── layout.tsx              header, footer, cookie banner, cart provider
    │   │   ├── page.tsx                homepage
    │   │   ├── shop/[[...slug]]/
    │   │   ├── product/[slug]/
    │   │   ├── search/
    │   │   ├── cart/
    │   │   ├── review/[token]/
    │   │   └── (content)/[slug]/       static pages from the `pages` table
    │   ├── admin/
    │   │   ├── login/
    │   │   └── (dashboard)/
    │   │       ├── layout.tsx          sidebar shell + auth guard
    │   │       ├── page.tsx            dashboard
    │   │       ├── products/
    │   │       ├── categories/
    │   │       ├── sizes/
    │   │       ├── stock/
    │   │       ├── leads/
    │   │       ├── orders/
    │   │       ├── reviews/
    │   │       ├── invites/
    │   │       ├── banners/
    │   │       ├── pages/
    │   │       ├── admins/
    │   │       ├── analytics/
    │   │       └── settings/
    │   ├── api/
    │   │   ├── track/route.ts
    │   │   └── upload-signature/route.ts
    │   ├── sitemap.ts
    │   └── robots.ts
    ├── components/
    │   ├── ui/                 shadcn primitives (admin-facing)
    │   ├── storefront/         hand-built, brand-specific
    │   └── admin/
    ├── lib/
    │   ├── supabase/           server.ts, admin.ts, types.generated.ts
    │   ├── actions/            server actions, grouped by domain
    │   ├── schemas/            Zod schemas shared by client & server
    │   ├── cart.ts             client cart context + localStorage
    │   ├── whatsapp.ts         message builder + wa.me link builder
    │   ├── analytics.ts        client event buffer
    │   ├── cloudinary.ts       signed upload + URL builder
    │   └── seo.ts              metadata & JSON-LD helpers
    ├── middleware.ts           /admin guard
    └── styles/globals.css      design tokens
```

---

## 16. Environment variables

```bash
# Public site
NEXT_PUBLIC_SITE_URL=https://houseofshivalika.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=          # server only — never expose
SUPABASE_ANON_KEY=                  # server only in this architecture

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=              # server only
CLOUDINARY_UPLOAD_PRESET=

# Ops
REVALIDATE_SECRET=                  # on-demand revalidation webhook
CRON_SECRET=                        # scheduled function auth
```

GA4 / Meta Pixel / Google Ads IDs live in `site_settings` in the database, not in env, so they're changeable from the admin panel without a redeploy.

---

## 17. Build phases

Every phase ends with a working, reviewable local preview at `http://localhost:3000`.

### Phase 0 — Foundation
Next.js + TypeScript + Tailwind scaffold · design tokens, fonts, base components · GitHub repo with `.gitignore` and `.env.example` · Supabase project + full schema migration + seed · generated DB types · Cloudinary account and signed upload helper · `CLAUDE.md` and `README.md`.
**Deliverable:** repo running locally, connected to a live database.

### Phase 1 — Admin core
Supabase Auth + login + middleware guard · admin shell · Sizes · Categories tree · Products CRUD with image upload and per-size stock · Settings.
**Deliverable:** the team can load the entire catalogue. *Client can start entering real products from here.*

### Phase 2 — Storefront core
Header, footer, announcement bar, homepage · listing pages with filters, sort, load-more · product detail with gallery, size selector, accordions · search · 404/500.
**Deliverable:** a fully browsable public store.

### Phase 3 — Cart & WhatsApp
Cart context + localStorage · cart page · lead capture modal with server-side stock revalidation · lead persistence · WhatsApp message builder and handoff · floating WhatsApp button · Leads module in admin with "Convert to Order" · Orders module with the status pipeline.
**Deliverable:** the store can take orders end to end.

### Phase 4 — Reviews
Review invite generation + WhatsApp send · public token-gated review form with photo upload · moderation queue · reviews on the product page with the rating summary.
**Deliverable:** social proof is live.

### Phase 5 — Analytics & SEO
Event tracking client + `/api/track` · cookie consent banner · GA4 / Meta Pixel / Google Ads gated on consent · admin analytics dashboard · sitemap, robots, JSON-LD, OG images, metadata · Lighthouse pass.
**Deliverable:** measurable, indexable, ad-ready.

### Phase 6 — Content & launch
Draft and load copy for all seven static pages · Pages admin module · Banners module · domain purchase and DNS · Netlify production deploy · GSC + Bing verification, sitemap submission · nightly cron (keep-alive + analytics rollup) · final QA across devices.
**Deliverable:** live.

**Parallelisation:** the client can generate product photography and supply brand details from Phase 0 onward. Real products can be entered as soon as Phase 1 lands, so Phase 2 is built against real data rather than lorem ipsum.

---

## 18. Known risks & mitigations

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | **Vercel Hobby forbids commercial use** | ToS violation, possible takedown | Deploy to **Netlify free** (commercial use permitted). Vercel Pro at $20/mo is the upgrade path if we ever want it |
| 2 | **Stock drifts** — WhatsApp orders don't auto-decrement | Selling items that are gone | Confirming an order in admin **prompts** to decrement stock. Low-stock alerts on the dashboard. A dedicated fast Stock screen for daily reconciliation |
| 3 | **Supabase pauses after 7 idle days** | Site errors during a quiet dev week; data is never lost | Nightly cron ping. Restore is a 2-minute dashboard click. Irrelevant once live |
| 4 | **Cloudinary free bandwidth** (25 credits/mo) | Images stop serving at high traffic | Aggressive AVIF/WebP + correct `sizes` keeps typical pages under 400 KB. Monitor monthly; $89/mo Plus tier if it's ever hit — a good problem |
| 5 | **Analytics table growth** | Hits the 500 MB free DB limit | Nightly rollup into `analytics_daily` + 180-day raw retention. Indexes kept minimal |
| 6 | **Menswear later without a gender dimension** | Potential SEO rework | Mitigated by design: `/shop/[...slug]` is a catch-all over a nested category tree. Adding a top-level "Men" category yields `/shop/men/shirts` with **zero URL changes** to existing pages. If a full nav split is wanted later, it's a nav change, not a migration |
| 7 | **Fake or spam reviews** | Trust damage, Google penalty | Invite-only tokens + mandatory admin approval + no public review form. Structurally impossible to spam |
| 8 | **No GSTIN on an ecommerce site** | Potential compliance exposure | Client's decision, noted. **Flagged for their CA** — if turnover crosses the registration threshold, GST registration becomes mandatory and prices/invoices must change. The `site_settings` table has a GSTIN slot ready |
| 9 | **Legal page copy drafted by us** | Unreviewed liability terms | All seven pages will be clearly marked as drafts. The client **must** review Shipping, Returns, Privacy and Terms before launch, and set the actual returns window and shipping charges |
| 10 | **AI-generated product photography** | Inconsistent look; misleading-advertising risk if the garment differs from the render | Enforce a locked 3:4 ratio and a consistent background across all images. Recommend real photos of the actual garment for anything where fit, drape or colour accuracy drives returns |
| 11 | **No customer accounts** | Can't do order history, re-order or personalisation | Accepted and correct for v1 — the invite-link review flow removes the only real reason accounts were needed. The lead + order records mean we already have the customer data; accounts can be added later without a data migration |

---

## 19. Open items — needed from client

Blockers are marked ⛔. Everything else can be filled in with a placeholder and swapped later without rework.

| # | Item | Needed by | Notes |
|---|---|---|---|
| 1 | ⛔ **WhatsApp business number** | Phase 3 | The number orders will land on. Placeholder until then |
| 2 | ⛔ **Domain confirmation** | Phase 6 | `houseofshivalika.com` is the obvious pick — availability to be checked. `.in` as a backup. Register at Cloudflare |
| 3 | ⛔ **Category tree for launch** | Phase 1 | Can be entered directly in the admin panel once Phase 1 lands — no need to send it to us |
| 4 | ⛔ **Product photography + product data** | Phase 1 onward | The real critical-path item. Everything else can be built without it |
| 5 | **Logo** | Phase 2 | If none exists, we'll set a clean Instrument Serif wordmark that reads as intentional and is easy to replace |
| 6 | **Contact details** | Phase 6 | Email, phone and business address for the Contact page and legal pages |
| 7 | **Instagram handle** | Phase 2 | For the footer and `Organization` schema |
| 8 | **Shipping & returns policy** | Phase 6 | Actual numbers: shipping charge, free-shipping threshold, returns window, who pays return postage, what's non-returnable |
| 9 | **Size chart measurements** | Phase 6 | Real bust/waist/hip/length figures in inches per size. Without these the Size Guide page is filler and returns go up |
| 10 | **GA4 / Meta Pixel / Google Ads IDs** | Phase 5 | Can be added in admin Settings any time after launch |
| 11 | **Brand story copy** | Phase 6 | 100–150 words for the homepage and About page. We'll draft it if none is supplied |
| 12 | **Account access** | Phase 0 | We'll create Supabase, Cloudinary, Netlify and GitHub under the client's email and hand over credentials, or accept invites to existing accounts — client's preference |

---

## 20. Explicitly out of scope

Listed so nobody assumes they're coming:

- Online payments / checkout / payment gateway
- Customer accounts, login, order history, wishlist
- Back-in-stock notifications
- Coupons and discount codes
- WhatsApp Business API, chatbots, automated messages
- Courier / logistics integration, AWB tracking
- Colour variants within a single product (each colour is its own product)
- Product video
- CSV bulk import / export
- Admin roles and permissions
- Multi-language, multi-currency, international shipping
- Blog / journal (**routes reserved**, not built)
- Email marketing, newsletter, abandoned-cart recovery
- Dark mode
- Mobile-optimised admin (it will be responsive, not designed for mobile)
- Menswear catalogue (**enabled by the category tree**, not built)
- Review rich snippets / `AggregateRating` markup (**hook in place**, disabled)

---

*End of master plan. Amend this file before amending the code.*
