import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const fullName = process.env.SEED_ADMIN_NAME || "Xenon Admin";

if (!supabaseUrl || !serviceRoleKey || !email || !password) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_ADMIN_EMAIL, or SEED_ADMIN_PASSWORD.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const existingUser = await findUserByEmail(email);
const user = existingUser || (await createAdminUser());

const { error: profileError } = await supabase.from("admin_profiles").upsert(
  {
    id: user.id,
    full_name: fullName,
    role: "owner",
    is_active: true,
  },
  { onConflict: "id" },
);

if (profileError) {
  console.error("Could not upsert admin profile:", profileError.message);
  process.exit(1);
}

console.log(`Admin user ready: ${email}`);

async function createAdminUser() {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (error || !data.user) {
    console.error("Could not create admin user:", error?.message || "No user returned.");
    process.exit(1);
  }

  return data.user;
}

async function findUserByEmail(userEmail) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    console.error("Could not list auth users:", error.message);
    process.exit(1);
  }

  return data.users.find(
    (user) => user.email?.toLowerCase() === userEmail.toLowerCase(),
  );
}

function loadEnvFile(fileName) {
  const path = resolve(process.cwd(), fileName);

  if (!existsSync(path)) {
    return;
  }

  const content = readFileSync(path, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
