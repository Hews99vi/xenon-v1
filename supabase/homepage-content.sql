-- Editable Xenon homepage content setup.
-- Run after supabase/schema.sql for existing Supabase projects.
-- Safe to run more than once.

alter table public.banners
add column if not exists eyebrow text;

alter table public.banners
add column if not exists secondary_cta_label text;

alter table public.banners
add column if not exists secondary_cta_url text;

create table if not exists public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  micro_label text,
  title text not null,
  body text,
  cta_label text,
  cta_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.homepage_sections(id) on delete cascade,
  title text not null,
  subtitle text,
  image_url text,
  cta_label text,
  cta_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists banners_placement_active_sort_idx
on public.banners (placement, is_active, sort_order);

create index if not exists homepage_sections_key_active_idx
on public.homepage_sections (section_key, is_active);

create index if not exists homepage_section_items_section_sort_idx
on public.homepage_section_items (section_id, is_active, sort_order);

create unique index if not exists homepage_section_items_section_title_uidx
on public.homepage_section_items (section_id, lower(title));

drop trigger if exists set_homepage_sections_updated_at on public.homepage_sections;
create trigger set_homepage_sections_updated_at
before update on public.homepage_sections
for each row execute function public.set_updated_at();

drop trigger if exists set_homepage_section_items_updated_at on public.homepage_section_items;
create trigger set_homepage_section_items_updated_at
before update on public.homepage_section_items
for each row execute function public.set_updated_at();

alter table public.homepage_sections enable row level security;
alter table public.homepage_section_items enable row level security;

drop policy if exists "Public can read active homepage sections" on public.homepage_sections;
create policy "Public can read active homepage sections"
on public.homepage_sections for select
using (is_active = true or public.is_active_admin());

drop policy if exists "Admins manage homepage sections" on public.homepage_sections;
create policy "Admins manage homepage sections"
on public.homepage_sections for all
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Public can read active homepage section items" on public.homepage_section_items;
create policy "Public can read active homepage section items"
on public.homepage_section_items for select
using (
  public.is_active_admin()
  or (
    is_active = true
    and exists (
      select 1
      from public.homepage_sections
      where homepage_sections.id = homepage_section_items.section_id
        and homepage_sections.is_active = true
    )
  )
);

drop policy if exists "Admins manage homepage section items" on public.homepage_section_items;
create policy "Admins manage homepage section items"
on public.homepage_section_items for all
using (public.is_active_admin())
with check (public.is_active_admin());

insert into public.banners (
  title,
  subtitle,
  eyebrow,
  image_url,
  cta_label,
  cta_url,
  secondary_cta_label,
  secondary_cta_url,
  placement,
  sort_order
)
select
  seed.title,
  seed.subtitle,
  seed.eyebrow,
  seed.image_url,
  seed.cta_label,
  seed.cta_url,
  seed.secondary_cta_label,
  seed.secondary_cta_url,
  seed.placement,
  seed.sort_order
from (
  values
  (
    'NO NOISE.
JUST FORM.',
    'Monochrome essentials. Zero compromise.',
    'Xenon · SS26',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae',
    'Shop Signature',
    '/products?category=signature-collection',
    'Shop Evening Wear',
    '/products?category=evening-wear',
    'home_hero',
    1
  ),
  (
    'THE MONOCHROME UNIFORM',
    'Built for quiet confidence — tailored essentials for day and night.',
    'Campaign',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b',
    'Shop Now',
    '/products',
    null,
    null,
    'home_editorial',
    1
  )
) as seed (
  title,
  subtitle,
  eyebrow,
  image_url,
  cta_label,
  cta_url,
  secondary_cta_label,
  secondary_cta_url,
  placement,
  sort_order
)
where not exists (
  select 1
  from public.banners
  where banners.placement = seed.placement
    and banners.title = seed.title
);

insert into public.homepage_sections (
  section_key,
  micro_label,
  title,
  body,
  sort_order,
  metadata
)
values
  (
    'home_occasions',
    'STYLE CODES',
    'SHOP BY OCCASION',
    null,
    1,
    '{"defaultGender":"men"}'::jsonb
  ),
  (
    'home_atelier',
    'ATELIER',
    'PRECISION IN RESTRAINT',
    'Xenon is built around monochrome silhouettes, clean construction, and everyday refinement.',
    2,
    '{"values":["CONSIDERED SILHOUETTES","EVERYDAY LUXURY","MEN AND WOMEN EDITS"]}'::jsonb
  )
on conflict (section_key) do update
set
  micro_label = excluded.micro_label,
  title = excluded.title,
  body = excluded.body,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.homepage_section_items (
  section_id,
  title,
  subtitle,
  image_url,
  cta_label,
  cta_url,
  sort_order,
  metadata
)
values
  (
    (select id from public.homepage_sections where section_key = 'home_occasions'),
    'WORK',
    'Sharp essentials for long days.',
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b',
    'Shop Now',
    '/products?q=work',
    1,
    '{"gender":"all","objectPosition":"42% 18%"}'::jsonb
  ),
  (
    (select id from public.homepage_sections where section_key = 'home_occasions'),
    'EVENING',
    'Quiet pieces after dark.',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c',
    'Shop Now',
    '/products?q=evening',
    2,
    '{"gender":"all","objectPosition":"54% 16%"}'::jsonb
  ),
  (
    (select id from public.homepage_sections where section_key = 'home_occasions'),
    'WEEKEND',
    'Relaxed silhouettes, refined.',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b',
    'Shop Now',
    '/products?q=weekend',
    3,
    '{"gender":"all","objectPosition":"62% 20%"}'::jsonb
  ),
  (
    (select id from public.homepage_sections where section_key = 'home_occasions'),
    'TRAVEL',
    'Movement without noise.',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f',
    'Shop Now',
    '/products?q=travel',
    4,
    '{"gender":"all","objectPosition":"48% 22%"}'::jsonb
  ),
  (
    (select id from public.homepage_sections where section_key = 'home_atelier'),
    'Fabric / Detail',
    null,
    'https://images.unsplash.com/photo-1516762689617-e1cffcef479d',
    null,
    null,
    1,
    '{"layout":"detail","objectPosition":"42% 20%"}'::jsonb
  ),
  (
    (select id from public.homepage_sections where section_key = 'home_atelier'),
    'Model / Editorial',
    null,
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c',
    null,
    null,
    2,
    '{"layout":"editorial","objectPosition":"58% 16%"}'::jsonb
  ),
  (
    (select id from public.homepage_sections where section_key = 'home_atelier'),
    'Product / Close-Up',
    null,
    'https://images.unsplash.com/photo-1523170335258-f5ed11844a49',
    null,
    null,
    3,
    '{"layout":"wide","objectPosition":"50% 28%"}'::jsonb
  )
on conflict do nothing;
