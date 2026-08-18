# 2026-08-17 현재 공유 상태 업데이트

- QUICK Sandbox 결제·webhook·entitlement·분석 실행 흐름은 로컬 E2E 확인 단계입니다.
- DOCX 줄바꿈으로 인한 원문 근거 검증 오판을 수정했고, QUICK 관련 typecheck/test를 통과했습니다.
- 빈 문항은 QUICK에서 임의 생성하지 않으며, BUILD 사용자는 빈 문항 보완을 위해 PRO · 내용 보완으로 안내합니다.
- PRO 입력 UI는 있으나 PRO 결제 CTA와 실제 PRO 분석 실행 연결은 아직 미완료입니다.
- 분석 시간 UX는 상단 상태바를 유지한 채 하단에 예상 2~5분, 단계 안내, 진행 바, 경과 시간, 5분 초과 안내를 추가했습니다.
- 상세 상태·명령어·다음 우선순위는 루트 `DEVELOPMENT-HANDOFF.md`를 기준으로 합니다.
# 2026-08-17 최신 상태

- Google 로그인 버튼·callback·Noto Sans KR 복원 완료, 커밋 `9fcd617` 푸시 완료.
- 홈과 `/analysis/prepare` 가독성 조정은 로컬 미커밋 상태.
- typecheck, lint, 131개 테스트, build 통과.

## 다음 작업

1. 로컬 100%에서 홈과 `/analysis/prepare` 가독성 확인.
2. 괜찮으면 가독성 변경 커밋 후 결과·PRO 화면에도 적용.
3. 배포 후 Google 로그인 → Polar sandbox → QUICK 분석 → 결과 화면 E2E 테스트.

# 2026-08-17 입력 드롭존 및 높이 조정 업데이트

- 추가 경험·정보 입력 textarea 최소 높이를 132px에서 76px로 줄였다. 첨부 파일 목록은 입력창 상단에 표시된다.
- 채용공고 입력 영역 전체에 드래그앤드롭을 추가하고 드래그 상태를 시각화했다. 기존 파일 선택 버튼도 유지한다.
- 자기소개서는 현재 전체 붙여넣기 또는 파일 1개 흐름이 명확하므로 큰 드롭존은 추가하지 않았다.
- 타입체크, 린트, Vitest 131개 통과.

다음: Auth Redirect 확인 후 QUICK/PRO E2E. Polar 결제 환경변수는 아직 필요하다.
# 2026-08-17 입력 UX 및 파일 첨부 업데이트

## 완료

- 채용공고 입력 textarea를 4행/최소 88px에서 2행/최소 58px로 축소했다.
- 추가 경험·정보 입력 영역에 파일 선택과 드래그앤드롭을 연결했다.
- 추가 정보 첨부는 현재 브라우저 로컬 추출 형식인 PDF, DOCX, TXT, MD만 지원하며 UI에 형식을 안내한다.
- JPG/PNG 사진 OCR은 아직 구현하지 않았으므로 지원 예정 상태로 명시했다. 파일을 선택하거나 놓는 순간 외부 API/OCR을 호출하지 않는다.
- 타입체크, 린트, Vitest 131개, Next 프로덕션 빌드가 모두 통과했다.

## 다음 단계

- 사용자가 .env.local에 실제 OPENAI_API_KEY와 OPENAI_MODEL=gpt-5.6-terra 값을 저장해야 한다(현재 키 이름만 있고 값이 비어 있을 수 있음).
- Supabase Auth Redirect URL에 /auth/callback을 등록한 뒤 로그인부터 QUICK/PRO 실제 E2E를 진행한다.
- 결제 후 서버 분석/OCR 연동은 별도 단계로 남아 있다.
# 2026-08-17 Supabase 원격 migration 적용 체크포인트

마지막 갱신: 개발 프로젝트 원격 migration 적용 및 DB lint 완료

이 섹션이 아래의 이전 "현재 다음 작업" 안내보다 우선한다.

## 현재 단계와 진행률

- 현재: Supabase DB 연결 완료 → Auth/실제 저장 E2E 준비
- 전체 MVP 예상 진행률: 약 87~89%
- 다음은 사용자 Auth Redirect 확인과 OpenAI/Polar sandbox 설정 차례다.

## 완료

- Supabase 프로젝트 oiucnkrknedqyktnwbce에 migration 9개를 적용했다.
- 최초 8개 중 QUICK orchestration SQL 조건 위치 오류를 수정하고 남은 migration을 정상 적용했다.
- 원격 DB lint에서 발견된 pgcrypto digest 스키마 오류를 보정 migration으로 수정했다.
- 원격 migration 이력은 로컬과 일치하고 dry-run은 up to date다.
- 원격 public schema lint 결과는 오류 0건이다.
- Docker 부재 경고는 로컬 catalog 캐시에만 해당하며 원격 적용은 완료됐다.

## 현재 다음 작업

사용자가 Supabase Dashboard의 Auth URL Configuration에 localhost Site URL과 /auth/callback Redirect URL을 등록했는지 확인한다. 이후 OpenAI API key/model을 설정하면 Auth 로그인·비공개 저장·실제 QUICK AI E2E를 진행한다. Polar webhook은 외부 공개 URL이 준비된 뒤 연결한다.

