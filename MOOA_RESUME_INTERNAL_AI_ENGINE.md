# MOOA Resume — INTERNAL AI ENGINE SPEC
## Private Analysis Logic, Prompt Architecture & Competitive Moat

> 작성 기준일: 2026-08-16  
> 문서 성격: **내부 전용 / 외부 공개 금지 권장**  
> 목적: MOOA Resume의 실제 결과 품질을 만드는 분석 로직, 프롬프트 구조, 평가 기준, 내부 엔진 및 공개/비공개 경계를 정의한다.
>
> 이 문서는 요금표/랜딩페이지에서 보여주는 “기능 목록”이 아니다.  
> 사용자가 보는 기능과 내부에서 실제로 작동하는 판단·검증·질문·평가 로직을 분리한다.
>
> 권장:
> - Private Repository에 저장
> - 공개 GitHub / 공개 문서 / 랜딩페이지에 상세 로직 노출 금지
> - Codex는 이 문서를 읽고 구현할 수 있으나 사용자 UI에 내부 명칭을 그대로 노출하지 않는다.

---

# 0. 핵심 원칙

MOOA Resume의 경쟁력은:

```text
"좋은 프롬프트 하나"
```

가 아니라:

```text
문서 입력
↓
사실 추출
↓
공고 요구사항 추출
↓
문항 의도 분석
↓
경험 후보 생성
↓
경험 랭킹
↓
지원서 전체 커버리지 계산
↓
근거 부족/충돌 탐지
↓
필요한 추가질문
↓
사용자 사실 승인
↓
개요
↓
초안/첨삭
↓
독립 재평가
↓
최종 교차검수
↓
면접 리스크
```

라는 **전체 파이프라인**에 있다.

---

# 1. 공개 기능과 내부 제조법을 분리

## 공개해야 하는 것

사용자가 구매 결정을 내리는 데 필요한 가치.

예:

```text
공고와 내 경험을 함께 분석합니다.
더 적합한 경험을 추천합니다.
문항 간 경험 중복을 확인합니다.
지원자료 간 확인이 필요한 내용을 찾습니다.
없는 경험을 만들지 않습니다.
첨삭 전후를 비교합니다.
실제 지원자료 기반 면접질문을 제공합니다.
```

이런 기능은 적극적으로 홍보한다.

---

# 2. 굳이 공개하지 않을 것

다음은 제품 품질을 만드는 내부 방법론이므로 외부 기능표에 상세히 설명하지 않는다.

```text
점수 가중치
threshold
경험 랭킹 공식
공고 요구사항 coverage 계산
질문 우선순위 계산
AI 모델 routing
prompt 구조
독립 evaluator 구조
fact confidence
contradiction severity
interview-risk score
rewrite stop condition
eval dataset
실패 fallback
```

원칙:

> **결과는 공개하고 제조법은 공개하지 않는다.**

---

# 3. 내부 기능과 외부 표현

| 내부 기능명 | 외부 사용자 표현 | 내부 로직 공개 |
|---|---|---|
| Evidence Ledger | 없는 경험을 만들지 않고 제공한 자료에 근거합니다 | X |
| Question Intent Decomposition | 문항이 실제로 묻는 내용을 분석합니다 | 일부 |
| Requirement Coverage Matrix | 공고와 내 경험을 함께 분석합니다 | X |
| Experience Ranking | 더 적합한 경험을 추천합니다 | 일부 |
| Cross-Question Allocation | 문항 간 경험 중복을 확인합니다 | 일부 |
| Contradiction Engine | 자료 간 확인이 필요한 내용을 찾습니다 | 일부 |
| Information-Gain Questioning | 꼭 필요한 것만 추가로 질문합니다 | X |
| Fact Approval Gate | 작성 전 사실관계를 확인합니다 | 일부 |
| Independent Re-Evaluation | 동일 기준으로 첨삭 전후를 비교합니다 | X |
| Rewrite Constraint Engine | 사실/글자수를 지키며 수정합니다 | X |
| Interview Attack Surface | 면접에서 확인될 부분을 찾아드립니다 | 일부 |
| Stop-Editing Detector | 필요 이상으로 글을 바꾸지 않습니다 | X |
| Model Router | 노출하지 않음 | X |
| Rubric Weights | 노출하지 않음 | X |
| Eval Calibration | 노출하지 않음 | X |

