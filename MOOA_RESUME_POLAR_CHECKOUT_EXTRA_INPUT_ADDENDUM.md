# MOOA Resume — Polar Checkout & Extra Input Billing Addendum
## Dynamic Pricing / Extra Character Entitlement / Post-Purchase Add-on / Webhook Architecture

> 작성 기준일: 2026-08-16  
> 문서 성격: 내부 결제·Entitlement 구현 문서  
> 목적: MOOA Resume의 QUICK / PRO / FINAL 결제와 추가 입력 한도 기능을 Polar에 어떻게 연결할지 정의한다.
>
> 핵심 원칙:
> - **Polar는 결제를 담당하고, 실제 사용권/글자수 한도는 MOOA Resume DB에서 관리한다.**
> - 결제 전에 추가 입력량이 확정되면 **한 번의 동적 Checkout**으로 총액 결제한다.
> - 결제 후 추가 입력이 필요하면 **별도의 추가 Checkout**을 생성한다.
> - 추가 결제 성공 후 Webhook으로 해당 Application Case의 entitlement를 증가시킨다.
> - Polar의 Usage Credits 기능은 존재하지만, MOOA Resume MVP에서는 굳이 글자수 관리에 사용하지 않는다.
> - 모든 Polar 가격/수수료/Checkout 기능은 출시 직전 공식 문서로 다시 확인한다.

---

# 1. 전체 결제 철학

MOOA Resume에서 Polar의 역할:

```text
결제
세금 처리
주문
Checkout
결제 성공/실패 Event
```

MOOA Resume / Supabase의 역할:

```text
Application Case
상품 권한
글자수 한도
추가 입력 한도
Revision 권한
FINAL Interview 권한
사용량
```

즉:

```text
Polar
= Money / Order Source of Truth

Supabase
= Product Entitlement Source of Truth
```

---

# 2. 기본 가격

현재 제품 가격:

```text
QUICK
4,900원

PRO
9,900원

FINAL
14,900원
```

글자수 추가 기능은 기본 상품과 별도로 `extra input entitlement` 개념으로 처리한다.

---

# 3. QUICK 기본 입력 한도 예

예:

```text
QUICK
4,900원

기본 권장 입력
7,000자
```

중요:

```text
7,000자
= 상품 자체가 아니라 기본 entitlement / soft limit
```

이다.

---

# 4. + 추가 입력 기능

입력 화면:

```text
자기소개서

문항 1
[...................]

문항 2
[...................]

[ + 추가 문항 / 내용 ]

현재 6,821 / 7,000자
```

`+` 버튼은 존재하는 것이 좋다.

단 의미는:

```text
다른 회사 자소서 추가
```

가 아니라:

```text
현재 Application Case의
추가 문항 / 추가 내용
```

이다.

---

# 5. 추가 입력이 결제 전에 발생한 경우

가장 깔끔한 Flow.

예:

```text
QUICK 기본
4,900원
7,000자

현재 입력
10,350자

추가 입력 Block
+7,000자
+2,000원

총 결제
6,900원
```

실제 추가가격은 운영 데이터 후 결정한다.

---

# 6. Polar Ad-hoc Price

Polar Checkout API는 Checkout Session 생성 시 catalog에 영구 저장되지 않는 **ad-hoc price**를 생성할 수 있다.

Ad-hoc price는:

```text
해당 Checkout Session에만 존재
Product Catalog에는 나타나지 않음
사용자별 / 계산형 가격 가능
```

한 구조다.

따라서 MOOA Resume 서버에서:

```text
basePrice
+
extraInputPrice
=
checkoutTotal
```

을 계산한 뒤 Polar Checkout Session을 생성할 수 있다.

---

# 7. 결제 전 Dynamic Checkout Flow

```text
사용자 입력
↓
현재 글자수 계산
↓
현재 Application Case Scope 확인
↓
기본 포함량 계산
↓
추가 Block 계산
↓
총 결제금액 계산
↓
Polar Checkout Session 생성
(ad-hoc price)
↓
Polar Checkout
↓
결제 성공
↓
Webhook
↓
Order 검증
↓
Application Case entitlement 부여
```

