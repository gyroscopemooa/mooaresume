# 무아레쥬메 커리어 검사 MVP

작성일: 2026-08-26  
상태: 구현 시작 — 1차 제공 범위 확정

## 제품 역할

커리어 검사는 무아레쥬메의 본체인 자소서·지원서 분석을 대체하지 않는다. 검색 유입과 자기이해를 돕는 무료 서브제품이며, 결과를 실제 경험 선택과 지원서 분석으로 자연스럽게 연결한다.

핵심 흐름은 다음과 같다.

`검색/헤더 → 업무성향 분석 → 개인 결과(비공개) → 자기소개서 분석 또는 공고 비교`

## 현재 구현 범위

- URL: `/career`, `/career/work-style`, `/career/work-style/result`
- 무료 업무성향 분석 한 종
- IPIP의 50-item representation of Goldberg (1992) Big-Five markers와 공식 한국어 번안을 사용
- 5점 응답, 역문항을 포함한 결정적 TypeScript 채점
- 결과: 상호작용 선호, 협업 지향, 계획·완수, 정서적 안정, 학습·새로운 방식
- 레이더 차트와 특성별 0–100 환산 점수
- 자소서에 연결할 때는 검사 결과가 아니라 **실제 경험**만 쓰도록 안내
- 결과는 현재 브라우저 세션에만 임시 저장한다. 로그인 계정·DB 저장은 아직 하지 않는다.

## 표시하지 않는 것

- 한국 사용자 규준이 없는 퍼센타일·상위 n%
- 채용 합격 가능성, 직무 적합 확률, 능력 판정
- 의료·정신건강 진단 또는 임상적 해석
- RIASEC/O*NET 문항, 직업가치관 문항, PHQ-9/GAD-7

0–100은 해당 척도의 10문항을 역채점한 후 가능한 최소·최대 원점수 사이에서 선형 환산한 값이다. 집단 내 상대 순위가 아니다.

## 다음 순서

1. 로그인 사용자의 결과 저장을 위한 버전 고정 `AssessmentSession`/`AssessmentResult` 데이터 모델과 RLS migration을 설계한다.
2. 실제 경험과 지원 공고가 있는 경우에만 결과를 지원서 분석 프롬프트의 보조 맥락으로 전달한다. 모델이 새로운 사실을 만들면 안 된다.
3. RIASEC/O*NET의 한국어 적용·파생물 라이선스·검증 조건을 별도로 확인한 뒤 직업흥미 분석을 검토한다.
4. 직업가치관은 공개 사용허가 척도를 선정하거나 전문가 검토와 타당화 계획을 갖춘 뒤 추가한다.

## 출처와 고지

- IPIP은 문항·척도를 공개 영역으로 두며 복제·수정·번역·상업 이용을 허용한다.
- 한국어 문항은 IPIP에 공개된 In-Sue Oh의 번안을 기반으로 한다.
- 정확한 명칭은 `50-item IPIP representation of the Goldberg (1992) markers for the Big-Five factor structure`를 사용한다.
- 사용자 화면에는 출처, 측정 범위, 비진단성, 결과 저장 방식을 명시한다.

참고:

- https://ipip.ori.org/
- https://ipip.ori.org/KoreanBig-FiveFactorMarkers.htm
- https://ipip.ori.org/New_IPIP-50-item-scale.htm
- Goldberg, L. R. (1992). *The development of markers for the Big-Five factor structure.* Psychological Assessment, 4, 26–42.
