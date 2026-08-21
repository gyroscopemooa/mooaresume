# MOOA Resume 개발 체크포인트

기준일: 2026-08-21
마지막 갱신: 결제·분석 복구 로직, 문항 보존, 결과 비교판 5종을 로컬에 보존하고 Git 체크포인트 준비

이 문서가 현재 재개 기준이다. 이전 `docs/development-checkpoint-2026-08-16.md`와 `2026-08-17.md`는 과거 기록으로만 본다.

## 현재 상태

- 작업 브랜치: `main` (`origin/main`의 기존 기준 커밋은 `c9c06b8`)
- 이번 상태는 여러 세션의 Claude·Codex·사용자 변경을 함께 보존한 체크포인트다.
- 프로덕션 배포와 새 원격 Supabase migration 적용은 이번 체크포인트에서 실행하지 않았다.
- 실제 결제·OpenAI 호출이 발생하는 외부 작업도 새로 실행하지 않았다.

## 체크포인트 검증 결과

- 전체 Vitest: 46개 파일, 178개 테스트 통과
- TypeScript `tsc --noEmit`: 통과
- 전체 ESLint: 통과
- Next.js 16.3.1 production build: 성공
- 스테이징된 파일의 공백 오류와 비밀키·Polar 고객 세션 토큰 패턴 검사: 통과
- 빌드에는 기존 `middleware` convention deprecation 안내와 `pdfjs-dist` worker external 경고가 남아 있으나 컴파일·타입 검사·정적 페이지 생성은 모두 완료됐다.

## 이번 체크포인트에 포함된 핵심 변경

### 결제·분석 복구

- Polar 결제 후 로컬 또는 dev 출처로 정확히 돌아오도록 Checkout return URL 계산을 보강했다.
- Webhook을 놓친 성공 결제를 상태 조회에서 Polar 주문과 교차검증해 복구할 수 있는 reconciliation 로직과 테스트를 추가했다.
- OpenAI background response가 최초 요청에서 끝나지 않아도 response ID로 다시 조회해 완료 결과를 저장할 수 있게 했다.
- OpenAI 응답의 `usage`가 `null`인 정상 응답을 실패로 오인하지 않도록 처리했다.
- 결제·분석 실행 경계를 다시 보강하는 Supabase migration 두 개를 추가했다.

### 문항 구분과 빈 문항 보존

- 문항 제목과 원문 번호를 중복 직렬화해 `문항 1`이 두 번 생기던 흐름을 수정했다.
- 전체 복붙과 문항별 편집 사이를 이동해도 제목만 있고 답변이 없는 문항을 UI에서 보존한다.
- 분석 전송 시에는 답변이 있는 문항만 포함하고, 빈 문항을 AI가 임의 작성하지 않게 했다.
- 실제 `신민규_자기소개서 - 복사.docx` 유형은 1~3번 답변과 제목만 있는 4번 문항으로 구분하며, `주특기 업무작성` 안내 문구는 답변으로 취급하지 않는다.
- QUICK 결과는 입력된 모든 답변 문항을 반환하도록 prompt/schema/provider 검증을 보강했다.

### 결과 화면 비교판

기존 구현을 삭제하거나 덮어쓰지 않고 다음 다섯 화면을 함께 유지한다.

1. `/result` — 현재 결과 화면
2. `/result/codex` — Codex 빨간펜 미러
3. `/result/claude` — Claude 제출본 미러
4. `/result/claude-restored` — Claude 복원판(전체)
5. `/result/codex-restored` — Codex 복원판(전체)

- 두 전체 복원판은 Git의 `feature/original-annotations` 구현을 각자 독립 파일 세트로 보존한다.
- 원본 브랜치 `feature/original-annotations`와 별도 worktree 브랜치 `feature/bring-annotations-to-main`도 삭제하지 않는다.
- 상세 소유권과 복구 경로는 `docs/agent-change-log.md`를 따른다.

### 협업 보존 규칙

- `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/agent-change-coordination.mdc`에 다른 에이전트와 사용자의 변경을 덮어쓰지 않는 규칙을 추가했다.
- 삭제·대체가 필요한 경우 변경 기록을 먼저 남기고, 비교판 또는 별도 브랜치로 보존한 뒤 사용자 선택을 받는다.

## 확인된 실제 결제 건 상태

- Polar에서는 결제가 성공했지만 애플리케이션 DB의 checkout intent와 analysis run이 진행되지 않은 사례를 확인했다.
- 원인은 DOCX의 4번 빈 문항이 아니라 놓친 Webhook으로 분석 시작 신호가 전달되지 않은 것이었다.
- 로컬 복구 로직은 구현했지만 해당 실결제 레코드의 entitlement 지급과 OpenAI 분석 실행은 이번 체크포인트에서 수행하지 않았다.
- 고객 세션 토큰 등 민감한 결제 URL 값은 저장소 문서에 기록하지 않는다.

## 현재 알려진 문제와 다음 우선순위

### 1. QUICK 입력 확인 버튼 재현 및 수정

- 여러 문항으로 구분되면 답변이 있는 모든 문항의 `targetLength`를 강제로 요구하는 차단 조건이 남아 있다.
- 제품 결정은 복붙과 파일 업로드 모두 글자 수 제한 없이 진행 가능해야 한다는 것이다.
- 사용자 환경에서는 글자 수를 입력해도 진행되지 않는다고 보고했으며 브라우저 상태 문제 가능성도 있다.
- 다음 세션에서 실제 QUICK 입력 화면을 재현하고, 불필요한 `targetLength` 필수 조건을 제거한 뒤 저장 → `/analysis/prepare` 이동까지 UI 테스트로 고정한다.

### 2. 실제 결제 분석 복구

- 사용자의 명시적 외부 실행 승인 범위를 다시 확인한 뒤, 성공 결제 한 건을 새 결제 없이 reconciliation하고 분석 결과 저장까지 확인한다.
- 중복 entitlement·중복 OpenAI 실행이 발생하지 않는지 DB 상태를 전후 비교한다.

### 3. 결과 비교 선택

- 다섯 결과 화면을 비교한 뒤 사용자가 유지할 주 화면과 합칠 기능을 선택한다.
- 선택 전에는 어떤 비교판도 삭제하거나 주 화면으로 병합하지 않는다.

### 4. 배포 전 검증

- 전체 Vitest, TypeScript, ESLint, 필요 시 production build를 다시 통과시킨다.
- Supabase migration은 원격 dry-run을 검토한 뒤 별도 승인 범위에서 적용한다.
- 로컬 E2E 후에만 dev 또는 production 배포를 진행한다.

## 재개할 때 보호해야 할 것

- 현재 dirty tree를 `git reset --hard` 또는 광범위한 checkout으로 되돌리지 않는다.
- `feature/original-annotations`, `feature/bring-annotations-to-main`, `C:\mooaresume-annotations-merge`를 사용자 선택 전 삭제하지 않는다.
- `.env.local`과 실제 키·토큰·고객 세션 URL을 커밋하지 않는다.
- 루트의 미추적 참고 이미지와 임시 스키마 파일은 용도와 개인정보 여부를 확인하기 전 원격 저장소에 올리지 않는다.

## 현재 완료 판단

이번 체크포인트의 목적은 혼합 작업을 잃지 않도록 Git에 보존하는 것이다. 다음 개발 작업은 QUICK 입력 확인 버튼을 실제 브라우저에서 재현하고, 글자 수 제한 없이 결제 준비 화면으로 이동하게 만드는 것이다.
