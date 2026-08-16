# MOOA Resume — Pricing Economics & Usage Limit Addendum
## QUICK / PRO / FINAL 수익성, API 원가, Polar 결제, 글자수 제한 및 추가 입력 정책

> 작성 기준일: 2026-08-16  
> 문서 성격: 내부 제품·가격·원가 설계 문서  
> 목적: 현재 가격대인 QUICK 4,900원 / PRO 9,900원 / FINAL 14,900원의 수익 구조를 검토하고, API 사용량·Polar 결제수수료·글자수 제한·추가 입력·남용 방지 정책을 정의한다.
>
> 핵심 원칙:
> - **문자 수를 판매하지 않는다. 지원 건(Application Case)을 판매한다.**
> - 글자수는 상품 단위가 아니라 **기술적 제한 / 남용 방지 수단**이다.
> - MVP에서는 추가 7,000자 유료 옵션을 성급히 만들지 않는다.
> - 실제 API 사용량 데이터를 먼저 수집한 후 limit와 add-on 가격을 조정한다.
> - 저가 결제에서는 API 비용보다 **결제 고정수수료**의 영향이 더 클 수 있다.

---

# 1. 현재 가격

```text
QUICK
4,900원

PRO
9,900원

FINAL
14,900원
```

현재 기준으로 세 가격 모두 유지 가능성이 높다.

다만 실제 수익성은 다음 요소를 함께 봐야 한다.

```text
판매가
↓
부가세/세금 처리
↓
Polar 수수료
↓
OpenAI API 비용
↓
서버/스토리지/기타 비용
↓
환불/Chargeback
↓
사업자 최종 세금
```

---

# 2. 가격 판단의 핵심

API 사용료만 보고 가격을 결정하면 안 된다.

특히 저가 상품에서는:

```text
결제 고정수수료
```

가 상당히 큰 비중을 차지할 수 있다.

따라서 QUICK 4,900원보다 더 낮은 가격을
쉽게 만들지 않는다.

---

# 3. Polar 비용 구조 — 내부 계산 참고

현재 검토 기준 Polar Starter 수수료 구조:

```text
기본
5% + $0.50 / transaction

국제카드 등
추가 수수료 가능

Payout
별도 비용 가능
```

정확한 수수료 정책은 실제 구현/출시 직전
Polar 공식 문서로 다시 확인한다.

---

# 4. 한국 고객 기준 대략적 공헌이익 예시

가정:

```text
한국 고객
가격에 VAT 포함
Polar Starter
한국/국제 카드
```

대략적인 구조 예:

| 판매가 | VAT 상당액 | Polar 수수료 추정 | API 전 남는 금액 추정 |
|---:|---:|---:|---:|
| QUICK 4,900 | 약 445원 | 약 1,000원 전후 | 약 3,400원 |
| PRO 9,900 | 약 900원 | 약 1,300원 전후 | 약 7,600원 |
| FINAL 14,900 | 약 1,355원 | 약 1,700원 전후 | 약 11,800원 |

주의:

```text
이는 최종 순이익이 아니다.
```

아직 포함되지 않은 항목:

```text
OpenAI API
서버
스토리지
Payout
환불
기타 운영비
종합소득세/법인세
```

따라서 정확한 명칭은:

> **건당 공헌이익 계산의 출발점**

이다.

---

# 5. 사업자 최종 세금은 건당 고정 계산하지 않는다

종합소득세/법인세는:

```text
연간 전체 매출
비용처리
다른 소득
사업 형태
```

에 따라 달라질 수 있다.

따라서 상품별 손익 분석에서는 먼저:

```text
판매가
-
VAT/MoR 관련 비용
-
결제수수료
-
API 비용
-
직접 변동비
```

를 **Contribution Margin**으로 본다.

---

# 6. OpenAI API 비용 기본 원칙

문서 길이가 길어지면:

```text
Input Tokens
```

가 증가한다.

분석이 복잡해지면:

```text
여러 단계 API 호출
Output Tokens
고급 모델 사용
```

이 증가한다.

하지만:

> **7,000자 하나가 추가된다고 판매가를 바로 수천 원 올려야 할 정도로 API 비용이 급증하는 구조는 아닐 가능성이 높다.**

실제 원가는 반드시 production logging으로 측정한다.

---

# 7. 모델 라우팅으로 원가 관리

모든 단계에 최고가 모델을 쓰지 않는다.

개념 예:

```text
문서 추출 / 분류
→ 저비용 모델

공고 / 경험 분석
→ 중간급 모델

핵심 첨삭 / 작성
→ 고품질 모델

최종 검수
→ 필요에 따라 독립 evaluator
```

