# 외부 서비스 연결 — 사용자 작업 체크리스트

현재 단계: QUICK MVP의 로컬 구현과 보안 감사 완료, 실제 sandbox E2E 시작 전

전체 MVP 예상 진행률: 약 80~85%

## 중요 보안 규칙

- API 키와 secret 값은 채팅에 보내지 않는다.
- 저장소에 커밋하지 않고 프로젝트 루트의 .env.local에만 입력한다.
- NEXT_PUBLIC_*에는 공개 가능한 Supabase publishable key만 둔다.
- Supabase secret key, OpenAI key, Polar token/webhook secret에는 절대 NEXT_PUBLIC_을 붙이지 않는다.

## 1. Supabase — 사용자 작업

Supabase에서 sandbox/development 프로젝트 하나를 만든 뒤 Dashboard의 Connect 또는 API Keys 화면에서 다음 값을 확인한다.

~~~dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
~~~

Auth > URL Configuration:

- Site URL: http://localhost:3000
- Redirect URL: http://localhost:3000/auth/callback

터미널에서 로그인과 프로젝트 연결:

~~~powershell
npx supabase login
npx supabase link --project-ref <project-ref>
~~~

여기까지만 사용자가 진행한다. db:remote:push는 아직 실행하지 않는다.

## 2. OpenAI — 사용자 작업

OpenAI API Dashboard에서 프로젝트 API 키를 생성하고 .env.local에 넣는다.

~~~dotenv
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-terra
RUN_LIVE_EVAL=
~~~

초기 sandbox 품질·비용 균형 기본값은 gpt-5.6-terra다. 실제 한국어 fixture eval 결과에 따라 이후 변경할 수 있다.

## 3. Polar Sandbox — 사용자 작업

Polar Sandbox에서 별도 조직과 access token을 만들고 QUICK용 Product를 하나 만든다.

~~~dotenv
POLAR_ACCESS_TOKEN=...
POLAR_WEBHOOK_SECRET=...
POLAR_QUICK_PRODUCT_ID=...
POLAR_SERVER=sandbox
~~~

Webhook endpoint:

~~~text
https://<외부에서 접근 가능한 주소>/api/webhooks/polar
~~~

구독 이벤트:

- order.paid
- order.refunded

localhost는 Polar가 직접 호출할 수 없으므로 공개 preview 배포 URL이나 안전한 개발 tunnel이 생긴 뒤 webhook을 등록한다.

## 4. 준비 확인 — 사용자 작업

~~~powershell
npm run check:e2e
~~~

출력 결과만 공유해도 된다. 키 값은 공유하지 않는다. 모든 항목이 READY가 되면 다음 단계는 Codex가 진행한다.

## 그다음 Codex 작업

1. 원격 migration 목록 확인
2. db:remote:plan dry-run 검토
3. 사용자 승인 후 migration 적용
4. Auth 로그인 및 비공개 저장 RLS E2E
5. Polar sandbox 결제·webhook·entitlement E2E
6. OpenAI 실제 QUICK 결과 및 실패 복구 E2E
7. 발견된 오류 수정과 출시 전 회귀 검증

## 남은 작업 예상

- 사용자 외부 서비스 설정: 약 5%
- 실제 sandbox E2E 및 수정: 약 10%
- 배포·출시 전 최종 점검: 약 5%

외부 서비스 설정이 끝나기 전까지 실제 결제와 AI 결과의 정상 동작은 확정할 수 없다.
