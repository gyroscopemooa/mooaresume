# MOOA Resume Internal AI Engine

> INTERNAL / CONFIDENTIAL  
> 외부 홈페이지, 공개 요금표, 마케팅 문구에 엔진명·점수식·임계값·처리 순서를 그대로 노출하지 않는다.
>
> 정식 Source of Truth: MOOA_RESUME_INTERNAL_AI_ENGINE.md  
> 이 파일은 현재 구현 범위를 빠르게 확인하는 요약본이다.
> Narrative 최신 기준: MOOA_RESUME_NARRATIVE_POLICY_ADDENDUM.md

## 목적

공개 기능은 사용자가 받는 결과를 설명한다. 이 문서는 그 결과를 만드는 내부 제조법을 관리한다.

처리 흐름:

Documents → Facts → Job requirements → Question intent → Experience candidates → Coverage and risk → Targeted questions → User fact approval → Draft → Independent evaluation → Constrained rewrite → Final cross-check → Interview risks

핵심 차별점은 단일 비밀 프롬프트가 아니라 단계별 구조, 검증 규칙, 평가 사례와 버전의 축적이다.

## 공개 수준

### 공개

- 없는 경험을 만들지 않음
- 공고와 경험 연결
- 적합한 경험 추천
- 자료 간 충돌 확인
- 꼭 필요한 추가 질문
- 글자 수와 말투를 지킨 수정
- 지원자료 기반 면접 질문

### 반공개

효용은 설명하되 내부 이름, 점수식, 우선순위와 임계값은 노출하지 않는다.

- 근거 신뢰도
- 문항별 경험 배치
- 면접 위험 지점
- 첨삭 전후 동일 기준 재평가
- 추가 수정 중단 판단

### 비공개

- 내부 엔진명과 단계 순서
- weights와 thresholds
- 평가 루브릭 원문
- prompt 전문과 prompt_version
- eval dataset과 실패 사례
- fallback 및 model routing 규칙

## 내부 엔진

### Evidence Ledger

모든 사용 가능 주장을 출처 및 검증 상태와 함께 기록한다. AI는 승인된 사실만 최종 문장에 사용할 수 있다.

- VERIFIED: 제출 자료에서 직접 확인
- USER_CONFIRMED: 사용자가 직접 확인
- NEEDS_VERIFICATION: 출처 또는 측정 기준 확인 필요
- CONFLICTED: 자료 간 충돌
- REJECTED: 사용 금지

### Requirement–Experience Coverage Matrix

공고 요구사항과 경험의 근거 강도를 연결하고, 현재 문항 배치에서 빠진 역량과 과도하게 반복된 경험을 찾는다. 외부에는 “더 적합한 경험 추천”으로만 표현한다.

### Information-Gain Question Planner

누락된 정보를 모두 묻지 않는다. 결과 품질을 가장 크게 바꿀 질문만 한 번에 2~4개 선택한다. 결과 영향도, 기존 자료 존재 여부, 확인 가능성, 현재 단계 관련성, 사용자 부담과 민감도를 고려한다.

### Rewrite Constraint Engine

- 승인되지 않은 사실 추가 금지
- 기업명·직무명·기간·수치의 무단 변경 금지
- 사용자 말투의 과도한 변화 금지
- 목표 글자 수 준수
- 문항 의도 및 공고 근거 강화

### Independent Re-evaluation

수정본을 생성한 단계와 분리된 기준으로 전후를 다시 평가한다. 개선되지 않은 rewrite는 채택하지 않는다.

### Stop-Editing Detector

추가 수정의 기대 개선보다 말투 훼손, AI 정형화와 의미 변형 위험이 커지면 현재 버전을 유지한다.

### Interview Attack Surface

강한 주장, 약한 근거, 문서 충돌, 수치, 불명확한 개인 기여와 공고 핵심역량이 겹치는 지점을 우선 면접 질문으로 전환한다.

## My GPT 이전 원칙

My GPT 자체나 설정이 API 키를 통해 자동 이전된다고 가정하지 않는다. 기존 Instructions와 Knowledge에서 공통 원칙, 평가 규칙, 첨삭 규칙, 사실 보존 규칙, 문항 분석 규칙, 결과 형식, 좋은 예시와 실패 예시를 수동 추출한다.

각 규칙을 prompt, rubric, engine, eval로 분리하며 사용자 화면이나 클라이언트 번들에는 넣지 않는다.

## 프롬프트 저장 전략

기본은 private server code에서 버전 관리한다. OpenAI 저장 prompt object는 운영상 유리할 때 선택적으로 사용할 수 있으며, 공급자 기능 변경과 무관하게 내부 prompt registry가 기준이 된다.

서버 구조:

- src/server/ai/contracts
- src/server/ai/prompts
- src/server/ai/rubrics
- src/server/ai/engines
- src/server/ai/evals

각 실행 기록에는 workflow_version, prompt_version, rubric_version, model_snapshot, output_schema_version을 남긴다. API key는 서버 환경변수에서만 읽고 브라우저에 전달하지 않는다.

## 구현 순서

1. Evidence Ledger와 출처 연결
2. 공고 요구사항 및 경험 후보 구조
3. Coverage Matrix
4. Question Planner
5. 사용자 사실 승인
6. Constraint Rewrite
7. Independent Evaluator
8. Stop Editing
9. Interview Risk
10. 실제 데이터 기반 eval 및 보정

현재 추가 코드는 1~4 및 Stop Editing의 도메인 기반이다. 실제 모델 프롬프트와 가중치는 My GPT 원문 및 평가 사례를 정리한 뒤 버전 1로 확정한다.