실제 OpenAI·Polar 호출과 배포는 아직 실행하지 않았다.

---


# 2026-08-17 외부 서비스 사용자 인계 체크포인트

마지막 갱신: Supabase 최신 키 체계 전환과 사용자 설정 체크리스트 확정

이 섹션이 아래의 이전 "현재 다음 작업" 안내보다 우선한다.

## 현재 단계와 진행률

- 현재: QUICK MVP 로컬 구현·보안 감사 완료 → 외부 sandbox 연결 직전
- 전체 MVP 예상 진행률: 약 80~85%
- 지금은 사용자 작업 차례다.

## 이번 완료

- Supabase 레거시 anon/service-role 환경변수를 publishable/secret 키 체계로 교체했다.
- 브라우저는 publishable key만 사용하고 서버 elevated client는 secret key만 사용한다.
- readiness 검사와 테스트·환경 예시도 새 키 이름으로 통일했다.
- docs/external-service-setup-handoff.md에 Supabase·OpenAI·Polar 설정과 역할 분담을 기록했다.
- OpenAI 초기 모델 기본 권장값은 품질·비용 균형형 gpt-5.6-terra로 정했다.

## 사용자 작업

비밀값을 채팅에 보내지 말고 .env.local에 입력한다. Supabase 프로젝트 생성·Auth Redirect 설정·CLI link, OpenAI API key, Polar sandbox token/product/webhook 준비 후 npm run check:e2e 출력만 공유한다.

실제 OpenAI·Polar 호출, 원격 migration, 배포는 아직 실행하지 않았다.

---


# 2026-08-17 첫 migration 보안 감사 체크포인트

마지막 갱신: 분석 쓰기 권한·Checkout RPC·Snapshot 불변성 보안 결함 수정

이 섹션이 아래의 이전 "현재 다음 작업" 안내보다 우선한다.

## 완료

- 인증 사용자의 AnalysisRun 상태 직접 UPDATE 정책을 제거했다.
- 인증 사용자의 AnalysisResult 직접 INSERT 정책을 제거해 AI 결과 쓰기를 service-role 경계로 제한했다.
- RLS 때문에 실패하던 Checkout intent 쓰기 RPC를 `auth.uid()` 소유권 검증형 `security definer`로 수정했다.
- 사용되지 않는 authenticated entitlement 직접 소비 권한을 제거했다.
- AnalysisRun이 참조한 Snapshot은 항목 추가·삭제가 불가능하도록 RLS를 재정의했다.
- QUICK 실행 시 PRIMARY Snapshot 글자수를 다시 계산해 entitlement의 허용 글자수와 비교한다.
- 관련 보안 조건을 migration 회귀 테스트로 고정했다.

## 현재 다음 작업

환경 자격 증명이 준비되면 원격 적용 전에 `npm run db:remote:list`와 `npm run db:remote:plan` 결과를 검토한다. Docker가 준비되면 원격보다 먼저 로컬 `supabase start`와 `db reset`으로 실제 PostgreSQL migration 문법·RLS 동작을 검증하는 것이 가장 안전하다.

실제 OpenAI·Polar 호출, 원격 migration, 배포는 아직 실행하지 않았다.

---
# 2026-08-17 Supabase CLI·Auth 로컬 기반 체크포인트

마지막 갱신: 프로젝트 고정 Supabase CLI와 로컬 Auth callback 설정 완료

이 섹션이 아래의 이전 "현재 다음 작업" 안내보다 우선한다.

## 완료

- 공식 권장 방식대로 Supabase CLI 2.114.0을 dev dependency로 고정했다.
- 기존 migration을 보존하면서 `supabase/config.toml`을 초기화했다.
- 로컬 Auth redirect allow-list에 `localhost`와 `127.0.0.1`의 `/auth/callback`을 등록했다.
- 원격 migration은 목록 조회, dry-run, 실제 push 명령을 분리했다.
- readiness 점검기가 프로젝트 로컬 CLI와 Auth callback config도 확인한다.
- 현재 CLI와 로컬 config는 READY다.

## 현재 blocker와 다음 작업

현재 작업 환경에는 Docker가 없어 로컬 Supabase stack을 실행할 수 없고, 원격 Supabase 프로젝트도 아직 link되지 않았다. 사용자가 sandbox 프로젝트와 환경변수를 준비하면 먼저 `npx supabase login`, `npx supabase link --project-ref <ref>`, `npm run db:remote:list`, `npm run db:remote:plan` 순서로 확인한다. dry-run 결과를 검토한 뒤에만 `npm run db:remote:push`를 실행한다.

실제 OpenAI·Polar 호출, 원격 migration, 배포는 아직 실행하지 않았다.

---

# 2026-08-17 외부 E2E 준비 점검 체크포인트

마지막 갱신: 비밀값 비노출 E2E readiness 명령과 현재 환경 진단 완료

이 섹션이 아래의 이전 "현재 다음 작업" 안내보다 우선한다.

## 완료

