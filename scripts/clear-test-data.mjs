#!/usr/bin/env node
/**
 * Removes development test data.
 *
 *   node --env-file=.env.local scripts/clear-test-data.mjs
 *
 * Run this before launch. It only touches records created during development —
 * anything with a "test-" slug, a "TEST-" SKU, or the seeded test visitor id.
 * Real catalogue entries, real leads and real orders are left alone.
 */
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const TEST_VISITOR = "11111111-2222-4333-8444-555555555555";

/* ---- products (cascades to images, variants, reviews, invites) ---------- */
const { data: products } = await db
  .from("products")
  .select("id, name")
  .like("sku", "TEST-%");

if (products?.length) {
  await db.from("products").delete().like("sku", "TEST-%");
  console.log(
    `Deleted ${products.length} test product(s): ${products.map((p) => p.name).join(", ")}`,
  );
} else {
  console.log("No test products found.");
}

/* ---- categories: children before parents, or RESTRICT blocks us -------- */
const { data: categories } = await db
  .from("categories")
  .select("id, name, parent_id")
  .like("slug", "test-%");

if (categories?.length) {
  for (const category of categories.filter((c) => c.parent_id)) {
    await db.from("categories").delete().eq("id", category.id);
  }
  for (const category of categories.filter((c) => !c.parent_id)) {
    await db.from("categories").delete().eq("id", category.id);
  }
  console.log(
    `Deleted ${categories.length} test categor(y/ies): ${categories.map((c) => c.name).join(", ")}`,
  );
} else {
  console.log("No test categories found.");
}

/* ---- analytics rows from the seeded test visitor ----------------------- */
const { count: eventCount } = await db
  .from("analytics_events")
  .select("*", { count: "exact", head: true })
  .eq("visitor_id", TEST_VISITOR);

if (eventCount) {
  await db.from("analytics_events").delete().eq("visitor_id", TEST_VISITOR);
  console.log(`Deleted ${eventCount} test analytics event(s).`);
} else {
  console.log("No test analytics events found.");
}

/* ---- orphaned rollup rows --------------------------------------------- */
await db.from("analytics_daily").delete().is("product_id", null);

console.log("\nDone.");
console.log(
  "Remaining checks before launch:\n" +
    "  - Fill in the [BRACKETED] values in Shipping, Returns, Privacy and Terms\n" +
    "  - Add real size chart measurements\n" +
    "  - Set the WhatsApp number in admin -> Settings\n" +
    "  - Rotate the Supabase personal access token",
);
