# 워크트리 병합 계획 — 2026-08-29

사용자 결정 3건을 반영한 실행 계획입니다. **아직 병합하지 않았습니다.**

## 결정

| 항목 | 결정 |
|---|---|
| 병합 시점 | **코덱스가 커밋한 뒤** |
| `career/*` 파일 | **코덱스 것을 채택** |
| `src/app/page.tsx` | **내 최신 홈 유지 + 커리어 CTA 섹션 + 커리어 검사 사이드바(드로어)** |

---

## 브랜치 3개 처분

### 1. `codex/integrate-launch-price-banner` — 끝난 것

- **이미 `main`에 전부 포함**돼 있습니다(`git merge-base --is-ancestor` 확인). 미커밋 0건.
- 할 일: 없음. 워크트리 `C:/mooaresume-launch-banner`는 정리해도 됩니다.

### 2. `feature/bring-annotations-to-main` — 버리는 쪽을 권합니다

- 2026-08-20, `main`보다 **143 커밋 뒤짐**. 고유 커밋 2개.
- 충돌 10건이 전부 QUICK 분석의 심장부입니다: `prompt.ts` · `schema.ts` · `provider.ts` · `validator.ts` · `result-document.ts` · `fixtures/result-document.ts` · eval 2개.
- **그 사이 이 파일들은 여러 번 다시 쓰였습니다.** 9일 전 기준으로 만든 변경을 지금 얹으면 충돌 해결이 아니라 재작성이 됩니다.
- **핵심: 그 작업은 이미 `main`에 있습니다.** `src/domain/result-original-annotations.ts`가 `main`에 존재하고, 이후 커밋(`d504f5e`, `a74e425`, `e26b0a5`)으로 더 발전했습니다.

**딱 하나 `main`에 없는 것**: `src/middleware.ts`.

```ts
// dev.* 호스트로 들어오면 /dev-home으로 rewrite
const DEV_HOST_PREFIX = "dev.";
```

`dev.mooaresume.com`으로 들어올 때 Coming Soon 대신 개발 중 홈을 보여주는 장치입니다. **지금은 라이브가 이미 실제 제품을 서비스하므로 쓸 일이 없습니다.** 나중에 dev 서브도메인을 쓰기로 하면 이 파일만 따로 가져오면 됩니다(17줄).

### 3. `feature/codex-plan` — 본 작업. 코덱스 커밋 후 진행

- 2026-08-29까지 **27 커밋**. 워크트리에 **미커밋 72개** — 오늘도 진행 중입니다.
- 충돌 13건.

---

## `feature/codex-plan` 충돌 13건 처리 방법

### A. `career/*` 10건 — 코덱스 것 채택 (add/add)

```
src/app/career/layout.tsx
src/app/career/page.tsx
src/app/career/profile/page.tsx
src/components/career-interest-assessment.tsx
src/components/career-profile-complete.tsx
src/components/career-profile-preview.tsx
src/components/career-values-reflection.tsx
src/components/work-style-assessment.tsx
src/components/work-style-assessment.module.css
src/components/launch-price-banner.module.css
```

**왜 add/add인가:** `main`의 커리어 커밋(`f730972`·`a75f9bd`, 8/26)이 `feature/codex-plan`의 **조상이 아닙니다.** 같은 기능이 두 갈래로 자란 상태입니다. 코덱스 쪽이 8/28~29로 더 최신이고 그 위에서 계속 작업 중입니다.

**주의 — 잃는 것.** `main` 쪽에만 있는 커리어 커밋 3개를 확인했습니다:

- `f730972` Add career assessment experience
- `a75f9bd` Integrate career routes and home header styles
- `edc631c` **Add unified career profile summary** ← 코덱스에 같은 게 있는지 병합 직전에 확인할 것

앞의 둘은 코덱스가 각자 발전시킨 같은 출발점이라 문제없습니다. **`edc631c`만 따로 봐야 합니다.**

```bash
git log --oneline $(git merge-base main feature/codex-plan)..main -- src/app/career src/components/career-* src/components/work-style-*
git show --stat edc631c
```

**실행:**

```bash
git merge feature/codex-plan   # 충돌 상태로 멈춤
git checkout --theirs src/app/career src/components/career-interest-assessment.tsx src/components/career-profile-complete.tsx src/components/career-profile-preview.tsx src/components/career-values-reflection.tsx src/components/work-style-assessment.tsx src/components/work-style-assessment.module.css src/components/launch-price-banner.module.css
```

