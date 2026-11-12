begin;
-- Keep a charged duplicate recoverable until its cancellation is confirmed.
create or replace function public.grant_nicepay_order(p_id uuid,p_tid text,p_proof_sha256 text) returns text
language plpgsql security definer set search_path='' as $$
declare o public.nicepay_orders%rowtype; r public.analysis_runs%rowtype; b uuid; duplicate_purchase boolean;
begin
 select * into o from public.nicepay_orders where id=p_id;
 if o.id is null then raise exception 'NICEPAY_ORDER_NOT_FOUND';end if;
 perform 1 from public.application_cases where id=o.application_case_id and owner_user_id=o.owner_user_id for update;
 if not found then raise exception 'APPLICATION_CASE_NOT_FOUND';end if;
 select * into r from public.analysis_runs where id=o.analysis_run_id and owner_user_id=o.owner_user_id for update;
 if r.id is null then raise exception 'ANALYSIS_RUN_NOT_FOUND';end if;
 select * into o from public.nicepay_orders where id=p_id for update;
 if p_tid is null or o.tid is distinct from p_tid or p_proof_sha256 is null or p_proof_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'NICEPAY_GRANT_NOT_ALLOWED';end if;
 if o.status='PAID' and o.billing_order_id is not null then return 'ALREADY_PAID';end if;
 if o.status not in ('AUTHORIZING','REVIEW_REQUIRED') then raise exception 'NICEPAY_GRANT_NOT_ALLOWED';end if;
 if o.billing_order_id is not null then
  -- Reconciliation must cancel the existing duplicate charge, never create another ledger row.
  return 'CANCEL_REQUIRED';
 end if;
 duplicate_purchase=r.status<>'PENDING' or exists(select 1 from public.analysis_entitlements where owner_user_id=o.owner_user_id and application_case_id=o.application_case_id and product=o.product and (status='ACTIVE' or consumed_by_analysis_run_id=o.analysis_run_id));
 insert into public.billing_orders(provider,provider_order_id,provider_checkout_id,application_case_id,owner_user_id,product,amount,currency,status,metadata,paid_at)
 values('NICEPAY',o.tid,o.id::text,o.application_case_id,o.owner_user_id,o.product,o.amount,o.currency,'PAID',jsonb_build_object('nicepayOrderId',o.id,'analysisRunId',o.analysis_run_id,'pricingVersion',o.pricing_version,'quoteSnapshot',o.quote_snapshot,'nicepayEnvironment','production','testPurchase',o.test_purchase),now()) returning id into b;
 update public.nicepay_orders set status=case when duplicate_purchase then 'REVIEW_REQUIRED' else 'PAID' end,
  failure_code=case when duplicate_purchase then 'NICEPAY_DUPLICATE_CANCEL_REQUIRED' else null end,
  proof_sha256=p_proof_sha256,billing_order_id=b where id=o.id;
 if duplicate_purchase then return 'CANCEL_REQUIRED';end if;
 insert into public.analysis_entitlements(billing_order_id,application_case_id,owner_user_id,product,allowed_characters)
 values(b,o.application_case_id,o.owner_user_id,o.product,(o.quote_snapshot->>'allowedCharacters')::integer);
 return 'GRANTED';
end $$;
revoke all on function public.grant_nicepay_order(uuid,text,text) from public,anon,authenticated;
grant execute on function public.grant_nicepay_order(uuid,text,text) to service_role;
commit;