---

# 8. 예시 가격 계산

예시일 뿐 최종 가격 아님.

```text
0 ~ 7,000자
QUICK 4,900원

7,001 ~ 14,000자
QUICK + Extra Block
6,900원

14,001 ~ 21,000자
QUICK + Extra Block × 2
8,900원
```

이 경우 Polar Dashboard에:

```text
QUICK 4,900
QUICK 6,900
QUICK 8,900
...
```

상품을 수십 개 만들 필요가 없다.

서버가 해당 Checkout에만 ad-hoc price를 생성한다.

---

# 9. 가격 계산은 반드시 서버에서

금지:

```text
Browser:
basePrice + extraPrice 계산
→ 그대로 Polar에 전달
```

권장:

```text
Browser
→ application_case_id 전송

Server
→ DB에서 tier 확인
→ 실제 input length 확인
→ extra blocks 계산
→ server-side price 계산
→ Polar Checkout Session 생성
```

사용자가 개발자도구로 가격을 조작할 수 없게 한다.

---

# 10. Checkout Metadata

Checkout 생성 시 MOOA Resume 내부 정보를 metadata에 연결한다.

예:

```text
application_case_id
user_id
product_tier
writing_mode
billing_reason
base_chars
extra_blocks
granted_chars
pricing_version
```

예:

```json
{
  "application_case_id": "case_92814",
  "product_tier": "QUICK",
  "billing_reason": "INITIAL_PURCHASE",
  "base_chars": "7000",
  "extra_blocks": "1",
  "granted_chars": "14000",
  "pricing_version": "2026_08_v1"
}
```

---

# 11. Metadata의 목적

결제 성공 Webhook이 들어왔을 때:

```text
이 결제가
어느 Application Case에 대한 것인지
```

정확하게 연결하기 위함.

---

# 12. External Customer ID

로그인 사용자는 가능하면 Polar Checkout Session 생성 시 MOOA Resume의 User ID를 Polar의:

```text
external_customer_id
```

와 연결하는 구조를 고려한다.

장점:

```text
Polar Customer
↔
MOOA Resume User
```

연결이 명확해진다.

---

# 13. Initial Purchase 예

```text
User
↓
Application Case 생성
↓
QUICK 선택
↓
현재 입력량 9,500자
↓
Server
extraBlocks = 1
allowedChars = 14,000
price = 6,900
↓
Polar Checkout Session
↓
Payment
↓
Webhook
↓
Entitlement 활성화
```

---

# 14. 결제 완료 후 추가 입력이 필요해진 경우

예:

```text
QUICK 4,900원 결제 완료
Allowed 7,000자

사용 중
↓
추가 문항 필요
↓
[ + 입력 한도 추가 ]
```

이 경우 이미 완료된 기존 결제금액에 나중에 금액을 붙이는 것이 아니라:

> **새로운 추가 Checkout**

을 생성하는 구조가 자연스럽다.

---

# 15. Post-Purchase Extra Flow

```text
Application Case
현재 maxChars = 7,000
↓
사용자
[+ 입력 한도 추가]
↓
서버
Extra Purchase Checkout 생성
↓
Polar Checkout
↓
추가 결제
↓
Webhook
↓
결제 성공 검증
↓
extraChars += 7,000
↓
maxChars = 14,000
```

---

# 16. 추가 결제는 별도 Transaction

예:

```text
첫 결제
QUICK 4,900원

추가 결제
Extra Input 2,000원
```

이면 실제로 Polar에서는:

```text
Order #1
Order #2
```

가 된다.

사용자 경험상:

```text
[+ 입력 한도 추가]
↓
결제
↓
바로 계속 작성
```

이면 충분히 자연스럽다.

---

# 17. 별도 Polar Add-on Product 방식

방법 A:

```text
Polar Catalog

QUICK
PRO
FINAL

EXTRA_INPUT
```

처럼 비공개/내부용 one-time Product를 하나 만든다.

예:

```text
MOOA Extra Input
+7,000자
2,000원
```

