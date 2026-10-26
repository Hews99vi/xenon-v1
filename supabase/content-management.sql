-- Apply after schema.sql. Additive migration: legacy tables and content are retained.
begin;
alter table public.products add column if not exists audience text check (audience in ('women','men','unisex'));
alter table public.categories add column if not exists audience text check (audience in ('women','men','unisex'));
create index if not exists products_audience_status_idx on public.products(audience,status);
create table if not exists public.content_documents (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  kind text not null check (kind in ('site','page','journal')),
  slug text not null,
  draft_revision_id uuid,
  published_revision_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(kind,slug)
);
create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.content_documents(id),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique(document_id,id)
);
do $$ begin
  if not exists(select 1 from pg_constraint where conname='content_draft_revision_fk') then
    alter table public.content_documents add constraint content_draft_revision_fk foreign key(id,draft_revision_id) references public.content_revisions(document_id,id);
    alter table public.content_documents add constraint content_published_revision_fk foreign key(id,published_revision_id) references public.content_revisions(document_id,id);
  end if;
end $$;
create index if not exists content_revision_document_idx on public.content_revisions(document_id,created_at desc);
alter table public.content_documents enable row level security;
alter table public.content_revisions enable row level security;
drop policy if exists content_documents_read on public.content_documents;
create policy content_documents_read on public.content_documents for select using (published_revision_id is not null or public.is_active_admin());
-- SECURITY DEFINER helper avoids recursive policies and exposes only the currently published revision.
create or replace function public.content_revision_is_published(revision_id uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from content_documents where published_revision_id=revision_id);
$$;
drop policy if exists content_revisions_read on public.content_revisions;
create policy content_revisions_read on public.content_revisions for select using (public.content_revision_is_published(id) or public.is_active_admin());
grant select on public.content_documents, public.content_revisions to anon,authenticated;
revoke insert,update,delete on public.content_documents, public.content_revisions from anon,authenticated;

