begin;
-- Career builds have no ApplicationCase/AnalysisRun; keep their payment proof private.
create table public.career_nicepay_orders (
 id uuid primary key, moid text not null unique, owner_user_id uuid not null references auth.users(id) on delete cascade,
 build_id uuid not null unique references public.career_ai_builds(id) on delete cascade, scope text not null check(scope in ('interest','work_style','work_values','combined')),
 product text not null default 'CAREER_AI' check(product='CAREER_AI'), merchant_mid text not null,
 method text not null check(method in ('CARD','EASYPAY')), amount integer not null check(amount>0),
 currency text not null default 'krw' check(currency='krw'), pricing_version text not null default 'career-v1',
 test_purchase boolean not null, status text not null default 'OPEN' check(status in ('OPEN','AUTHORIZING','PAID','FAILED','EXPIRED','NET_CANCELLED','REFUNDED','REVIEW_REQUIRED')),
 tid text unique, token_sha256 text, proof_sha256 text, failure_code text, cancel_ref text,
 expires_at timestamptz not null default now()+interval '30 minutes', recovery_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.career_nicepay_orders enable row level security;
revoke all on public.career_nicepay_orders from public, anon, authenticated;
grant all on public.career_nicepay_orders to service_role;

create function public.create_career_nicepay_order(p_id uuid,p_build uuid,p_owner uuid,p_scope text,p_amount integer,p_mid text,p_method text,p_test boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare b public.career_ai_builds%rowtype; o public.career_nicepay_orders%rowtype;
begin
 select * into b from public.career_ai_builds where id=p_build and owner_user_id=p_owner for update;
 if not found or b.status <> 'PENDING' or b.provider_checkout_id is not null or b.scope<>p_scope or b.price_krw<>p_amount
 then raise exception 'CAREER_BUILD_NOT_PAYABLE'; end if;
 insert into public.career_nicepay_orders(id,moid,build_id,owner_user_id,scope,amount,merchant_mid,method,test_purchase)
 values(p_id,'mooa'||replace(p_id::text,'-',''),p_build,p_owner,p_scope,p_amount,p_mid,p_method,p_test) returning * into o;
 update public.career_ai_builds set status='CHECKOUT',provider_checkout_id='nicepay-career:'||p_id::text where id=p_build;
 return to_jsonb(o);
end $$;
revoke all on function public.create_career_nicepay_order(uuid,uuid,uuid,text,integer,text,text,boolean) from public,anon,authenticated;
grant execute on function public.create_career_nicepay_order(uuid,uuid,uuid,text,integer,text,text,boolean) to service_role;

create function public.career_nicepay_transition(p_action text,p_id uuid,p_tid text,p_proof text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.career_nicepay_orders%rowtype; b public.career_ai_builds%rowtype;
begin
 select * into o from public.career_nicepay_orders where id=p_id for update;
 if not found then raise exception 'CAREER_ORDER_NOT_FOUND'; end if;
 if p_action is null or p_tid is null or p_proof is null then raise exception 'INVALID_TRANSITION_INPUT'; end if;
 if p_action='claim' then
  if o.status='PAID' and o.tid=p_tid then return to_jsonb('ALREADY_PAID'::text); end if;
  if o.status in ('AUTHORIZING','REVIEW_REQUIRED') then return to_jsonb('IN_PROGRESS'::text); end if;
  if o.status<>'OPEN' or o.expires_at<=now() or length(p_proof)<>64 or p_tid not like o.merchant_mid||'%' then return to_jsonb('INVALID'::text); end if;
  update public.career_nicepay_orders set status='AUTHORIZING',tid=p_tid,token_sha256=p_proof,updated_at=now() where id=p_id;
  return to_jsonb('CLAIMED'::text);
 elsif p_action='grant' then
  if o.status='PAID' and o.tid=p_tid then return to_jsonb('ALREADY_PAID'::text); end if;
  if o.status not in ('AUTHORIZING','REVIEW_REQUIRED') or o.tid is distinct from p_tid or length(p_proof)<>64 then raise exception 'INVALID_PAYMENT_PROOF'; end if;
  select * into b from public.career_ai_builds where id=o.build_id for update;
  if b.owner_user_id<>o.owner_user_id or b.scope<>o.scope or b.price_krw<>o.amount or b.provider_checkout_id is distinct from 'nicepay-career:'||o.id::text or b.status<>'CHECKOUT'
  then return to_jsonb('CANCEL_REQUIRED'::text); end if;
  update public.career_nicepay_orders set status='PAID',proof_sha256=p_proof,updated_at=now() where id=p_id;
  return to_jsonb('GRANTED'::text);
 elsif p_action='recover' then
  if o.tid is null or o.status not in ('AUTHORIZING','REVIEW_REQUIRED') or o.updated_at>now()-interval '60 seconds' or o.recovery_at>now()-interval '60 seconds' then return 'false'::jsonb; end if;
  update public.career_nicepay_orders set recovery_at=now() where id=p_id;
  return 'true'::jsonb;
 elsif p_action='cancel' then
  if length(p_proof)<>64 then raise exception 'INVALID_CANCEL_PROOF'; end if;
  update public.career_nicepay_orders set status='NET_CANCELLED',cancel_ref=p_tid,proof_sha256=p_proof,updated_at=now() where id=p_id and status in ('AUTHORIZING','REVIEW_REQUIRED','PAID');
  return '1'::jsonb;
 elsif p_action in ('FAILED','REVIEW_REQUIRED') then
  update public.career_nicepay_orders set status=p_action,failure_code=left(p_proof,100),updated_at=now() where id=p_id and status in ('AUTHORIZING','REVIEW_REQUIRED');
  return 'true'::jsonb;
 else raise exception 'INVALID_TRANSITION'; end if;
end $$;
revoke all on function public.career_nicepay_transition(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.career_nicepay_transition(text,uuid,text,text) to service_role;

commit;
