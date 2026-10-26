// Creates and drops its own database. Never runs against an existing app database.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { testProductImageConcurrency } from "../tests/database/product-image-concurrency.mjs";
const configured = process.env.XENON_TEST_POSTGRES_URL;
if (!configured)
  throw new Error(
    "Set XENON_TEST_POSTGRES_URL to a local PostgreSQL maintenance database, for example postgresql://localhost:55432/postgres.",
  );
const url = new URL(configured);
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  throw new Error("Only a disposable local PostgreSQL server is allowed.");
const database = `xenon_test_${randomUUID().replaceAll("-", "")}`;
function psql(target, args) {
  const result = spawnSync(
    "psql",
    ["-X", "-v", "ON_ERROR_STOP=1", "-q", "-d", target, ...args],
    { encoding: "utf8" },
  );
  if (result.status !== 0)
    throw new Error(
      result.stderr || result.error?.message || "PostgreSQL test failed",
    );
}
psql(configured, ["-c", `CREATE DATABASE ${database}`]);
try {
  url.pathname = `/${database}`;
  for (const file of [
    "tests/database/bootstrap.sql",
    "supabase/schema.sql",
    "supabase/checkout-transaction-fix.sql",
    "supabase/content-management.sql",
    "supabase/content-management.sql",
    "supabase/product-image-management.sql",
    "supabase/product-image-management.sql",
    "tests/database/content.sql",
    "tests/database/product-images.sql",
  ])
    psql(url.href, ["-f", file]);
  await testProductImageConcurrency(url.href);
  console.log(
    "Passed: fresh schema, repeat migration, draft RLS, permissions, atomic publication, conflicts, history restoration, retained images, audience filtering, COD pricing/stock/promotion/cancellation.",
  );
} finally {
  psql(configured, ["-c", `DROP DATABASE ${database} WITH (FORCE)`]);
}