장점:

```text
구조 단순
Order 분석 쉬움
고정 가격
```

단점:

```text
가격을 여러 단계로 늘리면 Product 관리 증가
```

---

# 18. Ad-hoc Extra Checkout 방식

방법 B:

추가 Checkout도 기존 Product에 ad-hoc price를 붙인다.

예:

```text
+7,000자
2,000원

+14,000자
4,000원
```

등을 서버에서 계산.

장점:

```text
가격 유연성
Catalog 상품 증가 없음
A/B 가격 테스트 가능
```

---

# 19. 현재 추천

MVP에서는:

> **기본 상품은 Polar Catalog Product**

```text
QUICK
PRO
FINAL
```

로 둔다.

추가 입력은:

```text
Ad-hoc Checkout
```

또는 단일 `EXTRA_INPUT` 상품 중 현재 구현이 더 단순한 쪽을 선택할 수 있다.

장기적으로는:

```text
서버 계산
+
Ad-hoc price
```

가 더 유연하다.

---

# 20. 결제 전과 결제 후를 다르게 처리

## 결제 전

추천:

```text
기본 가격
+
추가입력
↓
총액
↓
한 번 결제
```

## 결제 후

추천:

```text
추가입력
↓
새 Checkout
↓
추가 결제
```

---

# 21. Polar Multiple Products 오해 금지

Polar Checkout에서 여러 Product를 전달할 수 있지만, 공식 문서상 여러 Product는 사용자가:

```text
Product A
또는
Product B
```

중 하나를 선택하도록 하는 용도로 사용할 수 있다.

Checkout Links에서는 고객이 한 Checkout에서 하나의 Product를 구매하며, **true multi-product bundle 구매는 현재 지원되지 않는다.**

따라서:

```text
QUICK 4,900
+
EXTRA 2,000
```

을 두 Product로 넣어:

```text
한 주문에서 둘 다 결제
```

하는 구조를 기본으로 가정하지 않는다.

---

# 22. 그래서 Ad-hoc Total Price가 유리

결제 전:

```text
QUICK 4,900
+
Extra 2,000
=
6,900원
```

을 하나의 Checkout Price로 만들어 결제하는 게 단순하다.

---

# 23. Polar Checkout Link vs Checkout Session API

## Checkout Link

좋은 용도:

```text
고정가격 상품
랜딩페이지 Buy 버튼
고정 캠페인
```

## Checkout Session API

MOOA Resume에서 더 적합한 용도:

```text
사용자별 가격
Application Case별 metadata
추가 입력량 계산
동적 가격
로그인 사용자 연결
```

따라서 dynamic extra input에는:

> **Checkout Session API**

를 사용한다.

---

# 24. Checkout 생성은 서버에서

권장:

```text
POST /api/billing/checkout
```

또는 Server Action.

입력:

```text
applicationCaseId
requestedAction
```

정도만 받는다.

가격 자체를 Client에서 전달받지 않는다.

---

# 25. Server Checkout Resolver

개념:

```ts
resolveCheckout({
  applicationCaseId,
  action: "INITIAL_PURCHASE",
})
```

또는:

```ts
resolveCheckout({
  applicationCaseId,
  action: "ADD_INPUT_CAPACITY",
})
```

서버가:

```text
tier
current entitlement
current document length
pricing version
extra block count
```

를 확인한다.

---

# 26. Checkout Reason

내부적으로 구분:

```text
INITIAL_PURCHASE
EXTRA_INPUT
UPGRADE_TO_PRO
UPGRADE_TO_FINAL
```

향후:

```text
HUMAN_REVIEW
```

등 추가 가능.

---

# 27. Polar Webhook이 실제 권한 부여 Trigger

잘못:

```text
Checkout 성공 URL로 돌아옴
↓
결제 성공했다고 가정
↓
권한 부여
```

권장:

```text
Polar Webhook
↓
Order / Checkout 확인
↓
우리 서버
↓
Entitlement 부여
```

Redirect는 사용자 UX용.

권한 부여는 Webhook 기반.

---

# 28. Webhook Idempotency

