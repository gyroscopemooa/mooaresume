# MOOA Resume — CLI Review, Landing Entry, Guest Flow & Paywall Addendum

> 작성 기준일: 2026-08-15  
> 목적: 현재까지 확정된 가격/PRO 플로우와 실제 초기화면을 연결하고, Codex CLI가 구현 전 다시 검토할 수 있도록 하는 최신 추가 명세  
> 기준 문서:
> - `PROJECT_SPEC.md`
> - `MOOA_RESUME_ADDITIONAL_SPEC.md`
> - `MOOA_RESUME_PRODUCT_MODE_PRICING_ADDENDUM.md`
> - `MOOA_RESUME_CURRENT_PRICING_AND_PRO_FLOW.txt`
> - `AGENTS.md`
>
> 동일 항목이 충돌하면 **최신 명시적 사용자 결정 → 이 문서 → 기존 Addendum → PROJECT_SPEC.md** 순으로 우선한다.

---

# 0. Codex CLI에 먼저 줄 검토 명령문

구현 전에 현재 코드와 기획을 다시 비교시키는 용도다.

```text
Read all relevant project specifications and inspect the current implementation before changing anything.

Required documents:
- PROJECT_SPEC.md
- MOOA_RESUME_ADDITIONAL_SPEC.md
- MOOA_RESUME_PRODUCT_MODE_PRICING_ADDENDUM.md
- MOOA_RESUME_CURRENT_PRICING_AND_PRO_FLOW.txt
- AGENTS.md

Also inspect:
- the current public landing page,
- the current "지금 어디까지 작성하셨나요?" writing-stage page,
- QUICK routes,
- PRO routes,
- current authentication flow,
- any local draft/file handling code.

Do not implement anything yet.

First compare the current implementation and the latest product decisions.

Focus especially on:

1. CREATE / BUILD / POLISH are writing states, not pricing tiers.
2. QUICK 4,900 requires an existing draft.
3. CREATE cannot use QUICK and should enter PRO.
4. PRO is one Application Case / one company-job application unit.
5. CREATE / BUILD / POLISH use the same PRO tier but must not start from the same UX.
6. CREATE must use a guided interview/workflow, not an unrestricted ChatGPT clone.
7. Before a CREATE draft is generated, candidate facts should be summarized and explicitly confirmed by the user.
8. The outline should be reviewable before the first full draft.
9. The public landing page should allow an immediate draft input instead of forcing every user through the writing-stage page first.
10. The first landing interaction should remain extremely simple.
11. Do not require login before the user has experienced the initial input / lightweight check.
12. Preserve entered draft data when the user later signs in.
13. The free pre-check should avoid OpenAI API usage where possible.
14. Paid OpenAI analysis should have an explicit boundary after product selection/payment.
15. Do not use a deceptive flow where the user completes a long AI interview before discovering that payment is required.
16. The existing writing-stage page should remain available as an alternate path for users who do not know which mode they need.
17. Add instrumentation so API usage/cost can later be compared across CREATE / BUILD / POLISH.

Then report:

A. What the current implementation already gets right.
B. What conflicts with the latest product decisions.
C. What is missing.
D. Which existing screens/routes should be preserved.
E. The recommended final route/UX flow.
F. The smallest implementation sequence.
G. Security/privacy issues in preserving pre-login resume text or files.

Do not modify files until the review is complete.
```

---

# 1. 검토 후 구현을 시작할 때 줄 CLI 명령문

위 검토 결과가 합리적일 경우:

