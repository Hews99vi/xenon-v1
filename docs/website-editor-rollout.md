# Website editor rollout

The storefront and admin URLs stay the same. Website changes use revisions; catalog, pricing, stock, promotions, delivery, and orders remain immediate.

## Start locally

Use Node 22 or newer (the import script uses Node's TypeScript stripping). Run `npm ci`, copy `.env.example` to `.env.local` if needed, and configure a development Supabase project. Run `npm run dev` and open http://localhost:3000. Admin access is at `/admin/login`; configure `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and `SEED_ADMIN_NAME` and run `npm run seed:admin` on your development project.

## Database preparation

Back up the existing database and Storage first. For a fresh Supabase project apply `supabase/schema.sql`, then `supabase/newsletter.sql`, then `supabase/content-management.sql`. For an existing installation apply the existing required commerce migrations listed in README, followed by `supabase/checkout-transaction-fix.sql` and `supabase/content-management.sql`. Do not rerun legacy seed scripts after importing content: the migration deliberately prevents the old editors and seeds from overwriting published website content.

Run `npm run content:import` to validate the import without writes. It reads the configured Supabase project's current legacy content using the service role. Review any validation errors before continuing. Then run `npm run content:import -- --apply` once. Existing revision documents are skipped; product, category, variant, order, and legacy rows are not overwritten. Each document import is transactional; the site is imported last so the public readers switch after the information pages are ready. Editing stays gated until the initial published site has been imported. Retry an interrupted import safely.

The import preserves active campaign copy and links, mobile images, secondary CTAs, hidden banners and occasion tiles, explicit audience metadata, policies, and journal entries. Legacy `returns-policy` rows map to the existing `/return-policy` URL, and old Women/Men category query links map to explicit audience filters. Extra legacy imagery is retained in migration metadata and the legacy tables for review. Atelier becomes a compact story using its first active image. Only the first currently active campaign in each legacy placement is enabled; other campaigns are editable hidden sections. Scheduled dates become the visibility state at import time; scheduling is not a supported section field. Inspect the imported draft before release.

## Editing

Open `/admin/website`. Choose a section or add one of the six layouts. Change text, images, crop, product/category selection, audience, links, order, and visibility. A manual row with no selected items stays empty. Global navigation, announcements, footer, and newsletter have their own tabs. Legacy Banners, Homepage, Settings, Blog, and Policy links redirect to the new workspace after setup; the legacy database tables become read-only after the site document is imported.

Save draft, open the shared desktop/mobile preview, and publish. Preview requires an active admin session and is pinned to the saved revision. Other website documents remain published while the selected document is previewed. Catalog queries always read current prices and stock. Anonymous users can only read the current published revision. Saving and publishing detect a changed draft pointer; reload and reconcile conflicting edits. Restoring a historical revision creates a draft for review rather than changing the live website.

History is retained without pruning. A database Storage trigger and cleanup checks protect images referenced by any retained revision. Media uploads create immutable filenames. Do not manually remove those images outside Supabase's database-backed Storage API.

## Content review before release

- Classify products and categories explicitly as women, men, or unisex. Existing unassigned products stay in All Products and are flagged in admin. Audience navigation appears only when matching classified products exist.
- Review imported photography against product names, colors, and categories. Use Xenon assets; replace missing or mismatched images. No product specifications or size measurements are supplied by this change.
- Create and publish `/size-guide` only when verified sizing information is available. Its product dialog stays hidden otherwise.
- Check policy content in Pages & Journal. Return details come from the published return policy; delivery fees come from the selected operational district.
- Remove unavailable destinations or publish their pages before publishing the site. Publish validates internal product/category/page links. External links are restricted to HTTPS, email, and telephone schemes.
- Review the new homepage order, optional announcement, footer details, and disabled legacy sections. Confirm long text and both campaign crops at 360, 390, 768, 1024, and 1440 pixels.

## Validation

Run `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build`. Database integration tests require a separate local PostgreSQL server. Set `XENON_TEST_POSTGRES_URL` to its local maintenance database and run `npm run test:db`. The script creates and drops its own database, applies the fresh schema and migration twice, and checks RLS, permissions, publication, conflicting edits, restoration, image retention, audience filtering, and COD pricing/stock/discount/delivery/cancellation.

The PostgreSQL tests stub only Supabase's Auth and Storage table interfaces. Authentication refresh, upload delivery, and authenticated browser editing should also be tested against a disposable Supabase project before release. Never point test checkout at the production project.

## Rollback

Restore an earlier revision from the editor, preview, and publish it to roll back website content. Catalog prices and stock are untouched. A code rollback to the previous release can still read the retained legacy tables. To resume legacy editing, first back up all revisions and remove `guard_legacy_content` triggers through a reviewed database migration; old editors otherwise intentionally refuse writes. Do not delete the revision tables or Storage assets to roll back.
