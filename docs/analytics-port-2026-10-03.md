# 무아레쥬메 AARRR·이용 분석 이식 (2026-10-03)

최초 로컬 검증 후 사용자가 커밋·푸시·웹 배포·앱 재빌드를 승인했다. 아래 최초 검증 기록과 마지막 릴리스 기록을 구분한다. 신규 외부 서비스와 패키지 추가 없음.

## 확인한 플랫폼과 기존 구조

- 웹: Next.js 16.3.1 App Router, React, strict TypeScript, Supabase Auth/PostgreSQL/RLS.
- 실제 출시 앱: 별도 `C:/6.mooaresume-android`의 Android TWA, `com.mooaresume.twa`. 운영 웹을 공통 인증으로 사용하며 새 빌드는 이 프로젝트에서 생성한다.
- 보존된 네이티브 변형: `apps/mobile`, Expo 57 / React Native 0.86.3. 기존 Android/iOS 공통 코드에 어댑터를 추가하고 번들을 검증했으나 현재 출시 앱이 아니다. 새 iOS 제품·스토어 출시·실기기·StoreKit 결제 지원을 주장하지 않는다.
- 기존 TWA/앱 웹 화면은 웹 트래커를 재사용한다. 설치 앱 컨텍스트는 Android/TWA로 구분하며 모바일 브라우저는 web이다.
- 웹·앱 회원은 기존 Supabase UUID와 검증된 access token으로 연결한다. 외부 HQ에는 수집하지 않고 MOOA 서버·DB에 저장한다.
- 관리자: 기존 `/meensoo` 및 `mooa_mail_admin` 서버 인증 그대로 사용.
- 첨부 ZIP은 `C:/Users/Public/Documents/ESTsoft/CreatorTemp/mooa-analytics-port-kit-20261003`에 전체 압축 해제했다. README, APPLY_PROMPT, 구현 상태, 포팅/API/DB/이벤트/의존성/검증 문서와 관련 소스를 확인했다. 원본 번역 기준과 SQL은 실행하거나 복사하지 않았다.
- 루트 `PROJECT_SPEC.md`는 없어서 실제 `MOOA_RESUME_PROJECT_SPEC.md`를 읽었다. 두 개발 체크포인트와 변경 기록도 확인했다.

## 실제 이벤트와 지표

| 이벤트 | 실제 발생 지점 | 근거 |
|---|---|---|
| session_started, page_viewed | 웹 초기 인증 확정/라우터, 네이티브 앱 시작/탭 | client_observed |
| signed_in | 기존 Supabase 인증 상태 변경 | client_observed; 회원 ID는 서버 검증 |
| app_foregrounded/backgrounded | 기존 RN AppState | client_observed |
| checkout_clicked | 웹 beginCheckout, 네이티브 purchase 직전 | client_observed, 매출 아님 |
| result_viewed | 실제 첨삭 결과 UI (샘플/관리자 제외) | client_observed |
| export_completed | 웹 DOCX/TXT Blob 다운로드 전달, 네이티브 클립보드 완료/PDF 파일 생성 | client_observed; 디스크 저장/공유 수신 확정 아님 |
| account_created | 인증 회원의 auth.users.created_at을 최초 수집 때 투영 | server_verified |
| case_saved | analysis_runs 삽입 트리거 | server_verified |
| core_completed | analysis_runs COMPLETED 전환, resume/career_description/portfolio/career_ai_builds USED 전환 | server_verified |
| order_paid/refunded | 기존 billing_orders 확정 상태 전환 | server_verified; 실제 매출은 아래 추가 검증 |
| referral_converted | 기존 referral_attributions CONVERTED + reward_credit_id | server_verified |

활성화는 실제 핵심 결과 완료 이용자 수다. 재사용은 서로 다른 KST 날짜의 핵심 결과 완료다. 생애 최초라는 표현은 쓰지 않는다.

신규 가입자 순차 퍼널: **방문 → 가입 → 첨삭 저장 → 확정 구매 → 결과 완료**. 실제 제품은 결제 후 결과를 제공하므로 이 순서다. 같은 이용자의 선택 기간 내 엄격한 시간 순서만 통과한다. 기존 회원, 무료 이용권, 문서 제작 구매 흐름을 이 퍼널로 오해하지 않도록 화면에 표시한다. 단순 단계별 발생 건수를 순차 전환으로 제시하지 않는다.

