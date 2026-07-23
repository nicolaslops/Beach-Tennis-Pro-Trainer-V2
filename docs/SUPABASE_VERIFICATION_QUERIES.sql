-- Consultas somente de leitura para auditoria da V120.
-- Nao use este arquivo como migration.

-- 1. Tabelas esperadas.
select table_schema, table_name
from information_schema.tables
where (table_schema = 'public' and table_name in (
  'profiles', 'user_app_data', 'subscription_events', 'hotmart_purchases'
)) or (table_schema = 'private' and table_name = 'active_user_sessions')
order by table_schema, table_name;

-- 2. RLS nas tabelas publicas.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'user_app_data', 'subscription_events', 'hotmart_purchases')
order by tablename;

-- 3. Policies para revisao.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'user_app_data', 'subscription_events', 'hotmart_purchases')
order by tablename, policyname;

-- 4. Constraints de plano, tipo de acesso e compra.
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.profiles'::regclass, 'public.hotmart_purchases'::regclass)
  and contype = 'c'
order by conrelid::regclass::text, conname;

-- 5. Funcoes esperadas.
select n.nspname as schema_name, p.proname, pg_get_function_result(p.oid) as return_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'ensure_current_profile', 'complete_first_access', 'register_current_session',
    'is_current_session', 'end_current_session', 'claim_subscription_event',
    'mark_subscription_event', 'recompute_one_time_access', 'expire_due_subscriptions'
  )
order by p.proname;

-- 6. Distribuicao atual sem expor dados pessoais.
select plan, access_type, permanent_plan, count(*) as users
from public.profiles
group by plan, access_type, permanent_plan
order by plan, access_type, permanent_plan;

-- 7. Compras unicas por plano e status.
select plan, purchase_status, access_active, count(*) as purchases
from public.hotmart_purchases
where access_model = 'one_time'
group by plan, purchase_status, access_active
order by plan, purchase_status, access_active;

-- 8. Ultimos eventos para auditoria operacional.
select event_type, transaction_id, product_id, offer_id,
       processing_status, processing_error, created_at, processed_at
from public.subscription_events
order by created_at desc
limit 100;

-- 9. Perfis inconsistentes: deve retornar zero linhas.
select id, email, plan, access_type, permanent_plan
from public.profiles
where (access_type = 'one_time' and (permanent_plan is null or plan <> permanent_plan))
   or (access_type = 'free' and permanent_plan is not null);

-- 10. Transacoes duplicadas: deve retornar zero linhas.
select transaction_id, count(*)
from public.hotmart_purchases
where transaction_id is not null
group by transaction_id
having count(*) > 1;