---

# 8. QUICK 원가 목표

QUICK은:

```text
현재 자기소개서 중심
문서 교차분석 없음 또는 최소
짧은 Pipeline
```

이므로 원가를 낮게 유지한다.

목표 예:

```text
판매가 4,900원

Polar/VAT 이후
약 3,400원 전후

API
약 수백 원대 목표

서버/기타 직접비 제외 후
약 2,500~3,000원 이상 공헌이익 목표
```

정확한 수치는 실데이터로 조정.

---

# 9. PRO 원가 목표

PRO는:

```text
공고
지원서
이력서
경력자료
경험 추출
경험 랭킹
추가질문
작성
재평가
최종검수
```

가 포함된다.

따라서 QUICK보다 API 비용이 높다.

하지만 목표:

```text
API 원가
약 1,000~2,500원 범위 내 관리
```

정도를 우선 목표로 삼을 수 있다.

---

# 10. PRO 9,900원은 유지 가능

대략:

```text
9,900원
↓
VAT / Polar
↓
약 7,600원 전후
↓
API 1,000~2,500원 가정
↓
약 5,100~6,600원
```

정도의 공헌이익 가능성을 목표로 한다.

따라서 현재 PRO 9,900원은
과도하게 낮은 가격이라고 단정할 필요 없다.

---

# 11. FINAL 14,900원

FINAL:

```text
PRO 전체
+
Interactive AI Interview
```

따라서 문제는 문서 길이보다:

```text
면접 대화 길이
질문 수
꼬리질문 수
재훈련 횟수
```

가 원가를 좌우한다.

---

# 12. FINAL은 무제한 자유채팅으로 만들지 않는다

권장:

```text
1회 면접 Session
적정 질문 수
적정 Follow-up 수
취약질문 재훈련 범위
```

를 내부적으로 제한한다.

사용자에게:

```text
메시지 12개 남음
```

같은 강한 토큰 UX를 보여줄 필요는 없지만
내부 Scope는 명확해야 한다.

---

# 13. 가장 중요한 상품 단위

MOOA Resume에서 판매하는 것은:

```text
7,000자
14,000자
21,000자
```

가 아니다.

기본 상품 단위:

> **한 회사 × 한 직무 × 한 Application Case**

이다.

---

# 14. Application Case 예

```text
현대자동차
2026 하반기
생산관리

자기소개서 4문항
공고 1건
이력서
경력기술서
```

이 전체를:

```text
Application Case 1건
```

으로 본다.

---

# 15. 왜 글자수 기반 상품이 위험한가

사용자는:

```text
7,000자를 구매한다
```

고 이해하면:

```text
남은 글자수에 다른 회사 자소서를 넣어도 되나?
```

라는 문제가 생긴다.

또한:

```text
A회사 자소서
+
B회사 자소서
+
C회사 자소서
```

를 한 번에 묶어 넣을 수 있다.

따라서 Scope 기준은:

```text
회사 / 직무 / 공고
```

가 우선이다.

---

# 16. 글자수는 Technical Limit

글자수는:

```text
원가 관리
Context 관리
Abuse 방지
UI 안정성
```

을 위한 보조 제한으로 사용한다.

---

# 17. 7,000자는 Soft Limit 권장

예:

```text
6,231 / 7,000자
```

7,000자가 넘었다고 즉시:

```text
추가결제 필요
```

로 막지 않는다.

예:

```text
7,842 / 7,000자

지원서가 조금 깁니다.
같은 지원 건의 추가 문항이라면 계속 진행할 수 있습니다.
```

---

# 18. Hard Cap은 내부적으로 더 높게

예시:

```text
QUICK
Soft Limit: 7,000자
Hard Cap: 10,000~12,000자

PRO
지원서 + 공고 + 자료 포함
훨씬 넉넉한 내부 제한
```

실제 수치는 API 사용량 측정 후 결정한다.

---

# 19. QUICK의 글자수 정책

권장:

```text
QUICK 4,900원

한 회사 / 한 직무
자기소개서 전체 권장 7,000자
동일 지원 건은 합리적인 범위 내 초과 허용
```

---

# 20. PRO에 7,000자 제한을 강하게 걸지 않는다

PRO의 상품 메시지는:

> 공고와 지원자료 전체를 연결해 한 지원 건을 완성한다.

이다.

따라서:

```text
7,001자
→ 추가결제
```

는 상품 철학과 충돌한다.

---

# 21. PRO 권장 범위

```text
Application Case 1건

채용공고 1건
지원서 여러 문항
이력서
경력기술서
추가 경험자료
```

합리적인 범위 내 포함.

