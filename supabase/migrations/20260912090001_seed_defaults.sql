-- =============================================================================
-- House of Shivalika — default seed data
-- =============================================================================
-- Idempotent: safe to re-run. Page bodies are placeholders; real copy is
-- written later and is editable from admin -> Pages.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Size library
-- -----------------------------------------------------------------------------
insert into public.sizes (label, position) values
  ('XS',        1),
  ('S',         2),
  ('M',         3),
  ('L',         4),
  ('XL',        5),
  ('XXL',       6),
  ('Free Size', 7)
on conflict (label) do nothing;

-- -----------------------------------------------------------------------------
-- Site settings
-- -----------------------------------------------------------------------------
-- Every editable global lives here so the team can change it without a deploy.
insert into public.site_settings (key, value) values
  ('brand_name',              '"House of Shivalika"'::jsonb),
  ('brand_tagline',           '"Considered clothing for everyday women"'::jsonb),

  -- WhatsApp: digits only, with country code, no + or spaces. e.g. 919876543210
  ('whatsapp_number',         '""'::jsonb),

  ('announcement_enabled',    'false'::jsonb),
  ('announcement_text',       '"Free shipping on orders above Rs. 1,499"'::jsonb),

  ('contact_email',           '""'::jsonb),
  ('contact_phone',           '""'::jsonb),
  ('contact_address',         '""'::jsonb),
  ('contact_hours',           '"Monday to Saturday, 10am to 7pm IST"'::jsonb),

  ('instagram_url',           '""'::jsonb),

  ('shipping_flat_rate',      '0'::jsonb),
  ('free_shipping_threshold', '0'::jsonb),
  ('shipping_note',           '"Shipping charges confirmed on WhatsApp"'::jsonb),

  -- Analytics / ad tags. Injected only after cookie consent.
  ('ga4_id',                  '""'::jsonb),
  ('meta_pixel_id',           '""'::jsonb),
  ('google_ads_id',           '""'::jsonb),
  ('google_ads_conversion_label', '""'::jsonb),

  -- Reserved: populate if GST registration becomes mandatory.
  ('gstin',                   '""'::jsonb),

  ('review_invite_days',      '60'::jsonb)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Static pages
-- -----------------------------------------------------------------------------
insert into public.pages (slug, title, body, is_published) values
  ('about',      'About Us',
   '_Content pending._', true),
  ('contact',    'Contact',
   '_Content pending._', true),
  ('size-guide', 'Size Guide',
   '_Content pending. Real measurements required before launch._', true),
  ('shipping',   'Shipping Policy',
   '_Content pending. Requires confirmed charges and delivery times._', true),
  ('returns',    'Returns & Exchange',
   '_Content pending. Requires confirmed returns window and conditions._', true),
  ('privacy',    'Privacy Policy',
   '_Content pending. Requires review before launch._', true),
  ('terms',      'Terms of Service',
   '_Content pending. Requires review before launch._', true)
on conflict (slug) do nothing;
