# Application Tracker 및 Outcome Integrity 구현 기록

작성일: 2026-08-16

## 기준 문서

- 루트 MOOA_RESUME_APPLICATION_TRACKER_OUTCOME_INTEGRITY_ADDENDUM.md
- 루트 MOOA_RESUME_OUTCOME_DATA_FLYWHEEL_ADDENDUM.md

## 구현 원칙

Outcome 데이터를 직접 요구하지 않고 사용자가 자신의 지원현황을 관리하는 기능으로 제공한다.

- 합격·불합격보다 먼저 실제 제출 여부를 확인한다.
- AI Revised, User Final, Submitted Snapshot을 구분한다.
- 제출 확인 전에는 채용 결과를 입력할 수 없다.
- 결과는 SELF_REPORTED 및 ORGANIC으로 시작한다.
- 현금·커피·포인트 보상은 포함하지 않는다.
- 현재 상태뿐 아니라 상태 변경 이력을 보존한다.
- 지원하지 않음, 대기, 결과 미확인을 정상 상태로 취급한다.

## 현재 UI

결과 대시보드의 최종 제출본 탭 아래에 내 지원현황 카드를 추가했다.

1. 이 버전으로 제출했어요
2. Submission Snapshot 식별자 생성
3. 서류 결과 대기
4. 서류 합격 또는 불합격
5. 합격 시 면접 준비 탭 및 FINAL 업그레이드 흐름
6. 불합격 시 핵심 개선점으로 복귀
7. 면접 및 최종 결과 단계 업데이트

## 현재 저장 범위

실제 서버와 Supabase는 아직 연결하지 않았다. 샘플 결과 화면에서는 sessionStorage에만 저장하며 서버로 전송하지 않는다.

## 추가된 코드

- src/domain/application-tracker.ts
- src/domain/application-tracker.test.ts
- src/components/application-tracker-card.tsx
- src/components/application-tracker-card.module.css
- src/components/result-workspace-v2.tsx

## 다음 단계

- 실제 Application Case 저장소 연결
- 사용자 계정별 Tracker 목록
- 제출 당시 Candidate, Job, Application Snapshot 연결
- 서버 생성 Submission Snapshot
- Outcome event append-only 저장
- 개인정보 동의 및 보관기간 정책
- 재방문 시 결과 업데이트 UX
- 실제 이용 데이터로 자발적 업데이트율 측정
