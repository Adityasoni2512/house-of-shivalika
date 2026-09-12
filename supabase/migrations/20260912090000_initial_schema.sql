-- =============================================================================
-- House of Shivalika — initial schema
-- =============================================================================
-- Design notes:
--   * All public data access happens server-side with the service-role key.
--     RLS is enabled everywhere with NO policies, so anon/authenticated get
--     nothing. This is defence in depth, not the primary access control.
--   * Status columns are text + CHECK rather than Postgres enums, because the
--     client expects to extend them and ALTER TYPE is painful in migrations.
--   * Snapshot columns on order_items are deliberate: a historical order must
--     render correctly after a product is renamed, re-priced or deleted.
-- =============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- fuzzy product search

-- -----------------------------------------------------------------------------
-- Helper: keep updated_at current
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =============================================================================
-- ADMIN & SETTINGS
-- =============================================================================

create table public.admins (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  full_name     text,
  is_active     boolean not null default true,
  created_by    uuid references public.admins(id) on delete set null,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger admins_updated_at
  before update on public.admins
  for each row execute function public.set_updated_at();

comment on table public.admins is
  'Admin users. Mirrors auth.users; all admins have identical permissions.';

-- Editable globals: whatsapp_number, announcement_bar, ga4_id, shipping, etc.
create table public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references public.admins(id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- =============================================================================
-- CATALOGUE
-- =============================================================================

create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  parent_id       uuid references public.categories(id) on delete restrict,
  description     text,
  image_url       text,
  position        integer not null default 0,
  is_active       boolean not null default true,
  show_in_nav     boolean not null default true,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint categories_not_own_parent check (id <> parent_id)
);

create index categories_parent_idx   on public.categories (parent_id);
create index categories_active_idx   on public.categories (is_active, position);

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

comment on table public.categories is
  'Self-referencing tree. A future top-level "Men" category yields /shop/men/... '
  'with no change to existing URLs.';

-- The size library. Admin picks which of these apply per product.
create table public.sizes (
  id         uuid primary key default gen_random_uuid(),
  label      text not null unique,
  position   integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id                uuid primary key default gen_random_uuid(),

  -- required core
  name              text not null,
  slug              text not null unique,
  sku               text not null unique,
  category_id       uuid not null references public.categories(id) on delete restrict,
  price             numeric(10,2) not null check (price >= 0),   -- incl. GST

  -- optional
  mrp               numeric(10,2) check (mrp is null or mrp >= 0),
  short_description text,
  description       text,
  colour_name       text,
  colour_hex        text,
  fabric            text,
  care              text,
  occasion          text,

  -- escape hatch for fields the client adds later, no migration needed
  attributes        jsonb not null default '{}'::jsonb,

  status            text not null default 'draft'
                      check (status in ('draft','active','archived')),
  is_featured       boolean not null default false,

  seo_title         text,
  seo_description   text,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint products_mrp_gte_price check (mrp is null or mrp >= price),

  -- full-text search over name + descriptions, weighted
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(short_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored
);

create index products_category_idx  on public.products (category_id);
create index products_status_idx    on public.products (status, published_at desc);
create index products_featured_idx  on public.products (is_featured) where is_featured;
create index products_search_idx    on public.products using gin (search_vector);
create index products_name_trgm_idx on public.products using gin (name gin_trgm_ops);
create index products_price_idx     on public.products (price);
create index products_colour_idx    on public.products (colour_name);

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

comment on column public.products.attributes is
  'Arbitrary admin-defined fields. Graduate to a real column if it needs filtering.';

create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  public_id  text not null,                  -- Cloudinary public_id
  url        text not null,
  alt_text   text,
  position   integer not null default 0,     -- 0 = primary / card image
  created_at timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, position);

-- One row per product x size. This is what stock is tracked against.
create table public.product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size_id    uuid not null references public.sizes(id) on delete restrict,
  sku        text unique,
  stock_qty  integer not null default 0 check (stock_qty >= 0),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (product_id, size_id)
);

create index product_variants_product_idx on public.product_variants (product_id);
create index product_variants_stock_idx   on public.product_variants (stock_qty)
  where is_active;

create trigger product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

-- =============================================================================
-- LEADS & ORDERS
-- =============================================================================

-- Captured automatically at WhatsApp handoff, before the customer leaves.
create table public.leads (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  phone              text not null,
  pincode            text,
  cart_snapshot      jsonb not null,
  cart_total         numeric(10,2),
  item_count         integer,
  status             text not null default 'new'
                       check (status in ('new','contacted','converted','lost')),
  admin_notes        text,
  visitor_id         uuid,                   -- joins to analytics_events
  utm_source         text,
  utm_medium         text,
  utm_campaign       text,
  converted_order_id uuid,                   -- FK added after orders exists
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index leads_status_idx  on public.leads (status, created_at desc);
create index leads_created_idx on public.leads (created_at desc);
create index leads_phone_idx   on public.leads (phone);

create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- Order numbers: HOS-0001, HOS-0002, ...
create sequence public.order_number_seq start 1;

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_number    text not null unique
                    default 'HOS-' || lpad(nextval('public.order_number_seq')::text, 4, '0'),
  lead_id         uuid references public.leads(id) on delete set null,

  customer_name   text not null,
  customer_phone  text not null,
  customer_email  text,
  address_line1   text,
  address_line2   text,
  city            text,
  state           text,
  pincode         text,

  status          text not null default 'confirmed'
                    check (status in ('confirmed','packed','shipped','delivered','cancelled','returned')),

  subtotal        numeric(10,2) not null default 0,
  discount        numeric(10,2) not null default 0,
  shipping_charge numeric(10,2) not null default 0,
  total           numeric(10,2) not null default 0,

  payment_note    text,
  courier_name    text,
  tracking_number text,
  admin_notes     text,

  created_by      uuid references public.admins(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index orders_status_idx  on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);
create index orders_phone_idx   on public.orders (customer_phone);
create index orders_lead_idx    on public.orders (lead_id);

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Close the circular reference now that orders exists.
alter table public.leads
  add constraint leads_converted_order_fk
  foreign key (converted_order_id) references public.orders(id) on delete set null;

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  variant_id   uuid references public.product_variants(id) on delete set null,

  -- snapshots: an order must render correctly forever
  product_name text not null,
  sku          text,
  size_label   text,
  image_url    text,
  unit_price   numeric(10,2) not null check (unit_price >= 0),
  qty          integer not null check (qty > 0),
  line_total   numeric(10,2) not null check (line_total >= 0),

  created_at   timestamptz not null default now()
);

