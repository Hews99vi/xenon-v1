# Product image management

Implemented 25 October 2026. Product images are immediate catalog changes, separate from website drafts. See [project status](project-status.md) for actual verification and deployment limits.

## Enable in the intended database

Apply `supabase/product-image-management.sql` **after** `supabase/content-management.sql`, before releasing the updated product forms. Use the project's normal reviewed SQL deployment workflow. The migration is additive and repeat-safe; it does not backfill, reorder or remove existing galleries. Do not rerun base seeds to enable it. Reapply this migration if the older content migration is reapplied later, because that file defines the earlier Storage guard.

The feature has been exercised against disposable local PostgreSQL. No hosted schema or image objects were modified during implementation. A missing migration produces an explicit installation message before uploads.

## Administrator workflow

- Photography shows every saved image, including broken images with working replacement/removal controls.
- Add, replace, edit optional alternative text, move earlier/later or make an image main. First position is always main after saving.
- Remove stages a deletion and offers Undo; Cancel replacement restores the saved file. Everything is committed with **Update product**.
- Existing image IDs survive ordinary edits and replacement. Galleries may be empty. The storefront retains its missing-image treatment.
- New and replacement uploads share a five-file limit per save: JPG/PNG/WebP, 5 MiB each and 9 MiB combined beneath the 10 MB action limit. Existing gallery size is not capped at five.
- Errors preserve the staged files and other form inputs. A conflicting gallery requires **Reload images**, which discards only gallery edits after confirmation.
- Saved and failed-cleanup states are separate. **Retry cleanup** retries eligible pending files without resaving product data.

Catalog links enter product editors with document navigation. Editor exits also use document navigation, so native browser Back/Forward and reload warnings can protect dirty galleries. Link exits ask before leaving; modified clicks/new tabs keep their usual behavior. Do not convert these editor boundaries back to client-only navigation without retesting history warnings. As with native unload dialogs generally, browser/platform restrictions apply; this is not persistence of unsaved files across closing the browser.

## Ownership and save contract

| Concern | Owner |
| --- | --- |
| Existing image query and failed-load protection | `lib/productImageQueries.ts`, product edit page |
| Staged file previews, Undo, ordering and warnings | `ProductImageManager.tsx` |
| Product form submission and server outcomes | Product form and product actions |
| Manifest validation, limits and canonical snapshots | `lib/productImages.ts` |
| Atomic gallery reconciliation and reference guards | `supabase/product-image-management.sql` |
| Storage API cleanup and retry reporting | `lib/productImageStorage.ts` |

The server accepts an ordered manifest of retained image IDs and queued file keys plus the original image snapshot. Existing URLs come from the database; new URLs come from successful server-side uploads to immutable paths. IDs and file keys must be unique and belong to this product. Active-admin authorization precedes uploads.

`admin_upsert_product_v2` locks and compares the gallery snapshot, then reuses the existing product/variant transaction and reconciles images in the same transaction. A failure rolls everything back. The original append-only RPC remains for compatibility. Snapshot conflicts protect the gallery; other product fields retain the existing save semantics.

Blank optional sale/variant prices are parsed before numeric coercion. Empty sale price remains empty; an empty variant price retains the existing base-price fallback. Explicit zero remains zero. Existing stored zero prices are not automatically changed.

## Storage lifecycle and recovery

Storage calls are outside the product transaction. New uploads reserve a cleanup record **before** upload with a 30-minute lease. Committed images mark their reservation retained; caught failures make unused reservations eligible immediately. Abandoned reservations become eligible after expiry and are processed by a later save or Retry cleanup. No background worker is installed.

Removed/replaced originals are queued atomically with the product save. Cleanup checks all products, retained content revisions and legacy category/banner/homepage/journal/policy/settings data. Reference matching is conservative: an uncertain/shared reference keeps the object. Foreign Storage origins and external URLs are never deleted by the server helper.

A transaction advisory mutex serializes relevant admin/media writes, including Storage metadata mutations. It deliberately favors reference safety over parallel administrative media writes. The Storage deletion trigger checks references again and records deleted asset keys; reference writes reject a deleted owned key unless its Storage object has been restored. This covers both orders of concurrent reuse versus deletion. The application does not hold its product-save transaction open across a Storage HTTP call.

Physical deletion uses the Supabase Storage API, never production SQL deletion of `storage.objects`. A metadata check confirms deletion before a cleanup record is completed. Failed cleanup stays pending with an attempt count and safe error message. It does not turn a committed product save into a failed save.

Unused originals are permanently deleted, as requested. Restoring deleted files requires the original file or backup. Code rollback can retain the new tables/guards and use the old RPC; do not drop tombstones, reference guards or pending jobs as a rollback shortcut.

## Verification boundary

The SQL suite covers repeat application, authorization, stable IDs, ordering/primary, empty galleries, rollback, stale snapshots, leases, retained references and concurrent save/reuse/deletion. Browser fixtures implement clearly labelled test Auth and Storage APIs over real PostgreSQL/PostgREST. They cover actual form/file submission, save/reopen/storefront, partial upload failure, retry, conflict reload, keyboard actions and five responsive widths.

Real development Supabase Auth/Storage upload/delete behavior still needs a separate authorized smoke test. Fixture metadata deletion in tests is a Storage stand-in, not a hosted operating procedure.

API compatibility was checked against Context7 and installed Next.js 16.2.9 guides. Reference guidance: [Supabase Storage deletion](https://supabase.com/docs/guides/storage/management/delete-objects) and [native unload warnings](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event). These references do not replace a hosted development smoke test.
