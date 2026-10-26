# Xenon implementation validation — 9 October 2026

The storefront uses the shared visual system and renderers. The admin workspace edits versioned website documents while catalog and operational changes remain immediate. The real Supabase database was read for migration validation; it was not migrated or edited during this work.

## Automated checks

- ESLint: passed.
- TypeScript: passed.
- Vitest: 33 tests passed across 9 files, including publishing validation, conflict handling, audience query combinations, empty selections, migration preservation, cart persistence, and failed inventory queries.
- Production build: passed on Next.js 16.2.9.
- Disposable PostgreSQL integration suite: passed fresh schema creation and repeat migration, anonymous/non-admin draft isolation, write permissions, atomic publication, conflicting revisions, restoration, image deletion/rename protection, audience/filter options, COD prices/stock/promotions/delivery, failed checkout, and idempotent stock release.
- Legacy import dry run: validated 5 documents without writes.

## Browser checks

The authenticated editing and checkout checks ran against a disposable local PostgreSQL database through PostgREST. A local authentication fixture supplied signed test identities; email and external Redis were disabled. Public catalog/content was copied for review. No live orders, customer records, or administrator credentials were copied.

Verified draft save → authenticated preview → publish, anonymous draft isolation, desktop/mobile previews, campaign mobile imagery and crop, blank optional copy, secondary CTA, section hiding, empty manual product/category selections, announcements, footer/newsletter editing, historical restoration, page/journal Markdown and SEO, size-guide dialog, and product-image zoom.

Verified touch variant selection, cart persistence, Escape and focus return, refreshed prices and stock, expandable mobile checkout summary, delivery selection, promotion totals, COD confirmation, stock reservation, and cart clearing. Search, filters, and mobile navigation close with Escape; search and cart return focus to their triggers.

Storefront and editor were checked at 360, 390, 768, 1024, and 1440 pixels with no page-wide horizontal overflow. Catalog/category/order/content admin tables scroll on narrow screens. Storefront, catalog, and product detail also fit a 390px viewport with a 20px root font. Mobile carousel cards measured approximately 151px at 360px and 165px at 390px. No JavaScript exceptions were recorded in the completed browser flows.

The production server passed read-only smoke checks for home, catalog, product detail, category, journal, returns, and admin login. Anonymous preview requests returned 401.

## Review artifacts

[Mobile storefront](screenshots/store-390.jpg), [desktop storefront](screenshots/store-1440.jpg), [mobile editor](screenshots/admin-390.jpg), and [desktop editor](screenshots/admin-1440.jpg). The screenshots directory includes all five widths. These captures use the disposable content fixture and existing Xenon imagery; they do not represent a published release. Development tooling is hidden during capture. Machine-readable browser results are in `docs/validation/`.

## Release work still required

Apply the migration and run the one-time import using the [rollout guide](website-editor-rollout.md). The real Supabase Auth refresh and Storage upload/delivery flows require verification against a disposable Supabase project; the local fixture does not emulate those services fully.

Review unclassified product/category audiences, imagery, internal links, policies, and the imported homepage order before release. Women/Men navigation stays hidden until matching classified products exist. No size measurements, product specifications, policy promises, or Incarnage photographs were invented. External image availability remains dependent on the existing image providers; failed optimization retries the same source before showing an unavailable-image state.
