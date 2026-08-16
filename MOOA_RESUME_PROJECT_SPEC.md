# 무아레쥬메 (MOOA Resume) — Product & Engineering Master Spec

> 작성 기준일: 2026-08-15  
> 목적: OpenAI Codex CLI에 그대로 전달해 개발을 시작할 수 있는 단일 기준 문서(Single Source of Truth)  
> 상태: MVP 기획 확정안 / 가격·브랜드 세부명은 실험 가능

---

## 0. 한 줄 결론

**초기에는 “간단한 AI 자소서 첨삭 서비스”로 빠르게 출시하되, 내부 데이터 구조는 향후 `AI 분석 → 현직자/직업상담사 인간 검토 → 전문가 마켓플레이스 → 대학/기관 B2B`로 확장할 수 있도록 설계한다.**

플랫폼 기능을 지금 만들지 않는다.  
대신 지금부터 `Application Case / Document / Version / Snapshot / Review` 개념을 올바르게 설계해, 나중에 `AI Review` 옆에 `Human Review`를 추가할 수 있게 한다.

---

# 1. 제품 철학

## 1.1 핵심 메시지

> **우리의 목표는 좋은 자기소개서가 아닙니다. 최종합격입니다.**

서류의 목적은 서류 자체가 아니라 면접 기회를 얻는 것이고,  
면접의 목적도 면접 자체가 아니라 최종합격이다.

따라서 서비스는 장기적으로 아래 흐름을 연결한다.

```text
채용공고
  ↓
지원전략
  ↓
경험 선정
  ↓
자기소개서/지원서
  ↓
AI 분석·첨삭
  ↓
제출 전 검수
  ↓
예상 면접질문
  ↓
모의면접
  ↓
필요 시 인간 전문가 검토
  ↓
최종지원
```

## 1.2 하지 않을 포지셔닝

- “ChatGPT보다 글을 더 잘 써드립니다.”
- “AI가 합격 자소서를 자동 생성합니다.”
- “합격확률 87%”
- “AI 작성률 탐지”
- 근거 없이 점수를 많이 보여주는 가짜 정밀도

## 1.3 권장 포지셔닝

> **자소서만 보지 않습니다.**  
> 채용공고, 이력서, 경력과 경험을 함께 분석해  
> 무엇을 써야 하는지, 무엇을 고쳐야 하는지, 면접에서 무엇을 준비해야 하는지까지 알려드립니다.

---

# 2. 브랜드 전략

## 2.1 현재 권장안

### MVP 브랜드
**무아레쥬메 / MOOA Resume**

기존 서비스의 역사와 관계성을 이어가기 위해 당장은 이름을 유지한다.

단, 서비스 설명은 아래처럼 넓힌다.

- 과거: AI 자소서 첨삭 프로그램
- 권장: **AI 취업 코치**
- 권장: **AI 지원서 분석**
- 권장: **공고 맞춤 지원서 분석 및 첨삭**

### 이유
1. 기존 이름/도메인/과거 운영 이력을 버리지 않는다.
2. MVP 핵심 기능은 여전히 자소서/지원서이므로 이름과 기능이 충돌하지 않는다.
3. 인간 검토 기능이 생겨도 “무아레쥬메 전문가 검토”로 자연스럽게 확장 가능하다.
4. 플랫폼이 실제로 커진 뒤 상위 브랜드를 만드는 편이 리브랜딩 리스크가 낮다.

## 2.2 장기 확장 시 상위 브랜드 후보

추천 순서:

1. **MOOA Career / 무아커리어**
   - 가장 넓고 자연스러움
   - 취업 서류, 면접, 전문가, 대학 B2B까지 포함 가능
2. **MOOA Apply / 무아어플라이**
   - “지원 과정 전체”라는 의미가 강함
   - 지원 프로젝트 관리와 잘 맞음
3. **MOOA Coach / 무아코치**
   - AI + 인간 전문가 모델과 잘 맞음
   - 다만 초기 자소서 서비스라는 인식은 약함
4. **MOOA Fit / 무아핏**
   - 직무 적합성에 어울림
   - 다소 일반적인 이름
5. **MOOA Works / 무아웍스**
   - 회사/플랫폼 브랜드에는 적합
   - 개인 취준생 서비스명으로는 추상적

### 권장 브랜드 계층
```text
향후 상위 브랜드: MOOA Career
└── 제품: MOOA Resume / 무아레쥬메
    ├── AI 첨삭
    ├── 지원서 분석
    ├── 면접 준비
    └── 전문가 검토
```

**지금은 리브랜딩하지 않는다. 사용자가 실제로 늘어난 후 결정한다.**

---

# 3. 사업 전략: AI First → Human Review → Marketplace

## 3.1 왜 플랫폼부터 만들지 않는가

양면시장 문제:

```text
고객이 없음 → 전문가가 안 들어옴
전문가가 없음 → 고객이 안 들어옴
거래가 없음 → 플랫폼이 비어 보임
```

따라서 초기 목표는 **전문가를 모집하는 것보다 AI로 실제 사용자를 확보하는 것**이다.

## 3.2 단계

### Phase A — AI Product
전문가 0명이어도 서비스가 완결된다.

- AI 첨삭
- 공고 분석
- 이력서/지원자료 분석
- 지원서 대시보드
- 제출 전 검수
- 면접 예상질문

### Phase B — Human Review
트래픽/유료사용자가 생기면 작은 인간 검토 기능을 추가한다.

```text
AI 분석 결과
   ↓
[현직자·직업상담사에게 검토 요청]
   ↓
전문가 선택
   ↓
결제
   ↓
현재 지원자료 Snapshot 자동 전달
   ↓
전문가 피드백
```

초기에는 채팅, 견적 경쟁, 복잡한 마켓플레이스 기능이 없어도 된다.

### Phase C — Marketplace
실제 인간검토 거래량이 확인된 뒤 추가한다.

- 전문가 프로필
- 인증
- 검색/추천
- 견적
- 리뷰
- 평점
- 메시지
- 알림
- 정산
- 환불/분쟁
- 요청 공개 및 제안

