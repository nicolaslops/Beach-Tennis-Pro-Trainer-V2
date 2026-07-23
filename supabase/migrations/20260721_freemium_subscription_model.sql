begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  plan text not null default 'free',
  subscription_status text not null default 'inactive',
  subscription_provider text,
  subscription_product_id text,
  subscription_offer_id text,
  subscription_transaction_id text,
  subscription_subscriber_code text,
  subscription_started_at timestamptz,
  subscription_current_period_end timestamptz,
  subscription_canceled_at timestamptz,
  next_plan text,
  pending_plan_effective_at timestamptz,
  lifetime_access boolean not null default false,
  legacy_plan text,
  legacy_review_required boolean not null default false,
  access_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists plan text not null default 'free',
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists subscription_provider text,
  add column if not exists subscription_product_id text,
  add column if not exists subscription_offer_id text,
  add column if not exists subscription_transaction_id text,
  add column if not exists subscription_subscriber_code text,
  add column if not exists subscription_started_at timestamptz,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists subscription_canceled_at timestamptz,
  add column if not exists next_plan text,
  add column if not exists pending_plan_effective_at timestamptz,
  add column if not exists lifetime_access boolean not null default false,
  add column if not exists legacy_plan text,
  add column if not exists legacy_review_required boolean not null default false,
  add column if not exists access_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.profiles set plan = lower(plan)
 where lower(plan) in ('free', 'plus', 'pro');
update public.profiles set plan = 'free'
 where plan is null or plan not in ('free', 'plus', 'pro');

update public.profiles set subscription_status = lower(subscription_status)
 where lower(subscription_status) in ('inactive', 'active', 'past_due', 'canceled', 'refunded', 'chargeback', 'expired');
update public.profiles set subscription_status = 'inactive'
 where subscription_status is null
    or subscription_status not in ('inactive', 'active', 'past_due', 'canceled', 'refunded', 'chargeback', 'expired');

alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'plus', 'pro'));

alter table public.profiles drop constraint if exists profiles_next_plan_check;
alter table public.profiles add constraint profiles_next_plan_check
  check (next_plan is null or next_plan in ('free', 'plus', 'pro'));

alter table public.profiles drop constraint if exists profiles_legacy_plan_check;
alter table public.profiles add constraint profiles_legacy_plan_check
  check (legacy_plan is null or legacy_plan in ('free', 'plus', 'pro'));

alter table public.profiles drop constraint if exists profiles_subscription_status_check;
alter table public.profiles add constraint profiles_subscription_status_check
  check (subscription_status in ('inactive', 'active', 'past_due', 'canceled', 'refunded', 'chargeback', 'expired'));

create index if not exists profiles_email_lower_idx on public.profiles (lower(email));
create index if not exists profiles_subscription_status_idx on public.profiles (subscription_status);
create index if not exists profiles_period_end_idx on public.profiles (subscription_current_period_end);
create index if not exists profiles_legacy_review_idx on public.profiles (legacy_review_required)
  where legacy_review_required = true;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    name,
    email,
    plan,
    subscription_status,
    access_active
  )
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
    lower(new.email),
    'free',
    'inactive',
    true
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(public.profiles.name, excluded.name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, name, email, plan, subscription_status, access_active)
select
  users.id,
  nullif(trim(coalesce(users.raw_user_meta_data ->> 'name', '')), ''),
  lower(users.email),
  'free',
  'inactive',
  true
from auth.users users
on conflict (id) do update
  set email = excluded.email,
      name = coalesce(public.profiles.name, excluded.name),
      updated_at = now();

create or replace function public.ensure_current_profile()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  insert into public.profiles (id, name, email, plan, subscription_status, access_active)
  select
    users.id,
    nullif(trim(coalesce(users.raw_user_meta_data ->> 'name', '')), ''),
    lower(users.email),
    'free',
    'inactive',
    true
  from auth.users users
  where users.id = auth.uid()
  on conflict (id) do nothing;

  select * into result
    from public.profiles
   where id = auth.uid();
  return result;
