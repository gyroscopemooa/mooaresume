# FINAL 면접 준비팩 + 관리자 무결제 테스트

작성: 2026-09-26 · 브랜치 `feat/final-interview-pack` · 상태: 개발 완료(로컬), **DB 마이그레이션·배포는 아직 하지 않음**

## 무엇을 만들었나

| 부분 | 설명 |
| --- | --- |
| 면접 준비팩 | FINAL 결과 화면의 새 탭. 제출한 자료로 30초·1분 자기소개, 지원동기, 입사 후 포부(+7개 추가 문항)를 만들고 키워드로 외우게 한다. 기존 모의면접 탭은 그대로다. |
| 관리자 "FINAL 테스트" | `/meensoo/final-test`. 결제 없이 (A) 화면만 보기 (B) 면접팩만 실제 AI 테스트 (C) FINAL 전체 흐름을 점검한다. |
| 테스트 이용권 | 결제 주문을 만들지 않고, FINAL 분석이 실제로 쓰는 이용권 한 장(`analysis_entitlements`)만 "테스트 출처"로 만든다. |

## 비개발자용 사용법

**A. 화면만 보기 (돈·AI 없음)**
1. 관리자 로그인 → 왼쪽 메뉴 **FINAL 테스트**
2. `A. 화면만 보기`에서 샘플(자료 충분/부족/충돌) 중 하나의 **화면만 보기** 클릭
3. **면접 준비팩 만들기 → 자료 점검하기 → 답변 만들기** 순서로 눌러 본다. 위에 "샘플 화면 · 실제 AI 생성 아님"이 계속 보인다.

**B. 면접팩만 실제 AI 테스트 (AI 요금 발생, 결제 없음)**
1. 이 브라우저에서 사이트에 **승인된 테스트 계정으로 로그인**해 둔다(환경변수 `FINAL_TEST_ACCOUNT_EMAILS`).
2. **FINAL 테스트 → B** 에서 샘플 카드의 **이 샘플로 실제 AI 테스트 팩 만들기**(또는 내 자료 세트/내 FINAL 결과 복제)
3. 열린 팩에서 **자료 점검하기 → (부족한 내용 보완) → 답변 만들기**. 30초 자기소개를 확인하고 **연습하기**로 키워드 암기.
4. 다시 하고 싶으면 **만든 테스트 팩**에서 체크 → **선택한 N개 초기화**.

**C. FINAL 전체 흐름 (AI 요금 발생, 결제 없음)**
1. **FINAL 테스트 → C** 에서 **테스트 이용권 발급**(받는 계정은 승인된 계정만)
2. 그 계정으로 로그인 → FINAL 입력 화면에서 가상 TXT(위 화면에서 내려받기) **하나**를 올림
3. 결제 단계에 **테스트 이용권으로 분석 시작 · 결제 없음**이 나타난다 → 눌러서 진행
4. 결과 화면에 **면접 준비팩** 탭이 자동으로 보인다.

## 켜고 끄는 값(환경변수 이름만)

| 이름 | 역할 | 기본 |
| --- | --- | --- |
| `NEXT_PUBLIC_ENABLE_INTERVIEW_PACK` | 일반 사용자에게 탭·API 공개 | 꺼짐 |
| `INTERVIEW_PACK_ELIGIBLE_FROM` | 기존 FINAL 구매자 적용(`none`/`all`/날짜) | `none` — 소급 발급 없음 |
| `INTERVIEW_PACK_INITIAL_LIMIT` / `INTERVIEW_PACK_EDIT_LIMIT` / `INTERVIEW_PACK_CHECK_LIMIT` | 최초 생성 / AI 수정 / 자료 점검 상한 | 1 / 3 / 5 |
| `INTERVIEW_PACK_TEST_DAILY_AI_CALLS` | 관리자 실제-AI 테스트 하루 호출 상한 | 30 |
| `FINAL_TEST_ACCOUNT_EMAILS` | 승인된 테스트 계정(쉼표) — **비면 아무도 못 씀** | 비어 있음 |
| 기존 `MAIL_ADMIN_SECRET`, `OPENAI_API_KEY`, `OPENAI_MODEL(_FINAL)`, `OPENAI_REASONING_EFFORT_FINAL` | 관리자 문·AI 호출(모델은 기존 FINAL 설정을 그대로 씀) | — |