같은 Webhook이 재전송되어도:

```text
extraChars += 7000
```

이 두 번 실행되면 안 된다.

따라서:

```text
polar_order_id
event_id
```

등을 이용해 이미 처리한 결제인지 확인한다.

---

# 29. Payment Ledger 권장

예:

```text
billing_transactions
```

테이블.

필드 후보:

```text
id
user_id
application_case_id
polar_checkout_id
polar_order_id
billing_reason
product_tier
currency
gross_amount
status
pricing_version
metadata
processed_at
created_at
```

---

# 30. Application Entitlement 테이블

예:

```text
application_entitlements
```

필드 후보:

```text
application_case_id
product_tier
base_chars
extra_chars
max_chars
revision_budget
interview_enabled
status
activated_at
expires_at
```

---

# 31. 글자수 entitlement 계산

예:

```text
base_chars = 7,000
extra_chars = 7,000

max_chars
= 14,000
```

하지만 실제 제품 정책에서는 Soft Limit / Grace 범위를 별도로 둘 수 있다.

---

# 32. Soft Limit + Paid Extra 예

예:

```text
Base entitlement
7,000

Grace
+500

Paid Extra Block
+7,000
```

그러면:

```text
7,100자
```

사용자에게 바로 추가결제를 요구하지 않을 수 있다.

실제 threshold는 운영 데이터로 결정.

---

# 33. Scope는 글자수보다 우선

사용자가:

```text
현재 현대자동차 지원 건
```

에:

```text
기아 자기소개서
```

를 붙이면, 글자수가 남아 있더라도 허용하지 않을 수 있다.

판정:

```text
NEW_APPLICATION_SCOPE
```

---

# 34. 추가 입력 버튼의 실제 의미

추천 UI:

```text
[ + 추가 문항 ]
[ + 추가 내용 ]
```

또는:

```text
[ + 현재 지원서 내용 추가 ]
```

피하기:

```text
[ +7,000자 구매 ]
```

처음부터 구매 버튼처럼 보여주면 사용자 경험이 지나치게 과금 중심으로 느껴질 수 있다.

---

# 35. 한도 접근 시 UX

예:

```text
6,850 / 7,000자

현재 기본 입력 한도에 가까워졌습니다.
같은 지원 건의 추가 문항이 있다면 계속 추가할 수 있습니다.
```

한도 초과가 명확해질 때:

```text
추가 입력 한도가 필요합니다.

+7,000자
+2,000원

[추가하고 계속]
```

---

# 36. 결제 전이면 한 번에 합산

사용자가 아직 결제 전:

```text
QUICK
4,900원

추가 입력
2,000원

총 결제
6,900원
```

CTA:

```text
[6,900원 결제하고 시작]
```

---

# 37. 결제 후면 추가 Checkout

이미 QUICK 결제 완료:

```text
추가 입력 한도
+7,000자

2,000원

[추가하기]
```

Polar 추가 Checkout으로 이동.

성공 후 기존 Application Case로 복귀.

---

# 38. Success URL

Checkout 생성 시 Success URL을:

```text
/application/{caseId}/billing/success
```

같이 설정할 수 있다.

사용자는 결제 후 현재 작업 중이던 Application Case로 돌아오게 한다.

단:

> Success redirect 자체를 권한 부여 근거로 사용하지 않는다.

---

# 39. Return URL

사용자가 Checkout에서 뒤로가기/취소를 누르면:

```text
현재 Application Case
```

로 돌아오도록 Return URL을 설정.

---

# 40. Pricing Version

가격이 나중에 바뀔 수 있으므로 결제 당시 정책을 기록한다.

예:

```text
pricing_version
=
2026_08_v1
```

나중:

```text
2026_10_v2
```

이 되어도 과거 주문을 해석할 수 있다.

---

# 41. Extra Block Version

추가 입력 정책도 별도 저장 가능.

예:

```text
EXTRA_INPUT_V1
7,000 chars
2,000 KRW
```

가격/한도가 바뀌면:

```text
EXTRA_INPUT_V2
```

로 관리.

---