### Phase D — University / Career Center B2B
- 학생 관리
- 상담사 대시보드
- AI 사전진단
- Human Review
- Before/After 성과
- 프로그램 통계/보고서

---

# 4. 가격 상품 구조 (초안)

가격은 출시 후 실험 가능하나 기능 경계는 유지한다.

| 기능 | QUICK 4,900 | PRO 9,900 | FINAL 14,900 |
|---|---:|---:|---:|
| 자소서/지원서 업로드 | O | O | O |
| 정밀 첨삭 | O | O | O |
| 문장별 피드백 | O | O | O |
| 수정본 | O | O | O |
| Before → After | O | O | O |
| 채용공고 분석 | - | O | O |
| 이력서 분석 | - | O | O |
| 경력기술서/포트폴리오 참고 | - | O | O |
| 공고↔지원서 적합도 | - | O | O |
| 요구역량 자동 추출 | - | O | O |
| 경험↔공고 매칭 | - | O | O |
| 더 적합한 소재 추천 | - | O | O |
| 누락 역량 탐지 | - | O | O |
| 자료 간 모순/확인필요 탐지 | - | O | O |
| 문항 간 경험 중복 | - | O | O |
| 제출 전 최종검수 | - | O | O |
| 맞춤 면접 예상질문 | - | O | O |
| 면접 리스크 분석 | - | O | O |
| 질문별 답변 핵심포인트 | - | O | O |
| 인터랙티브 AI 모의면접 | - | - | O |
| 동적 꼬리질문 | - | - | O |
| 답변 평가/취약질문 재훈련 | - | - | O |

## MVP 출시 우선순위
처음부터 FINAL 전체를 만들 필요 없음.

1. QUICK 핵심
2. PRO 핵심
3. 실제 결제/사용 데이터 확인
4. FINAL 텍스트 모의면접
5. 음성 모의면접
6. Human Review

---

# 5. 사용자 입력 UX 원칙

## 5.1 입력은 최소화

사용자에게 아래 항목을 일일이 작성시키지 않는다.

- 기업명
- 직무명
- 자격요건
- 우대사항
- 자격증
- 대외활동
- 해외경험
- 프로젝트
- 교육
- 경력 등

가능한 것은 문서에서 AI가 자동 추출한다.

## 5.2 PRO 기본 입력 화면

```text
1. 채용공고
   [URL / 파일 / 이미지 / 텍스트]

2. 내가 작성한 지원서
   [HWP / HWPX / PDF / DOCX / 텍스트]

3. 참고자료 (선택)
   [이력서 / 경력기술서 / 포트폴리오 / 기타]

4. AI가 참고할 추가 내용 (선택)
   [자유 입력]

                [전체 분석하기]
```

## 5.3 상세 설정은 접어서 숨긴다

```text
▼ 상세 설정

첨삭 강도
○ 최소 수정
● 자연스럽게 개선
○ 적극 리라이팅

중점 검토
□ 직무 적합성
□ 내용 구체화
□ 논리
□ 표현

글자수
[자동 감지] / 직접 입력
```

**기본 사용자는 상세 설정을 열지 않아도 완전한 결과를 받아야 한다.**

---

# 6. 결과 대시보드

## 6.1 첫 화면은 단순해야 한다

```text
지원서 분석 완료

        82 / 100
       지원서 준비도

직무 적합성       84
문항 충족도       91
경험 구체성       72
설득력            79
기업/공고 맞춤도   68

🔥 가장 먼저 고칠 것
1. 지원동기 기업 맞춤성 부족
2. 성과 근거 부족
3. 2·3번 문항 경험 중복

[최종 수정본 보기]
```

## 6.2 점수는 핵심만

기본:
1. 문항 충족도
2. 경험 구체성
3. 논리/구성
4. 표현/가독성
5. 설득력

PRO 추가:
6. 직무 적합성
7. 기업/공고 맞춤도

**점수는 최대 5~7개.**

다음 항목은 점수화하지 않고 판정/근거로 제공한다.

- 문항 중복
- 자료 간 모순
- 누락 역량
- 예상 면접 리스크
- 더 좋은 경험 추천

## 6.3 합격확률 금지

사용하지 않는다:
- 서류합격 확률 84%
- 최종합격 확률 72%

대신:
- 지원서 준비도
- 지원서 완성도
- 제출 준비 상태

를 사용한다.

---

# 7. 근거 기반 평가

숫자만 보여주지 않는다.

예:

```text
기업/공고 맞춤도: 68

공고 요구사항
✓ 문제해결
✓ 협업
△ 품질경험
✕ 데이터 활용 미반영

근거:
공고에는 데이터 기반 공정 개선 경험이 명시되어 있으나,
현재 지원서에서는 구체적인 데이터 활용 경험이 확인되지 않습니다.

추천 행동:
이력서/경력기술서에 데이터·검사·분석 경험이 있다면
해당 경험을 2번 문항에 연결하는 것을 검토하세요.
```

## 평가 원칙
각 지표는 가능하면 다음 3요소를 가진다.

1. **판정**
2. **근거**
3. **사용자가 취할 다음 행동**

---

# 8. 정확성 / 공정성 설계

## 8.1 결과 종류를 구분한다

### A. 비교적 객관적인 검사
- 글자수
- 기업명 오류
- 직무명 오류
- 문항 누락
- 동일 문장 반복
- 동일 경험 반복
- 자료 간 동일 수치 일치 여부

### B. AI의 정성 평가
- 직무 적합성
- 구체성
- 설득력
- 기업 맞춤도

정성 평가는 반드시 근거를 같이 제공한다.

### C. 사실 여부를 확인할 수 없는 항목
단정하지 않는다.

잘못:
> 이 성과는 허위입니다.

올바름:
> 현재 제공된 이력서/경력기술서에서는 해당 성과 수치를 확인할 수 없습니다. 실제 경험인지 확인이 필요합니다.

## 8.2 AI 경험 날조 금지

AI가 사용자가 제공하지 않은 아래 정보를 사실처럼 추가하지 않는다.

