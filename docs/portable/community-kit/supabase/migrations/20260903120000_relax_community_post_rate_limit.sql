begin;
create or replace function public.take_community_rate_limit(p_action text) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_limit integer; v_window_seconds integer; v_window_started_at timestamptz; v_count integer;
begin
  if v_user_id is null then return false; end if;
  case p_action
    when 'POST_CREATE' then v_limit := 20; v_window_seconds := 3600;
    when 'COMMENT_CREATE' then v_limit := 20; v_window_seconds := 3600;
    when 'REPORT_CREATE' then v_limit := 10; v_window_seconds := 86400;
    when 'UPLOAD' then v_limit := 12; v_window_seconds := 3600;
    when 'RECOMMEND' then v_limit := 60; v_window_seconds := 60;
    else return false;
  end case;
  v_window_started_at := to_timestamp(floor(extract(epoch from now()) / v_window_seconds) * v_window_seconds);
  insert into public.community_rate_limit_windows (user_id, action, window_started_at, count) values (v_user_id, p_action, v_window_started_at, 1)
  on conflict (user_id, action, window_started_at) do update set count = public.community_rate_limit_windows.count + 1 where public.community_rate_limit_windows.count < v_limit
  returning count into v_count;
  return found and v_count <= v_limit;
end;
$$;
revoke all on function public.take_community_rate_limit(text) from public;
grant execute on function public.take_community_rate_limit(text) to authenticated;
commit;