- `npm run check:e2e`로 Supabase·Polar·OpenAI·사이트 URL 설정 여부를 한 번에 점검한다.
- 점검 결과에는 비밀값을 출력하지 않고 누락된 환경변수 이름만 표시한다.
- Auth callback route, Supabase migration 파일, Supabase CLI 설치 여부도 확인한다.
- dotenv 파싱과 비밀값 비노출을 테스트로 고정했다.
- 현재 작업 환경에는 실제 환경변수와 Supabase CLI가 아직 없다.
- 전체 128개 테스트와 TypeScript 검사를 통과했다.

## 현재 다음 작업

사용자가 `.env.local`에 sandbox 자격 증명을 설정하고 Supabase CLI를 설치·로그인해야 원격 작업을 계속할 수 있다. 그 후 `npm run check:e2e`가 모두 READY인지 확인하고, migration 적용과 Auth Redirect URL `/auth/callback` 등록을 거쳐 결제 → webhook → entitlement → OpenAI → 결과/실패 복구 E2E를 실행한다.

실제 OpenAI·Polar 호출, 원격 migration, 배포는 아직 실행하지 않았다.

---

# 2026-08-17 QUICK 실패·재시도·이용권 복구 체크포인트

마지막 갱신: 일시적 AI 장애의 제한 재시도와 미제공 분석의 이용권 자동 복구 완료

이 섹션이 아래의 이전 "현재 다음 작업" 안내보다 우선한다.

## 완료

- AnalysisRun에 `attempt_count`를 저장하고 동일 Snapshot 실행을 최대 2회로 제한했다.
- OpenAI Responses API 호출 장애만 일시 오류로 분류해 자동 재시도한다.
- 첫 일시 오류는 AnalysisRun을 PENDING으로 되돌리고 기존 entitlement를 ACTIVE로 복구한다.
- 두 번째 일시 오류와 AI 출력 검증 실패·기타 오류는 FAILED로 종료한다.
- 결과가 제공되지 않은 모든 실패에서는 소비된 entitlement를 복구해 재결제를 요구하지 않는다.
- 실패 RPC는 실행 소유권과 RUNNING 상태를 잠금 검증하고 service-role에만 허용한다.
- 재시도 가능 여부는 서버의 안정적인 오류 분류값으로만 전달하며 문서 전문은 기록하지 않는다.
- 전체 125개 테스트, TypeScript, ESLint, 프로덕션 빌드를 통과했다.

## 현재 다음 작업

이제 로컬 핵심 흐름은 연결됐다. 다음 우선순위는 사용자 환경에서 Supabase migration 적용, Auth Redirect URL의 `/auth/callback` 등록, Polar sandbox webhook/Checkout 및 OpenAI API 키 설정 후 결제 → entitlement → AI 실행 → 실제 결과 → 실패 복구 E2E를 검증하는 것이다.

실제 OpenAI·Polar 호출, 원격 migration, 배포는 아직 실행하지 않았다.

---

# 2026-08-17 결제 복귀 자동 분석 체크포인트

마지막 갱신: Polar 결제 복귀 → entitlement 확인 → QUICK 실행 → 실제 결과 이동 연결 완료

## 완료

- checkout_id 기반 소유자 전용 상태 조회 RPC/API를 추가했다.
- 결제 webhook 반영을 최대 약 90초 동안 polling한다.
- ACTIVE entitlement가 확인되면 QUICK 실행 API를 한 번만 호출한다.
- RUNNING이면 상태를 계속 확인하고 COMPLETED/결과 존재 시 실제 결과 화면으로 이동한다.
- FAILED·REVOKED·장시간 지연 시 재결제를 막는 안내를 표시한다.
- 결제·분석 상태 안내 UI를 분석 준비 화면 상단에 연결했다.
- 전체 123개 테스트, TypeScript, ESLint, 프로덕션 빌드를 통과했다.

## 현재 다음 작업

외부 환경 준비 전 마지막 핵심 로컬 작업은 실패·재시도 정책을 명확히 하는 것이다. AI provider 일시 장애에서는 entitlement를 안전하게 복구하고 같은 Snapshot으로 새 AnalysisRun 또는 제한된 재시도를 제공해야 한다. 이후 실제 Supabase migration과 Polar/OpenAI sandbox E2E를 진행한다.

실제 OpenAI·Polar 호출, 원격 migration, 배포는 아직 실행하지 않았다.

---

# 2026-08-17 QUICK 분석 orchestration 체크포인트

마지막 갱신: entitlement 소비 → QUICK AI → AnalysisResult 저장 → 실제 결과 조회 연결 완료

## 완료

- AnalysisRun에 요청 당시 `target_length`를 저장한다.
- service-role RPC가 소유자·PENDING 상태·ACTIVE entitlement를 잠금 검증하고 1회 소비한다.
- 정확한 SubmissionSnapshot 문서 버전만 QUICK AnalysisRequest로 구성한다.
- AnalysisRun을 RUNNING으로 전환한 뒤 QUICK provider를 실행한다.
- 성공 결과는 Zod 검증 후 AnalysisResult와 모델·토큰·프롬프트 버전을 저장하고 COMPLETED 처리한다.
- 실패 시 지원서 원문 없이 안정적인 failure code만 기록한다.
- 인증 사용자용 `POST /api/analysis-runs/quick/execute`를 추가했다.
- `/result?analysisRunId=...`가 RLS로 실제 결과를 조회해 기존 결과 작업공간에 표시한다.
- 전체 120개 테스트, TypeScript, ESLint, 프로덕션 빌드를 통과했다.

