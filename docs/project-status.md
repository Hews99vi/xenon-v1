# Project status and continuity log

Current delivery date: **25 October 2026**. Read [project context](project-context.md) first. These results describe the local working tree, not deployment.

## Current delivery

The product image manager is implemented: existing photos, staged add/replace/remove/Undo/order/main/alt editing, atomic versioned save, gallery conflicts, guarded Storage cleanup and durable upload reservations. See [feature setup and operation](product-image-management.md). **The hosted database still requires `supabase/product-image-management.sql` after content management; it was applied only to disposable local test databases.** Hosted Storage/Auth mutations were not performed.

Image-only save tests also exposed optional blank prices being coerced to zero; parsing now preserves blanks before coercion while keeping explicit zero. Existing stored prices were not backfilled. Product editor navigation uses document boundaries to cover native Back/Forward warnings without rewriting Next history.

Implemented the user-approved premium white/black redesign of **both storefront and admin**, following desktop/mobile preview approval (“Use this direction”). Self-hosted Instrument Sans and original logo artwork anchor the shared system. Active homepage sections, navigation, discovery, product selection, bag, checkout, reading pages, admin shell/forms and website editing carry the new presentation.

Commerce and version-1 content schemas remain intact. Checkout now guards repeated clicks before validation, reconciles stale promo estimates, preserves input/bag after thrown requests, releases pending controls and offers explicit delivery retry. Promotion/delivery edits and deletes report actual outcomes and confirm destructive actions. Preview redirects preserve the browser origin. No production database mutation, environment-file edit, commit, push or deployment was performed.

The working tree already contained extensive modified/deleted/untracked implementation. Hash comparison against the start of this redesign found no previously present source files missing; unrelated work was preserved. The existing route-group migration/deletions are not this redesign's changes.

## Verification performed for this delivery

| Check | Observed result | Scope / limits |
| --- | --- | --- |
| `npm run lint` | Passed | Existing ESLint rules |
| `npx tsc --noEmit` | Passed; final production build also checked types | Local TypeScript |
| `npm test` | **45 passed, 11 files** | Includes gallery manifest/upload limits and blank-price regression checks, alongside existing commerce/admin tests |
| `npm run test:db` | Passed against disposable local PostgreSQL | Also verifies gallery stable IDs/order/main/empty/rollback/conflicts, upload leases and deterministic concurrent gallery/reuse/delete cases |
| `npm run test:browser` | **14 passed** using installed Chrome | Real local PostgreSQL/PostgREST with explicitly test-only Auth; no hosted writes |
| Browser shopping | Navigation/search/filter removal, Escape/focus return, persisted bag, options, promo edit, rapid double-click→one order, COD confirmation, bag clearing | Local synthetic orders only |
| Browser recovery | Failed submission retains bag/input and restores controls; failed delivery quote→retry→fee with unchanged input/district | Controlled network failures |
| Gallery browser flows | Saved photos, replacement/cancel, main/order, Undo, unchanged IDs, blank-price preservation, partial-upload failure, cleanup retry, conflict reload, empty/broken galleries, new products and canceled/confirmed Back/Forward | Local Storage/Auth stand-ins over real PostgreSQL; all five widths checked |
| Browser publishing | Draft not public; save→authenticated preview→publish→anonymous page; stale-editor conflict; history restore-to-draft | Local fixture data and Auth shim |
| Responsive/edge checks | Store/editor at **360/390/768/1024/1440**, ten additional mobile routes, 20px font reflow; long name/missing image/sold-out/empty results | No document overflow in checked cases; intentionally wide tables scroll locally |
| Visual review | Gallery captures reviewed; fresh reviewer found one history-warning gap and scored it resolved, **ship at fix-list scope** | Original comprehensive gallery review plus targeted history verification; not accessibility certification |
| `npm run build` | Passed with actual configured public content source, including journal page-data collection | Earlier journal failure no longer reproduces; no fabricated fallback introduced |
| Previous redesign dependency audit | **27 advisories: 9 moderate, 15 high, 3 critical** | Reported in current dependency graph; not remediated through unrelated upgrades |
| Design/API tools | Impeccable direction/review/documentation; Context7 + installed Next docs | Mobbin returned paid-plan requirement; no Mobbin references claimed |

