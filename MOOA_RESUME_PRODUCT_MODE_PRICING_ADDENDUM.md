# MOOA Resume — Product Mode & Pricing Addendum
## QUICK vs PRO, CREATE Eligibility, Guided AI Writing Flow

> 작성 기준일: 2026-08-15  
> 용도: 기존 `PROJECT_SPEC.md`, `MOOA_RESUME_ADDITIONAL_SPEC.md` 이후 추가된 최신 제품 결정사항 정리  
> 중요: 이 문서는 **작성단계 3유형과 상품 가격제의 관계**에 대한 최신 기준이다.  
> 동일 내용이 기존 문서와 충돌하면 이 문서가 우선한다.

---

# 0. 이번 추가 결정의 핵심

사용자 상태는 3가지로 구분한다.

```text
1. 아무것도 작성하지 않음 → CREATE
2. 대충 작성함 → BUILD
3. 거의 완성함 → POLISH
```

하지만 이 3가지를 각각 별도 상품으로 판매하지 않는다.

가장 중요한 결정:

> **QUICK 4,900원은 “이미 작성된 글을 첨삭하는 상품”이다.**  
> 따라서 자소서가 전혀 없는 CREATE 사용자는 QUICK 상품 자체가 성립하지 않는다.

CREATE 사용자는 기본적으로 **PRO 9,900원 플로우**로 진입한다.

---

# 1. 사용자 상태와 상품은 다른 개념

## 사용자 상태
사용자가 현재 어디까지 작성했는지를 의미한다.

```text
CREATE
BUILD
POLISH
```

## 상품
사용자가 어떤 수준의 서비스를 구매하는지를 의미한다.

```text
QUICK
PRO
FINAL (향후)
```

두 개념을 혼동하지 않는다.

---

# 2. 최종 매핑

| 사용자 상태 | QUICK 4,900 | PRO 9,900 | 설명 |
|---|---:|---:|---|
| CREATE — 아무것도 안 씀 | **X** | **O** | 처음부터 작성은 공고/경험 탐색이 필요 |
| BUILD — 대충 써놓음 | O | O | QUICK은 현재 글 중심, PRO는 외부자료까지 활용 |
| POLISH — 거의 완성 | O | O | QUICK은 빠른 첨삭, PRO는 공고/자료 교차검증 |

---

# 3. QUICK 4,900원의 정확한 정의

## 한 문장 정의
> **작성한 글을 빠르고 제대로 고쳐주는 정밀 첨삭 상품**

## 필수 입력
사용자가 반드시 아래 중 하나를 제공해야 한다.

- 자기소개서 텍스트
- 자기소개서 파일
- 최소한 첨삭 가능한 수준의 작성본

## QUICK 기본 UX

```text
AI 자소서 첨삭

작성한 자기소개서를 입력해주세요.

┌──────────────────────────────┐
│                              │
│   자기소개서 입력             │
│                              │
└──────────────────────────────┘

[파일 업로드]

[첨삭하기]
```

입력은 최대한 단순하게 유지한다.

---

# 4. QUICK에서 제공하는 기능

기본:

- 맞춤법
- 문법
- 문장 표현
- 가독성
- 논리
- 구체성
- 설득력
- 반복 표현
- 추상적 표현 탐지
- 문제 문장 표시
- 문장별 피드백
- 수정 이유
- 최종 수정본
- Before → After

가능하면:
- 현재 글자수
- 문장 길이
- 반복 키워드
- 핵심 개선점 3개

---

# 5. QUICK에서 하지 않는 것

QUICK은 아래 기능을 핵심 범위로 포함하지 않는다.

- 채용공고 전체 분석
- 이력서 자동분석
- 경력기술서 교차분석
- 경험은행 활용
- 문항별 소재 전략
- 처음부터 경험 인터뷰
- 문항별 경험 배치
- 공고 요구역량 매칭
- 지원자료 전체 교차검증
- 면접 리스크 정밀분석

