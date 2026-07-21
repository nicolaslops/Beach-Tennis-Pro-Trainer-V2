create extension if not exists pgcrypto;

create schema if not exists private;

alter table public.hotmart_purchases
  add column if not exists buyer_name text,
  add column if not exists transaction_id text,
  add column if not exists product_id text,
  add column if not exists purchase_date timestamptz;

update public.hotmart_purchases
   set transaction_id = hotmart_transaction_id
 where transaction_id is null
   and hotmart_transaction_id is not null;

create unique index if not exists hotmart_purchases_transaction_id_key
  on public.hotmart_purchases (transaction_id);

create index if not exists hotmart_purchases_product_id_idx
  on public.hotmart_purchases (product_id);

create table if not exists private.hotmart_webhook_events (
  event_id text primary key,
  event_type text not null,
  transaction_id text,
  product_id text,
  email text,
  payload_hash text,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists hotmart_webhook_events_transaction_event_key
  on private.hotmart_webhook_events (transaction_id, event_type)
  where transaction_id is not null;

create index if not exists hotmart_webhook_events_status_idx
  on private.hotmart_webhook_events (status);

revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;

create or replace function public.claim_hotmart_webhook_event(
  p_event_id text,
  p_event_type text,
  p_transaction_id text,
  p_product_id text,
  p_email text,
  p_payload_hash text
)
returns table(claimed boolean, event_id text, status text)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  existing_event private.hotmart_webhook_events%rowtype;
begin
  insert into private.hotmart_webhook_events (
    event_id,
    event_type,
    transaction_id,
    product_id,
    email,
    payload_hash,
    status,
    received_at,
    updated_at
  )
  values (
    p_event_id,
    p_event_type,
    p_transaction_id,
    p_product_id,
    p_email,
    p_payload_hash,
    'processing',
    now(),
    now()
  )
  on conflict do nothing;

  if found then
    claimed := true;
    event_id := p_event_id;
    status := 'processing';
    return next;
    return;
  end if;

  select *
    into existing_event
    from private.hotmart_webhook_events h
   where h.event_id = p_event_id
      or (
        p_transaction_id is not null
        and h.transaction_id = p_transaction_id
        and h.event_type = p_event_type
      )
   order by h.received_at desc
   limit 1;

  if existing_event.event_id is null then
    raise exception 'hotmart_event_conflict_without_row';
  end if;

  if existing_event.status in ('processed', 'processing') then
    claimed := false;
    event_id := existing_event.event_id;
    status := existing_event.status;
    return next;
    return;
  end if;

  update private.hotmart_webhook_events h
     set status = 'processing',
         error_message = null,
         updated_at = now()
   where h.event_id = existing_event.event_id;

  claimed := true;
  event_id := existing_event.event_id;
  status := 'processing';
  return next;
end;
$$;

create or replace function public.mark_hotmart_webhook_event(
  p_event_id text,
  p_status text,
  p_error_message text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_status not in ('processed', 'failed') then
    raise exception 'invalid_hotmart_event_status';
  end if;

  update private.hotmart_webhook_events
     set status = p_status,
         processed_at = case when p_status = 'processed' then now() else null end,
         error_message = left(p_error_message, 240),
         updated_at = now()
   where event_id = p_event_id;

  return found;
end;
$$;

create or replace function public.revoke_active_user_sessions(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_user_id is null then
    return false;
  end if;

  if to_regclass('private.active_user_sessions') is not null then
    delete from private.active_user_sessions
     where user_id = p_user_id;
  end if;

  return true;
end;
$$;

revoke all on function public.claim_hotmart_webhook_event(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.mark_hotmart_webhook_event(text, text, text) from public, anon, authenticated;
revoke all on function public.revoke_active_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.claim_hotmart_webhook_event(text, text, text, text, text, text) to service_role;
grant execute on function public.mark_hotmart_webhook_event(text, text, text) to service_role;
grant execute on function public.revoke_active_user_sessions(uuid) to service_role;

drop function if exists public.complete_first_access();

create or replace function public.complete_first_access()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
begin
  update public.hotmart_purchases
     set must_change_password = false,
         updated_at = now()
   where access_active = true
     and lower(purchase_status) = 'approved'
     and (
       user_id = auth.uid()
       or lower(email) = lower(auth.jwt() ->> 'email')
     );

  get diagnostics updated_rows = row_count;

  if updated_rows = 0 then
    raise exception 'purchase_access_not_found';
  end if;

  return true;
end;
$$;

revoke all on function public.complete_first_access() from public;
grant execute on function public.complete_first_access() to authenticated;
