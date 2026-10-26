# Xenon V1

Start with the maintained [project context](docs/project-context.md) for the architecture, current design baseline, redesign guide and project status. Both storefront and admin use the approved premium white-and-black collection-gallery direction. [DESIGN.md](DESIGN.md) records reusable tokens; [PRODUCT.md](PRODUCT.md) records product constraints. Instrument Sans is self-hosted under `public/fonts/` with its OFL license.

For the website editor, migration, publishing workflow, and release checks, see [Website editor rollout](docs/website-editor-rollout.md).
Historical fixture checks and desktop/mobile screenshots are in the [validation report](docs/validation-report.md). Current verification and limitations are recorded in [project status](docs/project-status.md).

Next.js App Router ecommerce site for the Xenon clothing brand. The project uses TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth/Storage, guest checkout, and Cash on Delivery. PayHere endpoints are disabled; online payments are future work described in the [payment roadmap](docs/payment-gateway-roadmap.md).

## Local Setup

1. Install dependencies:

```bash
npm ci
```

2. Create `.env.local` from `.env.example` and fill in real development values:

```bash
cp .env.example .env.local
```

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Production checkout additionally requires distributed rate limiting:

```bash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Admin seeding uses these variables only when running `npm run seed:admin`:

```bash
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_ADMIN_NAME=
```

Optional confirmation/welcome emails use `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. The order-email support address uses `SUPPORT_EMAIL` (or `NEXT_PUBLIC_SUPPORT_EMAIL`); this is separate from the website editor's footer contact settings. Missing email configuration does not prevent COD order placement or subscriber persistence.

Private values such as `SUPABASE_SERVICE_ROLE_KEY`, Redis tokens, and `RESEND_API_KEY` must never use `NEXT_PUBLIC_`. Production checkout blocks if the distributed limiter is missing or unavailable. PayHere merchant settings are not required by the current application.

3. Apply the complete database schema in Supabase:

```bash
supabase/schema.sql
```

Run it through the Supabase SQL editor or your migration pipeline. This includes the application tables, RLS policies, admin image Storage buckets, and Storage policies required by the admin panel. If applying to an existing database, clean duplicate delivery zones before adding the normalized unique index.

For an existing database, also run `supabase/admin-modules.sql` to apply the admin product constraints and re-apply the Storage setup safely, then run `supabase/product-admin-transaction.sql` to install the atomic admin product create/update function.
If the existing homepage hero was seeded before the category navigation update, run `supabase/category-navigation-fix.sql` as well.
Run `supabase/newsletter.sql` for newsletter persistence and the admin subscriber view when upgrading an existing database.

Apply `supabase/checkout-transaction-fix.sql` when upgrading an existing database, and `supabase/content-management.sql` for the website editor. Then apply `supabase/product-image-management.sql` for the product gallery manager before using the updated create/edit forms. See [product image management](docs/product-image-management.md) for cleanup, retry and rollback behavior. Validate with `npm run content:import`, then import with `npm run content:import -- --apply`. The import requires Node 22+ and preserves existing catalog, orders, and legacy content.

4. Seed a local admin user:

```bash
npm run seed:admin
```

5. Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```bash
NODE_ENV=production npm run build
npm start
```

`package.json` uses `next start` for the `start` script.

## Namecheap VPS Deployment

1. Clone the repository on the VPS.
2. Install Node.js and npm.
3. Create `.env.production` with the required Supabase, production Redis, and site URL variables; add Resend settings if email delivery is required.
4. Install dependencies and build:

```bash
npm ci
npm run build
```

5. Run with PM2:

```bash
pm2 start npm --name xenon -- run start
pm2 save
```

6. Put Nginx in front of the app on port `3000`:

```nginx
server {
  listen 80;
  server_name example.com www.example.com;

  location /_next/static/ {
    proxy_pass http://127.0.0.1:3000;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

7. Enable SSL with Certbot:

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

Keep production secrets in environment files or your host secret manager, outside Git. Restrict file permissions for `.env.production`.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Unit tests use mocked service boundaries. See [test scope](tests/README.md) for the disposable PostgreSQL suite and integration limits. Builds can read Supabase content while collecting product/journal route parameters, so successful compilation alone does not guarantee a completed build. Check the dated [project status](docs/project-status.md) before relying on an earlier pass.