---

# 4. My GPT의 역할

기존 My GPT를 API에서 직접 호출하는 구조로 생각하지 않는다.

기존 My GPT에 쌓아둔:

```text
Instructions
평가 규칙
첨삭 기준
출력 형식
금지 규칙
예시
질문 방식
```

은 새 서비스의 **원재료**로 사용한다.

권장 이전 과정:

```text
기존 My GPT Instructions
↓
좋았던 규칙 추출
↓
기능별 분해
↓
서버 코드 / Prompt Module / Rubric Module
↓
Versioning
↓
Evals
```

---

# 5. My GPT 내용을 그대로 한 프롬프트로 복사하지 않는다

잘못:

```text
const SYSTEM_PROMPT = `
기존 My GPT Instructions 전체 15,000자...
`
```

권장:

```text
공통 원칙
+
현재 Workflow 전용 지침
+
현재 단계의 데이터
+
현재 Output Schema
```

만 조합한다.

---

# 6. 추천 내부 디렉터리

예:

```text
src/server/ai/

├─ prompts/
│  ├─ common/
│  │  ├─ safety.ts
│  │  ├─ evidence-policy.ts
│  │  └─ writing-style.ts
│  │
│  ├─ quick/
│  │  ├─ evaluate.ts
│  │  └─ rewrite.ts
│  │
│  ├─ create/
│  │  ├─ discover-experience.ts
│  │  ├─ followup.ts
│  │  ├─ fact-summary.ts
│  │  ├─ outline.ts
│  │  └─ draft.ts
│  │
│  ├─ build/
│  │  ├─ diagnose.ts
│  │  ├─ experience-recommend.ts
│  │  └─ enhance.ts
│  │
│  ├─ polish/
│  │  ├─ cross-check.ts
│  │  └─ minimal-rewrite.ts
│  │
│  └─ interview/
│     ├─ risk.ts
│     └─ questions.ts
│
├─ engines/
│  ├─ evidence-ledger.ts
│  ├─ requirement-matrix.ts
│  ├─ experience-ranker.ts
│  ├─ question-intent.ts
│  ├─ cross-question-allocation.ts
│  ├─ contradiction-engine.ts
│  ├─ question-planner.ts
│  ├─ rewrite-constraints.ts
│  ├─ independent-evaluator.ts
│  ├─ interview-risk.ts
│  └─ stop-editing.ts
│
├─ rubrics/
│  ├─ question-fit.ts
│  ├─ specificity.ts
│  ├─ evidence-quality.ts
│  ├─ logic.ts
│  ├─ readability.ts
│  ├─ persuasiveness.ts
│  ├─ job-fit.ts
│  └─ posting-fit.ts
│
├─ schemas/
│  ├─ facts.ts
│  ├─ requirements.ts
│  ├─ experiences.ts
│  ├─ analysis-result.ts
│  └─ interview.ts
│
└─ evals/
   ├─ fixtures/
   ├─ graders/
   └─ reports/
```

---

# 7. Evidence Ledger

## 목적

AI가 지원자의 사실을 임의로 생성하거나 확장하지 않도록
모든 중요한 주장에 출처와 상태를 부여한다.

예:

```json
{
  "id": "FACT-001",
  "type": "work_experience",
  "claim": "자동차 부품 시험 업무 수행",
  "source": {
    "documentId": "resume-01",
    "section": "경력사항"
  },
  "status": "verified",
  "confidence": 0.98
}
```

---

# 8. Fact 상태

예:

```text
VERIFIED
자료에서 명확하게 확인됨

USER_CONFIRMED
사용자가 직접 확인함

SUPPORTED
여러 자료에서 정황상 강하게 지원됨

NEEDS_VERIFICATION
현재 자료로 확인 불가

CONFLICTED
자료 간 내용이 충돌함

REJECTED
사용자가 사실이 아니라고 확인함
```

---

# 9. Evidence Ledger 사용 규칙

AI는 기본적으로:

```text
VERIFIED
USER_CONFIRMED
```

사실만 확정 표현으로 사용한다.

`SUPPORTED`는 필요 시 완화 표현.