## 현재 다음 작업

Polar 결제 성공 복귀 화면에서 webhook으로 entitlement가 지급됐는지 확인한 뒤 QUICK 실행 API를 호출하고, RUNNING/COMPLETED 상태를 사용자에게 보여주는 연결이 다음 우선순위다. 외부 환경 준비 후에는 전체 migration 적용과 sandbox 결제 E2E를 실행한다.

실제 OpenAI·Polar 호출, 원격 migration, 배포는 아직 실행하지 않았다.

---

# 2026-08-17 Checkout intent 체크포인트

마지막 갱신: AnalysisRun별 Polar Checkout 재사용과 완료 상태 연결 완료

## 완료

- `checkout_intents` 테이블과 소유자 RLS를 추가했다.
- AnalysisRun당 intent 하나만 허용하고 만료 전 OPEN Session을 재사용한다.
- 동시 요청에서 새 Session이 여러 개 생성돼도 DB 등록 결과는 최초 활성 Session을 반환한다.
- 만료된 Session은 EXPIRED 처리 후 새 Session으로 교체한다.
- `order.paid` entitlement 지급 후 intent를 SUCCEEDED로 갱신한다.
- 전체 113개 테스트, TypeScript, ESLint, 프로덕션 빌드를 통과했다.

## 현재 다음 작업

외부 환경 준비 후 Supabase migration 적용과 Polar sandbox 결제 → webhook → entitlement 소비 E2E가 다음 우선순위다. 환경 준비 전 로컬 다음 작업은 결제 성공 후 AnalysisRun 실행·AnalysisResult 저장 orchestration 경계를 구현하는 것이다.

실제 Polar 호출, 원격 migration, 배포는 아직 실행하지 않았다.

---

# 2026-08-17 QUICK 결제 CTA 체크포인트

마지막 갱신: 지원 건 저장 후 Polar Checkout 이동 UI 연결 완료

이 섹션이 아래의 이전 "다음 작업" 안내보다 우선한다.

## 완료

- ApplicationCase 저장 응답의 `analysisRunId`를 결제 단계에 연결한다.
- QUICK 저장 완료 후 `결제하고 분석 시작` CTA를 표시한다.
- CTA가 `POST /api/checkouts/quick`을 호출하고 반환된 Polar Checkout URL로 이동한다.
- API 오류·네트워크 오류·응답 URL 누락을 현재 화면에 표시하고 저장 상태를 유지한다.
- PRO에서는 QUICK 결제 API를 호출하지 않는다.
- 전체 110개 테스트, TypeScript, ESLint, 프로덕션 빌드를 통과했다.

## 현재 다음 작업

같은 AnalysisRun에 이미 열린 Polar Checkout Session을 DB에 기록하고 재사용하는 checkout intent migration/API를 구현한다. 그다음 실제 Supabase migration과 Polar sandbox 자격 증명이 준비되면 결제 → webhook → entitlement E2E를 검증한다.

실제 Polar 호출, 원격 migration, 배포는 아직 실행하지 않았다.

---

# 2026-08-17 Polar Checkout API 체크포인트

마지막 갱신: sandbox Checkout Session 어댑터와 인증 QUICK checkout API 구현 완료

이 섹션이 아래의 이전 "다음 작업" 안내보다 우선한다.

## 완료

- 공식 Polar SDK로 KRW 세금 포함 ad-hoc Checkout Session을 생성한다.
- `POST /api/checkouts/quick`은 로그인과 동일 출처를 확인한다.
- 클라이언트는 `analysisRunId`만 보내며 가격·지원 건·글자 수·metadata는 서버와 DB Snapshot이 결정한다.
- 사용자 소유 PENDING QUICK 실행, PRIMARY 문서와 기존 활성 entitlement를 DB RPC에서 확인한다.
- 할인코드와 trial을 비활성화하고 sandbox를 기본 환경으로 사용한다.
- 전체 110개 테스트, TypeScript, ESLint, 프로덕션 빌드를 통과했다.

## 현재 다음 작업

1. 분석 준비 화면의 결제 CTA를 새 checkout API에 연결한다.
2. 같은 AnalysisRun의 열린 Checkout을 기록·재사용해 중복 클릭으로 여러 결제 페이지가 생성되는 위험을 줄인다.
3. 환경이 준비되면 Supabase migration 적용 후 Polar sandbox 결제·webhook·entitlement E2E를 검증한다.

실제 외부 Checkout 호출, 원격 migration, 배포는 아직 실행하지 않았다.

---

# 2026-08-17 Polar 결제 권한 체크포인트

마지막 갱신: 공식 SDK webhook 검증, 주문·entitlement migration, 환불 정책 구현 완료

이 섹션이 아래의 이전 "다음 작업" 안내보다 우선한다.

## 완료

