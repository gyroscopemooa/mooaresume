# QUICK 한국어 Eval 전략

기준일: 2026-08-16

## 목적

실제 OpenAI API와 Supabase를 연결하기 전에도 QUICK 첨삭의 핵심 안전 규칙을 반복 검증한다. 실제 지원자 문서는 사용하지 않고, 익명으로 작성한 한국어 합성 fixture만 사용한다.

## 실행

```bash
npm run eval
```

전체 회귀 검사는 다음 순서로 실행한다.

```bash
npm run eval
npm test
npm run typecheck
npm run lint
npm run build
```

## OpenAI live Eval

live Eval은 실제 유료 API 호출이므로 일반 `npm test`와 `npm run eval`에서 제외된다. 실행 전에 로컬 `.env.local`에 다음 값을 설정한다.

```text
OPENAI_API_KEY=...
OPENAI_MODEL=...
RUN_LIVE_EVAL=1
```

그다음 명시적으로 실행한다.

```bash
npm run eval:live
```

- 12개 fixture를 요청 폭주와 비용 급증을 피하도록 순차 실행한다.
- 각 결과를 동일한 결정적 평가기로 검사한다.
- 로그에는 사례 ID, 통과 여부, 모델, 응답 ID, 토큰 사용량과 실패 코드만 남긴다.
- 원문과 전체 모델 출력은 파일이나 콘솔에 기록하지 않는다.
- 환경변수가 하나라도 없거나 `RUN_LIVE_EVAL=1`이 아니면 API를 호출하기 전에 실패한다.
- 이 명령은 자동 배포나 일반 CI에서 실행하지 않는다. 별도 승인된 Eval 작업에서만 실행한다.

## 현재 범위

`src/fixtures/quick-eval-cases.ts`에 12개 사례가 있다. CREATE, BUILD, POLISH와 담백하게, 균형 있게, 강점 살리기의 모든 조합 축을 포함한다.

주요 실패 조건은 다음과 같다.

- Structured Output schema 위반
- 원문에 없는 수치 생성
- 원문에 없는 근거 인용
- 첨삭본에 존재하지 않는 강조 문구
- 목표 분량의 115% 초과
- fixture에서 금지한 허위 역할·성과·기업 주장
- 기간·역할 등 보존해야 할 사실 누락
- 중요한 미확인 사실에 대한 질문 누락
- 필요한 개선 우선순위 누락

`src/evals/quick-eval.ts`는 모델 출력 JSON 하나를 fixture와 비교해 사례별 통과 여부와 실패 코드를 반환한다. `src/evals/quick-eval.test.ts`는 평가기 자체가 위반을 제대로 탐지하는지 회귀 검증한다.

## 실제 API 연결 후 사용

1. 각 fixture를 QUICK 요청으로 변환한다.
2. OpenAI Responses API의 Structured Output을 원본 JSON 그대로 평가기에 전달한다.
3. 모델명, prompt version, rubric version, schema version과 평가 결과를 함께 기록한다.
4. 프롬프트나 모델을 변경하기 전후에 같은 fixture를 실행해 회귀를 비교한다.
5. 실패 사례는 프롬프트로 숨기지 말고 schema, validator, 질문 정책 중 어느 층에서 막을지 결정한다.

실제 사용자 원문 전체를 일반 로그나 Eval fixture로 복사하지 않는다. 운영 중 발견한 실패는 개인·기업 식별 정보를 제거하고 최소한의 합성 사례로 재작성한다.

## 한계와 다음 확장

현재 금지 주장은 fixture별 문자열 검사이므로 의미가 같은 모든 허위 표현을 잡지는 못한다. 실제 API 연결 다음에는 Candidate Fact Ledger와 근거 ID를 도입해 문장 단위 의미 검증을 강화한다. 정성적 설득력은 자동 점수 하나로 단정하지 않고, 근거가 있는 rubric 평가와 사람의 표본 검토를 함께 사용한다.
