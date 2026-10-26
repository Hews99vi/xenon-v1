-- Apply after content-management.sql. Does not rewrite existing galleries.
begin;

create table if not exists public.product_image_cleanup_jobs (
  asset_key text primary key,
  image_url text,
  product_id uuid references public.products(id) on delete set null,
  state text not null default 'pending' check (state in ('pending','retained','deleted')),
  attempts integer not null default 0,
  last_error text,
  not_before timestamptz not null default now(),
  deleted_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.product_image_cleanup_jobs add column if not exists not_before timestamptz not null default now();
alter table public.product_image_cleanup_jobs add column if not exists deleted_at timestamptz;
alter table public.product_image_cleanup_jobs enable row level security;
revoke all on public.product_image_cleanup_jobs from anon,authenticated;
grant select,update on public.product_image_cleanup_jobs to authenticated;
drop policy if exists product_cleanup_admin on public.product_image_cleanup_jobs;
create policy product_cleanup_admin on public.product_image_cleanup_jobs
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

-- Decode URL escapes for conservative reference matching, including old filenames.
create or replace function public.product_asset_decode(value text) returns text
language plpgsql immutable set search_path=public,pg_temp as $$
declare result text := ''; pos integer := 1; run text;
begin
  while pos <= length(value) loop
    if substr(value,pos,1)='%' and substr(value,pos+1,2) ~ '^[0-9a-fA-F]{2}$' then
      run := '';
      while substr(value,pos,1)='%' and substr(value,pos+1,2) ~ '^[0-9a-fA-F]{2}$' loop
        run := run || substr(value,pos,3); pos := pos+3;
      end loop;
      begin result := result || convert_from(decode(replace(run,'%',''),'hex'),'UTF8');
      exception when others then result := result || run; end;
    else
      result := result || substr(value,pos,1); pos := pos+1;
    end if;
  end loop;
  return result;
end $$;

create or replace function public.product_asset_key(url text) returns text
language sql immutable set search_path=public,pg_temp as $$
  select public.product_asset_decode(split_part(split_part(
    substring(url from '/storage/v1/object/public/(.+)$'),'?',1),'#',1));
$$;

create or replace function public.product_asset_referenced(key text) returns boolean
language sql volatile security definer set search_path=public,pg_temp as $$
  select exists (
    select 1 from (
      select to_jsonb(r)::text body from public.product_images r
      union all select to_jsonb(r)::text from public.content_revisions r
      union all select to_jsonb(r)::text from public.categories r
      union all select to_jsonb(r)::text from public.banners r
      union all select to_jsonb(r)::text from public.homepage_sections r
      union all select to_jsonb(r)::text from public.homepage_section_items r
      union all select to_jsonb(r)::text from public.blog_posts r
      union all select to_jsonb(r)::text from public.policy_pages r
      union all select to_jsonb(r)::text from public.site_settings r
    ) refs where strpos(public.product_asset_decode(body),key)>0
  );
$$;

-- Admin media writes are infrequent: one transaction mutex avoids reference/delete
-- races without holding a database transaction across a Storage HTTP request.
create or replace function public.product_asset_mutex() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin perform pg_advisory_xact_lock(710032601); return null; end $$;

create or replace function public.protect_product_asset_reference() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if exists (
    select 1 from public.product_image_cleanup_jobs j
    where j.deleted_at is not null
      and strpos(public.product_asset_decode(to_jsonb(NEW)::text),j.asset_key)>0
      and not exists(select 1 from storage.objects o where o.bucket_id || '/' || o.name=j.asset_key)
  ) then raise exception 'IMAGE_ALREADY_REMOVED: Reload images before reusing this file'; end if;
  return NEW;
end $$;

do $$ declare tbl text; begin
  foreach tbl in array array['products','product_images','content_revisions','categories','banners','homepage_sections','homepage_section_items','blog_posts','policy_pages','site_settings'] loop
    execute format('drop trigger if exists product_asset_write_mutex on public.%I',tbl);
    execute format('create trigger product_asset_write_mutex before insert or update or delete on public.%I for each statement execute function public.product_asset_mutex()',tbl);
    execute format('drop trigger if exists protect_product_asset_reference on public.%I',tbl);
    execute format('create trigger protect_product_asset_reference before insert or update on public.%I for each row execute function public.protect_product_asset_reference()',tbl);
  end loop;
end $$;
drop trigger if exists product_asset_write_mutex on storage.objects;
create trigger product_asset_write_mutex before insert or update or delete on storage.objects
  for each statement execute function public.product_asset_mutex();

-- Preserve the existing trigger entry point and extend its protection to catalog
-- and legacy references. Deleted keys act as tombstones against stale reuse.
create or replace function public.protect_content_asset() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare key text;
begin
  if TG_OP='UPDATE' and NEW.name=OLD.name and NEW.bucket_id=OLD.bucket_id then return NEW; end if;
  key := OLD.bucket_id || '/' || OLD.name;
  if public.product_asset_referenced(key) then
    raise exception 'Image is retained by catalog or website content';
  end if;
  insert into public.product_image_cleanup_jobs(asset_key,state,deleted_at) values(key,'deleted',now())
    on conflict(asset_key) do update set state='deleted',deleted_at=now(),last_error=null,updated_at=now();
  if TG_OP='DELETE' then return OLD; end if; return NEW;
end $$;

create or replace function public.product_image_snapshot(p_product_id uuid) returns jsonb
language plpgsql volatile security definer set search_path=public,pg_temp as $$
begin
  if not public.is_active_admin() then raise exception 'not_authorized'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',id,'image_url',image_url,'alt_text',alt_text,'sort_order',sort_order,'is_primary',is_primary
  ) order by id) from public.product_images where product_id=p_product_id),'[]'::jsonb);