---

# 22. Abuse 방지 기준

글자수뿐 아니라 다음을 함께 본다.

```text
회사 수
직무 수
공고 수
자기소개서 세트 수
문서 수
총 Parsed Text
Revision 횟수
AI operation 횟수
```

---

# 23. 다른 회사 지원서를 끼워 넣는 문제

예:

```text
현대자동차 지원서 분석 중

+ 추가 입력

기아 지원서 전체 추가
```

이 경우 단순 글자수 초과가 아니라:

```text
Application Scope 변경
```

으로 판단한다.

---

# 24. Scope Violation 예

```text
회사 변경
직무 변경
공고 변경
완전히 다른 지원서 세트 추가
```

이면:

```text
새 Application Case 생성
```

을 안내한다.

---

# 25. + 버튼 자체는 좋다

입력창 아래:

```text
[ + 추가 내용 ]
```

큰 버튼을 만들어
사용자가 자료를 자연스럽게 추가하게 할 수 있다.

하지만 의미는:

```text
+ 7,000자를 구매
```

가 아니라:

```text
같은 지원 건의 추가 문항 / 추가자료 입력
```

이어야 한다.

---

# 26. 추가 입력 UX 예

```text
현재 지원 건
현대자동차 · 생산관리

자기소개서 4,832자

[ + 추가 문항 ]
[ + 이력서 ]
[ + 경력자료 ]
```

이런 구조가 더 자연스럽다.

---

# 27. MVP에서는 추가분량 Add-on을 만들지 않는다

현재 단계에서:

```text
+7,000자 = +1,000원
```

또는:

```text
+7,000자 = +5,000원
```

상품을 만들지 않는다.

---

# 28. +1,000원의 문제

저가 추가결제를 별도 transaction으로 만들면:

```text
Polar 고정수수료
```

가 너무 큰 비중을 차지할 수 있다.

따라서 1,000원 add-on 별도결제는 비효율적일 가능성이 높다.

---

# 29. +5,000원의 문제

사용자 입장에서:

```text
QUICK 4,900
추가분량 5,000
```

이면:

> 사실상 QUICK 하나를 다시 사는 가격

처럼 느껴진다.

가격 UX가 좋지 않다.

---

# 30. 추가요금이 필요해질 경우

실제 원가 데이터에서
초과입력이 명확히 비용 문제를 만든다면:

```text
결제 전에 총 가격을 계산
```

하는 방식이 더 낫다.

예:

```text
QUICK
4,900원

추가 대용량 입력
+1,900원

총 결제
6,800원
```

---

# 31. Dynamic / Ad-hoc Checkout 방향

Polar에서 Checkout Session 생성 시
동적/계산된 가격을 사용할 수 있는 구조를 활용할 수 있다.

즉:

```text
기본 상품
+
추가 옵션
↓
서버에서 총 가격 계산
↓
한 번에 결제
```

방식이 가능하면
별도 1,000원 transaction보다 효율적이다.

실제 구현 전 Polar 최신 Checkout API를 재확인한다.

---

# 32. 결제 후 추가 입력

이미 결제가 끝난 뒤:

```text
추가 대용량 사용
```

을 원하면:

```text
새 Checkout
```

이 필요할 가능성이 높다.

따라서 MVP에서는
결제 후 micro add-on을 최소화한다.

---

# 33. Add-on보다 Upgrade가 더 자연스러울 수 있다

예:

```text
QUICK 사용자
↓
공고 / 이력서 / 추가자료까지 분석하고 싶음
↓
PRO Upgrade
```

이게:

```text
+2,000자
+5,000자
```

보다 제품적으로 더 명확하다.

---

# 34. QUICK → PRO Upgrade

향후:

```text
QUICK 4,900원 결제
↓
PRO 기능 필요
↓
차액 결제
```

형태도 고려 가능.

예:

```text
PRO 업그레이드
+5,000원
```

정책/결제 구현은 Polar와 entitlement 구조를 보고 결정한다.

---

# 35. FINAL도 동일

```text
PRO 9,900
↓
면접 준비 필요
↓
FINAL Upgrade
+5,000원
```

은 제품 이해가 쉽다.

---

# 36. API 비용 Logging 필수

각 AI operation마다 저장:

```text
application_case_id
writing_mode
product_tier
operation_type
model
input_tokens
output_tokens
estimated_cost
latency
success
failure
```

---

# 37. Operation Type 예

```text
JOB_ANALYSIS
DOCUMENT_EXTRACTION
EXPERIENCE_EXTRACTION
EXPERIENCE_RANKING
FOLLOW_UP_GENERATION
FACT_SUMMARY
OUTLINE
DRAFT_GENERATION
REVISION
FINAL_REVIEW
INTERVIEW_QUESTIONS
INTERVIEW_TURN
```

