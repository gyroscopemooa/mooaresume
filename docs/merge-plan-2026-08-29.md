# 워크트리 병합 계획 — 2026-08-29

사용자 결정 3건을 반영한 실행 계획입니다. **아직 병합하지 않았습니다.**

## 결정

| 항목 | 결정 |
|---|---|
| 병합 시점 | **코덱스가 커밋한 뒤** |
| `career/*` 파일 | **코덱스 것을 채택** |
| `src/app/page.tsx` | **내 최신 홈 유지 + 코덱스의 커리어 링크만** |

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

   **이 섹션 하나만 가져오면 됩니다.** `src/app/career-home-cta.module.css`와 함께 `main`의 `page.tsx`에 덧붙입니다.

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

> `feature/codex-plan` 워크트리의 미커밋 72개를 커밋해 주세요. 그 뒤 `main`으로 병합합니다. `career/*`는 코덱스 버전을 채택하고, `src/app/page.tsx`는 `main` 버전을 유지합니다(홈 히어로·헤더가 그 사이 많이 바뀌었습니다).
