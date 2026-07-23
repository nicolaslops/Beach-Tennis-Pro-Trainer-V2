begin;

-- Compras novas não exigem convite nem troca de senha. Registros antigos
-- continuam preservados para não interromper usuários que já receberam convite.
alter table public.hotmart_purchases
  alter column must_change_password set default false;

update public.hotmart_purchases
   set must_change_password = false,
       updated_at = now()
 where access_model = 'one_time'
   and user_id is null;

create or replace function public.claim_current_user_purchases()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(nullif(trim(auth.jwt() ->> 'email'), ''));
  current_plan text;
  has_active_purchase boolean;
begin
  if current_user_id is null or current_email is null then
    raise exception 'authentication_required';
  end if;

  perform public.ensure_current_profile();

  -- Uma compra já ligada a outro usuário nunca é transferida pelo navegador.
  update public.hotmart_purchases purchases
     set user_id = current_user_id,
         must_change_password = false,
         updated_at = now()
    from public.profiles profiles
   where profiles.id = current_user_id
     and purchases.access_model = 'one_time'
     and lower(purchases.email) = current_email
     and (purchases.user_id is null or purchases.user_id = current_user_id)
     and purchases.purchase_date is not null
     and profiles.created_at <= purchases.purchase_date;

  select exists (
    select 1
      from public.hotmart_purchases purchases
     where purchases.user_id = current_user_id
       and purchases.access_model = 'one_time'
       and purchases.access_active = true
       and lower(purchases.purchase_status) = 'approved'
       and purchases.plan in ('plus', 'pro')
  )
  into has_active_purchase;

  if has_active_purchase then
    return public.recompute_one_time_access(current_user_id, 'inactive');
  end if;

  select coalesce(profiles.plan, 'free')
    into current_plan
    from public.profiles profiles
   where profiles.id = current_user_id;

  return coalesce(current_plan, 'free');
end;
$$;

revoke all on function public.claim_current_user_purchases() from public, anon, authenticated;
grant execute on function public.claim_current_user_purchases() to authenticated;

commit;