D1/D7/D30은 **선택 플랫폼의 보관된 90일 안에서 처음 관측한 핵심 결과 완료 코호트**다. 코호트 날짜는 조회 기간 안에 있어야 한다. 복귀는 정확한 해당 KST 날짜의 새 결과 완료이며 그 날짜가 완전히 지난 코호트만 분모에 넣는다. 미성숙은 null/N/A. 기간 뒤 복귀는 현재 시점까지 읽는다. 계정 연결은 플랫폼 전체 조회에서 웹·앱에 걸쳐 작동한다.

매출은 수집된 billing_orders 이벤트에 연결된 주문과 실제 analysis_entitlements를 다시 읽는다. Polar `polarEnvironment=production`만 actual, sandbox는 test, 무료 이용권은 free, 증거 없는 주문은 unclassified다. 공급자 최소 통화 단위별로 합산하며 환율 변환하지 않는다. 현재 환불/REVIEW_REQUIRED는 선택 기간 구매의 전액을 보수적으로 차감한다. 부분 환불 정산 기능은 기존 스키마에 없다.

**Google Play는 기존 원장 금액이 카탈로그 추정치이고 테스트 구매 분류 증거를 저장하지 않으므로 확정 매출에서 제외한다.** 문서/커리어/면접의 별도 구매 테이블은 첨삭 원장과 합산하지 않는다. 화면/API에 범위를 명시했다. 이는 전사 정산 장부가 아니다. 추천은 실제 보상 발급 건이며 환불 보정 순매출이나 K-factor로 표시하지 않는다.

## 보안·개인정보·전송

- 최초 선택 동의 전 행동 수집 없음. 웹 하단, 네이티브 내 정보에서 동의/철회. DNT 웹 수집 거부. 연구용 문서 동의와 별개.
- 허용 이벤트/속성만 저장. 경로는 고정 화면 분류로 변환하며 전체 URL, 동적 ID, 이메일, 문서, 파일명, 전화번호, 구매/인증 토큰을 속성과 큐에 넣지 않는다.
- eventId UUID 멱등. 회원 ID/environment/evidence/source/service 입력 위조 거부. 환경은 서버 `ANALYTICS_ENV`와 DB 설정이 일치해야 한다. service_id는 mooaresume 고정이며 전용 DB 연결을 전제로 한다.
- 익명 ID는 처음 연결한 회원에게만 귀속한다. 다른 회원이 같은 ID로 수집하면 거부한다. 로그아웃/계정 전환 시 새 익명/세션 ID와 빈 큐를 사용한다. 계정이 다른 철회 요청은 재시도하지 않는다.
- 큐 100건, 배치 30건, 최장 7일, 최대 60초 지수 backoff, 400 불량 단건 격리. 요청 타임아웃 10초. 웹 online/focus/pagehide, 앱 AppState/15초 타이머로 재전송. 앱 종료 뒤 OS 백그라운드 전송을 보장하지 않는다.
- 웹은 localStorage, 네이티브는 기존 SecureStore 식별/동의와 앱 전용 FileSystem 큐 사용. 저장소 장애 시 전달·동의 저장 보장은 제한된다.
- 실제 스트림 64KiB 제한, 고정 크기 스키마, DB 원자적 rate limit. Cloudflare ingress의 cf-connecting-ip를 서버 HMAC 처리하며 원시 IP를 저장하지 않는다. 다른 프록시로 옮길 때 신뢰 헤더 처리를 재검토해야 한다.
- 모든 신규 테이블 RLS + anon/authenticated 권한 제거. 쓰기 RPC는 service_role만 실행. 관리자/HQ read는 각각 기존 관리자 쿠키/별도 서버 비밀키로 인증, no-store.
- 내부 계정은 service_role로 preferences.internal=true 지정하고 조회에서 제외한다. 확인 가능한 sandbox 결제·연결된 결과도 일반 통계에서 제외한다. 그 밖의 테스트 회원은 internal로 지정해야 한다.
- 철회는 서버 preferences 비활성화, 연결 이벤트 삭제, 익명 ID 차단. 오프라인이면 같은 계정으로 연결될 때 삭제 재시도. 회원 탈퇴 시 FK cascade로 삭제한다. 개인정보처리방침에 자체 통계와 거부 경로를 추가했다.
- 행동 기록 90일 보관. 기존 pg_cron이 있으면 매시간 prune을 등록한다. 별도 외부 스케줄러/유료 도구는 추가하지 않는다. pg_cron 없는 테스트 환경에서는 함수만 생성되며, 운영 활성화 전에 prune 스케줄을 확인해야 한다.