즉 QUICK의 철학은:

```text
현재 작성한 글
↓
정밀 분석
↓
첨삭
↓
피드백
↓
수정본
```

이다.

---

# 6. CREATE 사용자는 왜 QUICK이 성립하지 않는가

자소서가 전혀 없는 사용자는 AI에게 고칠 글 자체가 없다.

AI가 제대로 작성하려면 최소한 아래 정보가 필요하다.

- 어떤 기업인지
- 어떤 직무인지
- 어떤 문항인지
- 글자수/요구사항
- 사용자의 경험
- 사용자의 실제 역할
- 사용자의 결과/성과
- 지원동기 소재

따라서 CREATE는 단순 첨삭이 아니라:

```text
정보 수집
↓
경험 탐색
↓
소재 선정
↓
내용 구성
↓
초안 생성
↓
첨삭
```

이라는 별도 작업이다.

---

# 7. CREATE 진입 UX

QUICK 입력 화면에서 사용자가 아무 내용 없이 `첨삭하기`를 누르면 단순 오류만 띄우지 않는다.

나쁜 UX:

```text
자기소개서를 입력해주세요.
```

권장 UX:

```text
아직 작성한 자기소개서가 없나요?

괜찮습니다.
채용공고와 나의 경험을 바탕으로
처음부터 함께 작성할 수 있습니다.

[처음부터 작성하기 →]
```

이 CTA는 PRO로 연결한다.

---

# 8. 홈페이지의 3가지 사용자 상태는 그대로 유지

랜딩페이지에서는 아래 3개를 계속 보여준다.

## 처음부터 작성
```text
아직 아무것도 못 썼어요.
```
→ PRO

## 내용 보완
```text
써보긴 했는데 내용이 부족해요.
```
→ QUICK 또는 PRO

## 최종 첨삭
```text
거의 완성했고 제출 전에 확인하고 싶어요.
```
→ QUICK 또는 PRO

즉:

```text
사용자 상태 선택
≠
상품 선택
```

이다.

---

# 9. BUILD 사용자의 QUICK vs PRO 차이

BUILD는 두 상품 모두 이용 가능하다.

예시 원문:

```text
저는 자동차에 관심이 많아 지원했습니다.
이전 회사에서 품질업무를 하며 책임감을 키웠습니다.
입사 후 회사에 도움이 되는 직원이 되겠습니다.
```

## QUICK 4,900
AI는 현재 작성된 글 안에서 최대한 분석한다.

```text
현재 지원서는 내용 구체성이 부족합니다.

문제:
- 지원동기가 추상적
- 품질업무의 실제 행동이 없음
- 본인의 역할이 드러나지 않음
- 입사 후 포부가 일반적

권장:
실제 경험과 결과를 추가하는 것이 좋습니다.
```

AI는 현재 글을 중심으로 고쳐준다.
하지만 외부 자료를 적극적으로 탐색해서 새로운 경험을 고르지는 않는다.

---

# 10. BUILD 사용자의 PRO

같은 사용자가 PRO를 사용하면:

입력:

```text
채용공고
+
현재 초안
+
이력서
+
경력기술서
+
추가정보
```

AI는:

```text
현재 초안 분석
↓
공고 요구사항 분석
↓
이력서/경력에서 활용 가능한 경험 추출
↓
현재 글에 빠진 경험 탐지
↓
더 좋은 소재 추천
↓
부족한 정보만 질문
↓
초안 재구성
↓
공고 기준 재검수
```

예:

```text
현재 2번 문항에는 대학 프로젝트를 사용하고 있습니다.

하지만 이력서에서 확인된
'자동차 부품 시험팀 품질 문제 대응 경험'이
이번 생산관리 직무에 더 적합합니다.

[추천 경험으로 다시 구성]
```

---

# 11. POLISH 사용자의 QUICK vs PRO 차이

