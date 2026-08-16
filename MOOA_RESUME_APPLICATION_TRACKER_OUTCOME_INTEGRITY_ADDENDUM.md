# MOOA Resume — Application Tracker & Outcome Integrity Addendum
## 지원현황 관리 / 결과 데이터 신뢰도 / Outcome Collection UX

> 작성 기준일: 2026-08-16  
> 문서 성격: 내부 제품·데이터 설계 문서  
> 목적: 합격/불합격 결과를 단순히 “수집”하는 대신, 사용자가 자신의 취업 지원 현황을 관리하는 과정에서 자연스럽게 Outcome 데이터가 쌓이도록 설계한다.
>
> 이 문서는 `MOOA_RESUME_OUTCOME_DATA_FLYWHEEL_ADDENDUM.md`를 보완한다.

---

# 1. 핵심 결론

우리가 원하는 것은:

```text
"합격했나요? 불합격했나요?"
```

라는 데이터 수집 버튼이 아니다.

권장:

> **내 지원현황 관리**

기능을 만든다.

사용자는 자기 취업 지원 기록을 관리하고,
그 과정에서 MOOA Resume에는 자연스럽게 Outcome 데이터가 쌓인다.

---

# 2. 가장 큰 걱정

단순 결과 입력 기능만 두면:

```text
실제 합격
→ 사용자가 불합격 선택

실제 불합격
→ 사용자가 합격 선택
```

같은 잘못된 Self Report가 쌓일 수 있다.

특히:

```text
커피
현금성 보상
큰 쿠폰
```

을 결과 입력에 연결하면
아무 결과나 빠르게 선택할 유인이 생길 수 있다.

---

# 3. 데이터 수집 기능처럼 보이면 안 되는 이유

사용자가:

```text
"서비스가 내 합격/불합격 데이터만 가져가려는구나"
```

라고 느끼면:

- 입력 귀찮음
- 대충 선택
- 무응답
- 개인정보 거부감

이 커질 수 있다.

따라서 Outcome 입력 자체가
사용자에게 직접적인 기능 가치를 가져야 한다.

---

# 4. 권장 제품 개념

## 내 지원현황

예:

```text
2026 취업 지원현황

현대자동차 · 생산관리
● 서류 결과 대기

현대모비스 · 품질관리
✓ 서류 합격
→ 면접 준비하기

기아 · 생산기술
✕ 서류 불합격
```

사용자는:

> **자기 취업 지원 기록을 정리하기 위해 상태를 업데이트한다.**

우리는:

> **실제 Application Outcome을 얻는다.**

---

# 5. Outcome Data Collection의 제품화

잘못:

```text
결과 데이터를 알려주세요.
```

권장:

```text
지원현황을 업데이트하세요.
```

사용자 관점:

```text
내 지원 기록 관리
```

내부 관점:

```text
Outcome Collection
```

---

# 6. 최초 Flow

지원서 결과 대시보드:

```text
지원서 완성
↓
[이 버전으로 제출했어요]
[아직 제출하지 않았어요]
```

`이 버전으로 제출했어요` 선택 시:

```text
Submission Snapshot 생성
↓
Application Tracker 활성화
↓
상태 = RESULT_PENDING
```

---

# 7. 초기 Application Tracker 상태

예:

```text
지원 준비중
↓
지원 완료
↓
결과 대기
↓
서류 합격 / 서류 불합격
↓
면접 진행
↓
최종 합격 / 최종 불합격
```

---

# 8. 권장 Outcome State

```text
NOT_SUBMITTED
SUBMITTED
RESULT_PENDING

DOCUMENT_PASS
DOCUMENT_FAIL

INTERVIEW_1_PENDING
INTERVIEW_1_PASS
INTERVIEW_1_FAIL

FINAL_INTERVIEW_PENDING
FINAL_PASS
FINAL_FAIL

WITHDRAWN
UNKNOWN
```

실제 구현에서는 상태를 더 단순화할 수 있다.

---

# 9. 사용자가 다시 방문했을 때

예:

```text
현대자동차 · 생산관리

2026.08.16 지원 완료

현재 상태
● 서류 결과 대기

결과가 나왔나요?

[서류 합격]
[서류 불합격]
[아직 대기 중]
```

