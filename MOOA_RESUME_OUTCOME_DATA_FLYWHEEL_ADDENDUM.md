# MOOA Resume — Outcome Data & Learning Flywheel Addendum
## Candidate Snapshot / Submission Snapshot / Outcome Feedback / Long-Term Data Moat

> 작성 기준일: 2026-08-16  
> 문서 성격: **내부 제품·데이터 설계 문서 / Private Repo 권장**  
> 목적: MOOA Resume에서 발생하는 지원자 정보, 지원서, 실제 제출본, 채용 결과를 구조화하여 장기적인 제품 개선과 데이터 자산으로 연결하는 방식을 정의한다.
>
> 이 문서는 기존:
> - `MOOA_RESUME_INTERNAL_AI_ENGINE.md`
> - `MOOA_RESUME_NARRATIVE_POLICY_ADDENDUM.md`
> - Result / Pricing / Workflow 관련 문서
>
> 를 보완한다.

---

# 1. 핵심 결론

단순히 자기소개서 텍스트를 많이 저장하는 것보다 다음 연결이 훨씬 중요하다.

```text
어떤 지원자가
↓
어떤 회사 / 직무에
↓
어떤 스펙과 경험으로
↓
어떤 지원서를 제출했고
↓
실제 결과가 어떻게 되었는가
```

장기적으로 MOOA Resume의 중요한 데이터 자산은:

```text
Candidate Snapshot
+
Application Snapshot
+
Submission Snapshot
+
Outcome
```

의 연결이다.

---

# 2. 원본 파일 자체가 데이터 자산의 중심은 아니다

사용자가 업로드한:

```text
resume.pdf
career.docx
coverletter.hwp
portfolio.pdf
```

를 무한히 쌓는 것을 핵심 전략으로 보지 않는다.

권장 구조:

```text
Original File
↓
Parsing
↓
Structured Candidate Data
↓
Application Snapshot
↓
Submission Snapshot
↓
Outcome
```

즉 장기 통계와 분석에서는:

```text
원본 PDF 10만 개
```

보다:

```text
구조화된 지원자 정보
+
실제 제출 지원서
+
채용 결과
```

가 훨씬 중요하다.

---

# 3. PRO 분석 시 Candidate Profile 자동 추출

PRO 분석 과정에서 이력서, 경력기술서, 자기소개서, 추가자료에서
지원자 정보를 구조화한다.

예:

```text
지원자 프로필

학력
울산대학교 / 기계공학

학점
3.72 / 4.5

경력
자동차 부품 품질 1년 8개월

자격
품질경영기사
컴퓨터활용능력 1급

어학
OPIc IH

주요 경험
- 자동차 부품 시험
- 공정 개선 프로젝트
- 생산라인 실무
```

---

# 4. Candidate Profile은 사용자에게도 보여준다

Result Dashboard 또는 Application Case 안에:

## 분석에 사용된 내 정보

```text
학력       울산대학교 기계공학
학점       3.72 / 4.5
경력       1년 8개월
어학       OPIc IH
자격       품질경영기사 외 1개
주요경험   4개

[자세히 보기]
```

안내:

> **지원자료에서 자동으로 확인한 정보입니다. 틀린 내용이 있다면 수정해주세요.**

사용자 액션:

```text
[수정]
[사실 아님]
[추가]
```

---

# 5. Candidate Profile을 UI에 보여주는 이유

사용자에게:

```text
"AI가 내 자료를 제대로 읽었구나."
```

라는 신뢰를 준다.

동시에 내부에는:

```text
CandidateFacts
```

가 더 정확해진다.

즉:

```text
사용자 가치
+
데이터 정확도 개선
```

을 동시에 얻는다.

---

# 6. 현재 프로필과 지원 당시 Snapshot을 구분

지원자의 현재 프로필만 저장하면 안 된다.

예:

```text
2026
TOEIC 850
경력 1년

2027
TOEIC 930
경력 2년
```

2027년 현재 프로필만 보면
2026년 지원 당시 조건을 잘못 해석하게 된다.

따라서 각 Application Case마다
지원 당시 상태를 Snapshot으로 고정한다.

---

# 7. Application Case Snapshot 예

```text
Application Case #92814

회사
현대자동차

직무
생산관리

지원일
2026-09-18
```

연결:

```text
Candidate Snapshot
Job Snapshot
Application Snapshot
Submission Snapshot
Outcome
```

---

