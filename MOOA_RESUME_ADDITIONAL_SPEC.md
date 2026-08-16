# MOOA Resume — Additional Product Spec
## Writing Modes, Landing Conversion & Example Experience

> 작성 기준일: 2026-08-15  
> 용도: 기존 `PROJECT_SPEC.md` 이후 추가된 제품 결정사항 정리  
> 우선순위: 동일 항목이 충돌하면 이 문서의 최신 결정이 우선  
> 범위: 작성단계 3모드, 자동판별, 랜딩/첨삭예시/Before→After/샘플 대시보드

---

# 1. 핵심 추가 결정

무아레쥬메 사용자는 모두 “완성된 자소서를 첨삭받으러 오는 사람”이 아니다.

실제 사용자는 크게 세 상태로 나뉜다.

1. 아무것도 작성하지 못한 사용자
2. 대충 작성했지만 내용/경험/근거가 부족한 사용자
3. 거의 완성했고 제출 전 검토가 필요한 사용자

따라서 사용자에게 보이는 모드는 최대 3개로 유지한다.

```text
처음부터 작성
내용 보완
최종 첨삭
```

내부 분석은 더 세밀하게 해도 되지만 사용자 UX는 단순하게 유지한다.

---

# 2. Writing Mode

개발 내부 명칭 권장:

```ts
type WritingMode =
  | "CREATE"
  | "BUILD"
  | "POLISH";
```

## CREATE — 처음부터 작성

대상:
- 자소서를 전혀 작성하지 않음
- 무엇을 써야 할지 모름
- 소재 선정 자체가 어려움
- 채용공고만 가지고 시작함

AI 진행:

```text
공고 분석
↓
문항 의도 분석
↓
기존 이력서/경력/경험 확인
↓
적합한 경험 후보 추천
↓
부족한 정보만 질문
↓
소재 선정
↓
개요
↓
초안
↓
검수
```

핵심 원칙:
- AI가 처음부터 없는 사실을 만들어 자소서를 완성하지 않는다.
- 기존 자료에서 확인 가능한 내용은 다시 묻지 않는다.
- 먼저 경험을 발굴하고 소재를 선택한 뒤 작성한다.

예:

```text
추천 소재 1
자동차 생산라인 경험
- 현장 이해
- 생산공정
- 협업

추천 소재 2
시험팀 품질 경험
- 품질
- 시험
- 문제해결
- 데이터
```

---

# 3. BUILD — 내용 보완

대상:
- 초안은 있음
- 글자수가 크게 부족함
- 표현보다 내용 자체가 비어 있음
- 본인의 실제 행동/성과가 약함
- 지원동기/직무 연결이 약함

예시 입력:

```text
저는 자동차에 관심이 많아 지원했습니다.
이전 회사에서 품질업무를 하며 책임감을 키웠습니다.
입사 후 회사에 도움이 되는 직원이 되겠습니다.
```

AI 판정:

```text
현재 단계: 내용 보완

지금은 맞춤법보다 경험과 근거를 추가하는 것이 우선입니다.

부족한 내용:
- 해당 기업을 선택한 구체적 이유
- 실제 품질업무 내용
- 본인의 직접 행동
- 결과/성과
- 지원 직무와 경험의 연결
```

AI는 필요한 정보만 질문한다.

```text
1. 가장 기억에 남는 품질 문제는 무엇이었나요?
2. 당시 본인이 직접 수행한 일은 무엇인가요?
3. 다른 부서/팀원과 협업한 내용이 있었나요?
4. 결과를 수치 또는 구체적인 변화로 표현할 수 있나요?
```

답변을 받은 뒤 기존 초안을 보강한다.

---

# 4. POLISH — 최종 첨삭

대상:
- 자소서가 거의 완성됨
- 제출 직전
- 글자수/맞춤법/표현/논리 검토 필요
- 공고 적합성 최종 확인 필요

검토:
- 문항 충족
- 글자수
- 맞춤법/문법
- 표현/가독성
- 반복
- 논리
- 기업명/직무명 오류
- 공고 적합성
- 문항 간 경험 중복
- 이력서/경력기술서와 충돌
- 면접 리스크

핵심 원칙:
- 사용자의 표현과 경험을 최대한 유지
- 불필요한 과도한 리라이팅 금지
- 기본 수정강도는 낮게