```text
Implement only the approved landing-entry, guest-draft, writing-mode routing, and paywall-boundary changes.

Do not redesign unrelated screens.

Goals:

1. Keep the current landing visual identity.
2. Add a large resume/cover-letter input area to the main landing page.
3. Allow text input and a file-selection affordance.
4. Place one strong primary action directly below the input.
5. Add a secondary path for users with no draft:
   "아직 작성한 내용이 없나요? 처음부터 작성하기"
6. Do not force login before the initial lightweight check.
7. Do not call OpenAI for the free lightweight check.
8. Preserve the user's entered text across the transition to login/payment where safely possible.
9. Do not persist raw sensitive documents to public storage.
10. QUICK must reject a completely empty CREATE state and route it to PRO.
11. Keep the existing writing-stage selection page as an optional route, not the only route.
12. PRO must route by writing mode:
    - CREATE → guided creation flow
    - BUILD → evidence/content enhancement flow
    - POLISH → upload + cross-check/final-review flow
13. Do not implement marketplace, B2B, FINAL live interview, or subscription features.

Before coding, show the exact files/routes you intend to change.

After implementation:
- run lint,
- run typecheck,
- run relevant tests,
- inspect auth redirect behavior,
- verify draft preservation,
- verify no OpenAI call occurs in the free pre-check,
- summarize all changes.
```

---

# 2. CLI에서 정리한 안과 기존 기획의 관계

큰 방향은 동일하다.

공통 핵심:

```text
Writing State
CREATE / BUILD / POLISH

≠

Paid Tier
QUICK / PRO / FINAL
```

또한:

```text
CREATE
→ QUICK 불가
→ PRO 가능

BUILD
→ QUICK 가능
→ PRO 가능

POLISH
→ QUICK 가능
→ PRO 가능
```

이다.

---

# 3. CLI 정리에서 특히 더 좋아진 부분

## 3.1 CREATE 초안 생성 전 `사실관계 승인`

CREATE에서는 사용자의 답변을 받은 뒤 AI가 바로 자소서를 작성하지 않는다.

권장:

```text
경험 선택
↓
부족한 사실 질문
↓
사용자 답변
↓
AI가 이해한 사실 요약
↓
사용자 사실관계 승인
↓
개요 생성
↓
개요 확인
↓
초안 작성
```

예:

```text
AI가 이해한 내용

업무:
자동차 부품 시험 관련 업무

직접 수행:
- 시험 수행
- 문제 확인
- 관련 담당자와 내용 공유

결과:
구체적인 개선 수치는 현재 자료에서 확인되지 않음

이 내용이 맞나요?

[맞아요]
[수정할 내용이 있어요]
```

이 단계를 넣는 이유:

- 존재하지 않는 성과/수치 생성 방지
- 사용자의 실제 기여도 왜곡 방지
- 나중에 어떤 사실을 근거로 초안이 생성됐는지 추적 가능
- AI와 사용자 사이의 해석 차이를 초안 전에 해결

**최종 설계에 포함한다.**

---

# 4. PRO는 같은 상품이어도 시작 UX가 달라야 한다

가격은 모두 PRO 9,900원이어도 CREATE / BUILD / POLISH를 같은 화면으로 보내지 않는다.

권장:

```text
CREATE + PRO
→ /pro/create

BUILD + PRO
→ /pro/build

POLISH + PRO
→ /pro/polish
```

또는 하나의 `/pro` 라우트 안에서 내부 step을 분기할 수 있다.

중요한 것은 URL 자체보다 **시작 화면과 진행 순서가 분리되는 것**이다.

---

# 5. CREATE + PRO 최종 흐름

```text
채용공고 확인
↓
직무/문항/글자수 분석
↓
이력서·경력·경험자료 확인
↓
활용 가능한 경험 추출
↓
문항별 추천 경험 제안
↓
사용자 경험 선택
↓
부족한 사실 2~4개를 묶어서 질문
↓
사용자 답변
↓
AI가 이해한 사실 요약
↓
사용자 사실 승인
↓
문항 개요 생성
↓
사용자 개요 확인
↓
검증된 사실만으로 초안 생성
↓
사용자 수정 요청
↓
전체 문항 경험 중복검사
↓
공고 기준 최종검수
↓
면접 예상질문
```

CREATE는 자유로운 ChatGPT 채팅이 아니다.

