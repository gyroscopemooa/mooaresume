# 저장된 커리어 프로필 조회 체크포인트

- 새 API: `GET /api/career-assessments/latest`
- 로그인한 소유자만 자신의 완료 세션을 읽는다. RLS를 추가 방어선으로 사용한다.
- 각 검사 종류별 가장 최근 완료 세션 하나만 반환하며, 원시 응답은 반환하지 않는다.
- 새 화면: `/career/profile/saved`
- 원격 migration 적용 전에는 실제 데이터를 표시하지 않는다. 배포·migration은 별도 사용자 승인 후 진행한다.
