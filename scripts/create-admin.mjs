#!/usr/bin/env node
/**
 * Create an admin user.
 *
 *   node --env-file=.env.local scripts/create-admin.mjs <email> <password> [full name]
 *
 * Creates the Supabase Auth user and the matching row in public.admins.
 * Safe to re-run: an existing auth user is reused and only the admins row
 * is reconciled.
 *
 * After launch you should create admins from the admin panel instead —
 * this script exists to bootstrap the very first one.
 */
import { createClient } from "@supabase/supabase-js";

const [email, password, ...nameParts] = process.argv.slice(2);
const fullName = nameParts.join(" ") || null;

if (!email || !password) {
  console.error(
    "Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password> [full name]",
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with: node --env-file=.env.local scripts/create-admin.mjs ...",
  );
  process.exit(1);
}

const db = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Find an existing auth user by email, paging through the admin list. */
async function findAuthUser(targetEmail) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    const match = data.users.find(
      (u) => u.email?.toLowerCase() === targetEmail.toLowerCase(),
    );
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

let userId;
let created = false;

const { data: createdUser, error: createError } = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

if (createError) {
  const alreadyExists =
    createError.status === 422 ||
    /already (been )?registered|already exists/i.test(createError.message);

  if (!alreadyExists) {
    console.error("Failed to create auth user:", createError.message);
    process.exit(1);
  }

  const existing = await findAuthUser(email);
  if (!existing) {
    console.error(
      `Supabase reported ${email} already exists, but it could not be found.`,
    );
    process.exit(1);
  }

  userId = existing.id;
  console.log(`Auth user already existed, reusing it (${email}).`);
} else {
  userId = createdUser.user.id;
  created = true;
}

const { error: adminError } = await db
  .from("admins")
  .upsert({ id: userId, email, full_name: fullName, is_active: true }, { onConflict: "id" });

if (adminError) {
  console.error("Failed to write admins row:", adminError.message);
  process.exit(1);
}

console.log(
  `${created ? "Created" : "Reconciled"} admin: ${email}${fullName ? ` (${fullName})` : ""}`,
);
console.log("Sign in at /admin/login");
