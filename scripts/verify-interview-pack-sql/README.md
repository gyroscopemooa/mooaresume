# 면접 준비팩·테스트 이용권 SQL 검증

`supabase/migrations` 전체를 실제 Postgres(PGlite)에 적용한 뒤, 새 마이그레이션 두 개
(`20260926010000_admin_test_grants.sql`, `20260926020000_interview_packs.sql`)의 동작을 시나리오로 검증합니다.

```bash
npm i --no-save @electric-sql/pglite   # package.json 은 바뀌지 않습니다
node scripts/verify-interview-pack-sql/run.mjs
```

확인하는 것: 테스트 이용권 발급·회수·사용(횟수·만료·남의 지원 건 차단), 이용권이 실제 `begin_quick_analysis` 를 통과하는지,
FINAL/QUICK/환불/미결제별 팩 접근 판정, 사용량 예약(중복 키·진행 잠금·한도·만료), 최초 생성·이어 만들기·AI 수정 한도,
직접 수정·복원의 판(revision) 충돌, 소유자 분리(RLS)와 브라우저 권한, 테스트 초기화와 AI 호출 원장 보존,
계정 삭제 함수 호환, 기존 이용권 행이 있는 DB 에 적용되는지.

한계: PGlite 는 연결이 하나라 진짜 동시 요청은 재현하지 못합니다(행 잠금 로직은 코드로만 검증됩니다).