`NEEDS_VERIFICATION`은 사용자에게 확인.

`CONFLICTED`는 자동 작성에 사용하지 않는다.

---

# 10. Evidence Ledger 외부 표현

내부:

```text
Evidence Ledger
Fact Confidence
Verification State
```

외부:

> **없는 경험을 만들지 않습니다.**

정도로 표현한다.

---

# 11. Question Intent Decomposition

자기소개서 문항을 단순 키워드로 보지 않는다.

예:

```text
지원동기와 입사 후 포부를 작성하세요.
```

내부적으로:

```text
Intent A
왜 이 산업인가

Intent B
왜 이 기업인가

Intent C
왜 이 직무인가

Intent D
본인의 기존 경험과 연결되는가

Intent E
입사 후 무엇을 할 것인가
```

처럼 분해한다.

---

# 12. 문항 충족 판단

각 intent마다:

```text
covered
partial
missing
unsupported
```

상태를 가진다.

외부에는:

```text
문항 충족도
지원동기의 기업 연결 부족
입사 후 포부 구체성 부족
```

처럼 보여준다.

---

# 13. Requirement Coverage Matrix

공고에서 요구사항을 추출한다.

예:

```text
R1 문제해결
R2 품질 경험
R3 협업
R4 데이터 활용
R5 생산현장 경험
```

지원자 경험:

```text
E1 생산라인
→ R2, R3, R5

E2 시험팀
→ R1, R2, R4

E3 상담업무
→ R3
```

현재 자기소개서:

```text
Q1 → E1
Q2 → E1
Q3 → E3
```

---

# 14. Coverage Matrix가 찾는 것

예:

```text
R4 데이터 활용
→ 중요한데 자기소개서에서 전혀 사용되지 않음

E1 생산라인
→ 두 문항에서 반복 사용

E2 시험팀
→ 높은 적합도인데 현재 미사용
```

추천:

```text
2번 문항은 생산라인 경험보다 시험팀 경험을 사용하는 편이
지원서 전체의 직무 커버리지를 높일 수 있습니다.
```

---

# 15. 외부에는 Coverage 계산 방식을 공개하지 않는다

외부:

> **문항별 더 적합한 경험을 추천합니다.**

정도.

다음은 외부 공개 불필요:

```text
weight
coverage score
marginal gain
experience diversity penalty
```

---

# 16. Experience Ranking

경험 추천은 단순 semantic similarity만 사용하지 않는다.

후보 기준 예:

```text
직무 직접성
공고 요구역량 coverage
구체적인 행동 존재
결과/성과 존재
최근성
차별성
면접 방어 가능성
다른 문항과 중복 여부
자료 근거 신뢰도
```

---

# 17. 경험 추천 결과

내부:

```text
E2 시험팀
job_relevance: high
evidence_quality: high
uniqueness: high
duplication_penalty: low
```

외부:

```text
추천 경험
자동차 부품 시험 경험

추천 이유
- 실제 산업현장 경험
- 품질/문제해결 요구와 연결
- 현재 다른 문항에서 사용되지 않음
```

---

# 18. Cross-Question Allocation

자기소개서는 문항 하나씩 독립적으로 최적화하지 않는다.

전체 지원서에서:

```text
Q1
Q2
Q3
```

에 경험이 어떻게 배치되는지 본다.

검사:

```text
동일 경험 과도한 반복
동일 역량만 반복
공고 핵심 요구사항 누락
강한 경험 미사용
```

---

# 19. Contradiction Engine

자료 전체:

```text
채용공고
이력서
경력기술서
자기소개서
포트폴리오
사용자 추가정보
```

를 교차비교한다.

---

# 20. Contradiction 예

```text
자기소개서:
"생산성을 30% 향상"

경력기술서:
관련 수치 없음
```

판정:

```text
NEEDS_VERIFICATION
```

또는:

```text
이력서:
근무기간 2024.11 ~ 2025.05

자소서:
2024년 8개월 동안...
```

판정:

```text
DATE_CONFLICT
```

---

# 21. Contradiction severity

내부적으로:

```text
LOW
MEDIUM
HIGH
```

정도를 사용할 수 있다.

외부에는:

```text
확인 필요
중요 확인
```

정도로 표현한다.