- `@polar-sh/sdk` 공식 webhook 검증기를 도입했다.
- `/api/webhooks/polar`에서 raw body 서명 확인 후 `order.paid`와 `order.refunded`를 처리한다.
- 상품 ID, 통화, 결제금액, 글자 수 entitlement metadata를 서버 계산값과 교차 검증한다.
- Polar event/order 중복 지급 방지, 결제 주문, 1회용 QUICK entitlement migration을 추가했다.
- 지급·환불은 service role 전용, 조회·소비는 소유자 RLS/RPC로 분리했다.
- 분석 실행 전 PENDING AnalysisRun에 사용권을 원자적으로 1회 소비할 수 있다.
- 전체·부분 환불 및 이미 소비된 주문의 환불 정책을 구현했다.
- 전체 103개 테스트, TypeScript, ESLint를 통과했다.

## 현재 다음 작업

Codex가 다음으로 할 작업은 Polar sandbox Checkout Session 생성 어댑터와 인증 사용자용 checkout API다. 이후 사용자에게 sandbox 자격 증명과 Supabase migration 적용이 준비되면 실제 결제·중복 webhook·환불 E2E를 검증한다.

실제 Polar API 호출, 원격 migration, 배포는 아직 실행하지 않았다.

---

# 2026-08-17 최신 작업 상태

마지막 갱신: OpenAI Responses API와 한국어 Eval 12개를 연결하는 live runner 구현 완료

이 섹션이 아래의 2026-08-16 및 오래된 "다음 작업" 안내보다 우선한다.

## 방금 완료

- Eval fixture를 QUICK `AnalysisRequest`로 변환하는 순차 실행 runner를 추가했다.
- `npm run eval:live`에서 12개 fixture를 실제 OpenAI Structured Output과 비교할 수 있다.
- 일반 테스트에서는 live 파일을 제외해 API 비용이 발생하지 않는다.
- `RUN_LIVE_EVAL=1`, `OPENAI_API_KEY`, `OPENAI_MODEL`이 모두 있어야 호출되도록 차단했다.
- 원문과 전체 출력은 로그에 남기지 않고 사례 ID, 실패 코드, 모델·응답 ID·토큰 메타데이터만 출력한다.
- 선택적 채용공고 문맥을 QUICK 프롬프트 입력에 전달한다.
- mock runner 테스트를 포함해 전체 91개 테스트, TypeScript, ESLint를 통과했다.

## 현재 다음 작업

사용자 측 준비:

1. OpenAI API key와 사용할 모델을 로컬 `.env.local`에 설정한다.
2. 실제 유료 12회 호출을 허용할 때만 `RUN_LIVE_EVAL=1`을 설정한다.
3. Supabase migration 적용과 Auth Redirect URL `/auth/callback` 등록은 실제 E2E 연결 전에 필요하다.

Codex 측 다음 작업:

1. 사용자 승인 후 `npm run eval:live`를 실행하고 실패 유형·토큰 사용량을 분석한다.
2. Eval을 통과한 뒤 Polar checkout/webhook/entitlement를 구현한다.
3. 로그인 → ApplicationCase → entitlement → AnalysisRun → AnalysisResult → 결과 화면 E2E를 연결한다.

실제 OpenAI 유료 호출, 원격 migration, Polar 설정, 배포는 아직 실행하지 않았다.

---

# 2026-08-16 최신 작업 상태

마지막 갱신: QUICK 한국어 Eval 12개와 자동 평가기 구현 완료

이 섹션이 아래의 오래된 "다음 작업" 안내보다 우선한다.

## 방금 완료

- 실제 지원자 자료를 사용하지 않는 한국어 합성 Eval fixture 12개를 추가했다.
- CREATE, BUILD, POLISH와 담백하게, 균형 있게, 강점 살리기 축을 모두 포함했다.
- Structured Output, 새 수치, 잘못된 근거 인용, 분량, 금지 주장, 사실 보존, 확인 질문, 개선 우선순위를 자동 검사한다.
- 우선순위의 `evidenceQuote`도 반드시 원문 일부여야 하도록 QUICK 검증기를 강화했다.
- `npm run eval` 독립 실행 명령과 평가기 회귀 테스트 6개를 추가했다.
- 상세 운영 기준은 `docs/quick-korean-eval-strategy.md`에 기록했다.

## 현재 다음 작업

외부 서비스 자격 증명이 준비되기 전에는 큰 기능을 더 늘리지 않는다. 다음 의미 있는 작업은 아래 순서다.

1. 사용자가 Supabase 프로젝트에 최신 migration을 적용하고 Auth Redirect URL에 `/auth/callback`을 등록한다.
2. OpenAI, Supabase, Polar sandbox 환경변수를 로컬에 설정한다.
3. Codex가 OpenAI Responses API 실제 호출을 12개 Eval과 연결한다.
4. Polar checkout/webhook/entitlement를 연결한다.
5. 로그인 → ApplicationCase 저장 → 결제 권한 확인 → AnalysisRun → AnalysisResult → 결과 화면의 E2E를 검증한다.

원격 migration 적용, 외부 결제 설정, 배포는 아직 진행하지 않았다. 비밀값은 채팅이나 저장소에 올리지 않고 로컬 `.env.local` 또는 배포 환경의 secret 저장소에만 둔다.

---

# MOOA Resume 개발 체크포인트

기준일: 2026-08-16
마지막 갱신: 2026-08-16 — Supabase OTP·게스트 ApplicationCase 인계·AnalysisRun RLS 구현