create index order_items_order_idx   on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

-- =============================================================================
-- REVIEWS  (invite-only — there is no public "write a review" entry point)
-- =============================================================================

create table public.review_invites (
  id             uuid primary key default gen_random_uuid(),
  token          text not null unique,
  product_id     uuid not null references public.products(id) on delete cascade,
  order_id       uuid references public.orders(id) on delete set null,
  customer_name  text,
  customer_phone text,
  status         text not null default 'pending'
                   check (status in ('pending','used','expired','revoked')),
  expires_at     timestamptz not null default (now() + interval '60 days'),
  used_at        timestamptz,
  created_by     uuid references public.admins(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index review_invites_product_idx on public.review_invites (product_id);
create index review_invites_status_idx  on public.review_invites (status, created_at desc);

create table public.reviews (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products(id) on delete cascade,
  invite_id         uuid unique references public.review_invites(id) on delete set null,
  reviewer_name     text not null,
  rating            integer not null check (rating between 1 and 5),
  title             text,
  body              text,
  status            text not null default 'pending'
                      check (status in ('pending','approved','rejected')),
  is_verified_buyer boolean not null default false,
  admin_note        text,
  approved_by       uuid references public.admins(id) on delete set null,
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index reviews_product_idx  on public.reviews (product_id, status);
create index reviews_status_idx   on public.reviews (status, created_at desc);
create index reviews_approved_idx on public.reviews (product_id, created_at desc)
  where status = 'approved';

create trigger reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

create table public.review_images (
  id        uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  public_id text not null,
  url       text not null,
  position  integer not null default 0
);

create index review_images_review_idx on public.review_images (review_id, position);

-- =============================================================================
-- CONTENT
-- =============================================================================

create table public.banners (
  id            uuid primary key default gen_random_uuid(),
  title         text,
  subtitle      text,
  image_desktop text not null,
  image_mobile  text,
  cta_label     text,
  cta_url       text,
  position      integer not null default 0,
  is_active     boolean not null default true,
  starts_at     timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index banners_active_idx on public.banners (is_active, position);

create trigger banners_updated_at
  before update on public.banners
  for each row execute function public.set_updated_at();

create table public.pages (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  body            text not null default '',
  seo_title       text,
  seo_description text,
  is_published    boolean not null default true,
  updated_by      uuid references public.admins(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger pages_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

-- =============================================================================
-- ANALYTICS
-- =============================================================================

create table public.analytics_events (
  id            bigserial primary key,
  visitor_id    uuid not null,
  session_id    uuid not null,
  event_type    text not null check (event_type in (
                  'page_view','product_view','category_view','search','size_select',
                  'add_to_cart','remove_from_cart','cart_view','lead_form_open',
                  'lead_submitted','whatsapp_click')),
  product_id    uuid references public.products(id) on delete set null,
  category_id   uuid references public.categories(id) on delete set null,
  size_label    text,
  search_query  text,
  path          text,
  referrer_host text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  device_type   text check (device_type in ('mobile','tablet','desktop')),
  value         numeric(10,2),
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index analytics_created_idx  on public.analytics_events (created_at desc);
create index analytics_type_idx     on public.analytics_events (event_type, created_at desc);
create index analytics_product_idx  on public.analytics_events (product_id, event_type);
create index analytics_visitor_idx  on public.analytics_events (visitor_id, created_at);
create index analytics_search_idx   on public.analytics_events (search_query)
  where event_type = 'search';

comment on table public.analytics_events is
  'Anonymous first-party events. No IP, no fingerprinting. Raw rows are rolled '
  'into analytics_daily and deleted after 180 days to stay inside the free tier.';

-- Nightly rollup so raw events can be pruned without losing history.
create table public.analytics_daily (
  day             date not null,
  product_id      uuid references public.products(id) on delete cascade,
  views           integer not null default 0,
  add_to_carts    integer not null default 0,
  whatsapp_clicks integer not null default 0,
  primary key (day, product_id)
);

create index analytics_daily_day_idx on public.analytics_daily (day desc);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
-- Enabled with no policies: anon and authenticated roles get nothing at all.
-- The application reaches the database only with the service-role key, from
-- server components and server actions, after its own authorisation checks.
-- =============================================================================

alter table public.admins            enable row level security;
alter table public.site_settings     enable row level security;
alter table public.categories        enable row level security;
alter table public.sizes             enable row level security;
alter table public.products          enable row level security;
alter table public.product_images    enable row level security;
alter table public.product_variants  enable row level security;
alter table public.leads             enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.review_invites    enable row level security;
alter table public.reviews           enable row level security;
alter table public.review_images     enable row level security;
alter table public.banners           enable row level security;
alter table public.pages             enable row level security;
alter table public.analytics_events  enable row level security;
alter table public.analytics_daily   enable row level security;