---

# 5. 자동 모드 판별

권장 UX는 `자동판별 + 수동 변경`.

기본 안내:

```text
작성한 내용이 있다면 그대로 넣어주세요.
아직 작성하지 않았다면 채용공고만 넣어도 됩니다.
```

예:

```text
자소서 없음
→ CREATE

700자 요구 / 현재 180자 + 핵심정보 부족
→ BUILD

700자 요구 / 현재 675자 + 구조/내용 충분
→ POLISH
```

결과 상단:

```text
현재 지원서는 "내용 보완 단계"로 판단했습니다.

지금은 맞춤법보다 경험과 근거를 추가하는 것이 우선입니다.
```

사용자는 필요 시:

```text
[다른 방식으로 진행 ▾]
```

에서 직접 변경 가능.

---

# 6. 내부 Issue Tags

사용자에게 8~10개의 유형을 노출하지 않는다.
내부적으로만 세부 문제 태그를 유지한다.

```text
missing_evidence
missing_result
weak_job_connection
generic_motivation
insufficient_personal_role
duplicate_experience
length_under
length_over
cross_document_conflict
company_specificity_low
needs_verification
```

원칙:

```text
사용자 UX = 3개 모드
내부 분석 = 여러 세부 태그
```

---

# 7. 가격과 Writing Mode 분리

CREATE / BUILD / POLISH를 별도 가격제로 만들지 않는다.

## QUICK
- 현재 자소서/텍스트 중심
- CREATE / BUILD / POLISH 모두 가능
- 외부 맥락 활용은 제한적

## PRO
활용:
- 채용공고
- 이력서
- 경력기술서
- 포트폴리오
- 추가정보
- 경험은행

특히 CREATE/BUILD에서 PRO 차별성이 강해진다.

```text
PRO / CREATE

공고 분석
↓
이력서에서 경험 자동 추출
↓
문항별 소재 추천
↓
부족한 정보만 질문
↓
초안 작성
↓
공고 기준 재검수
↓
면접 예상질문
```

---

# 8. Experience Bank 연결

사용자의 경험을 구조화해 저장할 수 있다.

```text
내 경험은행

자동차 생산라인
- 생산공정
- 현장대응
- 협업

시험팀
- 품질
- 시험
- 문제해결
- 데이터

대학 프로젝트
- 협업
- 발표
- 프로젝트
```

다음 지원에서는 기존 경험 중 공고/문항에 적합한 소재를 자동 추천한다.

---

# 9. 랜딩페이지 목적

랜딩은 “AI 첨삭이 가능합니다”를 설명하는 페이지가 아니라,
결제 전에 사용자가 갖는 의문을 해소하는 페이지여야 한다.

핵심 의문:

```text
돈 내면 정확히 뭐가 나오지?
ChatGPT에 첨삭해달라고 하는 것과 뭐가 다르지?
아무것도 안 썼는데도 가능한가?
공고나 이력서도 같이 보나?
```

따라서 실제 제품 결과를 시각적으로 보여주는 것이 중요하다.

---

# 10. 권장 Header

```text
무아레쥬메

서비스 소개
첨삭 예시
요금제
이용방법
FAQ

[로그인]
[AI 첨삭 시작]
```

`첨삭 예시`는 FAQ와 분리한다.

- FAQ = 질문/불안 해소
- 첨삭 예시 = 제품 가치 전달 및 구매전환

---

# 11. Landing 구조

## 11.1 Hero

```text
어디까지 작성했든 괜찮습니다.

처음 작성부터 마지막 제출 전 검수까지.

채용공고와 나의 경험을 함께 분석하는 AI 취업 코치.

[내 지원서 시작하기]
```

보조 메시지:

```text
목표는 서류합격이 아닙니다. 최종합격입니다.
```

---

## 11.2 세 가지 사용자 상태

### 처음부터 작성

```text
아직 아무것도 못 썼어요.

AI가 경험을 찾아 질문하고
소재 선정부터 초안까지 함께 진행합니다.
```

### 내용 보완

```text
일단 써보긴 했는데 뭔가 부족해요.

부족한 경험과 근거를 찾아
내용을 구체적으로 보완합니다.
```

### 최종 첨삭