---

# 22. Information-Gain Questioning

CREATE/BUILD에서 질문을 무작정 많이 하지 않는다.

현재 부족한 정보 중:

> **답변을 받았을 때 최종 지원서 품질이 가장 크게 개선되는 질문**

을 우선한다.

예:

```text
본인 직접 역할
importance: very high

결과
importance: very high

문제 상황
importance: high

팀원 수
importance: low

사용 장비명
importance: very low
```

---

# 23. 질문 수 제한

한 단계에서:

```text
2~4개
```

정도의 핵심 질문을 묶어 묻는 것을 기본으로 한다.

외부:

> **꼭 필요한 것만 물어봅니다.**

정도로 표현 가능.

---

# 24. Fact Approval Gate

CREATE에서:

```text
추가질문
↓
사용자 답변
↓
AI Fact Summary
↓
사용자 승인
```

이 단계를 거친다.

승인되지 않은 새로운 사실을
초안에서 확정적으로 사용하지 않는다.

---

# 25. Outline Gate

CREATE에서는 바로 완성문을 생성하지 않는다.

```text
Facts
↓
Experience Selection
↓
Outline
↓
User Approval
↓
Draft
```

이유:

- 방향 틀린 초안을 길게 만든 뒤 수정하는 비용 감소
- 사용자 의도 반영
- 경험 배치 확인
- 문항별 전체 전략 조정

---

# 26. Rewrite Constraint Engine

첨삭 AI는 단순히:

> 더 그럴듯하게 써라

가 아니다.

제약조건 예:

```text
확인된 사실만 사용
목표 글자수 준수
기업명/직무명 변경 금지
수치 임의 생성 금지
기간 임의 생성 금지
사용자의 핵심 의미 보존
불필요한 과장 표현 금지
다른 문항과 경험 중복 최소화
```

---

# 27. Rewrite 강도

내부:

```text
MINIMAL
MODERATE
AGGRESSIVE
```

등.

하지만 사용자 writingMode에 따라 기본값을 다르게 설정한다.

```text
BUILD
→ MODERATE

POLISH
→ MINIMAL
```

CREATE는 별도 draft generation.

---

# 28. Independent Re-Evaluation

작성 AI가 자기 결과를 무조건 높게 평가하지 않게 한다.

권장:

```text
Original
↓
Evaluator A
↓
Original Score

Original
↓
Rewrite Model
↓
Revised

Revised
↓
Evaluator B / independent evaluation
↓
Revised Score
```

같은 Rubric으로 비교한다.

---

# 29. Before → After 내부 원칙

```text
같은 rubric_version
같은 schema_version
가능하면 독립적인 evaluation context
```

를 사용한다.

외부에는:

> **동일한 기준으로 첨삭 전후를 비교합니다.**

정도만 설명 가능.

---

# 30. Stop-Editing Detector

AI는 계속 수정할수록 무조건 좋아진다고 가정하지 않는다.

다음 조건을 고려:

```text
추가 수정의 예상 개선폭이 매우 작음

사용자 원래 말투와 지나치게 멀어짐

표현만 반복 변경되고 의미 개선 없음

AI 스타일 과잉 가능성

글자수/사실 제약으로 추가 변경이 오히려 손해
```

---

# 31. Stop-Editing 결과

예:

```text
현재는 추가 리라이팅보다
이 버전을 유지하는 것을 권장합니다.

핵심 문제는 충분히 보완되었습니다.
```

이 기능은 외부 기능표에 굳이 이름까지 노출하지 않는다.

---

# 32. Interview Attack Surface

면접질문을 일반 질문 목록에서 생성하지 않는다.

내부 위험 후보:

```text
강한 주장
근거 부족
수치
개인 기여 불명확
자료 간 충돌
직무 핵심 요구사항
설명 부족한 경력전환
기업지원동기 약함
```

---

# 33. 면접 리스크 예

```text
Claim:
"불량률을 25% 개선했습니다."

Risk:
- 이력서에서 해당 수치 확인 안 됨
- 산출방식 불명
- 개인 기여 불명확

Possible Question:
"25%라는 수치는 어떤 기준으로 계산했습니까?"

Possible Follow-up:
"그중 본인이 직접 수행한 부분은 무엇입니까?"
```