# 42. Polar Credits 기능

Polar에는 Usage Meter에 Credit을 부여하는 Credits Benefit 기능이 있다.

One-Time Product 구매 시에도 지정한 Credit을 한 번 부여할 수 있다.

따라서 이론적으로:

```text
1 Credit
=
7,000자
```

처럼 모델링할 수도 있다.

---

# 43. 하지만 MVP에서 Polar Credits를 추천하지 않는 이유

MOOA Resume는 현재:

```text
SaaS 월 usage billing
```

보다:

```text
Application Case 단위 one-time purchase
```

에 가깝다.

글자수 한도까지 Polar Meter에 넣으면:

```text
Billing System 복잡도 증가
Polar Usage Event 의존
내부 Workflow와 외부 Billing 상태 동기화
```

가 필요하다.

MVP에서는 과하다.

---

# 44. MVP 권장

```text
Polar
= 결제

Supabase
= 글자수 / 기능 권한
```

단순하게 유지.

---

# 45. Polar Credits를 검토할 시점

향후 MOOA Resume가:

```text
월 구독
월 AI Credit
다수 Application Case
Usage-based 추가요금
```

등으로 바뀌면 Polar Usage Billing / Credits를 다시 검토할 수 있다.

---

# 46. Refund 처리

추가 입력 결제를 환불하면 이미 사용한 entitlement를 어떻게 할지 정책이 필요하다.

예:

```text
미사용
→ entitlement 회수 가능

일부/전체 사용
→ 별도 환불 정책 적용
```

구체적인 환불 정책은 별도 문서에서 결정.

---

# 47. Chargeback / Dispute

결제가 Dispute 상태가 되면 해당 Order와 entitlement 연결을 추적할 수 있어야 한다.

무조건 자동 데이터 삭제보다는:

```text
billing status
```

와:

```text
entitlement status
```

를 분리한다.

---

# 48. Checkout 보안

절대 Client에 노출하지 않을 것:

```text
POLAR_ACCESS_TOKEN
Webhook Secret
가격 계산 로직
내부 entitlement 조정 API
```

---

# 49. 사용자가 maxChars를 직접 변경하면 안 됨

금지:

```text
PATCH /application
{
  "maxChars": 14000
}
```

권장:

```text
Entitlement 변경
=
검증된 Billing Event
또는
관리자 내부 Action
```

만 가능.

---

# 50. Checkout Replay 방지

같은 Checkout 성공을 이용해:

```text
여러 Application Case
```

에 권한을 적용하면 안 된다.

Order는:

```text
application_case_id
billing_reason
```

과 고정 연결.

---

# 51. Extra Input Purchase Scope

추가입력 결제는:

```text
해당 Application Case
```

에 귀속.

예:

```text
현대자동차 생산관리
+7,000자
```

를 구매했다고:

```text
기아 품질관리 Case
```

에서 사용할 수 없게 할 수 있다.

MVP 추천.

---

# 52. 향후 Account-wide Credit과 구분

향후에는:

```text
Account Credit
```

형태를 만들 수도 있다.

하지만 현재:

```text
Case-specific entitlement
```

이 제품 Scope를 가장 잘 지킨다.

---

# 53. QUICK → PRO Upgrade 결제

같은 Checkout 시스템을 재사용한다.

```text
billing_reason
=
UPGRADE_TO_PRO
```

서버가 차액 정책을 계산.

결제 성공:

```text
product_tier
QUICK → PRO
```

entitlement 변경.

---

# 54. PRO → FINAL Upgrade

마찬가지:

```text
billing_reason
=
UPGRADE_TO_FINAL
```

예:

```text
PRO 9,900원 구매
↓
FINAL
추가 5,000원
↓
Checkout
↓
Webhook
↓
interview_enabled = true
```

---

# 55. 결제 Resolver 통합

권장:

```text
BillingAction

INITIAL_QUICK
INITIAL_PRO
INITIAL_FINAL

ADD_INPUT_CAPACITY

UPGRADE_TO_PRO
UPGRADE_TO_FINAL
```