```text
거의 완성했습니다.

제출 전 문장, 글자수, 공고 적합성,
자료 간 오류까지 최종 검토합니다.
```

---

# 12. Before → After

랜딩의 핵심 세일즈 섹션.

## BEFORE

```text
저는 자동차 산업에 관심이 많아 현대자동차에 지원하게 되었습니다.
이전 직장에서 품질 관련 업무를 하면서 책임감과 협업 능력을 키웠습니다.
입사 후에도 이러한 경험을 활용하여 회사에 도움이 되는 직원이 되겠습니다.
```

## AI가 발견한 문제

```text
1. 기업 맞춤성 부족
   → 해당 기업이 아니어도 사용할 수 있는 지원동기

2. 경험 구체성 부족
   → "품질 관련 업무"의 실제 행동이 없음

3. 본인 역할 부족
   → 책임감/협업 주장에 행동 근거 없음

4. 입사 후 포부 추상적
   → 지원 직무에서 무엇을 할지 불명확
```

## AFTER

실제 개선 예시를 보여준다.

주의:
- 랜딩 샘플은 가상 사례임을 표시 가능
- 없는 경험/수치를 임의로 추가하지 않는다.

---

# 13. Before → After 지표

핵심 지표만 비교한다.

```text
지원서 준비도

BEFORE 61
   ↓
AFTER  82

구체성          54 → 78
직무 적합성     62 → 83
문항 충족도     71 → 90
기업/공고 맞춤  48 → 74
```

원칙:
- 합격확률로 표현하지 않는다.
- 동일 Rubric 기반 평가 원칙을 유지한다.
- 마케팅 샘플이면 샘플임을 명시한다.

---

# 14. 왜 수정했는지 보여주기

단순 Before/After보다 중요.

```text
기존 문장
"품질 업무를 하면서 책임감을 배웠습니다."

문제
추상적인 역량 주장이라 실제 행동을 알기 어렵습니다.

개선 방향
실제 업무 상황과 본인의 행동을 중심으로 표현합니다.

영향
- 경험 구체성 ↑
- 직무 연관성 ↑
```

이 섹션은 “문장 생성기”와 “근거 기반 첨삭”의 차이를 보여준다.

---

# 15. 문장별 인터랙티브 비교

향후 실제 Result 또는 Example에서:

- 수정 문장 Highlight
- 클릭 시 수정 이유
- 원문/수정문 비교
- 영향 영역

예:

```text
왜 수정했나요?

기존:
"저는 책임감이 강합니다."

문제:
근거 없는 추상적 자기평가

개선:
실제 행동 중심으로 수정

영향:
구체성 ↑
설득력 ↑
```

MVP 랜딩에서는 정적 UI로 시작 가능.

---

# 16. 결과 Dashboard 미리보기

랜딩에서 실제 유료 결과 UI와 유사한 Sample Dashboard를 보여준다.

```text
현대자동차 · 생산관리
지원서 분석 완료

        82 / 100
       제출 준비도

직무 적합성       84
문항 충족도       91
경험 구체성       72
설득력            79
기업/공고 맞춤도   68

가장 먼저 수정할 3가지

01 지원동기가 기업에 특화되지 않았습니다.
02 성과를 보여주는 근거가 부족합니다.
03 2번·3번 문항에서 동일 경험이 반복됩니다.
```

일부 Preview:

```text
공고 요구역량

✓ 문제해결
✓ 협업
✓ 품질 경험
△ 데이터 활용
✕ 공정개선 경험 미반영
```

```text
더 적합한 경험

현재:
대학 팀 프로젝트

추천:
자동차 부품 시험 경험
```

```text
면접에서 확인될 가능성이 높은 부분

"공정 문제를 개선했다고 했는데
본인이 직접 수행한 역할은 무엇입니까?"
```

---

# 17. PRO 차별화 섹션

헤드라인:

> **자소서만 보지 않습니다.**

입력:

```text
채용공고
+
자기소개서
+
이력서
+
경력기술서
+
추가 경험
```

AI 분석:

```text
공고 요구사항 추출
지원자 경험 추출
경험↔직무 매칭
누락 역량 탐지
자료 교차검증
더 좋은 소재 추천
```

결과:

```text
지원서 분석
+
최종 첨삭
+
제출 리스크
+
면접 예상질문
```