## 파일과 연결 지점

- `src/domain/analytics.ts`, `analytics-revenue.ts`: 이벤트 스키마, 경로 분류, 순차 퍼널, 리텐션, 매출 분류.
- `src/lib/analytics/{queue,web}.ts`, `src/components/analytics-tracker.tsx`: 공용 큐, 웹 라우터/인증/동의.
- `apps/mobile/src/analytics.ts`: 기존 Android/iOS 저장소·인증·앱 수명주기 어댑터.
- `src/server/analytics/{service,report}.ts`: 수집·권한·조회 서비스.
- `/api/analytics/events`, `/api/analytics/preference`: 수집·설정 API.
- `/api/admin/analytics`, `/api/hq/analytics`: 관리자 및 HQ read API.
- `src/app/meensoo/analytics/`: 관리자 UI와 접근 차단/렌더링 테스트.
- 루트 layout, 관리자 nav, application-case-handoff, result-workspace-complete, privacy, native App/ResultScreen/ResumeScreen에는 최소한의 추가 연결만 했다. 원래 결제/AI 로직을 대체하지 않았다.
- SQL: `supabase/migrations/20261003010000_mooa_analytics.sql`.
- SQL 실행 검증: `scripts/test-analytics-db.mjs`. 기존 로컬 PGlite 모듈을 인자로 받으며 원격 DB에 연결하지 않는다.
- 스키마/큐/서버 권한/매출/네이티브/관리자 테스트는 각 파일 옆에 있다.

## 적용 순서와 조회 계약

기존 migration 이력(20260925010000 포함) 다음에 **20261003010000_mooa_analytics.sql 하나**를 검토·적용한다. 원본 트랜스트림 migration은 적용하지 않는다. auth.users, 기존 분석/주문/추천/문서 테이블이 선행 조건이다. 운영 DB 적용과 배포는 별도 승인 대상이며 이번 작업에서 실행하지 않았다.

기본 예시:

```dotenv
ANALYTICS_ENABLED=false
ANALYTICS_ENV=development
MOOA_ANALYTICS_HQ_SECRET=
EXPO_PUBLIC_ANALYTICS_ENABLED=false
```

기존 Supabase 서버 secret을 그대로 사용하며 브라우저/앱에 추가하지 않는다. 활성화 시 해당 환경의 DB `mooa_analytics_config` 환경/플래그를 서버와 맞춘다. 환경별 DB 분리를 권장하며 다른 서비스가 같은 DB를 공유하는 통합은 이번 범위가 아니다. HQ secret은 서비스별로 분리한다.

관리자 `/meensoo/analytics`에서 기간(ISO 시작 포함/끝 제외), platform, userId로 조회한다. API는 `from`, `to`, `platform=web|android|ios|unknown`, `userId`, `anonymousId`, `offset`을 받는다. 알 수 없는 쿼리는 400. environment/serviceId 클라이언트 지정 불가. 최대 조회 기간 90일, 이벤트 20,000건을 넘으면 불완전한 합계를 반환하지 않고 실패한다. 더 좁은 회원/플랫폼 필터 또는 이후 DB 집계 RPC 확장이 필요하다. 타임라인은 100건씩 nextOffset 제공.

