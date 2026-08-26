# RIASEC 직업흥미 분석 — 라이선스·구현 결정 기록

작성일: 2026-08-26  
상태: 조사 완료, 한국어 자체 실시 구현 보류

## 확인한 사실

O*NET Interest Profiler는 RIASEC(현실형·탐구형·예술형·사회형·진취형·관습형) 기반의 직업흥미 도구다. 공식 Mini-IP는 30문항, Short Form은 60문항이며, 공식 결과는 O*NET-SOC 직업과 연결된다.

O*NET Career Exploration Tools의 원문 그대로 재배포는 CC BY-ND 4.0 조건을 따른다. 한국어 번안·문항 수정·UI에 맞춘 확장처럼 파생물을 만들려면 O*NET Tools Developer License를 적용하고, 출처·수정 사실·비승인 고지와 함께 해당 제품을 검증해야 한다.

## 무아레쥬메의 결정

한국어 문항을 임의 번역해서 즉시 출시하지 않는다. 아래 셋 중 하나가 갖춰진 뒤 구현한다.

1. 공식 웹 위젯 또는 웹 서비스 API를 그대로 이용한다.
2. 한국어 번안의 사용권·검증 자료를 확인한다.
3. Developer License 조건으로 한국어 번안·사용성·채점·결과 연결을 검증하고, 수정·출처·비승인 고지를 제공한다.

직업 추천도 단정하지 않는다. `탐색해 볼 직무군`과 O*NET 직업 정보의 연결 근거를 보여주며, 국내 직무·산업 맥락은 별도 데이터 검토가 필요하다.

## 출처

- https://www.onetcenter.org/IP.html
- https://www.onetcenter.org/license_tools.html
- https://services.onetcenter.org/ip
