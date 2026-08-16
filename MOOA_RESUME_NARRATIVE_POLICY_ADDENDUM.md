# MOOA Resume — Narrative Policy & Prompt Architecture Addendum
## My GPT Instructions Migration / Narrative Latitude / Fact vs Interpretation

> 작성 기준일: 2026-08-16  
> 문서 성격: **내부 전용 / Private Repo 권장**  
> 목적: 기존 My GPT에서 사용하던 지침을 API 기반 MOOA Resume에 어떻게 이관할지, 그리고 자기소개서 작성에서 **사실 정확성**과 **설득력 있는 해석/프레이밍**의 경계를 정의한다.
>
> 이 문서는 기존 `MOOA_RESUME_INTERNAL_AI_ENGINE.md`를 보완한다.

---

# 1. 핵심 결론

MOOA Resume에는 My GPT처럼 명확한 지침이 필요하다.

하지만:

> **거대한 규칙 한 덩어리로 AI를 묶어버리면 안 된다.**

전체 설계는 MD에 보관하되,
실제 API 호출에는 현재 작업에 필요한 규칙만 조립해서 전달한다.

---

# 2. MD의 역할과 실제 API Prompt의 역할을 분리

`INTERNAL_AI_ENGINE.md`,
본 문서,
기타 내부 스펙은:

```text
사람이 읽는 전체 설계 원본
```

이다.

실제 API에는 이 문서 전체를 매번 넣지 않는다.

권장 구조:

```text
INTERNAL_AI_ENGINE.md
NARRATIVE_POLICY_ADDENDUM.md
        ↓
        ↓ 구현
        ↓
Hard Policies
        +
Fact / Evidence Rules
        +
Soft Writing Policy
        +
현재 WritingMode 전용 Prompt
        +
현재 단계 Rubric
        +
Structured Output Schema
        +
Deterministic Application Logic
```

---

# 3. 내부 구성 권장

```text
Hard Policies
- 사실 생성 금지
- 수치 생성 금지
- 사용자 역할 왜곡 금지

Fact / Evidence Rules
- 어떤 사실을 확정 표현할 수 있는가
- 어떤 내용이 확인이 필요한가

Soft Writing Policy
- 어느 수준의 해석이 허용되는가
- 어느 수준의 직무 연결이 허용되는가

CREATE Prompt
- 경험 발굴
- 질문
- 사실 승인
- 개요
- 작성

BUILD Prompt
- 초안 진단
- 경험 강화
- 내용 재구성

POLISH Prompt
- 최소 수정
- 교차검수
- 표현 정리

Rubrics
- Question Fit
- Evidence Quality
- Job Fit
- Specificity
- Persuasiveness

Schemas
- Fact
- Interpretation
- Risk
- Revision
- Result

Deterministic Code
- 글자수
- eligibility
- 상태전환
- 확정적인 중복 검사 일부
- 결제/권한
```

---

# 4. 기존 My GPT 내용을 새 서비스에 옮기는 방식

기존 My GPT를 API로 직접 호출하는 개념이 아니다.

기존 My GPT에서 잘 작동했던:

```text
Instructions
평가기준
첨삭원칙
금지규칙
질문방식
출력형식
예시
```

를 추출한다.

그리고 다음처럼 분해한다.

```text
기존 My GPT
↓
규칙 추출
↓
A. Common Policy
B. Fact Policy
C. Narrative Policy
D. CREATE Prompt
E. BUILD Prompt
F. POLISH Prompt
G. Rubric
H. Schema
I. Eval Example
```

---

# 5. 나쁜 방식

다음처럼 하나의 거대 Prompt 안에 모든 것을 넣지 않는다.

```text
당신은 MOOA Resume AI입니다.
절대 사실을 만들지 마세요.
추측하지 마세요.
문장을 자연스럽게 만드세요.
창의적으로 작성하세요.
지원자의 생각을 잘 표현하세요.
사용자가 제공하지 않은 것은 쓰지 마세요.
...
수천~수만 자
```

문제가 생기는 이유:

```text
명령 충돌
중복
현재 단계와 무관한 규칙까지 항상 전달
Prompt 비용 증가
행동 일관성 저하
변경 영향 추적 어려움
```