- 숫자
- 매출
- 불량률
- 개선율
- 직책
- 인원
- 기간
- 수상
- 업무
- 프로젝트
- 기업 사실
- 행동/역할

부족하면 질문한다.

```text
추가 정보가 필요합니다.

1. 당시 어떤 문제가 발생했나요?
2. 본인이 직접 수행한 행동은 무엇인가요?
3. 결과가 어떻게 바뀌었나요?
4. 수치로 표현 가능한 결과가 있나요?
```

---

# 9. Before → After

반드시 제공할 것을 권장한다.

| 지표 | 첨삭 전 | 첨삭 후 | 변화 |
|---|---:|---:|---:|
| 직무 적합성 | 61 | 82 | +21 |
| 구체성 | 58 | 79 | +21 |
| 문항 충족도 | 75 | 91 | +16 |
| 기업 맞춤도 | 54 | 73 | +19 |

그리고 이유:

```text
왜 개선됐나요?

+ 경험과 지원 직무의 연결을 명확히 함
+ 본인의 직접 행동을 구체화
+ 반복 표현 제거
+ 성과 근거 강화
- 기업 선택 이유는 아직 보완 필요
```

## 중요한 구현 원칙
작성 AI가 자기 수정안을 스스로 무조건 높게 평가하지 않도록:

```text
원문 평가
   ↓
첨삭 생성
   ↓
동일 Rubric 기반 독립 재평가
   ↓
Before/After 비교
```

평가 기준 버전을 저장한다.

---

# 10. 수정 영향도

가짜 정밀도를 피하기 위해 “예상 +17점”보다 아래를 우선한다.

```text
추천 수정 1
지원기업 선택 이유 구체화

영향도: 높음

영향:
- 기업 맞춤도 ↑
- 문항 충족도 ↑
```

---

# 11. 지원자료 교차검증

PRO의 핵심 차별화 기능.

입력:
- 채용공고
- 이력서
- 자기소개서
- 경력기술서
- 포트폴리오
- 자유입력

예:

```text
자기소개서:
"생산성을 30% 향상시켰습니다."

이력서/경력기술서:
관련 수치 없음

판정:
🟠 확인 필요

설명:
면접에서 개선 수치의 산출 근거와 본인의 실제 기여도를 질문받을 수 있습니다.
```

---

# 12. 더 좋은 경험/소재 추천

지원자가 자소서에 약한 경험을 사용했지만 이력서에 더 좋은 경험이 있다면 추천한다.

```text
현재 사용한 경험
대학 팀 프로젝트

추천 경험
자동차 부품 시험 경험

추천 이유
- 실제 산업현장 경험
- 품질 관련성 높음
- 공고의 문제해결 요구와 직접 연결
```

버튼:
`[추천 경험으로 다시 구성]`

---

# 13. 경험은행 / 내 취업 프로필

MVP 필수는 아니지만 데이터 구조는 고려한다.

```text
나의 경험은행

자동차 생산라인
├ 생산공정
├ 협업
└ 현장대응

시험팀 업무
├ 품질
├ 시험
├ 문제해결
└ 데이터

대학 프로젝트
├ 협업
├ 프로젝트
└ 발표
```

다음 지원 시 기존 경험을 재활용/추천한다.

장기적인 Lock-in의 핵심은 단순 첨삭 이력이 아니라 **사용자의 취업 프로필과 경험 데이터**이다.

---

# 14. 면접 연결

## 14.1 PRO: 예상 면접질문까지 포함

일반 질문 목록만 생성하지 않는다.

나쁜 예:
- 자기소개 해주세요.
- 장점은 무엇인가요?
- 지원동기는?

좋은 예:

```text
예상 질문:
"공정 문제를 개선했다고 했는데 본인이 직접 수행한 역할은 무엇입니까?"

질문이 나오는 이유:
현재 자기소개서에서 팀 전체의 행동과 지원자의 직접 행동이 명확히 분리되지 않습니다.

답변에 포함할 핵심:
- 문제 상황
- 본인의 직접 역할
- 실제 행동
- 결과
- 지원 직무와의 연결
```

## 14.2 면접 리스크 분석

자료 전체에서 면접관이 확인할 가능성이 있는 지점을 찾는다.

- 수치 검증
- 본인 기여도
- 업무 범위
- 이력서↔자소서 표현 차이
- 기업 지원동기
- 경력 공백/전환 설명
- 경험의 실제 연관성

## 14.3 FINAL: 인터랙티브 모의면접

처음에는 **텍스트 기반**으로 구현한다.

```text
AI 질문
↓
사용자 텍스트 답변
↓
답변 분석
↓
이전 답변을 반영한 꼬리질문
↓
재답변
↓
최종 면접 리포트
```

### 나중
텍스트 → 음성

```text
AI 질문
↓
TTS
↓
사용자 마이크 녹음
↓
STT
↓
내용 분석
↓
동적 꼬리질문
```

### 초기에는 제외
- WebRTC 화상통화
- AI 아바타
- 얼굴 표정 점수
- 시선 점수
- “자신감 72점” 같은 근거 약한 지표

---

# 15. 인간 전문가 검토 — 미래 설계

## 15.1 핵심 UX

AI 결과 페이지에서 직접 연결한다.

```text
AI 분석 완료

[최종 수정본]
[상세 분석]

────────────────

전문가의 의견도 확인하고 싶나요?

[현직자 · 직업상담사에게 검토 요청]
```

이 버튼은 별도의 플랫폼으로 단순 이동시키는 것보다, **현재 지원 건을 그대로 검토 요청으로 전환**해야 한다.

## 15.2 사용자는 다시 업로드하지 않는다

```text
공유할 자료

✓ 현재 최종 자기소개서
✓ 채용공고
✓ 이력서
□ 경력기술서
□ 포트폴리오

AI 분석결과 공유
● 공유
○ 공유 안 함

검토 유형
○ 전체 지원서 최종검토
○ 현직자 직무검토
○ 직업상담사 자소서검토
○ 면접 준비

[전문가 선택]
```

## 15.3 전문가에게는 선택한 Snapshot만 전달

