begin;

alter table public.profiles
  add column if not exists access_type text not null default 'free',
  add column if not exists permanent_plan text,
  add column if not exists purchase_provider text,
  add column if not exists purchase_product_id text,
  add column if not exists purchase_offer_id text,
  add column if not exists purchase_transaction_id text,
  add column if not exists purchased_at timestamptz,
  add column if not exists legacy_subscription_plan text;

alter table public.profiles drop constraint if exists profiles_access_type_check;
alter table public.profiles add constraint profiles_access_type_check
  check (access_type in ('free', 'one_time', 'legacy_lifetime', 'legacy_subscription'));

alter table public.profiles drop constraint if exists profiles_permanent_plan_check;
alter table public.profiles add constraint profiles_permanent_plan_check
  check (permanent_plan is null or permanent_plan in ('plus', 'pro'));

alter table public.profiles drop constraint if exists profiles_legacy_subscription_plan_check;
alter table public.profiles add constraint profiles_legacy_subscription_plan_check
  check (legacy_subscription_plan is null or legacy_subscription_plan in ('plus', 'pro'));

-- Mantém os direitos anteriores sem convertê-los silenciosamente em uma compra nova.
update public.profiles
   set access_type = 'legacy_lifetime',
       permanent_plan = coalesce(legacy_plan, case when plan in ('plus', 'pro') then plan end, 'pro')
 where lifetime_access = true
   and access_type <> 'one_time';

update public.profiles
   set access_type = 'legacy_subscription',
       legacy_subscription_plan = plan
 where lifetime_access = false
   and legacy_review_required = false
   and plan in ('plus', 'pro')
   and subscription_current_period_end is not null
   and subscription_current_period_end > now();

create index if not exists profiles_access_type_idx on public.profiles (access_type);
create index if not exists profiles_permanent_plan_idx on public.profiles (permanent_plan);
create unique index if not exists profiles_purchase_transaction_key
  on public.profiles (purchase_transaction_id)
  where purchase_transaction_id is not null;

alter table public.hotmart_purchases
  add column if not exists access_model text,
  add column if not exists revoked_at timestamptz;

-- Registros anteriores continuam legados; os webhooks V119+ gravam one_time.
update public.hotmart_purchases
   set access_model = 'legacy'
 where access_model is null;

alter table public.hotmart_purchases
  alter column access_model set default 'one_time',
  alter column access_model set not null;

alter table public.hotmart_purchases drop constraint if exists hotmart_purchases_access_model_check;
alter table public.hotmart_purchases add constraint hotmart_purchases_access_model_check
  check (access_model in ('one_time', 'legacy'));

create index if not exists hotmart_purchases_entitlement_idx
  on public.hotmart_purchases (user_id, access_active, plan);