---

# 6. 핵심 Narrative Philosophy

MOOA Resume의 내부 작성원칙:

> **사실은 보수적으로, 해석은 적극적으로.**

영문 개념:

```text
FACTS
= Conservative

INTERPRETATION
= Creative

WRITING
= Persuasive

FABRICATION
= Forbidden
```

---

# 7. 왜 "없는 사실 생성 금지"만으로는 부족한가

자기소개서는 사실을 나열하는 문서가 아니다.

예:

```text
편의점에서 아르바이트했다.
```

라는 사실만 있을 때:

```text
매출을 20% 향상시켰다.
재고관리 시스템을 개선했다.
```

를 AI가 임의로 만드는 것은 금지한다.

하지만:

```text
교대근무 과정에서 업무 인수인계의 중요성을 배웠다.
```

는 성격이 다르다.

이는 새로운 객관적 사건을 만드는 것이 아니라:

> **실제 경험에 의미를 부여하는 서술**

일 수 있다.

이 영역까지 막으면 자기소개서 작성 품질이 지나치게 제한된다.

---

# 8. Narrative Claim 4단계

## Level 1 — FACT

객관적 사실.

사용자가 직접 제공했거나 자료에서 확인된 내용.

예:

```text
편의점에서 8개월 근무
주말 근무
상품 진열
고객 응대
```

원칙:

```text
확인된 사실은 그대로 사용 가능.
```

---

# 9. Level 2 — SUPPORTED_INTERPRETATION

확인된 사실에서 합리적으로 끌어낼 수 있는 의미.

예:

```text
고객 응대를 통해 상황에 맞춰 소통하는 경험을 쌓았다.

교대 환경에서 업무 연속성을 위해
인수인계가 중요하다는 점을 배웠다.
```

이 영역은:

> **자기소개서에서 적극적으로 활용 가능**

해야 한다.

---

# 10. Level 3 — NARRATIVE_FRAMING

동일한 사실을 지원 직무의 언어로 재해석하는 단계.

예: 생산관리 지원

원래 경험:

```text
편의점 교대근무
```

Narrative Framing:

```text
교대근무 경험을 통해
앞선 근무자의 정보를 정확하게 전달받고
다음 근무자에게 넘기는 과정이
업무 연속성에 중요하다는 점을 체감했습니다.
```

객관적 사실을 새로 만들지 않으면서
실제 경험을 직무 역량과 연결한다.

---

# 11. Level 4 — FABRICATION

새로운 사건, 역할, 숫자, 성과를 만드는 것.

금지.

예:

```text
재고 오류를 30% 감소시켰다.
매출 1위를 달성했다.
신입사원 교육을 담당했다.
고객 만족도를 20% 높였다.
```

사용자가 이런 내용을 제공하거나 확인하지 않았다면
확정적으로 작성하지 않는다.

---

# 12. 2~3단계도 항상 확정 표현 가능한 것은 아니다

예:

실제 사실:

```text
편의점에서 계산 업무를 했다.
```

AI가 바로:

```text
교대근무를 통해 체계적인 인수인계의 중요성을 배웠습니다.
```

라고 쓰면:

> 사용자가 실제로 느꼈던 생각까지 AI가 만들어냈을 가능성

이 있다.

따라서 사용자 개인의:

```text
느낀 점
동기
깨달음
가치관
배운 점
```

을 새롭게 확정해야 하는 경우에는
확인 질문 또는 후보 제안을 먼저 고려한다.

---

# 13. 좋은 확인 방식

AI:

```text
이 경험은
'교대 시 인수인계와 업무 연속성'
을 강조하는 소재로 활용할 수 있습니다.

실제로 교대 과정에서
인수인계가 중요하다고 느낀 경험이 있었나요?
```

사용자:

```text
다음 사람이 담배재고랑 시재,
택배 같은 걸 알아야 해서 중요했음.
```

그러면 관련 Interpretation은:

```text
USER_CONFIRMED
```

상태가 된다.

---

# 14. Narrative Latitude

내부적으로 허용되는 해석/프레이밍 범위를
`Narrative Latitude`로 관리할 수 있다.

예:

```text
0 = 사실만 재배열
1 = 안전한 의미 해석
2 = 직무에 맞는 적극적 Framing
3 = 확인 질문을 활용한 적극적 Storytelling
```

중요:

```text
4 = 새로운 객관적 사실 생성
```

같은 단계는 존재하지 않는다.

---

# 15. WritingMode별 기본 Narrative Latitude

## QUICK

```text
1 ~ 2
```

현재 작성된 글 중심.

사용자가 이미 작성한 의미를 최대한 보존하면서
안전한 해석과 표현 강화를 허용한다.

---

## BUILD

```text
2
```

초안의 내용을 적극적으로 직무와 연결하고
경험의 의미를 강화한다.

필요한 개인적 사실/깨달음은 확인한다.

---

## CREATE

```text
2 ~ 3
```

사용자와 상호작용할 수 있으므로:

```text
의미 후보 생성
↓
질문
↓
사용자 확인
↓
적극적인 Storytelling
```

까지 가능하다.

---

## POLISH

기본적으로:

```text
1
```

필요한 경우 2까지.

이미 거의 완성된 글이므로
새로운 Storytelling보다 기존 의미 보존이 우선이다.

---

# 16. Narrative Latitude는 창의성 제한 장치가 아니다

목적은:

```text
AI를 겁먹게 만드는 것
```

이 아니라:

> **어디까지 자유롭게 해석하고 표현할 수 있는지를 정의**

하는 것이다.

---

# 17. 나쁜 지침 예

```text
없는 내용 쓰지 마.
추측하지 마.
확실하지 않으면 쓰지 마.
제공된 정보 외에는 절대 쓰지 마.
창작하지 마.
```

이런 규칙을 중복해서 넣으면
AI가 다음 같은 답만 반복할 수 있다.

```text
해당 경험을 구체적으로 작성해주세요.
추가 정보를 입력해주세요.
```

결과적으로:

```text
안전하지만 쓸모없는 AI
```

가 될 수 있다.

---

# 18. 좋은 지침 예

권장 정책:

> 객관적 사실을 새로 만들지 않는다.  
> 제공된 사실의 의미, 배운 점, 직무와의 연결은 합리적으로 제안할 수 있다.  
> 사용자의 개인적인 감정, 동기, 깨달음을 새롭게 주장해야 하는 경우에는 후보로 제안하거나 확인을 요청한다.  
> 확인된 사실과 합리적 해석을 바탕으로 표현 자체는 충분히 설득력 있게 작성할 수 있다.

---

# 19. 허용되는 "부풀림"을 다시 정의

MOOA Resume에서는 단순히:

```text
부풀림 허용 / 금지
```

로 보지 않는다.

구분:

```text
사실 확대
→ 금지

의미 확대
→ 합리적 범위 허용

직무 연결
→ 적극 허용

표현 강화
→ 적극 허용

사용자의 생각 생성
→ 확인 필요

새로운 성과/수치 생성
→ 금지
```

---

# 20. 경험을 직무 언어로 번역하는 기능

이 서비스의 중요한 역할 중 하나.

예:

원본:

```text
편의점 야간 아르바이트
```

AI 내부 의미 후보:

```text
교대 / 인수인계
시간대별 업무 우선순위
고객응대
반복업무 정확성
재고 확인
예상치 못한 상황 대응
```

하지만 이 후보를 곧바로 사실로 채택하지 않는다.

---

# 21. 의미 후보 → 확인 → Narrative

예:

AI:

```text
교대할 때 앞 근무자와
반드시 전달해야 했던 정보가 있었나요?
```

사용자:

```text
시재, 담배재고, 택배 같은 것.
```

이제 다음 표현은 근거가 생긴다.

```text
교대 과정에서 시재·재고·택배 현황을 정확하게 공유하며,
정보 전달이 다음 근무자의 업무 정확성과
직접 연결된다는 점을 경험했습니다.
```

이것은:

```text
허위 경력 생성
```

이 아니라:

> **실제 경험을 직무 언어로 번역**

한 것이다.

---

# 22. 결과/성과 평가도 단순 숫자 중심으로 하지 않는다

Evaluator가:

```text
수치 성과가 없음
→ 약한 경험
```