---

# 34. 외부 면접 기능 표현

외부:

> **내 지원서를 보고 실제로 확인할 가능성이 높은 질문을 준비합니다.**

정도.

`Attack Surface` 같은 내부 명칭은 공개하지 않는다.

---

# 35. Score는 요약일 뿐

핵심 철학:

> **숫자는 요약, 근거가 상품**

따라서 내부 점수:

```text
question_fit
specificity
logic
readability
persuasiveness
job_fit
posting_fit
```

가 있더라도 UI에서는:

- 이유
- evidence
- 다음 행동

을 함께 제공한다.

---

# 36. 가짜 정밀도 방지

외부에서 금지:

```text
합격확률 87%
채용 가능성 73.4%
면접 성공확률 91%
```

내부에서도 이런 값의 calibration이 없다면 사용하지 않는다.

대신:

```text
지원서 준비도
완성도
확인 필요 상태
```

를 사용한다.

---

# 37. Internal Weighted Rubrics

필요하면 내부적으로 가중치를 사용할 수 있다.

예:

```text
Question Fit
Evidence Quality
Job Relevance
Specificity
Persuasiveness
Readability
```

단:

- 외부 공개 불필요
- 코드에 하드코딩하지 않는 방향 고려
- `rubric_version` 기록
- 실제 eval을 통해 조정

---

# 38. Prompt Versioning

각 실행에:

```text
prompt_version
rubric_version
schema_version
model
```

을 기록한다.

예:

```text
CREATE_DISCOVERY_V3
RUBRIC_2026_08_01
ANALYSIS_SCHEMA_V5
```

---

# 39. Model Routing

모든 단계를 같은 모델에 맡길 필요는 없다.

예:

```text
Extraction
→ 비용효율 모델

Core Analysis
→ 고품질 모델

Rewrite
→ 고품질 writing 모델

Final Review
→ 독립 evaluator

Interview
→ conversation 최적 모델
```

실제 모델명은 환경설정으로 관리한다.

---

# 40. Model Routing 외부 공개

필요 없음.

외부에는:

```text
AI 기반 분석
```

정도면 충분하다.

경쟁사에:

```text
어떤 단계에서 어떤 모델을 쓰는지
```

설명할 이유가 없다.

---

# 41. Analysis Pipeline

PRO 기준 권장:

```text
1. Normalize Documents
2. Extract Job Requirements
3. Extract Candidate Facts
4. Build Evidence Ledger
5. Parse Question Intents
6. Generate Experience Candidates
7. Rank Experiences
8. Build Requirement Coverage Matrix
9. Detect Cross-Question Duplication
10. Detect Contradictions
11. Detect Missing Evidence
12. Plan Follow-up Questions
13. Confirm Facts
14. Generate/Revise
15. Independent Re-Evaluation
16. Final Cross-Check
17. Generate Interview Risks
18. Generate Interview Questions
19. Result Dashboard JSON
```

---

# 42. QUICK Pipeline

QUICK은 더 단순하다.

```text
1. Normalize Draft
2. Parse Questions
3. Evaluate
4. Detect Key Issues
5. Rewrite
6. Independent Re-Evaluate
7. Before/After
8. Result JSON
```

QUICK에는 PRO 전용:

```text
Requirement Coverage Matrix
Experience Ranking
Deep Cross-Document Validation
```

을 기본으로 넣지 않는다.

---

# 43. CREATE Pipeline

```text
Job Posting
↓
Candidate Materials
↓
Fact Extraction
↓
Experience Candidates
↓
Experience Ranking
↓
Question Intent
↓
Experience Selection
↓
High-Value Follow-Up Questions
↓
Fact Approval
↓
Outline
↓
Outline Approval
↓
Draft
↓
Evaluation
↓
Revision
↓
Final Review
```

---

# 44. BUILD Pipeline

```text
Existing Draft
+
Job Posting
+
Candidate Materials

↓
Diagnose Missing Evidence
↓
Find Better Experience
↓
Follow-Up Only Where Needed
↓
Enhance Draft
↓
Evaluate
↓
Final Review
```

---

# 45. POLISH Pipeline

