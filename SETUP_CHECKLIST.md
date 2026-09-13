# House of Shivalika — Non-Code Setup Checklist

> **What this is:** everything that needs a human — accounts, credentials, content, business
> decisions, legal sign-off. None of it is code, none of it blocks development. Work through
> it after the build is complete.
>
> **How to use it:** tick items as you go. Anything marked 🔑 produces a value that goes into
> `.env.local` — paste it into that file directly, never into chat.
>
> **Companion to:** [MASTER_PLAN.md](MASTER_PLAN.md) — the technical spec.
> **Last updated:** 2026-09-13

---

## 🎉 The code is finished

All seven build phases are complete, tested against the live database, and
pushed — 14 commits on `main`. Nothing on this list blocks development any
more; it is now the only thing standing between you and launch.

Run it locally with `npm run dev`: storefront at `localhost:3000`, admin at
`/admin`.

## Already done ✅

| Item | Detail |
|---|---|
| GitHub repository | `Adityasoni2512/house-of-shivalika` · 14 commits · no secrets tracked |
| Supabase project | `House-of-shivalika` · `jswlbptdefeezpsessub` · ap-southeast-1 · Postgres 17.6 |
| Database schema | 17 tables applied, RLS verified blocking, seed data loaded |
| Supabase CLI | Linked; `npx supabase db push` works |
| Service role key | In `.env.local` |
| Ops secrets | `REVALIDATE_SECRET`, `CRON_SECRET` generated |
| First admin account | Created — change the password at **admin → Admins** |
| Static page copy | Drafted and loaded for all seven pages |

---

## Do these first

In order. The first three are what stop the site from functioning at all.

| | Item | Section | Time | What it unblocks |
|---|---|---|---|---|
| 1 | **Cloudinary account** | §1.1 | 10 min | Every image upload. Nothing can be uploaded without it |
| 2 | **Product photography + data** | §1.4 | ongoing | Having anything to sell — the real critical path |
| 3 | **WhatsApp number** | §3.1 | 5 min | Taking a single order. Buttons stay hidden until set |
| 4 | **Domain** | §6.1 | 15 min | Going live |
| 5 | **Netlify account** | §6.2 | 30 min | Deployment |

Then the legal numbers and size chart (§7.1) before you take a real order.

### Change your admin password

It was set during the build and passed through a chat transcript. Sign in, go
to **admin → Admins → Change your password**. Two minutes.

---

## 1. Catalogue & admin

### 1.1 🔑 Cloudinary account — **BLOCKING**

Image hosting and delivery. Nothing can be uploaded without it.

