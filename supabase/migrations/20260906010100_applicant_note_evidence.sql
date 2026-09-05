begin;

/*
 * 지원자가 직접 알려준 사실을 제 이름으로 부르고, 잘리지 않는 자리에 둡니다.
 *
 * 간편 입력의 "서류에 없는 사실" 칸이 만드는 문서입니다. `OTHER`로 저장돼
 * 두 가지가 어긋나 있었습니다 — `CERTIFICATE`가 겪었던 것과 같은 문제입니다:
 *
 *  - 모델에게 **'portfolio'** 라는 이름으로 전달됐습니다. 지원자가 "서류에
 *    없어서 따로 적는다"고 넣어 준 사실이 작품집으로 소개되면, 그것을 근거로
 *    쓰라는 신호가 사라집니다.
 *  - 예산 순서가 **맨 뒤**였습니다. 자료를 많이 넣는 사람일수록 먼저 잘리는데,
 *    이 칸은 애초에 "자료에 없는 것"을 담는 자리라 잘리면 뜻 자체가 없어집니다.
 *
 * 자리는 자격·증명서 **다음**(4)입니다. 앞의 셋(공고·이력서·자격증)은 대조의
 * 기준이 되는 자료이고, 이 문서는 그 기준에 더해지는 보충이라 그 뒤가 맞습니다.
 * 기존 갈래들의 **서로 간 순서는 바뀌지 않습니다** — 뒤의 것들이 한 칸씩
 * 밀릴 뿐입니다.
 *
 * QUICK에서 감추는 것도 `OTHER`와 같습니다. QUICK은 자소서만 보는 상품입니다.
 *
 * 바꾸는 것은 이 셋뿐입니다. 예산 계산식, 이용권 처리, 무엇이 잘리는지의
 * 규칙은 그대로입니다.
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
  entitlement_order_id uuid;
  paid boolean;
  snapshot_characters integer;
  request_documents jsonb;
  per_document_limit integer;
  reference_budget integer;
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

  select ae.id, ae.billing_order_id into entitlement_id, entitlement_order_id
  from public.analysis_entitlements ae
  where ae.application_case_id = target_run.application_case_id
    and ae.owner_user_id = p_owner_user_id
    and ae.product = target_run.product and ae.status = 'ACTIVE'
    and ae.allowed_characters >= snapshot_characters
  order by ae.created_at for update skip locked limit 1;

  if entitlement_id is null then
    raise exception 'ACTIVE_ENTITLEMENT_NOT_FOUND' using errcode = '42501';
  end if;

  -- A reward credit books an order of zero, so this separates a run someone
  -- paid for from one they were given.
  select coalesce(bo.amount, 0) > 0 into paid
  from public.billing_orders bo where bo.id = entitlement_order_id;
  paid := coalesce(paid, false);

  -- 자소서 한 문항이 500~1,000자이므로, 참고자료 예산은 공고 한 편과 이력서·경력
  -- 기술서를 넉넉히 담고도 남습니다. QUICK은 자소서만 보는 상품이라 절반이면
  -- 충분합니다.
  per_document_limit := 20000;
  if target_run.product = 'QUICK' then
    reference_budget := 20000;
  else
    reference_budget := 60000;
  end if;

  -- 무료 이용권은 절반입니다. 자소서 첨삭 자체는 그대로 받되, 원가의 대부분을
  -- 차지하는 참고자료 쪽을 줄입니다. 자소서를 줄이면 추천 보상이 "친구가 결제한
  -- 것과 같은 상품"이라는 약속을 어기게 됩니다.
  if not paid then
    per_document_limit := per_document_limit / 2;
    reference_budget := reference_budget / 2;
  end if;

  update public.analysis_entitlements
  set status = 'CONSUMED', consumed_by_analysis_run_id = target_run.id,
      consumed_at = timezone('utc', now())
  where id = entitlement_id;

  update public.analysis_runs
  set status = 'RUNNING', started_at = timezone('utc', now()), failure_code = null,
      attempt_count = attempt_count + 1
  where id = target_run.id;

  with visible as (
    select
      si.purpose,
      d.kind,
      d.created_at,
      v.original_filename,
      -- Trimmed per document first, so one huge file cannot crowd out the rest.
      left(v.normalized_text, per_document_limit) as text,
      -- The order the budget is spent in. A posting the analysis compares
      -- against matters more than a certificate scan, so it is served first and
      -- 기타 증빙 is what falls off the end.
      case d.kind
        when 'JOB_POSTING' then 1
        when 'RESUME' then 2
        -- 자격·증명서는 이력서 바로 다음입니다. 이것이 대조의 짝이라서입니다:
        -- 자소서가 "직업상담사 2급 보유"라고 말할 때 그 말이 참인지 아는 방법이
        -- 이 문서뿐입니다. 예전에는 `기타`로 묶여 맨 뒤(6)에 섰고, 자료를 많이
        -- 넣을수록 먼저 잘렸습니다 — 자료를 많이 넣는 사람이 FINAL 손님입니다.
        when 'CERTIFICATE' then 3
        -- 지원자가 "서류에 없다"며 직접 적어 준 사실입니다. 길어야 4,000자라
        -- 앞에 두어도 뒤가 굶지 않고, 잘리면 그 칸의 뜻이 사라집니다.
        when 'APPLICANT_NOTE' then 4
        when 'CAREER_DOCUMENT' then 5
        when 'REVISION_REQUEST' then 6
        when 'PORTFOLIO' then 7
        else 8 end as priority
    from public.submission_snapshot_items si
    join public.document_versions v on v.id = si.document_version_id
    join public.documents d on d.id = v.document_id
    where si.snapshot_id = target_run.submission_snapshot_id
      and v.normalized_text is not null
      and length(btrim(v.normalized_text)) > 0
      and (d.kind not in ('OTHER', 'REVISION_REQUEST', 'APPLICANT_NOTE') or target_run.product in ('PRO', 'FINAL'))
  ), budgeted as (
    select
      visible.*,
      case when purpose = 'PRIMARY' then 0 else
        sum(case when purpose = 'PRIMARY' then 0 else length(text) end)
          over (order by priority, created_at rows between unbounded preceding and current row)
      end as spent
    from visible
  )
  select jsonb_agg(jsonb_build_object(
    'kind', case kind
      when 'COVER_LETTER' then 'cover_letter'
      when 'JOB_POSTING' then 'job_posting'
      when 'RESUME' then 'resume'
      when 'CAREER_DOCUMENT' then 'career_description'
      when 'PORTFOLIO' then 'portfolio'
      when 'REVISION_REQUEST' then 'revision_request'
      -- 예전에는 자격증이 'portfolio'라는 이름을 달고 갔습니다. 모델이 읽는
      -- 것은 이 이름이라, 증빙 서류가 작품집으로 소개되고 있었습니다.
      when 'CERTIFICATE' then 'certificate'
      -- 예전에는 'portfolio'였습니다. 모델이 읽는 것은 이 이름이라, 지원자가
      -- 근거로 쓰라고 적어 준 사실이 작품집으로 소개되고 있었습니다.
      when 'APPLICANT_NOTE' then 'applicant_note'
      else 'portfolio' end,
    'text', text,
    'filename', original_filename
  ) order by purpose, created_at) into request_documents
  from budgeted
  -- The cover letter is never dropped and never trimmed: it is what was bought.
  where purpose = 'PRIMARY' or spent <= reference_budget;

  return jsonb_build_object(
    'analysisRunId', target_run.id,
    'request', jsonb_build_object(
      'requestId', target_run.application_case_id,
      'product', target_run.product,
      'writingMode', target_run.writing_mode,
      'writingStyle', target_run.writing_style,
      'editingStance', target_run.editing_stance,
      'targetLength', target_run.target_length,
      'documents', coalesce(request_documents, '[]'::jsonb)
    )
  );
end;
$$;

commit;