---

# 10. 왜 이 방식이 결과 신뢰도를 높이는가

사용자가 단순히:

```text
합격 / 불합격
```

데이터를 제출하는 것이 아니라:

```text
자기 취업 기록
```

을 관리한다.

따라서 일부러 반대 결과를 입력할 이유가 줄어든다.

---

# 11. 거짓/오입력은 완전히 막을 수 없다

모든 Self Report 데이터에는:

```text
실수
기억 오류
고의적 잘못 입력
```

가능성이 있다.

따라서 기본 결과는:

```text
SELF_REPORTED
```

로 취급한다.

절대:

```text
사용자가 입력했으므로 100% 실제 결과
```

라고 가정하지 않는다.

---

# 12. Verification Level

예:

```text
SELF_REPORTED
사용자가 직접 입력

VERIFIED
선택적 인증 완료
```

---

# 13. 추가 Metadata 권장

결과가 어떤 상황에서 입력됐는지도 저장한다.

예:

```text
ORGANIC_SELF_REPORT
사용자가 별도 보상 없이 자발적으로 업데이트

REWARDED_SELF_REPORT
포인트/쿠폰 등을 받고 업데이트

VERIFIED
별도 인증 완료
```

이 구분은 장기적인 데이터 신뢰도 분석에 도움이 된다.

---

# 14. 초기에는 보상 없이 시작

MVP 권장:

```text
Application Tracker 제공
↓
사용자가 상태 업데이트
↓
응답률 측정
```

초기에는:

```text
커피
현금
큰 쿠폰
```

등의 보상을 제공하지 않는다.

---

# 15. 먼저 확인할 지표

초기 몇백~몇천 Application Case에서:

```text
실제 제출 표시율
결과 업데이트율
서류 결과 입력률
면접 결과 입력률
평균 업데이트 소요일
미응답 비율
```

을 본다.

---

# 16. 보상이 꼭 필요할 때만 추가

응답률이 너무 낮다면
나중에 소규모 인센티브를 테스트할 수 있다.

권장:

```text
서비스 내부 포인트
소액 할인
다음 분석 크레딧
```

등.

---

# 17. 보상은 결과 방향과 무관해야 한다

잘못:

```text
합격 입력
→ 보상
```

권장:

```text
결과 업데이트
→ 동일 보상
```

예:

```text
서류 합격
→ 500P

서류 불합격
→ 500P
```

핵심:

> **합격했다고 말할 이유를 만들지 않는다.**

---

# 18. 현금성 보상은 신중

예:

```text
결과 입력하면 스타벅스 5,000원
```

은:

```text
10초 안에 아무거나 선택
```

할 인센티브를 만들 수 있다.

따라서 초기에는 추천하지 않는다.

---

# 19. Application Tracker 자체가 보상이어야 한다

좋은 방향:

```text
지원현황 기록
지원 단계 관리
면접 일정 연결
결과 기록
과거 지원내역 확인
```

이런 기능 자체가 사용자에게 가치가 있어야 한다.

---

# 20. FINAL 업셀과 자연스럽게 연결

서류 합격:

```text
✓ 서류 합격

이 지원서와 채용공고를 기반으로
면접 예상질문을 준비했습니다.

[AI 면접 준비하기]
```

→ FINAL 업그레이드 가능.

즉 Application Tracker는:

```text
Outcome Data
+
Retention
+
FINAL Conversion
```

세 역할을 동시에 할 수 있다.

---

# 21. 서류 불합격도 제품 가치로 연결

예:

```text
서류 불합격

이번 지원서를 기준으로
다음 지원에서 우선적으로 보완할 부분을 확인해보세요.

[지원서 분석 다시 보기]
```

향후:

```text
다음 Application Case
```

로 연결 가능.

---

# 22. 지원하지 않은 경우 반드시 구분

사용자가 AI 분석만 받고
실제로 지원하지 않았을 수 있다.

따라서:

```text
[이 버전으로 제출했어요]
[다른 버전으로 제출했어요]
[아직 제출하지 않았어요]
[지원하지 않기로 했어요]
```

같은 상태도 고려.

---

# 23. AI Revised와 Submitted Version 구분

```text
AI Revised
≠
User Final
≠
Submitted Snapshot
```

