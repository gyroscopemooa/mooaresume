# 다음에 할 일 (2026-09-12 세션 마무리 인수인계)

작성: 2026-09-12 · Claude
목적: 이 세션(Google Play Billing → TWA 앱 → FINAL 모의면접 → AI 심층해설)에서 남긴
미완료 항목을 다음 세션이 한 문서만 보고 이어갈 수 있게 정리.

---

## 0. 붙여넣을 명령문

```
docs/handoff-2026-09-12-session-wrapup.md 를 읽고 우선순위대로 진행해줘.
다른 에이전트(코덱스)가 작업 중인 법률(legal) 쪽 미커밋 변경은 건드리지 말고 보존해줘.
docs/agent-change-log.md 에 변경 기록 남기는 거 잊지 말고.
```

---

## 현재 git 상태 (이 문서 작성 시점)

같은 작업트리에 **이 세션이 만든 것**과 **코덱스가 만든 것(법률/legal)**이 섞여서
uncommitted 상태로 남아 있음. 절대 한 번에 `git add -A` 하지 말 것.

- **이 세션 것 (career AI 심층해설)**: `src/components/career-ai-preparation.*`,
  `src/domain/builder-pricing.ts`, `src/domain/career-ai-contract.ts`,
  `src/domain/career-assessment.ts`, `src/server/document-builds/products.ts`,
  `src/app/api/career-ai-builds/`, `src/server/ai/career-interpretation/`,
  `src/server/career/career-ai-request-builder*`,
  `supabase/migrations/20260912030000_career_ai_builds.sql`
- **코덱스 것 (법률 디자인)**: `src/app/legal/*`, `src/components/legal-*`,
  `docs/legal-launch-review-2026-09-12.md`, `docs/development-checkpoint-2026-09-07.md`
  — 이건 손대지 말 것. 자세한 건 `docs/development-checkpoint-2026-09-07.md`가 코덱스
  쪽 인수인계 문서.
- `docs/agent-change-log.md`는 두 작업 다 걸쳐 있으니 공용으로 계속 누적.

---

## 1. 🟡 AI 심층해설(`/career/ai`) — 코드는 끝났고 검증·커밋이 안 됨

09-12에 이 세션이 처음부터 끝까지 새로 만듦. 전엔 화면에 "현재는 결제·AI 호출이
진행되지 않습니다"라고 써 있는 순수 목업이었는데, 이제 실제 결제(Polar)+AI 생성이
연결됨. 검사 점수만으로 해설하는 기본 흐름 + 이력서·자소서·공고 텍스트를 선택적으로
붙여넣는 입력란까지 다 만듦.

**남은 것, 순서대로:**

1. `RUN_LIVE_EVAL=1`로 실제 OpenAI 호출 최소 1번 — 특히 이력서/자소서 텍스트를 채운
   경우와 빈 경우 둘 다. 모의면접 때(`interview-live-eval.live.test.ts`) 실제로 버그를
   하나 잡았던 전례가 있음 — 코드 리뷰만으로는 프롬프트가 실제로 잘 작동하는지 모름.
   `src/server/ai/career-interpretation/career-interpretation-gateway.ts`가 대상.
2. DB는 이미 push 완료(`career_ai_builds` 테이블 원격에 있음). Polar 상품도 사용자가
   이미 만들어 둠(`polar_c_test`=단일 5,900원, `polar_3_all_test`=종합 9,900원, Cloudflare
   변수로도 확인됨). **코드만 커밋하면 됨** — 위 "현재 git 상태" 목록의 career AI 파일만
   골라서 커밋(legal 파일 섞지 말 것).
3. 브라우저에서 결제 1건 처음부터 끝까지: `/career/ai?scope=work_style`(또는 다른
   scope) → 결제 버튼 → Polar 결제창 → 돌아옴 → 자동으로 AI 해설 생성 → 화면에 표시.
   이력서 텍스트 채운 채로 한 번, 안 채운 채로 한 번 둘 다 확인.
4. 나머지 검사 캐릭터 이미지(work_style/work_values 쪽, interest만 ISA 캐릭터 이미지
   있음) — **사용자가 나중에 이미지 자산을 준다고 했음. 이건 이 세션이 만들 일이
   아니고 대기.** `career-ai-sample-overview.tsx`의 `scope === "interest"`로 감싼
   캐릭터 카드 섹션이 그 자리.
5. (선택) Google Play(TWA 앱) 결제 경로는 안 만듦 — 웹에서 먼저 검증되면 모의면접
   재시도 결제(`interview-retry-checkout.ts` + `google-play-checkout.ts`의
   `getInterviewRetryGooglePlayConfig` 패턴)와 같은 방식으로 나중에 추가.

