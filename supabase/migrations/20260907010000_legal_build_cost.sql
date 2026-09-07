-- 법률 문서 한 건에 실제로 얼마가 들었는지 남깁니다.
--
-- 지금까지는 "얼마 나갔는지"를 알 방법이 없었습니다. 99,000원을 받는 상품에서
-- 원가를 모르면 값을 올릴지 내릴지, 300쪽 상한을 500쪽으로 풀지, Upstage를
-- 계속 쓸지를 **감으로** 정하게 됩니다.
--
-- 첨삭 쪽은 시도마다 한 줄씩 적는 표(analysis_run_attempts)가 이미 있는데,
-- 법률은 건당 한 번 실행이라 표를 따로 만들지 않고 결제 건에 붙입니다.
-- 나중에 단계가 여러 번(훑기→검토→작성)으로 늘면 그때 표로 뺍니다.
--
-- 사건 내용은 여기 없습니다. 토큰 수와 금액, 어느 급 모델을 썼는지뿐입니다.

begin;

alter table public.legal_document_builds
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  -- 원가를 모를 수 있습니다(단가 미설정). 0으로 두면 "공짜였다"가 되어 합계가
  -- 조용히 낮아지므로 null을 그대로 둡니다.
  add column if not exists cost_krw numeric(12, 2),
  add column if not exists model_tier text check (model_tier in ('SCAN', 'REVIEW', 'FINAL')),
  add column if not exists model text,
  -- 결제 시점에 잰 분량. 값을 정한 근거라 함께 남깁니다.
  add column if not exists pages integer;

commit;