하나의 서버 Billing Service에서 처리.

---

# 56. 가격표를 코드에 여러 곳에 하드코딩하지 않는다

권장:

```text
Pricing Config
```

중앙화.

예:

```ts
QUICK_BASE_KRW
PRO_BASE_KRW
FINAL_BASE_KRW

EXTRA_INPUT_BLOCK_CHARS
EXTRA_INPUT_PRICE_KRW
```

단 실제 결제 전 Server-side config를 사용.

---

# 57. 가격 정책 데이터화

향후:

```text
pricing_plans
pricing_versions
```

테이블을 둘 수도 있다.

초기에는 코드 config + version 기록으로 충분.

---

# 58. 현재 Polar 수수료 참고

2026-08-16 Polar 공식 Pricing 기준:

```text
Starter
Free monthly
5% + $0.50 / transaction

Pro
$20 / month
3.8% + $0.40

Growth
$100 / month
3.6% + $0.35

Scale
$400 / month
3.4% + $0.30
```

---

# 59. Early Member 예외

Polar 공식 안내 기준:

```text
2026-05-27 이전 생성 Organization
```

은 Early Member grandfathered rate 대상일 수 있다.

공식 Pricing에 표시된 Early Member:

```text
4% + $0.40
subscription +0.5%
```

단 유료 Plan으로 업그레이드하면 해당 grandfathered 조건을 잃을 수 있으므로 실제 Organization 상태를 확인한 후 변경한다.

---

# 60. 2026-05-27 이후 새 Organization

Polar 공식 안내 기준:

```text
2026-05-27 이후 생성
```

Organization은 Starter:

```text
5% + $0.50
```

부터 시작한다.

---

# 61. International Card 추가비용

Polar 공식 Pricing에는:

```text
+1.5%
international cards (non-US)
```

추가 수수료가 명시되어 있다.

한국 고객 결제에서는 실제 카드/결제 구조에 따라 이 비용을 원가 계산에 고려한다.

---

# 62. Payout 비용 참고

Polar 공식 Pricing 기준 Stripe payout 비용 예:

```text
$2 / active payout month
0.25% + $0.25 / payout
```

Cross-border currency conversion:

```text
EU 0.25%
기타 국가 최대 1%
```

수준이 안내되어 있다.

정확한 실제 정산비용은 MOOA Resume Polar Organization / payout route로 확인한다.

---

# 63. 저가 Add-on 결제의 문제

예:

```text
Extra Input
1,000원
```

을 별도 transaction으로 결제하면:

```text
Polar 고정 $0.50
+
percentage fee
+
potential international fee
```

가 상당한 비중을 차지할 수 있다.

따라서 **아주 작은 별도 결제는 비효율적**일 수 있다.

---

# 64. 그래서 결제 전 합산이 가장 좋음

예:

```text
4,900
+
2,000
=
6,900원 한 번 결제
```

이면 고정 transaction fee도 한 번만 발생.

---

# 65. 결제 후 Add-on 가격은 너무 작게 잡지 않는다

Post-purchase Extra는 별도 Transaction이므로:

```text
1,000원
```

같은 소액은 특히 비효율적일 가능성이 있다.

실제 API 원가보다:

```text
Polar 고정수수료
```

가 더 큰 문제가 될 수 있다.

가격은 출시 후 손익 데이터를 보고 결정.

---

# 66. Sandbox 테스트 필수

Polar는 Sandbox 환경을 제공한다.

출시 전 다음 시나리오를 모두 테스트:

```text
INITIAL QUICK

Dynamic price QUICK + extra

Post-purchase extra

QUICK → PRO

PRO → FINAL

Webhook duplicate

Checkout cancel

Payment fail

Refund

잘못된 metadata

다른 Application Case replay
```

---

# 67. 테스트 시 체크할 것

```text
Checkout 금액
Currency
Metadata
User 연결
Application Case 연결
Webhook
Idempotency
Entitlement
Success Redirect
Cancel/Return
```

---

# 68. Billing Event Log

각 Billing 동작을 남긴다.

예:

