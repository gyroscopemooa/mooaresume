begin;
-- Dedicated MOOA DB only. No runtime-config app key or caller-selected service.
create table public.mooa_analytics_config (
  service_id text primary key check(service_id = 'mooaresume'),
  environment text not null check(environment in ('development','staging','production')),
  enabled boolean not null default false
);
insert into public.mooa_analytics_config values ('mooaresume','development',false);
create table public.mooa_analytics_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null,
  internal boolean not null default false
);
create table public.mooa_analytics_identities (
  anonymous_id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  environment text not null,
  blocked boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.mooa_analytics_events (
  event_id text primary key,
  service_id text not null default 'mooaresume' check(service_id='mooaresume'),
  environment text not null check(environment in ('development','staging','production')),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_id uuid,
  session_id uuid,
  event_name text not null check(event_name in ('session_started','page_viewed','signed_in','app_foregrounded','app_backgrounded','result_viewed','export_completed','checkout_clicked','account_created','case_saved','core_completed','order_paid','order_refunded','referral_converted')),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  platform text not null check(platform in ('web','android','ios','unknown')),
  evidence text not null check(evidence in ('client_observed','server_verified')),
  properties jsonb not null default '{}'
);
create index mooa_analytics_period on public.mooa_analytics_events(environment,occurred_at,event_id);
create index mooa_analytics_member on public.mooa_analytics_events(user_id,occurred_at);
create index mooa_analytics_anonymous on public.mooa_analytics_events(anonymous_id);
create table public.mooa_analytics_limits (
  subject text primary key, window_start timestamptz not null, requests integer not null
);
-- Atomic cross-worker limiter, keyed by server HMAC of network/user identity.
create function public.mooa_analytics_limit(p_subject text) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  insert into public.mooa_analytics_limits values(p_subject,date_trunc('minute',now()),1)
  on conflict(subject) do update set
    requests=case when mooa_analytics_limits.window_start=date_trunc('minute',now()) then mooa_analytics_limits.requests+1 else 1 end,
    window_start=date_trunc('minute',now()) returning requests into n;
  return n<=60;
end $$;

create function public.mooa_analytics_collect(p_environment text,p_user_id uuid,p_events jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare e jsonb; aid uuid; linked uuid; blocked boolean; n integer:=0; added integer; signup timestamptz;
begin
  if not exists(select 1 from public.mooa_analytics_config where environment=p_environment and enabled) then
    raise exception 'ANALYTICS_DISABLED';
  end if;
  if jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events) not between 1 and 30 then raise exception 'INVALID_BATCH'; end if;
  aid:=(p_events->0->>'anonymousId')::uuid;
  insert into public.mooa_analytics_identities(anonymous_id,environment) values(aid,p_environment) on conflict do nothing;
  select i.user_id,i.blocked into linked,blocked from public.mooa_analytics_identities i where anonymous_id=aid and environment=p_environment for update;
  if not found or blocked or (linked is not null and linked is distinct from p_user_id) then raise exception 'IDENTITY_CONFLICT'; end if;
  if p_user_id is not null then
    if exists(select 1 from public.mooa_analytics_preferences where user_id=p_user_id and not enabled) then return 0; end if;
    insert into public.mooa_analytics_preferences(user_id,enabled) values(p_user_id,true) on conflict do nothing;
    update public.mooa_analytics_identities set user_id=p_user_id,updated_at=now() where anonymous_id=aid;
    update public.mooa_analytics_events set user_id=p_user_id where anonymous_id=aid and user_id is null and environment=p_environment;
    select created_at into signup from auth.users where id=p_user_id;
    if signup>=now()-interval '90 days' then
      insert into public.mooa_analytics_events(event_id,environment,user_id,event_name,occurred_at,platform,evidence)
      values('signup:'||p_user_id,p_environment,p_user_id,'account_created',signup,p_events->0->>'platform','server_verified') on conflict do nothing;
    end if;
  end if;
  for e in select value from jsonb_array_elements(p_events) loop
    if (e->>'anonymousId')::uuid<>aid or e->>'eventName' not in ('session_started','page_viewed','signed_in','app_foregrounded','app_backgrounded','result_viewed','export_completed','checkout_clicked')
      or (e->>'occurredAt')::timestamptz<now()-interval '7 days' or (e->>'occurredAt')::timestamptz>now()+interval '5 minutes'
      then raise exception 'INVALID_EVENT'; end if;
    insert into public.mooa_analytics_events(event_id,environment,user_id,anonymous_id,session_id,event_name,occurred_at,platform,evidence,properties)
    values((e->>'eventId')::uuid::text,p_environment,p_user_id,aid,(e->>'sessionId')::uuid,e->>'eventName',(e->>'occurredAt')::timestamptz,e->>'platform','client_observed',coalesce(e->'properties','{}')) on conflict do nothing;
    get diagnostics added=row_count; n:=n+added;
  end loop;
  return n;
end $$;

-- Additive observation triggers: no AI/billing function rewrites, no document text.
create function public.mooa_analytics_observe() returns trigger
language plpgsql security definer set search_path='' as $$
declare rowdata jsonb:=to_jsonb(new); uid uuid; env text; name text; moment timestamptz:=now(); object_id text; plat text:='unknown'; test_event boolean:=false;
begin
  select environment into env from public.mooa_analytics_config where enabled;
  if env is null then return new; end if;
  uid:=coalesce(rowdata->>'owner_user_id',rowdata->>'referred_user_id')::uuid;
  if not exists(select 1 from public.mooa_analytics_preferences where user_id=uid and enabled and not internal) then return new; end if;
  object_id:=coalesce(rowdata->>'id',rowdata->>'referred_user_id');
  if tg_table_name='analysis_runs' then
    if tg_op='INSERT' then name:='case_saved';
    elsif rowdata->>'status'='COMPLETED' and to_jsonb(old)->>'status'<>'COMPLETED' then name:='core_completed';
    end if;
  elsif tg_table_name='billing_orders' then
    if rowdata->>'status'='PAID' and (tg_op='INSERT' or to_jsonb(old)->>'status'<>'PAID') then name:='order_paid'; moment:=(rowdata->>'paid_at')::timestamptz;
    elsif rowdata->>'refunded_at' is not null then name:='order_refunded'; moment:=(rowdata->>'refunded_at')::timestamptz; end if;
  elsif tg_table_name='referral_attributions' then
    if rowdata->>'status'='CONVERTED' and rowdata->>'reward_credit_id' is not null then name:='referral_converted'; end if;
  elsif tg_op='UPDATE' and rowdata->>'status'='USED' and to_jsonb(old)->>'status'<>'USED' then name:='core_completed';
  end if;
  if name is null then return new; end if;
  if tg_table_name='billing_orders' then test_event:=coalesce(rowdata->'metadata'->>'polarEnvironment'='sandbox',false);
  elsif tg_table_name='analysis_runs' and rowdata->>'application_case_id' is not null then
    select coalesce(bool_or(metadata->>'polarEnvironment'='sandbox'),false) into test_event from public.billing_orders where application_case_id=(rowdata->>'application_case_id')::uuid;
  end if;
  -- Recent observed platform is a correlation, never payment proof. Unknown stays visible.
  select platform into plat from public.mooa_analytics_events where user_id=uid and environment=env and evidence='client_observed' and received_at>now()-interval '30 minutes' order by received_at desc limit 1;
  insert into public.mooa_analytics_events(event_id,environment,user_id,event_name,occurred_at,platform,evidence,properties)
  values(tg_table_name||':'||object_id||':'||name,env,uid,name,moment,coalesce(plat,'unknown'),'server_verified',jsonb_build_object('kind',tg_table_name,'objectId',object_id,'isTest',test_event)) on conflict do nothing;
  return new;
end $$;
create trigger mooa_analytics_run after insert or update of status on public.analysis_runs for each row execute function public.mooa_analytics_observe();
create trigger mooa_analytics_order after insert or update of status,refunded_at on public.billing_orders for each row execute function public.mooa_analytics_observe();
create trigger mooa_analytics_referral after insert or update of status on public.referral_attributions for each row execute function public.mooa_analytics_observe();
create trigger mooa_analytics_resume after insert or update of status on public.resume_builds for each row execute function public.mooa_analytics_observe();
create trigger mooa_analytics_career_document after insert or update of status on public.career_description_builds for each row execute function public.mooa_analytics_observe();
create trigger mooa_analytics_portfolio after insert or update of status on public.portfolio_builds for each row execute function public.mooa_analytics_observe();
create trigger mooa_analytics_career_ai after insert or update of status on public.career_ai_builds for each row execute function public.mooa_analytics_observe();

create function public.mooa_analytics_preference(p_user_id uuid,p_anonymous_id uuid,p_enabled boolean,p_environment text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_user_id is not null then
    insert into public.mooa_analytics_preferences(user_id,enabled) values(p_user_id,p_enabled) on conflict(user_id) do update set enabled=excluded.enabled;
  end if;
  if not p_enabled then
    -- Never delete another member's history using a submitted anonymous ID.
    delete from public.mooa_analytics_events where user_id=p_user_id or (anonymous_id=p_anonymous_id and user_id is null and environment=p_environment);
    update public.mooa_analytics_identities set blocked=true where user_id=p_user_id or (anonymous_id=p_anonymous_id and user_id is null and environment=p_environment);
  end if;
end $$;

-- Three-month behavioural history; monthly cohort claims must disclose this window.
create function public.mooa_analytics_prune() returns void
language plpgsql security definer set search_path='' as $$
begin
  delete from public.mooa_analytics_events where occurred_at<now()-interval '90 days';
  delete from public.mooa_analytics_identities where updated_at<now()-interval '90 days';
  delete from public.mooa_analytics_limits where window_start<now()-interval '1 day';
end $$;

-- Reuse existing pg_cron only (no extension installation / external service).
do $$ begin
  if exists(select 1 from pg_namespace where nspname='cron') then
    execute $job$select cron.schedule('mooa-analytics-retention','0 * * * *','select public.mooa_analytics_prune()')$job$;
  end if;
end $$;

alter table public.mooa_analytics_config enable row level security;
alter table public.mooa_analytics_preferences enable row level security;
alter table public.mooa_analytics_identities enable row level security;
alter table public.mooa_analytics_events enable row level security;
alter table public.mooa_analytics_limits enable row level security;
revoke all on public.mooa_analytics_config,public.mooa_analytics_preferences,public.mooa_analytics_identities,public.mooa_analytics_events,public.mooa_analytics_limits from public,anon,authenticated;
grant all on public.mooa_analytics_config,public.mooa_analytics_preferences,public.mooa_analytics_identities,public.mooa_analytics_events,public.mooa_analytics_limits to service_role;
revoke all on function public.mooa_analytics_collect(text,uuid,jsonb),public.mooa_analytics_limit(text),public.mooa_analytics_observe(),public.mooa_analytics_preference(uuid,uuid,boolean,text),public.mooa_analytics_prune() from public,anon,authenticated;
grant execute on function public.mooa_analytics_collect(text,uuid,jsonb),public.mooa_analytics_limit(text),public.mooa_analytics_preference(uuid,uuid,boolean,text),public.mooa_analytics_prune() to service_role;
commit;
