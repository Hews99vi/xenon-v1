// Node 22+: node --experimental-strip-types scripts/import-content.mjs [--apply]
// Dry-run is the default. Apply only after content-management.sql.
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { importLegacySite, importLegacyPage, canonicalPageSlug } from "../lib/content/legacy.ts";
import { siteSchema, pageSchema } from "../lib/content/schema.ts";
nextEnv.loadEnvConfig(process.cwd());
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const tables = [
  "banners",
  "homepage_sections",
  "homepage_section_items",
  "site_settings",
  "categories",
  "policy_pages",
  "blog_posts",
];
const entries = await Promise.all(
  tables.map(async (table) => {
    const rows=[];
    for(let page=0;;page++){const {data,error}=await db.from(table).select("*").order("id").range(page*500,page*500+499);if(error)throw error;rows.push(...(data||[]));if(!data||data.length<500)break;}
    return [table,rows];
  }),
);
const rows = Object.fromEntries(entries);
const site = siteSchema.parse(
  importLegacySite({
    banners: rows.banners,
    sections: rows.homepage_sections,
    items: rows.homepage_section_items,
    settings: rows.site_settings,
    categories: rows.categories,
  pages:rows.policy_pages,
  }),
);
const docs = [
  { key: "site", kind: "site", slug: "site", payload: site, published: true },
  ...["page", "journal"].flatMap((kind) =>
    rows[kind === "page" ? "policy_pages" : "blog_posts"].map((row) => ({
      key: `${kind}:${kind==="page"?canonicalPageSlug(row.slug):row.slug}`,
      kind,
      slug: kind==="page"?canonicalPageSlug(row.slug):row.slug,
      payload: pageSchema.parse(importLegacyPage(row)),
      published: row.status === "published",
    })),
  ),
];
if(new Set(docs.map(doc=>doc.key)).size!==docs.length)throw new Error("Policy aliases collide. Review the legacy pages before importing; no content has been overwritten.");
console.log(
  `Validated ${docs.length} documents. Legacy rows, catalog, and orders are preserved.`,
);
if (!process.argv.includes("--apply")) {
  console.log("Dry run only. Add --apply to import.");
  process.exit(0);
}
for (const doc of [...docs.filter(d=>d.kind!=="site"),...docs.filter(d=>d.kind==="site")]) {
  const { data: existing, error: readError } = await db
    .from("content_documents")
    .select("id")
    .eq("key", doc.key)
    .maybeSingle();
  if (readError) throw readError;
  if (existing) {
    console.log(`Skipped existing ${doc.key}`);
    continue;
  }
  const { error } = await db.rpc("import_content_document", {
    p_key: doc.key,
    p_kind: doc.kind,
    p_slug: doc.slug,
    p_payload: doc.payload,
    p_published: doc.published,
  });
  if (error) throw error;
  console.log(`Imported ${doc.key}`);
}
