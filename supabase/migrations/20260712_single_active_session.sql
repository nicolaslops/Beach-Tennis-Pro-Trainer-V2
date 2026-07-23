create schema if not exists private;

create table if not exists private.active_user_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null,
  updated_at timestamptz not null default now()
);

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

revoke all on table private.active_user_sessions from public;
revoke all on table private.active_user_sessions from anon;
revoke all on table private.active_user_sessions from authenticated;

create or replace function public.register_current_session()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  current_session_text text;
  current_session_id uuid;
begin
  current_user_id := auth.uid();
  current_session_text := nullif(auth.jwt() ->> 'session_id', '');

  if current_user_id is null or current_session_text is null then
    return false;
  end if;

  begin
    current_session_id := current_session_text::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  insert into private.active_user_sessions (user_id, session_id, updated_at)
  values (current_user_id, current_session_id, now())
  on conflict (user_id) do update
    set session_id = excluded.session_id,
        updated_at = now();

  return true;
end;
$$;

create or replace function public.is_current_session()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  current_session_text text;
  current_session_id uuid;
begin
  current_user_id := auth.uid();
  current_session_text := nullif(auth.jwt() ->> 'session_id', '');

  if current_user_id is null or current_session_text is null then
    return false;
  end if;

  begin
    current_session_id := current_session_text::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  return exists (
    select 1
      from private.active_user_sessions active
     where active.user_id = current_user_id
       and active.session_id = current_session_id
  );
end;
$$;

create or replace function public.end_current_session()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  current_session_text text;
  current_session_id uuid;
  deleted_rows integer;
begin
  current_user_id := auth.uid();
  current_session_text := nullif(auth.jwt() ->> 'session_id', '');

  if current_user_id is null or current_session_text is null then
    return false;
  end if;

  begin
    current_session_id := current_session_text::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  delete from private.active_user_sessions
   where user_id = current_user_id
     and session_id = current_session_id;

  get diagnostics deleted_rows = row_count;

  return deleted_rows > 0;
end;
$$;

revoke all on function public.register_current_session() from public;
revoke all on function public.register_current_session() from anon;
revoke all on function public.register_current_session() from authenticated;
grant execute on function public.register_current_session() to authenticated;

revoke all on function public.is_current_session() from public;
revoke all on function public.is_current_session() from anon;
revoke all on function public.is_current_session() from authenticated;
grant execute on function public.is_current_session() to authenticated;

revoke all on function public.end_current_session() from public;
revoke all on function public.end_current_session() from anon;
revoke all on function public.end_current_session() from authenticated;
grant execute on function public.end_current_session() to authenticated;