```text
Nearly Final Draft
+
Job Posting
+
Optional Materials

↓
Cross-Check
↓
Question Fit
↓
Length
↓
Language
↓
Requirement Coverage
↓
Duplication
↓
Contradictions
↓
Minimal Rewrite
↓
Final Risk Review
```

---

# 46. Eval Dataset

내부 경쟁력은 Prompt뿐 아니라 Eval 데이터에서 나온다.

초기:

```text
30~100개
```

대표 지원서 테스트.

범주:

```text
신입
경력
생산
품질
사무
IT
영업
서비스
연구
내용 부족
과장된 성과
자료 충돌
동일 경험 반복
공고와 무관한 자기소개서
```

---

# 47. Eval 항목

검사:

```text
문항 의도 파악 정확성
공고 요구사항 파악
경험 추천 합리성
없는 사실 생성률
수치 생성률
사용자 말투 보존
글자수 준수
직무 연결
자료 충돌 탐지
면접질문 근거성
```

---

# 48. Golden Cases

특히 잘 만든 사례는:

```text
golden fixtures
```

로 저장.

Prompt/Model 변경 시 Regression Test에 사용한다.

---

# 49. 사람이 수정한 결과를 미래 학습 데이터로

향후 Human Review가 붙으면:

```text
AI 결과
↓
전문가 수정
↓
최종본
```

차이를 익명/동의 기반으로 분석해서:

```text
어떤 AI 판단이 자주 틀렸는지
어떤 경험 추천이 전문가와 달랐는지
어떤 면접 리스크가 실제로 중요했는지
```

개선에 활용할 수 있다.

단 개인정보/동의 정책 필요.

---

# 50. Public Marketing Layer

홈페이지에서 강조할 것:

```text
공고와 내 경험을 함께 분석
더 좋은 경험 추천
자료 간 확인
없는 경험 생성 금지
Before → After
실제 지원자료 기반 면접질문
```

---

# 51. Semi-Public Layer

사용자가 결과를 보면서 자연스럽게 알 수 있는 것:

```text
문항 요구사항 분석
경험 중복
누락된 근거
더 적합한 경험
면접 리스크
```

---

# 52. Private Layer

외부에 굳이 공개하지 않는다.

```text
Evidence confidence
Experience rank formula
Coverage matrix weights
Question information gain
Stop-edit threshold
Independent evaluator setup
Prompt templates
Model router
Rubric weights
Contradiction severity formula
Internal eval fixtures
Fallback logic
```

---

# 53. 비밀 기능을 억지로 숨기지 않는 원칙

어떤 기능이 구매전환에 매우 강하면 공개한다.

예:

```text
"더 좋은 경험을 추천"
```

이게 강력한 세일즈 포인트라면 공개해야 한다.

숨겨야 하는 것은:

> 기능 존재 자체

가 아니라:

> **기능이 어떻게 계산되고 어떤 규칙으로 판단되는지**

다.

---

# 54. 경쟁사가 따라할 수 있다는 걱정에 대한 기준

기능명은 따라할 수 있다.

```text
공고 분석
자소서 첨삭
면접질문
```

은 누구나 만들 수 있다.

방어력은:

```text
축적된 eval
지원서 데이터 구조
경험은행
Evidence Ledger
Cross-document history
사용자 수정 history
Human Review correction data
prompt/rubric iteration
```

에서 나온다.

---

# 55. INTERNAL_AI_ENGINE.md 공개 금지 권장

이 파일에는:

- 내부 모듈 이름
- 평가 구조
- 데이터 구조
- 비공개 파이프라인
- 향후 가중치/threshold

가 들어갈 수 있으므로:

```text
Private Repo Only
```

권장.

공개 Docs에는 별도:

```text
PRODUCT_FEATURES.md
```

정도를 사용한다.

---

# 56. Codex CLI 검토 Prompt