으로 단순 판단하면 안 된다.

자기소개서의 결과는 여러 형태가 있다.

---

# 23. Outcome Types

## Quantitative Outcome

정량적 결과.

예:

```text
시간 20% 감소
매출 증가
오류율 감소
처리량 증가
```

단 수치는 반드시 근거가 있어야 한다.

---

## Qualitative Outcome

정성적 변화.

예:

```text
고객 불만 해결
업무 인수인계 원활
작업 흐름 안정
협업 문제 해결
```

---

## Behavioral Evidence

결과 숫자가 없어도
실제 행동이 역량의 근거가 될 수 있다.

예:

```text
혼잡 시간대 업무 우선순위 조정
고객 요구 파악 후 대응
교대 전 필수정보 정리
```

---

## Learning / Insight

실제 경험을 통해 얻은 이해.

예:

```text
업무 연속성에서 인수인계의 중요성을 이해
현장에서는 정확한 정보전달이 중요하다는 점을 체감
```

개인적 깨달음은 필요 시 사용자 확인.

---

## Transferable Skill

다른 직무에서도 활용 가능한 역량.

예:

```text
정확성
우선순위 판단
정보 전달
상황 대응
협업
고객 커뮤니케이션
```

---

# 24. 경험 품질 평가 원칙

스펙이 화려하다고 무조건 높은 평가를 하지 않는다.

다음도 충분히 좋은 근거가 될 수 있다.

```text
구체적인 행동
일관된 책임 수행
문제상황 대응
실제 업무 맥락
정성적 결과
배운 점
직무로 이전 가능한 역량
```

---

# 25. Claim Schema

문장 또는 의미 단위별로 내부 상태를 둘 수 있다.

예:

```json
{
  "text": "교대 과정에서 업무 연속성의 중요성을 체감했다.",
  "basis": ["FACT-21", "FACT-24"],
  "claimType": "SUPPORTED_INTERPRETATION",
  "requiresConfirmation": true
}
```

---

# 26. Claim Type 예시

```text
VERIFIED_FACT

USER_CONFIRMED_FACT

SUPPORTED_INTERPRETATION

TRANSFERABLE_SKILL_FRAMING

NARRATIVE_ENHANCEMENT

UNSUPPORTED_CLAIM

PROHIBITED_FABRICATION
```

---

# 27. requiresConfirmation

다음 유형은 확인이 필요할 가능성이 높다.

```text
사용자의 감정
사용자의 동기
사용자의 깨달음
수치
정확한 성과
정확한 책임범위
타인의 평가
리더십 역할
```

---

# 28. Confirmation 없이 가능한 것

일반적으로:

```text
문장 정리
가독성 향상
논리 재배치
확인된 행동의 직무 용어 변환
확인된 사실 간 자연스러운 연결
```

은 별도 확인 없이 가능할 수 있다.

---

# 29. AI가 의미 후보를 생성할 수는 있다

중요:

AI가:

```text
이 경험에서 활용 가능한 포인트
```

를 적극적으로 제안하는 것은 허용한다.

예:

```text
이 경험에서 활용 가능한 소재

1. 업무 인수인계
2. 반복업무 정확성
3. 고객 상황 대응
4. 우선순위 판단
```

단:

> 후보를 생성하는 것과 사용자의 실제 경험이었다고 확정하는 것은 다르다.

---

# 30. CREATE에서의 활용

```text
Candidate Facts
↓
Possible Interpretations
↓
Possible Transferable Skills
↓
사용자에게 가장 가치 높은 후보 제시
↓
필요한 부분 확인
↓
USER_CONFIRMED
↓
Outline
↓
Draft
```

---

# 31. BUILD에서의 활용

```text
현재 초안
↓
현재 사용한 사실/해석 추출
↓
약한 의미 연결 탐지
↓
더 설득력 있는 Narrative 후보
↓
필요한 경우 확인
↓
보강
```

---

# 32. POLISH에서의 활용

POLISH에서는 새로운 서사를 적극적으로 만들기보다:

```text
기존 사용자의 의미
↓
더 정확하고 설득력 있는 표현
```

에 집중한다.

---

# 33. QUICK에서의 활용