절대 기본값으로 사용자의 모든 과거 자료를 보여주지 않는다.

전문가는:
- 공유 승인된 문서
- 해당 시점 문서 버전
- 선택 시 AI 분석 결과
만 본다.

---

# 16. 미래 전문가 플랫폼 모델

두 방식 모두 지원 가능하되 초기 Human Review는 직접 선택형부터.

## A. 크몽형 — 전문가 직접 선택
```text
김OO
자동차 생산관리 현직자
20,000원

[검토 요청]
```

## B. 숨고형 — 검토 요청 후 제안
```text
현대자동차 생산관리
자소서+이력서 검토 요청
희망 예산 20,000원

↓ 전문가 제안

A: 20,000 / 24h
B: 15,000 / 48h
C: 25,000 / 12h
```

## 장기 권장
혼합형:
- 추천 전문가 선택
- 요청 공개 후 제안 받기

단, 숨고형은 상태/알림/견적/취소 로직이 많으므로 나중에 구현한다.

---

# 17. 전문가 Dashboard — 미래

```text
현대자동차 / 생산관리
지원자 김OO

AI 사전진단
지원서 준비도 72

주요 문제
1. 직무 연결 부족
2. 성과 근거 부족
3. 2/3번 경험 중복

AI 확인 권장
- 실제 본인 역할
- 개선 수치 근거
- 데이터 활용 경험

[원문]
[AI 수정본]
[공고]
[이력서]

전문가 코멘트
[                              ]

[검토 완료]
```

AI가 전문가의 반복적인 1차 분석을 대신하고, 사람은 고부가가치 판단에 집중한다.

---

# 18. 대학 / 취업지원센터 B2B — 미래

## 학생 흐름
```text
학생 작성
↓
AI 사전진단
↓
AI 추가질문
↓
학생 수정
↓
AI 재진단
↓
상담사에게 제출
↓
상담사 검토
↓
AI 상담 코멘트 초안
↓
상담사 수정/승인
↓
학생 전달
```

## 상담사 Dashboard
```text
2026 하반기 취업지원 프로그램

참여학생         428
분석 지원서      1,732
최초 평균점수     66.4
최종 평균점수     81.1
평균 개선도       +14.7

주요 보완영역
1. 경험 구체성     61%
2. 직무 연결       47%
3. 기업 맞춤       42%
4. 지원동기        38%
```

## 주의
취업률/합격률 증가를 AI 분석이 원인이라고 자동 주장하지 않는다.
실제 결과 데이터가 있는 경우 별도 통계로 취급한다.

---

# 19. 기술 스택 — 2026-08 기준 권장

## Core
- **Next.js 16.x / App Router**
- **TypeScript (strict)**
- **Node.js 24 LTS**
- React (Next.js에서 관리)
- Tailwind CSS
- shadcn/ui 계열 컴포넌트 사용 가능

## Backend / Data
- **Supabase PostgreSQL**
- Supabase Auth
- Supabase Storage
- PostgreSQL Row Level Security (RLS)

## AI
- **OpenAI Responses API**
- Structured Outputs / JSON Schema
- 파일 입력은 지원 형식에 한해 OpenAI file input 활용
- 모델명은 코드에 하드코딩하지 않고 환경변수/설정으로 관리

예:
```env
OPENAI_ANALYSIS_MODEL=gpt-5.6-terra
OPENAI_PREMIUM_MODEL=gpt-5.6-sol
```

실제 모델 선택은 대표 데이터셋 평가(evals) 후 결정한다.

## 왜 이 구조인가
초기에는:
```text
Next.js
├ UI
├ Server Actions / Route Handlers
├ OpenAI orchestration
└ Supabase integration
```

별도 NestJS/Express/Python AI 서버/Redis/Kafka/Microservice를 처음부터 만들지 않는다.

트래픽과 긴 AI 작업이 실제로 문제가 될 때:
```text
Next.js
   ↓
Job Queue
   ↓
AI Worker / Document Worker
```
로 분리한다.

---

# 20. 현재 기술 기준 메모

2026-08-15 확인 기준:

- Next.js 공식 문서 최신 버전은 16.3.1.
- Node.js는 v26이 Current, v24(Krypton)가 LTS. Production은 LTS 사용 권장.
- OpenAI는 Responses API를 직접 모델 요청의 중심 인터페이스로 제공.
- Structured Outputs는 JSON Schema 준수를 보장하는 용도로 적합.
- Supabase Auth + RLS, Storage + RLS 조합으로 사용자/문서 권한 설계 가능.

**버전은 시간이 지나면 달라질 수 있으므로 설치 시 Codex가 공식 문서를 다시 확인한다.**

---

# 21. 프로젝트 아키텍처 원칙

## Modular Monolith

초기에는 하나의 Next.js 앱.

```text
src/
  app/
    (public)/
    dashboard/
    api/

  modules/
    auth/
    users/
    applications/
    documents/
    candidate-profile/
    analysis/
    ai/
    billing/
    reviews/

    # 미래
    marketplace/
    organizations/
    interviews/

  lib/
    openai/
    supabase/
    validation/
    security/
```

### 하지 말 것
- route.ts 한 파일에 AI/DB/검증/결제 로직 수천 줄
- 화면 컴포넌트에서 직접 OpenAI 호출
- 브라우저에 OpenAI API key 노출
- `users.role = candidate` 하나로 역할 고정
- 자소서 문자열 하나와 AI 결과 문자열 하나만 저장

---

# 22. 핵심 도메인 모델

## 22.1 Application Case

“자소서 한 편”이 아니라 “특정 채용공고에 지원하는 하나의 지원 건”이 중심.

예:
```text
Application Case
현대자동차 / 생산관리 / 2026 하반기
```

이 안에:
- 채용공고
- 이력서
- 자기소개서
- 경력기술서
- 포트폴리오
- 추가 정보
- AI Review
- 향후 Human Review
- 면접 준비
가 연결된다.

## 22.2 Document
모든 자료를 공통 Document 개념으로 관리.

document_type 예:
- job_posting
- resume
- cover_letter
- career_description
- portfolio
- certificate
- additional_info
- other

