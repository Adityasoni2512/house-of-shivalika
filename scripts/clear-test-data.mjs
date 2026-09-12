#!/usr/bin/env node
/**
 * Removes development test data (anything with a "test-" slug or "TEST-" SKU).
 *
 *   node --env-file=.env.local scripts/clear-test-data.mjs
 *
 * Run this before launch. It will not touch real catalogue entries.
 */
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: products } = await db.from("products").select("id, name").like("sku", "TEST-%");
if (products?.length) {
  await db.from("products").delete().like("sku", "TEST-%");
  console.log(`Deleted ${products.length} test product(s): ${products.map(p => p.name).join(", ")}`);
} else {
  console.log("No test products found.");
}

// Children first, then parents, so ON DELETE RESTRICT does not block us.
const { data: categories } = await db.from("categories").select("id, name, parent_id").like("slug", "test-%");
if (categories?.length) {
  for (const c of categories.filter((c) => c.parent_id)) {
    await db.from("categories").delete().eq("id", c.id);
  }
  for (const c of categories.filter((c) => !c.parent_id)) {
    await db.from("categories").delete().eq("id", c.id);
  }
  console.log(`Deleted ${categories.length} test categor(y/ies): ${categories.map(c => c.name).join(", ")}`);
} else {
  console.log("No test categories found.");
}

console.log("Done.");