end $$;

create or replace function public.enqueue_product_image_cleanup(p_urls text[],p_product_id uuid default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare url text; key text;
begin
  if not public.is_active_admin() then raise exception 'not_authorized'; end if;
  foreach url in array p_urls loop
    key := public.product_asset_key(url);
    if key like 'product-images/%' then
      insert into public.product_image_cleanup_jobs(asset_key,image_url,product_id,state)
        values(key,url,p_product_id,'pending')
      on conflict(asset_key) do update set image_url=excluded.image_url,
        product_id=coalesce(excluded.product_id,product_image_cleanup_jobs.product_id),
        state='pending',not_before=now(),last_error=null,updated_at=now();
    end if;
  end loop;
end $$;

create or replace function public.product_image_cleanup_allowed(p_key text) returns boolean
language plpgsql volatile security definer set search_path=public,pg_temp as $$
begin
  if not public.is_active_admin() then raise exception 'not_authorized'; end if;
  perform pg_advisory_xact_lock(710032601);
  if public.product_asset_referenced(p_key) then
    update public.product_image_cleanup_jobs set state='retained',last_error=null,updated_at=now() where asset_key=p_key;
    return false;
  end if;
  return exists(select 1 from public.product_image_cleanup_jobs where asset_key=p_key and state='pending' and not_before<=now());
end $$;

-- Reserve before uploading: a process crash cannot leave an untracked object.
-- The lease prevents another save/retry from deleting an upload still in flight.
create or replace function public.reserve_product_image_upload(p_url text,p_product_id uuid default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform public.enqueue_product_image_cleanup(array[p_url],p_product_id);
  update public.product_image_cleanup_jobs set not_before=now()+interval '30 minutes' where asset_key=public.product_asset_key(p_url);
end $$;

create or replace function public.admin_upsert_product_v2(
  p_product_id uuid,p_product jsonb,p_images jsonb,p_variants jsonb,p_expected_images jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb; pid uuid; img jsonb; old_image public.product_images; ordinal integer := 0;
  removed_urls text[]; current_snapshot jsonb;
begin
  if not public.is_active_admin() then raise exception 'not_authorized'; end if;
  perform pg_advisory_xact_lock(710032601);
  if jsonb_typeof(p_images) is distinct from 'array' or jsonb_typeof(p_expected_images) is distinct from 'array' then
    raise exception 'invalid_image_manifest';
  end if;
  if p_product_id is not null then
    perform 1 from public.products where id=p_product_id for update;
    if not found then raise exception 'product_not_found'; end if;
    current_snapshot := public.product_image_snapshot(p_product_id);
    if current_snapshot is distinct from p_expected_images then raise exception 'PRODUCT_IMAGES_CONFLICT'; end if;
  elsif p_expected_images <> '[]'::jsonb then raise exception 'invalid_image_manifest'; end if;
  if exists(select 1 from jsonb_array_elements(p_images) i where jsonb_typeof(i)<>'object' or nullif(trim(i->>'image_url'),'') is null)
    or (select count(*) from jsonb_array_elements(p_images) i where i->>'id' is not null)
      <> (select count(distinct i->>'id') from jsonb_array_elements(p_images) i where i->>'id' is not null) then
    raise exception 'invalid_image_manifest';
  end if;
  if exists(select 1 from jsonb_array_elements(p_images) i where i->>'id' is not null and not exists(
    select 1 from public.product_images pi where pi.id=(i->>'id')::uuid and pi.product_id=p_product_id
  )) then raise exception 'image_not_found'; end if;

  -- Reuse the existing product/variant rules inside this same transaction.
  result := public.admin_upsert_product(p_product_id,p_product,'[]'::jsonb,p_variants);
  pid := (result->>'product_id')::uuid;
  select array_agg(pi.image_url) into removed_urls from public.product_images pi where pi.product_id=pid and not exists(
    select 1 from jsonb_array_elements(p_images) i where i->>'id'=pi.id::text and i->>'image_url'=pi.image_url
  );
  perform public.enqueue_product_image_cleanup(coalesce(removed_urls,'{}'::text[]),pid);
  delete from public.product_images pi where pi.product_id=pid and not exists(
    select 1 from jsonb_array_elements(p_images) i where i->>'id'=pi.id::text
  );
  update public.product_images set is_primary=false where product_id=pid;
  for img in select value from jsonb_array_elements(p_images) loop
    if img->>'id' is not null then
      update public.product_images set image_url=img->>'image_url',alt_text=nullif(trim(img->>'alt_text'),''),
        sort_order=ordinal,is_primary=(ordinal=0) where id=(img->>'id')::uuid and product_id=pid;
    else
      insert into public.product_images(product_id,image_url,alt_text,sort_order,is_primary)
        values(pid,img->>'image_url',nullif(trim(img->>'alt_text'),''),ordinal,ordinal=0);
    end if;
    ordinal := ordinal+1;
  end loop;
  update public.product_image_cleanup_jobs j set state='retained',last_error=null,updated_at=now()
    where j.asset_key in (select public.product_asset_key(i->>'image_url') from jsonb_array_elements(p_images) i);
  return result || jsonb_build_object('images',coalesce((select jsonb_agg(to_jsonb(i) order by sort_order,id)
    from public.product_images i where product_id=pid),'[]'::jsonb),'snapshot',public.product_image_snapshot(pid));
end $$;

create or replace function public.product_image_cleanup_finish(p_key text) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.is_active_admin() then raise exception 'not_authorized'; end if;
  if exists(select 1 from storage.objects where bucket_id || '/' || name=p_key) then return false; end if;
  update public.product_image_cleanup_jobs set state='deleted',deleted_at=now(),last_error=null,updated_at=now() where asset_key=p_key;
  return true;
end $$;

revoke all on function public.product_asset_decode(text),public.product_asset_key(text),public.product_asset_referenced(text),public.product_asset_mutex(),public.protect_product_asset_reference() from public,anon,authenticated;
revoke all on function public.product_image_snapshot(uuid),public.enqueue_product_image_cleanup(text[],uuid),public.product_image_cleanup_allowed(text),public.admin_upsert_product_v2(uuid,jsonb,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.product_image_snapshot(uuid),public.enqueue_product_image_cleanup(text[],uuid),public.product_image_cleanup_allowed(text),public.admin_upsert_product_v2(uuid,jsonb,jsonb,jsonb,jsonb) to authenticated;
revoke all on function public.product_image_cleanup_finish(text) from public,anon;
grant execute on function public.product_image_cleanup_finish(text) to authenticated;
revoke all on function public.reserve_product_image_upload(text,uuid) from public,anon;
grant execute on function public.reserve_product_image_upload(text,uuid) to authenticated;
commit;
