-- Additive telemetry only. No payment, balance, reward, or application mutation.
begin;
-- Explicit binding is required because existing financial tables have no environment.
-- Leave empty until an operator has verified this is a dedicated environment DB.
create table public.analytics_deployment (
  singleton boolean primary key default true check(singleton),
  environment text not null check(environment in ('development','staging','production'))
);
create table public.analytics_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_internal boolean not null default false, is_test boolean not null default false
);
create table public.analytics_events (
  event_id uuid primary key, event_name text not null,
  occurred_at timestamptz not null, received_at timestamptz not null default now(),
  anonymous_id uuid not null, session_id uuid not null,
  user_id uuid references auth.users(id) on delete cascade,
  auth_attempt_id uuid, billing_attempt_id uuid, analysis_run_id uuid,
  client_platform text not null check(client_platform in ('web','android')),
  surface text not null check(surface in ('browser','app_webview','native')),
  environment text not null check(environment in ('development','staging','production')),
  event_source text not null default 'client' check(event_source = 'client'),
  evidence_type text not null default 'client_observed' check(evidence_type = 'client_observed'),
  is_internal boolean not null, is_test boolean not null,
  properties jsonb not null default '{}' check(jsonb_typeof(properties) = 'object')
);
create index analytics_events_scope on public.analytics_events(environment, occurred_at, event_id);
create index analytics_events_received on public.analytics_events(environment, received_at);
create table public.analytics_identity_links (
  environment text not null, anonymous_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now(), primary key(environment, anonymous_id)
);
create table public.analytics_presence (
  environment text not null, user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check(platform in ('web','android')),
  last_seen_at timestamptz not null default now(), primary key(environment,user_id,platform)
);
create table public.analytics_assignments (
  environment text not null, user_id uuid not null references auth.users(id) on delete cascade,
  experiment_key text not null check(experiment_key = 'analytics_onboarding_v1'),
  variant text not null check(variant in ('control','treatment')),
  assigned_at timestamptz not null default now(), primary key(environment,user_id,experiment_key)
);

create function public.analytics_ingest(p_events jsonb, p_user_id uuid, p_environment text)
returns integer language plpgsql security definer set search_path = '' as $$
declare e jsonb; inserted_id uuid; accepted integer := 0; internal_flag boolean; test_flag boolean;
begin
  if not exists(select 1 from public.analytics_deployment where environment=p_environment) then
    raise exception 'ANALYTICS_ENVIRONMENT_UNBOUND';
  end if;
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) not between 1 and 30 then
    raise exception 'INVALID_BATCH';
  end if;
  -- Bound unauthenticated storage abuse. Transaction-scoped serialization makes
  -- the deployment-wide cap exact even with concurrent anonymous identities.
  perform pg_advisory_xact_lock(hashtext('mooa-analytics-ingest'),hashtext(p_environment));
  if (select count(*) from public.analytics_events where environment=p_environment and received_at>=now()-interval '1 minute')
    + jsonb_array_length(p_events)>6000 then raise exception 'ANALYTICS_RATE_LIMIT'; end if;
  select is_internal,is_test into internal_flag,test_flag from public.analytics_accounts where user_id=p_user_id;
  for e in select value from jsonb_array_elements(p_events) loop
    -- Defense in depth: privileged RPC still cannot elevate public observations.
    if e->>'environment' is distinct from p_environment or e->>'schemaVersion' is distinct from '1'
      or e->>'eventName' not in ('page_viewed','login_succeeded','editor_entered','analysis_entered',
        'pricing_viewed','checkout_started','referral_share_completed','review_submitted',
        'experiment_exposed','analysis_failed','checkout_failed')
      or e ? 'evidenceType' or e ? 'eventSource' or e ? 'userId'
      or (e->>'occurredAt')::timestamptz not between now()-interval '7 days' and now()+interval '5 minutes'
      or jsonb_typeof(e->'properties') <> 'object' then raise exception 'INVALID_EVENT'; end if;
    if exists(select 1 from jsonb_each_text(e->'properties') p where not (
      (p.key='route' and p.value in ('home','editor','analysis','result','pricing','account','other')) or
      (p.key='product' and p.value in ('QUICK','PRO','FINAL')) or
      (p.key='source' and p.value in ('direct','search','social','referral','other')) or
      (p.key='outcome' and p.value in ('success','failed','canceled','pending')) or
      (p.key='experimentKey' and p.value='analytics_onboarding_v1') or
      (p.key='variant' and p.value in ('control','treatment'))
    )) then raise exception 'INVALID_PROPERTIES'; end if;
    insert into public.analytics_events(event_id,event_name,occurred_at,anonymous_id,session_id,user_id,
      auth_attempt_id,billing_attempt_id,analysis_run_id,client_platform,surface,environment,is_internal,is_test,properties)
    values ((e->>'eventId')::uuid,e->>'eventName',(e->>'occurredAt')::timestamptz,(e->>'anonymousId')::uuid,
      (e->>'sessionId')::uuid,p_user_id,(e->>'authAttemptId')::uuid,(e->>'billingAttemptId')::uuid,
      (e->>'analysisRunId')::uuid,e->>'clientPlatform',e->>'surface',p_environment,
      coalesce(internal_flag,false),coalesce(test_flag,false),e->'properties')
    on conflict(event_id) do nothing returning event_id into inserted_id;
    if inserted_id is not null then
      accepted := accepted+1;
      -- Link only after a successful insert. A replay cannot reassign an actor.
      if p_user_id is not null then
        insert into public.analytics_identity_links(environment,anonymous_id,user_id)
        values(p_environment,(e->>'anonymousId')::uuid,p_user_id) on conflict do nothing;
      end if;
    end if;
  end loop;
  return accepted;