QUICK은 외부 자료 발굴 없이
현재 글 안에서 확인되는 의미를 중심으로 한다.

다음처럼 대규모 소재 재발굴은 PRO 영역.

```text
다른 경력에서 더 적합한 Narrative 탐색
```

---

# 34. Fact / Interpretation / Writing 분리

한 문장이 다음 세 요소를 동시에 가질 수 있다.

```text
FACT
무슨 일이 있었는가

INTERPRETATION
그 경험이 무엇을 의미하는가

WRITING
그 의미를 어떻게 설득력 있게 표현하는가
```

AI는 이 세 가지를 혼동하지 않아야 한다.

---

# 35. 예시

Fact:

```text
시재와 담배재고를 다음 교대자에게 전달했다.
```

Interpretation:

```text
교대 업무에서는 정확한 정보전달이
업무 연속성에 중요하다.
```

Writing:

```text
교대 과정에서 시재와 재고 현황을 빠짐없이 공유하며,
작은 정보 누락도 다음 근무자의 업무 정확성에
영향을 줄 수 있다는 점을 체감했습니다.
```

---

# 36. Persuasive Writing은 허용한다

사실을 정확히 지킨다고 해서
문장을 밋밋하게 작성할 필요는 없다.

허용:

```text
문장 구조 개선
강한 동사 사용
앞뒤 논리 강화
직무 언어 적용
핵심 행동 강조
불필요한 표현 제거
설득력 있는 순서 재배치
```

---

# 37. Persuasive Writing과 Fabrication의 차이

허용:

```text
"고객 문의를 처리했다."
→
"고객의 요구사항을 먼저 확인한 뒤 상황에 맞춰 대응했습니다."
```

단 실제로 그런 행동이 자료/사용자 설명과 부합해야 한다.

금지:

```text
"고객 문의를 처리했다."
→
"고객 만족도를 30% 향상시켰습니다."
```

근거 없는 성과 생성.

---

# 38. 평가 Rubric에 Narrative Quality 포함

내부 평가 요소 후보:

```text
Fact Grounding
Interpretation Quality
Job Relevance
Specificity
Behavioral Evidence
Outcome Quality
Transferability
Persuasiveness
User Voice Preservation
```

---

# 39. Evaluator가 피해야 할 오류

```text
숫자가 없으므로 약한 경험
대기업 경험이 아니므로 약함
정규직이 아니므로 가치 낮음
직무명이 다르므로 활용 불가
```

같은 단순판단을 피한다.

실제 행동과 직무로의 이전 가능성을 본다.

---

# 40. Hard Policy와 Soft Policy 분리

## Hard Policy

위반해서는 안 됨.

```text
허위 수치 생성 금지
허위 직책 생성 금지
허위 기간 생성 금지
허위 성과 생성 금지
허위 자격증 생성 금지
허위 프로젝트 생성 금지
사용자가 하지 않은 행동을 확정 서술 금지
```

---

## Soft Policy

상황에 따라 유연하게 적용.

```text
표현 적극성
Narrative 강도
직무 연결 수준
사용자 말투 보존 정도
Rewrite 범위
추가질문 여부
```

---

# 41. Deterministic Code와 LLM 판단을 나누기

## 코드가 담당하기 좋은 것

```text
글자수
필수필드
상품 eligibility
workflow state
known duplicate exact-match
fact status
확정된 기간 비교
payment entitlement
```

## LLM이 담당하기 좋은 것

```text
문항 의도
경험 의미
직무 연결
Narrative 후보
설득력
정성적 결과
추가질문 가치
```

---

# 42. 모든 규칙을 API에 매번 보내지 않는다

예:

CREATE 경험 발굴 단계에서는:

```text
Common Evidence Policy
+
Narrative Policy
+
CREATE Discovery Prompt
+
Experience Candidate Schema
```

만 필요.

POLISH 최종검수 단계에서는:

```text
Common Evidence Policy
+
POLISH Review Policy
+
Final Review Rubric
+
Review Schema
```

만 필요.

---

# 43. Prompt Assembly 개념

```ts
buildPrompt({
  workflow: "CREATE",
  stage: "EXPERIENCE_DISCOVERY",
  writingMode: "CREATE",
  narrativeLatitude: 2,
})
```

