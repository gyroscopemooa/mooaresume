begin;

alter table public.billing_orders drop constraint if exists billing_orders_product_check;
alter table public.billing_orders add constraint billing_orders_product_check check (product in ('QUICK', 'PRO'));
alter table public.analysis_entitlements drop constraint if exists analysis_entitlements_product_check;
alter table public.analysis_entitlements add constraint analysis_entitlements_product_check check (product in ('QUICK', 'PRO'));

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
  if target_run.product not in ('QUICK', 'PRO') or target_run.status <> 'PENDING' then
    raise exception 'CHECKOUT_NOT_ALLOWED' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.analysis_entitlements ae
    where ae.application_case_id = target_run.application_case_id
      and ae.owner_user_id = current_user_id
      and ae.product = target_run.product and ae.status = 'ACTIVE'
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
    'product', target_run.product,
    'totalCharacters', total_characters,
    'openCheckout', open_checkout
  );
end;
$$;

-- Registering a checkout intent was QUICK-only; PRO now reuses the same
-- idempotent upsert (unique on analysis_run_id) so retries never duplicate it.
create or replace function public.register_quick_checkout(
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
  if target_run.product not in ('QUICK', 'PRO') or target_run.status <> 'PENDING' then
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

-- Granting an entitlement from a paid Polar order was QUICK-only; the
-- provider_order_id unique constraint plus billing_webhook_events keeps this
-- idempotent for PRO exactly as it already was for QUICK.
create or replace function public.grant_polar_order_entitlement(
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
  if p_product not in ('QUICK', 'PRO') or p_allowed_characters <= 0 or p_amount < 0 then
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

-- Starting an analysis run consumed only a QUICK entitlement; match the
-- run's own product so a PRO run consumes a PRO entitlement instead.
create or replace function public.begin_quick_analysis(p_analysis_run_id uuid, p_owner_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_run public.analysis_runs%rowtype;
  entitlement_id uuid;
  snapshot_characters integer;
  request_documents jsonb;
begin
  select * into target_run from public.analysis_runs
  where id = p_analysis_run_id and owner_user_id = p_owner_user_id
  for update;

  if target_run.id is null then
    raise exception 'ANALYSIS_RUN_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target_run.product not in ('QUICK', 'PRO') or target_run.status <> 'PENDING' then
    raise exception 'ANALYSIS_RUN_NOT_STARTABLE' using errcode = '55000';
  end if;
  if target_run.attempt_count >= 3 then
    raise exception 'ANALYSIS_ATTEMPT_LIMIT_REACHED' using errcode = '55000';
  end if;

  select coalesce(sum(v.character_count), 0)::integer into snapshot_characters
  from public.submission_snapshot_items si
  join public.document_versions v on v.id = si.document_version_id
  where si.snapshot_id = target_run.submission_snapshot_id
    and si.purpose = 'PRIMARY';

  if snapshot_characters <= 0 then
    raise exception 'PRIMARY_DOCUMENT_REQUIRED' using errcode = '22023';
  end if;

  select ae.id into entitlement_id from public.analysis_entitlements ae
  where ae.application_case_id = target_run.application_case_id
    and ae.owner_user_id = p_owner_user_id
    and ae.product = target_run.product and ae.status = 'ACTIVE'
    and ae.allowed_characters >= snapshot_characters
  order by ae.created_at for update skip locked limit 1;

  if entitlement_id is null then
    raise exception 'ACTIVE_ENTITLEMENT_NOT_FOUND' using errcode = '42501';
  end if;

  update public.analysis_entitlements
  set status = 'CONSUMED', consumed_by_analysis_run_id = target_run.id,
      consumed_at = timezone('utc', now())
  where id = entitlement_id;

  update public.analysis_runs
  set status = 'RUNNING', started_at = timezone('utc', now()), failure_code = null,
      attempt_count = attempt_count + 1
  where id = target_run.id;

  select jsonb_agg(jsonb_build_object(
    'kind', case d.kind
      when 'COVER_LETTER' then 'cover_letter'
      when 'JOB_POSTING' then 'job_posting'
      when 'RESUME' then 'resume'
      when 'CAREER_DOCUMENT' then 'career_description'
      when 'PORTFOLIO' then 'portfolio'
      else 'portfolio' end,
    'text', v.normalized_text,
    'filename', v.original_filename
  ) order by si.purpose, d.created_at) into request_documents
  from public.submission_snapshot_items si
  join public.document_versions v on v.id = si.document_version_id
  join public.documents d on d.id = v.document_id
  where si.snapshot_id = target_run.submission_snapshot_id
    and v.normalized_text is not null
    and d.kind <> 'OTHER';

  return jsonb_build_object(
    'analysisRunId', target_run.id,
    'request', jsonb_build_object(
      'requestId', target_run.application_case_id,
      'product', target_run.product,
      'writingMode', target_run.writing_mode,
      'writingStyle', target_run.writing_style,
      'targetLength', target_run.target_length,
      'documents', coalesce(request_documents, '[]'::jsonb)
    )
  );
end;
$$;

-- Retrying a failed run after AI-output-validation failure re-checked for a
-- QUICK entitlement only; match the run's own product here too.
create or replace function public.prepare_quick_analysis_retry(
  p_analysis_run_id uuid,
  p_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_run public.analysis_runs%rowtype;
begin
  select * into target_run from public.analysis_runs
  where id = p_analysis_run_id and owner_user_id = p_owner_user_id
  for update;

  if target_run.id is null then
    raise exception 'ANALYSIS_RUN_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target_run.status <> 'FAILED'
     or target_run.failure_code <> 'AI_OUTPUT_VALIDATION_FAILED'
     or target_run.attempt_count >= 3 then
    raise exception 'ANALYSIS_RETRY_NOT_ALLOWED' using errcode = '55000';
  end if;
  if exists (select 1 from public.analysis_results where analysis_run_id = target_run.id) then
    raise exception 'ANALYSIS_RESULT_ALREADY_EXISTS' using errcode = '55000';
  end if;
  if not exists (
    select 1 from public.analysis_entitlements
    where application_case_id = target_run.application_case_id
      and owner_user_id = p_owner_user_id
      and product = target_run.product and status = 'ACTIVE'
  ) then
    raise exception 'ACTIVE_ENTITLEMENT_NOT_FOUND' using errcode = '42501';
  end if;

  update public.analysis_runs
  set status = 'PENDING', started_at = null, completed_at = null
  where id = target_run.id;
end;
$$;

commit;