HQ: `GET /api/hq/analytics` + 서버의 `Authorization: Bearer <MOOA_ANALYTICS_HQ_SECRET>`. 같은 계약 `mooa.analytics.v1`이며 수집된 사실/요약/코호트/통화별 매출/분류/타임라인을 반환한다. HQ 저장소 등록·캐시·화면은 이 저장소에서 확인할 수 없다. 기존 LIVE-SUB runtime app_key와 DB 격리를 혼동하지 않는다.

롤백: 플래그와 DB config.enabled를 끄면 수집/트리거가 멈춘다. 기존 분석·결제 함수는 교체하지 않았으므로 복원할 필요 없다. 이미 적용한 테이블/자료는 임의 삭제하지 않는다. 소스는 이번 추가 연결만 되돌리고 기존 작업은 보존한다. 수정 전 사본은 `tmp/analytics-baseline`, Git 기준은 `8d163638e9ab9ba902950cd1bfba375a2a5c8bf6`이다.

## 검증

검증 결과는 아래 완료 기록에서 갱신한다. 실기기 로그인·구매, 운영 데이터, 운영 RLS E2E, HQ 외부 저장소, 전체 Supabase 확장 포함 migration 체인의 원격 재생은 수행하지 않는다. SQL 검사는 합성 선행 스키마를 사용한 격리 PostgreSQL 실행 검사이며 실제 DB 사본이라고 주장하지 않는다.

재현 명령:

```powershell
npm.cmd run typecheck
npm.cmd run test -- --exclude '**/.release-worktrees/**' --exclude '**/.incident-release-build/**' --exclude '**/twa-dev-app/**'
npx.cmd eslint src apps/mobile scripts/test-analytics-db.mjs --ignore-pattern 'apps/mobile/node_modules/**'
node scripts/test-analytics-db.mjs <local-PGlite-dist/index.js>
# apps/mobile에서
npm.cmd run typecheck
npx.cmd expo export --platform android --platform ios --output-dir ../../tmp/analytics-mobile-export
```

루트 기본 test/lint는 별도 릴리스/Claude 작업트리와 임시 생성물을 함께 탐색한다. 이들 보호된 폴더를 변경하지 않고 현재 서비스 소스를 검사했다. 기존 `.next/dev/types` 손상 파일은 tmp 사본을 남긴 뒤 Next typegen 결과로 복구했다. Google Fonts 네트워크와 기존 Wrangler 개발 초기화 경로가 빌드에 필요하므로 레지스트리/로그를 이번 작업의 tmp로 지정했다.


### 최종 로컬 검증 결과

- 전달 패키지 무결성: 117개 source 파일, hash 검사 통과.
- 전체 현재 서비스 Vitest: **194개 파일 / 1,567개 테스트 통과**. 별도 릴리스/incident/TWA 하위 저장소 제외.
- 웹 및 기존 Expo 앱 TypeScript 통과.
- 현재 서비스 전체 src, apps/mobile, 신규 SQL 검사 스크립트 ESLint: 오류 0, 기존 무관한 unused 경고 2.
- 최종 Next.js production build 통과: 새 수집/관리자/HQ API 및 관리자 페이지 포함, 129개 정적 페이지 생성. Google Fonts 접근을 허용한 빌드 검증만 수행했다.
- Expo Android/iOS Hermes 번들 export 모두 통과(각 886/888 modules). 출력: tmp/analytics-mobile-export. APK/IPA 서명·배포·실기기 E2E가 아니다.
- 격리 PGlite PostgreSQL 실행 통과: migration transaction rollback, 기존 선행 테이블 위 적용, 재적용 실패 안전성, observer trigger, 직접 USED 삽입 위조 제외, eventId 중복, 익명→로그인, 계정 전환 거부, role 권한 거부, environment/service 격리, rate limit, 동의 철회, 90일 정리, 결제·환불 중복.
- 단위/통합 테스트: 개인정보 제거, 위조 환경·근거 거부, 실제 body 크기 제한, 관리자 미인증, 네이티브 lifecycle/계정 전환, 큐 429/503 재시도와 poison 격리, 순차 순서, KST 리텐션 경계/미성숙, entitlement와 환불·테스트/미분류 매출, 관리자 화면 N/A와 오류 표시.
- git diff --check 통과. 운영 DB·실결제·유료 AI·배포·HQ 등록은 실행하지 않았다.
- 빌드된 로컬 서버 HTTP smoke: 관리자/HQ 미인증 401, 수집 비활성 503, 관리자 페이지 미인증 로그인 화면 200 확인. 테스트 서버는 종료했으며 실제 데이터 조회 없이 검사했다.