이 섹션이 QUICK과 PRO 가격 차이를 설명한다.

---

# 18. 면접 연결 섹션

헤드라인:

> **서류가 끝이 아닙니다.**

설명:

```text
제출한 지원서는 면접 질문의 재료가 됩니다.

실제 자기소개서, 이력서, 경력기술서와 채용공고를 기반으로
면접에서 확인될 가능성이 높은 내용을 찾아드립니다.
```

일반적인 질문이 아니라 실제 자료 기반 예상질문 2~3개를 Preview 한다.

---

# 19. Pricing / FAQ / Final CTA

## Pricing

```text
QUICK
4,900원

내가 작성한 글을
정밀하게 분석하고 첨삭
```

```text
PRO
9,900원
가장 인기

공고 + 지원자료 전체를 분석해
지원전략부터 최종검수까지
```

FINAL은 구현 전이라면 Coming Soon 처리 가능.

## FAQ 후보

- 아무것도 작성하지 않았는데 이용할 수 있나요?
- 채용공고 없이도 사용할 수 있나요?
- 이력서/경력기술서도 참고하나요?
- HWP/HWPX도 가능한가요?
- AI가 없는 경험이나 성과를 만들어내나요?
- 글자수 제한도 확인하나요?
- 내 문서는 안전하게 보관되나요?
- 결과가 합격을 보장하나요?
- 수정 후 다시 분석할 수 있나요?

## Final CTA

```text
목표는 서류합격이 아닙니다.
최종합격입니다.

[내 지원서 분석하기]
```

---

# 20. `/examples` 첨삭 예시 전용 페이지

메인 랜딩에는 강한 예시 1개만 보여준다.
별도 `/examples`에서는 사용자 상태별 예시를 제공한다.

### Example 1 — 처음부터 작성
- 공고만 있음
- 경험 탐색
- 질문
- 소재 선정
- 초안

### Example 2 — 내용 보완
- 부족한 초안
- 문제 진단
- AI 추가질문
- 내용 강화
- Before/After

### Example 3 — 최종 첨삭
- 완성형 지원서
- 문장/글자수/논리/공고 검토
- 최소 수정

### Example 4 — PRO
- 공고 + 자소서 + 이력서
- 요구역량
- 더 좋은 경험 추천
- 자료 교차검증
- 면접 예상질문

---

# 21. 샘플 결과 직접 체험

향후 권장:

```text
[샘플 분석 결과 체험하기]
```

가상의 지원자 Result Dashboard를 로그인/결제 없이 탐색.

가능:
- 점수/근거 열기
- 공고 매칭
- Before/After
- 문장별 피드백
- 경험 추천
- 면접질문

마지막 CTA:

```text
내 지원서도 이렇게 분석해보세요.

[내 파일 업로드]
```

초기에는 Typed Fixture Data로 구현 가능.

---

# 22. 모바일/데스크톱 Before → After

## Desktop

좌우:

```text
┌─────────────────┬─────────────────┐
│     첨삭 전      │      첨삭 후     │
│                 │                 │
│ Original        │ Revised         │
└─────────────────┴─────────────────┘
```

## Mobile

세로:

```text
첨삭 전
↓
AI가 발견한 문제
↓
첨삭 후
↓
왜 이렇게 바꿨나요?
```

모바일에서 억지로 2열을 유지하지 않는다.

---

# 23. Result Dashboard 정보구조

기능이 많아도 한 화면에 모두 보여주지 않는다.

## Level 1 — 한눈에 보기

```text
82 / 100
가장 먼저 수정할 3가지
잘한 점
보완할 점
[최종 수정본]
```

## Level 2 — 상세 분석

```text
문항 충족
직무 적합
구체성
설득력
기업/공고 맞춤
공고 요구역량
```

## Level 3 — 고급 분석

```text
경험 중복
자료 간 충돌
누락 경험
더 좋은 소재
Before/After
면접 리스크
```

Progressive Disclosure를 사용한다.

---

# 24. 기능 추가 판단 기준

새로운 점수/그래프를 추가하기 전에 질문:

> 사용자가 이 결과를 보고 실제로 무엇을 바꿀 수 있는가?