1. Sign up free at [cloudinary.com/users/register_free](https://cloudinary.com/users/register_free)
2. **Settings → API Keys** → copy **Cloud name**, **API Key**, **API Secret**
3. **Settings → Upload → Upload presets → Add upload preset**
   - Name: `house-of-shivalika`
   - Signing mode: **Signed**
   - Folder: `house-of-shivalika`
   - Save
4. Paste into `.env.local`:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   ```

**Blocks:** all product images, banners, review photos.
**Time:** ~10 minutes. **Cost:** free.

---

### 1.2 Admin accounts — ✅ first one created

The first admin exists and works. What is left:

- [ ] **Change the password.** It was set during the build and passed through a chat transcript. **admin → Admins → Change your password**
- [ ] Add accounts for anyone else on the team — **admin → Admins**. Everyone has identical access; there are no roles
- [ ] Consider moving to a shared address (`admin@houseofshivalika.com`) once business email is set up (§6.3), so access does not sit in one person's inbox

**Time:** 2 minutes.

---

### 1.3 Category tree

Entered directly in the admin panel — nothing to send anyone. Worth sketching on paper first, because category slugs become URLs and changing them later costs SEO.

- [ ] List top-level categories (e.g. Kurtas, Co-ord Sets, Dresses, Tops, Bottoms)
- [ ] List sub-categories under each, if any
- [ ] Decide display order
- [ ] One tile image per top-level category (for the homepage)

**Naming guidance:** use what customers actually search for. "Co-ord Sets" beats "Matching Separates".

---

### 1.4 Product photography & data — **CRITICAL PATH**

The single biggest dependency in the project.

**Per product you will need:**

- [ ] 3–6 images, **all 3:4 portrait**, consistent background
- [ ] Product name
- [ ] SKU code (suggest `HOS-1001` upward)
- [ ] Category
- [ ] MRP and selling price (inclusive of GST)
- [ ] Short description (1–2 lines, used for meta descriptions)
- [ ] Long description
- [ ] Which sizes exist, and stock count for each
- [ ] Optional: fabric, care instructions, occasion, colour name

**Photography rules that matter more than they sound:**

| Rule | Why |
|---|---|
| Same aspect ratio every time (3:4) | The single biggest factor in whether a grid looks professional |
| Same background across a category | Inconsistency reads as amateur instantly |
| First image = the hero shot | It appears in the grid, in search, and in WhatsApp link previews |
| Minimum 1200×1600px | Below this, zoom looks soft on retina screens |

⚠️ **On AI-generated imagery:** fine for launch and for mood, but if the render does not match the actual garment's drape, colour or fit, you will eat returns and complaints — and under consumer protection rules, misleading product representation is a real exposure. Strongly consider real photographs for anything where fit or colour accuracy drives the purchase.

---

## 2. Brand & storefront content

### 2.1 Logo

- [ ] Supply a logo file (SVG preferred, transparent PNG acceptable), **or** confirm you are happy with a typeset Instrument Serif wordmark

A clean wordmark reads as deliberate and is trivially replaceable later. Not worth blocking on.

### 2.2 Copy

- [ ] **Brand story** — a draft is live on the About page. Read it and rewrite in your own voice; it is written blind, so it will not sound like you yet. **admin → Pages → About**
- [ ] **Announcement bar** — one line, e.g. "Free shipping on orders above ₹1,499". Off by default. **admin → Settings**
- [ ] **Homepage hero** — headline + eyebrow + 1–3 banner images (desktop 2400×1000px, mobile 1200×1500px). **admin → Banners**

Without a banner the homepage falls back to a clean typographic hero, which
reads as deliberate rather than broken — so this is not urgent.

### 2.3 Social

- [ ] Instagram handle/URL — for the footer and `Organization` schema
- [ ] Any other profiles to link

---

## 3. Orders & WhatsApp

### 3.1 WhatsApp business number — **BLOCKING**

- [ ] The number that will receive orders, with country code (e.g. `919876543210`)
- [ ] Install **WhatsApp Business** (free app) on that number
- [ ] Set up: business profile, display name "House of Shivalika", profile photo, business hours
- [ ] Configure a **greeting message** and an **away message**
- [ ] Consider **quick replies** for the questions you will answer fifty times a day

Goes in **admin → Settings**, not in a file — changeable any time without a deploy.

### 3.2 Payment collection

Orders are confirmed over WhatsApp, so payment is manual. Decide how:

- [ ] UPI ID to share with customers
- [ ] Bank transfer details, if offered
- [ ] Cash on delivery — offered or not? If yes, any pincode restrictions?
- [ ] Advance payment required, or pay-on-delivery?

*(Not stored in the site — but you need a consistent answer before you take the first order.)*

### 3.3 Shipping decisions

- [ ] Flat shipping charge (₹)
- [ ] Free shipping threshold (₹), if any
- [ ] Typical dispatch time (e.g. "ships in 2–3 business days")
- [ ] Typical delivery time
- [ ] Courier partner(s)
- [ ] Any pincodes you do not serve

Feeds the Shipping Policy page and the cart's shipping note.

---

## 4. Reviews

- [ ] Read the review-request WhatsApp message — it is written and wired to the one-click send button on each invite. Reword it if you would say it differently
- [ ] Confirm the invite link expiry — currently **60 days**, changeable at **admin → Settings**
- [ ] Decide who on the team moderates reviews, and how often

**Process reminder:** reviews are invite-only. After an order is delivered, generate an invite in admin and send the link over WhatsApp. Nothing appears publicly until approved.

---

## 5. Analytics & marketing

### 5.1 Google Analytics 4

1. [ ] Create a property at [analytics.google.com](https://analytics.google.com)
2. [ ] Data Stream → Web → your domain
3. [ ] Copy the **Measurement ID** (`G-XXXXXXXXXX`)
4. [ ] Paste into **admin → Settings** (not `.env.local`)

**Cost:** free.

### 5.2 Meta Pixel

1. [ ] [business.facebook.com](https://business.facebook.com) → Events Manager → Connect Data Source → Web
2. [ ] Copy the **Pixel ID**
3. [ ] Paste into **admin → Settings**

Worth doing even with no ad plans — it accumulates audience data from day one, and you cannot backfill it later.

### 5.3 Google Ads (optional)

- [ ] Create account, set up a conversion action for `whatsapp_click`
- [ ] Copy the conversion ID into **admin → Settings**

### 5.4 Search Console & Bing

- [ ] [Google Search Console](https://search.google.com/search-console) → add property → verify via DNS TXT record
- [ ] Submit `https://yourdomain.com/sitemap.xml`
- [ ] [Bing Webmaster Tools](https://www.bing.com/webmasters) → import from GSC (one click)

**Do this on launch day.** Indexing takes days to weeks — the clock starts when you submit.

---

## 6. Domain, hosting & launch

### 6.1 🔑 Domain

- [ ] Check availability of `houseofshivalika.com` (fallbacks: `.in`, `houseofshivalika.co.in`, `shivalika.com`)
- [ ] Register at [Cloudflare Registrar](https://dash.cloudflare.com) — sold at wholesale cost, no renewal markup, free WHOIS privacy
- [ ] Enable auto-renew *(losing a domain you rank on is close to unrecoverable)*

**Cost:** ~₹1,000/year. This is the project's only guaranteed expense.

### 6.2 🔑 Netlify

1. [ ] Sign up at [netlify.com](https://netlify.com) — use **GitHub sign-in**
2. [ ] Add new site → Import from GitHub → `house-of-shivalika`
3. [ ] Build command `npm run build`, publish directory `.next`
4. [ ] **Site settings → Environment variables** — add every key from `.env.local` **except** `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` (local tooling only, never needed in production)
5. [ ] Set `NEXT_PUBLIC_SITE_URL` to the real domain, not localhost
6. [ ] Domain settings → add custom domain → point DNS at Netlify
7. [ ] Confirm the HTTPS certificate issues automatically

⚠️ **Not Vercel.** Vercel's free Hobby tier prohibits commercial use, and this is a revenue-generating store. Netlify's free tier permits it explicitly.

**Cost:** free. **Time:** ~30 minutes including DNS propagation.

### 6.3 Business email

- [ ] Set up `hello@houseofshivalika.com` — [Zoho Mail](https://www.zoho.com/mail/) free tier (5 users, own domain) is the cheapest credible option
- [ ] Use it for the Contact page, order correspondence and account registrations

A `@gmail.com` address on a fashion brand's contact page costs you trust at exactly the wrong moment.

---

## 7. Legal & policy — **review before launch**

**All seven pages are drafted and live in the database.** Edit them at
**admin → Pages** — the four legal ones show a warning banner in the editor.

They contain **`[BRACKETED]` placeholders** that must be replaced with real
values. Search each page for `[` to find them.

**You must read and approve all four** — they are commitments to customers, and
we are not your lawyers.

### 7.1 Values to fill in

| Page | Placeholders to replace |
|---|---|
| **Shipping Policy** | `[₹ AMOUNT]` charge · `[₹ THRESHOLD]` free shipping · `[N]` dispatch days · `[N–N]` delivery days · `[COURIER NAMES]` |
| **Returns & Exchange** | `[N]` day window · who pays return postage · `[N]` refund days · whether shipping is refundable |
| **Size Guide** | The whole measurement table — currently `[ ]` for every cell |
| **Privacy Policy** | `[DATE]` · `[N months]` lead retention · `[N years]` order retention · `[CONTACT EMAIL]` |
| **Terms of Service** | `[DATE]` · `[CITY]` for jurisdiction · `[CONTACT EMAIL]` |

⚠️ **The size chart is not filler.** For fast fashion it is the single biggest
lever on your return rate. Guessed measurements cost real money every month, and
the page currently ships with an empty table and a visible warning.

⚠️ **Do not launch with the brackets still in.** They are deliberately ugly so
they cannot be missed, but they will be public the moment you deploy.

### 7.2 Sign-off

- [ ] Read and approve Shipping Policy
- [ ] Read and approve Returns & Exchange Policy
- [ ] Read and approve Privacy Policy
- [ ] Read and approve Terms of Service
- [ ] Confirm the returns window you can actually honour operationally

### 7.3 GST — talk to your CA

You have chosen to launch without a GSTIN, with prices inclusive of tax. That is your call and the site supports it. But:

- [ ] Confirm with your CA whether your expected turnover crosses the GST registration threshold
- [ ] If registration becomes mandatory, you will need to display the GSTIN and issue compliant invoices

A settings slot for GSTIN is already built, so adding it later is a one-field change, not a rebuild.

---

## 8. Post-launch

| Item | When | Why |
|---|---|---|
| 🔑 **Rotate the Supabase PAT** | Soon | The current token was pasted into a chat transcript. Revoke at [account/tokens](https://supabase.com/dashboard/account/tokens), generate a new one, paste into `.env.local`. Account-wide access — worth doing before real customer data exists |
| Google Business Profile | Week 1 | Free local search presence |
| Instagram link-in-bio | Launch day | Your warmest traffic source |
| Submit sitemap to GSC | Launch day | Indexing takes weeks; start the clock |
| Watch Cloudinary usage | Monthly | Free tier is 25 credits/month |
| Watch Supabase DB size | Monthly | Free tier is 500 MB |
| Supabase Pro ($25/mo) | When it matters | Unlocks daily backups. **Do this before you have orders you cannot afford to lose** |
| Review Core Web Vitals | Month 1 | GSC reports real-user data after ~28 days |
| Run a Lighthouse audit | After real photos | Deliberately skipped during the build — it is meaningless against placeholder imagery |

### Before your first real customer

```bash
node --env-file=.env.local scripts/clear-test-data.mjs
```

The database holds one test product, two test categories, a test review and some
test analytics rows from build verification. The script removes only those —
anything with a `test-` slug, a `TEST-` SKU, or the seeded test visitor id. Real
records are untouched.

---

## Running cost summary

| Item | Cost |
|---|---|
| Domain | ~₹1,000 / year |
| Supabase, Netlify, Cloudinary, GitHub, GA4, Meta Pixel | ₹0 |
| **Total to launch** | **~₹1,000 / year** |
| First likely upgrade | Supabase Pro — $25/mo, for backups |

---

## Quick reference — where each value goes

| Value | Destination |
|---|---|
| Cloudinary cloud name / key / secret | `.env.local` → later Netlify env vars |
| Supabase keys | `.env.local` → later Netlify env vars |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` | `.env.local` **only** — never Netlify |
| WhatsApp number | **admin → Settings** |
| GA4 / Meta Pixel / Google Ads IDs | **admin → Settings** |
| Announcement bar, tagline, contact details | **admin → Settings** |
| Shipping charge & threshold | **admin → Settings** |
| Page copy (About, Shipping, Returns…) | **admin → Pages** |
| Products, categories, sizes, stock | **admin → Products / Categories / Sizes** |
| Banners | **admin → Banners** |

Almost nothing lives in code. That is deliberate — you should not need a developer to change your shipping charge.