### B. `supabase/migrations/20260826010000_career_assessment_profiles.sql` — **손으로**

`checkout --theirs`로 넘기면 안 됩니다.

- 이 마이그레이션은 **이미 원격 DB에 적용됐습니다**(2026-08-29).
- `main` 쪽 사본은 제가 **멱등하게** 고쳤습니다(`create table if not exists`, `drop policy if exists` 등). 그 수정이 없으면 다시 실행할 때 또 막힙니다.
- **처리:** 코덱스 쪽에 스키마 변경이 있으면 **그 변경만** `main` 사본 위에 손으로 옮기고, 멱등 처리는 유지합니다. 스키마가 같다면 `--ours`(main) 채택.

```bash
git diff main...feature/codex-plan -- supabase/migrations/20260826010000_career_assessment_profiles.sql
```

### C. `src/app/page.tsx` — 겉보기보다 큰 건입니다

**코덱스는 홈을 통째로 옮겼습니다.** 그쪽 `page.tsx`는 10줄짜리 껍데기이고, 내용 222줄이 새 파일 `src/app/home-page-content.tsx`로 갔습니다(`main`에는 없는 파일).

```tsx
// feature/codex-plan:src/app/page.tsx
export default function HomePage() {
  return <><LaunchPriceBanner /><HomePageContent /></>;
}
```

즉 "커리어 링크만 가져오기"가 아니라 **구조 변경**입니다. 결정(내 홈 유지)을 지키는 방법:

1. `main`의 `page.tsx`를 그대로 둡니다(오늘 작업한 히어로·`SiteNav`·모바일 수정 전부 유지).
2. 코덱스의 `home-page-content.tsx`는 **가져오지 않습니다.** 가져오면 두 개의 홈이 생깁니다.
3. 코덱스가 그 안에 넣은 **커리어 진입점만** 확인해서 옮깁니다.

**확인 완료 — 코덱스 홈의 커리어 진입점은 두 곳입니다:**

1. 헤더 네비의 `커리어 검사` 링크 → **이미 제 `SiteNav` 메뉴에 `무료 커리어 검사`로 들어 있습니다. 옮길 것 없음.**
2. **커리어 CTA 섹션** (`career-home-cta.module.css`) — 이건 `main`에 없습니다:

   > **지원하기 전에, 나의 기준부터 정리하세요.**
   > 직업흥미·업무성향·직업가치를 통해 하고 싶은 활동, 일하는 방식, 중요하게 보는 조건을 무료로 살펴볼 수 있어요.
   > `무료 커리어 검사 →`

   **이 섹션을 가져옵니다.** `src/app/career-home-cta.module.css`와 함께 `main`의 `page.tsx`에 덧붙입니다.

3. **커리어 검사 사이드바(드로어)** — 사용자가 요청한 것. **가져옵니다.**

   - `src/components/career-assessment-drawer.tsx` + `.module.css`
   - 홈 오른쪽에 붙는 패널입니다. 기본이 **열린 상태**이고, 접으면 화면 가장자리에 `커리어 검사` 탭만 남아 다시 열 수 있습니다. `Escape`로 닫힙니다. 안에는 `CareerAssessmentCatalog`가 들어갑니다.
   - 코덱스 홈에서는 `home-page-content.tsx:49`에서 한 줄로 렌더합니다. **`main`의 `page.tsx`에도 같은 한 줄만 넣으면 됩니다** — 홈 구조를 바꿀 필요가 없습니다.

   > **⚠️ 아직 커밋되지 않았습니다.** `career-assessment-drawer.tsx`와 `.module.css`는 코덱스 워크트리에서 `??`(untracked) 상태입니다. **어느 커밋에도 없으므로 지금은 병합할 수 없습니다.** 코덱스가 커밋해야 가져올 수 있습니다.
   > 함께 필요한 것: `CareerAssessmentCatalog` — 이것도 커밋 여부를 확인해야 합니다.

   **기본 열림 상태는 다시 볼 것.** 홈 첫 화면의 오른쪽을 기본으로 가리는 패널은 자소서 첨삭을 하러 온 사람에게는 방해가 됩니다. 접힌 상태로 시작하는 편이 나은지 병합 후 화면을 보고 정합니다.

