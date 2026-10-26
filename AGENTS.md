<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project continuity

- Start future work with `docs/project-context.md`, then the relevant architecture, design baseline, redesign guide and current status linked there. Confirm current behavior against source; these documents include a dated local-working-tree baseline, not a deployment guarantee.
- The approved redesign covers both storefront and admin: white/near-black collection gallery, Instrument Sans, and original public/logo artwork. Read DESIGN.md and PRODUCT.md. Preserve commerce and website draft/preview/publish contracts while extending the design.
- Inspect `git status` and preserve existing modified/untracked work. The active storefront lives in `app/(store)/` and the current homepage renders through `components/content/HomeSections.tsx`; several older similarly named components remain unused.
- After a meaningful change, update the affected project documents and record actual verification/remaining limits in `docs/project-status.md`. Keep notes concise, source-backed and free of secrets/customer data; avoid duplicate review transcripts.
