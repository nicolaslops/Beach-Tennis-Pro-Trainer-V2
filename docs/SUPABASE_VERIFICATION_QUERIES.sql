-- Consultas somente de verificacao para a V2.
-- Nao execute como migration. Nao altera dados, policies, usuarios ou tabelas.

-- 1. Confirma se hotmart_purchases esta em public.
select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'hotmart_purchases';

-- 2. Confirma se hotmart_webhook_events esta em private.
select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'private'
  and table_name = 'hotmart_webhook_events';

-- 3. Confirma se RLS esta ativo em public.hotmart_purchases.
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'hotmart_purchases';

-- 4. Lista policies da tabela para revisar leitura do proprio registro.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'hotmart_purchases'
order by policyname;

-- 5. Confirma se a funcao complete_first_access existe.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  pg_get_function_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'complete_first_access';

-- 6. Confirma permissoes da funcao por role.
select
  n.nspname as schema_name,
  p.proname as function_name,
  r.rolname as grantee,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'public'
  and p.proname = 'complete_first_access'
  and r.rolname in ('anon', 'authenticated')
order by r.rolname;

-- 7. Amostra estrutural dos campos esperados, sem exibir dados de clientes.
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'hotmart_purchases'
  and column_name in (
    'user_id',
    'email',
    'buyer_name',
    'transaction_id',
    'product_id',
    'purchase_status',
    'must_change_password',
    'access_active'
  )
order by column_name;
