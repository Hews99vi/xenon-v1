# Xenon V1

Next.js App Router ecommerce site for the Xenon clothing brand. The project uses TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth/Storage, guest checkout, Cash on Delivery, and PayHere payments.

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
PAYHERE_MERCHANT_ID=
PAYHERE_SECRET=
PAYHERE_SANDBOX=true
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_ADMIN_NAME=
```

Private values such as `SUPABASE_SERVICE_ROLE_KEY` and `PAYHERE_SECRET` must never use `NEXT_PUBLIC_`.

3. Apply the database schema in Supabase:

```bash
supabase/schema.sql
```

Run it through the Supabase SQL editor or your migration pipeline. If applying to an existing database, clean duplicate delivery zones before adding the normalized unique index.

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
3. Create `.env.production` with the required Supabase, PayHere, and site URL variables.
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
npm run build
```