create or replace function public.recompute_one_time_access(
  p_user_id uuid,
  p_empty_status text default 'inactive'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  best_purchase public.hotmart_purchases%rowtype;
  resulting_plan text;
begin
  if p_user_id is null then
    raise exception 'user_id_required';
  end if;

  select * into current_profile
    from public.profiles
   where id = p_user_id
   for update;

  if current_profile.id is null then
    raise exception 'profile_not_found';
  end if;

  select purchases.* into best_purchase
    from public.hotmart_purchases purchases
   where purchases.user_id = p_user_id
     and purchases.access_model = 'one_time'
     and purchases.access_active = true
     and lower(purchases.purchase_status) = 'approved'
     and purchases.plan in ('plus', 'pro')
   order by
     case purchases.plan when 'pro' then 2 when 'plus' then 1 else 0 end desc,
     purchases.purchase_date desc nulls last,
     purchases.updated_at desc
   limit 1;

  if best_purchase.id is not null then
    resulting_plan := best_purchase.plan;
    update public.profiles
       set plan = resulting_plan,
           permanent_plan = resulting_plan,
           access_type = 'one_time',
           lifetime_access = true,
           subscription_status = 'active',
           purchase_provider = 'hotmart',
           purchase_product_id = best_purchase.product_id,
           purchase_offer_id = best_purchase.offer_id,
           purchase_transaction_id = best_purchase.transaction_id,
           purchased_at = best_purchase.purchase_date,
           next_plan = null,
           pending_plan_effective_at = null,
           access_active = true,
           updated_at = now()
     where id = p_user_id;
    return resulting_plan;
  end if;

  if current_profile.legacy_review_required = true then
    resulting_plan := 'pro';
    update public.profiles
       set plan = 'pro',
           permanent_plan = null,
           access_type = 'free',
           lifetime_access = false,
           subscription_status = 'active',
           purchase_provider = null,
           purchase_product_id = null,
           purchase_offer_id = null,
           purchase_transaction_id = null,
           purchased_at = null,
           updated_at = now()
     where id = p_user_id;
    return resulting_plan;
  end if;

  if coalesce(
       current_profile.legacy_plan,
       case when current_profile.access_type = 'legacy_lifetime' then current_profile.permanent_plan end
     ) in ('plus', 'pro') then
    resulting_plan := coalesce(current_profile.legacy_plan, current_profile.permanent_plan);
    update public.profiles
       set plan = resulting_plan,
           permanent_plan = resulting_plan,
           access_type = 'legacy_lifetime',
           lifetime_access = true,
           subscription_status = 'active',
           purchase_provider = null,
           purchase_product_id = null,
           purchase_offer_id = null,
           purchase_transaction_id = null,
           purchased_at = null,
           updated_at = now()
     where id = p_user_id;
    return resulting_plan;
  end if;

  if current_profile.legacy_subscription_plan in ('plus', 'pro')
     and current_profile.subscription_current_period_end is not null
     and current_profile.subscription_current_period_end > now() then
    resulting_plan := current_profile.legacy_subscription_plan;
    update public.profiles
       set plan = resulting_plan,
           permanent_plan = null,
           access_type = 'legacy_subscription',
           lifetime_access = false,
           subscription_status = 'active',
           purchase_provider = null,
           purchase_product_id = null,
           purchase_offer_id = null,
           purchase_transaction_id = null,
           purchased_at = null,
           updated_at = now()
     where id = p_user_id;
    return resulting_plan;
  end if;

  resulting_plan := 'free';
  update public.profiles
     set plan = 'free',
         permanent_plan = null,
         access_type = 'free',
         lifetime_access = false,
         subscription_status = case
           when p_empty_status in ('inactive', 'canceled', 'refunded', 'chargeback', 'expired')
             then p_empty_status
           else 'inactive'
         end,
         purchase_provider = null,
         purchase_product_id = null,
         purchase_offer_id = null,
         purchase_transaction_id = null,
         purchased_at = null,
         next_plan = null,
         pending_plan_effective_at = null,
         access_active = true,
         updated_at = now()
   where id = p_user_id;
  return resulting_plan;
end;
$$;

revoke all on function public.recompute_one_time_access(uuid, text) from public, anon, authenticated;
grant execute on function public.recompute_one_time_access(uuid, text) to service_role;

-- Somente assinaturas antigas ainda em período pago podem expirar.
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
     set plan = 'free',
         subscription_status = 'expired',
         access_type = 'free',
         legacy_subscription_plan = null,
         next_plan = null,
         pending_plan_effective_at = null,
         updated_at = now()
   where access_type = 'legacy_subscription'
     and lifetime_access = false
     and legacy_review_required = false
     and subscription_current_period_end is not null
     and subscription_current_period_end <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.expire_due_subscriptions() from public, anon, authenticated;
grant execute on function public.expire_due_subscriptions() to service_role;

create or replace view public.one_time_access_audit
with (security_invoker = true)
as
select
  profiles.id as user_id,
  profiles.email,
  profiles.plan,
  profiles.access_type,
  profiles.permanent_plan,
  profiles.purchase_product_id,
  profiles.purchase_offer_id,
  profiles.purchase_transaction_id,
  profiles.purchased_at,
  profiles.legacy_review_required,
  profiles.updated_at
from public.profiles profiles;

revoke all on public.one_time_access_audit from public, anon, authenticated;
grant select on public.one_time_access_audit to service_role;

commit;