## QUICK
```text
내가 거의 완성한 글
↓
문장/논리/맞춤법/글자수
↓
최종 첨삭
```

## PRO
```text
내가 거의 완성한 지원서
+
채용공고
+
이력서
+
경력자료

↓
전체 교차검증

- 직무 적합성
- 공고 요구역량
- 경험 중복
- 자료 간 충돌
- 누락 내용
- 면접 리스크
```

---

# 12. PRO 9,900원의 정확한 정의

## 한 문장 정의
> **무엇을 써야 하는지부터, 최종 제출 전 검수까지 함께 진행하는 공고 맞춤 지원서 분석 상품**

## 핵심 입력

필수:
- 채용공고 또는 문항/직무 정보

선택:
- 현재 자소서
- 이력서
- 경력기술서
- 포트폴리오
- 추가 경험
- 자격/활동정보

CREATE의 경우 현재 자소서는 없어도 된다.

---

# 13. PRO의 CREATE 플로우

아무것도 작성하지 않은 사용자의 권장 흐름:

```text
START
↓
채용공고 업로드
↓
기업/직무/문항 분석
↓
기존 자료 확인

├ 이력서 있음
│  ↓
│ 경험 자동 추출
│
└ 자료 없음
   ↓
   경험 간단 질문

↓
경험 후보 생성
↓
문항별 적합한 소재 추천
↓
사용자 선택
↓
부족한 정보 2~4개 질문
↓
사용자 답변
↓
문항 개요 생성
↓
초안 생성
↓
사용자 수정 요청
↓
최종 초안
↓
전체 문항 간 경험 중복검사
↓
공고 기준 최종검수
↓
예상 면접질문
```

---

# 14. CREATE는 자유로운 ChatGPT 채팅으로 만들지 않는다

CREATE는 상호작용형이지만,
완전 자유채팅 서비스로 만들지 않는다.

나쁜 구조:

```text
AI:
무엇을 도와드릴까요?

User:
자소서 써주세요.

AI:
어떤 경험이 있나요?

User:
...

(무제한 자유대화)
```

문제:
- 사용시간 편차 큼
- API 비용 통제 어려움
- 상품 범위 불명확
- 취업 외 질문으로 쉽게 이탈
- UX가 ChatGPT 복제품처럼 보임

---

# 15. 권장 CREATE 인터페이스

**Guided Conversation / Guided Interview**

즉:

```text
대화형 UI
+
선택 카드
+
입력폼
+
체크박스
+
자유답변
```

혼합형.

예:

```text
AI 취업 코치

이번 문항에 사용할 경험 후보를 찾았습니다.

[자동차 생산라인]
현장 이해 ★★★★★
직무 연결 ★★★★★
[이 경험 사용]

[시험팀 품질업무]
품질 ★★★★★
문제해결 ★★★★☆
[이 경험 사용]

[두 경험 조합]
```

다음:

```text
추가로 두 가지만 알려주세요.

1. 당시 본인이 직접 수행한 행동은 무엇인가요?
[입력]

2. 결과가 어떻게 달라졌나요?
[입력]

[답변 제출]
```

---

# 16. AI 질문 수를 최소화

CREATE에서 하나씩 질문을 던져 10턴을 만들 필요가 없다.

가능하면 관련 질문을 묶는다.

```text
추가 정보 3개가 필요합니다.

문제 상황
[입력]

내가 직접 한 행동
[입력]

결과
[입력]

[한 번에 제출]
```

장점:
- 사용자 피로 감소
- API 호출 감소
- latency 감소
- 비용 감소
- 구조화된 데이터 수집

---

# 17. CREATE의 가격 단위

CREATE는 `대화 횟수`나 `AI 사용시간`으로 가격을 정하지 않는다.

권장 단위:

> **한 개의 Application Case / 한 개 채용공고 지원 건**

예:

```text
현대자동차
2026 하반기
생산관리
```

