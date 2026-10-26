-- Minimal Supabase interfaces for an isolated PostgreSQL test database only.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user) $$;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
alter table storage.objects enable row level security;
grant usage on schema public,auth,storage to anon,authenticated,service_role;
alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
grant all on storage.objects,storage.buckets to anon,authenticated,service_role;
create function public.test_assert(condition boolean, message text) returns void language plpgsql as $$ begin if condition is distinct from true then raise exception 'Assertion failed: %',message; end if; end $$;
create function public.expect_error(statement text,expected text) returns void language plpgsql as $$ begin
  begin execute statement; exception when others then if strpos(SQLERRM,expected)>0 then return; end if; raise; end;
  raise exception 'Expected error containing %',expected;
end $$;
