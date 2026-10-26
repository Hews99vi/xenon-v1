# Xenon project context

Last reviewed: **25 October 2026**. Start here for future work, then read the relevant linked document and implementation. This is a maintained map of the local working tree, including uncommitted code; it is not proof of the deployed database or website state.

## Product and current objective

Xenon is a Sri Lankan clothing and accessories storefront with a separate administrative workspace. Shoppers discover products, select actual variants, keep a browser-local bag, and place guest orders in LKR using **Cash on Delivery (COD)**. Administrators manage catalog, inventory, orders, promotions, delivery, newsletter subscribers, and published website content.

The user approved and implemented direction covers **both storefront and admin**: white/near-black surfaces, self-hosted Instrument Sans, original Xenon logos and an image-led collection gallery. Desktop and mobile previews were explicitly approved with “Use this direction”. Read [DESIGN.md](../DESIGN.md) for reusable tokens and [project status](project-status.md) for actual verification and remaining limits. Engagement is an intended outcome, not a measured result.

## Read in this order

| Document | Purpose | Update when |
| --- | --- | --- |
| [Architecture](architecture.md) | Routes, ownership, data model, auth, content publication, checkout, integrations | Routing, contracts, SQL, permissions, or integrations change |
| [Design system](../DESIGN.md) | Approved visual rules and reusable tokens | Shared visual decisions change |
| [Design baseline](design-baseline.md) | Current tokens, active components, CSS cascade, responsive patterns | Shared styles/components change; replace the baseline when a new design ships |
| [UI redesign guide](ui-redesign-guide.md) | Where to edit, behaviors to retain, sequencing, acceptance checks | Redesign decisions or implementation patterns are agreed |
| [Project status](project-status.md) | Current verification, known gaps, unresolved decisions, handoff log | Each meaningful delivery or newly verified finding |
| [Website editor rollout](website-editor-rollout.md) | Database preparation, import, release and recovery | Publishing or migration procedures change |
| [Product image management](product-image-management.md) | Gallery editing, required migration and reference-aware Storage cleanup | Product media or cleanup contracts change |
| [Payment roadmap](payment-gateway-roadmap.md) | Future online payments, separate from current COD | A gateway is explicitly added |
| [README](../README.md) | Local setup and deployment instructions | Commands or configuration change |

## Facts future work must start from

- Public pages live under `app/(store)/`; `(store)` is absent from the URL. Do not recreate the deleted `app/page.tsx` or `app/checkout/` routes beside the new route group.
- The active homepage is `app/(store)/page.tsx` → `components/content/HomeSections.tsx`. Several older files in `components/storefront/` are retained but have no current static importers; see the baseline before editing a similarly named file.
- Website content has draft and published revisions. Catalog, stock, prices, promotions, delivery, and order changes are immediate. Preview never freezes commerce data.
- The customer payment method is COD only. PayHere GET/POST endpoints return HTTP 501. An order confirmation screen is not payment verification.
- `/account` explains guest shopping. Customer registration, authentication, and account order history are not implemented.
- Women/Men audiences are explicit metadata; unisex is included in either, and unassigned products remain in All Products. Never infer an audience from photos, names, or category labels.
- Supabase is the persistence/auth/storage boundary. The service-role client is server-only and separate from the cookie/session client.
- Admin role names exist, but current access checks use an active admin profile rather than a per-role feature permission matrix.
- Shared CSS affects both surfaces. Current UI primitives use **Base UI**, despite older comments referring to Radix.

## Evidence and authority

The implementation, its tests, and SQL are evidence of current behavior. Explicit user decisions govern intended future behavior. If those disagree, record the discrepancy before changing either; documentation is not a reason to discard working code or user changes.

This review covered the application route and import graph, storefront/admin feature paths, shared libraries, SQL and scripts, configuration/lockfile, tests, and existing documentation and screenshots. It is an architecture and redesign-readiness review, not an exhaustive security certification or a production acceptance test.

Repository: [Hews99vi/xenon-v1](https://github.com/Hews99vi/xenon-v1). Local branch at review: `main`; local HEAD: `09c0b3b` (initial commit). GitHub metadata confirmed `main` as default and the open-PR search returned no results. Much of the implementation is modified/untracked locally; remote HEAD alone cannot describe this project.

Historical material has narrower authority:

- `my.md` is an earlier request for the latest-products section, including Embla and balanced product presentation. Its old “only this section” scope does not describe the new request to redesign both surfaces. Balanced representation is not currently guaranteed by a newest-products query.
- `jj.md` contains an older review and tool transcript. Its old checkout paths, active PayHere, missing limiter, missing cleanup, and absent email descriptions are superseded by current code. Keep it as history; do not use its readiness scores as evidence.
- `README 2.md` is starter/history material and refers to obsolete entry points/fonts.
- [Validation report](validation-report.md), `docs/validation/`, and `docs/screenshots/` describe an earlier fixture-based run. Their reported successes do not establish the state of the current configured services.

## Maintenance protocol

Before implementation, read `AGENTS.md`, this index, the relevant feature sources, and the current [status](project-status.md). Check `git status --short`; preserve modified and untracked work. Read the installed Next.js guides before relying on framework conventions.

For each meaningful change, update only the affected documentation:

1. Record the final user-visible behavior and any durable decision, with its source and date.
2. Update route/file ownership and contracts if they changed. Keep examples and local links accurate.
3. Record checks actually run, their outcomes, and remaining limits in `project-status.md`; distinguish historical evidence from new verification.
4. Capture unfinished work as a concrete gap, not a promise or a claimed feature. Remove a gap only when implementation and verification support doing so.
5. Keep secrets, customer/order records, production screenshots, and credential values out of these files.

Use these files as the project memory. Avoid adding duplicate review documents or appending raw tool transcripts. Preserve the existing rollout/payment guides as the owners of those procedures. A later session must recheck files and status rather than assume this review remains current indefinitely.