## 승인된 릴리스 진행 (2026-10-03)

- 분석 소스 체크포인트 f62ae69; 최신 운영 main b36bcd21에 이번 34개 파일 변경만 검토·통합했다. 기존 면접팩, 홈 출시 배너, 캐시 정책과 보호된 작업을 보존했다. 과거 codex/analytics-v1 변형은 병합·삭제·교체하지 않았다.
- 운영 DB 읽기 확인: 기존 서비스 oiucnkrknedqyktnwbce의 mooa_analytics_* 5개 테이블 존재, config는 mooaresume/development/false. analytics_deployment(다른 변형)는 없음. CLI 관리 인증이 없어 마이그레이션 이력/트리거 확인이 보류됨. 중복 SQL 적용이나 수집 활성화는 하지 않는다.
- 실제 Android TWA: 기존 65e81f0 기준 버전만 1.0.12 / 13으로 올려 Gradle APK/AAB 생성 및 기존 키 서명 검증. 인트로/런처/Play Billing 유지, 스토어 업로드 없음.

### 활성화 진행 업데이트

후속 사용자 요청에 따라 기존 DB API로 다섯 테이블의 정확한 열 계약, 네 RPC 존재, 익명 접근 거부, collect 비활성 가드와 이벤트 0건을 확인했다. 기존 객체에 SQL을 중복 적용하지 않았다. config의 기존 development/false 행 하나를 조건부 PATCH하여 production/true로 전환했으며 활성 collect의 INVALID_BATCH 가드(이벤트 기록 없음)를 확인했다. 원격 migration ledger, trigger/cron 카탈로그는 관리 인증 부재로 직접 확인하지 못했다. Worker vars는 ANALYTICS_ENABLED=true, ANALYTICS_ENV=production이며 HQ secret은 외부 연동 전까지 불필요하다. TWA에는 별도의 앱 환경변수/새 자격증명이 없다.

## 운영 배포 완료 (2026-10-03)

- Source: main ef0d4e0 (analytics integration 4eb4e16); production Worker cad3dc7d-9971-4a04-b5c4-6ffdf5bacd41. Rollback Worker ea83e77d-cbef-4486-b638-01a26b7e4ec6. Disable ANALYTICS_ENABLED and config.enabled before rollback; retain production facts and tables.
- ANALYTICS_ENABLED=true / ANALYTICS_ENV=production deployed; existing service config production/true verified. No new paid service or secret created. Existing schema reused; migration ledger and trigger/cron catalog inspection still requires management access.
- Final OpenNext production build and Wrangler dry-run passed. 212 suites / 1,894 tests, typecheck, source lint (0 errors / 2 existing warnings), isolated PostgreSQL migration tests passed.
- Live HTTPS: /, /app?source=twa, /quick, /final/polish, /result/sample, manifest return 200; unauthenticated admin/HQ return 401. Authenticated admin report returns production, enabled and mooa.analytics.v1. Unique synthetic Android/TWA event accepted once, replay accepts zero, cross-origin rejects 403; withdrawal removes only this test event and database read verifies none remains. Browser confirms actual TWA input, existing app navigation and consent/reject controls. No live payment, AI call or applicant record mutation.
- Android final 1.0.12 / versionCode 13 rebuilt after variables; APK/AAB signed and verified. Native source commit 223ec28, release/checksum documentation b58d832 and 6c20ebd, no Android Git remote configured. Files: C:/6.mooaresume-android/releases/1.0.12/mooaresume-1.0.12-v13.apk and .aab. Native intro hash, Korean label, package and website signer checked. No Play Console upload or physical-device verification.
- Security incident: a server-only generated environment file was accidentally printed to tool output during inspection. Values are not repeated here. Public asset scan (117 files) and released Git diff contain zero matches for local server secrets. .env.local/.open-next remain ignored; keys were not rotated without authorization.
