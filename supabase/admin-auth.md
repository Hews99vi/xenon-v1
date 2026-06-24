# Seeding the Initial Admin User

Supabase Auth users should be created through the Supabase dashboard or the Auth Admin API. Do not insert directly into `auth.users`.

## Option 1: Supabase Dashboard

1. Open your Supabase project.
2. Go to **Authentication > Users > Add user**.
3. Enter the admin email and password.
4. Copy the generated user UUID.
5. In **SQL Editor**, create the matching admin profile:

```sql
insert into public.admin_profiles (id, full_name, role, is_active)
values (
  'PASTE_AUTH_USER_UUID_HERE',
  'Xenon Admin',
  'owner',
  true
)
on conflict (id) do update
set
  full_name = excluded.full_name,
  role = excluded.role,
  is_active = excluded.is_active,
  updated_at = now();
```

## Option 2: Auth Admin API

Run this from a trusted server or local terminal only. The service role key must never be exposed to the browser.

```bash
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "replace-with-a-strong-password",
    "email_confirm": true
  }'
```

Copy the returned `id`, then insert the `admin_profiles` row with the SQL above.