사용 UI:

```text
AI 안내
+
경험 카드
+
선택 버튼
+
구조화 질문 폼
+
필요 시 자유입력
```

형태의 `Guided Conversation / Guided Interview`다.

---

# 6. BUILD + PRO 최종 흐름

```text
현재 초안 입력
↓
채용공고 분석
↓
이력서/경력자료 경험 추출
↓
현재 초안에서 부족한 근거 탐지
↓
더 적합한 경험이 있으면 추천
↓
알 수 없는 정보만 질문
↓
사용자 사실 확인
↓
기존 초안 보완/재구성
↓
Before → After
↓
수정 이유
↓
공고 기준 재검수
↓
최종 수정본
↓
면접 예상질문
```

CREATE처럼 처음부터 모든 경험을 묻지 않는다.

---

# 7. POLISH + PRO 최종 흐름

```text
완성된 지원서
+
채용공고
+
선택적 이력서/경력기술서

↓
문항 충족
글자수
맞춤법/표현/논리
공고 요구역량
문항 간 경험 중복
자료 간 충돌
기업명
직무명
기간
수치
면접 리스크

↓
필요한 경우에만 확인 질문

↓
최소 수정 원칙 최종본
```

POLISH 사용자를 CREATE의 긴 경험 인터뷰로 보내지 않는다.

---

# 8. 결제 전 / 결제 후 API 경계를 더 명확히 한다

기존 기획에 추가로 명확히 할 부분.

## 무료 영역

가능한 것:

```text
사용자 상태 선택
텍스트 입력
파일 선택
목표 글자수
간단한 작성량 확인
CREATE/BUILD/POLISH 임시 추천
상품 추천
```

가능하면 이 단계에서는:

- OpenAI API 호출 X
- Supabase 저장 X
- 원본 파일 서버 업로드 X

를 기본으로 한다.

## 결제 이후

본격 OpenAI 기능:

```text
공고 실제 분석
경험 추출
공고↔경험 매칭
추가질문 생성
사실 요약
개요 생성
초안 생성
정밀첨삭
교차검증
최종검수
면접질문
```

---

# 9. 무료 → 유료 경계의 원칙

사용자가 먼저 자신의 자료를 입력하고 서비스 구조를 이해한 뒤 결제하는 것은 좋다.

그러나 아래처럼 만들지 않는다.

```text
사용자가 10분간 AI 질문에 답함
↓
상당한 작업 진행
↓
갑자기 "계속하려면 9,900원"
```

이는 사용자 입장에서 예상하지 못한 Paywall이 될 수 있다.

권장:

```text
입력
↓
무료 간단 확인
↓
현재 단계/추천 상품 안내
↓
가격 및 유료 범위 확인
↓
결제
↓
본격 AI 작업
```

랜딩에 가격을 과도하게 강조할 필요는 없지만:

```text
기본 확인 무료
정밀 첨삭/작성 유료
```

라는 경계는 숨기지 않는다.

---

# 10. 현재 메인 랜딩 화면 개선 방향

현재 랜딩의 디자인과 톤은 유지한다.

현재 Hero:

```text
좋은 문장보다,
합격을 위한 준비를 봅니다.

채용공고와 내 경험, 지원서 전체를 연결해
지금 가장 먼저 고칠 부분을 근거와 함께 알려드려요.
```

이 설명 이후, 기존 CTA 전에 **바로 입력할 수 있는 큰 입력 영역**을 추가한다.

---

# 11. 권장 Landing 입력 영역

예:

```text
자기소개서가 있다면 바로 붙여넣어 보세요.

┌───────────────────────────────────────┐
│                                       │
│ 작성한 자기소개서를 붙여넣으세요       │
│                                       │
│                                       │
└───────────────────────────────────────┘

[ + 파일 첨부 ]        HWP · HWPX · PDF · DOCX

[              무료로 확인하기              ]

아직 작성한 내용이 없나요?
[처음부터 작성하기 →]
```

