# QUICK 실제 AI 첨삭 Vertical Slice 기반

작성일: 2026-08-16

## 구현 완료

- OpenAI Responses API 서버 전용 REST 게이트웨이
- Zod를 단일 원본으로 사용하는 Structured Output JSON Schema
- QUICK prompt version, rubric version, schema version 상수
- 담백하게 / 균형 있게 / 강점 살리기 작성 스타일 프롬프트 반영
- 원문에 없는 수치, 원문에 없는 근거 인용, 잘못된 강조 문구, 목표 분량 초과 검증
- 검증 실패 사유를 포함한 최대 1회 교정 재시도
- 실제 AI 결과를 ResultDocument로 변환
- 모델, 응답 ID, 프롬프트·루브릭·스키마 버전, 입력·출력·전체 토큰 기록
- 정성적 준비도 점수에 근거 배열을 의무화
- Mock gateway 기반 반복 가능한 회귀 테스트

## 서버 환경변수

~~~text
OPENAI_API_KEY=
OPENAI_MODEL=
~~~

두 값은 서버 전용이며 NEXT_PUBLIC 접두사를 사용하지 않는다. 모델명은 코드에 고정하지 않는다.


## 실행 실패·재시도 정책

- AI provider의 일시적 호출 오류만 같은 AnalysisRun과 SubmissionSnapshot으로 자동 재시도한다.
- 총 시도 횟수는 최초 호출을 포함해 최대 2회다.
- 첫 일시 오류는 실행을 PENDING으로 되돌리고 소비한 entitlement를 ACTIVE로 복구한다.
- 출력 검증 실패와 알 수 없는 오류는 재시도하지 않고 FAILED로 종료한다.
- 두 번째 일시 오류도 FAILED로 종료한다.
- 결과가 저장되지 않은 실패에서는 entitlement를 복구하므로 사용자가 다시 결제하지 않는다.
- 상태 변경 RPC는 소유자와 RUNNING 상태를 행 잠금으로 확인하며 service-role만 호출한다.
## 안전 규칙

- 제공되지 않은 경험·사건·역할·회사·직책·기간·자격·수치·성과를 만들지 않는다.
- 확인할 수 없는 주장은 needs_verification으로 분류한다.
- 준비도 점수는 합격 확률이 아니다.
- 모든 수정 이유는 원문에서 실제로 찾을 수 있는 근거 인용을 포함한다.
- 원문에 없는 숫자가 첨삭본에 나타나면 결과를 거부한다.
- 검증 재시도 후에도 실패하면 사용자 결과로 반환하지 않는다.
- 자기소개서 전문을 서버 로그에 남기지 않는다.


## 현재 연결 경계

인증·결제 entitlement 확인, SubmissionSnapshot 기반 실행, AnalysisResult 저장, 실제 결과 화면 조회까지 로컬 코드가 연결돼 있다. AI 호출은 서버의 service-role RPC가 소유권과 미사용 entitlement를 검증한 뒤에만 시작한다.

외부 환경 검증 순서:

1. Supabase migration 적용과 Auth Redirect URL 등록
2. Polar sandbox Checkout 및 서명 webhook 검증
3. 결제 후 entitlement 지급과 QUICK 실행 확인
4. OpenAI Responses API 실제 결과 저장과 결과 화면 확인
5. provider 일시 장애 및 출력 검증 실패의 entitlement 복구 확인

## 검증 범위의 한계

현재 검증기는 원문에 없는 숫자와 추적 불가능한 근거를 결정적으로 차단한다. 새로운 고유명사, 날짜 의미 변경, 부정 표현 반전과 복합 사실 변경 검증은 후속 Fact Ledger 및 독립 재검수 단계에서 강화한다.