### D. `docs/agent-change-log.md` — 양쪽 다 남기기

둘 다 파일 끝에 덧붙이기만 했습니다. 충돌 표시만 지우고 양쪽 항목을 모두 남깁니다.

---

## 병합 후 반드시

```bash
npx vitest run
npx tsc --noEmit
npx eslint .
npx next build
```

그리고 **커리어 화면과 홈을 직접 열어봅니다.** `career/*`를 통째로 다른 계보로 바꾸는 병합이라, 타입과 테스트가 통과해도 화면이 깨질 수 있습니다.

## 코덱스에게 요청할 것

### 미커밋 72개의 정체 (전체 커밋을 요청하기 전에)

| 종류 | 개수 | 커밋해야 하나 |
|---|---|---|
| `.previous-*` · `.cancelled-*` 백업 사본 | **40** | **커밋 후에는 불필요.** 아래 설명 |
| `1/` 디렉터리 | 스크린샷 다수 | **소스는 아님.** 아래 설명 |
| 실제 새 파일 | 약 20 | **예** — 드로어, 카탈로그, `mobile-site-menu`, `career-ai-preparation`, `career-values-result`, 새 라우트들 |
| 수정된 파일 | 11 | **예** |

**`.previous-*` 백업 40개** — 확인해 보니 전부 **현재 파일의 이전 상태 사본**입니다(예: `career-public-home.tsx.previous-purpose-copy-20260829`는 지금 파일의 옛 버전). 코덱스가 손으로 만든 되돌리기 이력입니다.

> **지금은 그게 유일한 안전망이라 맞습니다.** 작업이 커밋돼 있지 않으니 git이 대신해 줄 수 없었으니까요. **커밋하고 나면 git 이력이 같은 일을 하므로 그때는 지워도 됩니다.** 저장소에 넣을 이유는 없습니다.

**`1/` 디렉터리** — 앞서 "리다이렉션 사고"라고 적었는데 **틀렸습니다.** 열어보니 **스크린샷 모음**입니다(`20260825_213728.png` …, 8/25). 참고용 화면 캡처로 보입니다.

> **스크린샷 7장에 35MB입니다.** 저장소에 한 번 들어가면 이력에서 지워지지 않아, 앞으로 모든 clone이 35MB를 더 받습니다. 소스가 아니므로 넣지 않는 편이 낫습니다. 다만 **디자인 참고 자료라면 버리지 말고** `docs/` 아래에 뜻이 통하는 이름으로 옮기는 게 맞습니다. 이름이 `1`이면 반년 뒤에 아무도 무엇인지 모릅니다. **이건 코덱스/사용자가 판단할 몫입니다.**

### MD 문서 — 이미 커밋돼 있습니다

커리어 관련 문서 **17개가 이미 `feature/codex-plan`에 커밋**돼 있습니다(`career-assessment-roadmap.md`, `mooa-resume-career-design-v2.md`, `psychology-platform-future-plan.md` 등). **병합하면 자동으로 따라옵니다.** 따로 챙길 것 없습니다.

미커밋 md는 `docs/agent-change-log.md` 하나뿐이고, 이건 양쪽이 끝에 덧붙이기만 해서 **양쪽 다 남기면 됩니다.**

**⚠️ 겹치는 것 하나 더:** 코덱스가 `src/components/mobile-site-menu.tsx`를 만들고 있습니다. `main`에는 제가 만든 `SiteNav`(드롭다운 메뉴)가 있습니다. **같은 자리를 두 구현이 노립니다** — 병합 때 어느 쪽을 쓸지 정해야 합니다.

---

> `feature/codex-plan` 워크트리의 미커밋 파일을 커밋해 주세요. 특히 **`src/components/career-assessment-drawer.tsx`와 `.module.css`가 아직 untracked**입니다 — 이 사이드바를 `main` 홈에 가져가기로 했는데, 커밋이 없어 지금은 병합할 수 없습니다. `CareerAssessmentCatalog`도 함께 확인 부탁드립니다.
>
> 그 뒤 `main`으로 병합합니다. `career/*`는 코덱스 버전을 채택하고, `src/app/page.tsx`는 `main` 버전을 유지합니다(홈 히어로·헤더가 그 사이 많이 바뀌었습니다). 드로어는 `main`의 `page.tsx`에 한 줄로 넣습니다.