핵심:

- 설명을 길게 하지 않는다.
- Hero에서 사용자가 바로 행동할 수 있게 한다.
- 입력창 바로 아래에 큰 Primary CTA를 둔다.
- CREATE 사용자를 위한 별도 링크를 제공한다.

---

# 12. 기존 CTA와 Header 정리

현재:

```text
Header:
무료로 진단하기

Hero:
내 지원서 진단하기
```

처럼 같은 의미의 CTA가 여러 개 보이면 중복감이 생길 수 있다.

권장 예:

```text
Header:
무료로 시작하기

Hero Input Button:
내 지원서 확인하기
```

또는:

```text
무료로 확인하기
```

CTA 명칭은 최종 UI 테스트 후 정할 수 있다.

---

# 13. `진단`이라는 단어

`진단`은 사용할 수 있지만:

- 의료/검사 느낌
- "나는 첨삭 받으러 왔는데 왜 진단?"
- 기능이 점수 평가만 하는 서비스처럼 보일 가능성

이 있다.

후보:

```text
내 지원서 확인하기
무료 분석하기
AI 첨삭 시작하기
지원서 점검하기
```

초기에는 기존 문구를 유지해도 되지만 A/B 후보로 남긴다.

---

# 14. 기존 `지금 어디까지 작성하셨나요?` 화면은 폐기하지 않는다

현재 3카드 페이지:

```text
아직 아무것도 못 썼어요
써보긴 했는데 내용이 부족해요
거의 완성했고 제출 전 확인이 필요해요
```

는 좋은 화면이다.

단, **모든 사용자가 반드시 거쳐야 하는 첫 화면으로 강제하지 않는다.**

---

# 15. 최종 진입 경로 3개

## 경로 A — 작성한 글이 있는 사용자

```text
홈
↓
바로 자소서 입력
↓
무료 확인
↓
BUILD/POLISH 임시추천
↓
QUICK / PRO
```

## 경로 B — 무엇을 선택해야 할지 모르는 사용자

```text
홈
↓
어떤 도움이 필요한지 모르겠어요
↓
기존 3카드 작성단계 화면
```

## 경로 C — 아무것도 작성하지 않은 사용자

```text
홈
↓
아직 작성한 내용이 없나요?
↓
처음부터 작성하기
↓
CREATE + PRO 설명
```

---

# 16. 메인 화면에서 입력을 먼저 받는 이유

초기 서비스는 사용자가 최대한 빠르게:

```text
"아, 여기 그냥 내 자소서 붙여넣으면 되는구나."
```

를 느끼게 해야 한다.

기존 구조:

```text
Landing
↓
내 지원서 진단하기
↓
작성단계 선택
↓
입력
```

보다:

```text
Landing
↓
바로 입력
```

이 더 짧다.

---

# 17. 랜딩 전체 흐름 권장

```text
Hero
↓
바로 입력창 + CTA
↓
신뢰 원칙
- 없는 경험 생성 금지
- 내 말투와 사실 보존
- 합격확률 표시 없음
↓
샘플 결과 Dashboard
↓
Before → After
↓
PRO 차별화
↓
가격
↓
FAQ
↓
Final CTA
```

현재 랜딩 하단의 샘플 Dashboard와도 자연스럽게 연결된다.

---

# 18. 무료 확인에서 보여줄 수 있는 것

API를 쓰지 않는 초기 무료 확인 예:

```text
현재 작성량
642 / 700자

임시 작성단계
최종 첨삭 단계

현재 지원서는 목표 분량에 근접해 있습니다.
```

그리고:

```text
현재 글만 빠르게 첨삭
→ QUICK

공고/이력서까지 함께 분석
→ PRO
```

주의:

```text
분량을 기준으로 한 임시 추천이며
내용의 완성도는 유료 분석에서 확인합니다.
```

---

# 19. 결제 전 단계판별은 과도하게 구현하지 않는다