## 22.3 Document Version
문서 수정 때 기존 데이터를 덮어쓰지 않는다.

```text
자소서 v1
↓ AI 첨삭
자소서 v2
↓ 인간 검토
자소서 v3
```

## 22.4 Submission Snapshot
특정 분석/검토 시점에 사용한 문서 버전 묶음.

```text
Snapshot #4

job_posting v1
resume v2
cover_letter v4
career_description v1
additional_info v3
```

AI와 인간 전문가 모두 Snapshot을 검토한다.

## 22.5 Review
장기적으로:

```text
Review
├ AI Review
└ Human Review
```

같은 상위 개념으로 볼 수 있게 한다.

---

# 23. MVP 권장 DB 테이블

정확한 SQL은 Codex가 구현 단계에서 migration으로 작성한다.

## 필수
```text
profiles
application_cases
documents
document_versions
submission_snapshots
snapshot_documents
candidate_facts
analysis_runs
analysis_results
orders
order_items
entitlements
```

## 미래
```text
reviewer_profiles
review_requests
review_offers
review_assignments
human_reviews
review_comments
messages
payouts

organizations
organization_memberships
programs

interview_sessions
interview_turns

audit_logs
```

---

# 24. 사용자와 역할 분리

잘못된 설계:
```text
users.role = "candidate"
```

한 사용자가:
- 구직자이면서
- 나중에 현직자 검토자일 수도 있고
- 특정 대학의 상담사일 수도 있다.

따라서:
```text
auth.users = identity

profiles = 개인 프로필

reviewer_profiles = 전문가 프로필

organizations = 대학/기관
organization_memberships = 기관 내 역할
```

처럼 역할과 identity를 분리한다.

---

# 25. 문서 접근 / 개인정보 원칙

지원서에는 민감한 개인정보가 포함될 수 있다.

## 원칙
- 모든 원본 문서는 기본 private
- Storage public bucket 금지
- RLS 적용
- 사용자 본인만 기본 접근
- 인간검토 시 사용자가 명시적으로 공유 범위 선택
- 전문가는 Review Request에 연결된 Snapshot만 접근
- signed URL은 짧은 만료시간 사용
- service role key는 서버 전용
- API 응답/로그에 원문 전체를 불필요하게 남기지 않는다.
- 계정/문서 삭제 흐름을 초기부터 고려한다.

---

# 26. 파일 처리

## 원본 보존 + 내부 정규화

```text
resume.pdf / resume.docx / resume.hwp
         ↓
Private Storage
         ↓
Document Adapter
         ↓
Normalized Document
         ↓
AI Analysis
```

Normalized Document 예:
```json
{
  "documentType": "resume",
  "rawText": "...",
  "sections": [],
  "metadata": {}
}
```

## HWP / HWPX
OpenAI 공식 File Input에서 일반적인 PDF/DOCX 등은 처리할 수 있으나,
HWP/HWPX는 별도 파싱/변환 어댑터를 두는 것을 전제로 설계한다.

초기 구현 선택:
1. HWPX 우선 파싱
2. HWP는 서버 측 변환/파서 도입 검토
3. 파싱 실패 시 사용자에게 PDF/DOCX 변환 요청
4. 원본은 항상 보존

**HWP 지원을 AI 분석 로직과 강결합하지 않는다. `Document Adapter`로 격리한다.**

---

# 27. AI 파이프라인

버튼은 1개여도 내부는 단계화한다.

```text
1. 파일/입력 정규화
2. 문서 종류 확인
3. 채용공고 구조 추출
4. 지원자 Facts/경험 추출
5. 자기소개서 문항 분리
6. 공고 요구역량 ↔ 경험 매칭
7. 원문 평가
8. 문제/리스크 탐지
9. 개선 전략 생성
10. 수정안 생성
11. 동일 Rubric 기반 독립 재평가
12. Before/After 계산
13. 면접 리스크/질문 생성
14. Dashboard Structured JSON 생성
```

모든 단계를 반드시 별도 API call로 만들 필요는 없다.
품질/비용/latency를 eval로 측정한 뒤 합칠 단계와 분리할 단계를 정한다.

---

# 28. AI 결과는 Structured Data로 저장

절대 아래처럼만 저장하지 않는다.

```text
result = "전체적으로 잘 작성하셨지만..."
```

권장 형태:

```json
{
  "overallReadiness": 82,
  "scores": {
    "questionFit": 91,
    "specificity": 72,
    "logic": 84,
    "readability": 87,
    "persuasiveness": 79,
    "jobFit": 84,
    "postingFit": 68
  },
  "strengths": [],
  "priorityIssues": [],
  "jobRequirements": [],
  "missingRequirements": [],
  "experienceMatches": [],
  "crossDocumentRisks": [],
  "revisionImpact": [],
  "beforeAfter": {},
  "interviewRisks": [],
  "interviewQuestions": [],
  "revisedSections": []
}
```

TypeScript + Zod + OpenAI Structured Outputs schema를 최대한 단일 소스로 유지한다.

---

# 29. Analysis Run 재현성

`analysis_runs`에 최소 다음을 기록한다.

```text
id
application_case_id
snapshot_id
analysis_type
status

model
reasoning_config
prompt_version
rubric_version
schema_version

started_at
completed_at

input_tokens
output_tokens
estimated_cost

error_code
```

이유:
- 모델 변경
- Prompt 개선
- Rubric 변경
- Before/After
- 대학 B2B 통계
- 문제 발생 시 재현

---

# 30. AI 모델 전략

모델을 제품 로직에 하드코딩하지 않는다.

예:
```text
EXTRACTION_MODEL
ANALYSIS_MODEL
PREMIUM_MODEL
INTERVIEW_MODEL
```

초기 기준:
- 단순 추출/분류: 비용 효율 모델 검토
- 핵심 평가/첨삭: 품질 중심 모델
- 가장 어려운 Premium 단계: frontier 모델 필요 여부 eval

**“비싼 모델 = 항상 더 좋은 서비스”로 가정하지 않는다.**