```text
Read INTERNAL_AI_ENGINE.md and the latest public product specifications.

This file is private implementation guidance.

Do not expose internal engine names, scoring weights, thresholds, prompt structures, model-routing details, or evaluation fixtures in public UI, marketing copy, client-side code, or public documentation.

Audit the current AI implementation.

Report:

1. Which logic is currently one large prompt and should be decomposed.
2. Which My GPT instructions should become:
   - common policy,
   - workflow prompt,
   - rubric,
   - schema,
   - deterministic application logic.
3. Whether candidate facts have source/evidence tracking.
4. Whether unsupported candidate claims can currently enter a generated draft.
5. Whether job requirements and candidate experiences are modeled separately.
6. Whether cross-question experience allocation exists.
7. Whether contradictions are detected across documents.
8. Whether CREATE asks only high-value missing questions.
9. Whether facts are explicitly approved before CREATE draft generation.
10. Whether original and revised drafts are evaluated independently.
11. Whether interview questions are evidence-based.
12. Whether additional rewriting can be stopped when further edits are not beneficial.
13. Whether prompt_version, rubric_version, schema_version, model, tokens, and estimated cost are recorded.
14. What should remain deterministic code versus LLM reasoning.

Do not implement yet.

Produce the recommended internal AI architecture and migration plan.
```

---

# 57. Codex Implementation Rule

구현 시:

```text
Client
```

에:

- Prompt
- Rubric
- Threshold
- API key
- internal scoring logic

을 보내지 않는다.

모두 서버 영역.

---

# 58. 서버 코드 원칙

```text
UI
↓
Server API / Server Action
↓
Workflow Orchestrator
↓
Internal Engines
↓
OpenAI
↓
Structured Output
↓
Database
↓
Result UI
```

---

# 59. 중요한 비밀은 환경변수에 넣는 것이 아니다

환경변수:

```text
API Keys
Model Configuration
Secrets
```

용.

복잡한 분석 로직은:

```text
private server code
+
version-controlled prompt modules
+
rubric modules
```

로 관리한다.

---

# 60. 최종 내부 경쟁력 우선순위

초기에는 다음 7개를 우선 구현한다.

```text
1. Evidence Ledger
2. Question Intent Decomposition
3. Experience Ranking
4. Requirement Coverage Matrix
5. Information-Gain Follow-Up
6. Independent Re-Evaluation
7. Interview Risk Engine
```

후속:

```text
8. Cross-Question Allocation
9. Stop-Editing Detector
10. More advanced model routing
11. Eval calibration
```

---

# 61. 최종 철학

외부:

> **좋은 문장을 만드는 것보다, 합격을 위한 준비를 봅니다.**

내부:

```text
Facts
↓
Requirements
↓
Evidence
↓
Coverage
↓
Missing Information
↓
Best Experience
↓
Verified Draft
↓
Independent Evaluation
↓
Interview Defense
```

이 파이프라인이 실제 MOOA Resume의 엔진이 된다.

---

# 62. Source of Truth

내부 AI 분석/평가/질문/첨삭 엔진 관련 우선순위:

1. 보안/개인정보
2. 최신 명시적 사용자 결정
3. `MOOA_RESUME_INTERNAL_AI_ENGINE.md`
4. Pricing/Flow Addendum
5. Result/Document Addendum
6. Product Specs
7. AGENTS.md

이 문서는 **외부 요금표에 노출되는 기능보다 더 깊은 내부 AI 분석 로직에 대한 최신 기준**이다.

---

# 63. 사실 생성 금지와 의미 확장을 구분한다

MOOA Resume는 사실을 보존한다고 해서 사용자가 적은 문장만 기계적으로 교정하지 않는다.

**사실 생성 금지와 해석·연결·구조화 금지는 다르다.**

자기소개서의 가치는 평범한 경험 안에서 직무와 연결되는 의미를 찾아내는 데도 있다. 따라서 AI는 실제 사실을 바꾸지 않는 범위에서 경험의 의미, 배운 점, 역량 연결 후보를 적극적으로 제안할 수 있다.

예를 들어 확인된 사실이 “편의점에서 교대근무를 했다”라면 다음 의미 후보를 제안할 수 있다.

- 정확한 인수인계의 중요성
- 다음 근무자를 고려한 정리와 기록
- 정해진 시간과 절차 준수
- 고객 응대 중 우선순위 판단

단, 사용자가 실제로 그렇게 느꼈거나 행동했는지는 자료만으로 확정할 수 없다. AI 제안 → 사용자 확인 → USER_CONFIRMED → 최종 문장 사용 순서를 따른다.

# 64. 허용되는 확장 수준

## LEVEL 0 — 표현 정리