---

# 38. 실제 가격결정에 필요한 핵심 지표

상품별:

```text
Average API Cost

Median API Cost

P90 API Cost

P95 API Cost

Maximum Reasonable Cost

Average Revision Count

Average Input Length

Average Document Count

Average Session Duration
```

을 본다.

---

# 39. 평균만 보면 안 된다

예:

```text
평균 API 비용
800원
```

이어도

```text
상위 5%
4,000원
```

일 수 있다.

따라서:

```text
P95 Cost
```

가 매우 중요하다.

---

# 40. Pricing Guardrail 예

내부 목표 예:

```text
QUICK
P95 API Cost <= 판매가의 15%

PRO
P95 API Cost <= 판매가의 25%

FINAL
P95 API Cost <= 판매가의 30%
```

실제 기준은 운영 데이터로 조정.

---

# 41. API Cost Budget

Application Case 생성 시 내부적으로:

```text
cost_budget
```

을 둘 수 있다.

예:

```text
QUICK
target budget: 500~800원

PRO
target budget: 2,000~2,500원

FINAL
target budget: PRO + interview budget
```

유저에게 노출하지 않는다.

---

# 42. Budget 초과 대응

예:

```text
불필요한 재분석 캐시
저비용 모델 라우팅
이미 계산한 결과 재사용
revision context 축소
structured summary 재사용
```

등.

---

# 43. 동일 문서 재분석 비용 절감

사용자가:

```text
표현 하나만 수정
```

했는데 매번:

```text
공고 전체 재분석
이력서 전체 재분석
경험 전체 재추출
```

하지 않는다.

저장된:

```text
Job Requirements
Candidate Facts
Experience Candidates
```

를 재사용한다.

---

# 44. PRO에서 연속성 유지

사용자가 며칠 뒤 돌아와도:

```text
처음부터 전체 분석
```

하지 않는다.

저장:

```text
workflow stage
candidate facts
job requirements
selected experiences
approved facts
outline
document versions
```

을 기반으로 이어서 진행한다.

---

# 45. 글자수보다 연산 중복이 원가에 더 중요할 수 있다

원가 관리에서:

```text
7,000자 → 8,000자
```

보다:

```text
같은 분석을 10번 반복
```

하는 것이 더 큰 문제가 될 수 있다.

따라서:

```text
revision policy
analysis caching
workflow persistence
```

가 중요하다.

---

# 46. Revision 정책

사용자에게:

```text
3번만 수정 가능
```

을 강하게 노출할 필요는 없지만,
내부적으로 정상 범위를 둔다.

예:

```text
일반적인 수정 3~5회
```

이후에는:

```text
scope 확인
새로운 요구인지
완전히 다른 지원서인지
```

판단할 수 있다.

---

# 47. FREE 영역과 PAID 영역

무료:

```text
작성상태 확인
텍스트 입력
파일 선택
간단한 상태 진단
상품 추천
```

유료 API:

```text
정밀 분석
공고 분석
경험 추출
첨삭
작성
최종검수
```

결제 전에 불필요한 API 비용을 발생시키지 않는다.

---

# 48. QUICK 가격 최종 판단

현재:

```text
4,900원
```

유지 추천.

이유:

```text
진입 가격으로 부담 낮음
API 원가 감당 가능
Polar 고정수수료 고려 시 더 낮추는 것은 비효율 가능
```

---

# 49. PRO 가격 최종 판단

현재:

```text
9,900원
```

유지 추천.

PRO의 기능 범위:

```text
공고
지원자료
경험 추천
작성/보완
교차검수
면접질문
```

을 생각하면 사용자 가치 대비 충분히 경쟁력 있는 가격일 수 있다.

---

# 50. FINAL 가격 최종 판단

현재:

```text
14,900원
```

유지 가능.

다만:

```text
면접 Session Scope
```

를 반드시 내부적으로 정의한다.

---

# 51. 당장 가격 올리지 않는 이유

API 원가가 실제로:

```text
얼마나 발생하는지
```

아직 production 데이터가 없다.

따라서 추정만으로:

```text
PRO 12,900
QUICK 6,900
```

처럼 올리는 것보다
먼저 실제 원가를 측정한다.

---

# 52. 가격 인상 신호

다음이 확인되면 재검토:

```text
P95 API cost가 지나치게 높음
사용자가 평균적으로 예상보다 많은 revision 사용
대용량 파일이 일반적
면접 session이 지나치게 길어짐
Polar/세금/환율 구조 변화
환불률 증가
```