end $$;

create function public.analytics_touch(p_environment text,p_user_id uuid,p_platform text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.analytics_deployment where environment=p_environment) then raise exception 'ANALYTICS_ENVIRONMENT_UNBOUND'; end if;
  insert into public.analytics_presence(environment,user_id,platform) values(p_environment,p_user_id,p_platform)
  on conflict(environment,user_id,platform) do update set last_seen_at=greatest(public.analytics_presence.last_seen_at,excluded.last_seen_at);
end $$;

create function public.analytics_assign(p_environment text,p_user_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare result text;
begin
  if not exists(select 1 from public.analytics_deployment where environment=p_environment) then raise exception 'ANALYTICS_ENVIRONMENT_UNBOUND'; end if;
  insert into public.analytics_assignments(environment,user_id,experiment_key,variant)
  values(p_environment,p_user_id,'analytics_onboarding_v1',case when ascii(substr(md5(p_user_id::text||':analytics_onboarding_v1'),1,1)) % 2=0 then 'control' else 'treatment' end)
  on conflict do nothing;
  select variant into result from public.analytics_assignments where environment=p_environment and user_id=p_user_id and experiment_key='analytics_onboarding_v1';
  return result;
end $$;

-- One statement gives consistent source data, without REST's 1000-row truncation.
-- Explicit projections exclude emails, tokens, URLs, documents, AI output and metadata.
create function public.analytics_snapshot(p_environment text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.analytics_deployment where environment=p_environment) then raise exception 'ANALYTICS_ENVIRONMENT_UNBOUND'; end if;
  return jsonb_build_object(
    'events',coalesce((select jsonb_agg(to_jsonb(e)) from public.analytics_events e where e.environment=p_environment),'[]'::jsonb),
    'links',coalesce((select jsonb_agg(to_jsonb(l)) from public.analytics_identity_links l where l.environment=p_environment),'[]'::jsonb),
    'accounts',coalesce((select jsonb_agg(to_jsonb(a)) from public.analytics_accounts a),'[]'::jsonb),
    'members',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'created_at',u.created_at,'last_sign_in_at',u.last_sign_in_at)) from auth.users u),'[]'::jsonb),
    'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'owner_user_id',o.owner_user_id,'provider',o.provider,
      'product',o.product,'amount',o.amount,'currency',o.currency,'status',o.status,'paid_at',o.paid_at,
      'refunded_at',o.refunded_at,'updated_at',o.updated_at)) from public.billing_orders o),'[]'::jsonb)
      || coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'owner_user_id',o.owner_user_id,'provider',o.provider,
        'product','INTERVIEW_RETRY','amount',o.amount,'currency',o.currency,'status',o.status,'paid_at',o.paid_at,
        'refunded_at',null,'updated_at',o.created_at)) from public.interview_retry_orders o),'[]'::jsonb),
    'entitlements',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'billing_order_id',e.billing_order_id,
      'owner_user_id',e.owner_user_id,'product',e.product,'status',e.status,'created_at',e.created_at,'test_grant_id',e.test_grant_id,
      'consumed_at',e.consumed_at,'revoked_at',e.revoked_at)) from public.analysis_entitlements e),'[]'::jsonb),
    'rewards',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'owner_user_id',r.owner_user_id,'product',r.product,
      'status',r.status,'billing_order_id',r.billing_order_id,'created_at',r.created_at,'consumed_at',r.consumed_at,'expires_at',r.expires_at)) from public.reward_credits r where r.owner_user_id is not null),'[]'::jsonb),
    'runs',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'owner_user_id',r.owner_user_id,'product',r.product,
      'status',r.status,'created_at',r.created_at,'completed_at',r.completed_at,
      'is_test',exists(select 1 from public.analysis_entitlements e where e.consumed_by_analysis_run_id=r.id and e.test_grant_id is not null),
      'saved_at',(select a.created_at from public.analysis_results a where a.analysis_run_id=r.id))) from public.analysis_runs r),'[]'::jsonb),
    'presence',coalesce((select jsonb_agg(to_jsonb(p)) from public.analytics_presence p where p.environment=p_environment),'[]'::jsonb),
    'assignments',coalesce((select jsonb_agg(to_jsonb(a)) from public.analytics_assignments a where a.environment=p_environment),'[]'::jsonb),
    'interviews',coalesce((select jsonb_agg(jsonb_build_object('owner_user_id',i.owner_user_id,'analysis_run_id',i.analysis_run_id,
      'paid_extra_sessions',i.paid_extra_sessions,'restart_free_used',i.restart_free_used,'weak_retry_free_used',i.weak_retry_free_used,'updated_at',i.updated_at)) from public.interview_entitlements i),'[]'::jsonb),
    'checkouts',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'owner_user_id',c.owner_user_id,'created_at',c.created_at,'status',c.status)) from public.checkout_intents c),'[]'::jsonb)
  );
end $$;

alter table public.analytics_deployment enable row level security;
alter table public.analytics_accounts enable row level security;
alter table public.analytics_events enable row level security;
alter table public.analytics_identity_links enable row level security;
alter table public.analytics_presence enable row level security;
alter table public.analytics_assignments enable row level security;
revoke all on public.analytics_deployment,public.analytics_accounts,public.analytics_events,public.analytics_identity_links,public.analytics_presence,public.analytics_assignments from public,anon,authenticated;
grant all on public.analytics_deployment,public.analytics_accounts,public.analytics_events,public.analytics_identity_links,public.analytics_presence,public.analytics_assignments to service_role;
revoke all on function public.analytics_ingest(jsonb,uuid,text),public.analytics_touch(text,uuid,text),public.analytics_assign(text,uuid),public.analytics_snapshot(text) from public,anon,authenticated;
grant execute on function public.analytics_ingest(jsonb,uuid,text),public.analytics_touch(text,uuid,text),public.analytics_assign(text,uuid),public.analytics_snapshot(text) to service_role;
commit;