The executable browser runner creates/drops its own uniquely named local database and starts/stops its own fixture servers. Its separate build directory allows the developer’s running app to remain untouched. `tests/browser/content-fixture.json` contains public-layout fixture content and labelled synthetic policy bodies. Auth and Storage APIs are shims; real Supabase Auth refresh and Storage uploads, email delivery, Redis, production performance, deployment and production checkout acceptance remain unverified. See [test instructions](../tests/README.md).

Gallery evidence: `.impeccable/review/images/` contains five-width full pages and focused crops, plus queued, failed-save, cleanup-pending, empty and broken states. These use labelled synthetic products and existing hero photography.

Earlier redesign evidence: `.impeccable/mocks/` holds the approved HTML composition and desktop/mobile previews; `.impeccable/review/` holds loaded final captures, browser report and focused keyboard/delivery-recovery evidence. A later capture timing race was fixed by awaiting loaded route headings and hidden Suspense skeletons before image settling; loading captures are not design acceptance evidence.

## Known gaps and decisions to resolve

These remaining observations are outside the visual redesign. Recheck source/services before addressing them; this is not a production security assessment.

| Area | Observed gap / uncertainty | Evidence and next useful verification |
| --- | --- | --- |
| Deployment/content rollout | Actual database migration/import and live host state remain unknown | Follow `website-editor-rollout.md`; do not infer deployment from SQL files or old captures |
| Retained legacy components | Six older homepage components remain unreferenced; active rows deliberately use native scrolling in pages of four | Edit `HomeSections` / `ProductRow`, not old similarly named components |
| Variant price default | Admin parsing turns blank variant price into the product base price, which can override a product sale price during purchase | `products/actions.ts::parseVariants`; test explicit and blank overrides before promising sale behavior |
| New Arrivals | `tag=new` changes the heading, with newest default sort, but no distinct new-product filter | `CollectionPage.tsx`; agree any date/tag eligibility rule rather than inventing one |
| Request idempotency | The client prevents repeated clicks while an attempt is running, but no server request-idempotency key deduplicates later retries after an unknown outcome | Checkout failure UI asks the shopper to contact the store before retrying; do not claim cross-request deduplication |
| Order concurrency | Ordinary admin status updates read then write without a current-status compare in the update; cancellation RPC has its own lock/idempotency | `orders/actions.ts`; test two simultaneous admin changes before claiming concurrency guarantees |
| Admin permissions | Owner/admin/manager labels exist, but active-profile checks do not enforce separate capabilities | `is_active_admin`, `requireAdmin`, proxy; clarify only if role-based restrictions become a requirement |
| Product image rollout | Gallery views load existing images; saving requires the new migration. Hosted upload/delete behavior remains unverified | Apply the migration after content management, then smoke-test on explicitly development Supabase data |
| Inventory operations | Manual cancellation restores stock idempotently; no automatic abandoned-order expiry job. Deleting a variant can remove the reference used for later stock release | `release_order_stock`, order-item foreign keys, product upsert; define recovery policy if needed, especially before gateways |
| Email/newsletter | Email is optional/best effort; newsletter welcome is fire-and-forget. No delivery queue, retries, campaign/unsubscribe UI, or dedicated newsletter rate limiter found | `app/newsletter/actions.ts`, `lib/email/`; do not promise delivery or account/campaign features |
| SQL lifecycle | Manually ordered files, no migration ledger; base schema contains seed content; content migration replaces older product RPC | Existing rollout guide and SQL; avoid rerunning seeds after import or applying old RPC definitions out of order |
| Test boundaries | Node tests mock boundaries; SQL/browser tests use local PostgreSQL and stubbed Auth/Storage. Hosted Auth refresh/upload and all catalog/newsletter RPC paths are not established | See `tests/README.md`; use real development services for those checks |
| Delivery automation | No `.github` CI workflow, runtime pin or verified live deployment configuration found | README describes VPS/PM2/Nginx only; address when deployment/automation is requested |


## Historical evidence and handoff

The earlier [9 October validation report](validation-report.md), `docs/validation/` and `docs/screenshots/` remain historical fixture evidence. The initial documentation review on 25 October passed lint/types/33 tests but failed journal page-data collection; the current passing build supersedes that failure without establishing live deployment.

For future work, start from [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md), the [architecture](architecture.md) and [redesign guide](ui-redesign-guide.md). Keep operational changes immediate and content changes revisioned; preserve actual pricing/stock and `xenon-cart`. Update this ledger with concrete behavior, checks actually observed and material limits, rather than appending raw review transcripts.