## 이 문서의 관리 규칙

이 파일은 일회성 기록이 아니라 항상 최신 상태를 유지하는 Living Checkpoint다.

- `중간저장`, `내일 할 것`, `다음 작업 기록`, `오늘은 여기까지` 요청이 오면 이 문서를 최신화한다.
- 과거의 다음 작업을 계속 누적하지 않고, 현재 최우선 작업으로 교체한다.
- 완료된 항목은 현재 구현 상태로 이동하고 남은 작업에서 제거한다.
- 막힌 이유, 필요한 사용자 설정·키, 다음 재개 지점을 함께 기록한다.
- 기존 결정이 바뀌면 이전 내용은 삭제하거나 `폐기·대체됨`으로 명확히 표시한다.
- 문서만 읽어도 다음 세션이 바로 작업을 재개할 수 있어야 한다.
- 더 새로운 체크포인트 파일을 만들면 `AGENTS.md`의 현재 파일 경로도 함께 변경한다.

## 기술 SEO 완료 상태

- 홈과 예시 페이지에 고유 title, description, canonical URL을 적용했다.
- Open Graph, Twitter 카드, 동적 공유 이미지, 앱 아이콘과 웹 매니페스트를 추가했다.
- `robots.txt`와 `sitemap.xml`을 Next.js 메타데이터 라우트로 생성했다.
- 검색에 노출할 공개 페이지는 홈과 예시 페이지로 제한했다.
- 입력·분석·결제·결과 등 사용자 작업 페이지에는 `X-Robots-Tag: noindex`를 적용했다.
- Organization, WebSite, Service JSON-LD 구조화 데이터를 홈에 적용했다.
- Google과 Naver 사이트 소유권 확인값을 환경변수로 주입할 수 있게 했다.
- `NEXT_PUBLIC_SITE_URL`을 기준으로 운영 도메인의 절대 URL을 생성한다.
- 테스트 64개, 빌드, 타입 검사, 린트를 모두 통과했다.
- 배포 후 해야 할 일은 `docs/seo-release-checklist.md`에 정리했다.

### 운영 도메인 확정 후 필요한 사용자 작업

1. `NEXT_PUBLIC_SITE_URL`에 실제 HTTPS 대표 도메인을 설정한다.
2. Google Search Console과 네이버 서치어드바이저에서 소유권 확인값을 발급해 환경변수에 넣는다.
3. 배포 후 두 검색도구에 `/sitemap.xml`을 제출한다.
4. www 사용 여부를 하나로 정하고 다른 주소는 대표 주소로 301 리다이렉트한다.
5. 실제 검색 유입을 늘릴 기업·직무별 고유 콘텐츠 페이지는 품질 기준과 법적 표현을 검토한 뒤 단계적으로 만든다.

## 재개 시 가장 먼저 할 작업

**Polar Checkout·Webhook·entitlement 경계를 구현한다.**

Supabase 게스트 인계 기반은 완료됐다.

- 이메일 OTP 로그인과 callback
- 동일 출처·인증 사용자 전용 ApplicationCase API
- ApplicationCase, immutable DocumentVersion, SubmissionSnapshot, PENDING AnalysisRun 원자적 생성
- AnalysisRun·AnalysisResult 테이블과 소유자 RLS
- authenticated 전용 security invoker RPC
- 입력 검증·DB 오류 비노출·RLS 정적 회귀 테스트

다음 재개 흐름:

~~~text
저장된 application_case_id와 analysis_run_id
→ Polar Checkout metadata에 기록
→ 서명 검증 Webhook
→ 중복 처리 가능한 entitlement 지급
→ 소유권·미사용 이용권 확인
→ QuickAnalysisProvider 실행
→ AnalysisResult 저장과 Result Dashboard 연결
~~~

Supabase 환경변수와 마이그레이션이 실제 프로젝트에 적용돼야 OTP·저장이 동작한다. 프로덕션 배포와 원격 마이그레이션 적용은 아직 하지 않았다.

## 최근 완료된 변경 요약

