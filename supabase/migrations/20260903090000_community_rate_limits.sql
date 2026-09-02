begin;
create table public.community_rate_limit_windows (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_started_at timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, action, window_started_at)
);
alter table public.community_rate_limit_windows enable row level security;
create function public.take_community_rate_limit(p_action text, p_limit integer, p_window_seconds integer) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_window_started_at timestamptz; v_count integer;
begin
  if v_user_id is null or p_limit < 1 or p_window_seconds < 1 then return false; end if;
  v_window_started_at := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.community_rate_limit_windows (user_id, action, window_started_at, count) values (v_user_id, p_action, v_window_started_at, 1)
  on conflict (user_id, action, window_started_at) do update set count = public.community_rate_limit_windows.count + 1 where public.community_rate_limit_windows.count < p_limit
  returning count into v_count;
  return found and v_count <= p_limit;
end;
$$;
revoke all on function public.take_community_rate_limit(text, integer, integer) from public;
grant execute on function public.take_community_rate_limit(text, integer, integer) to authenticated;
commit;