절대 동일하다고 가정하지 않는다.

---

# 24. Outcome Integrity 기본 연결

권장:

```text
Candidate Snapshot
+
Job Snapshot
+
Submitted Snapshot
+
Outcome
```

Outcome은 가능한 한:

```text
실제 제출된 버전
```

에 연결한다.

---

# 25. 지원현황 UI 예

```text
내 지원현황

────────────────────

현대자동차
생산관리

지원 완료
2026.08.16

● 서류 결과 대기

[결과 업데이트]

────────────────────

현대모비스
품질관리

✓ 서류 합격

다음 단계
면접 준비

[면접 준비하기]
```

---

# 26. 결과 변경 History

사용자가:

```text
RESULT_PENDING
→ DOCUMENT_PASS
→ INTERVIEW_PENDING
→ FINAL_PASS
```

로 바꾼 기록을 남긴다.

권장:

```text
outcome_events
```

또는 상태 history.

---

# 27. 왜 History가 필요한가

최종 상태만 저장하면:

```text
서류 합격했는지
1차 면접까지 갔는지
```

중간 정보가 사라질 수 있다.

따라서 Event History를 남기는 것이 좋다.

---

# 28. 이상 데이터 탐지 가능성

장기적으로 내부에서:

```text
짧은 시간에 수십 건 결과 입력
상태 순서가 비정상적
합격/불합격 반복 변경
제출하지 않았는데 최종합격
```

같은 패턴을 확인할 수 있다.

초기에는 복잡한 Fraud Engine까지 만들 필요는 없다.

---

# 29. 데이터 Confidence

향후 내부적으로:

```text
outcome_confidence
```

를 계산할 수도 있다.

입력 요소 후보:

```text
organic / rewarded
self-reported / verified
state history consistency
submission confirmed
time elapsed
```

하지만 이 점수는 외부에 보여줄 필요 없다.

---

# 30. Organic Data 우선 활용

초기 분석에서는 가능하면:

```text
ORGANIC_SELF_REPORT
+
VERIFIED
```

데이터를 우선적으로 본다.

보상성 데이터는 별도 Segment로 분석 가능.

---

# 31. Result Dashboard와 Tracker 연결

Result Dashboard:

```text
최종 수정본
↓
[이 버전으로 제출]
```

선택하면:

```text
지원현황에 추가되었습니다.
```

그리고 별도 Dashboard:

```text
내 지원현황
```

에서 관리.

---

# 32. Header / Account 메뉴 후보

향후 로그인 후:

```text
내 지원서
내 지원현황
내 프로필
결제/이용내역
```

형태 가능.

MVP에서는 별도 Dashboard 탭 하나로 시작 가능.

---

# 33. Outcome 알림은 후순위

향후:

```text
지원 후 일정 기간 경과
↓
결과가 나왔나요?
```

알림을 보낼 수 있다.

하지만 MVP에서는:

```text
사용자 재방문 시 상태 카드 노출
```

만으로 충분하다.

---

# 34. 개인정보 UX

Outcome 자체는 민감하게 느껴질 수 있으므로
사용자에게 목적을 명확히 한다.

예:

```text
지원 결과는 내 지원현황 관리와
서비스 개선에 활용할 수 있습니다.
```

구체적인 개선 활용은
개인정보/동의 정책과 일치해야 한다.

---

# 35. 외부 홍보와 내부 수집 구분

홈페이지에서:

```text
"실제 지원 결과에서 배우는 서비스"
```

라는 방향을 나중에 홍보할 수 있다.

하지만 실제 충분한 데이터와
운영 체계가 생긴 이후에 사용한다.

---

# 36. MVP 추천

지금 구현:

```text
1. Application Case 상태
2. "이 버전으로 제출" 버튼
3. Submission Snapshot
4. 내 지원현황 Dashboard
5. 결과 대기
6. 서류 합격 / 불합격
7. 면접 / 최종 결과
8. SELF_REPORTED 기본 저장
9. outcome history
```

---

# 37. 지금 만들지 않아도 되는 것

후순위:

```text
현금 보상
커피 쿠폰
결과 인증
자동 Fraud Detection
Outcome Confidence 모델
통계 공개
합격률 공개
예측 모델
```