---

# 53. 가격 인하 신호

다음이 확인되더라도
곧바로 가격을 내릴 필요는 없다.

```text
API 비용이 매우 낮음
```

가격은 원가뿐 아니라:

```text
사용자 가치
시장 가격
전환율
브랜드 포지셔닝
```

으로 결정한다.

---

# 54. 최종 권장 정책

```text
QUICK 4,900원
- Application Case 1건
- 현재 작성본 중심
- 권장 7,000자
- 합리적 초과 허용
- 내부 Hard Cap

PRO 9,900원
- Application Case 1건
- 공고 + 지원서 + 지원자료
- 7,000자 단위 과금 없음
- 내부 abuse limit

FINAL 14,900원
- PRO 전체
- 1회 Interactive Interview Scope
- 내부 session limit
```

---

# 55. MVP에서 하지 않을 것

```text
+7,000자 = +1,000원
+7,000자 = +5,000원
글자수 단위 결제
매번 초과시 Checkout
무제한 revision
무제한 면접
```

---

# 56. MVP에서 할 것

```text
Application Case 기반 entitlement
Soft Limit
Hard Cap
Scope Violation Detection
API Cost Logging
Model Routing
Analysis Cache
Revision Tracking
```

---

# 57. 가장 중요한 가격 철학

> **우리는 토큰이나 글자 수를 파는 것이 아니라, 한 번의 지원을 더 잘 준비하도록 돕는 결과를 판다.**

---

# 58. 사용자에게 보여줄 표현

추천:

```text
QUICK
한 지원서 빠른 첨삭

PRO
한 회사·한 직무 지원 전체 분석

FINAL
PRO + AI 면접 준비
```

피하기:

```text
7,000자 제공
API 5회 제공
AI 메시지 10회 제공
```

---

# 59. Codex CLI Review Prompt

```text
Read:

- MOOA_RESUME_PRICING_FLOW_MATRIX_ADDENDUM.md
- MOOA_RESUME_INTERNAL_AI_ENGINE.md
- latest pricing / checkout / entitlement implementation
- MOOA_RESUME_PRICING_ECONOMICS_USAGE_LIMIT_ADDENDUM.md

Do not implement yet.

Latest pricing decisions:

QUICK = 4,900 KRW
PRO = 9,900 KRW
FINAL = 14,900 KRW

Core principle:

"We sell one application outcome/workflow, not characters, tokens, or message counts."

Rules:

1. QUICK and PRO are scoped primarily by Application Case.
2. Character limits are technical guardrails, not the primary commercial unit.
3. QUICK may use ~7,000 chars as a soft limit, with a higher internal hard cap.
4. Do not charge immediately at 7,001 characters.
5. PRO should not use a strict 7,000-character paywall.
6. Detect company/job/posting changes as scope changes rather than mere character overages.
7. Do not implement +1,000 KRW or +5,000 KRW per extra 7,000 chars in MVP.
8. If add-ons become necessary later, prefer a calculated single checkout before payment rather than many tiny post-payment transactions.
9. Log actual API cost per operation and Application Case.
10. Measure average, P90, P95, and high-cost outliers before changing prices.
11. Cache and reuse job analysis, candidate facts, experience extraction, and other stable analysis.
12. Track revision count internally.
13. FINAL must have an internal interview-session scope and cannot be unrestricted infinite chat.
14. API keys, cost budgets, and internal limits must remain server-side.

Audit and report:

A. Current pricing / entitlement model.
B. Whether character count is incorrectly being used as the commercial unit.
C. Current hard/soft limits.
D. Possible scope-abuse paths.
E. API cost logging gaps.
F. Opportunities to cache/reuse analysis.
G. Recommended QUICK/PRO/FINAL cost budgets.
H. How Polar checkout should be structured for future optional upgrades/add-ons.
I. MVP implementation versus later implementation.

Do not modify files until review is complete.
```

---

# 60. Source of Truth

Pricing Economics / Usage Limit 관련 우선순위:

1. 실제 최신 Polar / OpenAI 가격 및 결제 정책
2. 최신 명시적 사용자 결정
3. `MOOA_RESUME_PRICING_ECONOMICS_USAGE_LIMIT_ADDENDUM.md`
4. Pricing Flow Matrix
5. Internal AI Engine
6. Outcome / Result Specs
7. PROJECT_SPEC.md
8. AGENTS.md

이 문서는 **현재 가격대의 수익성 검토, API 비용 관리, Application Case 단위 과금, 글자수 제한 및 추가입력 정책에 대한 최신 내부 기준**이다.