# 8. Candidate Snapshot

지원 당시 지원자의 상태.

예:

```text
학력
전공
학점
경력
경력 개월 수
산업경험
직무경험
자격증
어학
프로젝트
주요 경험
기술
기타 지원 관련 정보
```

현재 프로필이 바뀌어도
기존 Candidate Snapshot은 변경하지 않는다.

---

# 9. Job Snapshot

지원 당시 공고 상태.

예:

```text
회사
직무
공고명
지원시기
채용구분
주요업무
자격요건
우대사항
요구역량
공고 원문 또는 정규화 데이터
```

공고가 나중에 삭제되거나 수정되어도
지원 당시 분석 기준을 보존한다.

---

# 10. Application Snapshot

해당 지원 건의 지원서 상태.

예:

```text
자기소개서 문항
문항별 원본
AI 분석 결과
사용한 경험
문항별 추천 경험
누락된 근거
공고 요구사항 Coverage
내부 분석 지표
```

---

# 11. Submission Snapshot

가장 중요한 Snapshot 중 하나.

AI가 만든 결과와
실제로 사용자가 제출한 결과는 다를 수 있다.

예:

```text
Original
↓
AI Revised
↓
User Final
↓
Submitted Snapshot
```

따라서 사용자에게:

> **이 버전으로 제출하셨나요?**

CTA:

```text
[제출본으로 저장]
```

을 제공할 수 있다.

---

# 12. 실제 제출본이 중요한 이유

AI가 추천한 버전만 가지고 결과를 분석하면:

```text
AI가 만든 글
=
실제 제출 글
```

이라고 잘못 가정하게 된다.

사용자가:

- 문장을 수정했을 수 있음
- 일부 문항을 원복했을 수 있음
- 새로운 경험을 넣었을 수 있음
- AI 결과를 그대로 제출하지 않았을 수 있음

따라서 결과 학습에는:

```text
Submitted Snapshot
```

이 가장 중요하다.

---

# 13. Outcome 데이터

채용 결과는 단순:

```text
합격
불합격
```

두 단계로만 저장하지 않는다.

권장:

```text
지원 완료
↓
서류
↓
1차 면접
↓
2차 / 최종 면접
↓
최종 결과
```

---

# 14. Outcome Status 예

```text
APPLIED

DOCUMENT_PENDING
DOCUMENT_PASS
DOCUMENT_FAIL

INTERVIEW_1_PENDING
INTERVIEW_1_PASS
INTERVIEW_1_FAIL

INTERVIEW_FINAL_PENDING
INTERVIEW_FINAL_PASS
INTERVIEW_FINAL_FAIL

FINAL_OFFER
FINAL_REJECTED

WITHDRAWN
NOT_SUBMITTED
UNKNOWN
```

실제 제품 단계에 맞게 단순화 가능.

---

# 15. 왜 단계별 Outcome이 필요한가

단순 합격/불합격만 있으면:

```text
서류에서 떨어졌는지
면접에서 떨어졌는지
```

를 구분할 수 없다.

단계별 결과가 있으면 장기적으로:

> 특정 유형의 지원자는 서류 합격은 잘 하지만 면접 탈락률이 높다.

같은 분석이 가능하다.

---

# 16. 결과 피드백은 귀찮은 작업이 되면 안 된다

단순히:

> 합격했나요?

라고 묻는 것만으로는
응답률이 낮을 수 있다.

사용자가 자기 목적 때문에 결과를 입력하게 만드는 UX가 더 좋다.

---

# 17. 결과 입력에 대한 보상 원칙

잘못된 방식:

```text
합격했다고 알려주면 쿠폰 지급
```

이 경우:

```text
합격이라고 거짓 입력
```

할 인센티브가 생긴다.

권장:

> **결과를 알려주는 행동 자체에 동일한 보상**

을 제공한다.

예:

```text
현대자동차 지원 결과가 나왔나요?

○ 서류 합격
○ 서류 불합격
○ 아직 발표 전
○ 지원하지 않음

결과를 알려주시면
다음 분석에 사용할 1,000P를 드려요.
```

합격/불합격 모두 동일한 보상.

---

# 18. Outcome Reward 원칙

```text
결과의 방향
≠
보상 크기
```

보상은:

```text
결과 입력 완료
```

에 지급한다.

추가 원칙:

```text
Application Case당 기본 1회
중복 지급 방지
명백한 반복 수정 악용 방지
```