같은 사실과 의미를 더 명확하고 자연스럽게 표현한다. 문장 순서 조정, 중복 제거, 맞춤법과 호응 수정, 과도한 수식어 축소는 별도 확인 없이 가능하다.

## LEVEL 1 — 근거 기반 해석

사용자가 명시한 행동으로부터 직접 지지되는 역량을 연결한다.

예: “매일 재고 수량을 확인하고 부족 품목을 기록했다”를 “반복적인 점검과 기록을 통해 재고 누락을 관리했다”로 연결할 수 있다.

새 사건이나 성과를 추가하지 않는다면 SUPPORTED 상태로 제안할 수 있다. 중요한 최종 주장에는 사용자 확인을 권장한다.

## LEVEL 2 — 의미·배운 점 후보

실제 경험에서 느낀 점, 가치관, 장점 또는 직무 연결을 추론한다.

예: 편의점 교대근무에서 인수인계의 중요성을 체감했을 가능성.

가능한 문장 후보로 제안할 수 있으나 사용자의 내면 경험이므로 확인 전에는 확정 표현으로 작성하지 않는다.

권장 질문:

> 교대근무 중 전달이 누락되어 문제가 생기거나, 직접 인수인계를 꼼꼼히 했던 경험이 있었나요?

## LEVEL 3 — 사실 추가

원문에 없는 행동, 성과, 수치, 역할, 사건을 추가한다.

예: “매출을 20% 높였다”, “인수인계 매뉴얼을 직접 만들었다”, “고객 불만을 절반으로 줄였다”.

사용자가 확인하기 전에는 생성 및 사용 금지다.

# 65. 의미 확장 판단 상태

- DIRECT: 원문에 직접 명시
- SUPPORTED: 명시된 행동에서 강하게 뒷받침됨
- PROPOSED: 합리적인 의미 후보이나 사용자 확인 필요
- CONFIRMED: 사용자가 자신의 생각·의도·배운 점으로 승인
- REJECTED: 사용자가 자신과 맞지 않는다고 거절

PROPOSED는 결과 화면에서 추천 또는 확인 질문으로 보여줄 수 있지만 최종 자기소개서의 확정적 1인칭 문장으로 자동 사용하지 않는다.

# 66. 답답한 AI가 되지 않기 위한 원칙

금지 규칙만 늘리지 않는다. 각 금지 규칙에는 허용되는 대안을 함께 둔다.

- 수치 생성 금지 → 수치가 없다면 과정 변화, 오류 감소, 피드백 등 확인 가능한 정성 결과를 질문
- 경험 생성 금지 → 기존 경험에서 행동·판단·배운 점 후보를 제시하고 확인
- 직무 연결 단정 금지 → 가능한 연결 2~3개를 이유와 함께 제안하고 사용자가 선택
- 과장 금지 → 실제 기여 범위 안에서 역할의 의미를 선명하게 표현

MOOA는 단순 제한기가 아니라 **안전한 확장기**여야 한다.

# 67. My GPT 지침을 넣는 방식

기존 My GPT 내용을 MD 하나로 통째로 매 요청에 넣지 않는다. MD는 사람이 관리하는 Source of Truth와 이전 원재료로 사용한다.

실행 시에는 공통 사실 정책 + 현재 WritingMode 정책 + 현재 작업 단계 지침 + 구조화된 사용자 자료 + 출력 Schema만 조합한다.

| 저장 위치 | 내용 |
|---|---|
| 내부 MD | 전체 철학, 정책 설명, My GPT 이전 원재료 |
| deterministic code | 상태 전환, 허용 여부, 글자 수, 권한, 출처 검사 |
| prompt module | 해석, 질문, 평가, 작성 방법 |
| rubric module | 평가 항목과 버전 |
| eval fixtures | 좋은 결과와 실패 사례 |

MD 하나만 모델에 넣으면 규칙 충돌, 긴 컨텍스트, 비용 증가, 중요한 지침 희석이 생길 수 있다. 반대로 모든 판단을 코드로 제한하면 유연한 경험 해석이 약해질 수 있다. 따라서 코드가 사실 경계를 지키고 모델이 그 안에서 해석 후보를 넓히는 혼합 구조를 사용한다.