create or replace function public.save_content_draft(p_key text,p_kind text,p_slug text,p_payload jsonb,p_expected uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare doc content_documents; revision uuid;
begin
  if not public.is_active_admin() then raise exception 'Admin access required'; end if;
  if p_key is null or p_kind is null or p_slug is null or p_payload is null or p_kind not in ('site','page','journal') or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or jsonb_typeof(p_payload)<>'object' or coalesce(p_payload->>'version','')<>'1' then raise exception 'Invalid content'; end if;
  if p_key<>(case when p_kind='site' then 'site' else p_kind||':'||p_slug end) or (p_kind='site' and p_slug<>'site') then raise exception 'Invalid document key'; end if;
  insert into content_documents(key,kind,slug) values(p_key,p_kind,p_slug) on conflict(key) do nothing;
  select * into doc from content_documents where key=p_key for update;
  if doc.draft_revision_id is distinct from p_expected then raise exception 'CONTENT_CONFLICT'; end if;
  insert into content_revisions(document_id,payload,created_by) values(doc.id,p_payload,auth.uid()) returning id into revision;
  update content_documents set draft_revision_id=revision,updated_at=now() where id=doc.id;
  return revision;
end $$;
create or replace function public.publish_content(p_document_id uuid,p_expected uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare doc content_documents;
begin
  if not public.is_active_admin() then raise exception 'Admin access required'; end if;
  select * into doc from content_documents where id=p_document_id for update;
  if not found or p_expected is null or doc.draft_revision_id is distinct from p_expected then raise exception 'CONTENT_CONFLICT'; end if;
  update content_revisions set published_at=coalesce(published_at,now()) where id=p_expected;
  update content_documents set published_revision_id=p_expected,updated_at=now() where id=doc.id;
  return p_expected;
end $$;
create or replace function public.restore_content_draft(p_document_id uuid,p_revision_id uuid,p_expected uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare doc content_documents; source content_revisions; revision uuid;
begin
  if not public.is_active_admin() then raise exception 'Admin access required'; end if;
  select * into doc from content_documents where id=p_document_id for update;
  if not found or doc.draft_revision_id is distinct from p_expected then raise exception 'CONTENT_CONFLICT'; end if;
  select * into source from content_revisions where id=p_revision_id and document_id=p_document_id;
  if not found then raise exception 'Revision not found'; end if;
  insert into content_revisions(document_id,payload,created_by) values(doc.id,source.payload,auth.uid()) returning id into revision;
  update content_documents set draft_revision_id=revision,updated_at=now() where id=doc.id;
  return revision;
end $$;
revoke all on function public.save_content_draft(text,text,text,jsonb,uuid),public.publish_content(uuid,uuid),public.restore_content_draft(uuid,uuid,uuid) from public,anon;
grant execute on function public.save_content_draft(text,text,text,jsonb,uuid),public.publish_content(uuid,uuid),public.restore_content_draft(uuid,uuid,uuid) to authenticated;

-- Legacy content becomes read-only once imported: old forms cannot bypass publishing.
create or replace function public.guard_legacy_content() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from content_documents where key='site') then raise exception 'Use the Website editor to save and publish content'; end if;
  if TG_OP='DELETE' then return OLD; end if; return NEW;
end $$;
do $$ declare t text; begin
  foreach t in array array['banners','homepage_sections','homepage_section_items','site_settings','policy_pages','blog_posts'] loop
    execute format('drop trigger if exists guard_legacy_content on public.%I',t);
    execute format('create trigger guard_legacy_content before insert or update or delete on public.%I for each row execute function public.guard_legacy_content()',t);
  end loop;
end $$;
-- Import is transactional per document and available only to the migration operator.
create or replace function public.import_content_document(p_key text,p_kind text,p_slug text,p_payload jsonb,p_published boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare doc_id uuid; revision uuid;
begin
  insert into content_documents(key,kind,slug) values(p_key,p_kind,p_slug) on conflict(key) do nothing returning id into doc_id;
  if doc_id is null then return null; end if;
  insert into content_revisions(document_id,payload,published_at) values(doc_id,p_payload,case when p_published then now() else null end) returning id into revision;
  update content_documents set draft_revision_id=revision,published_revision_id=case when p_published then revision else null end where id=doc_id;
  return doc_id;
end $$;
revoke all on function public.import_content_document(text,text,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.import_content_document(text,text,text,jsonb,boolean) to service_role;
-- Every revision is retained. Cleanup must fail closed if any revision uses an asset.
create or replace function public.retained_content_assets(p_urls text[])
returns setof text language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if not public.is_active_admin() then raise exception 'Admin access required'; end if;
  return query select distinct url from unnest(p_urls) url where exists(select 1 from content_revisions r,
    lateral jsonb_path_query(r.payload, '$.**') value
    where jsonb_typeof(value)='string' and strpos(value #>> '{}',url)>0);
end $$;
revoke all on function public.retained_content_assets(text[]) from public,anon;
grant execute on function public.retained_content_assets(text[]) to authenticated;
create or replace function public.protect_content_asset() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare suffix text; encoded_suffix text;
begin
  if TG_OP='UPDATE' and NEW.name=OLD.name and NEW.bucket_id=OLD.bucket_id then return NEW; end if;
  suffix := '/storage/v1/object/public/' || OLD.bucket_id || '/' || OLD.name;
  encoded_suffix := replace(replace(suffix,' ','%20'),'#','%23');
  if exists(select 1 from content_revisions r, lateral jsonb_path_query(r.payload,'$.**') value
    where jsonb_typeof(value)='string' and (strpos(value #>> '{}',suffix)>0 or strpos(value #>> '{}',encoded_suffix)>0)) then
    raise exception 'Image is retained by a website revision';
  end if;
  if TG_OP='DELETE' then return OLD; end if; return NEW;
end $$;
drop trigger if exists protect_content_asset on storage.objects;
create trigger protect_content_asset before delete or update of name,bucket_id on storage.objects
  for each row execute function public.protect_content_asset();

-- Make product and child-row writes atomic for admin create/update actions.
-- Storage uploads remain outside the database transaction and are cleaned up by
-- the server action when this function fails.

create or replace function public.admin_upsert_product(
  p_product_id uuid,
  p_product jsonb,
  p_images jsonb,
  p_variants jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product_id uuid;
  product_slug text;
  image_row record;
  variant_row record;
  next_image_sort_order integer;
  has_primary_image boolean;
begin
  if not public.is_active_admin() then
    raise exception 'not_authorized';
  end if;

  if jsonb_typeof(coalesce(p_product, '{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(p_images, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_variants, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_product_payload';
  end if;

  if p_product_id is null then
    insert into public.products (
      audience,
      category_id,
      name,
      slug,
      description,
      short_description,
      base_price,
      sale_price,
      sku,
      status,
      is_featured,
      seo_title,
      seo_description
    )
    values (
      nullif(p_product->>'audience',''),
      (p_product->>'category_id')::uuid,
      trim(p_product->>'name'),
      trim(p_product->>'slug'),
      nullif(trim(p_product->>'description'), ''),
      nullif(trim(p_product->>'short_description'), ''),
      (p_product->>'base_price')::numeric,
      nullif(trim(p_product->>'sale_price'), '')::numeric,
      trim(p_product->>'sku'),
      p_product->>'status',
      coalesce((p_product->>'is_featured')::boolean, false),
      nullif(trim(p_product->>'seo_title'), ''),
      nullif(trim(p_product->>'seo_description'), '')
    )
    returning id, slug into v_product_id, product_slug;
  else
    update public.products
    set
      audience = case when p_product ? 'audience' then nullif(p_product->>'audience','') else audience end,
      category_id = (p_product->>'category_id')::uuid,
      name = trim(p_product->>'name'),
      slug = trim(p_product->>'slug'),
      description = nullif(trim(p_product->>'description'), ''),
      short_description = nullif(trim(p_product->>'short_description'), ''),
      base_price = (p_product->>'base_price')::numeric,
      sale_price = nullif(trim(p_product->>'sale_price'), '')::numeric,
      sku = trim(p_product->>'sku'),
      status = p_product->>'status',
      is_featured = coalesce((p_product->>'is_featured')::boolean, false),
      seo_title = nullif(trim(p_product->>'seo_title'), ''),
      seo_description = nullif(trim(p_product->>'seo_description'), '')
    where id = p_product_id
    returning id, slug into v_product_id, product_slug;

    if not found then
      raise exception 'product_not_found';
    end if;
  end if;

  select
    coalesce(max(sort_order) + 1, 0),
    coalesce(bool_or(is_primary), false)
  into next_image_sort_order, has_primary_image
  from public.product_images
  where public.product_images.product_id = v_product_id;

  for image_row in
    select *
    from jsonb_to_recordset(p_images) as image(image_url text, alt_text text)
  loop
    if nullif(trim(image_row.image_url), '') is null then
      raise exception 'invalid_product_image';
    end if;

    insert into public.product_images (
      product_id,
      image_url,
      alt_text,
      sort_order,
      is_primary
    )
    values (
      v_product_id,
      trim(image_row.image_url),
      nullif(trim(image_row.alt_text), ''),
      next_image_sort_order,
      not has_primary_image and next_image_sort_order = coalesce(next_image_sort_order, 0)
    );

    has_primary_image := true;
    next_image_sort_order := next_image_sort_order + 1;
  end loop;

  delete from public.product_variants existing_variant
  where existing_variant.product_id = v_product_id
    and not exists (
      select 1
      from jsonb_to_recordset(p_variants) as submitted_variant(id uuid)
      where submitted_variant.id is not null
        and submitted_variant.id = existing_variant.id
    );

  for variant_row in
    select *
    from jsonb_to_recordset(p_variants) as variant(
      id uuid,
      color text,
      size text,
      sku text,
      price numeric,
      stock_quantity integer,
      is_active boolean
    )
  loop
    if nullif(trim(variant_row.sku), '') is null then
      raise exception 'invalid_variant_sku';
    end if;

    if variant_row.id is null then
      insert into public.product_variants (
        product_id,
        color,
        size,
        sku,
        price,
        stock_quantity,
        is_active
      )
      values (
        v_product_id,
        nullif(trim(variant_row.color), ''),
        coalesce(nullif(trim(variant_row.size), ''), 'Free Size'),
        trim(variant_row.sku),
        variant_row.price,
        variant_row.stock_quantity,
        coalesce(variant_row.is_active, true)
      );
    else
      if not exists (
        select 1
        from public.product_variants
        where id = variant_row.id
          and public.product_variants.product_id = v_product_id
      ) then
        raise exception 'variant_not_found';
      end if;

      update public.product_variants
      set
        color = nullif(trim(variant_row.color), ''),
        size = coalesce(nullif(trim(variant_row.size), ''), 'Free Size'),
        sku = trim(variant_row.sku),
        price = variant_row.price,
        stock_quantity = variant_row.stock_quantity,
        is_active = coalesce(variant_row.is_active, true)
      where id = variant_row.id
        and public.product_variants.product_id = v_product_id;
    end if;
  end loop;

  return jsonb_build_object(
    'product_id', v_product_id,
    'slug', product_slug
  );
end;
$$;

revoke execute on function public.admin_upsert_product(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.admin_upsert_product(uuid, jsonb, jsonb, jsonb) to authenticated, service_role;

create or replace function public.has_site_document() returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from content_documents where key='site');
$$;
revoke all on function public.has_site_document() from public;
grant execute on function public.has_site_document() to anon,authenticated;

-- Distinct options across the entire matching catalog, without REST row caps.
create or replace function public.storefront_filter_options(p_category_slug text default null,p_search text default null,p_audience text default null)
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
  with matching as (
    select v.color,v.size from products p join product_variants v on v.product_id=p.id
    left join categories c on c.id=p.category_id
    where p.status='active' and v.is_active
      and (nullif(p_category_slug,'') is null or c.slug=p_category_slug and c.is_active)
      and (p_audience is null or p_audience not in ('women','men') or p.audience in (p_audience,'unisex'))
      and (nullif(trim(p_search),'') is null or strpos(lower(p.name),lower(trim(p_search)))>0 or strpos(lower(coalesce(p.description,'')),lower(trim(p_search)))>0)
  ) select jsonb_build_object(
    'colors',coalesce((select jsonb_agg(color order by color) from (select distinct color from matching where nullif(color,'') is not null) colors),'[]'::jsonb),
    'sizes',coalesce((select jsonb_agg(size order by size) from (select distinct size from matching where nullif(size,'') is not null) sizes),'[]'::jsonb)
  );
$$;
revoke all on function public.storefront_filter_options(text,text,text) from public;
grant execute on function public.storefront_filter_options(text,text,text) to anon,authenticated;

commit;