## DB (아직 적용 전)

Supabase SQL Editor(프로젝트 이름 확인!)에서 이 순서로:
1. `supabase/migrations/20260926010000_admin_test_grants.sql`
2. `supabase/migrations/20260926020000_interview_packs.sql`

적용 전에도 관리자 화면은 열리고 **"마이그레이션이 아직 적용되지 않았습니다"** 안내가 뜨며 A(화면만 보기)는 동작한다. 기존 `analysis_entitlements` 한 곳만 바뀐다: `billing_order_id` NOT NULL 해제 + `test_grant_id` 추가 + "주문 또는 테스트 이용권 중 정확히 하나" 체크(기존 행은 그대로 통과).

## 권한·보안 요약

- 관리자 콘솔 API는 **관리자 쿠키 + 로그인 세션 + 서버 환경변수의 승인된 계정** 셋 다 통과해야 하고, 아니면 404(존재 자체를 숨김).
- 클라이언트의 isAdmin·이메일 문자열·URL 파라미터·localStorage·user_metadata 는 권한 근거가 아니다.
- 테스트 이용권은 승인된 계정에만 발급, DB 함수가 본인·본인 지원 건·유효기간·횟수·회수 여부를 사용할 때마다 확인한다.
- 면접팩 생성은 매번 DB가 (본인 FINAL 완료 + 이용권 소비 + 결제 PAID 또는 유효한 테스트 이용권)을 다시 확인한다. QUICK·PRO·미결제·환불·회수는 새 생성이 막히고 읽기·직접 수정은 유지된다.
- 결제 주문·영수증·매출을 만들지 않는다(마이그레이션 회귀 테스트가 `billing_orders` 쓰기 문장이 없음을 고정).

## 검증 결과 (2026-09-26)

- 자동 테스트: 전체 1,658개 통과(기존 `mobile.test.ts` 로드 실패 1건은 기존과 동일, Expo tsconfig 부재).
- 타입 검사·린트: 오류 0(린트 경고 2건은 기존 파일).
- `next build`(Turbopack) 성공.
- **SQL은 실제 Postgres(PGlite)에 운영 마이그레이션 전체 + 신규 2개를 적용해 103개 시나리오 통과**(`scripts/verify-interview-pack-sql/`).
- 브라우저(개발 서버 3111): 관리자 로그인, 콘솔 화면, 샘플 A·C 화면 흐름, 모바일 폭 레이아웃 확인.
- **미검증**: 실제 AI(OpenAI) 응답 품질(live eval 파일만 준비, 유료라 미실행), 실제 Supabase에서의 RPC 왕복(마이그레이션 미적용), Polar sandbox 결제·웹훅, 실제 FINAL 결과 화면에서의 탭(로그인·DB 필요), 동시 요청(PGlite는 연결 1개).

## 문제가 생기면

- 공개 중단: `NEXT_PUBLIC_ENABLE_INTERVIEW_PACK` 비움(또는 0) → 탭·API 즉시 사라짐(테스트 팩은 승인된 계정만).
- 테스트 이용권 전부 막기: `FINAL_TEST_ACCOUNT_EMAILS` 비움 + 관리자 화면에서 이용권 회수.
- 코드 되돌리기: 브랜치를 병합하지 않으면 그만이고, 병합했다면 해당 커밋 revert. DB는 신규 표·함수를 지우고(`interview_pack_*`, `admin_test_*`) `analysis_entitlements` 의 `test_grant_id`·체크를 제거한 뒤 `billing_order_id` NOT NULL 을 복구(테스트 이용권 행이 없어야 함).
