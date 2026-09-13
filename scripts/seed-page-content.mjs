#!/usr/bin/env node
/**
 * Loads drafted copy into the seven static pages.
 *
 *   node --env-file=.env.local scripts/seed-page-content.mjs
 *
 * Only overwrites pages whose body is still the placeholder, so it will never
 * clobber copy the client has edited in the admin panel. Pass --force to
 * overwrite everything.
 *
 * IMPORTANT: Shipping, Returns, Privacy and Terms are DRAFTS. They contain
 * [SQUARE BRACKET] placeholders that must be filled in, and the client must
 * read and approve all four before launch. We are not their lawyers.
 */
import { createClient } from "@supabase/supabase-js";

const force = process.argv.includes("--force");

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const BRAND = "House of Shivalika";

const pages = {
  about: {
    title: "About Us",
    seo_description:
      "House of Shivalika makes considered, everyday clothing for women — thoughtful fabrics, honest prices, and pieces made to be worn often.",
    body: `${BRAND} began with a simple frustration: everyday clothing that is either beautiful or affordable, rarely both, and almost never comfortable enough to actually live in.

We make clothes for the days that are not occasions. The ones spent working, moving between places, seeing people you like. Pieces that hold their shape, wash well, and do not ask anything of you.

## How we work

We keep our collections small and our runs short. Every piece is chosen because we would wear it ourselves, not because a trend forecast said so. When something sells out, we would rather leave it sold out than rush a reorder we are not happy with.

Prices are what they are because we sell directly to you. There is no retail markup, no middle layer, and no inflated MRP designed to make a discount look bigger than it is.

## Ordering

We take orders over WhatsApp rather than through an automated checkout. It means a real person confirms your size, answers your questions about fit and fabric, and tells you honestly if something will not work for you. For clothing, that conversation is worth more than a faster checkout.

Browse the collection, add what you like, and send us a message. We will take it from there.`,
  },

  contact: {
    title: "Contact",
    seo_description: `Get in touch with ${BRAND}. We reply to every message.`,
    body: `We are a small team and we read every message ourselves.

## The fastest way

**WhatsApp.** Use the button on any page, or message the number below. This is where orders happen, and it is where you will get the quickest answer about sizing, fabric, availability or delivery.

## What to expect

We usually reply within a few hours during working hours, and by the next morning otherwise. If you have messaged about an order, it helps to include your order number.

## Before you write

You may find the answer faster here:

- [Size guide](/size-guide) — measurements for every size
- [Shipping](/shipping) — charges, timelines and coverage
- [Returns & exchange](/returns) — what can be returned and how`,
  },

  "size-guide": {
    title: "Size Guide",
    seo_description: `Measurements and fit guidance for ${BRAND}. Find your size before you order.`,
    body: `Getting the size right the first time saves everyone the trouble of an exchange. If you are between sizes or unsure, message us on WhatsApp with your measurements — we will tell you honestly which size to take.

## How to measure

Measure over your underwear, not over clothes, and keep the tape snug but not tight.

**Bust** — around the fullest part of your chest, tape parallel to the floor.
**Waist** — around the narrowest part of your torso, usually just above the navel.
**Hip** — around the fullest part of your hips, roughly 20 cm below the waist.

## Size chart

> **These measurements are pending.** Real figures must be added before launch — guessed numbers are the single biggest cause of returns in fast fashion.

| Size | Bust (in) | Waist (in) | Hip (in) |
| --- | --- | --- | --- |
| XS | [ ] | [ ] | [ ] |
| S | [ ] | [ ] | [ ] |
| M | [ ] | [ ] | [ ] |
| L | [ ] | [ ] | [ ] |
| XL | [ ] | [ ] | [ ] |
| XXL | [ ] | [ ] | [ ] |

## A note on fit

Garment measurements are not body measurements. Most of our pieces are cut with ease built in, so the garment will measure larger than your body. Individual product pages mention where something runs closer or looser than usual.

Fabrics behave differently too. Cotton relaxes slightly with wear; structured weaves do not. If a piece has a specific fit note, it is on the product page.

## Still unsure?

Message us. Tell us your usual size in a brand you wear often, and we will match it.`,
  },

  shipping: {
    title: "Shipping Policy",
    seo_description: `Shipping charges, delivery timelines and coverage for ${BRAND}.`,
    body: `> **Draft.** The bracketed values below must be confirmed before launch.

## Where we ship

We currently ship across India. We do not ship internationally.

## Charges

Shipping is **[₹ AMOUNT]** on all orders. Orders above **[₹ THRESHOLD]** ship free.

The exact charge for your order is confirmed on WhatsApp before you pay, so there are no surprises.

## Dispatch

Orders are dispatched within **[N] business days** of payment being confirmed. We do not dispatch on Sundays or public holidays.

If something you have ordered turns out to be unavailable, we will tell you before taking payment, not after.

## Delivery

Once dispatched, delivery usually takes **[N–N] business days** depending on your location. Metro cities are typically at the faster end of that range.

We ship with **[COURIER NAMES]**. You will receive a tracking number on WhatsApp as soon as your parcel leaves us.

## Delays

Occasionally deliveries are delayed by weather, strikes, or courier backlogs during festival periods. We will keep you updated if your parcel is affected. Please allow a few extra days before treating a parcel as lost.

## Incorrect addresses

Please check your address carefully when you send it to us. If a parcel is returned because the address was incomplete or nobody was available, re-delivery will be charged again at the standard rate.

## Questions

Message us on WhatsApp with your order number and we will check the status for you.`,
  },

  returns: {
    title: "Returns & Exchange",
    seo_description: `Returns and exchange policy for ${BRAND} — what can be returned, how long you have, and how to start.`,
    body: `> **Draft.** The bracketed values below must be confirmed before launch, and the policy must be one you can operationally honour.

We want you to be happy with what you receive. If something is not right, tell us.

## The window

You may request a return or exchange within **[N] days** of delivery.

## What we can accept

Items must be:

- Unworn, unwashed and undamaged
- With all original tags still attached
- In their original packaging

## What we cannot accept

- Items bought during a clearance or final-sale promotion
- Items showing signs of wear, washing, alteration or damage
- Items returned after the [N]-day window

## Exchanges

The most common reason for an exchange is size. If the size you ordered does not fit, message us and we will arrange an exchange for a different size, subject to availability.

If the size you want is unavailable, we will offer a return instead.

## How to start

Message us on WhatsApp with:

1. Your order number
2. What you would like to return or exchange
3. The reason
4. A photo, if the item arrived damaged or incorrect

We will confirm whether the item is eligible and tell you what to do next.

## Return shipping

Return shipping is paid by **[YOU / THE CUSTOMER]**.

If we sent the wrong item, or the item arrived damaged, we cover the return shipping entirely — that is our mistake, not yours.

## Refunds

Once we receive and inspect the returned item, refunds are processed within **[N] business days** to the original payment method.

Original shipping charges are **[refundable / non-refundable]**.

## Damaged or incorrect items

Tell us within **[N] days** of delivery with a photo. We will replace the item or refund you in full, including all shipping costs, and we will not ask you to pay to send it back.`,
  },

  privacy: {
    title: "Privacy Policy",
    seo_description: `How ${BRAND} collects, uses and protects your personal information.`,
    body: `> **Draft.** This must be reviewed and approved before launch. It is written to reflect how the site actually behaves, but it is not legal advice.

_Last updated: [DATE]_

${BRAND} ("we", "us") operates this website. This policy explains what information we collect, why, and what you can do about it.

## What we collect

**When you place an order.** Your name, phone number and pincode, submitted through the form before you are taken to WhatsApp. If you go on to complete an order, we also record your delivery address and the items you bought.

**When you browse.** Anonymous statistics about which pages and products are viewed, which sizes are selected, and which searches are run. This information is not linked to your name, phone number or any other identifier, and we do not store your IP address.

**If you accept cookies.** Third-party cookies from Google and Meta, used to understand how our advertising performs. These load only if you accept them, and never before.

## What we do not collect

We do not take payments on this website, so we never see or store your card, UPI or banking details.

## Why we collect it

- To confirm, fulfil and deliver your order
- To answer your questions over WhatsApp
- To understand which products people are interested in, so we stock better
- To measure whether our advertising works, if you have accepted cookies

We do not sell your information. We do not share it with anyone except the courier delivering your parcel.

## How long we keep it

Enquiry records are kept for **[N months]**. Order records are kept for **[N years]**, as we are required to for accounting purposes. Anonymous site statistics are kept for 180 days and then deleted.

## Your rights

You can ask us to:

- Tell you what information we hold about you
- Correct anything that is wrong
- Delete your information entirely

Message us on WhatsApp or email **[CONTACT EMAIL]** and we will action it.

## Cookies

You can change your cookie choice at any time using the "Cookie preferences" link in the footer. Declining does not affect your ability to browse or order.

## Security

Information is stored in an encrypted database with access restricted to our team. Connections to this site are encrypted with HTTPS.

## Changes

If this policy changes materially, we will update the date at the top of this page.

## Contact

**[CONTACT EMAIL]**`,
  },

  terms: {
    title: "Terms of Service",
    seo_description: `Terms of service for ${BRAND}.`,
    body: `> **Draft.** This must be reviewed and approved before launch. It is not legal advice.

_Last updated: [DATE]_

By using this website you agree to these terms.

## About this website

This website displays our products and their prices. It does not process payments. Orders are placed and confirmed through WhatsApp with a member of our team.

## Orders

Adding an item to your cart and sending us a message is a **request to order**, not a completed order. An order exists only once we have confirmed availability and payment with you directly.

We may decline an order if:

- The item is no longer available
- There was a pricing or description error
- We cannot deliver to your location
- We have reason to believe the order is not genuine

## Prices

All prices are in Indian Rupees and are inclusive of applicable taxes.

We try hard to keep prices and product information accurate. If we discover an error affecting your order, we will tell you before taking payment and you may cancel without penalty.

Prices may change at any time, but a price confirmed to you on WhatsApp is the price you pay.

## Product representation

We photograph and describe our products as accurately as we can. Colours may appear slightly different between screens, and small variations are normal in textiles — particularly in dyed, printed or handworked fabrics. These are characteristics of the material, not defects.

## Availability

Stock shown on this site is maintained manually and can occasionally be out of date. If something you have asked for is unavailable, we will tell you straight away.

## Reviews

Reviews can only be submitted through a private link we send after an order has been delivered. By submitting a review you agree that your review, the name you give, and any photos you upload may be displayed publicly on this website.

We may decline to publish a review that is abusive, contains personal information, or is not about the product.

## Intellectual property

All content on this site — photographs, text, designs and the ${BRAND} name — belongs to us. Please do not reproduce it commercially without asking.

## Liability

We are responsible for delivering what you ordered in the condition described. We are not liable for indirect losses, or for delays caused by couriers, weather or events outside our control.

Nothing in these terms limits your rights under Indian consumer protection law.

## Governing law

These terms are governed by the laws of India. Any dispute will be subject to the jurisdiction of the courts at **[CITY]**.

## Contact

**[CONTACT EMAIL]**`,
  },
};

let updated = 0;
let skipped = 0;

for (const [slug, content] of Object.entries(pages)) {
  const { data: existing } = await db
    .from("pages")
    .select("id, body")
    .eq("slug", slug)
    .maybeSingle();

  if (!existing) {
    console.log(`  ${slug}: not found, skipping`);
    continue;
  }

  const isPlaceholder =
    !existing.body?.trim() || existing.body.trim().startsWith("_Content pending");

  if (!isPlaceholder && !force) {
    console.log(`  ${slug}: already edited, left alone`);
    skipped += 1;
    continue;
  }

  const { error } = await db
    .from("pages")
    .update({
      title: content.title,
      body: content.body,
      seo_description: content.seo_description,
    })
    .eq("id", existing.id);

  if (error) {
    console.error(`  ${slug}: FAILED — ${error.message}`);
  } else {
    console.log(`  ${slug}: updated`);
    updated += 1;
  }
}

console.log(`\n${updated} page(s) updated, ${skipped} left alone.`);
console.log(
  "\nShipping, Returns, Privacy and Terms are DRAFTS containing [BRACKETED]\n" +
    "placeholders. They must be filled in and reviewed before launch.",
);