```text
CHECKOUT_CREATED
CHECKOUT_COMPLETED
ORDER_CONFIRMED
ENTITLEMENT_GRANTED
ENTITLEMENT_UPGRADED
REFUND_RECEIVED
```

---

# 69. 결제 상태와 작업상태 분리

예:

```text
payment_status
=
PAID

workflow_status
=
EXPERIENCE_DISCOVERY
```

처럼 분리.

결제 시스템의 상태와 AI 작성 Workflow 상태를 하나의 enum에 섞지 않는다.

---

# 70. 결제 실패 시 입력 내용 유지

사용자가:

```text
10,000자 입력
↓
Checkout
↓
결제 실패
```

했다고 입력 내용을 잃어버리면 안 된다.

가능하면 해당 Application Case의 pre-payment draft state를 유지한다.

---

# 71. 결제 성공 후 정확한 위치 복귀

추가 입력 결제 후:

```text
CREATE 질문 중
```

이었다면 그곳으로,

QUICK 입력 중이었다면:

```text
추가 입력창
```

으로 돌아온다.

---

# 72. 최종 추천 구조

```text
                    MOOA Resume

사용자 입력
    │
    ├─ 결제 전 기본 한도 내
    │       ↓
    │   Catalog Price Checkout
    │
    ├─ 결제 전 추가 입력
    │       ↓
    │   Server Price Calculation
    │       ↓
    │   Ad-hoc Checkout
    │       ↓
    │   총액 1회 결제
    │
    └─ 결제 후 추가 입력
            ↓
       Extra Checkout
            ↓
       별도 결제
            ↓
         Webhook
            ↓
      Supabase Entitlement 증가
```

---

# 73. 최종 DB 개념

```text
application_cases
application_entitlements
billing_transactions
billing_events
```

최소 구성.

---

# 74. 최종 권장 MVP

구현:

```text
1. Catalog Product:
   QUICK / PRO / FINAL

2. Checkout Session API

3. Server-side price resolver

4. Ad-hoc price support

5. Checkout metadata

6. external_customer_id 연결

7. Polar Webhook

8. Idempotent entitlement grant

9. application_entitlements

10. Post-purchase extra checkout

11. QUICK → PRO / PRO → FINAL 확장 가능한 BillingAction
```

---

# 75. MVP에서 보류

```text
Polar Meter Credits로 글자수 직접 관리
Usage Billing
Multi-product bundle
Account-wide AI credit wallet
복잡한 seat / subscription billing
극소액 micro-payment
```

---

# 76. Codex CLI Review Prompt

```text
Read:

- MOOA_RESUME_POLAR_CHECKOUT_EXTRA_INPUT_ADDENDUM.md
- MOOA_RESUME_PRICING_ECONOMICS_USAGE_LIMIT_ADDENDUM.md
- latest pricing / entitlement / Application Case specs.

Do not implement yet.

Audit the current Polar integration.

Latest billing architecture:

Polar is the source of truth for money/orders.
Supabase is the source of truth for application entitlements.

Required flows:

A. Initial fixed-price purchase
B. Initial purchase with extra input already known
C. Post-purchase extra input
D. QUICK → PRO upgrade
E. PRO → FINAL upgrade

Important Polar behavior:

1. Use Checkout Session API for application-specific and dynamic checkout.
2. Polar supports ad-hoc prices on a Checkout Session.
3. Ad-hoc prices are temporary and checkout-specific.
4. Checkout Link multiple products should not be treated as a bundle purchase.
5. Server calculates prices; client must not submit a trusted monetary amount.
6. Attach application_case_id and billing_reason metadata.
7. Link authenticated MOOA users to Polar using an external customer identifier where appropriate.
8. Grant entitlements only after a verified Polar payment/order webhook.
9. Webhook processing must be idempotent.
10. Post-purchase extra input should create a separate checkout/order.
11. After successful extra purchase, increment the entitlement for that exact Application Case.
12. Do not use Polar Credits/Metering for character allowance in the MVP unless there is a strong architectural reason.
13. Never expose POLAR_ACCESS_TOKEN or webhook secrets client-side.
14. Preserve user work when checkout fails or is cancelled.
15. Return users to the exact Application Case/workflow after checkout.

Audit and report:

A. Existing Polar code and products.
B. Current checkout creation method.
C. Whether dynamic ad-hoc pricing is already supported.
D. Current metadata and user reconciliation.
E. Webhook events currently handled.
F. Idempotency protection.
G. Current entitlement storage.
H. How to add extra input purchase safely.
I. How to support upgrade flows without duplicating billing code.
J. Required sandbox test scenarios.
K. Security risks.

Do not modify files until the review is complete.
```