결과:

```text
COMMON_POLICY
+
EVIDENCE_POLICY
+
NARRATIVE_POLICY_LEVEL_2
+
CREATE_EXPERIENCE_DISCOVERY
+
OUTPUT_SCHEMA
```

---

# 44. Prompt를 코드처럼 버전 관리

예:

```text
COMMON_POLICY_V2
EVIDENCE_POLICY_V4
NARRATIVE_POLICY_V3
CREATE_DISCOVERY_V5
BUILD_ENHANCE_V3
POLISH_REVIEW_V2
```

Analysis Run에 기록한다.

---

# 45. Narrative Policy 변경도 Eval 필요

예:

```text
Latitude 1 → 2
```

로 바꾸면 다음을 비교한다.

```text
사실 생성률 증가 여부
사용자 말투 훼손
직무 연결 개선
설득력 개선
확인질문 증가/감소
```

---

# 46. "정확성"만 최적화하지 않는다

목표함수는:

```text
Truthfulness
+
Usefulness
+
Persuasiveness
+
Job Relevance
+
User Authenticity
```

이다.

정확하지만 아무 도움 없는 결과는 성공이 아니다.

설득력 있지만 허위인 결과도 성공이 아니다.

---

# 47. Narrative Candidate를 먼저 제안하는 UX

확신이 부족한 경우 AI가 문장을 확정 생성하기보다:

```text
이 경험에서 강조할 수 있는 방향

[교대/인수인계]
[정확성]
[고객대응]
[업무 우선순위]
```

를 먼저 보여줄 수 있다.

사용자 선택 후 작성.

이 방식은 CREATE에서 특히 유용하다.

---

# 48. 사용자 선택도 Fact Quality를 높인다

사용자가:

```text
[교대/인수인계]
```

를 선택하면:

```text
이 경험에서 본인이 강조하고 싶은 의미
```

에 대한 추가 신호가 생긴다.

이를:

```text
USER_SELECTED_INTERPRETATION
```

등으로 기록 가능.

---

# 49. 외부 홍보 표현

내부 Narrative Latitude를 그대로 노출할 필요는 없다.

외부에서는:

```text
없는 경험을 만들지 않습니다.

사실을 지키면서
내 경험의 의미와 직무 연결을 찾아드립니다.

평범해 보이는 경험도
지원 직무에 맞는 강점으로 정리합니다.
```

정도는 좋은 홍보 포인트가 될 수 있다.

---

# 50. 외부에서 숨길 것

굳이 공개하지 않음:

```text
Narrative Latitude 0~3
Claim Type schema
requiresConfirmation 로직
Prompt Assembly
Narrative Threshold
Rubric Weight
```

---

# 51. 내부 차별화

경쟁사가:

```text
AI 자소서 첨삭
공고 분석
```

을 그대로 따라해도,

MOOA Resume 내부에서는:

```text
Fact
↓
Interpretation
↓
Confirmation
↓
Narrative
↓
Job Translation
↓
Evaluation
```

을 구분해서 처리한다.

이 과정 자체가 품질 차이를 만든다.

---

# 52. 핵심 내부 슬로건

> **사실은 보수적으로, 해석은 적극적으로.**

보조 원칙:

> **새로운 사실은 만들지 않는다.  
> 기존 사실에서 의미는 적극적으로 찾는다.**

그리고:

> **평범한 경험을 과장하는 것이 아니라, 그 경험 안에서 실제로 존재하는 직무 가치와 행동 근거를 찾아낸다.**

---

# 53. 구현 우선순위

초기:

```text
1. Hard Fact Policy
2. Claim Type
3. Supported Interpretation
4. requiresConfirmation
5. WritingMode별 Narrative Latitude
6. Structured Output Schema
7. CREATE Fact Confirmation
8. BUILD Narrative Enhancement
9. POLISH Minimal Rewrite
```

후속:

```text
10. Narrative Candidate Ranking
11. User-selected Interpretation
12. Eval calibration
13. Adaptive Narrative Latitude
```

---

# 54. Codex CLI Review Prompt

