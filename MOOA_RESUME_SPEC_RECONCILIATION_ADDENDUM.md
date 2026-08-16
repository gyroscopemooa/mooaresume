# MOOA Resume 사양 정합성 및 개수 보존 Addendum

> 작성 기준: 2026-08-16  
> 목적: 여러 대화에서 작성된 MD의 이름과 분류 개수가 달라도 기존 기능을 임의로 삭제하거나 합치지 않도록 기준을 고정한다.

## 1. 이 문서의 역할

이 문서는 기존 사양을 대체하지 않는다. 기존 문서와 MOOA_RESUME_PRICING_FLOW_MATRIX_ADDENDUM.md를 연결하는 **+α 정합성 문서**다.

- 새 문서에 항목이 더 많으면 원칙적으로 기존 항목에 추가한다.
- 이름이 다르지만 목적이 같으면 별칭으로 연결한다.
- 이름이 비슷해도 입력, AI 목표, 결과 범위가 다르면 별도 동작으로 보존한다.
- 개수를 줄이거나 기능을 제거해야 할 때는 명시적인 사용자 결정 없이는 시행하지 않는다.

## 2. 서로 다른 개수를 섞어 세지 않는다

| 구분 | 개수 | 항목 |
|---|---:|---|
| 작성 상태 | 3 | CREATE, BUILD, POLISH |
| 유료 상품 | 3 | QUICK, PRO, FINAL |
| 작성 실행 플로우 | 4 | QUICK_EDIT, GUIDED_CREATE, PRO_ENHANCE, PRO_FINAL_REVIEW |
| 추가 레이어 | 1 | INTERVIEW_LAYER |
| 실행 모듈 합계 | 5 | 작성 플로우 4개 + 면접 레이어 1개 |

따라서 “실제 플로우 5개”는 “기존 4개를 3개로 축소한다”는 뜻이 아니다. 작성 플로우 4개를 모두 보존하고 FINAL의 면접 기능을 레이어로 더한 구조다.

## 3. 용어 매핑

| 사용자 표현 또는 이전 문서명 | 코드 기준명 | 보존해야 할 차이 |
|---|---|---|
| 아무것도 못 썼어요, 처음부터 작성 | CREATE | QUICK 불가, Guided 방식 필요 |
| 대충 썼어요, 내용 보완 | BUILD | 기존 글 안에서만 고치는 QUICK과 자료까지 찾아 강화하는 PRO가 다름 |
| 거의 완성, 최종 첨삭 | POLISH | 말투와 사실을 보존하며 제출 전 검증 중심 |
| 간단형, 빠른 첨삭 | QUICK | BUILD/POLISH가 화면을 공유해도 writingMode별 지시가 다름 |
| 정밀형, 전체 분석 | PRO | CREATE/BUILD/POLISH별 목표와 질문 방식이 다름 |
| 면접 포함형 | FINAL | 해당 상태의 PRO 결과 + INTERVIEW_LAYER |

## 4. 조합은 유지하고 구현만 공유한다

3 × 3 조합을 사용자 상태와 상품 권한 관점에서는 보존한다. 다만 같은 화면과 기반 코드를 재사용할 수 있다.

| 조합 | 실행 결과 |
|---|---|
| CREATE + QUICK | NOT_ELIGIBLE |
| BUILD + QUICK | QUICK_EDIT + BUILD 지시 |
| POLISH + QUICK | QUICK_EDIT + POLISH 지시 |
| CREATE + PRO | GUIDED_CREATE |
| BUILD + PRO | PRO_ENHANCE |
| POLISH + PRO | PRO_FINAL_REVIEW |
| CREATE + FINAL | GUIDED_CREATE + INTERVIEW_LAYER |
| BUILD + FINAL | PRO_ENHANCE + INTERVIEW_LAYER |
| POLISH + FINAL | PRO_FINAL_REVIEW + INTERVIEW_LAYER |

공유 UI는 같은 상품이라는 뜻일 뿐 같은 동작이라는 뜻이 아니다. 특히 BUILD와 POLISH는 QUICK 화면을 공유해도 writingMode를 절대 덮어쓰지 않는다.

## 5. FINAL 노출 원칙

FINAL 14,900원은 삭제된 네 번째 작성 플로우가 아니다. PRO 작성 결과에 모의면접 권한을 더하는 상품이다.

- 작성 시작 화면: FINAL 14,900원을 독립 구매 상품으로 유지한다.
- FINAL 직접 구매: 선택한 작성 상태의 PRO 플로우와 AI 모의면접을 모두 제공한다.
- PRO 구매 후: 결과 화면에서 차액 5,000원으로 동일한 FINAL 권한으로 업그레이드할 수 있다.
- 초기 화면에서는 QUICK/PRO/FINAL의 세 상품을 모두 보여주되, FINAL을 별도 작성 엔진처럼 표현하지 않는다.
- 구현 전에는 선택 가능한 척 결제로 보내지 않고 COMING SOON 상태를 명확히 표시한다.

## 6. 문서 충돌 처리 순서

1. 보안 및 개인정보 원칙
2. 사용자의 최신 명시 결정
3. 이 정합성 문서
4. MOOA_RESUME_PRICING_FLOW_MATRIX_ADDENDUM.md
5. 기존 Product Mode/Pricing 및 Flow Addendum
6. Additional Spec
7. Project Spec

새 MD가 기존 사양의 +α인지 대체안인지 불명확하면 **추가안으로 취급**한다. 삭제, 통합, 가격 변경은 사용자 확인 후 반영한다.

## 7. 개발 잠금 규칙

- resolveWorkflow(writingMode, productTier) 조합 테스트를 유지한다.
- CREATE/BUILD/POLISH를 라우팅 중 다른 상태로 덮어쓰지 않는다.
- FINAL은 PRO 분석 권한과 AI 면접 권한을 함께 가진다.
- 기능명 변경은 가능하지만 기능 수 축소는 별도 결정으로 기록한다.
- 사양 감사 시 문서의 제목 수가 아니라 사용자 여정, 입력, AI 목표, 결과물을 비교한다.
