-- Extra setup for the admin category/product modules.
-- Run after supabase/schema.sql if your database already exists.

alter table public.products
drop constraint if exists products_status_check;

alter table public.products
add constraint products_status_check
check (status in ('draft', 'active', 'out_of_stock', 'archived'));

create unique index if not exists product_variants_unique_color_size
on public.product_variants (
  product_id,
  lower(coalesce(color, '')),
  lower(coalesce(size, 'Free Size'))
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'blog-images',
    'blog-images',
    true,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'banner-images',
    'banner-images',
    true,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'category-images',
    'category-images',
    true,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  ),
  (
    'product-images',
    'product-images',
    true,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin image uploads" on storage.objects;
create policy "Admin image uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('banner-images', 'blog-images', 'category-images', 'product-images')
  and exists (
    select 1
    from public.admin_profiles
    where admin_profiles.id = auth.uid()
      and admin_profiles.is_active = true
  )
);

drop policy if exists "Admin image updates" on storage.objects;
create policy "Admin image updates"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('banner-images', 'blog-images', 'category-images', 'product-images')
  and exists (
    select 1
    from public.admin_profiles
    where admin_profiles.id = auth.uid()
      and admin_profiles.is_active = true
  )
)
with check (
  bucket_id in ('banner-images', 'blog-images', 'category-images', 'product-images')
  and exists (
    select 1
    from public.admin_profiles
    where admin_profiles.id = auth.uid()
      and admin_profiles.is_active = true
  )
);

drop policy if exists "Admin image deletes" on storage.objects;
create policy "Admin image deletes"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('banner-images', 'blog-images', 'category-images', 'product-images')
  and exists (
    select 1
    from public.admin_profiles
    where admin_profiles.id = auth.uid()
      and admin_profiles.is_active = true
  )
);

drop policy if exists "Public image reads" on storage.objects;
create policy "Public image reads"
on storage.objects
for select
to public
using (bucket_id in ('banner-images', 'blog-images', 'category-images', 'product-images'));