end;
$$;

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (name) on table public.profiles to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "Users can update own profile name" on public.profiles;
create policy "Users can update own profile name"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke all on function public.ensure_current_profile() from public, anon, authenticated;
grant execute on function public.ensure_current_profile() to authenticated;

create table if not exists public.user_app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  local_migrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists user_app_data_touch_updated_at on public.user_app_data;
create trigger user_app_data_touch_updated_at
before update on public.user_app_data
for each row execute function public.touch_updated_at();

alter table public.user_app_data enable row level security;
revoke all on table public.user_app_data from anon, authenticated;
grant select, insert, update, delete on table public.user_app_data to authenticated;

drop policy if exists "Users manage own app data" on public.user_app_data;
create policy "Users manage own app data"
  on public.user_app_data for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.subscription_events (
  id bigint generated by default as identity primary key,
  provider text not null default 'hotmart',
  event_key text not null,
  event_id text,
  transaction_id text,
  recurrence_number integer,
  subscriber_email text,
  product_id text,
  offer_id text,
  event_type text not null,
  payload jsonb,
  processing_status text not null default 'processing'
    check (processing_status in ('processing', 'processed', 'failed')),
  processed boolean not null default false,
  processing_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists subscription_events_event_key_key
  on public.subscription_events (event_key);
create index if not exists subscription_events_transaction_idx
  on public.subscription_events (transaction_id);
create index if not exists subscription_events_status_idx
  on public.subscription_events (processing_status);

alter table public.subscription_events enable row level security;
revoke all on table public.subscription_events from public, anon, authenticated;
grant all on table public.subscription_events to service_role;
grant usage, select on sequence public.subscription_events_id_seq to service_role;

create or replace function public.claim_subscription_event(
  p_event_key text,
  p_event_id text,
  p_event_type text,
  p_transaction_id text,
  p_recurrence_number integer,
  p_subscriber_email text,
  p_product_id text,
  p_offer_id text,
  p_payload jsonb
)
returns table(claimed boolean, event_key text, processing_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.subscription_events%rowtype;
begin
  insert into public.subscription_events (
    event_key, event_id, event_type, transaction_id, recurrence_number,
    subscriber_email, product_id, offer_id, payload
  ) values (
    p_event_key, p_event_id, p_event_type, p_transaction_id, p_recurrence_number,
    lower(p_subscriber_email), p_product_id, p_offer_id, p_payload
  )
  on conflict do nothing;

  if found then
    claimed := true;
    event_key := p_event_key;
    processing_status := 'processing';
    return next;
    return;
  end if;

  select * into existing
    from public.subscription_events events
   where events.event_key = p_event_key
   limit 1;

  if existing.id is null then
    raise exception 'subscription_event_conflict_without_row';
  end if;

  if existing.processing_status = 'processed'
     or (
       existing.processing_status = 'processing'
       and existing.updated_at > now() - interval '10 minutes'
     ) then
    claimed := false;
    event_key := existing.event_key;
    processing_status := existing.processing_status;
    return next;
    return;
  end if;

  update public.subscription_events
     set processing_status = 'processing',
         processed = false,
         processing_error = null,
         updated_at = now()
   where id = existing.id;

  claimed := true;
  event_key := existing.event_key;
  processing_status := 'processing';
  return next;
end;
$$;

create or replace function public.mark_subscription_event(
  p_event_key text,
  p_status text,
  p_error_message text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('processed', 'failed') then
    raise exception 'invalid_subscription_event_status';
  end if;

  update public.subscription_events
     set processing_status = p_status,
         processed = p_status = 'processed',
         processing_error = case when p_status = 'failed' then left(p_error_message, 240) else null end,
         processed_at = case when p_status = 'processed' then now() else null end,
         updated_at = now()
   where event_key = p_event_key;
  return found;
end;
$$;

revoke all on function public.claim_subscription_event(text, text, text, text, integer, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.mark_subscription_event(text, text, text) from public, anon, authenticated;
grant execute on function public.claim_subscription_event(text, text, text, text, integer, text, text, text, jsonb) to service_role;
grant execute on function public.mark_subscription_event(text, text, text) to service_role;

alter table public.hotmart_purchases
  add column if not exists offer_id text,
  add column if not exists plan_id text,
  add column if not exists subscriber_code text,
  add column if not exists plan text,
  add column if not exists recurrence_number integer,
  add column if not exists current_period_end timestamptz,
  add column if not exists event_id text;

update public.hotmart_purchases set plan = lower(plan)
 where lower(plan) in ('plus', 'pro');
update public.hotmart_purchases set plan = null
 where plan is not null and plan not in ('plus', 'pro');

alter table public.hotmart_purchases drop constraint if exists hotmart_purchases_plan_check;
alter table public.hotmart_purchases add constraint hotmart_purchases_plan_check
  check (plan is null or plan in ('plus', 'pro'));

create index if not exists hotmart_purchases_subscriber_code_idx
  on public.hotmart_purchases (subscriber_code);
create index if not exists hotmart_purchases_offer_id_idx
  on public.hotmart_purchases (offer_id);
create index if not exists hotmart_purchases_plan_id_idx
  on public.hotmart_purchases (plan_id);

alter table public.hotmart_purchases enable row level security;
revoke all on table public.hotmart_purchases from anon, authenticated;
grant select on table public.hotmart_purchases to authenticated;

drop policy if exists "Users can read own purchase access" on public.hotmart_purchases;
create policy "Users can read own purchase access"
  on public.hotmart_purchases for select to authenticated
  using (
    user_id = auth.uid()
    or lower(email) = lower(auth.jwt() ->> 'email')
  );

-- Preserva temporariamente o acesso antigo até a classificação humana.
update public.profiles profiles
   set legacy_review_required = true,
       updated_at = now()
 where profiles.lifetime_access = false
   and profiles.subscription_provider is null
   and exists (
     select 1
       from public.hotmart_purchases purchases
      where purchases.access_active = true
        and lower(purchases.purchase_status) = 'approved'
        and purchases.plan is null
        and (
          purchases.user_id = profiles.id
          or lower(purchases.email) = lower(profiles.email)
        )
   );

drop function if exists public.complete_first_access();
create or replace function public.complete_first_access()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  update public.hotmart_purchases
     set must_change_password = false,
         updated_at = now()
   where user_id = auth.uid()
      or lower(email) = lower(auth.jwt() ->> 'email');

  perform public.ensure_current_profile();
  return true;
end;
$$;

revoke all on function public.complete_first_access() from public, anon, authenticated;
grant execute on function public.complete_first_access() to authenticated;

create or replace function public.expire_due_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.profiles
     set plan = coalesce(next_plan, 'free'),
         subscription_status = case
           when coalesce(next_plan, 'free') = 'free' then 'expired'
           else 'active'
         end,
         next_plan = null,
         pending_plan_effective_at = null,
         updated_at = now()
    where lifetime_access = false
      and legacy_review_required = false
      and subscription_current_period_end is not null
      and subscription_current_period_end <= now()
      and (
        next_plan is not null
        or subscription_status in ('active', 'past_due', 'canceled')
      );
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.expire_due_subscriptions() from public, anon, authenticated;
grant execute on function public.expire_due_subscriptions() to service_role;

create or replace view public.legacy_access_candidates
with (security_invoker = true)
as
select
  purchases.user_id,
  purchases.email,
  purchases.transaction_id,
  purchases.product_id,
  purchases.purchase_date,
  purchases.purchase_status
from public.hotmart_purchases purchases
where purchases.access_active = true
  and lower(purchases.purchase_status) = 'approved';

revoke all on public.legacy_access_candidates from public, anon, authenticated;
grant select on public.legacy_access_candidates to service_role;

commit;