대표 자소서 데이터셋으로:
- 정확성
- 근거성
- 경험 날조율
- 자연스러움
- 직무 연결
- 비용
- latency
를 비교한다.

---

# 31. Evals / 품질검증

출시 전 최소 30~100개의 대표 테스트 케이스를 준비한다.

범주:
- 신입
- 경력
- 생산/품질
- 사무
- IT
- 영업
- 서비스
- 연구
- 내용 부족
- 과장된 성과
- 공고와 무관한 자소서
- 동일 경험 반복
- 자료 간 충돌

검사:
1. 문항 요구를 제대로 찾는가
2. 없는 사실을 만들지 않는가
3. 공고 근거를 정확히 연결하는가
4. 더 좋은 경험 추천이 합리적인가
5. 수정본이 사용자의 경험을 왜곡하지 않는가
6. 원문↔수정본 독립평가가 일관적인가
7. 면접 질문이 실제 제출자료에 근거하는가

---

# 32. 결제/상품 권한

`plan = pro` 하나로 사용자 테이블에 박지 않는다.

권장:
```text
products
orders
order_items
entitlements
```

Entitlement 예:
```text
QUICK_ANALYSIS
PRO_ANALYSIS
AI_INTERVIEW
HUMAN_REVIEW
```

향후 가격을 바꾸거나 상품을 묶어도 DB 구조를 유지할 수 있다.

---

# 33. 향후 Human Review 데이터 흐름

```text
Application Case
      ↓
Submission Snapshot
      ↓
AI Review
      ↓
User clicks Human Review
      ↓
Review Request
      ↓
Reviewer Assignment
      ↓
Human Review
```

**Review Request는 문서를 복제하는 것이 아니라 Snapshot을 참조한다.**

---

# 34. 전문가 추천

향후 사용자 지원 데이터에서 전문가를 추천할 수 있다.

매칭 정보:
- 기업
- 산업
- 직무
- 신입/경력
- 검토 목적
- 전문가 현직/전직 기업
- 전문직무
- 경력
- 자격/검증 상태
- 응답속도
- 후기

초기에는 AI 기반 복잡한 추천보다 필터 기반 추천으로 충분하다.

---

# 35. B2B 확장을 위한 데이터 활용

같은 `analysis_results` 데이터를 다른 UI로 보여준다.

학생:
```text
내 점수
내 문제
수정안
면접질문
```

상담사:
```text
학생 현황
평균 개선도
주요 부족영역
상담 필요 학생
```

별도의 AI 엔진을 만들지 않는다.

---

# 36. 초기 MVP 화면

## Public Landing
- 핵심 문구
- QUICK / PRO 비교
- 사용 방법 3단계
- 샘플 결과
- 결제 CTA
- 기존 AI와 차이 설명

## Analyze
```text
AI 자소서 정밀 첨삭

[파일 업로드]
또는
[직접 입력]

[AI 분석하기]
```

## PRO Analyze
```text
채용공고
[업로드/입력]

지원서
[업로드/입력]

참고자료 (선택)
[업로드]

추가정보 (선택)
[입력]

[전체 분석]
```

## Result
- 요약 점수
- 최우선 문제 3개
- 상세 지표
- 공고 매칭
- 리스크
- Before/After
- 수정본
- 예상 면접질문

---

# 37. UI 원칙

- 데스크톱 + 모바일 반응형
- “AI 서비스” 느낌보다 신뢰성 있는 취업/전문 서비스 느낌
- 흰색 바탕 + 적은 강조색
- 카드 남발 금지
- 과도한 그라데이션/유리효과 금지
- 점수만 화려하게 보여주는 게임화 금지
- 결과의 근거를 읽기 쉽게
- 중요한 행동 1~3개를 항상 상단에
- 긴 결과는 접기/탭으로 Progressive Disclosure

---

# 38. MVP에서 만들지 않을 것

- 전문가 Marketplace 전체
- 전문가 채팅
- 전문가 견적 경쟁
- 정산/환불/분쟁 시스템
- 대학 관리자
- WebRTC
- 영상 AI 아바타
- 표정/시선 분석
- 합격확률
- AI 탐지율
- MBTI식 자소서 성격분석
- 모든 사용자가 직접 작성해야 하는 거대한 경력 프로필 폼
- Microservices
- Kafka/Kubernetes
- 별도 Python AI 서버 (필요가 검증되기 전)

---

# 39. Analytics

처음부터 이벤트 이름을 정리한다.

예:
```text
landing_viewed
pricing_viewed
analysis_started
document_uploaded
analysis_completed
result_viewed
revision_viewed
interview_questions_viewed
checkout_started
purchase_completed
reanalyze_started

# 미래
human_review_cta_clicked
review_request_created
reviewer_selected
human_review_completed
```

핵심 퍼널:
```text
Landing
→ Analyze Start
→ Analysis Complete
→ Result View
→ Payment
→ Reanalysis
→ 다른 공고 재사용
```

장기적으로 Human Review CTA 전환율을 본다.

---

# 40. 성공지표

단순 회원 수보다 중요:

- 실제 분석 완료 사용자
- 결제전환율
- 7/30일 재방문
- 다른 공고로 두 번째 분석한 비율
- 수정본 열람률
- 면접질문 열람률
- Before/After 재분석률
- 환불률
- 분석 오류율
- AI 경험 날조 신고율

향후:
- Human Review CTA
- Human Review 구매전환
- 전문가 재구매율

---

# 41. Domain / DNS 운영 권장

## 당장 추천
**등록기관(Registrar)은 Namecheap에 잠시 둔 채 DNS만 Cloudflare로 먼저 이동한다.**

장점:
- Cloudflare Dashboard에서 DNS/Proxy/보안 관리 가능
- 등록기관 이전보다 작업이 간단
- 나중 Cloudflare Registrar로 이전할 때도 어차피 먼저 Cloudflare DNS가 Active여야 함

## DNS 이전
1. Cloudflare에 도메인 추가
2. 기존 DNS 레코드 확인/복사
3. Namecheap에서 nameserver를 Cloudflare가 지정한 NS로 변경
4. Cloudflare zone이 Active가 될 때까지 확인
5. 서비스 정상작동 확인