MVP에서:

```text
직접 입력
→ browser-side 글자수/분량 계산
```

은 매우 간단하다.

그러나 PDF/DOCX/HWP를 모두 결제 전에 브라우저에서 정밀 파싱하려고 하면 초기 구현이 복잡해질 수 있다.

따라서 MVP 우선순위:

```text
직접 입력
→ 무료 임시판별

파일
→ 선택 UI 제공
→ 실제 정밀 파싱은 유료 분석 단계
```

또는 지원 가능한 파일부터 점진적으로 추가한다.

무료 판별 기능 때문에 본제품 출시가 늦어지지 않게 한다.

---

# 20. 로그인은 첫 행동 전에 강제하지 않는다

권장:

> **Guest First**

나쁜 흐름:

```text
Landing
↓
로그인
↓
OAuth
↓
돌아오기
↓
입력
```

권장:

```text
Landing
↓
텍스트 입력 / 파일 선택
↓
무료 확인
↓
상품 선택
↓
저장/유료 작업이 필요한 시점
↓
로그인
↓
결제
↓
실제 분석
```

---

# 21. 왜 로그인 강제를 늦추는가

처음 보는 서비스에서:

```text
로그인
회원가입
인증
```

부터 요구하면 사용자가 제품 가치를 보기 전에 이탈할 수 있다.

대신:

```text
작성 내용을 저장하고 계속 진행하려면 로그인해주세요.
```

처럼 **로그인할 이유가 생긴 뒤 요청**한다.

---

# 22. QUICK과 PRO의 로그인 시점

## QUICK

가능한 흐름:

```text
자소서 입력
↓
무료 확인
↓
QUICK 선택
↓
로그인
↓
결제
↓
분석
```

## PRO

PRO는 Application Case를 저장해야 하므로 본격 AI 작업 전에 로그인한다.

```text
공고/초기자료 준비
↓
PRO 선택
↓
로그인
↓
결제
↓
Application Case 생성
↓
AI 분석
```

---

# 23. 로그인 전 입력값 보존

절대:

```text
로그인
↓
아까 입력한 자소서 사라짐
↓
다시 입력
```

이 되면 안 된다.

보존 대상:

```text
draftText
temporaryWritingMode
targetLength
selectedProduct
jobPostingText (있는 경우)
```

파일은 별도 주의가 필요하다.

---

# 24. 개인정보/파일 보존 주의

자기소개서/이력서에는 개인정보가 포함될 수 있다.

따라서 로그인 전부터 원본 문서를 장기간:

```text
public storage
localStorage
장기 서버 임시저장
```

하는 방식은 피한다.

MVP 권장:

### 텍스트
- 같은 탭의 client state
- 필요 시 `sessionStorage` 정도의 짧은 임시 복원
- 로그인 완료 후 사용자의 Application Case로 이전
- 불필요한 장기 저장 금지

### 파일
- 로그인 전에는 가능하면 `File` 선택 상태만 유지
- 실제 서버 업로드는 로그인/유료 진행 시점
- 업로드하면 private storage
- RLS 적용

주의:
OAuth redirect 등으로 브라우저 navigation이 발생하면 선택한 File 객체가 사라질 수 있다.

이 경우 선택지는:

1. 로그인 전에 파일을 서버에 올리지 않고 로그인 이후 재선택
2. 로그인 UI를 현재 탭 상태를 최대한 보존하는 방식으로 구성
3. 향후 짧은 TTL의 Guest Upload Session 구현

MVP에서는 복잡한 Guest Upload 시스템을 바로 만들지 않아도 된다.

---

# 25. 로그인 전 Draft 보존의 더 나은 장기 구조

사용자가 많아진 뒤에는:

```text
Guest Session
↓
temporary draft id
↓
short TTL
↓
로그인
↓
User가 Guest Session claim
↓
Application Case로 승격
```

하는 구조도 가능하다.

