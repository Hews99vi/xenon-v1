# Storefront and admin redesign guide

Scope confirmed by the user on **25 October 2026**: **both storefront and admin**. The goal is a completely new look while preserving the store's real catalog, operational workflows and publishing system. The approved direction is now implemented. This guide routes future changes while [DESIGN.md](../DESIGN.md) owns visual rules and [project status](project-status.md) records verification.

## Start each redesign slice

Read [project context](project-context.md), [architecture](architecture.md), [current baseline](design-baseline.md) and [status](project-status.md). Inspect the actual target route, imports and current working-tree changes. Agree observable behavior for the slice and select a representative screen before repeating a new style across the application.

The agreed premium-fashion direction uses Instrument Sans, near-black/white controls, natural photography and a 38/62 desktop gallery with image-first mobile composition. Admin shares the palette with denser operational layouts. The user approved the desktop/mobile preview with “Use this direction”. Preserve this direction unless a subsequent request changes it. No new promise, testimonial, garment measurement, product fact or policy should be invented to fill a composition.

Use Impeccable for that visual work and the installed Next.js documentation for framework changes. Preserve npm/Tailwind 3/Base UI compatibility. Do not run `setup.sh`, regenerate all primitives, introduce a new framework, or upgrade packages as a side effect of changing appearance.

## Edit map

| Requested change | Primary sources | Coupled behavior to inspect |
| --- | --- | --- |
| Palette/type/spacing | `app/globals.css`, `tailwind.config.ts`, root layout, literal component colors | Both surfaces, legacy aliases, final CSS overrides, portal content |
| Store shell/navigation | Store layout, `SiteHeader`, `SiteFooter` | Preview marker/banner, audience visibility, search/menu/bag focus, published navigation |
| Hero/campaign | `HomeSections`, `ContentImage`, `CampaignPicture` | Both image sources, crop/alt, blank optional copy, both CTAs, hidden state |
| Latest/products row | `components/content/ProductRow.tsx`, `ProductCard.tsx` | Shared cards also used in collection/related products; touch scrolling, quick add |
| Category/occasion/story | Branches in `HomeSections.tsx` | Explicit selections, audience links, item visibility, content-driven order |
| Catalog listing | `CollectionPage`, `ProductFilters`, public product/category routes | URL filters and pagination, no-results/error state, active data |
| Product detail | Product server page and `ProductDetailClient` | Real variant/price/stock, gallery/zoom, published guide/returns |
| Bag/checkout | `CartDrawer`, `CheckoutForm`; preserve cart/checkout actions | Persistence, refresh failures, delivery/promo estimates, COD result |
| Admin shell | `AdminLayout`, `AdminNavigation`, admin root layout | Single shell, login remains separate, small-screen navigation, noindex |
| Website editor | `website/page.tsx`, `WebsiteEditor.tsx`, shared admin fields | Unsaved/saved/previewed/published state, conflicts, iframe, restore/media |
| Catalog admin | Product/category pages and forms, admin schemas/actions | IDs and input names, variants, uploads, transaction/error responses |
| Order operations | Order list/detail/invoice/status form and actions/types | Allowed transitions, separate payment state, cancellation/stock release, print |
| Other operations | Promotions, delivery-zones, newsletter modules | Real submission feedback, immediate changes, local table overflow |
| Information/journal | `PolicyPage`, blog routes and Markdown styling | Sanitization, SEO, unavailable content, published source |

The unused earlier homepage components are not automatic extension points. If bringing one back, integrate it into the current content renderer and demonstrate the editor still controls its content. Avoid hardcoding a second homepage in `page.tsx`.

## Behaviors the new appearance must carry forward

### Storefront

- Keep stable public product/category/page URLs and shareable query filters unless a routing change and redirect strategy are explicitly part of the task. Existing filters use `router.replace`; do not promise a back-stack entry per change.
- Preserve explicit audience data, unisex inclusion, unassigned All Products, and matching-data navigation visibility. A balanced men/women merchandising row requires an explicit selection/query policy; it is not guaranteed by the existing newest source.
- Maintain exact variant choice, sold-out/disabled states, price precedence and inventory limits. Quick add must not silently pick an arbitrary size/color.
- Keep the persisted `xenon-cart` contract or provide an intentional compatible migration. Preserve the cart on request failures; show actual stock/price adjustments before continuing.
- Checkout remains guest COD, with optional email and a delivery-zone UUID. Totals come from the server transaction. Receipt-page query parameters must never mark an order paid or expose customer details.
- Preserve loading, no-results, missing product/page, image failure, invalid promo, unavailable district/service, submitting and recoverable failure feedback.
- Keep published policy/guide content authoritative. Show a size guide only when real published content exists; avoid fixed delivery/returns promises in UI decoration.