---

# 38. 핵심 Product Principle

> **Outcome 데이터를 받기 위해 기능을 만들지 않는다.**

대신:

> **사용자가 자기 지원 과정을 관리하는 좋은 기능을 만든다.**

그러면 Outcome은 자연스럽게 따라온다.

---

# 39. 핵심 Data Principle

> **Self Report는 사실로 단정하지 않고, 출처가 있는 데이터로 관리한다.**

예:

```text
value: DOCUMENT_PASS
source: USER
verification: SELF_REPORTED
collectionMode: ORGANIC
```

---

# 40. 핵심 Integrity Principle

```text
지원자 현재 상태
```

가 아니라:

```text
지원 당시 Candidate Snapshot
+
실제 Submitted Snapshot
+
그 제출에 대한 Outcome
```

을 연결한다.

---

# 41. Codex Review Prompt

```text
Read:

- MOOA_RESUME_OUTCOME_DATA_FLYWHEEL_ADDENDUM.md
- MOOA_RESUME_APPLICATION_TRACKER_OUTCOME_INTEGRITY_ADDENDUM.md
- latest Application Case / Result Dashboard specs.

Do not implement yet.

Audit the current product and data model.

Latest product decision:

Outcome collection should be designed as a user-facing "Application Tracker / 내 지원현황" feature, not as a raw "tell us if you passed or failed" data-collection form.

Important rules:

1. Users should manage their own application status for their own benefit.
2. Outcome data generated from this feature is SELF_REPORTED by default.
3. Do not assume self-reported outcomes are ground truth.
4. Initial MVP should not use cash-like rewards or coffee coupons.
5. First measure organic update behavior.
6. If incentives are added later, reward reporting participation equally regardless of pass/fail.
7. Record whether outcome data was organic, rewarded, or verified.
8. Distinguish AI Revised, User Final, and actual Submitted Snapshot.
9. Outcome should be linked to the submitted version where possible.
10. Preserve outcome status history, not only the current final status.
11. Support NOT_SUBMITTED / PENDING / UNKNOWN.
12. Design the tracker to naturally lead document-pass users into interview preparation / FINAL.
13. Do not expose internal outcome-confidence or fraud-scoring logic publicly.

Report:

A. Existing reusable components/tables.
B. Missing schema.
C. Recommended state machine.
D. Submission → Tracker creation flow.
E. Result Dashboard integration.
F. Application Tracker UI structure.
G. Outcome history model.
H. Metadata for ORGANIC / REWARDED / VERIFIED.
I. MVP versus later features.

Do not modify files until review is complete.
```

---

# 42. 권장 타입 예

```ts
type OutcomeVerification =
  | "SELF_REPORTED"
  | "VERIFIED";

type OutcomeCollectionMode =
  | "ORGANIC"
  | "REWARDED";

type ApplicationStatus =
  | "NOT_SUBMITTED"
  | "SUBMITTED"
  | "RESULT_PENDING"
  | "DOCUMENT_PASS"
  | "DOCUMENT_FAIL"
  | "INTERVIEW_1_PENDING"
  | "INTERVIEW_1_PASS"
  | "INTERVIEW_1_FAIL"
  | "FINAL_INTERVIEW_PENDING"
  | "FINAL_PASS"
  | "FINAL_FAIL"
  | "WITHDRAWN"
  | "UNKNOWN";
```

실제 타입은 기존 Schema 검토 후 조정한다.

---

# 43. Source of Truth

Application Tracker / Outcome Integrity 관련 우선순위:

1. 개인정보 / 보안 / 법적 요구
2. 최신 명시적 사용자 결정
3. `MOOA_RESUME_APPLICATION_TRACKER_OUTCOME_INTEGRITY_ADDENDUM.md`
4. `MOOA_RESUME_OUTCOME_DATA_FLYWHEEL_ADDENDUM.md`
5. `MOOA_RESUME_INTERNAL_AI_ENGINE.md`
6. Result / Workflow Specs
7. PROJECT_SPEC.md
8. AGENTS.md

이 문서는 **지원결과 수집을 '내 지원현황 관리'라는 사용자 기능으로 전환하고, Self Report 데이터의 품질과 신뢰도를 관리하는 최신 기준**이다.