단:

- 개인정보 고지
- 짧은 TTL
- 자동삭제
- private access
- 추측 불가능한 token

이 필요하므로 MVP 필수는 아니다.

---

# 26. CREATE는 장기간 이어서 작업 가능해야 한다

CREATE는 한 번에 완료되지 않을 수 있다.

예:

```text
오늘:
경험 입력

내일:
개요 확인

3일 뒤:
초안 수정
```

따라서 Application Case를 저장한다.

예:

```text
현대자동차 생산관리

작성 진행률 63%

✓ 공고 분석
✓ 경험 선택
✓ 사실 확인
● 1번 문항 작성 중
○ 2번 문항
○ 3번 문항
○ 최종검수
```

다시 로그인했을 때 해당 단계에서 이어간다.

---

# 27. CREATE 상태를 채팅 로그에만 의존하지 않는다

저장:

```text
applicationCase
currentStage
candidateFacts
selectedExperiences
followUpAnswers
factApproval
outline
documentVersions
analysisRuns
```

채팅 transcript는 부가 기록일 뿐,
현재 상태의 Source of Truth가 되어서는 안 된다.

---

# 28. API 사용량/원가 계측

출시 초기부터 유형별 원가를 측정한다.

예:

```text
application_case_id
writing_mode
operation_type
model
input_tokens
output_tokens
estimated_cost
latency_ms
success/failure
```

operation type:

```text
JOB_ANALYSIS
EXPERIENCE_EXTRACTION
FOLLOW_UP_GENERATION
FACT_SUMMARY
OUTLINE
DRAFT_GENERATION
REVISION
FINAL_REVIEW
INTERVIEW_QUESTIONS
```

목적:

```text
CREATE 평균 원가
BUILD 평균 원가
POLISH 평균 원가
```

를 실제 데이터로 파악한다.

9,900원 가격이 충분한지 추후 판단할 수 있다.

---

# 29. 사용자에게 API 횟수를 판매하지 않는다

사용자가 구매하는 것:

```text
AI 질문 20회
30분 대화
토큰 N개
```

가 아니다.

사용자가 구매하는 것:

```text
현대자동차 생산관리
2026 하반기
지원서 1건
```

이다.

즉 PRO는 `Application Case 1건` 단위다.

---

# 30. 내부 Usage Limit

사용자 화면에 과도하게 강조하지 않지만 내부적으로:

```text
문항 수
문서 용량
총 텍스트 길이
수정 라운드
활성 기간
반복 요청
범위 밖 질문
```

을 관리한다.

실제 제한 수치는 API 원가/사용 패턴을 보고 결정한다.

---

# 31. 최종 무료→유료 플로우

## 작성한 사람이 메인에서 들어오는 경우

```text
Landing

자소서 입력
↓
무료 확인
↓
작성 상태 임시추천
↓

QUICK
현재 글 중심 첨삭

또는

PRO
공고/이력서까지 정밀분석

↓
로그인
↓
결제
↓
OpenAI 분석
```

---

# 32. CREATE 최종 무료→유료 플로우

```text
Landing
↓
아직 작성한 내용이 없나요?
[처음부터 작성하기]
↓
CREATE 설명
↓
채용공고/준비자료 선택
↓
PRO 9,900원 범위 확인
↓
로그인
↓
결제
↓
OpenAI API 시작
↓
공고 분석
↓
경험 발굴
↓
추가질문
↓
사실 승인
↓
개요 승인
↓
초안
↓
수정
↓
최종검수
↓
면접질문
```

---

# 33. 현재 화면에 대한 최종 권장

현재 메인 화면의:

```text
좋은 문장보다,
합격을 위한 준비를 봅니다.
```

와 하단 Sample Dashboard는 유지한다.

수정 핵심은 하나:

> **Hero 설명과 기존 CTA 영역 사이에 바로 입력할 수 있는 큰 자기소개서 입력창 + 파일 첨부 + 큰 버튼을 추가한다.**