### DNSSEC가 Namecheap에서 활성화되어 있다면
nameserver 변경 전에 기존 DNSSEC/DS record를 해제하고 전파시간을 고려한다.

## 등록기관 자체도 Cloudflare Registrar로 이전하려면
일반적인 조건:
- 등록 후 60일 이상
- 최근 60일 내 registrar transfer가 없을 것
- registrant 주요 정보 변경으로 60일 lock이 걸리지 않았을 것
- Cloudflare 계정 이메일 인증
- 결제수단
- Cloudflare DNS Full Setup/Active

절차:
1. Cloudflare DNS를 먼저 Active
2. Namecheap → Domain List → Manage → Sharing & Transfer
3. Transfer Out에서 Domain Unlock
4. Auth/EPP Code 요청
5. Cloudflare Registrar → Transfer Domains
6. Auth Code 입력
7. 이전 비용 결제
8. Namecheap에서 transfer 승인 요청이 오면 승인
9. 완료 확인

주의:
- Cloudflare Registrar를 쓰는 동안 authoritative DNS는 Cloudflare를 사용해야 한다.
- TLD별 이전 규칙은 다를 수 있다.
- 이전 전에 현재 DNS records를 수동으로 한 번 확인한다.

---

# 42. ChatGPT 대화 링크 vs 이 문서

Codex에게 **이 ChatGPT 대화 링크만 던지는 방식은 권장하지 않는다.**

이유:
- 링크 접근 여부에 따라 실패 가능
- 너무 긴 대화에서 결정사항과 브레인스토밍이 섞임
- 나중에 어느 내용이 최신 결정인지 모호
- Codex가 구현 중 불필요한 아이디어까지 MVP에 넣을 수 있음

## 권장
이 파일을 `PROJECT_SPEC.md`로 repository root에 둔다.

```text
PROJECT_SPEC.md = 제품/기술의 기준
AGENTS.md       = Codex의 개발 행동 규칙
```

대화 링크는 필요하면 `docs/context.md`에 참고자료로만 기록하고,
**충돌할 경우 PROJECT_SPEC.md가 우선**이라고 명시한다.

---

# 43. 최초 개발 준비 — Windows / PowerShell 예시

## 43.1 Node 확인

Node production은 LTS를 사용.

```powershell
node -v
npm -v
```

Node가 없다면 Node.js 24 LTS 설치 후 진행.

## 43.2 Next.js 프로젝트 생성

```powershell
mkdir mooaresume
cd mooaresume

npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

질문이 나오면:
- TypeScript: Yes
- ESLint: Yes
- Tailwind: Yes
- `src/`: Yes
- App Router: Yes

## 43.3 Git checkpoint

```powershell
git init
git add .
git commit -m "chore: bootstrap project"
```

## 43.4 핵심 패키지

```powershell
npm install openai zod @supabase/supabase-js @supabase/ssr
```

UI를 시작할 때:
```powershell
npx shadcn@latest init
```

패키지는 한꺼번에 많이 넣지 않는다. 기능 구현 시 필요한 것만 설치한다.

---

# 44. Codex CLI 설치/실행

npm 방식:

```powershell
npm install -g @openai/codex
```

실행:
```powershell
codex
```

첫 실행 시 ChatGPT 로그인 등을 선택한다.

Codex 내 권장 확인:
```text
/status
/model
/permissions
```

프로젝트 root에서:
```text
/init
```

으로 `AGENTS.md`를 생성할 수도 있으나,
본 repository에서는 제공된 `AGENTS.md`를 기준으로 사용한다.

---

# 45. Codex에 처음 줄 Prompt

## Step 1 — 구현하지 말고 설계 검토부터

```text
Read PROJECT_SPEC.md and AGENTS.md completely.

Do not implement anything yet.

Act as the lead engineer for this product.
Audit the spec for:
1. contradictions,
2. missing MVP requirements,
3. over-engineering,
4. security/privacy risks,
5. data-model problems that would block future Human Review or university B2B,
6. assumptions that should remain configurable.

Then produce:
- the exact Phase 1 MVP scope,
- proposed repository structure,
- database entity/relationship plan,
- first implementation milestones in dependency order,
- open risks.

Respect the rule that the initial product must remain simple. Do not implement marketplace, university, WebRTC, video interview, or other future-only features.
```

## Step 2 — Foundation 구현

검토 결과가 합리적이면:

```text
Implement only the Phase 1 foundation from PROJECT_SPEC.md.

Requirements:
- Next.js App Router + strict TypeScript
- clean modular-monolith structure
- Supabase server/client setup
- environment validation
- base auth-ready structure
- core domain TypeScript schemas for ApplicationCase, Document, DocumentVersion, Snapshot, AnalysisRun, AnalysisResult
- no marketplace code
- no university code
- no interview implementation yet
- no fake/mock production integrations

Add tests for pure domain/schema code where useful.
Run lint, typecheck, and tests.
Summarize all changed files and any decisions that differ from PROJECT_SPEC.md.
```

## Step 3 — Database

```text
Design and implement the first Supabase migrations for the MVP described in PROJECT_SPEC.md.

Before writing SQL:
- show the proposed schema and relationships,
- identify tables that are truly needed now versus future-only,
- keep future marketplace tables out of the migration.

Implement RLS from the beginning.
A user must not be able to read another user's application cases or documents.

Do not expose service-role credentials to browser code.
After implementation, explain each RLS policy.
```

## Step 4 — AI pipeline

```text
Implement the MVP AI analysis architecture from PROJECT_SPEC.md using the OpenAI Responses API and Structured Outputs.

Important:
- do not put OpenAI API keys in client code,
- schema must be shared through TypeScript/Zod where practical,
- do not hardcode a model throughout the codebase; use configuration,
- never invent candidate achievements, numbers, job titles, or facts,
- distinguish objective checks, AI judgments, and "needs verification",
- persist prompt_version, rubric_version, schema_version, and model in analysis_runs,
- design the code so original evaluation and revised-text evaluation can be run independently.