이 전체를 한 건으로 본다.

---

# 18. 왜 지원 건 단위인가

채용공고 하나에는 자소서 문항이 여러 개 있을 수 있다.

예:

```text
1번 700자
2번 700자
3번 1,000자
```

문항별 결제를 하면:
- 가격이 복잡
- 사용자가 계산해야 함
- 경험 중복검사가 어려움
- 전체 지원전략을 만들기 어려움

따라서:

```text
현대자동차 생산관리 2026 하반기
= Application Case 1건
```

으로 보는 것을 권장한다.

---

# 19. Application Case 안에서 가능한 것

PRO 1건에서:
- 공고 분석
- 여러 자기소개서 문항
- 경험 배치
- 문항 간 중복검사
- 작성/보완
- 최종검수
- 예상 면접질문

을 한 프로젝트로 연결한다.

---

# 20. CREATE의 AI 상호작용 비용 통제

사용자에게 `20턴` 같은 제한을 전면에 강조하지 않는다.

대신 내부적으로 제한한다.

예시 정책:

```text
Application Case
- 문항 최대 N개
- 총 입력문서 용량 제한
- 총 원문 길이 제한
- 생성/수정 라운드 제한
- 활성기간 제한
```

초기 수치는 실제 API 원가와 사용자 사용행태를 본 뒤 조정한다.

---

# 21. 수정 라운드

예시:

```text
PRO 1건

초안 생성
+
보완 질문
+
문항별 작성
+
정상적인 수정/재첨삭 3~5회
+
최종검수 1회
```

실제 출시에서는 비용 분석 후 조정한다.

UI에 공격적으로:

```text
남은 질문 7회
```

를 표시하지 않는 것을 권장한다.

---

# 22. 장기간 작성 허용

취업 지원서는 하루에 완성하지 않을 수 있다.

따라서:

```text
오늘 경험 입력
↓
내일 초안 수정
↓
3일 뒤 다시 확인
```

을 허용한다.

Application Case 상태를 저장한다.

예:

```text
현대자동차 생산관리

작성 진행률 72%

1번 완료
2번 수정중
3번 미작성
최종검수 미완료
```

---

# 23. QUICK / PRO 마케팅 문구

## QUICK
### 작성한 글을 제대로 고쳐드립니다.

```text
자소서만 넣으세요.
빠르게 분석하고,
문제점과 수정 이유,
최종 수정본까지 제공합니다.
```

## PRO
### 무엇을 쓸지부터 함께 찾습니다.

```text
채용공고와 내 경험을 분석해
문항별 소재 선정부터
최종 제출 전 검수까지 함께합니다.
```

---

# 24. 가격표에서의 차이

| 기능 | QUICK 4,900 | PRO 9,900 |
|---|---:|---:|
| 작성한 자소서 첨삭 | O | O |
| 문장별 피드백 | O | O |
| 최종 수정본 | O | O |
| Before → After | O | O |
| 부족한 초안 보완 | 기본 | 정밀 |
| 아무것도 없는 상태부터 작성 | **X** | **O** |
| 채용공고 분석 | - | O |
| 이력서/경력자료 활용 | - | O |
| 경험 자동추출 | - | O |
| 문항별 소재 추천 | - | O |
| 부족정보 AI 질문 | - | O |
| 공고↔경험 매칭 | - | O |
| 자료 교차검증 | - | O |
| 문항 간 경험 중복 | - | O |
| 제출 전 최종검수 | 기본 | 정밀 |
| 예상 면접질문 | - | O |

---

# 25. 랜딩의 3유형 CTA

## 처음부터 작성
```text
아직 아무것도 못 썼어요.

[처음부터 작성하기]
```
→ PRO

## 내용 보완
```text
일단 써보긴 했는데 내용이 부족해요.

[빠르게 첨삭하기]
[공고까지 분석해서 보완하기]
```
→ QUICK / PRO

