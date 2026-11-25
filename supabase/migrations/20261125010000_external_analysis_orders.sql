-- External orders are real sales recorded separately from payment providers.
-- No fictitious billing_order, no PG refund, no public access to customer metadata.
begin;
create table public.external_analysis_orders (
  id uuid primary key,
  analysis_run_id uuid unique not null references public.analysis_runs(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  product text not null check (product in ('QUICK','PRO','FINAL')),
  sales_channel text not null default '',
  order_number text not null default '',
  customer_name text not null default '',
  customer_email text not null default '',
  paid_amount_krw integer check (paid_amount_krw >= 0),
  company text not null default '',
  role text not null default '',
  auto_email boolean not null default true,
  expires_at timestamptz,
  link_version uuid not null default gen_random_uuid(),
  email_request_id uuid,
  revoked_at timestamptz,
  email_status text not null default 'PENDING' check (email_status in ('PENDING','SENDING','SENT','FAILED','SKIPPED')),
  email_attempt_at timestamptz,
  email_message_id text,
  created_at timestamptz not null default now()
);
create unique index external_analysis_order_channel_number on public.external_analysis_orders(lower(sales_channel),order_number) where sales_channel <> '' and order_number <> '';
alter table public.external_analysis_orders enable row level security;
revoke all on public.external_analysis_orders from public,anon,authenticated;
grant select,insert,update,delete on public.external_analysis_orders to service_role;

alter table public.analysis_entitlements add column external_order_id uuid unique references public.external_analysis_orders(id) on delete restrict;
alter table public.analysis_entitlements drop constraint analysis_entitlements_single_source;
alter table public.analysis_entitlements add constraint analysis_entitlements_single_source
  check (num_nonnulls(billing_order_id,test_grant_id,external_order_id)=1);

-- Reuse the actual application snapshot writer, under a per-order isolated
-- internal Auth owner. Only the server role can impersonate this owner here.
create function public.create_external_analysis_order(p_id uuid,p_owner uuid,p_plan jsonb,p_meta jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  result jsonb;
  run_id uuid;
  case_id uuid;
  chars integer;
begin
  if not exists (select 1 from auth.users where id=p_owner and raw_app_meta_data->>'mooa_external_order'=p_id::text) then
    raise exception 'INVALID_EXTERNAL_OWNER';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select analysis_run_id into run_id from public.external_analysis_orders where id=p_id;
  if run_id is not null then return jsonb_build_object('analysisRunId',run_id); end if;
  perform set_config('request.jwt.claim.sub',p_owner::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',p_owner,'role','service_role')::text,true);
  result:=public.create_application_case_from_plan(p_plan);
  run_id:=(result->>'analysisRunId')::uuid;
  case_id:=(result->>'applicationCaseId')::uuid;
  select coalesce(sum(v.character_count),0)::integer into chars from public.submission_snapshot_items i
    join public.document_versions v on v.id=i.document_version_id
    where i.snapshot_id=(result->>'submissionSnapshotId')::uuid and i.purpose='PRIMARY';
  if chars < 1 or chars > (case when p_plan->>'product'='QUICK' then 8000 else 30000 end) then raise exception 'INVALID_EXTERNAL_PRIMARY_LENGTH'; end if;
  insert into public.external_analysis_orders(id,analysis_run_id,owner_user_id,product,sales_channel,order_number,customer_name,customer_email,paid_amount_krw,company,role,auto_email,email_status)
    values(p_id,run_id,p_owner,p_plan->>'product',coalesce(p_meta->>'salesChannel',''),coalesce(p_meta->>'orderNumber',''),coalesce(p_meta->>'customerName',''),coalesce(p_meta->>'customerEmail',''),(p_meta->>'paidAmountKrw')::integer,coalesce(p_plan->>'companyName',''),coalesce(p_plan->>'roleName',''),coalesce((p_meta->>'autoEmail')::boolean,true),case when coalesce(p_meta->>'customerEmail','')='' or not coalesce((p_meta->>'autoEmail')::boolean,true) then 'SKIPPED' else 'PENDING' end);
  insert into public.analysis_entitlements(application_case_id,owner_user_id,product,allowed_characters,external_order_id)
    values(case_id,p_owner,p_plan->>'product',case when p_plan->>'product'='QUICK' then 8000 else 30000 end,p_id);
  return result;
end; $$;
revoke all on function public.create_external_analysis_order(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_external_analysis_order(uuid,uuid,jsonb,jsonb) to service_role;

-- Preserve the current pipeline and paid reference-material budget. Fail the
-- migration if the expected existing function is not present (no silent drift).
do $$
declare original text; patched text;
begin
  select pg_get_functiondef('public.begin_quick_analysis(uuid,uuid)'::regprocedure) into original;
  patched:=replace(original,'paid := coalesce(paid, false);','paid := coalesce(paid, false) or exists (select 1 from public.analysis_entitlements where id = entitlement_id and external_order_id is not null);');
  if patched=original then raise exception 'EXTERNAL_ORDER_PAID_BUDGET_PATCH_FAILED'; end if;
  execute patched;
end $$;
create function public.find_external_analysis_owner(p_id uuid)
returns uuid language sql security definer set search_path='' as $$
  select id from auth.users where raw_app_meta_data->>'mooa_external_order'=p_id::text order by created_at limit 1
$$;
revoke all on function public.find_external_analysis_owner(uuid) from public,anon,authenticated;
grant execute on function public.find_external_analysis_owner(uuid) to service_role;
commit;