### Admin and publishing

- Preserve authentication, active-profile checks, RLS/RPC permissions and server-only credentials. Hiding navigation is not authorization, and role labels are not an implemented permission matrix.
- Make immediate catalog/operational saves visibly different from draft website edits. A content preview still uses live catalog prices/stock.
- Keep Save draft → Preview saved revision → Publish feedback, revision conflict handling, unsaved-change protection, history author/timestamps and restore-to-draft behavior. The server validates publication even if controls are redesigned.
- Preserve `data-content-preview` on the store wrapper and its exact saved revision value, or deliberately update both the preview renderer and iframe check. Otherwise Publish remains disabled or preview verification breaks.
- Retain six layouts, selected item order, empty manual selections, visibility toggles, mobile images, focal points, optional secondary buttons, navigation children and footer/newsletter settings.
- Keep URL slug identity fixed after a page's first save unless a real rename/redirect workflow is added. Keep legacy admin entry redirects working.
- Preserve item IDs in product edits and historical order snapshots. Do not replace all variants merely to simplify a form.
- Retain cancellation through `release_order_stock`; visual changes must not substitute a plain status update that loses stock recovery.
- Keep immutable upload paths and retained-revision asset protection. Product gallery removal/replacement now uses the versioned atomic save and reference-aware cleanup described in [product image management](product-image-management.md); other media controls still need their own complete retention-aware contract.

### Shared interaction quality

Use semantic controls, persistent labels, associated errors, visible focus, sensible tab order and announcement of outcomes. Carry modal focus trapping/return and Escape behavior through Base UI APIs. Keep purchasing actions usable by touch and keyboard, independent of hover.

Review both surfaces at 360, 390, 768, 1024 and 1440px, with long names, blank optional copy, missing photos, multi-variant products, zero/low stock, empty selections and failed requests. Test zoom/reflow, a larger default font and reduced motion. Tables and preview canvases may scroll locally; page-wide overflow is a regression. Screenshots and browser interactions are needed; successful type checks do not establish visual quality or accessibility.

## Changing the content contract

A pure layout change should continue rendering existing version-1 payloads. If the new design requires new editable fields or a section type, update the complete path together:

1. Zod schema/types/defaults and `newSection` in `lib/content/schema.ts`.
2. Editor controls, field errors, serialization and dirty-state behavior.
3. Publish validation/link discovery and relevant catalog/media constraints.
4. Public renderer and shared preview behavior.
5. Compatibility/import handling for retained documents, plus appropriate SQL if persistence changes.
6. Focused action/content tests, and browser checks of old and new payloads.

Existing revisions are retained. Do not let a schema change make old published/history payloads unparseable. Add a deliberate version/migration strategy when needed. Restore must continue producing reviewable drafts. Update the rollout guide only when the operational procedure actually changes.

## Suggested delivery order

This is a proposed sequence, not an approved milestone or delivery date:

1. Set the visual direction for both surfaces, using one storefront and one admin screen to establish tokens, hierarchy and interaction patterns.
2. Implement shared primitives/tokens and shells, checking both surfaces together for leakage. Decide whether themes need scoped overrides rather than applying storefront expression to admin tables.
3. Complete one shopping path: homepage → collection → product/options → bag → checkout/result.
4. Complete one editing path: content list → edit → save → preview → publish → public result, including conflict/failure states.
5. Apply the established patterns to remaining catalog/operations, policy/journal and edge states; verify invoice printing separately.
6. Update baseline/status docs and capture dated screenshots of the final implementation.

## Verification by change boundary

| Boundary | Existing checks / required observed outcome |
| --- | --- |
| Global styling/shared primitives | Lint, types, build; inspect storefront/admin dialogs, forms, keyboard focus and responsive screenshots |
| Catalog/card/filter changes | Audience query tests; browse combined filters and direct links, sold-out and quick-add options |
| Cart/checkout | Cart and checkout test files; use disposable data to confirm refresh/failure/promo/delivery/COD/cart clearing |
| Editor/content schema | Content/action tests; draft save, anonymous draft rejection, matching preview, publish and restore |
| SQL/permissions | Disposable local DB suite plus focused checks for any uncovered RPC; real test Supabase for Auth/Storage |
| Orders | Order action tests; verify allowed/rejected transitions, idempotent stock release and invoice output |

Current build/data and integration limits are tracked in [project status](project-status.md). Do not weaken validation, replace unavailable data with fake products, or enable payment providers to make a visual demo look complete. Deployment, database import and production mutation are separate tasks with their existing authorization requirements.

At delivery, update the relevant architecture/baseline/rollout documents, append a concise status entry with checks and limitations, and remove superseded guidance. Keep the new design grounded in the shipped implementation rather than accumulating competing “final” reviews.