## 최종 첨삭
```text
거의 완성했습니다.

[최종 첨삭하기]
[공고 기준 정밀검수]
```
→ QUICK / PRO

---

# 26. 상품 자동 추천

사용자가 자소서를 비워둔 상태라면:

```text
현재 작성된 자기소개서가 없습니다.

처음부터 작성하려면
PRO 분석을 이용해주세요.

[PRO로 시작하기]
```

사용자가 대충 작성했다면:

```text
현재 글만 빠르게 고치려면 QUICK

공고/이력서까지 함께 분석해
내용 자체를 강화하려면 PRO
```

사용자가 거의 완성했다면:

```text
문장/맞춤법 중심 → QUICK

지원공고/이력서 교차검증까지 → PRO
```

---

# 27. 개발 내부 타입

추천:

```ts
type WritingMode =
  | "CREATE"
  | "BUILD"
  | "POLISH";

type ProductTier =
  | "QUICK"
  | "PRO"
  | "FINAL";
```

작성상태와 가격제를 같은 enum으로 합치지 않는다.

---

# 28. Eligibility Rule

예시:

```ts
type ProductEligibility = {
  quick: {
    eligible: boolean;
    reason?: string;
  };
  pro: {
    eligible: boolean;
    reason?: string;
  };
};
```

CREATE 예:

```json
{
  "quick": {
    "eligible": false,
    "reason": "작성된 자기소개서가 없어 첨삭할 원문이 없습니다."
  },
  "pro": {
    "eligible": true
  }
}
```

---

# 29. QUICK empty-state UI

사용자가 QUICK에 들어왔지만 작성물이 없음:

```text
아직 첨삭할 자기소개서가 없습니다.

작성한 글이 있다면 입력하거나 파일을 업로드해주세요.

아직 작성 전이라면
채용공고와 경험을 바탕으로 처음부터 작성할 수 있습니다.

[PRO에서 처음부터 작성]
```

단순 validation error로 끝내지 않는다.

---

# 30. PRO CREATE 진행상태

DB/Frontend에서 진행단계를 저장할 수 있다.

```ts
type CreateStage =
  | "JOB_ANALYSIS"
  | "EXPERIENCE_DISCOVERY"
  | "EXPERIENCE_SELECTION"
  | "FOLLOW_UP"
  | "OUTLINE"
  | "DRAFT"
  | "REVISION"
  | "FINAL_REVIEW"
  | "INTERVIEW_PREP";
```

이 값은 자유채팅 history만으로 상태를 추정하지 않고,
가능하면 명시적으로 저장한다.

---

# 31. CREATE의 대화 기록

대화 기록은 저장 가능하지만 서비스의 핵심 상태를 채팅 로그에만 의존하지 않는다.

구조화해서 저장:

```text
selected_experiences
candidate_facts
answers_to_followups
outline
draft_versions
review_result
```

채팅은 UI이고,
실제 제품 데이터는 구조화된 필드가 기준이다.

---

# 32. AI가 질문할 때 원칙

AI는 이미 확인 가능한 것을 다시 묻지 않는다.

예:
이력서에 회사/기간이 명확하면 다시 질문하지 않는다.

대신:

```text
해당 시험업무에서
본인이 직접 수행했던 업무 중
가장 중요했던 것을 알려주세요.
```

처럼 현재 자료로 알 수 없는 부분만 묻는다.

---

# 33. 사용자가 자유채팅을 원할 때

CREATE 화면 안에 자유입력은 허용한다.

```text
AI에게 추가로 요청할 내용
[                                              ]
```

하지만 시스템은 해당 메시지를 현재 Application Case와 현재 Stage 안에서 처리한다.

취업과 무관한 범용 ChatGPT처럼 동작하지 않는다.

---

# 34. 향후 구독형

초기에는 단건 상품 권장.

향후 반복 사용자가 많다면:

```text
PRO 1건
9,900원

취업 집중 패스
월 19,900~29,900원
- PRO 지원 건 N개
- 경험은행
- 지원현황 관리
- 면접 준비
```

등을 실험 가능.

단, 초기 MVP에서는 단건 결제로 수요/원가를 먼저 검증한다.

---

# 35. 핵심 사업적 차이

QUICK:

```text
이미 쓴 것을 고친다.
```

PRO:

```text
쓸 것부터 찾고 지원서를 완성한다.
```

이 차이가 명확해야 한다.

가격 차이는 기능 개수보다 **문제의 난이도와 처리 범위**로 설명한다.

---

# 36. 최종 권장 상품 설명

## QUICK — 4,900원

> **이미 작성한 자기소개서를 빠르고 정확하게 첨삭합니다.**

- 원클릭 중심
- 자소서 입력
- 정밀 피드백
- 수정 이유
- 최종본
- Before/After

## PRO — 9,900원

> **아직 아무것도 쓰지 않았어도 괜찮습니다. 채용공고와 경험을 분석해 무엇을 쓸지부터 함께 찾습니다.**

- 공고 분석
- 경험 발굴
- 이력서/경력 활용
- 문항별 소재 배치
- 부족정보 질문
- 작성/보완
- 정밀검수
- 면접 예상질문

---

# 37. Codex 구현 지시 Prompt

```text
Read:
- PROJECT_SPEC.md
- MOOA_RESUME_ADDITIONAL_SPEC.md
- MOOA_RESUME_PRODUCT_MODE_PRICING_ADDENDUM.md
- AGENTS.md

This addendum contains the newest product decision about writing states and paid tiers.

Important rules:

1. CREATE / BUILD / POLISH are user writing states.
2. QUICK / PRO / FINAL are paid product tiers.
3. Do not treat writing states as pricing tiers.
4. QUICK requires an existing draft. A completely empty CREATE user is not eligible for QUICK.
5. CREATE users should be routed to PRO.
6. QUICK must remain extremely simple: draft input → analysis → feedback → revised version.
7. PRO can start with no draft and use job posting + candidate information to guide the user from experience discovery to final draft.
8. PRO CREATE must use a guided interview/workflow, not an unrestricted ChatGPT clone.
9. Store workflow state explicitly; do not derive the entire application state only from chat history.
10. Use structured candidate facts and selected experiences.
11. Do not implement subscriptions, marketplace, B2B, or FINAL live interview unless separately requested.

Before implementation:
- audit current schemas and UI for conflicts with these rules,
- propose the minimal changes required,
- identify any previous implementation that incorrectly allows empty CREATE users into QUICK.

Do not modify files until the plan is summarized.
```

---

# 38. Suggested Implementation Sequence

## Step 1
타입 분리:

```text
WritingMode
ProductTier
Eligibility
```

## Step 2
QUICK:

```text
Draft required validation
+
empty-state PRO routing
```

## Step 3
PRO CREATE state machine:

```text
JOB_ANALYSIS
EXPERIENCE_DISCOVERY
EXPERIENCE_SELECTION
FOLLOW_UP
OUTLINE
DRAFT
REVISION
FINAL_REVIEW
```

## Step 4
Guided UI:

```text
AI message
+
experience cards
+
structured question fields
+
free input
```

## Step 5
Application Case persistence

## Step 6
usage/cost instrumentation

---

# 39. Source of Truth

우선순위:

1. 보안/개인정보
2. 최신 명시적 사용자 결정
3. `MOOA_RESUME_PRODUCT_MODE_PRICING_ADDENDUM.md`
4. `MOOA_RESUME_ADDITIONAL_SPEC.md`
5. `PROJECT_SPEC.md`
6. `AGENTS.md`
7. 과거 브레인스토밍

이 문서가 작성단계/가격제/CREATE-QUICK eligibility에 대한 최신 기준이다.