---

# 19. 결과 인증은 선택사항

모든 사용자에게 증빙을 요구하면
응답률이 크게 떨어질 수 있다.

기본:

```text
SELF_REPORTED
```

선택:

```text
VERIFIED
```

---

# 20. Outcome Verification Level

예:

```text
SELF_REPORTED
사용자가 결과를 직접 입력

VERIFIED
이메일 / 채용사이트 / 문자 등으로 선택적으로 인증
```

---

# 21. Verified Outcome 예

선택적으로:

```text
서류합격 이메일
채용사이트 결과 화면
합격 문자
```

등을 인증 수단으로 사용할 수 있다.

가능하면 개인정보를 가리고 제출하도록 안내.

인증 사용자에게:

```text
추가 포인트
```

를 제공하는 방식도 고려 가능.

---

# 22. Self Report도 가치가 있다

초기에는:

```text
SELF_REPORTED
```

만으로도 충분히 의미 있는 데이터를 만들 수 있다.

Verified 데이터는:

- 더 높은 신뢰도
- calibration
- validation dataset

등에 활용 가능하다.

---

# 23. 사용자에게 결과 입력 이유를 만들어주는 핵심 기능

단순 포인트보다:

## 내 취업 기록

기능이 더 강력할 수 있다.

예:

```text
2026 취업 지원현황

현대자동차 생산관리
서류 합격 → 면접 예정

기아 품질
서류 불합격

현대모비스 생산기술
지원 완료
```

사용자가:

```text
자기 취업 지원현황 관리
```

를 위해 결과를 입력한다.

우리는 자연스럽게 Outcome 데이터를 얻는다.

---

# 24. Application Tracker 방향

향후 Application Case Dashboard에서:

```text
지원 준비
지원 완료
서류 발표 대기
서류 합격
면접 예정
최종 결과
```

를 관리할 수 있다.

이는:

```text
Outcome Data Collection
```

만을 위한 기능이 아니라
실제 사용자 가치가 있는 기능이어야 한다.

---

# 25. Outcome Feedback 시점

가능한 방식:

```text
지원본 저장
↓
일정 기간 후
↓
"결과가 나왔나요?"
```

또는 사용자가 직접:

```text
지원현황
```

에서 업데이트.

향후 자동 알림 기능을 별도로 설계할 수 있지만
MVP에서는 수동 상태 업데이트만으로도 충분하다.

---

# 26. 장기 분석 가능성

데이터가 충분히 쌓이면
회사/직무/지원 유형별로 비교할 수 있다.

예:

```text
현대자동차 생산관리 지원군
```

서류 합격 그룹:

```text
평균 학점
관련 제조경험 존재 비율
품질 관련 경험 비율
직무 직접경험 비율
자격증 수
어학 수준
```

불합격 그룹도 동일하게 비교.

---

# 27. 스펙 데이터만 보는 것은 부족

더 중요한 것은:

```text
지원서 내용의 특징
```

이다.

예:

합격군에서 상대적으로 많이 나타나는 특징:

```text
직무 직접경험 활용
행동 근거 존재
기업 맞춤성
문항 간 경험 다양성
구체적 결과
```

불합격군에서 상대적으로 많이 나타나는 특징:

```text
추상적 지원동기
동일 경험 반복
수치 근거 부족
직무 연결 약함
```

---

# 28. Rubric Calibration에 활용

장기적으로 Outcome 데이터를 이용해:

```text
현재 Rubric이 실제 결과와
어느 정도 일치하는지
```

검증한다.

예:

현재 내부에서는:

```text
Experience Diversity
```

를 중요하게 평가하지만
실제 Outcome과 거의 관계가 없다면
가중치를 조정할 근거가 된다.

---

# 29. Outcome은 인과관계가 아니다

중요:

```text
특정 지원서 특징
↔
합격 Outcome
```

사이에 상관이 있다고 해서
그 특징이 합격을 원인으로 만들었다고 단정하지 않는다.

회사/직무/시기별로:

- 지원자 풀
- 채용 인원
- 경쟁률
- 학교
- 경력
- 내부 평가 기준
- 시즌
- 채용 방식

등이 다르다.

---

# 30. 합격확률 표시 금지 원칙 유지

데이터가 쌓여도 바로:

```text
합격확률 73%
```

처럼 표시하지 않는다.

이유:

```text
selection bias
표본 부족
회사별 차이
시즌 차이
숨은 변수
인과관계 불명확
```

