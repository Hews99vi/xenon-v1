# Test scope

Run the unit and mocked server-action suite with `npm test`. Vitest uses a Node environment, `tests/setup.ts`, and a `server-only` alias. These tests intentionally mock Supabase at the application boundary; they do not run a browser or establish real service integration.

The existing local PostgreSQL suite is available through `npm run test:db`. It requires `psql` and `XENON_TEST_POSTGRES_URL` pointing at a disposable **local maintenance database**. The script creates its own unique database and drops it afterward; never supply the application or production database as the test target.

The SQL suite covers fresh/repeat schema application, content RLS and RPC permissions, draft/publication conflicts, restore-to-draft, retained images, audience/filter options, COD totals/stock/promo rollback and idempotent stock release. Auth and Storage table interfaces are stubbed, so this does not verify Supabase Auth refresh or real uploads.

Additional integration coverage remains useful for newsletter permissions, real Auth/Storage behavior, checkout concurrency, and other gaps listed in [project status](../docs/project-status.md). Browser flows and visual checks remain separate from `npm test`; the current executable suite is described below. Historical reports do not establish a current pass.

See the [website editor rollout](../docs/website-editor-rollout.md) for release procedures and [project status](../docs/project-status.md) for checks actually run and their dates. Do not infer a current pass from older reports.

## Browser checks

Requires Node 22+, `psql`, a local PostgreSQL maintenance server, `postgrest` on PATH, and an installed Chrome executable. No service or browser is downloaded automatically. With a local maintenance database running:

```bash
XENON_TEST_POSTGRES_URL=postgresql://127.0.0.1:55439/postgres npm run test:browser
```

Set `XENON_CHROME_PATH` when Chrome is not at the macOS default. The runner reserves local ports 3100/55339/55340, creates a uniquely named `xenon_browser_*` database, applies the test bootstrap/base/checkout/content/gallery SQL, seeds explicit fixtures, starts Next and a test-only Auth proxy over real PostgREST, runs Playwright, then stops its services and drops only its own database. It refuses remote database hosts and occupied ports. The fixture app uses `.next/browser-tests` and a generated ignored TypeScript configuration, so it can coexist with the developer app without replacing its bundles or taking its dev lock. Production environment files are never edited; child process variables override Supabase and disable email/Redis integrations.

`tests/browser/content-fixture.json` contains test-only site content based on the public Xenon layout and clearly labelled synthetic policy bodies. No customer records or production mutations are needed. `fixture-server.mjs` implements test Auth and in-memory Storage APIs backed by real local metadata/guards. These are explicit shims, not Supabase Auth/Storage or a production server. Tests assert fixture health before mutation. Artifacts and service logs are in `.impeccable/review/` and `.impeccable/build/`; credentials in the generated ignored fixture environment are local-test-only.

Flows cover navigation/filter/focus, bag persistence, code estimate clearing, rapid order submission, recoverable request failure, delivery retry, draft preview/publication, stale-editor conflicts, history restore and operational feedback. Edge checks exercise long names, missing images, sold-out options and no results. Responsive screenshots/assertions cover 360/390/768/1024/1440 and mobile operational routes. This does not verify hosted Auth refresh, actual Storage upload, external email/Redis or deployed performance. PostgreSQL and PostgREST installation/server lifecycle remain the developer's responsibility.

The gallery suite adds upload/replace/reorder/primary/alt/Undo, unchanged saves and IDs, empty/broken galleries, failed-file preservation, cleanup retries, protected shared originals, conflict reload, new-product creation and browser history warnings. The SQL suite additionally tests leased uploads, atomic image/variant rollback and three deterministic concurrent interleavings, waiting on actual database locks. Gallery evidence is in `.impeccable/review/images/`. Actual hosted Storage remains a separate authorized integration check.
