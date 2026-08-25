-- Makes FINAL a product the database will accept.
--
-- Everything below is the same shape as 20260820010000_enable_pro_billing.sql,
-- which did this for PRO. Nothing here decides what FINAL analyses contain —
-- that lives in the prompt and schema layer. This is only "may a run, an order,
-- and an entitlement carry the word FINAL".
--
-- Until this is applied, a FINAL run is rejected at every gate:
-- ANALYSIS_RUN_NOT_STARTABLE from begin_quick_analysis, CHECKOUT_NOT_ALLOWED
-- from the checkout functions, INVALID_ENTITLEMENT_INPUT from the webhook.

begin;

-- The analysis_runs check is a column-level constraint with no explicit name,
-- so it cannot be dropped by a name written here — a guessed name that does not
-- match would drop nothing, the new constraint would be added alongside the old
-- one, and every FINAL insert would still fail while the migration reported
-- success. Found by definition instead.
do $$
declare
  legacy_constraint text;
begin
  select con.conname into legacy_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'analysis_runs'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%QUICK%';

  if legacy_constraint is not null then
    execute format('alter table public.analysis_runs drop constraint %I', legacy_constraint);
  end if;
end;
$$;

alter table public.analysis_runs
  add constraint analysis_runs_product_check check (product in ('QUICK', 'PRO', 'FINAL'));

alter table public.billing_orders drop constraint if exists billing_orders_product_check;
alter table public.billing_orders
  add constraint billing_orders_product_check check (product in ('QUICK', 'PRO', 'FINAL'));

alter table public.analysis_entitlements drop constraint if exists analysis_entitlements_product_check;
alter table public.analysis_entitlements
  add constraint analysis_entitlements_product_check check (product in ('QUICK', 'PRO', 'FINAL'));

-- Same body as 20260820010000, with FINAL added to the allowed products.
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
  if target_run.product not in ('QUICK', 'PRO', 'FINAL') or target_run.status <> 'PENDING' then
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

-- Same body as 20260820010000, with FINAL added to the allowed products.
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
  if target_run.product not in ('QUICK', 'PRO', 'FINAL') or target_run.status <> 'PENDING' then
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

-- Same body as 20260820010000, with FINAL added to the allowed products. The
-- provider_order_id unique constraint plus billing_webhook_events keeps this
-- idempotent for FINAL exactly as it already was for QUICK and PRO.
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
  if p_product not in ('QUICK', 'PRO', 'FINAL') or p_allowed_characters <= 0 or p_amount < 0 then
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

/*
 * Same body as 20260822020000, with two changes, both on the same theme.
 *
 * 1. FINAL is startable.
 * 2. The document filter says `in ('PRO', 'FINAL')` instead of `= 'PRO'`.
 *
 * The second one is the dangerous half. That clause decides whether the run
 * receives the résumé, the career document, the portfolio and the re-run
 * instruction at all. Left as `= 'PRO'`, a paid FINAL run would arrive holding
 * only the cover letter and the posting — no résumé to cross-check against —
 * so the entire reason FINAL exists would silently produce nothing, on the most
 * expensive tier. It would not error; it would just come back empty.
 */
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
  if target_run.product not in ('QUICK', 'PRO', 'FINAL') or target_run.status <> 'PENDING' then
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
      when 'REVISION_REQUEST' then 'revision_request'
      else 'portfolio' end,
    'text', v.normalized_text,
    'filename', v.original_filename
  ) order by si.purpose, d.created_at) into request_documents
  from public.submission_snapshot_items si
  join public.document_versions v on v.id = si.document_version_id
  join public.documents d on d.id = v.document_id
  where si.snapshot_id = target_run.submission_snapshot_id
    and v.normalized_text is not null
    and length(btrim(v.normalized_text)) > 0
    and (d.kind not in ('OTHER', 'REVISION_REQUEST') or target_run.product in ('PRO', 'FINAL'));

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

commit;