---

# 31. Outcome 기반 사용자 표현

내부 데이터는 다음처럼 사용할 수 있다.

예:

> **과거 유사 지원 사례에서는 직무 경험 연결이 상대적으로 중요한 패턴으로 나타났습니다.**

또는:

> **유사 지원서와 비교했을 때 성과 근거가 부족한 편입니다.**

정도로 표현.

---

# 32. 유사 지원 사례 비교는 충분한 데이터가 있을 때만

초기:

```text
데이터 부족
```

상태에서는 해당 기능을 제공하지 않는다.

내부 기준 예:

```text
minimum sample size
confidence threshold
company/job grouping rule
```

등을 별도로 설계한다.

구체적인 threshold는 외부에 공개하지 않는다.

---

# 33. Candidate Structured Data 예

예:

```json
{
  "education_level": "bachelor",
  "major": "mechanical_engineering",
  "gpa": 3.72,
  "gpa_scale": 4.5,
  "career_months": 20,
  "industry_experience": ["automotive"],
  "certifications": [
    "quality_management_engineer"
  ],
  "language_scores": [
    {
      "type": "OPIC",
      "score": "IH"
    }
  ],
  "experiences": [],
  "skills": []
}
```

실제 Schema는 별도 정의.

---

# 34. Application Feature 데이터 예

지원서 자체에서도
분석 가능한 특징을 구조화한다.

예:

```text
question_fit
job_relevance
specificity
evidence_quality
experience_diversity
company_customization
quantitative_outcome_presence
qualitative_outcome_presence
unsupported_claim_count
cross_question_duplication
```

이 값들은:

```text
analysis_run 당시 버전
```

과 함께 저장해야 한다.

---

# 35. Feature Versioning

Rubric과 분석 방식이 계속 변경되므로:

```text
application_features
```

만 저장하면 안 된다.

함께 저장:

```text
rubric_version
prompt_version
schema_version
model
analysis_run_id
```

그래야 과거 결과와 새 결과를 제대로 비교할 수 있다.

---

# 36. 추천 DB 방향

초기부터 방향을 열어둘 테이블:

```text
candidate_facts
candidate_profile_snapshots

application_cases
application_snapshots

submission_snapshots

application_outcomes
outcome_feedback
outcome_verifications

document_versions

analysis_runs
analysis_results
```

---

# 37. candidate_facts

현재 지원자 사실.

예:

```text
education
gpa
career
certification
language
project
experience
skill
```

Evidence Ledger와 연결 가능.

---

# 38. candidate_profile_snapshots

특정 Application Case 당시
지원자의 구조화된 상태.

```text
snapshot_id
application_case_id
candidate_id
snapshot_data
created_at
```

등.

현재 프로필 변경과 독립.

---

# 39. application_cases

지원 한 건의 Root Entity.

예:

```text
company
job
recruitment_name
status
writing_mode
product_tier
created_at
```

---

# 40. application_snapshots

지원서 및 공고 분석 상태.

예:

```text
job_snapshot
candidate_snapshot_ref
question_set
analysis_features
experience_allocation
```

---

# 41. submission_snapshots

사용자가 실제 제출한 버전을 고정.

예:

```text
application_case_id
document_version_ids
submitted_answers
submitted_at
user_confirmed
```

---

# 42. application_outcomes

지원 단계별 결과.

예:

```text
application_case_id
stage
result
reported_at
verification_level
```

---

# 43. outcome_feedback

결과 입력 자체와 추가 코멘트.

예:

```text
how_reported
user_note
feedback_reward
reported_at
```

---

# 44. outcome_verifications

선택적 인증 기록.

가능:

```text
verification_type
verification_status
verified_at
```

원본 인증 파일을 장기 보관할지 여부는
개인정보 정책과 저장비용을 고려해 별도 결정.

---

# 45. Result Dashboard와 데이터 수집의 결합

Result Dashboard에서:

```text
분석에 사용된 내 정보
```

를 보여주고 사용자가 수정하게 한다.

그러면 데이터 품질이 개선된다.

이후:

```text
제출본으로 저장
```

을 통해 실제 Submission Snapshot을 확보.

그 후:

```text
지원 결과 업데이트
```

를 통해 Outcome 확보.

이 모든 단계가 사용자에게도
실제 가치가 있어야 한다.

---

# 46. Data Flywheel