그리고:

```text
아직 작성한 내용이 없나요?
처음부터 작성하기
```

를 보조 CTA로 둔다.

---

# 34. 기존 작성단계 선택 페이지의 역할

현재 페이지:

```text
지금 어디까지 작성하셨나요?
```

는 삭제하지 않는다.

역할을 변경한다.

기존:

```text
모든 사용자의 필수 첫 단계
```

변경:

```text
보조 진입경로
+
어떤 서비스를 써야 할지 모르는 사용자
+
직접 작성상태를 선택하고 싶은 사용자
```

---

# 35. 구현 우선순위

## Phase 1
Landing Hero input

- 큰 textarea
- 파일 선택 UI
- 무료 확인 CTA
- CREATE 보조 CTA

## Phase 2
Browser-side lightweight check

- draft 존재 여부
- 글자수
- 목표 글자수 대비 비율
- 임시 writing mode
- QUICK/PRO 추천

## Phase 3
Guest → Login transition

- draft text 보존
- 선택 정보 보존
- login 후 복원

## Phase 4
WritingMode route split

- `/pro/create`
- `/pro/build`
- `/pro/polish`

## Phase 5
Paywall/API boundary

- 결제 전 OpenAI 미호출
- 결제 후 AnalysisRun 생성 및 OpenAI 시작

## Phase 6
CREATE guided workflow

- Experience selection
- Follow-up
- Fact approval
- Outline approval
- Draft
- Revision
- Final review

## Phase 7
Usage/cost instrumentation

---

# 36. 하지 말아야 할 것

- Landing 클릭 즉시 로그인 강제
- 로그인 후 이전 입력값 삭제
- CREATE 사용자를 QUICK에 넣기
- 모든 PRO 사용자를 `/pro/create`로 보내기
- CREATE를 무제한 ChatGPT 채팅으로 만들기
- 결제 전에 긴 AI 인터뷰 진행
- 무료 진단에서 OpenAI를 불필요하게 호출
- 로그인 전 이력서를 public storage에 업로드
- 단순 분량 추천을 실제 내용 정밀진단처럼 표현
- Paywall을 고의적으로 숨겨 사용자가 긴 작업 후 알게 만들기
- 랜딩에 기능/설명을 너무 많이 추가해 현재의 단순함을 깨기

---

# 37. 최종 제품 원칙 요약

```text
첫 화면은 최대한 심플하게.
↓
사용자는 로그인 전에 먼저 자신의 글을 넣어볼 수 있다.
↓
무료 영역에서는 작은 확인/추천만 제공한다.
↓
무엇을 구매하는지 이해한 뒤 로그인/결제한다.
↓
실제 OpenAI 분석은 결제 후 시작한다.
↓
CREATE는 Guided Interview.
↓
BUILD는 부족한 근거 보완.
↓
POLISH는 최소 수정 + 교차검수.
↓
모든 PRO는 같은 가격이어도 시작 Flow가 다르다.
↓
사용자의 입력과 진행상태는 저장되어 이어서 작업할 수 있다.
```

---

# 38. Source of Truth

Landing/Guest/Login/Paywall/API Boundary 관련 최신 우선순위:

1. 보안/개인정보
2. 최신 명시적 사용자 결정
3. `MOOA_RESUME_CLI_REVIEW_LANDING_GUEST_FLOW_ADDENDUM.md`
4. `MOOA_RESUME_CURRENT_PRICING_AND_PRO_FLOW.txt`
5. `MOOA_RESUME_PRODUCT_MODE_PRICING_ADDENDUM.md`
6. `MOOA_RESUME_ADDITIONAL_SPEC.md`
7. `PROJECT_SPEC.md`
8. `AGENTS.md`

이 문서는 **현재 랜딩 진입방식, 로그인 시점, 무료/유료 경계, CREATE 최종 흐름에 대한 최신 추가 기준**이다.