Start with a deterministic, testable analysis contract before polishing prompts.
```

## Step 5 — UI

```text
Build the MVP analysis UI described in PROJECT_SPEC.md.

Design priorities:
- simple input,
- professional Korean employment-service feel,
- mobile responsive,
- no visual clutter,
- no excessive cards/gradients,
- show the top 3 actionable issues first,
- use progressive disclosure for detailed analysis,
- do not show fake success probability.

For the first pass, implement:
1. landing,
2. upload/input screen,
3. analysis loading state,
4. result dashboard using typed sample data.

Do not connect AI until the result UI is stable.
```

---

# 46. Codex 작업방식

복잡한 기능을 한 프롬프트로 전부 시키지 않는다.

권장 루프:

```text
1. 계획
2. 작은 범위 구현
3. lint/typecheck/test
4. /review
5. git diff 확인
6. commit
7. 다음 단계
```

Git checkpoint를 자주 만든다.

예:
```powershell
git add .
git commit -m "feat: add application document domain model"
```

다음:
```powershell
git add .
git commit -m "feat: add analysis result schema"
```

큰 작업 하나에 파일 수십 개를 무작정 수정하도록 두지 않는다.

---

# 47. MVP 개발 순서 권장

## M0 — Repository / Architecture
- Next.js
- TypeScript strict
- Supabase 연결
- env validation
- 기본 UI shell
- error handling conventions

## M1 — Document Input
- 직접 입력
- PDF/DOCX 등 업로드
- private storage
- document/version model
- normalized document

## M2 — QUICK AI Analysis
- 분석 schema
- OpenAI Responses API
- 기본 5개 지표
- priority issues
- 문장 피드백
- 수정본
- result dashboard

## M3 — Before/After
- 원본 평가
- 수정본 독립 평가
- 변화 근거

## M4 — PRO
- 채용공고
- 이력서/경력자료
- requirements extraction
- experience matching
- missing requirements
- cross-document risks
- final checklist

## M5 — Interview Bridge
- personalized interview questions
- interview risk
- answer key points

## M6 — Billing
- QUICK/PRO entitlement
- purchase → analysis access
- retry/failed-analysis policy

## M7 — Retention
- application history
- saved experience facts
- re-analysis
- second-company flow

## 이후
- FINAL text interview
- Human Review
- Marketplace
- B2B

---

# 48. 초기 Human Review를 붙이는 시점

기능을 미리 만들지 않는다.

검토 기준 예:
- 월 AI 분석 사용자 수가 충분히 늘어남
- “사람에게 검토받고 싶다” CTA 클릭이 반복적으로 발생
- 실제 결제 의사가 확인됨
- 현직자/직업상담사 소수 공급을 수동으로 확보 가능

그때 최소 Human Review:

```text
Result
↓
[전문가 검토]
↓
전문가 선택
↓
결제
↓
Snapshot 공유
↓
전문가 코멘트
↓
완료
```

이것만 먼저 만든다.

---

# 49. 중요한 제품 차별점 요약

우선순위 순:

1. **공고 + 지원자 자료 전체를 함께 봄**
2. **근거 기반 분석**
3. **더 적합한 경험/소재 추천**
4. **자료 간 교차검증/리스크**
5. **Before → After**
6. **최종 제출검수**
7. **실제 자료 기반 면접질문**
8. **경험은행/지원 프로젝트 누적**
9. **AI 결과에서 인간 전문가로 원클릭 handoff**
10. **대학 상담사가 활용할 수 있는 동일 데이터 구조**

---

# 50. 서비스가 성공했을 때의 최종 그림

```text
                   MOOA Career (미래)
                         │
                   MOOA Resume
                         │
                ┌────────┴────────┐
                │                 │
             AI Layer         Human Layer
                │                 │
        공고/지원서 분석       현직자
        경험 매칭              직업상담사
        첨삭                  HR/전문가
        면접 준비               │
                └────────┬────────┘
                         │
                  Application Case
                         │
             개인 / 전문가 / 대학 B2B
```

AI와 인간 플랫폼은 별개의 사업이 아니라,
**AI가 수요와 데이터를 먼저 만들고 인간 전문가가 고부가가치 판단을 이어받는 하나의 파이프라인**으로 본다.

---

# 51. 출시 전 최종 체크

- [ ] MVP에 미래 Marketplace 기능이 섞이지 않았는가
- [ ] 사용자는 자소서 하나만으로도 QUICK을 사용할 수 있는가
- [ ] PRO는 채용공고 + 지원자료를 최소 입력으로 분석하는가
- [ ] 모든 AI 점수에 근거가 있는가
- [ ] AI가 없는 경험/수치를 만들지 않는가
- [ ] “확인 필요”와 “오류”를 구분하는가
- [ ] 합격확률을 표시하지 않는가
- [ ] 원본 문서는 private인가
- [ ] RLS가 적용되었는가
- [ ] AI key/service role key가 browser에 노출되지 않는가
- [ ] 분석 시 사용된 Snapshot이 남는가
- [ ] prompt/rubric/schema/model version이 기록되는가
- [ ] AI 결과가 typed structured data인가
- [ ] 실패 분석의 재시도 정책이 있는가
- [ ] 개인정보 삭제가 가능한가
- [ ] 모바일에서도 결과를 읽기 쉬운가
- [ ] 사용자에게 가장 중요한 수정 3개가 먼저 보이는가

---

# 52. Source of Truth Rule

이 프로젝트에서 우선순위:

1. 실제 사용자 안전/개인정보/보안
2. `PROJECT_SPEC.md`
3. `AGENTS.md`
4. 현재 구현 및 테스트
5. 과거 ChatGPT 대화/브레인스토밍

과거 대화와 이 문서가 충돌하면 **이 문서가 우선**이다.

단, Codex가 최신 공식 문서와 명백히 충돌하는 기술 세부사항을 발견하면:
1. 최신 공식 문서를 확인하고,
2. 변경 이유를 설명하고,
3. spec의 관련 항목도 함께 수정한다.
