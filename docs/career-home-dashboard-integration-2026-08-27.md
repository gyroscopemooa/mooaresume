# [워크트리 초안 · feature/codex-plan] 커리어 홈 대시보드 방향 적용

상태: **`/career`에만 적용 예정 — main 미통합**.

## 사용자 선택

사용자가 `/career/lab/dashboard` 시안 방향을 확인한 뒤, 다른 검사·결과·헤더는 바꾸지 않고 실제 커리어 홈부터 바꾸도록 선택했다.

## 변경 범위

- 변경: `src/app/career/page.tsx`와 홈 전용 표시 컴포넌트/CSS
- 유지: 모든 검사 문항·채점·결과·프로필·저장 API·헤더·메인 홈
- 링크: 기존 `/career/interest`, `/career/work-style`, `/career/values`, `/career/profile`만 사용
- 데이터: 홈의 대시보드 모양은 제품 안내용이며, 사용자 점수·개인정보·채용 예측을 보여주지 않는다.

## 복구

교체 전 홈 페이지를 `.previous-career-home-dashboard-20260827` 파일로 보존한다. 최신 main 통합 시 해당 페이지와 로그인·헤더 작업을 먼저 비교한다.
