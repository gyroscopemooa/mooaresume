begin;

create type public.billing_order_status as enum ('PAID', 'REFUNDED', 'REVIEW_REQUIRED');
create type public.entitlement_status as enum ('ACTIVE', 'CONSUMED', 'REVOKED');

create table public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'POLAR'),
  provider_event_id text not null,
  event_type text not null,
  payload_sha256 text not null,
  processed_at timestamptz not null default timezone('utc', now()),
  unique(provider, provider_event_id)
);

create table public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'POLAR'),
  provider_order_id text not null,
  provider_checkout_id text,
  application_case_id uuid not null references public.application_cases(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  product text not null check (product in ('QUICK')),
  amount integer not null check (amount >= 0),
  currency text not null check (char_length(currency) = 3),
  status public.billing_order_status not null default 'PAID',
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  paid_at timestamptz not null,
  refunded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(provider, provider_order_id)
);

create index billing_orders_case_idx on public.billing_orders(application_case_id, created_at desc);
create trigger billing_orders_updated_at before update on public.billing_orders
for each row execute function public.set_updated_at();

create table public.analysis_entitlements (
  id uuid primary key default gen_random_uuid(),
  billing_order_id uuid not null unique references public.billing_orders(id) on delete restrict,
  application_case_id uuid not null references public.application_cases(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  product text not null check (product in ('QUICK')),
  allowed_characters integer not null check (allowed_characters > 0),
  status public.entitlement_status not null default 'ACTIVE',
  consumed_by_analysis_run_id uuid unique references public.analysis_runs(id) on delete restrict,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (
    (status = 'ACTIVE' and consumed_by_analysis_run_id is null and consumed_at is null and revoked_at is null)
    or (status = 'CONSUMED' and consumed_by_analysis_run_id is not null and consumed_at is not null and revoked_at is null)
    or (status = 'REVOKED' and consumed_by_analysis_run_id is null and consumed_at is null and revoked_at is not null)
  )
);

create index analysis_entitlements_case_idx on public.analysis_entitlements(application_case_id, status, created_at);

alter table public.billing_webhook_events enable row level security;
alter table public.billing_orders enable row level security;
alter table public.analysis_entitlements enable row level security;

create policy "billing order owner read" on public.billing_orders for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy "entitlement owner read" on public.analysis_entitlements for select to authenticated
  using ((select auth.uid()) = owner_user_id);

create function public.grant_polar_order_entitlement(
  p_event_id text,
  p_event_type text,
  p_payload_sha256 text,
  p_provider_order_id text,
  p_provider_checkout_id text,
  p_application_case_id uuid,
  p_product text,
  p_allowed_characters integer,
  p_amount integer,
  p_currency text,
  p_paid_at timestamptz,
  p_metadata jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  case_owner_id uuid;
  order_id uuid;
begin
  if p_product <> 'QUICK' or p_allowed_characters <= 0 or p_amount < 0 then
    raise exception 'INVALID_ENTITLEMENT_INPUT' using errcode = '22023';
  end if;

  insert into public.billing_webhook_events (
    provider, provider_event_id, event_type, payload_sha256
  ) values (
    'POLAR', p_event_id, p_event_type, p_payload_sha256
  ) on conflict (provider, provider_event_id) do nothing;

  if not found then
    return 'DUPLICATE_EVENT';
  end if;

  select owner_user_id into case_owner_id
  from public.application_cases
  where id = p_application_case_id
  for update;

  if case_owner_id is null then
    raise exception 'APPLICATION_CASE_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.billing_orders (
    provider, provider_order_id, provider_checkout_id, application_case_id,
    owner_user_id, product, amount, currency, status, metadata, paid_at
  ) values (
    'POLAR', p_provider_order_id, nullif(p_provider_checkout_id, ''),
    p_application_case_id, case_owner_id, p_product, p_amount, lower(p_currency),
    'PAID', p_metadata, p_paid_at
  ) on conflict (provider, provider_order_id) do nothing
  returning id into order_id;

  if order_id is null then
    return 'DUPLICATE_ORDER';
  end if;

  insert into public.analysis_entitlements (
    billing_order_id, application_case_id, owner_user_id, product, allowed_characters
  ) values (
    order_id, p_application_case_id, case_owner_id, p_product, p_allowed_characters
  );

  return 'GRANTED';
end;
$$;

create function public.refund_polar_order_entitlement(
  p_event_id text,
  p_event_type text,
  p_payload_sha256 text,
  p_provider_order_id text,
  p_refunded_at timestamptz,
  p_requires_review boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_id uuid;
  current_entitlement_status public.entitlement_status;
begin
  insert into public.billing_webhook_events (
    provider, provider_event_id, event_type, payload_sha256
  ) values (
    'POLAR', p_event_id, p_event_type, p_payload_sha256
  ) on conflict (provider, provider_event_id) do nothing;

  if not found then
    return 'DUPLICATE_EVENT';
  end if;

  select bo.id, ae.status into order_id, current_entitlement_status
  from public.billing_orders bo
  join public.analysis_entitlements ae on ae.billing_order_id = bo.id
  where bo.provider = 'POLAR' and bo.provider_order_id = p_provider_order_id
  for update of bo, ae;

  if order_id is null then
    raise exception 'PAID_ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if current_entitlement_status = 'CONSUMED' then
    update public.billing_orders
    set status = 'REVIEW_REQUIRED', refunded_at = p_refunded_at
    where id = order_id;
    return 'REVIEW_REQUIRED';
  end if;

  if p_requires_review then
    update public.billing_orders
    set status = 'REVIEW_REQUIRED', refunded_at = p_refunded_at
    where id = order_id;

    update public.analysis_entitlements
    set status = 'REVOKED', revoked_at = p_refunded_at
    where billing_order_id = order_id and status = 'ACTIVE';

    return 'REVIEW_REQUIRED';
  end if;

  update public.billing_orders
  set status = 'REFUNDED', refunded_at = p_refunded_at
  where id = order_id;

  update public.analysis_entitlements
  set status = 'REVOKED', revoked_at = p_refunded_at
  where billing_order_id = order_id and status = 'ACTIVE';

  return 'REVOKED';
end;
$$;

create function public.consume_analysis_entitlement(p_analysis_run_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_run public.analysis_runs%rowtype;
  snapshot_characters integer;
  entitlement_id uuid;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select * into target_run
  from public.analysis_runs
  where id = p_analysis_run_id and owner_user_id = current_user_id
  for update;

  if target_run.id is null then
    raise exception 'ANALYSIS_RUN_NOT_FOUND' using errcode = 'P0002';
  end if;

  if target_run.status <> 'PENDING' then
    raise exception 'ANALYSIS_RUN_NOT_PENDING' using errcode = '55000';
  end if;

  select coalesce(sum(v.character_count), 0)::integer into snapshot_characters
  from public.submission_snapshot_items si
  join public.document_versions v on v.id = si.document_version_id
  where si.snapshot_id = target_run.submission_snapshot_id
    and si.purpose = 'PRIMARY';

  select ae.id into entitlement_id
  from public.analysis_entitlements ae
  where ae.application_case_id = target_run.application_case_id
    and ae.owner_user_id = current_user_id
    and ae.product = target_run.product
    and ae.status = 'ACTIVE'
    and ae.allowed_characters >= snapshot_characters
  order by ae.created_at
  for update skip locked
  limit 1;

  if entitlement_id is null then
    raise exception 'ACTIVE_ENTITLEMENT_NOT_FOUND' using errcode = '42501';
  end if;

  update public.analysis_entitlements
  set status = 'CONSUMED',
      consumed_by_analysis_run_id = target_run.id,
      consumed_at = timezone('utc', now())
  where id = entitlement_id;

  return entitlement_id;
end;
$$;

revoke all on function public.grant_polar_order_entitlement(text, text, text, text, text, uuid, text, integer, integer, text, timestamptz, jsonb) from public;
revoke all on function public.refund_polar_order_entitlement(text, text, text, text, timestamptz, boolean) from public;
revoke all on function public.consume_analysis_entitlement(uuid) from public;
grant execute on function public.grant_polar_order_entitlement(text, text, text, text, text, uuid, text, integer, integer, text, timestamptz, jsonb) to service_role;
grant execute on function public.refund_polar_order_entitlement(text, text, text, text, timestamptz, boolean) to service_role;

commit;
