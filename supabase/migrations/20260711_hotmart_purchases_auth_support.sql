create extension if not exists pgcrypto;

create table if not exists public.hotmart_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  access_active boolean not null default false,
  purchase_status text not null default 'pending',
  must_change_password boolean not null default true,
  hotmart_transaction_id text,
  product_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hotmart_purchases_user_id_idx
  on public.hotmart_purchases (user_id);

create index if not exists hotmart_purchases_email_idx
  on public.hotmart_purchases (lower(email));

alter table public.hotmart_purchases enable row level security;

drop policy if exists "Users can read own purchase access" on public.hotmart_purchases;
create policy "Users can read own purchase access"
  on public.hotmart_purchases
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or lower(email) = lower(auth.jwt() ->> 'email')
  );

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hotmart_purchases_touch_updated_at on public.hotmart_purchases;
create trigger hotmart_purchases_touch_updated_at
before update on public.hotmart_purchases
for each row execute function public.touch_updated_at();

create or replace function public.complete_first_access()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
begin
  update public.hotmart_purchases
     set must_change_password = false
   where access_active = true
     and (
       user_id = auth.uid()
       or lower(email) = lower(auth.jwt() ->> 'email')
     );

  get diagnostics updated_rows = row_count;

  if updated_rows = 0 then
    raise exception 'purchase_access_not_found';
  end if;
end;
$$;

revoke all on function public.complete_first_access() from public;
grant execute on function public.complete_first_access() to authenticated;
