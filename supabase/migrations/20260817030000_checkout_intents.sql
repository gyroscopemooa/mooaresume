begin;

create type public.checkout_intent_status as enum ('OPEN', 'SUCCEEDED', 'EXPIRED');

create table public.checkout_intents (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null unique references public.analysis_runs(id) on delete cascade,
  application_case_id uuid not null references public.application_cases(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider = 'POLAR'),
  provider_checkout_id text not null unique,
  checkout_url text not null check (char_length(checkout_url) between 1 and 2083),
  status public.checkout_intent_status not null default 'OPEN',
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index checkout_intents_owner_idx on public.checkout_intents(owner_user_id, created_at desc);
create trigger checkout_intents_updated_at before update on public.checkout_intents
for each row execute function public.set_updated_at();

alter table public.checkout_intents enable row level security;
create policy "checkout intent owner read" on public.checkout_intents for select to authenticated
  using ((select auth.uid()) = owner_user_id);

create or replace function public.prepare_quick_checkout(p_analysis_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_run public.analysis_runs%rowtype;
  total_characters integer;
  open_checkout jsonb;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select * into target_run from public.analysis_runs
  where id = p_analysis_run_id and owner_user_id = current_user_id;

  if target_run.id is null then
    raise exception 'ANALYSIS_RUN_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target_run.product <> 'QUICK' or target_run.status <> 'PENDING' then
    raise exception 'CHECKOUT_NOT_ALLOWED' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.analysis_entitlements ae
    where ae.application_case_id = target_run.application_case_id
      and ae.owner_user_id = current_user_id
      and ae.product = 'QUICK' and ae.status = 'ACTIVE'
  ) then
    raise exception 'ACTIVE_ENTITLEMENT_EXISTS' using errcode = '55000';
  end if;

  update public.checkout_intents
  set status = 'EXPIRED'
  where analysis_run_id = target_run.id and status = 'OPEN'
    and expires_at <= timezone('utc', now());

  select jsonb_build_object(
    'checkoutId', ci.provider_checkout_id,
    'checkoutUrl', ci.checkout_url,
    'expiresAt', ci.expires_at
  ) into open_checkout
  from public.checkout_intents ci
  where ci.analysis_run_id = target_run.id and ci.status = 'OPEN'
    and ci.expires_at > timezone('utc', now());

  select coalesce(sum(v.character_count), 0)::integer into total_characters
  from public.submission_snapshot_items si
  join public.document_versions v on v.id = si.document_version_id
  where si.snapshot_id = target_run.submission_snapshot_id and si.purpose = 'PRIMARY';

  if total_characters <= 0 then
    raise exception 'PRIMARY_DOCUMENT_REQUIRED' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'analysisRunId', target_run.id,
    'applicationCaseId', target_run.application_case_id,
    'totalCharacters', total_characters,
    'openCheckout', open_checkout
  );
end;
$$;

create function public.register_quick_checkout(
  p_analysis_run_id uuid,
  p_provider_checkout_id text,
  p_checkout_url text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_run public.analysis_runs%rowtype;
  intent public.checkout_intents%rowtype;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select * into target_run from public.analysis_runs
  where id = p_analysis_run_id and owner_user_id = current_user_id
  for update;

  if target_run.id is null then
    raise exception 'ANALYSIS_RUN_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target_run.product <> 'QUICK' or target_run.status <> 'PENDING' then
    raise exception 'CHECKOUT_NOT_ALLOWED' using errcode = '55000';
  end if;

  insert into public.checkout_intents (
    analysis_run_id, application_case_id, owner_user_id, provider,
    provider_checkout_id, checkout_url, expires_at
  ) values (
    target_run.id, target_run.application_case_id, current_user_id, 'POLAR',
    p_provider_checkout_id, p_checkout_url, p_expires_at
  ) on conflict (analysis_run_id) do update
    set provider_checkout_id = case
          when checkout_intents.status = 'OPEN' and checkout_intents.expires_at > timezone('utc', now())
          then checkout_intents.provider_checkout_id else excluded.provider_checkout_id end,
        checkout_url = case
          when checkout_intents.status = 'OPEN' and checkout_intents.expires_at > timezone('utc', now())
          then checkout_intents.checkout_url else excluded.checkout_url end,
        expires_at = case
          when checkout_intents.status = 'OPEN' and checkout_intents.expires_at > timezone('utc', now())
          then checkout_intents.expires_at else excluded.expires_at end,
        status = 'OPEN'
  returning * into intent;

  return jsonb_build_object(
    'checkoutId', intent.provider_checkout_id,
    'checkoutUrl', intent.checkout_url,
    'expiresAt', intent.expires_at
  );
end;
$$;

revoke all on function public.register_quick_checkout(uuid, text, text, timestamptz) from public;
grant execute on function public.register_quick_checkout(uuid, text, text, timestamptz) to authenticated;
create function public.mark_polar_checkout_succeeded(p_provider_checkout_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.checkout_intents
  set status = 'SUCCEEDED'
  where provider = 'POLAR'
    and provider_checkout_id = p_provider_checkout_id
    and status = 'OPEN';
end;
$$;

revoke all on function public.mark_polar_checkout_succeeded(text) from public;
grant execute on function public.mark_polar_checkout_succeeded(text) to service_role;


commit;
