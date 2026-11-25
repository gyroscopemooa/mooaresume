# 외부 주문 분석 — 2026-11-25 개발 체크포인트

- 작업: ChatGPT, 브랜치 feat/external-order-analysis.
- 기존 고객 결제/프롬프트/분석 엔진을 대체하지 않고 외부 주문 전용 접수·이용권 출처·서명 링크·Resend 발송을 추가했다.
- 신규: src/app/meensoo/external-orders, src/app/api/meensoo/external-orders, src/server/external-orders, src/app/result/external, src/app/feedback/external, src/server/notifications/external-order-complete-email, supabase/migrations/20261125010000_external_analysis_orders.sql.
- 기존 파일 최소 변경: 관리자 메뉴, 분석 스케줄러, 이메일 알림 대상 필터, Next private route headers, analytics exclusion.
- 보안: 주문별 내부 Auth owner, 고객 주소와 분리, 서비스 역할 전용 SQL, RLS, 30일 서명 링크, 회수, no-store/no-referrer/CSP. 기존 고객 데이터나 PG 주문은 변경하지 않음.
- 외부 주문 실패 시 판매처에서 직접 환불해야 한다. 외부 주문을 가짜 PG 매출로 기록하지 않는다.
- 비회원 결과는 동일 분석 문서의 읽기/다운로드용이며 FINAL 로그인 기반 모의면접·면접팩은 미연동.
- 배포 전: npm ci, typecheck, lint, test, build, Supabase migration dry-run 및 실제 test project 적용; 3개 상품 실제 분석 비교; 메일 자동 발송/미발송/재발송/주문 중복/회수/만료/타 주문 접근 실패 검증.
- Cloudflare: 기존 Resend 설정 유지, EXTERNAL_ORDER_SIGNING_SECRET (32자 이상, 안전한 랜덤 값), EXTERNAL_ORDERS_ENABLED=true는 검증 이후 설정. 기존 cron 설정 확인.
- 상태: 개발 브랜치에 소스 작성. 실제 빌드·DB 적용·운영 배포·메일 테스트 미실행. 본 브랜치를 바로 운영에 합치지 않는다.
- 롤백: flag off, draft branch 유지. 기존 main untouched.
