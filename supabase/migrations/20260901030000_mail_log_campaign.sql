-- 발송 기록에 두 가지를 더합니다: 어느 캠페인의 메일이었는지, 그리고 메일
-- 제공자가 준 식별자.
--
-- provider_message_id가 없으면 "보냈다고 나오는데 안 왔다"를 확인할 방법이
-- 없습니다. 우리 쪽 기록은 "요청을 넘겼다"까지고, 그 뒤 배달 여부는 제공자의
-- 대시보드에 있습니다 — 그 둘을 잇는 것이 이 값입니다.
--
-- campaign_id는 협업 기관과 주고받은 메일을 캠페인 화면에서 되짚기 위한
-- 것입니다. 캠페인이 지워져도 발송 기록은 남아야 하므로 set null 입니다.

begin;

alter table public.mail_send_log
  add column if not exists provider_message_id text,
  add column if not exists campaign_id uuid references public.coupon_campaigns(id) on delete set null;

create index if not exists mail_send_log_campaign_idx
  on public.mail_send_log (campaign_id, sent_at desc);

commit;