```text
Read:

- MOOA_RESUME_INTERNAL_AI_ENGINE.md
- MOOA_RESUME_NARRATIVE_POLICY_ADDENDUM.md
- latest CREATE / BUILD / POLISH workflow specs.

Do not implement yet.

Audit the current AI prompting and writing logic.

The core writing philosophy is:

"Facts conservative, interpretation active, writing persuasive, fabrication forbidden."

Important:

1. Do not turn "no fabrication" into an overly restrictive AI that only asks for more information.
2. Separate:
   - objective facts,
   - supported interpretation,
   - narrative framing,
   - fabrication.
3. The AI may actively identify useful meanings and transferable skills from verified experiences.
4. It must not invent objective events, roles, achievements, numbers, dates, certifications, or responsibilities.
5. If the AI needs to assert a new personal feeling, motivation, insight, or learning point, consider proposing it as a candidate or asking for confirmation.
6. CREATE may use a higher Narrative Latitude because it has an interactive confirmation flow.
7. POLISH should preserve the user's existing meaning and use lower Narrative Latitude.
8. QUICK must stay centered on the submitted draft and must not perform deep external experience discovery.
9. Evaluation must recognize qualitative outcomes, behavioral evidence, learning, and transferable skills—not only numeric achievements.
10. Prompt rules should be modular. Do not send the full INTERNAL_AI_ENGINE.md on every API call.
11. Hard policies, soft policies, workflow prompts, rubrics, schemas, and deterministic code must be separated.
12. Internal prompt structures and Narrative Latitude details must not be exposed in public UI.

Report:

A. Current prompt conflicts or overly restrictive rules.
B. Rules that should be Hard Policies.
C. Rules that should be Soft Narrative Policies.
D. Recommended Claim schema.
E. Recommended Narrative Latitude handling for CREATE, BUILD, POLISH, QUICK.
F. Where confirmation is required.
G. Which decisions should be deterministic code versus LLM reasoning.
H. Migration plan from current prompts/My GPT rules.

Do not modify files until the review is complete.
```

---

# 55. Codex Implementation Direction

예상 타입:

```ts
type ClaimType =
  | "VERIFIED_FACT"
  | "USER_CONFIRMED_FACT"
  | "SUPPORTED_INTERPRETATION"
  | "TRANSFERABLE_SKILL_FRAMING"
  | "NARRATIVE_ENHANCEMENT"
  | "UNSUPPORTED_CLAIM"
  | "PROHIBITED_FABRICATION";
```

예:

```ts
interface NarrativeClaim {
  text: string;
  basisFactIds: string[];
  claimType: ClaimType;
  requiresConfirmation: boolean;
  confirmedByUser?: boolean;
}
```

Narrative Latitude:

```ts
type NarrativeLatitude = 0 | 1 | 2 | 3;
```

단 실제 구현 형태는 기존 코드 구조를 먼저 Audit한 뒤 결정한다.

---

# 56. 최종 원칙

MOOA Resume의 AI는 두 극단을 피한다.

극단 A:

```text
겁먹은 AI

"확실하지 않으니 작성할 수 없습니다."
"정보를 더 주세요."
"정보를 더 주세요."
```

극단 B:

```text
환각하는 AI

"매출 30% 향상"
"팀을 리드"
"프로세스를 개선"
```

목표:

```text
사실을 지킨다.
↓
평범한 경험 속 의미를 찾는다.
↓
직무에 맞게 번역한다.
↓
필요한 부분만 사용자에게 확인한다.
↓
충분히 설득력 있게 쓴다.
```

이것이 MOOA Resume의 Narrative Engine 기본 원칙이다.

---

# 57. Source of Truth

Narrative / Prompt Architecture 관련 우선순위:

1. 보안 / 개인정보
2. 최신 명시적 사용자 결정
3. `MOOA_RESUME_NARRATIVE_POLICY_ADDENDUM.md`
4. `MOOA_RESUME_INTERNAL_AI_ENGINE.md`
5. Pricing / Workflow Specs
6. Result / Document Specs
7. PROJECT_SPEC.md
8. AGENTS.md

이 문서는 **My GPT 지침 이관, Prompt 모듈화, 사실/해석/프레이밍/허위 경계, Narrative Latitude에 대한 최신 기준**이다.
