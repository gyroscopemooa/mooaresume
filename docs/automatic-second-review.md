# 신규 완료 건 컨설턴트 검수

## 범위

- 1차 품질 검수/재작성은 계속 1차 실행 안에서 수행한다. quick-4.7은 다중 소재의 불명확한 기본 분량을 공식 전체 제한으로 오해하지 않도록 개선한다.
- 신규 QUICK/PRO/FINAL 실행의 `COMPLETED` 전환만 자동 작업으로 등록한다. 과거 완료 건 backfill 없음.
- Snapshot 원자료 + 1차 결과/피드백 → 별도 컨설턴트 작성 → 별도 검증 → 관리자 전용 immutable preview.
- 2차는 새 점수/공고 검증 결과가 아니다. 공고/면접 탭은 1차 참고 자료라는 기존 안내 유지.
- 자동 이메일, 고객 결과 교체, 고객 링크 발급, 결제/이용권 변경은 이 작업에서 수행하지 않는다. 기존 1차 완료 메일은 유지.
- 2차 생성만으로 수동 검토본 수준을 보장하지 않는다. 관리자 검수 후 개별 발송 판단이 필요하다.

## 실행 / 비용 경계

- migration `20261021010000_automatic_second_reviews.sql` 적용 후 Worker 배포.
- `AUTO_SECOND_REVIEW_ENABLED=true`인 경우 기존 인증된 `/api/analysis-runs/advance`가 호출될 때마다 작업 1개를 한 단계 처리한다. 기존 pg_cron(1분)을 재사용한다.
- 모델: `OPENAI_SECOND_REVIEW_MODEL` 선택, 미설정이면 `OPENAI_MODEL`. 작성과 검증은 서로 다른 Responses 호출이다.
- 작업당 최대 두 번의 생성 호출(작성/독립 검증), 각 출력 상한 24,000/12,000 토큰. 입력 180,000자 초과는 확인 필요로 중단. 유료 자동 재시도 없음.
- 실행 중 response ID가 있으면 조회만 수행한다. 시작 후 응답 ID 저장 전 중단된 작업은 재구매하지 않고 `needs_attention`. 24시간이 지난 미완료 작업도 확인 필요.
- lease 3분, 완료 저장은 lease 확인과 preview 삽입/완료 변경을 한 SQL 트랜잭션으로 처리한다.
- 출처 context는 첫 실행에 저장되어 이후 단계에서 동일 자료를 검토한다. 원문 로그 출력 없음, RLS/서비스 역할 전용, analysis_run 삭제 시 cascade.
- 모델/응답 ID/프롬프트/스키마/루브릭/토큰 기록. 2차 토큰은 관리자 목록에 별도로 표시한다. 기존 1차 원가 합계에는 아직 합산하지 않는다.

## 검수 기준

- 소제목은 작성 항목이지 공식 질문 수가 아니다. 여러 작성 항목을 한 요약으로 축약하지 않는다.
- 모든 항목이 누락/중복 없이 반환되어야 한다. 원문 그대로면 `maintained`와 유지 근거가 필요하다.
- `improved`: 실제 문제 수정. `alternative`: 문제 없는 문장의 다른 합리적 구성. 두 번 생성됐다는 이유로 개선을 주장하지 않는다.
- 별도 검증에서 사실 보존/날조 없음/피드백 해결 또는 표시/문체/누락 없음/퇴행 없음이 모든 항목에 대해 통과해야 preview가 생긴다.
- 검증 탈락 후보와 이유는 private 작업 레코드에 남고 완료 preview로 게시되지 않는다.
- 더 구체적인 사실이 필요하면 확인 사항을 남긴다. 새로운 역할·성과·근무기간은 만들지 않는다.

## 확인 방법

- 관리자 전체 첨삭: 자동 검수 진행 중 / 자동 검수 중단·확인 필요 / 자동 검증 통과·관리자 확인 대기.
- 성공 preview는 기존 정규 2차 대시보드에 연결된다.
- 운영 중지: `AUTO_SECOND_REVIEW_ENABLED=false`로 배포(기록은 유지). 필요시 DBA가 enqueue 트리거를 비활성화. 테이블 삭제로 롤백하지 않는다.
- 적용 후 과거 실행이 등록되지 않았는지, 새 완료 전환만 들어오는지 확인한다. 수동 고객 실행 생성/상태 변경으로 시험하지 않는다.

## 반복 가능한 검증

```powershell
npx vitest run src/server/second-review src/server/ai/quick src/domain/admin-analysis-preview.test.ts src/domain/second-review-result.test.ts
npm run typecheck
npm install --prefix .wrangler/sql-check --no-save --package-lock=false @electric-sql/pglite
node scripts/verify-automatic-review-sql.mjs
```

`scripts/eval-automatic-second-review.ts`는 개인정보 없는 다섯 항목 샘플의 유료 opt-in 평가다. `ALLOW_PAID_SECOND_REVIEW_EVAL=true`와 API 환경변수가 있어야 시작한다. `draft-start`, `draft-poll`, `verify-start`, `verify-poll`을 분리하며 상태 파일을 보존하여 중복 구매를 피한다. 운영 DB와 메일을 사용하지 않는다.