세부 설계 이유는 `docs/agent-change-log.md`의 2026-09-12 항목 두 개("AI 심층해설
실제 결제+AI 생성 연결" / "이력서·자소서·공고 텍스트 입력란 추가")를 보면 됨.

---

## 2. 🔴 TWA 앱 하단 퀵바 — 요청만 받고 아예 시작을 못 함

사용자 요청: "앱에서 하단에 퀵바 만들어야할듯 ... 3개라면 뒤로가기·홈·데스크톱버전으로보기
버튼이면될듯". `src/app/layout.tsx`를 열어만 보고 다른 작업으로 넘어감 — **코드
한 줄도 안 씀.**

- 뒤로가기 / 홈: TWA(Trusted Web Activity) 안에서 표준 웹 API로 가능
  (`window.history.back()`, `location.href="/"`). 단 이게 TWA 네이티브 UI의 일부인지
  웹페이지 안의 고정 바인지 먼저 결정 필요 — 웹페이지 안이면 모든 브라우저에서도
  보이므로 "TWA(standalone display-mode)일 때만 보이기"를 `window.matchMedia
  ('(display-mode: standalone)')` 같은 걸로 감지해야 함.
- "데스크톱버전으로 보기": 사용자 의도는 모바일 UI가 설명이 많아 복잡해 보이니
  PC 레이아웃을 강제로 렌더링하는 토글로 추정(대화 중 "모바일에선 pc는 ㄱㅊ고" 언급).
  구현 방법 후보: (a) viewport meta를 강제로 넓게 바꾸고 모바일 전용 CSS를 우회,
  (b) 별도 "데스크톱 강제" 클래스를 `<html>`에 붙이고 CSS media query 대신 그 클래스
  기준으로 분기하도록 스타일 리팩터(범위가 큼). 어느 쪽이든 시작 전에 사용자에게
  범위 확인 필요 — 이 세션에서 방향을 정한 적이 없음.
- 앱 저장소는 `C:\6.mooaresume-android`(별도 git repo). 퀵바가 TWA 네이티브 쪽이면
  그 repo의 `twa-manifest.json`/빌드도 손대야 함. 웹페이지 쪽 고정 바면 이 repo만.

---

## 3. 🟡 Google Play Billing (QUICK/PRO/FINAL 사다리) — 코드는 있는데 설정이 없음

`docs/agent-change-log.md`의 Google Play Billing 항목대로 코드는 완성돼 있지만:

- `.env.local`에 `NEXT_PUBLIC_GOOGLE_PLAY_{TIER}_PRODUCT_ID` /
  `NEXT_PUBLIC_GOOGLE_PLAY_{TIER}_EXTRA_{1,2,3}_PRODUCT_ID` 계열이 **전부 비어 있음**
  (사용자 쪽 확인 필요 — 이 세션에서 두 번 확인했는데 둘 다 없었음).
- Play Console에 실제 상품(기본+글자수 추가블록 사다리)이 만들어졌는지도 미확인.
- 이게 없으면 TWA 앱에서 결제 버튼을 눌러도 상품을 못 찾아 실패함.
- 사용자 몫: Play Console 로그인, 상품 생성, env 값 채우기 — Claude는 대시보드
  접근 권한 없음.

## 3-1. 🟡 모의면접 유료 재시도 — Google Play 쪽 상품 없음

`GOOGLE_PLAY_INTERVIEW_RETRY_PRODUCT_ID` / `NEXT_PUBLIC_GOOGLE_PLAY_INTERVIEW_RETRY_PRODUCT_ID`
둘 다 미설정. Polar 쪽(`POLAR_INTERVIEW_RETRY_PRODUCT_ID`)은 설정 확인됨(2026-09-12
Cloudflare 배포 로그에 값 보임). 3,000원 상품을 Play Console에 만들어야 함.

## 4. 🟡 App Signing 키 지문 — 앱을 Play Console에 처음 올린 뒤 해야 함

`C:\6.mooaresume-android\README.md`에 적혀 있음. 지금 서명한 APK/AAB로 처음 업로드하면
Google Play App Signing이 자체 서명키로 다시 서명하는데, 그 키의 SHA-256 지문을
`public/.well-known/assetlinks.json`의 `sha256_cert_fingerprints` 배열에 **추가**해야
TWA가 신뢰된 상태(주소창 없는 풀스크린)로 뜸. 아직 Play Console에 앱을 올린 적이
없어서(파악한 바로는) 이 단계 자체가 아직 도달 전.

## 5. 🟢 FINAL 모의면접 — 코드·live eval은 끝났는데 브라우저 실결제 E2E 미완료

09-12 이전에 이미 한 번 완성됐고 POLAR_SERVER도 production으로 전환됨(사용자가 직접).
**남은 건 딱 하나**: 실제 브라우저에서 FINAL 결제 1건을 처음부터 끝까지(결제 → 분석 →
결과 화면 → 모의면접 탭 → 턴 진행 → 리포트) 돌려본 적이 아직 없음. AI 호출 계층은
live eval로 검증됐지만 결제~DB~UI 전체 연결은 미검증.

## 6. 🟢 모바일 UI 밀도 정리 — 별개 과제로 명시적으로 미룸

세션 초반에 "앱으로 보니 설명이 많아 난잡하다"는 언급이 있었고, 탭을 늘리는 것 자체를
피하진 않기로 했음(FINAL 모의면접 탭 추가 시 "탭 하나 늘어나는 것 자체를 이유로
통합형을 고르지 않음"이라고 결정). 실제 정리 작업은 시작한 적 없음. 우선순위 낮음.

---

## 우선순위 제안

1. AI 심층해설 — live eval → 커밋 (거의 다 됨, 제일 빨리 끝남)
2. FINAL 모의면접 브라우저 E2E — 사용자가 직접 결제 1건 해보는 게 제일 확실
3. TWA 퀵바 — 방향(네이티브 vs 웹페이지 고정 바, 데스크톱 강제 방식) 먼저 사용자와
   정하고 시작
4. Google Play 상품/env 설정 — 전적으로 사용자 몫, Claude가 밀어붙일 수 없음
5. App Signing 지문 — 3번이 어느 정도 끝나고 앱을 Play Console에 올린 뒤에나 가능
6. 모바일 UI 정리 — 급하지 않음
