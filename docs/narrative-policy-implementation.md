# Narrative Policy 구현 기록

작성일: 2026-08-16

## 기준 문서

- 루트 MOOA_RESUME_INTERNAL_AI_ENGINE.md
- 루트 MOOA_RESUME_NARRATIVE_POLICY_ADDENDUM.md

루트 문서는 ChatGPT 논의와 제품 Source of Truth다. 이 문서는 Codex가 실제 코드에 반영한 내용을 기록한다.

## 반영 내용

- 사실 생성 금지와 의미 해석 금지를 분리했다.
- DIRECT, SUPPORTED, PROPOSED, CONFIRMED, REJECTED 해석 상태를 추가했다.
- 새 사건·수치·개인적 깨달음은 사용자 확인 전 최종 문장에 사용하지 않는다.
- CREATE, BUILD, POLISH 및 상품 범위에 따른 Narrative Latitude 정책을 추가했다.
- Claim마다 근거 Fact ID, Claim Type, 확인 필요 여부를 기록할 수 있게 했다.
- 정량 성과 외에도 정성 결과, 행동 근거, 배운 점과 이전 가능한 역량을 평가할 수 있게 했다.
- 공개 홈에는 내부 엔진 이름 없이 “과장하지 않고 경험의 가치를 놓치지 않게”라는 가치로 번역했다.

## 구현 파일

- src/server/ai/contracts/analysis.ts
- src/server/ai/contracts/narrative-claim.ts
- src/server/ai/engines/interpretation-policy.ts
- src/server/ai/engines/narrative-latitude.ts
- src/app/page.tsx
- src/app/landing-sections.module.css

## 검증

- lint 통과
- typecheck 통과
- 46개 테스트 통과
- production build 통과