```text
사용자 지원
↓
AI 분석
↓
지원자 Facts 구조화
↓
지원서 개선
↓
사용자 최종 수정
↓
실제 제출
↓
Submission Snapshot
↓
결과 피드백
↓
Outcome
↓
합격/불합격 패턴 분석
↓
Rubric / Eval 개선
↓
AI 추천 품질 개선
↓
더 많은 사용자
↓
더 많은 Outcome
```

---

# 47. 이 Flywheel이 중요한 이유

경쟁사가:

```text
비슷한 Prompt
비슷한 기능
비슷한 UI
```

를 만들 수 있어도,

시간이 지나면서 MOOA Resume에는:

```text
구조화된 Candidate Snapshot
실제 제출 Snapshot
실제 Outcome
Human/AI 수정 history
Rubric history
```

가 축적된다.

이 데이터 연결은 단순 Prompt보다
더 강한 장기 경쟁력이 될 수 있다.

---

# 48. 원본 파일 보존 정책

원본 파일은:

```text
서비스 제공에 필요한 기간
```

동안 private storage에 유지할 수 있다.

하지만 장기 분석 자산의 중심은:

```text
Normalized Structured Data
Snapshot
Outcome
```

으로 본다.

---

# 49. 원본 파일과 구조화 데이터의 목적 분리

Original File:

```text
재분석
사용자 다운로드
파싱 재시도
원본 확인
```

Structured Data:

```text
대시보드
AI 분석
검색
통계
Outcome 분석
Rubric 개선
```

---

# 50. 개인정보 목적 분리

중요:

```text
서비스 제공을 위한 데이터 저장
```

과:

```text
향후 통계 / 품질 개선 / 모델·Rubric 개선
```

을 개념적으로 분리한다.

사용자가 분석을 요청했다는 이유만으로
모든 원본 정보가 자동으로 영구적인 연구 데이터가 된다고 가정하지 않는다.

---

# 51. 향후 정책에서 명확히 해야 할 것

```text
원본 파일 보관 기간
구조화 데이터 보관 기간
지원 결과 추적 목적
통계/품질 개선 활용 여부
사용자 선택/동의
삭제 요청 처리
익명화/가명화
```

구체적인 법률/약관 문구는 별도 검토.

---

# 52. 통계용 데이터는 식별정보와 분리

장기적으로 통계/분석에는:

```text
이름
전화번호
이메일
주소
```

같은 직접 식별정보가 불필요할 가능성이 높다.

가능한 구조:

```text
User Identity Layer
        ↓ separated
Application Analytics Layer
```

로 분리.

---

# 53. Outcome Analytics용 내부 Dataset 예

```text
candidate_profile_features
job_features
application_features
submission_features
outcome_stage
outcome_result
verification_level
```

를 결합.

---

# 54. Outcome Quality Weight

향후 내부 분석에서:

```text
VERIFIED
```

Outcome에 더 높은 신뢰 가중치를 줄 수 있다.

하지만:

```text
SELF_REPORTED
```

도 버리지 않는다.

대신:

```text
verification_level
```

을 feature로 보존한다.

---

# 55. 지원하지 않은 경우도 중요

사용자가:

```text
AI 분석을 받았지만 실제 지원하지 않음
```

일 수 있다.

Outcome에서 반드시 구분:

```text
NOT_SUBMITTED
```

이 데이터가 있어야
AI 결과를 채용 결과와 잘못 연결하지 않는다.

---

# 56. 사용자 최종본과 실제 제출 여부도 구분

```text
User Final
```

이 존재한다고 해서
실제 제출했다고 가정하지 않는다.

반드시:

```text
Submitted Snapshot
```

또는:

```text
submission_confirmed
```

를 별도로 둔다.

---

# 57. Outcome 데이터의 Missing 상태를 정상 상태로 취급

모든 Application Case의 결과를
얻을 수 있다고 가정하지 않는다.

```text
UNKNOWN
PENDING
NO_RESPONSE
```

같은 상태를 정상적으로 지원한다.

---

# 58. Outcome Feedback UX 예

Application Dashboard:

```text
현대자동차 · 생산관리

지원서 완성
2026.09.18 제출

지원 결과가 나왔나요?

[서류 합격]
[서류 불합격]
[아직 발표 전]
[지원하지 않았어요]
```

완료:

```text
결과가 저장되었습니다.

다음 분석에 사용할 1,000P가 지급되었습니다.
```

---

