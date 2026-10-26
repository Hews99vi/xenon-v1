-- Newsletter persistence and admin visibility for existing databases.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  source text,
  subscribed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists newsletter_subscribers_email_uidx
on public.newsletter_subscribers (lower(email));

create index if not exists newsletter_subscribers_status_subscribed_idx
on public.newsletter_subscribers (status, subscribed_at desc);

drop trigger if exists set_newsletter_subscribers_updated_at on public.newsletter_subscribers;
create trigger set_newsletter_subscribers_updated_at
before update on public.newsletter_subscribers
for each row execute function public.set_updated_at();

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "Admins read newsletter subscribers" on public.newsletter_subscribers;
create policy "Admins read newsletter subscribers"
on public.newsletter_subscribers for select
using (public.is_active_admin());

drop policy if exists "Admins manage newsletter subscribers" on public.newsletter_subscribers;
create policy "Admins manage newsletter subscribers"
on public.newsletter_subscribers for all
using (public.is_active_admin())
with check (public.is_active_admin());