---

# 77. Implementation Pseudocode

```ts
type BillingAction =
  | "INITIAL_PURCHASE"
  | "ADD_INPUT_CAPACITY"
  | "UPGRADE_TO_PRO"
  | "UPGRADE_TO_FINAL";

interface CheckoutRequest {
  applicationCaseId: string;
  action: BillingAction;
}
```

Server:

```text
authenticate user
↓
load Application Case
↓
verify ownership
↓
load current entitlement
↓
resolve BillingAction
↓
calculate authoritative server-side price
↓
create Polar Checkout Session
↓
store pending billing transaction
↓
return checkout URL
```

---

# 78. Webhook Pseudocode

```text
receive Polar webhook
↓
verify webhook authenticity
↓
extract Polar order / checkout
↓
find billing_transaction
↓
if already processed:
    return success
↓
validate:
    user
    application_case
    billing_reason
    amount/currency as needed
↓
transaction:
    mark billing paid
    grant/update entitlement
    mark webhook processed
↓
return success
```

---

# 79. 최종 결론

추가 입력 기능은 Polar 때문에 포기할 필요가 없다.

가장 단순한 구조:

```text
결제 전 추가
→ 총액 계산
→ Polar Ad-hoc Checkout
→ 한 번 결제

결제 후 추가
→ 추가 Polar Checkout
→ Webhook
→ 해당 Application Case maxChars 증가
```

그리고:

> **Polar에 글자수 관리 책임을 넘기지 말고, Polar는 결제만 맡기고 실제 입력한도는 우리 DB에서 관리한다.**

이것이 MOOA Resume MVP에 가장 적합한 구조다.

---

# 80. Official Polar Facts Verified 2026-08-16

이 문서 작성 시 Polar 공식 문서에서 확인한 주요 사항:

```text
Checkout Session API:
- Checkout-specific ad-hoc price 지원
- dynamic / calculated pricing 용도 지원
- external_customer_id 지원

Checkout Links:
- 여러 Product를 표시할 수 있음
- 고객은 한 Checkout에서 하나를 선택해 구매
- true multi-product checkout은 현재 지원되지 않음

Credits:
- Usage Meter Credit 기능 존재
- One-Time Product 구매 시 Credit을 한 번 지급 가능

Pricing:
- Starter: 5% + $0.50
- Pro: $20/mo, 3.8% + $0.40
- Growth: $100/mo, 3.6% + $0.35
- Scale: $400/mo, 3.4% + $0.30
- 2026-05-27 이전 Organization은 Early Member 조건 가능
- International card 추가비용 등 별도 fee 존재
```

이 기능과 가격은 변경될 수 있으므로 실제 구현/출시 직전에 반드시 공식 Polar 문서를 다시 확인한다.

---

# 81. Source of Truth

Polar Billing 관련 우선순위:

1. 실제 최신 Polar 공식 문서/API Schema
2. 보안 및 결제 무결성
3. 최신 명시적 사용자 결정
4. `MOOA_RESUME_POLAR_CHECKOUT_EXTRA_INPUT_ADDENDUM.md`
5. `MOOA_RESUME_PRICING_ECONOMICS_USAGE_LIMIT_ADDENDUM.md`
6. Pricing / Workflow Specs
7. PROJECT_SPEC.md
8. AGENTS.md

이 문서는 **MOOA Resume의 Polar 결제, 동적 가격, 추가 입력 결제, Webhook 및 Application Case Entitlement 연결에 대한 최신 내부 기준**이다.
