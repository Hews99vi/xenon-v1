-- Xenon search performance indexes for Supabase PostgreSQL.
-- Run this after supabase/schema.sql in the Supabase SQL editor.
-- The statements are non-destructive and safe to run more than once.

create extension if not exists pg_trgm;

-- Storefront and admin product search use ILIKE against these fields.
create index if not exists products_name_trgm_idx
on public.products using gin (name gin_trgm_ops);

create index if not exists products_description_trgm_idx
on public.products using gin (description gin_trgm_ops)
where description is not null;

create index if not exists products_sku_trgm_idx
on public.products using gin (sku gin_trgm_ops);

create index if not exists products_slug_trgm_idx
on public.products using gin (slug gin_trgm_ops);

-- Admin order search readiness. The current order list displays these fields,
-- and these indexes keep future ILIKE filters from scanning the whole table.
create index if not exists orders_order_number_trgm_idx
on public.orders using gin (order_number gin_trgm_ops);

create index if not exists orders_customer_email_trgm_idx
on public.orders using gin (customer_email gin_trgm_ops);

create index if not exists orders_customer_first_name_trgm_idx
on public.orders using gin (customer_first_name gin_trgm_ops);

create index if not exists orders_customer_last_name_trgm_idx
on public.orders using gin (customer_last_name gin_trgm_ops);