# 59. Verified Upgrade UX 예

```text
결과 인증은 선택사항입니다.

채용사이트 결과 화면이나 이메일을
개인정보가 보이지 않게 가린 뒤 인증하면
추가 포인트를 받을 수 있습니다.

[결과 인증]
[나중에]
```

---

# 60. Application Tracker UX 예

```text
내 지원현황

현대자동차
생산관리
서류 합격
면접 예정

기아
품질관리
서류 불합격

현대모비스
생산기술
지원 완료
```

사용자는:

```text
취업 지원 관리 도구
```

로 인식한다.

Outcome 수집은 자연스럽게 따라온다.

---

# 61. 데이터가 쌓인 뒤 가능한 내부 질문

예:

```text
어떤 학력/경력 조합에서
서류 합격률 차이가 나타나는가?

어떤 직무경험이
특정 직무 지원에서 더 자주 활용되는가?

문항 간 경험 중복이
Outcome과 어떤 상관을 보이는가?

정량 성과가 없는 경우에도
행동 근거가 강한 지원서는 어떤 결과를 보이는가?

AI Revised보다
User Final에서 어떤 수정이 자주 발생하는가?
```

---

# 62. User Final Correction도 중요한 학습 신호

사용자가 AI 결과를 반복적으로:

```text
짧게 줄임
말투를 되돌림
과장 표현 제거
특정 경험 교체
```

한다면:

```text
AI 결과 품질의 문제
```

일 수 있다.

따라서 Outcome 외에도:

```text
AI Revised
vs
User Final
```

diff는 매우 중요한 학습 데이터다.

---

# 63. Human Review가 붙으면 더 강해진다

향후:

```text
AI Result
↓
Human Expert Review
↓
User Final
↓
Outcome
```

까지 연결되면:

```text
AI와 전문가의 판단 차이
전문가가 자주 수정하는 부분
Outcome과 연결되는 수정 패턴
```

을 분석할 수 있다.

---

# 64. Data Moat의 실제 구성

장기적인 내부 자산:

```text
Candidate Facts
Candidate Snapshots
Job Snapshots
Application Snapshots
Submitted Snapshots
Outcome History
User Corrections
Human Corrections
Rubric Versions
Prompt Versions
Eval Results
```

---

# 65. 사용자에게 숨기지 말아야 하는 것

다음은 투명하게 안내하는 편이 좋다.

```text
지원자료에서 정보를 추출하여 분석에 사용
지원 결과를 사용자가 직접 기록할 수 있음
결과 피드백이 향후 서비스 개선에 사용될 수 있음
사용자 데이터 삭제/관리 정책
```

---

# 66. 외부에서 굳이 공개하지 않을 것

다음은 내부 분석 제조법.

```text
Outcome weighting
Feature engineering
Rubric calibration 방식
회사별 grouping 기준
minimum sample threshold
prediction model 구조
internal correlation analysis
```

---

# 67. 합격 데이터가 많아져도 마케팅 과장 금지

피해야 할 표현:

```text
MOOA Resume 이용 시 합격률 85%
AI가 실제 합격 가능성을 예측
이 스펙이면 현대차 합격 가능
```

충분한 검증과 인과 근거가 없다면 사용하지 않는다.

---

# 68. 더 좋은 외부 표현

예:

```text
실제 지원 결과 피드백을 바탕으로
분석 기준을 지속적으로 개선합니다.
```

단 실제로 그런 시스템이 가동된 이후에 사용한다.

또는:

```text
지원 결과를 기록하면
내 취업 지원 이력을 한 곳에서 관리할 수 있습니다.
```

---

# 69. MVP 우선순위

지금 당장 필요한 것:

```text
1. Candidate Facts 구조화
2. Candidate Snapshot
3. Application Case
4. Submission Snapshot
5. Application Outcome 기본 테이블
6. Result Dashboard 내 "분석에 사용된 내 정보"
7. "이 버전으로 제출" 상태
8. Outcome 수동 입력
```

---

# 70. 후순위

```text
Outcome Reward
Verified Outcome
Application Tracker 고도화
Outcome Analytics
유사 지원 사례 비교
Rubric Calibration 자동화
Prediction/Statistical Modeling
```

---

# 71. 지금부터 Schema를 열어둬야 하는 이유

Outcome 기능을 몇 년 뒤 붙이려다가
기존 데이터에:

```text
지원 당시 Candidate Snapshot
실제 제출본
지원일
공고 Snapshot
```