- 모든 PRO 유형에 형식 없는 `추가로 알려주고 싶은 경험·정보` 입력을 기본 제공한다.
- 기존 자격·스펙·경험 상세 폼은 `경험을 하나씩 자세히 추가하기` 선택 영역으로 이동했다.
- CREATE도 공통 PRO 입력 화면을 사용하되, 자기소개서 즉시 생성 대신 경험 후보·소재 선택·2~4개 사실 확인을 선행한다.
- 상세 결정과 안전 규칙은 `docs/pro-freeform-experience-and-create-flow.md`에 기록했다.
- 모든 PRO 유형에 담백하게 / 균형 있게 / 강점 살리기 작성 스타일을 추가했다.
- 균형 있게를 기본 추천값으로 사용하고 내부 Narrative Latitude 1 / 2 / 3에 연결했다.
- POLISH는 강점 살리기에서도 원문 보존을 우선하며 유효 Latitude를 최대 2로 제한한다.
- CREATE는 정보가 충분하면 바로 초안을 제안하고 중요한 사실이 부족할 때만 2~4개를 질문한다.
- 추가 경험·정보를 직접 입력과 PDF·DOCX·TXT·MD 첨부가 가능한 올인원 Composer로 변경했다.
- 첨부 원문은 파일별 출처로 분리해 브라우저 세션에 보존한다.
- 채용공고 Composer는 기본 7행에서 4행으로 줄이고 내부 여백을 압축했다.
- 랜딩 순서를 `헤더 → 한 방에·원클릭 → Hero 입력 → 분석 완료 샘플 → 요금·기능표`로 정리했다.
- Hero 자기소개서 입력창 높이를 데스크톱 280px, 모바일 220px로 확대했다.
- 요금표 QUICK·PRO CTA는 결제가 아니라 무료 작성 단계 화면으로 이동한다.
- 전체 기능 비교표는 기본 펼침이며 사용자가 직접 닫을 수 있다.
- 기능표 마지막에 다층 분석, 입력·문항 교차검증, 지원자료·문항 교차검증, 독립 재검수 범위를 추가했다.
- 기능표는 최종 상품 명세이며 현재 모든 행이 실제 AI로 작동하는 것은 아님을 확인했다.
- 대기업 지원 홍보에 현대자동차 생산직, 기아, SK하이닉스, S-OIL을 지원 예시로 넣고 비제휴 안내를 표시했다.
- `서류 합격에서 끝나지 않는다`는 방향과 사용자가 지정한 최종 합격 목표 문구를 별도 선언 카드로 반영했다.
- 채용공고 URL·본문·파일을 하나의 Smart Input에서 받도록 통합했다.
- PRO 필수 입력이 빠졌을 때 빨간 안내, hover·click·focus 툴팁으로 차단 이유를 표시한다.
- 전체 자기소개서 복붙·파일 입력 후 일반 코드로 문항을 구분하고 사용자가 수정할 수 있게 했다.
- 실제 `신민규_자기소개서 - 복사.docx` 사례에서 `2번의 안전진단`을 문항으로 오인하던 버그를 수정했다.
- 자기소개서 구역 밖 이력서 학점과 경력기술서 빈 양식을 문항 답변에서 제외하도록 파서를 보강했다.
- 현재 자동화 검증은 64개 테스트, TypeScript, ESLint와 Next.js production build를 통과한 상태다.

## 현재 결정된 제품 방향

- CREATE, BUILD, POLISH는 같은 PRO 입구를 공유하지만 내부 작성 메커니즘은 분리한다.
- 자유입력 경험은 바로 문장에 사용하지 않고 후보 사실로 구조화한 뒤 필요한 항목만 사용자에게 확인한다.
- 자유입력은 기본, 구조화 상세 입력은 선택이라는 순서를 유지한다.
- Writing Mode와 Writing Style은 별도 축으로 유지한다.
- 작성 스타일은 의미 해석의 적극성만 바꾸며 사실 생성 허용 수준을 바꾸지 않는다.
- 어떤 스타일에서도 없는 경험·역할·사건·성과·수치를 만들지 않는다.
- 입력은 간단하게, 내부 분석은 문항별·단계별로 처리한다.
- 사용자는 자기소개서를 전체 복붙하거나 파일 하나로 올릴 수 있다.
- 채용공고는 URL·본문·파일을 하나의 스마트 입력창에서 받되 내부 출처는 분리한다.
- 상품 단위는 글자 수 묶음보다 한 회사·한 직무의 Application Case 1건을 우선한다.
- 사실은 보수적으로 보존하고, 경험의 의미와 직무 연결은 적극적으로 제안한다.
- 결과는 AI 채팅 답변이 아니라 문항별 Before/After, 수정 이유, 최종 첨삭본을 제공하는 작업공간으로 구성한다.
- 서류 첨삭에서 끝나지 않고 실제 지원현황과 면접 준비까지 연결한다.

## 현재 구현된 기반

### 랜딩과 상품 UX

- Hero 자기소개서 입력 및 파일 로컬 추출
- 한 방에·원클릭 시작 메시지
- 분석 완료 샘플
- QUICK 4,900원 / PRO 9,900원 / FINAL 14,900원 상품표
- 전체 기능 비교표 기본 펼침 및 사용자 접기
- 대기업 지원 홍보, 결과 학습, Narrative Policy, 최종 합격 지향 메시지
- 기업명은 지원 예시로만 표시하고 비제휴 안내 적용

### 입력과 분류

- CREATE / BUILD / POLISH 작성 단계
- PDF·DOCX·TXT·MD 로컬 텍스트 추출
- 전체 자기소개서 복붙 후 번호 기반 문항 분리
- 자기소개서 구역 탐지 및 이력서·경력기술서 구역 제외
- `2번의` 같은 답변 문장, 학점 숫자 등의 문항 오인식 방지
- 빈 양식 문구 제외
- 문항 제목, 실제 질문, 선택형 글자 수 제한, 답변 편집
- PRO 공고 URL·본문·첨부 통합 입력
- 이력서 밖 경험 및 자격·스펙 직접 추가 UI

### 결과와 장기 데이터 UX

- 샘플 Result Dashboard
- 문항별 Before/After, 수정 이유, 직접 편집
- 문항별 복사, 전체 복사, TXT 저장
- 최종 첨삭본 구역
- 지원자 프로필 카드
- 나의 지원현황 관리 프로토타입
- 제출 여부·지원 결과 Snapshot을 위한 DB 마이그레이션 초안