행동 가능하면 유지:
- 직무 적합
- 구체성
- 공고 누락
- 경험 중복
- 면접 리스크

행동 의미가 약하거나 근거가 불명확하면 제외:
- 창의성 73
- 감성지수
- 성격 추정
- 근거 약한 AI 탐지율
- 합격확률

---

# 25. 구현 우선순위

## Phase A — Mode Foundation
- WritingMode schema
- CREATE / BUILD / POLISH 판별 contract
- 수동 override
- 내부 issue tags

## Phase B — Result Sample
실제 AI 연결 전에 Typed Fixture Data로:
- Dashboard
- Before/After
- top 3 issues
- evidence/reasons
- revised text
- interview preview

## Phase C — Landing
- Hero
- 3 user modes
- Before/After
- Why changed
- Sample Dashboard
- PRO explanation
- Interview bridge
- Pricing
- FAQ
- CTA

## Phase D — `/examples`
- CREATE
- BUILD
- POLISH
- PRO

## Phase E — AI Integration
- mode classification
- mode별 orchestration
- structured results
- Dashboard 연결

---

# 26. Suggested TypeScript Schema

```ts
export const writingModes = ["CREATE", "BUILD", "POLISH"] as const;

export type WritingMode = (typeof writingModes)[number];

export type WritingModeDecision = {
  mode: WritingMode;
  confidence: "low" | "medium" | "high";
  reasons: string[];
  userMessage: string;
  canOverride: true;
};

export type IssueTag =
  | "missing_evidence"
  | "missing_result"
  | "weak_job_connection"
  | "generic_motivation"
  | "insufficient_personal_role"
  | "duplicate_experience"
  | "length_under"
  | "length_over"
  | "cross_document_conflict"
  | "company_specificity_low"
  | "needs_verification";
```

---

# 27. Codex Prompt

```text
Read PROJECT_SPEC.md, AGENTS.md, and MOOA_RESUME_ADDITIONAL_SPEC.md.

The additional spec contains newer product decisions regarding:
- CREATE / BUILD / POLISH writing modes,
- automatic mode detection,
- landing-page conversion UX,
- Before/After examples,
- the public /examples page,
- result-dashboard previews.

Do not implement future marketplace or B2B features.

First audit the existing implementation against this additional spec.
Then propose the smallest set of changes required.

Priorities:
1. keep the user-facing UX simple,
2. use automatic mode detection with manual override,
3. never invent candidate facts,
4. keep the number of visible scores limited,
5. show evidence and actionable next steps,
6. make the landing page demonstrate the actual paid output,
7. build sample/result UI with typed fixture data before coupling it tightly to AI calls.

Do not modify files until you have summarized the implementation plan.
```

구현 시작:

```text
Implement Phase A and Phase B from MOOA_RESUME_ADDITIONAL_SPEC.md only.

Phase A:
- add typed WritingMode and issue-tag schemas,
- add a testable mode-decision contract,
- do not call the AI yet if the UI can be built with fixtures.

Phase B:
- create typed fixture data,
- build the result-dashboard sample,
- build responsive Before/After comparison,
- show top 3 actionable issues,
- show evidence/reasons,
- include a small personalized interview-question preview.

Do not build marketplace, B2B, payments, WebRTC, or live interview features.

Run lint, typecheck, and relevant tests.
Summarize changed files and any decisions that differ from the spec.
```

랜딩 구현:

```text
Now implement Phase C: the public landing page.

Sections:
1. Hero
2. Three writing states: 처음부터 작성 / 내용 보완 / 최종 첨삭
3. Before → After
4. Why the AI changed it
5. Sample result dashboard
6. PRO: 자소서만 보지 않습니다
7. Interview bridge
8. Pricing
9. FAQ
10. Final CTA

Use typed sample data where practical.
The landing page must feel like a professional Korean employment service, not a generic AI-template landing page.
Keep visual clutter low.
Ensure mobile responsiveness.
```

---

# 28. Source of Truth

우선순위:

1. 보안/개인정보
2. 최신 명시적 사용자 결정
3. `MOOA_RESUME_ADDITIONAL_SPEC.md`
4. `PROJECT_SPEC.md`
5. `AGENTS.md`
6. 과거 브레인스토밍

동일 항목이 충돌하면 이 추가 명세의 최신 결정이 우선한다.