이 없다면
과거 데이터와 제대로 연결할 수 없다.

따라서 UI는 나중에 만들어도
핵심 Snapshot 구조는 지금부터 고려한다.

---

# 72. Core Data Relationship

```text
User
│
├─ Candidate Facts
│
└─ Application Case
      │
      ├─ Candidate Snapshot
      ├─ Job Snapshot
      ├─ Application Snapshot
      ├─ Document Versions
      ├─ Analysis Runs
      ├─ Submission Snapshot
      └─ Outcome
```

---

# 73. 중요한 Integrity Rule

Outcome이 존재하려면:

```text
어떤 Submission에 대한 결과인지
```

를 최대한 명확히 한다.

잘못:

```text
현재 프로필
+
현재 자소서
+
과거 Outcome
```

을 섞어서 분석.

권장:

```text
Candidate Snapshot at T1
+
Submitted Snapshot at T1
+
Job Snapshot at T1
+
Outcome after T1
```

---

# 74. Codex CLI Review Prompt

```text
Read:

- MOOA_RESUME_INTERNAL_AI_ENGINE.md
- MOOA_RESUME_NARRATIVE_POLICY_ADDENDUM.md
- MOOA_RESUME_OUTCOME_DATA_FLYWHEEL_ADDENDUM.md
- latest Result Dashboard and Application Case specs.

Do not implement yet.

Audit the current data model and application workflow.

The long-term target is to connect:

Candidate Snapshot
+
Job Snapshot
+
Application Snapshot
+
Submitted Snapshot
+
Outcome

for each Application Case.

Important rules:

1. Do not treat raw uploaded files as the primary long-term analytics asset.
2. Parse candidate information into structured data.
3. Preserve the candidate's state at the time of each application.
4. Preserve the job posting state used for the analysis.
5. Distinguish:
   - AI Revised,
   - User Final,
   - actual Submitted Snapshot.
6. Never assume User Final was actually submitted.
7. Support detailed outcome stages, not only pass/fail.
8. Support SELF_REPORTED and VERIFIED outcomes separately.
9. If rewards are introduced, reward reporting participation rather than "pass" outcomes.
10. Design an Application Tracker that creates user value instead of collecting outcomes only for internal analytics.
11. Keep outcome analytics and service-delivery storage conceptually separated.
12. Do not expose unsupported "acceptance probability" estimates.
13. Version all analysis-derived application features using prompt/rubric/schema/model metadata.
14. Treat UNKNOWN / PENDING / NOT_SUBMITTED as valid outcome states.
15. Keep identity data separable from analytics data where practical.

Report:

A. Current tables that can be reused.
B. Missing tables/fields.
C. Snapshot integrity problems.
D. How to model Candidate Snapshot, Job Snapshot, Submission Snapshot and Outcome.
E. How to preserve actual submitted versions.
F. Recommended initial Outcome enum/state machine.
G. MVP versus later implementation.
H. Migration risks.
I. Privacy/data-retention boundaries that should be represented in architecture.

Do not modify files until the review is complete.
```

---

# 75. Codex Implementation Direction

권장 개념 타입:

```ts
type OutcomeStage =
  | "DOCUMENT"
  | "INTERVIEW_1"
  | "INTERVIEW_FINAL"
  | "FINAL";

type OutcomeResult =
  | "PENDING"
  | "PASS"
  | "FAIL"
  | "WITHDRAWN"
  | "UNKNOWN";

type VerificationLevel =
  | "SELF_REPORTED"
  | "VERIFIED";
```

실제 구현에서는 기존 Schema와 맞춰 조정한다.

---

# 76. Source of Truth

Outcome / Data Flywheel 관련 우선순위:

1. 보안 / 개인정보 / 법적 요구
2. 최신 명시적 사용자 결정
3. `MOOA_RESUME_OUTCOME_DATA_FLYWHEEL_ADDENDUM.md`
4. `MOOA_RESUME_INTERNAL_AI_ENGINE.md`
5. `MOOA_RESUME_NARRATIVE_POLICY_ADDENDUM.md`
6. Result / Workflow Specs
7. PROJECT_SPEC.md
8. AGENTS.md

이 문서는 **지원자 구조화 데이터, 지원 당시 Snapshot, 실제 제출본, 채용 결과 추적 및 장기 데이터 Flywheel에 대한 최신 내부 기준**이다.