### 가격과 사용량 기반

- QUICK 권장 7,000자와 여유 한도 계산
- 추가 입력 블록과 동적 견적 도메인 로직
- Polar 동적 Checkout Gateway 초안
- API 작업별 토큰·비용 기록을 고려한 설계 문서

## 기능표와 실제 구현 상태

기능표는 최종 상품 범위 명세다. 현재 모든 항목이 실제 AI로 동작하는 것은 아니다.

### 실제로 동작하는 UI·일반 코드

- 입력, 로컬 파일 텍스트 추출, 문항 분리·편집
- 글자 수 계산과 QUICK 예상 견적
- 샘플 결과의 복사·편집·TXT 저장
- 공고 출처 입력과 세션 임시 저장
- 비활성 버튼의 누락 사유 안내

### 샘플 또는 프로토타입

- 지원서 준비도, 핵심 개선점, Before/After, 최종 첨삭본
- 지원자 프로필 자동 추출 결과
- 경험 매칭, 면접 예상질문과 리스크
- 지원현황과 Outcome 기록

### 실제 AI·서버 연결 필요

- 저장된 AnalysisRun의 Polar entitlement 검증 후 QUICK 실행 연결
- 실제 API Key와 모델을 사용한 한국어 Eval 및 비용 측정
- 실제 Result Dashboard의 case 결과 조회 연결
- 공고 URL 가져오기와 이미지 OCR
- 이력서·경력기술서·포트폴리오 구조화
- Candidate Facts와 Evidence Ledger
- 공고 요구사항·경험 후보·문항 의도 구조화
- 경험 추천, 부족 정보 질문, 사용자 사실 확인
- 자료·문항 간 충돌 검사와 독립 재검수
- 면접 세션, 동적 꼬리질문, 답변 평가, 최종 리포트
- Supabase 원격 마이그레이션 적용과 실제 프로젝트 통합 검증
- Polar 실제 Checkout·Webhook·이용권 지급

## 기능표 마지막 네 항목

| 기능 | QUICK | PRO | FINAL |
| --- | --- | --- | --- |
| 수백 가지 세부 기준 다층 분석 | 포함 | 포함 | 포함 |
| 입력 내용·문항 간 교차검증 | 포함 | 포함 | 포함 |
| 지원자료·문항 간 교차검증 | 미포함 | 포함 | 포함 |
| 분석 결과 독립 재검수 | 포함 | 포함 | 포함 |

주의: `수백 가지`는 출시 전 실제 내부 기준 레지스트리와 Eval로 근거를 확보해야 한다. 근거가 확보되지 않으면 `다양한 세부 기준 다층 분석`으로 변경한다.

## 다음 개발 권장 순서

### 1. QUICK 실제 첨삭 Vertical Slice

한 문항을 실제 입력해 결과 대시보드까지 완주하는 흐름을 먼저 완성한다.

1. 서버 전용 OpenAI 호출 모듈
2. QUICK prompt와 Structured Output schema
3. 원문·개선점·문장 피드백·수정 이유·최종본 반환
4. 사실·수치 변경 및 글자 수 검증
5. 실패·누락·타임아웃 재시도
6. 실제 결과를 Result Dashboard에 연결
7. 모델·토큰·예상 원가 기록

### 2. Supabase Application Case 기반

- 인증과 게스트 데이터 인계
- application_cases, document_versions, analysis_runs 저장
- Candidate Snapshot, Job Snapshot, Application Snapshot
- Storage와 RLS
- 원본 자료 보존기간 및 품질 개선 동의 분리

### 3. Polar 결제 경계

- 결제 전에는 AI 호출 금지
- Checkout metadata에 case_id, tier, allowed_chars 기록
- Webhook 검증 후 entitlement 지급
- 중복 Webhook과 실패·환불 처리

### 4. PRO 분석 파이프라인

문서 추출 → 사실 구조화 → 공고 분석 → 경험 랭킹 → 필요한 질문 → 작성 → 교차검수 순으로 구현한다.

### 5. FINAL 면접 세션

PRO가 실제 자료 기반으로 안정화된 후 세션 상태, 질문 선택, 답변 평가와 최종 리포트를 구현한다.

## 다음 작업 전에 사용자에게 필요한 것

- OpenAI API Key는 채팅에 붙이지 않고 로컬 `.env.local`에 직접 입력
- Supabase 프로젝트 URL과 anon key, 서버용 service role key 준비
- Polar sandbox access token과 webhook secret 준비
- 실제 결제를 붙이기 전 사업자·환불·개인정보 처리 문구 확정

키가 아직 없어도 다음 세션에서 mock gateway와 서버 인터페이스, DB 스키마, Eval fixture까지 먼저 개발할 수 있다.

## 현재 종료 판단

지금은 작업을 끊기 적절하다. 다음 단계는 화면을 조금 더 다듬는 작업보다 실제 QUICK AI 첨삭을 한 건 끝까지 통과시키는 Vertical Slice가 우선이다. API Key나 Supabase 설정을 사용자가 준비하는 동안에는 prompt schema, 검증기, fixture와 DB migration을 구현할 수 있다.
