begin;

-- Required now for two-provider checkout exclusion and durable, private NICE execution.
create table public.checkout_provider_claims (
 analysis_run_id uuid primary key references public.analysis_runs(id) on delete cascade,
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check(provider in ('POLAR','NICEPAY')),
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
alter table public.checkout_provider_claims enable row level security;
revoke all on public.checkout_provider_claims from anon, authenticated;
grant all on public.checkout_provider_claims to service_role;

create table public.nicepay_orders (
 id uuid primary key,
 moid text generated always as ('mooa' || replace(id::text,'-','')) stored unique,
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 application_case_id uuid not null references public.application_cases(id) on delete restrict,
 analysis_run_id uuid not null references public.analysis_runs(id) on delete restrict,
 product text not null check(product in ('QUICK','PRO','FINAL')),
 method text not null check(method in ('CARD','EASYPAY','KAKAO')),
 merchant_mid text not null check(merchant_mid ~ '^[A-Za-z0-9]{9}m$'),
 amount integer not null check(amount>0 and amount<=100000000),
 currency text not null default 'krw' check(currency='krw'),
 pricing_version text not null check(length(pricing_version) between 1 and 100),
 quote_snapshot jsonb not null check(jsonb_typeof(quote_snapshot)='object'),
 test_purchase boolean not null default false,
 status text not null default 'OPEN' check(status in ('OPEN','AUTHORIZING','PAID','FAILED','EXPIRED','NET_CANCELLED','REFUNDED','REVIEW_REQUIRED')),
 tid text unique check(tid is null or tid ~ '^[A-Za-z0-9]{30}$'),
 auth_token_sha256 text check(auth_token_sha256 is null or auth_token_sha256 ~ '^[a-f0-9]{64}$'),
 approval_started_at timestamptz,
 recovery_started_at timestamptz,
 proof_sha256 text,
 billing_order_id uuid unique references public.billing_orders(id) on delete restrict,
 failure_code text check(length(failure_code)<=100),
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index nicepay_orders_owner_idx on public.nicepay_orders(owner_user_id,created_at desc);
create index nicepay_orders_run_idx on public.nicepay_orders(analysis_run_id,created_at desc);
create unique index nicepay_orders_one_live_run on public.nicepay_orders(analysis_run_id)
 where status in ('OPEN','AUTHORIZING','PAID','REVIEW_REQUIRED');
alter table public.nicepay_orders enable row level security;
revoke all on public.nicepay_orders from anon, authenticated;
grant select on public.nicepay_orders to authenticated;
grant all on public.nicepay_orders to service_role;
create policy nicepay_order_owner_read on public.nicepay_orders for select to authenticated using(owner_user_id=(select auth.uid()));

create function public.protect_nicepay_order_snapshot() returns trigger language plpgsql set search_path='' as $$
begin
 if (new.id,new.owner_user_id,new.application_case_id,new.analysis_run_id,new.product,new.method,new.merchant_mid,new.amount,new.currency,new.pricing_version,new.quote_snapshot,new.test_purchase,new.expires_at,new.created_at)
 is distinct from (old.id,old.owner_user_id,old.application_case_id,old.analysis_run_id,old.product,old.method,old.merchant_mid,old.amount,old.currency,old.pricing_version,old.quote_snapshot,old.test_purchase,old.expires_at,old.created_at) then
 raise exception 'IMMUTABLE_NICEPAY_ORDER' using errcode='55000'; end if;
 new.updated_at=now();return new;
end $$;
create trigger protect_nicepay_order_snapshot before update on public.nicepay_orders for each row execute function public.protect_nicepay_order_snapshot();

create function public.reserve_checkout_provider(p_run_id uuid,p_owner_id uuid,p_provider text) returns void
language plpgsql security definer set search_path='' as $$
declare r public.analysis_runs%rowtype; c public.checkout_provider_claims%rowtype;
begin
 if p_provider not in ('POLAR','NICEPAY') then raise exception 'INVALID_PROVIDER'; end if;
 select * into r from public.analysis_runs where id=p_run_id and owner_user_id=p_owner_id for update;
 if r.id is null then raise exception 'ANALYSIS_RUN_NOT_FOUND' using errcode='P0002';end if;
 if r.status<>'PENDING' or r.product not in ('QUICK','PRO','FINAL') then raise exception 'CHECKOUT_NOT_ALLOWED';end if;
 if exists(select 1 from public.analysis_entitlements where owner_user_id=p_owner_id and application_case_id=r.application_case_id and product=r.product and status='ACTIVE') then raise exception 'ACTIVE_ENTITLEMENT_EXISTS';end if;
 if p_provider='NICEPAY' and exists(select 1 from public.checkout_intents where analysis_run_id=r.id and status='OPEN' and expires_at>now()) then raise exception 'CHECKOUT_PROVIDER_IN_PROGRESS';end if;
 if p_provider='POLAR' and exists(select 1 from public.nicepay_orders where analysis_run_id=r.id and status in ('AUTHORIZING','PAID','REVIEW_REQUIRED')) then raise exception 'CHECKOUT_PROVIDER_IN_PROGRESS';end if;
 select * into c from public.checkout_provider_claims where analysis_run_id=r.id for update;
 if c.analysis_run_id is not null and c.provider<>p_provider and c.expires_at>now() then raise exception 'CHECKOUT_PROVIDER_IN_PROGRESS';end if;
 insert into public.checkout_provider_claims(analysis_run_id,owner_user_id,provider,expires_at) values(r.id,p_owner_id,p_provider,now()+interval '15 minutes')
 on conflict(analysis_run_id) do update set provider=excluded.provider,expires_at=excluded.expires_at;
end $$;

create function public.create_nicepay_order(p_id uuid,p_run_id uuid,p_owner_id uuid,p_mid text,p_method text,p_quote jsonb,p_pricing_version text,p_test boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.analysis_runs%rowtype; o public.nicepay_orders%rowtype;
begin
 select * into r from public.analysis_runs where id=p_run_id and owner_user_id=p_owner_id for update;
 if r.id is null then raise exception 'ANALYSIS_RUN_NOT_FOUND' using errcode='P0002';end if;
 if r.status<>'PENDING' or r.product not in ('QUICK','PRO','FINAL') or (p_quote->>'productTier') is distinct from r.product then raise exception 'CHECKOUT_NOT_ALLOWED';end if;
 if not exists(select 1 from public.checkout_provider_claims where analysis_run_id=r.id and owner_user_id=p_owner_id and provider='NICEPAY' and expires_at>now()) then raise exception 'CHECKOUT_RESERVATION_REQUIRED';end if;
 update public.nicepay_orders set status='EXPIRED' where analysis_run_id=r.id and status='OPEN' and expires_at<=now();
 select * into o from public.nicepay_orders where analysis_run_id=r.id and status in ('OPEN','AUTHORIZING','PAID','REVIEW_REQUIRED') for update;
 if o.id is not null then
  if o.status<>'OPEN' or o.method=p_method then return to_jsonb(o); end if;
  update public.nicepay_orders set status='EXPIRED' where id=o.id;
 end if;
 if (p_quote->>'totalPriceKrw')::integer<=0 or (p_quote->>'allowedCharacters')::integer<=0 then raise exception 'INVALID_QUOTE';end if;
 insert into public.nicepay_orders(id,owner_user_id,application_case_id,analysis_run_id,product,method,merchant_mid,amount,pricing_version,quote_snapshot,test_purchase,expires_at)
 values(p_id,p_owner_id,r.application_case_id,r.id,r.product,p_method,p_mid,(p_quote->>'totalPriceKrw')::integer,p_pricing_version,p_quote,p_test,now()+interval '15 minutes') returning * into o;
 return to_jsonb(o);
end $$;

create function public.claim_nicepay_approval(p_id uuid,p_tid text,p_token_sha256 text) returns text
language plpgsql security definer set search_path='' as $$
declare o public.nicepay_orders%rowtype;
begin
 if p_tid is null or p_tid !~ '^[A-Za-z0-9]{30}$' or p_token_sha256 is null or p_token_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_AUTH_BINDING';end if;
 select * into o from public.nicepay_orders where id=p_id for update;
 if o.id is null then raise exception 'NICEPAY_ORDER_NOT_FOUND';end if;
 if left(p_tid,10)<>o.merchant_mid then raise exception 'NICEPAY_MERCHANT_MISMATCH';end if;
 if o.tid is not null and (o.tid<>p_tid or o.auth_token_sha256<>p_token_sha256) then raise exception 'NICEPAY_REPLAY_BINDING_INVALID';end if;
 if o.status='PAID' then return 'ALREADY_PAID';end if;
 if o.status in ('AUTHORIZING','REVIEW_REQUIRED') then return 'IN_PROGRESS';end if;
 if o.status<>'OPEN' or o.expires_at<=now() then return 'NOT_OPEN';end if;
 update public.nicepay_orders set status='AUTHORIZING',tid=p_tid,auth_token_sha256=p_token_sha256,approval_started_at=now() where id=o.id;
 return 'CLAIMED';
end $$;

alter table public.billing_orders drop constraint billing_orders_provider_check;
alter table public.billing_orders add constraint billing_orders_provider_check check(provider in ('POLAR','MOOA_CREDIT','GOOGLE_PLAY','NICEPAY'));

create function public.grant_nicepay_order(p_id uuid,p_tid text,p_proof_sha256 text) returns text
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
 if o.status='PAID' and o.billing_order_id is not null then return 'ALREADY_PAID';end if;
 if o.status not in ('AUTHORIZING','REVIEW_REQUIRED') or o.tid is distinct from p_tid or p_proof_sha256 is null or p_proof_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'NICEPAY_GRANT_NOT_ALLOWED';end if;
 duplicate_purchase=r.status<>'PENDING' or exists(select 1 from public.analysis_entitlements where owner_user_id=o.owner_user_id and application_case_id=o.application_case_id and product=o.product and (status='ACTIVE' or consumed_by_analysis_run_id=o.analysis_run_id));
 insert into public.billing_orders(provider,provider_order_id,provider_checkout_id,application_case_id,owner_user_id,product,amount,currency,status,metadata,paid_at)
 values('NICEPAY',o.tid,o.id::text,o.application_case_id,o.owner_user_id,o.product,o.amount,o.currency,'PAID',jsonb_build_object('nicepayOrderId',o.id,'analysisRunId',o.analysis_run_id,'pricingVersion',o.pricing_version,'quoteSnapshot',o.quote_snapshot,'nicepayEnvironment','production','testPurchase',o.test_purchase),now()) returning id into b;
 update public.nicepay_orders set status='PAID',proof_sha256=p_proof_sha256,billing_order_id=b where id=o.id;
 if duplicate_purchase then return 'CANCEL_REQUIRED';end if;
 insert into public.analysis_entitlements(billing_order_id,application_case_id,owner_user_id,product,allowed_characters)
 values(b,o.application_case_id,o.owner_user_id,o.product,(o.quote_snapshot->>'allowedCharacters')::integer);
 return 'GRANTED';
end $$;

create function public.complete_nicepay_cancel(p_id uuid,p_cancel_ref text,p_proof_sha256 text) returns integer
language plpgsql security definer set search_path='' as $$
declare o public.nicepay_orders%rowtype; revoked integer := 0;
begin
 if p_cancel_ref is null or length(p_cancel_ref)=0 or p_proof_sha256 is null or p_proof_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_NICEPAY_CANCEL_PROOF';end if;
 select * into o from public.nicepay_orders where id=p_id for update;
 if o.id is null then raise exception 'NICEPAY_ORDER_NOT_FOUND';end if;
 if o.status in ('REFUNDED','NET_CANCELLED') then return 0;end if;
 if o.status not in ('PAID','AUTHORIZING','REVIEW_REQUIRED') then raise exception 'NICEPAY_CANCEL_NOT_ALLOWED';end if;
 if o.billing_order_id is not null then
  update public.billing_orders set status='REFUNDED',refunded_at=now(),auto_refund_state='SUBMITTED',auto_refund_provider_id=p_cancel_ref where id=o.billing_order_id and provider='NICEPAY';
  update public.analysis_entitlements set status='REVOKED',revoked_at=now() where billing_order_id=o.billing_order_id and status='ACTIVE';
  get diagnostics revoked=row_count;
 end if;
 update public.nicepay_orders set status=case when o.billing_order_id is null then 'NET_CANCELLED' else 'REFUNDED' end,proof_sha256=p_proof_sha256 where id=o.id;
 return revoked;
end $$;

create function public.claim_nicepay_recovery(p_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 update public.nicepay_orders set recovery_started_at=now() where id=p_id and status in ('AUTHORIZING','REVIEW_REQUIRED')
 and approval_started_at<now()-interval '90 seconds' and (recovery_started_at is null or recovery_started_at<now()-interval '60 seconds');
 return found;
end $$;

-- Add provider metadata only; preserve the existing claim and shared refund lock.
do $$ declare signature text; body text; needle text := '''providerOrderId'', target_order.provider_order_id,';
begin
 foreach signature in array array['public.claim_quick_analysis_failure_refund(uuid,uuid)','public.claim_quick_analysis_timeout_refund(uuid,uuid,integer)'] loop
  body=pg_get_functiondef(signature::regprocedure);
  if position(needle in body)=0 then raise exception 'REFUND_CLAIM_BODY_CHANGED';end if;
  execute replace(body,needle,needle || E'\n    ''provider'', target_order.provider,');
 end loop;
 body=pg_get_functiondef('public.settle_referral_for_order(uuid)'::regprocedure);
 if position('(''POLAR'', ''GOOGLE_PLAY'')' in body)=0 then raise exception 'REFERRAL_PROVIDER_GATE_CHANGED';end if;
 execute replace(body,'(''POLAR'', ''GOOGLE_PLAY'')','(''POLAR'', ''GOOGLE_PLAY'', ''NICEPAY'')');
end $$;

revoke all on function public.reserve_checkout_provider(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.create_nicepay_order(uuid,uuid,uuid,text,text,jsonb,text,boolean) from public,anon,authenticated;
revoke all on function public.claim_nicepay_approval(uuid,text,text) from public,anon,authenticated;
revoke all on function public.grant_nicepay_order(uuid,text,text) from public,anon,authenticated;
revoke all on function public.complete_nicepay_cancel(uuid,text,text) from public,anon,authenticated;
revoke all on function public.claim_nicepay_recovery(uuid) from public,anon,authenticated;
grant execute on function public.reserve_checkout_provider(uuid,uuid,text),public.create_nicepay_order(uuid,uuid,uuid,text,text,jsonb,text,boolean),public.claim_nicepay_approval(uuid,text,text),public.grant_nicepay_order(uuid,text,text),public.complete_nicepay_cancel(uuid,text,text),public.claim_nicepay_recovery(uuid) to service_role;
commit;
