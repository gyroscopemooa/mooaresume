## 2026-08-17 Checkout Session 구현 갱신

완료:

- 공식 `@polar-sh/sdk`의 Checkout Sessions API 어댑터
- sandbox/production 서버 환경 분리
- KRW 세금 포함 ad-hoc 고정가격
- 할인코드와 trial 비활성화
- `POST /api/checkouts/quick` 인증·동일 출처 검사
- 브라우저에서는 `analysisRunId`만 받고 가격·ApplicationCase·metadata는 DB Snapshot과 서버 계산으로 결정
- 사용자 소유 PENDING QUICK 실행, PRIMARY 문서, 기존 ACTIVE entitlement 확인 RPC
- 성공·복귀 URL과 Polar external customer ID 연결
- client IP 형식 검증 후 국가 감지를 위한 Polar 전달
- mock Checkout payload 및 DB 권한 회귀 테스트

남은 작업:

1. 분석 준비 화면의 결제 버튼을 `/api/checkouts/quick`에 연결하고 반환 URL로 이동
2. 같은 AnalysisRun에서 열린 Checkout Session을 재사용하는 checkout intent 기록으로 중복 결제 위험 추가 축소
3. 실제 Supabase migration 적용 및 Polar sandbox E2E

실제 Polar Checkout 호출과 원격 migration은 아직 실행하지 않았다.

---

## 2026-08-17 구현 갱신

현재 공식 Polar 문서 기준으로 결제 확정은 `order.paid`에서 처리한다. webhook raw body는 `@polar-sh/sdk/webhooks`의 `validateEvent`로 검증한다.

완료:

- 상품 ID, KRW 통화, 서버 재계산 금액, entitlement metadata 재검증
- provider event ID와 order ID 고유 제약에 의한 멱등 처리
- 결제 주문과 1회용 QUICK 분석 entitlement 분리
- ApplicationCase 소유자만 조회 가능한 RLS
- service role만 지급·환불 RPC 실행
- 인증 사용자가 소유한 PENDING AnalysisRun에만 entitlement 1회 소비
- 전체 환불은 미사용 권한 회수, 소비 후 환불은 `REVIEW_REQUIRED`
- 부분 환불은 미사용 권한을 중지하고 `REVIEW_REQUIRED`
- 결제 성공·위조 metadata·금액 불일치·부분/전체 환불 회귀 테스트

남은 작업:

1. Polar sandbox Checkout Session 생성 어댑터와 인증 사용자 API
2. 실제 Supabase 프로젝트에 migration 적용
3. sandbox 결제 성공·중복 webhook·환불 E2E 검증

실제 Polar 호출, 원격 migration, 배포는 아직 실행하지 않았다.

---

# Polar 동적 QUICK 결제 기본 설계

> 작성일: 2026-08-16  
> 상태: 도메인 계산 및 결제 어댑터 경계 구현 완료, 실제 Polar 호출·webhook 연결 전

## 핵심 답변

Polar에 QUICK 가격 조합마다 별도 Product를 만들 필요는 없다.

```text
Polar Product
QUICK 1개

우리 서버
현재 입력량과 entitlement 계산

Checkout Session
해당 주문의 최종 금액과 metadata 전달
```

다만 이 방식은 하나의 주문에 여러 상품을 담는 장바구니가 아니다. QUICK 상품을 기준으로 해당 Checkout Session의 결제 금액을 계산하는 구조다. 실제 요청 필드는 설치할 Polar SDK/API 버전의 공식 문서와 sandbox 호출로 최종 확정한다.

## 현재 기본값

```text
기본 가격                 4,900원
권장 입력량               7,000자
동일 지원 건 포함 상한    12,000자
추가 블록                 7,000자
추가 블록 임시 가격       2,900원
```

추가 블록 가격은 제품 출시 전 변경 가능한 설정값이며 사용자 대상 최종 확정 가격이 아니다.

## 구현 파일

- `src/domain/usage-entitlement.ts`
  - 공백 제외 전체 글자 수 계산
  - QUICK 결제 견적 계산
  - Polar 주문 metadata 생성
- `src/domain/usage-entitlement.test.ts`
  - 기본 범위, grace 범위, 추가 블록, 개인정보 비저장 metadata 테스트
- `src/server/billing/polar-checkout.ts`
  - Polar SDK와 제품 도메인을 분리하는 gateway 계약
  - 서버 전용 환경변수 검증
- `.env.polar.example`
  - sandbox 연결에 필요한 환경변수 이름

## 결제 전 흐름

```text
문항 추가
→ 모든 문항의 공백 제외 글자 수 합산
→ QUICK 견적 계산
→ 같은 ApplicationCase인지 확인
→ 서버가 최종 결제금액 생성
→ Polar Checkout 1회
→ webhook 검증
→ entitlement 부여
```

## 결제 후 흐름

```text
기존 entitlement 확인
→ 허용량 안이면 그대로 진행
→ 허용량을 넘으면 추가 Checkout
→ webhook 성공
→ 해당 ApplicationCase의 allowed_chars 증가
```

## Checkout metadata

지원서 원문은 Polar metadata에 넣지 않는다.

```text
application_case_id
tier
total_characters
base_characters
included_characters
extra_blocks
allowed_characters
```

## 남은 연결 작업

1. QUICK 입력 화면에 복수 문항 UI 연결
2. Polar SDK 버전 선택 및 sandbox Checkout 구현
3. 서명 검증 webhook 구현
4. `ApplicationCase` entitlement migration 추가
5. 결제 성공·중복 webhook·환불 테스트

