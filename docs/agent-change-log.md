# Agent Change Log and Variant Registry

This append-only document coordinates Claude, Codex, other agents, and the user. It does not replace Git history. Before changing overlapping code, read this file and inspect the working tree and relevant branches.

## Mandatory workflow

1. Identify the current implementation, its owner when known, and its Git or working-tree location.
2. Record the intended change here before any unavoidable deletion, rename, replacement, schema change, prompt change, or UX transformation.
3. Prefer a separate branch or clearly named mirror/variant. Do not replace the active implementation merely because another approach seems better.
4. Validate each variant independently and present the differences to the user.
5. Integrate or remove a variant only after the user explicitly chooses it.

## Entry template

### YYYY-MM-DD HH:mm KST — Short title

- Agent/session:
- Status: proposed | variant | active | superseded-by-user-choice | blocked
- Protected baseline:
- Change and reason:
- Files/branch:
- Validation:
- Rollback/recovery reference:
- User decision:

## 2026-08-21 — Baseline protection rule established

- Agent/session: Codex, following the user's explicit cross-agent preservation instruction.
- Status: active.
- Protected baseline: all current committed and uncommitted user, Claude, Codex, and unknown-origin work.
- Change and reason: added shared rules so agents cannot silently delete, replace, or reshape one another's work; alternatives must remain as selectable variants.
- Files/branch: `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/agent-change-coordination.mdc`, and this document on `main`.
- Validation: rule files reviewed for consistent always-on scope.
- Rollback/recovery reference: the pre-rule `main` commit is `c9c06b8`; preserve the current dirty working tree before any rollback.
- User decision: user required this policy for Claude and Codex.

## 2026-08-21 — Protected Claude QUICK original-annotation variant

- Agent/session: Claude-assisted work recorded in Git commit metadata.
- Status: variant; not merged into current `main`.
- Protected baseline: separate QUICK `제출본` tab with inline original-answer annotations and feedback cards (`good`, `delete`, `vague`, `revise`).
- Change and reason: preserve the earlier red-pen-style submission review as a selectable implementation.
- Files/branch: `feature/original-annotations` and `origin/feature/original-annotations`; primary commits `26bb5df`, `86eb5b1`, and `68807e1`.
- Validation: branch and remote-tracking reference confirmed; commit `26bb5df` contains the submission tab, schema, prompt, provider, validator, fixture, and UI tests.
- Rollback/recovery reference: branch tip `68807e1`.
- User decision: pending. Do not broad-merge this branch into `main`; selectively port only after the user chooses.

## 2026-08-21 — Current main result-screen alternative observed

- Agent/session: origin not conclusively attributable from the dirty working tree; preserve as unknown-origin protected work.
- Status: variant in the current uncommitted working tree.
- Protected baseline: the current result screen uses yellow highlights inside revised answers and includes newer coverage, PRO requirement-match, and interview handling.
- Change and reason: record that this is different from the Claude original-answer annotation/submission-tab variant.
- Files/branch: modified `src/components/result-workspace-v2.tsx`, `src/components/result-workspace-v2.module.css`, `src/domain/result-document.ts`, `src/server/ai/quick/provider.ts`, and `src/server/ai/quick/schema.ts` on `main`.
- Validation: exact diff against `feature/original-annotations` inspected.
- Rollback/recovery reference: preserve the dirty working tree; committed `main` baseline is `c9c06b8`.
- User decision: pending comparison; neither variant may overwrite the other.

## 2026-08-21 — Claude: ported original-annotation commits into an isolated worktree variant

- Agent/session: Claude, this session (https://claude.ai/code/session_011HWnGg975hw2MXotp5Zo1R).
- Status: variant; not merged into `main`; not present in the dirty working tree at `C:\6.mooaresume`.
- Protected baseline: `main` at `c9c06b8`, and the untouched `feature/original-annotations` branch/commits (`26bb5df`, `86eb5b1`, `68807e1`) — neither was modified.
- Change and reason: user asked to see the `제출본` tab / original-answer annotation feature (from `feature/original-annotations`) working on top of current `main`'s PRO billing work, without touching Codex's concurrently-running uncommitted changes in the main working tree. Created a separate `git worktree` at `C:\mooaresume-annotations-merge` on new branch `feature/bring-annotations-to-main` (based on `main`), then cherry-picked the 3 commits there: `26bb5df` (one conflict in `src/server/ai/quick/provider.ts`, resolved by keeping both main's `${request.product} input` snapshotLabel and the branch's `originalAnnotations` resolution logic), `86eb5b1` (skipped — empty; its `resume-intake.tsx` fix was already present on `main` independently), `68807e1` (applied cleanly, `next-env.d.ts`/middleware/reset-button hunks were already no-ops against `main`).
- Files/branch: isolated worktree `C:\mooaresume-annotations-merge`, branch `feature/bring-annotations-to-main`, commits `e5a55ad` and `c1a1bdb`. Nothing in `C:\6.mooaresume` (the shared working tree) was touched.
- Validation: in the worktree — `npx vitest run src/components/result-workspace-v2.submission.test.tsx` (2 passed), `npx vitest run src/server/ai/quick` (7 passed), `npx tsc --noEmit` (clean).
- Rollback/recovery reference: delete the worktree with `git worktree remove ../mooaresume-annotations-merge` and `git branch -D feature/bring-annotations-to-main` from `C:\6.mooaresume` if the user rejects this variant; nothing else is affected.
- User decision: superseded — user asked for an in-app comparison mirror (button-based, Codex first then Claude) instead. See "Claude result comparison mirror (completed locally)" below. This worktree is left in place as a secondary reference/rollback point but is not the delivered path.

## 2026-08-21 — Codex payment, analysis-recovery, and question-preservation work

- Agent/session: Codex in the current local session.
- Status: active local changes, not yet committed or deployed.
- Protected baseline: existing PRO billing and result work on `main` plus all unrelated dirty files.
- Change and reason: added checkout return-origin preservation, OpenAI background-response recovery, nullable usage handling, all-question result enforcement, duplicate-label prevention, editable empty-question preservation, and Polar checkout reconciliation for missed webhooks. Removed the temporary unauthenticated local diagnostic route after use.
- Files/branch: current dirty `main`; see Git status for the exact set, notably `src/app/api/analysis-runs/quick/execute/route.ts`, checkout/status routes, `src/components/quick-checkout-return.tsx`, `src/components/resume-intake.tsx`, `src/domain/cover-letter-question.ts`, and new billing/background helper and test files.
- Validation: targeted billing/analysis tests passed, including 22 reconciliation/background tests and 11 question-preservation tests; TypeScript and targeted lint passed.
- Rollback/recovery reference: committed baseline `c9c06b8`; do not reset because the dirty tree contains mixed-owner work.
- User decision: live checkout mutation and OpenAI execution remain unapproved; local fixes are preserved.

## 2026-08-21 — Codex result comparison mirror (planned)

- Agent/session: Codex, current session; ordered first by the user before Claude's separate button/version work.
- Status: proposed.
- Protected baseline: the active `src/components/result-workspace-v2.*` implementation and Claude's untouched `feature/original-annotations` plus isolated `feature/bring-annotations-to-main` worktree variant.
- Change and reason: add a separate `/result/codex` mirror that derives red-pen marks deterministically from the stored before/after diff and shows the already-stored revision reasons. Add only a current/Codex navigation button to the active result page. Do not alter AI prompts, result schemas, Claude annotations, or the active result workspace.
- Files/branch: planned new `src/components/result-variant-nav.*`, `src/components/result-workspace-codex.*`, and `src/app/result/codex/page.tsx`; minimal additive wrapper edits to `src/app/result/page.tsx` on the current dirty `main`.
- Validation: pending targeted component/domain tests, TypeScript, lint, and local route render verification.
- Rollback/recovery reference: remove only the new Codex mirror files and the additive navigation wrapper from `src/app/result/page.tsx`; active result workspace and Claude branches remain unchanged.
- User decision: explicitly requested separate current/Codex/Claude comparison buttons and ordered Codex first.

## 2026-08-21 — Codex result comparison mirror (completed locally)

- Agent/session: Codex, current session.
- Status: variant; active only as an additive local mirror, not committed or deployed.
- Protected baseline: `src/components/result-workspace-v2.*`, all existing AI/result schemas and prompts, `feature/original-annotations`, and Claude's isolated `feature/bring-annotations-to-main` worktree remain unchanged by this mirror work.
- Change and reason: added a `현재 버전` / `Codex 빨간펜 미러` selector and `/result/codex`. The Codex mirror marks only deterministic before/after removals and additions, then displays already-stored revision reasons, verification notes, and highlighted phrases. It does not manufacture `good/delete/vague/revise` semantic annotations.
- Files/branch: new `src/domain/codex-redpen-mirror.ts` and test, `src/components/result-variant-nav.*`, `src/components/result-workspace-codex.*`, `src/app/result/codex/page.tsx`; additive navigation-only edit to `src/app/result/page.tsx` on dirty `main`.
- Validation: 8 targeted tests passed; TypeScript passed; targeted ESLint passed; local `/result` and `/result/codex` both returned HTTP 200; both rendered the selector and only the Codex route rendered the Codex mirror marker.
- Rollback/recovery reference: remove the new Codex mirror files and the two `ResultVariantNav` additions in `src/app/result/page.tsx`. Do not modify the protected current or Claude variant files.
- User decision: pending visual comparison. Claude may add its own separately named button/route without replacing this Codex mirror or the current result.

## 2026-08-21 — Claude result comparison mirror (completed locally)

- Agent/session: Claude, this session (https://claude.ai/code/session_011HWnGg975hw2MXotp5Zo1R); ordered second, after Codex's mirror above, per the user's explicit instruction.
- Status: variant; active only as an additive local mirror, not committed or deployed.
- Protected baseline: `src/components/result-workspace-v2.*`, all existing AI/result schemas, prompts, and provider/validator files, Codex's `result-workspace-codex.*`/`codex-redpen-mirror.ts`/`/result/codex`, `feature/original-annotations`, and the isolated `feature/bring-annotations-to-main` worktree — none of these were modified except one additive line in the shared `ResultVariantNav`.
- Change and reason: added a `Claude 제출본 미러` selector entry and `/result/claude`, reproducing the actual `feature/original-annotations` (`26bb5df`) UI — inline good/delete/vague/revise marks over the submitted original text plus feedback cards — for the demo/no-`analysisRunId` case, using a self-contained sample ported verbatim from that branch's fixture (not the shared `sampleResultDocument`). For real `analysisRunId` results, the current schema has no stored `originalAnnotations`, so it falls back to a non-fabricated derivation (`good`/`delete` only, from the real before/after diff and already-stored `highlightedPhrases`) rather than inventing `vague`/`revise` judgments the AI never made for that result — mirrors Codex's "don't manufacture new judgments" principle for its own mirror.
- Files/branch: new `src/domain/claude-annotation-mirror.ts` + test, `src/fixtures/claude-annotation-sample.ts`, `src/components/result-workspace-claude.tsx` + `.module.css`, `src/app/result/claude/page.tsx`; one additive edit to `src/components/result-variant-nav.tsx` (added `"claude"` to the `active` union and one new `<Link>`, did not touch Codex's existing link/lines) on dirty `main`.
- Validation: `npx vitest run src/domain/claude-annotation-mirror.test.ts` (4 passed); `npx tsc --noEmit` (clean, whole project); targeted ESLint on all new/edited files (clean); confirmed via Codex's already-running dev server on port 3000 (my own `next dev` refused a second lock on the same directory, which is expected) — `GET /result`, `/result/claude`, `/result/codex` all returned 200, and `/result/claude`'s HTML contains the expected `좋은 표현`/`삭제 추천`/`구체성 부족`/`수정 추천`/`현대모비스` sample content.
- Rollback/recovery reference: delete the 4 new files/1 new dir listed above and revert the 2-line addition in `result-variant-nav.tsx`; nothing else is affected. No schema, prompt, provider, or validator file was touched, so the live QUICK/PRO pipeline is unaffected regardless of this mirror's fate.
- User decision: pending visual comparison against Codex's mirror and the current result screen.

## 2026-08-21 — Claude: verbatim-restore mirror added alongside the reinterpreted one (per user request)

- Agent/session: Claude, this session (https://claude.ai/code/session_011HWnGg975hw2MXotp5Zo1R).
- Status: variant; active only as an additive local mirror, not committed or deployed.
- Protected baseline: everything listed as protected in the two entries above, plus the `Claude 제출본 미러` mirror added in the previous entry — none of it was deleted or modified beyond one additive line in the shared `ResultVariantNav`.
- Change and reason: user reviewed the `Claude 제출본 미러` above and said it "felt newly made" rather than restored — it truncated sample text and collapsed the original 5-tab `ResultWorkspaceV2` into a single-view mirror to match Codex's mirror shape. User then asked, explicitly, not to delete that one and instead add a second, more faithful restoration as its own button. Added `Claude 복원판(전체)`: a verbatim port of the full `ResultWorkspaceV2` component (all 6 tabs — 한눈에 보기/제출본/문항별 첨삭/공고·경험 분석/면접 준비/최종 첨삭본, including edit/copy/download/diff-toggle behavior) and its full untruncated sample fixture, exactly as they existed on `feature/original-annotations` (`26bb5df`). Kept fully self-contained (own domain schema, fixture, component, CSS module) rather than editing the shared `result-document.ts`/`result-workspace-v2.tsx`, so it doesn't collide with Codex's concurrent edits to those files.
- Files/branch: new `src/domain/result-document-claude-restored.ts`, `src/fixtures/result-document-claude-restored.ts`, `src/components/result-workspace-claude-restored.tsx` + `.module.css`, `src/app/result/claude-restored/page.tsx`; one additive edit to `src/components/result-variant-nav.tsx` (added `"claude-restored"` to the `active` union and one new `<Link>`, did not touch any existing line) on dirty `main`.
- Validation: `npx tsc --noEmit` (clean, whole project); targeted ESLint on all new/edited files (clean); confirmed via Codex's already-running dev server on port 3000 — `GET /result/claude-restored` returned 200 and its HTML contains all 6 tab labels and the sample company name; `GET /result` confirmed all four nav buttons (현재 버전/Codex 빨간펜 미러/Claude 제출본 미러/Claude 복원판(전체)) render together.
- Rollback/recovery reference: delete the 4 new files/1 new dir listed above and revert the 2-line addition in `result-variant-nav.tsx`; nothing else is affected.
- User decision: pending visual comparison; user explicitly asked to keep both Claude mirrors rather than replace one with the other.

## 2026-08-21 — Codex full Git restoration variant (planned)

- Agent/session: Codex, current session.
- Status: proposed.
- Protected baseline: all four existing result variants, especially Claude's self-contained `Claude 복원판(전체)` files and shared navigation entries.
- Change and reason: user explicitly requested a separate `Codex 복원판(전체)` button beside Claude's full restoration. Restore the same `feature/original-annotations` source into an independently named Codex file set so neither agent's implementation references, replaces, or deletes the other.
- Files/branch: planned new `src/domain/result-document-codex-restored.ts`, `src/fixtures/result-document-codex-restored.ts`, `src/components/result-workspace-codex-restored.tsx` + `.module.css`, and `src/app/result/codex-restored/page.tsx`; one additive union/link entry in `src/components/result-variant-nav.tsx`.
- Validation: pending TypeScript, targeted ESLint, and local route/navigation checks.
- Rollback/recovery reference: remove only the independently named Codex-restored files and its one navigation entry; preserve all other variants.
- User decision: explicitly requested addition beside Claude's full restoration without deleting existing work.

## 2026-08-21 — Codex full Git restoration variant (completed locally)

- Agent/session: Codex, current session.
- Status: variant; active only as an additive local route, not committed or deployed.
- Protected baseline: current result, Codex red-pen mirror, Claude submission mirror, and Claude full restoration remain present and unchanged except for the additive shared navigation entry.
- Change and reason: added `Codex 복원판(전체)` beside `Claude 복원판(전체)`. The Codex version was independently copied from `feature/original-annotations`, has its own domain schema, fixture, component, CSS, test, and route, and does not import Claude's files.
- Files/branch: new `src/domain/result-document-codex-restored.ts`, `src/fixtures/result-document-codex-restored.ts`, `src/components/result-workspace-codex-restored.tsx`, `.module.css`, `.test.tsx`, and `src/app/result/codex-restored/page.tsx`; one additive entry in `src/components/result-variant-nav.tsx` on dirty `main`.
- Validation: the restored domain, fixture, component, and CSS matched the Git source exactly after only independent import/export renaming; no Claude references; 2 targeted tests passed; TypeScript and targeted ESLint passed; all five result routes returned HTTP 200 and both full-restoration buttons rendered together.
- Rollback/recovery reference: remove only the Codex-restored files above and its navigation union/link entry. Preserve every other result variant.
- User decision: requested and implemented; comparison choice remains pending.

## 2026-08-21 — Integrated completion result workspace (planned)

- Agent/session: Codex, current session.
- Status: proposed.
- Protected baseline: all five existing result variants and their routes; none may be deleted or repurposed.
- Change and reason: the newest completed QUICK run stored three original/revised question pairs but no `originalAnnotations`, so both full restoration variants correctly parsed the result yet rendered an empty submission-feedback state. Add a sixth `완성본` route based on the full restoration workspace, wired to the current result schema and real `analysisRunId`. For legacy/current stored results without semantic annotations, derive only objective before/after fallback marks in the UI; for future runs, request and persist bounded original annotations inside the existing single OpenAI analysis call.
- API/cost boundary: switching among result buttons performs no OpenAI request and reads the same stored `analysis_results` row. The future annotation field modestly increases output tokens within the one existing analysis call; it does not multiply calls by the number of result variants.
- Files/branch: planned additive `/result/complete`, `result-workspace-complete.*`, fallback annotation domain helper/tests, current result schema and QUICK schema/prompt/provider/validator additions, and one `완성본` navigation entry on `main`.
- Validation: pending targeted schema/provider/component tests, full TypeScript and ESLint, and local route checks with the latest stored analysis-run ID.
- Rollback/recovery reference: remove only the completion route/component/helper and its nav entry; revert the bounded annotation additions. Preserve all five comparison variants.
- User decision: explicitly requested a new completion button as the future integration target, using the full restoration layout and real tested resume result.

## 2026-08-21 — Integrated completion result workspace (completed locally)

- Agent/session: Codex, current session.
- Status: completed locally; not committed or pushed in this checkpoint.
- Protected baseline: all five prior comparison routes and components remain present; the new integration target is a sixth additive `/result/complete` route.
- Change and reason: added the `완성본` selector and a full current workspace with a `제출본` tab. It reads the same authenticated `analysis_results.result_data` selected by `analysisRunId`; when the ID is absent, a logged-in user is automatically shown their most recent stored result instead of the sample. Existing results that predate original annotations display the actual submitted answer and deterministic before/after changed spans without another OpenAI call. Future QUICK/PRO results request up to eight exact-source annotations per question and persist only phrases that occur uniquely in the submitted answer.
- Compatibility and cost: old stored/background responses missing `originalAnnotations` are normalized to an empty array. Changing among six screens performs only normal page/database reads; it does not trigger six AI analyses. The annotation output modestly increases tokens in the existing single analysis request.
- Validation: full 184-test suite passed; TypeScript and full ESLint passed; local `/result/complete` returned HTTP 200 and rendered `완성본`, `제출본`, `Claude 복원판(전체)`, and `Codex 복원판(전체)` together. The latest completed QUICK row was confirmed to contain three real original/revised question pairs but no legacy annotation field, which explains the formerly empty restored submission panels.
- Rollback/recovery reference: remove `/result/complete`, `result-workspace-complete.*`, and `result-original-annotations.*`, then revert only the `완성본` nav and bounded annotation schema/prompt/provider additions. Do not remove or rewrite the five protected variants.
- User decision: use `완성본` as the future place to compare, merge, and add selected features.

## 2026-08-21 — Codex full restoration submission fallback (completed locally)

- Agent/session: Codex, current session.
- Status: additive behavior correction; not committed or pushed.
- Protected baseline: `Codex 복원판(전체)` remains its own comparison route and keeps stored good/delete/vague/revise annotations unchanged.
- Change and reason: the legacy no-annotation branch previously hid the submitted original and showed only an empty-state sentence. It now always renders the submitted original and a clear notice when an old result has no saved source annotations. This prevents the blank cards shown in the user's screenshot while keeping the result factual; it does not fabricate feedback.
- Validation: targeted restored-workspace test (2 passed), TypeScript, and targeted lint passed.
- Rollback/recovery reference: revert only the no-annotation branch in `result-workspace-codex-restored.tsx` and its one matching test assertion.
- User decision: explicitly requested that the submission tab show at least the source text instead of an empty panel.

## 2026-08-21 — Cloudflare Worker bundle separation (completed locally)

- Agent/session: Codex, current session.
- Status: additive packaging optimization; not committed or pushed.
- Protected baseline: all upload formats and all result/demo/comparison routes remain available. No page, sample, image, or UI feature was removed.
- Change and reason: PDF/DOCX extraction is invoked only by client-side upload components, but `pdfjs-dist` and `mammoth` were listed as server external packages. Removed that server registration and explicitly marked `local-document.ts` client-only so these browser-only parsers cannot enter the Worker server module graph. This directly targets the `pdfjs-dist can't be external` build warning and avoids carrying browser file parsing code in the Worker.
- Measurement: local OpenNext bundle recreation could not complete because Windows reported an EPERM lock on `.open-next` while the active local development server was using it. No server was stopped or files manually deleted. The next Cloudflare build is the authoritative gzip measurement.
- Validation: TypeScript, full lint, and full test suite (184 passed) passed. The Cloudflare gzip measurement remains pending the next Linux/Cloudflare build because the active Windows development server held the local OpenNext output directory lock.
- Rollback/recovery reference: restore the `serverExternalPackages` entry and remove `import "client-only"` only if a server-side caller is intentionally introduced later.
- User decision: preserve all currently used screens/features and reduce only unrelated server-bundle code.

## 2026-08-21 — Claude: 완성본 빈 문항 안내를 "제외 통보"에서 "다음 단계 추천"으로

- Agent/session: Claude, this session.
- Status: completed locally; not committed or pushed.
- Protected baseline: `/result/complete`(Codex 작성)의 나머지 로직, 다섯 개 비교 변형 라우트, AI 프롬프트/스키마/프로바이더/밸리데이터 — 하나도 수정하지 않았습니다. 사용자가 완성본을 최종 통합 대상으로 확정했기 때문에 별도 미러가 아니라 완성본 파일 안에서 추가(additive)로 작업했습니다.
- Change and reason: 답이 비어 있는 문항은 `getAnalysisQuestions`가 분석에서 제외하고 `coverageNotes`만 남기는데, 결과 화면은 "제외했습니다"만 알리고 다음 행동을 알려주지 않았습니다. 사용자 지적에 따라 (1) 공용 `CoverageNotice` 컴포넌트를 추가해 한눈에 보기와 제출본 탭 **양쪽**에 표시하고, (2) 결제 전 문구(`analysis-preparation.tsx:120`)를 토씨까지 동일하게 반복해 결제 전후 약속이 달라지지 않게 하고, (3) "아직 아무것도 못 썼어요(CREATE)" 유형으로 진행하라는 추천과 `/onboarding` 링크를 넣고, (4) 문항 번호 줄만 있고 본문이 없으면 빈 문항으로 잡힌다는 원인(중복 "문항 1" 사례)을 설명했습니다.
- Files/branch: `src/components/result-workspace-complete.tsx`(CoverageNotice 추가, 한눈에 보기 인라인 블록을 이 컴포넌트로 교체, 제출본 탭에 추가 렌더), `.module.css`(`.coverageNotice`는 기존 `.warning`을 `composes`로 재사용, `.coverageLink` 추가), `.test.tsx`(테스트 2개 추가) on dirty `main`.
- Validation: `npx vitest run src/components/result-workspace-complete.test.tsx` (4 passed, 기존 2개 포함); `npx tsc --noEmit` (clean); `npx eslint src/components/result-workspace-complete.tsx` (clean).
- Rollback/recovery reference: `CoverageNotice` 함수와 두 군데 호출부를 지우고 한눈에 보기 인라인 블록을 되돌린 뒤, CSS 파일 끝에 추가한 5개 규칙과 테스트 `describe` 블록 하나를 제거하면 원상 복구됩니다. 서버/프롬프트/스키마는 건드리지 않아 분석 파이프라인에는 영향이 없습니다.
- User decision: 사용자가 "분석 제외보다 '아무것도 안 썼어요' 유형을 추천하는 설명이 낫다 + 결제 전 문구와 같은 안내를 붙여라"라고 명시적으로 지시했습니다. 비교용 버튼 5개는 확정 전까지 사용자가 직접 봐야 하므로 숨기지 않고 그대로 두었습니다.

## 2026-08-21 — Claude: 제출본 주석 5종·수정 예시 추가 + PRO 면접 리스크 분석 구현

- Agent/session: Claude, this session. 사용자가 두 건 모두 명시적으로 승인한 뒤 진행했습니다.
- Status: completed locally; not committed or pushed. 프롬프트/스키마 변경이므로 아래 롤백 절차를 반드시 함께 보관합니다.
- Protected baseline: 다섯 개 비교 변형 라우트(`/result`, `/result/codex`, `/result/claude`, `/result/claude-restored`, `/result/codex-restored`)와 그 도메인/픽스처 파일은 **하나도 수정하지 않았습니다**. 이 변경은 사용자가 최종 통합 대상으로 확정한 `완성본` 계열(`result-workspace-complete.*`)과 공용 QUICK 파이프라인에만 적용됩니다. 복원판 두 개는 자체 스키마를 쓰므로 영향이 없습니다.
- Change and reason (1) 제출본 주석: 기존 주석은 `comment` 한 줄에 "왜 문제인지"와 "어떻게 고칠지"가 뭉쳐 있어 라벨만 남고 실행 가능한 조언이 없었습니다. `suggestion`(고쳐 쓴 예시 한 줄, 없으면 null)을 신설해 역할을 분리하고, 다섯 번째 타입 `fact`(원문만으로 확인되지 않는 성과·수치·역할)를 추가했습니다. 지금까지 `verificationNote`로 문항 아래에 따로 떨어져 있어 어느 문장 얘기인지 보이지 않던 것을 원문 위에 직접 표시합니다. 문항당 상한은 8 → 10. 타입을 더 늘리는 대신 한 주석의 정보량을 늘린 이유는, 라벨이 많아질수록 모델이 `delete`/`revise`를 더 헷갈리고 화면에서도 색 구분이 무너지기 때문입니다.
- Change and reason (2) 면접 리스크: `pricing-comparison.tsx`는 "면접 리스크 분석"을 PRO 포함으로 판매하고 있는데 스키마에 존재하지 않아 구현이 없었습니다(면접 탭에 예상질문만 표시). PRO 전용 `interviewRisks`(topic/risk/evidenceQuote/preparation, 2~5개)를 추가해 판매 중인 약속을 이행합니다. 예상질문의 반복이 아니라 "답변이 흔들릴 지점 + 근거 원문 + 면접 전 준비"입니다. QUICK에는 넣지 않았습니다(넣으면 PRO 구매 이유가 사라짐). FINAL의 대화형 모의면접 영역은 건드리지 않았습니다.
- Backward compatibility: `parseQuickAnalysisOutput`의 `normalizeAnnotations`가 `originalAnnotations` 자체가 없던 응답과 `suggestion`이 없던 주석을 모두 채워 파싱합니다(기존 값은 덮어쓰지 않음). `resultDocumentSchema`에서 `suggestion`은 optional, `interviewRisks`는 `.default([])`이므로 이미 저장된 결과도 그대로 파싱됩니다. 화면 전환은 여전히 OpenAI를 호출하지 않으며, 늘어나는 것은 기존 단일 분석 요청의 출력 토큰뿐입니다.
- Files/branch: `src/server/ai/quick/schema.ts`, `prompt.ts`(QUICK_PROMPT_VERSION `quick-1.3` → `quick-1.4`), `provider.ts`, `src/domain/result-document.ts`, `src/domain/result-original-annotations.ts`, `src/fixtures/result-document.ts`(문항 1에만 신규 형식 주석 + interviewRisks 샘플 추가 — 문항 2·3은 구버전 fallback을 그대로 두어 한 화면에서 신·구가 비교되게 함), `src/components/result-workspace-complete.tsx` + `.module.css`, 신규 `src/server/ai/quick/schema.test.ts`, 기존 테스트 3곳에 `suggestion: null` 추가 on dirty `main`.
- Validation: 전체 `npx vitest run` 191 passed(기존 184 + 이번 세션 7); `npx tsc --noEmit` clean; 변경 파일 전체 ESLint clean; 로컬 개발 서버 `/result/complete`에서 제출본 탭이 문항 1에 `확인 필요`/`수정 추천`/`좋은 표현`/`구체성 부족` 4종과 "이렇게 고쳐 보세요" 예시를, 문항 2·3에 구버전 fallback을 함께 렌더하는 것을 확인했고, 면접 준비 탭에 `INTERVIEW RISK` 3건이 근거 원문·준비사항과 함께 렌더되는 것을 확인했습니다. 콘솔 오류 없음.
- Rollback/recovery reference: (1) `schema.ts`에서 `suggestion`/`fact`/`interviewRiskOutputSchema`/`interviewRisks`를 되돌리고 `max(10)` → `max(8)`, `normalizeAnnotations`를 이전 in-place 기본값 코드로 환원, (2) `prompt.ts`의 추가 지시문 6줄 제거 후 버전을 `quick-1.3`으로 환원, (3) `result-document.ts`의 `suggestion`/`fact`/`interviewRiskSchema`/`interviewRisks` 제거, (4) `provider.ts`의 `interviewRisks` 매핑 1줄 제거, (5) `result-original-annotations.ts`의 draft 타입과 suggestion 분기 환원, (6) 컴포넌트의 `fact` 라벨·suggestion 렌더·risks 섹션과 CSS 끝 16개 규칙 제거, (7) 픽스처 추가분 제거, (8) `schema.test.ts` 삭제. 저장된 기존 결과는 어느 단계에서도 손실되지 않습니다.
- Incident and correction: 새 테스트를 만들면서 이미 존재하던 Codex의 `src/server/ai/quick/schema.test.ts`를 확인 없이 덮어썼습니다. 즉시 `git show HEAD:` 로 원본을 복원하고 새 테스트를 아래에 덧붙이는 방식으로 되돌렸습니다. Codex의 `parseQuickAnalysisOutput legacy compatibility` 테스트는 원문 그대로 남아 있으며, 변경은 import 한 줄 추가와 파일 끝 추가분뿐입니다(`git diff`로 확인). 새 파일을 만들 때는 먼저 존재 여부를 확인해야 합니다.
- User decision: 사용자가 주석은 "추천안 그대로", 면접 리스크는 "지금 PRO에 추가"를 선택했습니다. QUICK/PRO/FINAL 경계는 가격표(`pricing-comparison.tsx`)에 이미 정의된 "PRO=면접 자료 / FINAL=면접 연습, 엔진은 동일하고 재료가 다름" 구조를 그대로 따릅니다. 구버전 결과용 fallback 주석은 사용자 지시에 따라 손대지 않았습니다.

## 2026-08-21 — Claude: 결과 화면의 영문 자리표시자 제거 + 최종 첨삭본 DOCX 내보내기

- Agent/session: Claude, this session. 사용자가 실제 QUICK 결과 화면에서 발견해 지적한 세 가지에 대응한 작업입니다.
- Status: completed locally; not committed or pushed.
- Protected baseline: 다섯 개 비교 변형 라우트와 그 컴포넌트/도메인/픽스처, 공용 `buildFinalDocumentText`(현재 버전 `result-workspace-v2`가 그대로 사용) — 하나도 수정하지 않았습니다. 표시 보정은 완성본 컴포넌트 안에서만 이뤄지고, 공용 빌더에는 해석된 값을 인자로 넘기는 방식으로 우회했습니다.
- Change and reason (1) 영문 자리표시자: 분석 요청 스키마에는 회사명·직무 필드가 아예 없는데 `createQuickAnalysisResult`가 필수 컬럼을 `"Applicant company"`, `"Applicant role"`, `"${product} cover-letter revision"`, `"Question ${n}"`, `"Cover-letter question"`로 채우고 있었습니다. 이 값들이 유료 결과 화면의 큰 제목, 최종 첨삭본 문항 제목, 지원 추적 카드, 다운로드 파일명에 그대로 노출됐습니다. 어셈블러는 이제 한국어의 사실에 맞는 값(분석한 파일명 또는 "내 자기소개서", "자기소개서 첨삭", 문항 질문 또는 `문항 N`)을 저장합니다. 이미 저장된 결과는 고칠 수 없으므로 새 `src/domain/result-labels.ts`가 표시 시점에도 자리표시자를 인식해 대체합니다. 존재하지 않는 회사명을 지어내지 않는다는 원칙은 유지했습니다.
- Change and reason (2) DOCX 내보내기: 최종 첨삭본은 `.txt`만 제공해 제목 구조가 모두 사라졌고, 화면에는 "DOCX · PDF 내보내기 예정"이라고만 적혀 있었습니다. 의존성 없이 `.docx`를 만드는 `src/lib/docx.ts`를 추가했습니다(직접 구현한 저장 방식 ZIP + CRC32 + 최소 OOXML 3파트). 사용자가 물어본 `.hwp`는 비공개 바이너리 포맷이라 정직하게 생성할 수 없고, 한글과 Word 모두 `.docx`를 직접 열기 때문에 이 하나로 양쪽을 충족합니다. 라이브러리를 쓰지 않은 이유는 문서 라이브러리가 모든 방문자의 브라우저 번들로 실려 나가기 때문입니다.
- Files/branch: 신규 `src/lib/docx.ts` + `docx.test.ts`, 신규 `src/domain/result-labels.ts` + `result-labels.test.ts`; 수정 `src/server/ai/quick/provider.ts`(`describeSubject` 헬퍼 추가, 문항 제목/질문 기본값 한국어화), `src/components/result-workspace-complete.tsx`(제목/문항 제목/파일명/추적 카드에 해석기 적용, DOCX 저장 버튼 2곳, 푸터 문구), `src/components/result-workspace-complete.test.tsx`(자리표시자 렌더 테스트 2건) on dirty `main`.
- Validation: 전체 `npx vitest run` 204 passed; `npx tsc --noEmit` clean; `npx eslint src` clean(전체). DOCX는 생성한 바이트를 Python `zipfile`로 외부 검증했습니다 — ZIP 무결성 OK, 3개 파트 모두 XML 파싱 성공, 한국어 보존, `<`/`&` 이스케이프 확인, 줄바꿈이 문단으로 분리됨. 로컬 개발 서버에서 `DOCX 저장` 버튼 클릭 시 콘솔 오류 없음, 샘플처럼 실제 회사·직무가 있는 결과는 기존 표시("현대모비스 생산관리")가 그대로 유지되는 것을 확인했습니다.
- Rollback/recovery reference: `result-labels.ts`/`docx.ts`와 각 테스트를 삭제하고, 컴포넌트에서 두 파일의 import와 `subject`/`applicationLabel`/`baseFilename`/`downloadDocx`/`save` 및 `resolveQuestionTitle` 호출부를 이전 `result.company`/`result.role`/`question.title` 직접 참조로 되돌린 뒤, provider의 `describeSubject`를 제거하고 이전 영문 리터럴을 복원하면 됩니다. 저장된 결과 데이터는 어느 단계에서도 변형되지 않습니다.
- Open product question: 회사명·직무를 결제 전 입력 단계에서 실제로 수집할지는 사용자 결정 대기 중입니다. 수집하면 지원 추적 카드·파일명·PRO 공고 대조가 모두 정확해지지만, 지금은 없는 정보를 지어내지 않는 쪽을 택했습니다.

## 2026-08-21 — Claude: 완성본을 `/result` 기본 화면으로 승격 + PRO 지원자료 업로드 연결 + 근거 없는 대조 강제 제거

- Agent/session: Claude, this session. 사용자가 PRO 실테스트 중 발견한 세 가지에 대해 각각 명시적으로 선택한 방향입니다.
- Status: completed locally; not committed at the time of writing.
- Protected baseline: `result-workspace-v2.*`(코덱스의 기존 결과 화면)는 **한 줄도 수정하지 않았습니다**. 파일을 그대로 두고 새 라우트 `/result/v2`를 만들어 언제든 볼 수 있게 했으며, 두 페이지 파일을 서로 바꾸면 승격 이전으로 즉시 복귀합니다. 다섯 개 비교 라우트도 모두 유지됩니다.
- Change and reason (1) 화면 승격: 결제 후 도착지와 완료 이메일이 모두 `/result`를 가리키는데, 그 화면은 탭 5개짜리 구버전이라 제출본 탭·DOCX·면접 리스크·새 주석이 하나도 없었습니다. 사용자가 "PRO에 제출본이 없다"고 느낀 원인이며 실제로는 QUICK도 같은 상태였습니다. `/result`가 `ResultWorkspaceComplete`를 그리도록 바꾸고, 로그인 상태에서 `analysisRunId`가 없으면 최신 결과를 보여주는 완성본 라우트의 동작을 그대로 가져왔습니다. 네비게이션은 `완성본(기본)` / `이전 버전`으로 이름을 바꿨습니다.
- Change and reason (2) 지원자료 업로드: PRO 입력 화면의 이력서·경력기술서·포트폴리오 버튼 3개가 `disabled`로 죽어 있어, 유료 사용자가 이력서를 넣을 방법이 "추가 정보" 자유 첨부뿐이었고 그 경우 AI에게는 `포트폴리오·추가 경험`으로 전달됐습니다. `candidateMaterialAttachmentSchema`(kind 포함)와 `MaterialUpload` 컴포넌트를 추가해 종류별로 올리고, `buildApplicationCasePlan`이 각각 `RESUME`/`CAREER_DOCUMENT`/`PORTFOLIO` 문서로 저장하게 했습니다. DB `document_kind` enum에 이미 세 값이 있어 마이그레이션은 필요 없었고, `getRunningContext`가 이 세 종류를 supporting set으로 분류하므로 **PRO 실행에서만 읽힙니다**(QUICK은 기존대로 자동 제외).
- Change and reason (3) 빈 배열 허용: `proOutputShape`가 `requirementMatches.min(1)`, `interviewQuestions.min(3)`, `interviewRisks.min(2)`로 최소 개수를 강제하고 있어, 채용공고에 "11" 한 글자만 넣어도 모델이 요구사항을 반드시 지어내야 했습니다. 결과 화면에는 "채용공고 내용이 충분하지 않아 대조하지 못했습니다" 안내가 이미 있었지만 스키마 때문에 PRO에서는 절대 뜨지 않았습니다. 최소 개수를 제거하고, 근거가 없으면 빈 배열로 두라는 지시를 프롬프트에 명시했습니다. 제품 1원칙(근거 없는 것은 만들지 않는다) 위반을 없애는 수정입니다.
- Files/branch: 신규 `src/app/result/v2/page.tsx`, `src/components/material-upload.tsx` + `.module.css`; 수정 `src/app/result/page.tsx`, `src/components/result-variant-nav.tsx`, `src/components/pro-input-page.tsx`, `src/components/application-case-handoff.tsx`, `src/domain/candidate-material.ts`, `src/application/application-case-handoff.ts` + 테스트, `src/server/ai/quick/schema.ts` + 테스트, `src/server/ai/quick/prompt.ts` on dirty `main`.
- Backward compatibility: `materialAttachments`는 `.default([])`라 업로드 이전에 저장된 sessionStorage 초안과 서버 요청 모두 그대로 파싱됩니다(테스트로 확인). 스키마에서 최소 개수를 없앤 것은 저장된 결과 해석에 영향이 없습니다.
- Validation: 전체 `npx vitest run` 210 passed(이번 추가 4건 포함); `npx tsc --noEmit` clean; `npx eslint src` 전체 clean. 로컬에서 `/result`가 6탭 완성본(제출본·DOCX 포함)을 그리고 `/result/v2`가 구버전을 유지하는 것, `/pro/polish`에서 이력서·경력기술서·포트폴리오 업로드 버튼이 살아난 것을 확인했습니다.
- Rollback/recovery reference: (1) `src/app/result/page.tsx`와 `src/app/result/v2/page.tsx`의 내용을 맞바꾸고 네비게이션 두 줄을 되돌리면 승격 취소, (2) `MaterialUpload` 사용부를 이전 `disabled` 버튼 4개로 되돌리고 `materialAttachments` 필드/문서 분기를 제거하면 업로드 취소, (3) `proOutputShape`에 `.min(1)`/`.min(3)`/`.min(2)`를 다시 붙이고 프롬프트 지시 2줄을 제거하면 3번 취소. 저장된 결과 데이터는 어느 경우에도 손실되지 않습니다.
- User decision: 사용자가 세 항목 모두 추천안(승격 / 업로드 연결 / 빈 배열 허용)을 선택했습니다. 가격표가 PRO로 파는 항목 중 프롬프트 지시가 아직 없는 것들(자료 간 충돌 검사, 문항별 소재 추천, 경험 자동 추출, 부족 정보 AI 질문, 문항별 개요 생성, 기업명·직무명 오류 확인)은 미구현 상태로 남아 있으며 별도 결정 대기 중입니다.

## 2026-08-21 — Claude: 공고 링크 파싱 버그 수정 + 실험적 링크 본문 수집 + 지원 회사·직무 입력

- Agent/session: Claude, this session. 사용자가 사람인 공고 링크로 PRO를 실테스트하다 "공고 분석을 못 한다"고 보고한 건에 대한 대응이며, 세 방향 모두 사용자가 선택했습니다.
- Status: completed locally.
- Protected baseline: 결과 화면 변형 6종, QUICK/PRO 분석 파이프라인의 기존 동작, 코덱스의 `result-workspace-v2.*` — 수정하지 않았습니다.
- Change and reason (1) 링크 파싱 버그: `job-posting-input.tsx`의 URL 정규식이 `https?:\/\/[^\s]+`였습니다. `[^\s]`에는 한글도 포함되므로 링크 뒤에 공백 없이 직무명을 타이핑하면 그 글자가 URL의 일부로 흡수되고 본문에서는 사라졌습니다(사용자가 "안전관리자가 안 넣어진다"고 한 현상). 실제 URL은 한글을 퍼센트 인코딩하므로 URL 문자 집합으로 매칭 범위를 좁혀 해결했습니다. 파싱 로직은 `src/domain/job-posting-source.ts`로 분리해 테스트했습니다.
- Change and reason (2) 실험적 링크 본문 수집: 이 앱은 공고 URL을 한 번도 열지 않고 URL 문자열 자체를 공고 본문으로 저장했습니다(`normalizedText: text || url`). 그래서 링크만 넣으면 AI가 주소 한 줄을 공고로 받아 요구사항을 하나도 못 뽑았습니다. `POST /api/job-postings/fetch`를 추가해 공개 공고 페이지를 읽고 텍스트를 돌려줍니다. 가져온 텍스트는 저장하거나 바로 분석하지 않고 **입력칸에 채워 넣어 사용자가 확인·수정**하게 합니다. 사람인은 상세 요강이 스크립트로 채워지는 iframe에 있어 원본 주소만 읽으면 사이트 메뉴만 나오므로, `rec_idx` 기반 `view-detail` 주소를 먼저 시도합니다. 추출 결과가 짧거나 공고 신호어가 부족하면 UNREADABLE로 처리하고 본문 붙여넣기를 요청합니다(이미지 공고·스크립트 렌더 공고는 원래 읽히지 않습니다).
- Security note: 이 라우트는 로그인 전에 쓰이므로 same-origin 검사, http/https 제한, localhost·사설 IP·링크로컬(169.254.x) 차단, 12초 타임아웃, 3MB 상한, content-type 제한을 걸었습니다. 응답은 추출된 텍스트만 반환하며 원본 응답을 그대로 흘리지 않습니다.
- Change and reason (3) 지원 회사·직무: `application_cases.company_name/role_name`과 handoff 스키마에는 이미 필드가 있었지만 입력 화면이 값을 받지 않았고 분석도 읽지 않았습니다. PRO 입력에 두 칸을 추가하고 게스트 초안→handoff→`analysis_cases`→`getRunningContext`→프롬프트→결과 문서까지 연결했습니다. 대기업 공고 하나에 직무가 여러 개일 때(이번 공고는 4개) 지정한 직무의 요구사항만 대조하도록 지시문을 넣었습니다. 회사명이 있으면 결과 화면 제목도 파일명 대신 실제 회사명이 됩니다.
- Change and reason (4) 링크만 입력 시 경고: 사용자 선택에 따라 차단이 아니라 경고입니다. 결제 전 입력 화면에서 "링크만으로는 공고 내용을 읽을 수 없다"고 알리고 진행은 허용합니다.
- Files/branch: 신규 `src/domain/job-posting-source.ts` + 테스트, `src/server/job-posting/extract-posting-text.ts` + 테스트, `src/app/api/job-postings/fetch/route.ts`; 수정 `src/components/job-posting-input.tsx` + `.module.css`, `src/components/pro-input-page.tsx` + `.module.css`, `src/components/application-case-handoff.tsx`, `src/lib/guest-draft.ts`, `src/application/analysis-contract.ts`, `src/server/analysis/supabase-quick-analysis-run-repository.ts`, `src/server/ai/quick/prompt.ts`, `src/server/ai/quick/provider.ts` on `main`.
- Validation: 전체 `npx vitest run` 226 passed; `npx tsc --noEmit` clean; `npx eslint src` 전체 clean. 사용자가 준 실제 사람인 공고(rec_idx=54715018, 롯데테크 4개 직무)로 실측했습니다 — 원본 주소는 사이트 메뉴만 나오고, `view-detail` 주소에서 모집분야·자격요건·필수사항·주요업무·우대사항·근무조건이 1,088자 텍스트로 나옵니다. 개발 서버에서 `링크 내용 불러오기`를 눌러 입력칸이 193자(링크만)에서 1,676자(링크+모집요강)로 채워지고 안내 문구가 뜨는 것, 채우고 나면 링크 전용 경고가 사라지는 것, 지원 회사·직무 칸과 이력서·경력기술서·포트폴리오 업로드가 모두 렌더되는 것을 확인했습니다.
- Rollback/recovery reference: (1) `job-posting-source.ts`를 지우고 이전 정규식/`update()`를 복원, (2) fetch 라우트와 `server/job-posting/`을 지우고 `job-posting-input.tsx`의 버튼·상태·메시지를 제거, (3) 회사·직무는 각 파일의 추가분(입력 두 칸, 초안 두 필드, 계약 두 필드, 저장소 조회 한 줄, 프롬프트 분기, `describeSubject` 인자)을 되돌리면 됩니다. 저장된 결과와 진행 중인 분석에는 영향이 없습니다.
- Known limits: 링크 수집은 실험 기능입니다. 이미지로 올라온 공고, 스크립트로만 그려지는 공고, 크롤링을 차단하는 사이트에서는 실패하며 그때는 본문 붙여넣기를 요청합니다. 사람인 외 다른 채용 사이트는 사이트별 처리 없이 일반 추출만 시도합니다. 채용 사이트 약관에 따라 자동 수집이 제한될 수 있으므로 정식 기능화 전에 확인이 필요합니다.
- User decision: 사용자가 "링크만 넣으면 경고 후 진행 허용", "링크 수집은 일단 실험적으로 만들어보기", "회사명 + 직무 한 줄씩 받기"를 선택했습니다.

## 2026-08-21 — Claude: 공고·자료를 첨삭에 반영 + 지원자료 분량 상한 + Guided CREATE 흐름

- Agent/session: Claude, this session. 사용자가 "공고를 참고해서 첨삭에 도움이 되길 원하는데 지금은 공고·경험 분석 탭에서만 쓰이는 것 같다"고 지적한 뒤 A·B·D를 지시했습니다(C 결제 전 차단은 "런칭 전이니 바로 D로" 하라는 판단으로 생략).
- Status: completed locally.
- Protected baseline: 결과 화면 6종, 코덱스의 `result-workspace-v2.*`, 기존 결제·분석 파이프라인 구조 — 수정하지 않았습니다. CREATE 입력 화면의 기존 안내 섹션(`createEmpty`)만 Guided 폼으로 교체했고, 나머지 모드(BUILD/POLISH) 화면은 그대로입니다.
- Change and reason (A) 공고·자료를 첨삭에 반영: 프롬프트에서 채용공고를 언급하는 지시가 `requirementMatches`(공고·경험 분석 탭)에만 있었고, `revisedAnswer`를 만들 때 공고를 보라는 지시가 한 줄도 없었습니다. 지원자료도 BUILD 단계 문장에서만 언급돼 POLISH PRO는 이력서를 읽고도 쓰지 않았습니다. 공고가 있으면 "원문에 이미 있는 내용 중 공고가 요구하는 부분을 앞쪽에 배치하고 구체화, 공고에만 있고 원문에 근거 없는 자격·수치·용어는 절대 넣지 말 것, 근거 없는 요구는 consultingAdvice와 verificationQuestions로 남길 것, reasons에 공고 근거를 밝힐 것"을, 자료가 있으면 "자료에서 확인되는 사실로 뒷받침하되 자소서와 어긋나면 확인 질문으로 남길 것"을 지시합니다. 공고 키워드를 답변에 심는 방식(사용자가 고민한 3번)은 사실 위조가 되므로 채택하지 않았습니다. `QUICK_PROMPT_VERSION` `quick-1.4` → `quick-1.5`.
- Change and reason (B) 지원자료 분량 상한: `begin_quick_analysis`가 요금 계산 시 `purpose='PRIMARY'`만 세는데, 지원자료는 파일당 5만 자 × 라벨 10개 + 자유첨부 10개까지 프롬프트에 무제한으로 들어갔습니다. 최대 100만 자가 3만 자 요금으로 분석될 수 있는 구조였습니다. `SUPPORTING_CHARACTER_BUDGET = 30_000`을 두고 초과분은 자르며 "이후 내용은 생략했습니다"를 명시합니다. 자료 라벨에 파일명도 함께 표시합니다.
- Change and reason (D) Guided CREATE: PRO CREATE는 자소서 답변이 없으면 `PRIMARY` 문서가 만들어지지 않아 결제 후 `PRIMARY_DOCUMENT_REQUIRED`로 실패했습니다. 사용자가 기억하는 "항목을 순서대로 상호작용하며 채워가는" 흐름을 **AI 호출 없이** 구현했습니다. 10단계 폼(지원 계기 → 하고 싶은 일 → 경험① 소속/상황/행동/결과 → 경험② → 강점 → 입사 후 목표 → 문항 배정)으로 사실을 먼저 받고, 문항마다 쓸 소재를 골라 사실 메모를 조립해 각 문항의 `answer`로 넣습니다. 기존 1회 분석 파이프라인을 그대로 타므로 호출 횟수·가격 구조가 바뀌지 않습니다. CREATE 프롬프트에는 "원문은 완성된 글이 아니라 단계별 사실 메모이니 메모 문장을 그대로 옮기지 말고 문항에 답하는 완결된 문장을 새로 쓰라"를 추가했습니다. 입력 화면의 진행 차단 조건도 CREATE에 적용해, 문항과 소재 배정이 없으면 결제로 넘어가지 못합니다(C를 생략해도 결제 후 실패가 발생하지 않습니다).
- Files/branch: 신규 `src/domain/guided-create.ts` + 테스트, `src/components/guided-create-form.tsx` + `.module.css` + 테스트; 수정 `src/server/ai/quick/prompt.ts` + 테스트, `src/components/pro-input-page.tsx` on `main`.
- Cost note: (A)는 출력 토큰을 거의 늘리지 않고 지시문 몇 줄만 입력에 추가합니다. (B)는 오히려 입력 토큰의 상한을 만듭니다. (D)는 AI 호출을 전혀 추가하지 않습니다. 실제 증가분은 결과마다 저장되는 `analysisRun.inputTokens/outputTokens`로 실측할 수 있습니다.
- Validation: 전체 `npx vitest run` 243 passed(이번 추가 18건); `npx tsc --noEmit` clean; `npx eslint src` 전체 clean. 로컬 `/pro/create`에서 "처음부터 작성 · 1 / 10" 단계 폼, 문항 추가 영역, 사실만 사용한다는 고지가 렌더되는 것을 확인했습니다. 폼 상호작용(입력 → 초안 반영, 마지막 단계에서 소재를 붙이면 문항 answer가 사실 메모로 조립됨, 소재가 없을 때 안내)은 컴포넌트 테스트 5건으로 검증했습니다.
- Rollback/recovery reference: (A) 프롬프트의 `hasJobPosting`/`hasSupportingMaterials` 분기와 두 헬퍼를 제거하고 버전을 `quick-1.4`로 환원, (B) `buildSupportingSections`를 이전 인라인 `flatMap`으로 되돌리기, (D) `guided-create.*`와 `guided-create-form.*`를 삭제하고 `pro-input-page.tsx`의 CREATE 분기를 이전 `createEmpty` 섹션으로, 차단 조건을 `mode !== "CREATE" && !hasCoverLetterAnswer`로 되돌리기. 저장된 결과와 진행 중인 분석에는 영향이 없습니다.
- Known limits: Guided CREATE는 1단계입니다. 질문지가 고정이고, 공고·이력서를 읽어 문항별 소재를 AI가 추천하거나 부족한 사실을 되묻는 부분(가격표의 "문항별 소재 추천", "부족 정보 AI 질문", "문항별 개요 생성")은 아직 없습니다. 그 단계는 호출이 늘어나므로 가격 재검토가 필요합니다.
- User decision: 사용자가 A·B·D 진행을 지시했고, C(결제 전 차단)는 런칭 전이라는 이유로 생략하고 D로 바로 가라고 했습니다.

## 2026-08-22 — PRO 추가 경험 근거 검증 정합성 보정

- Agent/session: Codex, current session.
- Status: proposed.
- Protected baseline: current QUICK validation behavior and all existing result/dashboard variants.
- Change and reason: PRO already sends user-entered additional experience, resume, career-document, and portfolio text to the one analysis request, but the post-response validator checks only cover-letter text. A fact such as a user-entered work period or metric can therefore be treated as fabricated and block the run. Make the validator accept candidate facts found in PRO supporting material while never treating the job posting as a candidate-fact source; retain the existing strict QUICK behavior.
- Files/branch: planned focused edits to `src/server/ai/quick/validator.ts`, `provider.ts`, execution route, prompt wording, and targeted tests on `main`.
- Validation: pending targeted tests, TypeScript, and lint.
- Rollback/recovery reference: revert only this focused validator/request-context change; no schemas, database records, or stored user documents are changed.
- User decision: user explicitly requested the fix after reproducing a PRO failure with pasted additional experience information.

## 2026-08-22 — PRO 추가 경험 근거 검증 정합성 보정 (completed locally)

- Agent/session: Codex, current session.
- Status: active local change; not committed or deployed.
- Protected baseline: current QUICK validation behavior and all result/dashboard variants remain unchanged.
- Change and reason: PRO validation now accepts candidate facts and numeric values present in the submitted cover letter or PRO supporting materials. Job-posting text remains excluded from this fact source, so employer requirements cannot be turned into applicant experience. QUICK remains limited to the cover-letter source.
- Files/branch: `src/server/ai/quick/validator.ts`, `src/server/ai/quick/provider.ts`, `src/app/api/analysis-runs/quick/execute/route.ts`, `src/server/ai/quick/prompt.ts`, and new `src/server/ai/quick/validator.test.ts` on dirty `main`.
- Validation: targeted PRO/QUICK validation and prompt tests (13 passed), `npx tsc --noEmit`, targeted ESLint, and `git diff --check` passed.
- Rollback/recovery reference: revert only the files above; no migration, stored user data, API call count, or output schema changed.
- User decision: user approved the repair and asked whether it would add API/token cost. It reuses the existing single PRO request and existing 30,000-character supporting-material budget; it makes no additional OpenAI request.

## 2026-08-22 — Claude: 제출본 평가와 첨삭본의 일관성 (평가 먼저, 그다음 수정)

- Agent/session: Claude, this session. 사용자가 "제출본에서 좋은 표현이라 해놓고 최종 첨삭본에서는 삭제됐다"고 보고한 뒤, 어디까지 살릴지 함께 정리하고 진행 지시를 받았습니다.
- Status: completed locally.
- Protected baseline: 결과 화면 변형 전부, Guided CREATE, 결제·분석 파이프라인 구조 — 수정하지 않았습니다. **같은 시각 Codex가 작업 중인 `validator.ts`, `provider.ts`, `execute/route.ts`, `validator.test.ts`도 건드리지 않았습니다.**
- Codex와의 겹침: `prompt.ts`는 두 에이전트가 같은 시간대에 수정했습니다. Claude가 파일을 읽고 수정해 다시 쓰는 시점에 Codex의 지원자료 근거 문구(103행, "…담당 업무, 수치…" 및 근거 인용 문장)가 이미 들어 있었고, 그 줄은 그대로 보존했습니다(`git diff`로 확인). 커밋에는 그 한 줄이 함께 포함됩니다.
- Change and reason (1) 생성 순서: `quickRevisionSchema`에서 `originalAnnotations`를 `revisedAnswer` **앞으로** 옮겼습니다. 모델은 JSON 속성을 위에서 아래로 생성하므로, 지금까지는 수정본을 먼저 쓴 뒤 주석을 달았습니다. 그래서 이미 삭제한 문장을 "좋은 표현"이라고 칭찬하는 일이 구조적으로 가능했습니다. 순서만 바꾼 것이며 저장 형식·파싱·기존 데이터에는 영향이 없습니다.
- Change and reason (2) `good`의 정의를 좁힘: 기존 "이미 잘 쓴 표현"은 너무 느슨해 "나쁘지 않음"에도 붙었습니다. **"고칠 필요가 없어서 최종 첨삭본에 그대로 넣을 문장"**으로 좁히고, 뺄 문장이면 애초에 good을 주지 말라고 명시했습니다. 삭제 추천에 이미 적용된 엄격함("없어도 되는 문장이 아니라 두면 감점되는 문장")을 칭찬 쪽에도 맞춘 것입니다.
- Change and reason (3) 말없이 사라지는 문장 금지: good으로 표시한 내용은 수정본에 반드시 남기고, 원문에서 뺀 내용이 있으면 그 문장에 대한 주석을 만들어 comment에 왜 뺐는지 적게 했습니다. 삭제를 금지하지는 않습니다 — 설명 없는 삭제만 금지합니다. 사용자가 화난 지점은 삭제가 아니라 설명 없는 모순이었습니다.
- Change and reason (4) 대필 방지: 문항마다 원문 문장 중 최소 하나는 거의 그대로 유지하게 했습니다. "지원자가 쓴 문장이 하나도 남지 않은 첨삭본은 첨삭이 아니라 대필"이라는 기준을 프롬프트에 명시했습니다. 원문 전체가 사용 불가 수준이면 그 판단 이유를 consultingAdvice에 적게 했습니다. 이 제품이 무료 챗봇과 갈라서는 지점이라는 사용자 판단을 그대로 반영했습니다.
- Change and reason (5) 전체 정리 단계: 최종 첨삭본 탭은 문항별 첨삭을 재배치한 화면일 뿐 별도 산출물이 아닙니다. 그래서 전체를 다시 보는 일은 문항별 첨삭 안에서 일어나야 합니다. 모든 문항을 쓴 뒤 전체를 다시 읽고 문항 간 경험 중복을 조정하라는 지시를 마지막에 두었습니다. 호출을 2회로 늘리는 방안(첨삭 → 최종 정리)은 채택하지 않았습니다. 순서 지시만으로 어디까지 되는지 먼저 보고 판단하기로 했습니다.
- Cost note: 호출 횟수·출력 분량 변화 없음. 지시문 몇 줄이 입력에 추가될 뿐입니다. `QUICK_PROMPT_VERSION` `quick-1.5` → `quick-1.6`.
- Files/branch: `src/server/ai/quick/prompt.ts`(+ Codex 한 줄 포함), `src/server/ai/quick/schema.ts`(필드 순서만), `prompt.test.ts`, `schema.test.ts` on `main`.
- Validation: 전체 `npx vitest run` 251 passed(Codex의 `validator.test.ts` 포함); `npx tsc --noEmit` clean; `npx eslint src` 전체 clean. 두 에이전트의 변경이 함께 있는 상태로 통과했습니다.
- Rollback/recovery reference: `schema.ts`에서 `originalAnnotations`를 `revisedAnswer` 뒤로 되돌리고, `prompt.ts`에서 이번에 추가한 지시문 7줄을 제거한 뒤 `good` 정의를 이전 한 줄로 합치면 됩니다. 버전은 `quick-1.5`로 환원. 저장된 결과에는 영향이 없습니다.
- Known limits: 이 변경은 강제가 아니라 유도입니다. 필드 순서와 지시문으로 모델이 앞선 판단을 지키도록 만들지만 100%는 아닙니다. `good` 표현이 최종본에 남았는지 기계적으로 검사하는 장치는 아직 없습니다 — 한 번 돌려보고 실제 준수율을 본 뒤 검사 추가 여부를 정하기로 했습니다.
- User decision: 사용자가 "살리는 쪽이 맞다, 다 뜯어고치면 챗지피티와 다를 게 없다"고 방향을 정했고, 최종 첨삭본이 제출본 피드백을 참고해 정리되는 흐름이 맞다고 판단했습니다. 다른 부분은 손대지 말라고 명시했습니다.

## 2026-08-22 — Claude: 앱 전체 배율 1.25배 (브라우저 125% 확대와 동일)

- Agent/session: Claude, this session. 사용자가 "글자가 작다, 브라우저 100%에서 휠로 125% 하면 딱 맞는다, 전에 하드코딩 때문에 뒤죽박죽돼서 롤백했었다"며 롤백 준비를 전제로 요청했습니다.
- Status: completed locally.
- Protected baseline: 모든 화면의 레이아웃·색·간격 비율. **CSS 4,025개 px 값 중 단 하나도 수정하지 않았습니다.** 같은 시각 Codex가 작업 중인 `validator.ts`, `provider.ts`, `execute/route.ts`, `validator.test.ts`도 손대지 않았고 커밋에도 포함하지 않았습니다.
- Change and reason: 화면이 전부 절대 픽셀로 짜여 있어(27개 스타일시트, px 값 4,025개) 글자 크기를 숫자로 키우는 방식은 지난번에 실패한 그 방법입니다. 대신 `body{zoom:var(--app-scale)}` 한 줄로 브라우저의 ctrl+휠 확대와 동일한 효과를 냅니다 — 글자·여백·테두리·레이아웃이 같은 비율로 함께 커지므로 디자인이 어긋날 여지가 없습니다. 배율은 `:root{--app-scale:1.25}` 한 곳에서만 정합니다.
- 마케팅 홈(`.home-page`)은 자체 타이포그래피 조정(readability pass)이 이미 되어 있어 `zoom:calc(1 / 1.25)`로 배율을 상쇄해 기존 크기를 유지합니다.
- 브레이크포인트 보정: 미디어쿼리는 확대된 콘텐츠가 아니라 실제 창 너비를 측정합니다. 배율만 올리면 모바일 레이아웃이 창 4분의 1만큼 늦게 나타나 중간 너비에서 화면이 눌립니다. 그래서 `@media ... max-width:N px`의 N을 모두 1.25배 했습니다(39개 파일, 61곳). 숫자 치환 외에 다른 변경은 없으며 `git diff`로 확인했습니다.
- 부수 수정: 채용공고 입력창의 "공고 내용을 가져왔어요" 안내가 좌우 테두리에 붙던 문제(`.linkMessage`에 내부 여백이 없었음)를 고치고, 34px 고정 높이 푸터에 "링크 내용 불러오기" 버튼이 끼던 것을 줄바꿈 가능하도록 완화했습니다. 사용자가 지적한 그 지점입니다.
- Files/branch: `src/app/globals.css`(배율 3줄 + 브레이크포인트), `src/components/job-posting-input.module.css`(여백 수정 + 브레이크포인트), 나머지 37개 `*.module.css`(브레이크포인트 숫자만) on `main`.
- Validation: 전체 `npx vitest run` 251 passed; `npx tsc --noEmit` clean; 모든 CSS 파일 중괄호 균형 확인. 로컬에서 `zoom: 1.25` 적용 확인, **가로 스크롤 발생 없음**을 1265px / 1000px / 375px 세 너비에서 확인했습니다.
- Rollback/recovery reference: **이 커밋 하나만 `git revert` 하면 완전히 되돌아갑니다.** 전부 CSS이고 다른 커밋과 섞이지 않았습니다. 배율만 조절하려면 `globals.css`의 `--app-scale` 값 하나만 바꾸면 됩니다(단, 브레이크포인트는 1.25 기준으로 맞춰져 있으므로 크게 벗어난 값은 함께 조정 필요).
- Known issue (사전 존재, 미수정): `additional-info-input`의 파일 안내 문구가 375px 화면에서 이미 143px 넘쳐 잘리고 있었습니다(배율 적용 시 272px). 배율 때문에 생긴 문제가 아니며 Codex 담당 파일이라 건드리지 않았습니다. 별도 처리 필요.
- User decision: 사용자가 브라우저 125% 확대와 같은 느낌을 요청했고 롤백 가능성을 전제로 진행을 승인했습니다.

## 2026-08-22 — PRO 처음부터 작성 순차형 입력 흐름

- Agent/session: Codex, current session.
- Status: proposed.
- Protected baseline: BUILD/POLISH의 한 화면 입력 흐름, 기존 Guided CREATE의 사실 수집·문항 배정 기능, 모든 자료 업로드 기능.
- Change and reason: user explicitly requested that only PRO CREATE become a left-progress, one-primary-task-per-step flow: optional posting, optional company/role, optional labelled materials, freeform/attachment experience capture, existing guided fact questions, and question/direction confirmation. Preserve every existing input capability but avoid presenting them all at once. No step will call OpenAI; the existing one paid analysis remains the only model request.
- Files/branch: planned focused CREATE-only component/style additions and a small `pro-input-page.tsx` composition change on dirty `main`; BUILD/POLISH remain unchanged.
- Validation: pending component tests, TypeScript, lint, and local route verification.
- Rollback/recovery reference: remove only the new CREATE wizard component/style and restore the prior CREATE branch; candidate data structures, handoff, analysis schema, and API behavior remain unchanged.
- User decision: explicitly approved implementation and asked for an API-cost/price assessment; no paid API call or deployment is authorized.

## 2026-08-22 — PRO CREATE 순차형 비교 화면

- Agent/session: Codex, current session.
- Status: proposed variant.
- Protected baseline: existing `/pro/create` Guided CREATE implementation, BUILD/POLISH flows, and all input/upload capabilities.
- Change and reason: user selected an isolated comparison route rather than replacing the current CREATE screen. Add `/pro/create-wizard` with left progress, one primary input group per step, optional posting/material steps, guided facts/questions, and the same single analysis handoff.
- Files/branch: planned new route/component/style only; no rewrite of the active `pro-input-page.tsx`.
- Validation: pending.
- Rollback/recovery reference: remove only the new wizard route/component/style.
- User decision: explicitly chose the separate comparison implementation.

## 2026-08-22 — PRO CREATE 순차형 비교 화면 (completed locally)

- Agent/session: Codex, current session.
- Status: variant; active locally at `/pro/create-wizard`, not committed or deployed.
- Change and reason: added a separate six-step wizard for applicants who cannot start from a finished self-introduction. Posting, target, materials, and freeform experience can all be skipped; the existing guided fact/question step remains the required factual basis before the same analysis-preparation handoff.
- Files/branch: `src/app/pro/create-wizard/page.tsx`, `src/components/pro-create-wizard.tsx`, and `.module.css`.
- Validation: `npx tsc --noEmit` and targeted ESLint passed.
- Rollback/recovery reference: remove only the three new wizard files; `/pro/create` remains unchanged.
- User decision: user selected this separate comparison route.

## 2026-08-22 — Claude: PRO BUILD가 실제로 채우게 함 (서버 측)

- Agent/session: Claude, this session. 사용자가 "300자만 쓴 사람, 문항 하나 비워둔 사람은 어느 유형이냐, 지금은 작성 자체를 안 해주지 않느냐"고 지적한 뒤, 세 유형을 실제로 다르게 만들자는 방향을 확정하고 지시했습니다.
- Status: 서버 측 완료. 화면 표시(제안 색 구분 + 복사 분리)는 후속 작업으로 남음.
- 새 결정 문서: `docs/build-mode-fill-in-decision.md`를 새로 만들었습니다. 사용자 지시대로 **기존 md는 한 글자도 수정하지 않았습니다.** 이 프로젝트 관행(문서가 §로 이전 결정을 대체 선언)을 따라, `docs/create-mode-and-pricing-decision.md` §2의 "QUICK — 작성 중인 글의 내용 보완" 항목의 의미를 새 문서 §8-1에서 좁혔습니다(QUICK BUILD는 지적만, PRO BUILD는 실제 채우기). 출력 분량 상한(§6)과 채우기 허용 조건(§5)은 기존 어느 문서에도 없던 항목이라 신규 추가했습니다.
- Protected baseline: CREATE(1유형)와 POLISH(3유형)의 동작. **POLISH는 이미 원하는 동작을 하고 있어 옮기거나 복제하지 않았습니다.** 두 모드의 지시문이 바뀌지 않았음을 테스트로 고정했습니다.
- Change and reason: BUILD는 이름이 "내용 보완"인데 실제로는 POLISH와 거의 같게 동작했습니다. 빈 문항은 `getAnalysisQuestions`의 필터에서 제거됐고, 공통 문장 "억지로 분량을 채우지 말고"가 BUILD도 함께 묶고 있었기 때문입니다. PRO BUILD에서만 빈 문항을 분석 대상에 포함하고 목표 글자 수에 가깝게 채우도록 했습니다.
- 채우기 규칙: 빈칸·대괄호 표기를 남기지 않고 완결된 글을 쓰되, 제공되지 않은 수치·기간·회사명·자격증·직함·고유명사는 절대 넣지 않습니다. 대신 지원자가 밝힌 행동·과정·태도·배운 점으로 문장을 완결합니다(프롬프트에 예시 포함). 이 규칙은 검증기의 `NEW_NUMBER` 차단과도 맞물려, 새로 채운 문장 때문에 유료 분석이 실패하는 일을 구조적으로 막습니다.
- 채우기 조건: 문항 구분이 없는 통짜 붙여넣기(제목·질문이 모두 빈 단일 문항)에는 제공하지 않습니다. 어느 문항이 부족한지 판단할 근거가 없고 분량 제어가 불가능하기 때문입니다.
- 격리 방법: 변경 파일은 `questions.ts`와 `prompt.ts` **두 개뿐**입니다. 빈 문항 필터와 미작성 문항 조회를 공통 함수 안에서 모드 인식하도록 바꿔, 호출부 5곳(프롬프트 2, 프로바이더 1, 검증기 1, 안내문 1)이 자동으로 따라오게 했습니다. 덕분에 **Codex가 작업 중인 `provider.ts`·`validator.ts`·실행 라우트를 건드리지 않았습니다.** 공통 문장인 목표 글자 수 지시문은 수정하지 않고 모드별로 분기했습니다(수정하면 POLISH가 함께 바뀜).
- Files/branch: `src/server/ai/quick/questions.ts`, `src/server/ai/quick/prompt.ts`(`QUICK_PROMPT_VERSION` `quick-1.6` → `quick-1.7`), `src/server/ai/quick/prompt.test.ts`, 신규 `docs/build-mode-fill-in-decision.md` on `main`.
- Validation: 전체 `npx vitest run` 258 passed(이번 추가 7건). `npx tsc --noEmit` clean. `npx eslint src`는 경고 1건이 남지만 Codex의 신규 파일 `pro-create-wizard.tsx`의 것으로 이번 변경과 무관합니다. POLISH·CREATE 지시문 불변 테스트 2건이 회귀를 막습니다.
- 남은 작업: 화면에서 채운 부분을 색으로 구분하고 "기본 복사 = 확인된 내용만 / 제안 포함 복사 = 별도 버튼"으로 나누는 작업. 결과 문서에 `writingMode`가 없어 화면이 BUILD 결과를 식별할 수 없으므로 `result-document.ts`와 `provider.ts` 수정이 필요합니다. `provider.ts`는 Codex 미커밋 변경이 있어 충돌을 피해 다음으로 미뤘습니다.
- Codex 동시 작업 알림: 이번 세션 중 Codex가 `src/components/pro-create-wizard.tsx`, `.module.css`, `src/app/pro/create-wizard/`를 새로 만들었습니다(미커밋). Claude의 Guided CREATE(`guided-create-form.tsx`, `/pro/create`)와 **같은 1유형 영역**입니다. 두 구현이 공존하는 상태이므로 사용자 확인이 필요합니다.
- Rollback/recovery reference: 이 커밋 하나를 revert하면 됩니다. 스키마·DB·가격·결제 흐름을 변경하지 않았고 저장된 결과에도 영향이 없습니다.
- User decision: 사용자가 세 유형을 다르게 만들되 가격은 셋 다 같은 PRO 가격으로 유지하고, 최종 첨삭본은 빈칸 없이 꽉 채워야 한다고 결정했습니다.

## 2026-08-22 — Claude: Codex 진행분 인수 커밋

- Agent/session: Claude, 사용자 지시("이 부분 이어받아서 일단 커밋 한번 하고")로 Codex의 미커밋 작업을 대신 커밋했습니다.
- Status: committed. 코드 내용은 수정하지 않고 있는 그대로 커밋했습니다.
- 인수한 내용: (1) PRO 근거 검증 범위 확대 — `validateQuickAnalysis`가 문항 목록 대신 요청 전체를 받아, PRO에서는 이력서·경력기술서·포트폴리오·추가 경험까지 사실 출처로 인정하되 채용공고는 제외합니다(회사 요구사항이 지원자 경험으로 둔갑하지 않게). QUICK은 자소서 원문으로 한정한 기존 동작 유지. (2) `provider.ts`와 실행 라우트가 요청을 그대로 넘기도록 호출부 수정. (3) 신규 `validator.test.ts`. (4) 신규 `/pro/create-wizard` 라우트와 `pro-create-wizard.tsx` 스텁 — Claude의 `GuidedCreateForm`·`MaterialUpload`를 재사용해 단계 위저드로 감싸는 구조이며, 기존 `/pro/create`를 대체하지 않고 별도 라우트로 존재합니다.
- 상호작용 확인: Codex의 검증기가 내부에서 `getAnalysisQuestions(request)`를 호출하는데, 같은 시각 Claude가 그 함수를 PRO BUILD에서 빈 문항을 포함하도록 바꿨습니다. 두 변경이 맞물려 **PRO BUILD가 채운 문항도 동일한 근거 검증을 받습니다.** 의도한 조합이며 전체 258개 테스트가 통과합니다.
- Validation: `npx vitest run` 258 passed, `npx tsc --noEmit` clean. `npx eslint src` 경고 1건이 `pro-create-wizard.tsx`에 남아 있으나(`location.assign`) Codex 진행 중 파일이라 수정하지 않았습니다.
- Rollback/recovery reference: 이 커밋을 revert하면 Codex 작업분 전체가 미커밋 상태로 돌아갑니다. 스키마·DB 변경은 없습니다.
- User decision: 사용자가 인수 커밋과 후속 작업 계속을 지시했습니다.

## 2026-08-22 — Claude: CREATE 지시문 충돌 해소 + BUILD 채운 부분 화면 표시

- Agent/session: Claude, 사용자 지시로 인수 커밋 후 후속 작업 진행.
- Status: completed.
- Change (1) CREATE 충돌 해소: 전날 추가한 "각 문항에서 원문 문장 중 최소 하나는 거의 그대로 유지하세요"가 모드 분기 없이 전 모드에 걸려 있었습니다. CREATE에서는 "원문"이 Guided 폼에 입력한 사실 메모(`[지원 계기]` 머리말 포함)이고, CREATE 자체 지시문은 "메모 문장을 그대로 옮기지 말라"고 말합니다. 두 지시가 정면 충돌해 메모 문장이 결과에 그대로 박힐 수 있었습니다. CREATE만 이 규칙에서 제외하고, POLISH에는 유지되는지 함께 검사하는 테스트를 추가했습니다. `QUICK_PROMPT_VERSION` `quick-1.7` → `quick-1.8`.
- Change (2) 작성 단계 기록: 결과 문서에 `writingMode`가 없어 화면이 BUILD 결과를 식별할 수 없었습니다. `resultDocumentSchema`에 `.default("POLISH")`로 추가하고 프로바이더가 저장하게 했습니다. 기존 저장 결과는 기본값으로 파싱되므로 영향이 없습니다. (Codex 인수 커밋이 끝나 `provider.ts` 충돌 위험이 해소된 뒤 진행했습니다.)
- Change (3) 채운 부분 표시: BUILD 결과의 문항별 첨삭에서 새로 채운 구간을 파란 배경으로 표시하고 범례를 붙였습니다. 표시 구간은 이미 있는 `diffText`로 계산하므로 새로 저장하는 데이터가 없습니다.
- 설계 정정: 결정 문서 §4의 초기 안("기본 복사 = 확인된 내용만, 제안 포함은 별도 버튼")을 폐기하고, **복사·다운로드에서 제안을 빼지 않는 것**으로 대체했습니다. 채운 부분을 덜어내면 다시 미완성 글이 되어 기능의 존재 이유를 무효화하기 때문입니다. 사용자의 "최종 첨삭본은 빈칸 없이 꽉 되어야 한다"는 결정과 정합합니다. 대신 최종 첨삭본 상단에 제안 포함 사실과 확인 위치를 고정 안내로 띄웁니다. 책임 소재는 버튼 분리가 아니라 §3 채우기 규칙(없는 수치·고유명사 금지)이 집니다.
- Files/branch: `src/server/ai/quick/prompt.ts` + 테스트, `src/domain/result-document.ts`, `src/server/ai/quick/provider.ts`(1줄 추가), `src/fixtures/result-document.ts`, `src/components/result-workspace-complete.tsx` + `.module.css` + 테스트, `docs/build-mode-fill-in-decision.md`(§4 대체) on `main`.
- Validation: 전체 `npx vitest run` 262 passed(이번 추가 4건). `npx tsc --noEmit` clean. `npx eslint src` 오류 0건(경고 1건은 Codex의 `pro-create-wizard.tsx`).
- Rollback/recovery reference: 커밋 revert. `writingMode`는 기본값이 있어 되돌려도 저장된 결과가 깨지지 않습니다.
- User decision: 사용자가 인수 커밋 후 후속 작업 계속을 지시했고, 최종 첨삭본은 빈칸 없이 완결되어야 한다고 결정했습니다.

## 2026-08-22 — Claude: 문항 구분 안 된 초안 경고 + 글자 수 표시 오해 수정

- Agent/session: Claude. 사용자가 PRO BUILD 테스트 중 "전체 내용 붙여넣기에서 그대로 결제로 넘어간다", "12,000자를 다 채우라는 거냐"고 보고한 건입니다.
- Status: completed.
- Change (1) 문항 구분 경고: `docs/build-mode-fill-in-decision.md` §5에 "문항 구분이 없으면 채우기를 제공하지 않고 문항 구분 확인을 먼저 요청한다"고 적어 놓고 **서버 측 제한만 구현하고 입력 화면 안내를 만들지 않았습니다.** 그 결과 통짜로 붙여넣은 사용자가 아무 경고 없이 결제까지 진행한 뒤, 채워지지 않은 결과를 받게 되는 상태였습니다. 문서와 구현의 불일치입니다. 입력 화면에서 `splitCoverLetterDraft`로 실제 분리 여부를 미리 계산해, BUILD이면서 나뉘지 않는 초안일 때 안내를 띄웁니다. 링크만 입력했을 때와 같은 선례에 따라 **차단이 아니라 경고**이며 진행은 허용합니다.
- Change (2) 글자 수 표시: 추가 정보 입력칸이 `직접 입력 0 / 12,000자`로 표시돼 목표 분량처럼 읽혔습니다. 자기소개서 분량과 무관한 자유 메모 상한인데 오해를 유발했습니다. `직접 입력 0자 · 최대 12,000자`로 바꿔 상한임을 분명히 했습니다.
- Files/branch: `src/components/pro-input-page.tsx`, `src/components/additional-info-input.tsx` on `main`.
- Validation: 전체 `npx vitest run` 262 passed, `npx tsc --noEmit` clean, 대상 파일 ESLint clean.
- Rollback/recovery reference: 커밋 revert. 상태 계산과 문구 추가뿐이며 저장 데이터·프롬프트·스키마 변경 없음.
- User decision: 사용자가 두 현상을 버그로 보고했고, 경고 방식은 링크 전용 입력 때 정한 선례(경고 후 진행 허용)를 따랐습니다.

## 2026-08-22 — Claude: Guided CREATE 질문 순서·소재 선택·질문 전제 수정

- Agent/session: Claude. 사용자가 앞서 받은 진단 여섯 가지 중 즉시 가능한 셋을 수정하라고 지시했습니다.
- Status: completed. 나머지 셋(경험 개수 유연화, 경험② 단계 분리, 이력서 참조)은 미착수.
- Change (1) 문항을 1단계로: 무엇을 물을지는 자소서 문항에 달려 있는데, 문항 입력이 폼 아래 상시 영역에 있고 배정은 마지막 단계였습니다. 순서가 뒤집혀 있었습니다. 문항 입력을 첫 단계로 올리고 그 단계에서만 표시합니다.
- Change (2) 경험 종류 먼저 고르기: "가장 자신 있는 경험 하나를 골라 주세요"는 자소서를 못 쓰는 사람에게 백지를 다시 내미는 질문입니다. PRO 입력 화면이 이미 쓰는 15종 목록을 칩으로 먼저 보여주고 고르게 했습니다. `guidedExperienceSchema`에 `category`를 `.default("")`로 추가했으므로 이전 초안도 그대로 파싱됩니다.
- Change (3) 상황 질문 전제 완화: "그때 어떤 문제나 과제가 있었나요?"는 문제 해결형 경험을 전제합니다. 꾸준히 한 것, 처음 배운 것, 사람을 설득한 것에는 맞지 않고, 없는 문제를 지어내게 만드는 입구가 됩니다. "무엇이 어려웠거나, 무엇을 새로 해야 했나요?"로 넓혔습니다.
- Files/branch: `src/domain/guided-create.ts` + 테스트, `src/components/guided-create-form.tsx` + `.module.css` + 테스트 on `main`.
- Codex 영향: Codex의 `/pro/create-wizard`가 이 폼을 감싸 쓰므로 변경이 그쪽 화면에도 그대로 반영됩니다. 폼 바깥 구조는 건드리지 않았습니다.
- Validation: 전체 `npx vitest run` 264 passed(이번 추가 3건), `npx tsc --noEmit` clean, ESLint 오류 0건.
- Rollback/recovery reference: 커밋 revert. `category`는 기본값이 있어 되돌려도 저장된 초안이 깨지지 않습니다.
- User decision: 사용자가 진단 여섯 가지 중 셋을 지금 수정하라고 지시했습니다.

## 2026-08-22 — Claude: QUICK 포함 한도 8,000자 + Guided CREATE 경험 개수 자유화

- Agent/session: Claude. 사용자가 한도 조정과 CREATE 폼 나머지 수정을 지시했습니다.
- Status: completed. CREATE 진단 6건 중 5건 완료, 남은 1건은 "이력서를 참조해 이미 아는 내용을 다시 묻지 않기"(AI 호출 증가 → 가격 재검토 필요).
- Change (1) QUICK 포함 한도 12,000 → 8,000자: 공백 제외 기준으로 한국 자소서의 현실 최대는 문항 제목까지 포함해 약 6,000자입니다(7문항 × 700자 + 오버헤드). 12,000은 그 두 배로, 아무도 쓰지 않는 여유를 가격에 반영하고 있었습니다. 8,000은 최장 현실 케이스 대비 약 30% 여유입니다. 사용자가 제안한 6,000은 공기업 5~7문항 자소서가 정확히 걸리는 지점이라 채택하지 않았습니다. **한도는 올리기 쉽고 낮추기 어려우므로(쓰던 사용자가 막힘) 실사용자가 0인 지금 조정했습니다.** 초과 시 7,000자당 2,900원 추가 과금 구조는 그대로입니다. PRO 30,000자는 초과 시 동작이 달라(추가 결제가 아닌 `needsScopeReview`) 별도 판단으로 남겼습니다.
- Change (2) 경험을 고정 2개에서 목록으로: `experienceOne`/`experienceTwo` 두 칸이 고정이라 문항이 3~4개인 자소서에서 같은 경험을 재탕하게 됐습니다. 그건 이 제품이 "문항 간 경험 중복"이라고 지적하는 바로 그 결함입니다. `experiences` 배열(최대 5개)로 바꾸고, 소재 식별자를 `experience-0` 형태로 위치 기반으로 만들었습니다.
- Change (3) 모든 경험을 같은 방식으로 질문: 첫 경험은 4단계로 나눠 묻고 두 번째는 한 화면에 몰아넣어, "두 번째는 덜 중요하다"는 인상을 줬습니다. 실제로는 두 번째가 더 좋은 소재인 경우가 많습니다. 단계를 `buildGuidedSteps(draft)`로 초안에서 생성해 경험마다 동일한 4단계를 부여하고, 마지막 경험의 끝에서만 "경험 하나 더 추가하기"를 제안합니다. 추가하면 4단계가 함께 늘고 바로 그 첫 단계로 이동합니다.
- 하위 호환 주의: 게스트 초안(sessionStorage)에 저장된 이전 형식(`experienceOne`/`experienceTwo`)은 새 스키마에서 무시됩니다. 진행 중이던 세션의 경험 입력이 비워질 수 있습니다. 실사용자가 없어 마이그레이션은 넣지 않았습니다.
- Files/branch: `src/domain/usage-entitlement.ts` + 테스트, `src/domain/guided-create.ts` + 테스트, `src/components/guided-create-form.tsx` + `.module.css` + 테스트 on `main`.
- Codex 영향: `/pro/create-wizard`가 이 폼을 감싸 쓰므로 변경이 그대로 반영됩니다.
- Validation: 전체 `npx vitest run` 267 passed(이번 추가 4건), `npx tsc --noEmit` clean, ESLint 오류 0건. 로컬 `/pro/create`에서 1단계가 문항 입력이고 총 10단계로 렌더되는 것을 확인했습니다.
- Rollback/recovery reference: 커밋 revert. 한도는 상수 한 줄이며, 저장된 분석 결과나 결제 이력에는 영향이 없습니다.
- User decision: 사용자가 8,000자 채택과 나머지 폼 수정을 지시했습니다.

## 2026-08-22 — Claude: PRO BUILD 분석 실패(AI_OUTPUT_VALIDATION_FAILED) 원인 수정

- Agent/session: Claude. 사용자가 PRO BUILD 실행 중 `AI_OUTPUT_VALIDATION_FAILED`로 분석이 막히고 재시도 2/3까지 간 상태를 보고했습니다.
- Status: completed. 재시도 전에 배포되어야 효과가 있습니다.
- 원인: 프롬프트와 검증기가 정면으로 모순돼 있었습니다. 검증기는 `evidenceQuote`가 **지원자가 제출한 글**에서 확인되지 않으면 `INVALID_EVIDENCE`를 내고, 이 코드는 차단 코드라 분석 전체가 실패합니다. 그리고 채용공고는 근거 출처에서 **의도적으로 제외**되어 있습니다(회사 요구가 지원자 경험으로 둔갑하지 않게 — Codex가 넣은 규칙). 그런데 Claude가 넣은 지시문은 "공고를 근거로 문장을 바꾼 경우 reasons에 공고의 어느 요구 때문인지 밝히고 evidenceQuote에는 원문 근거를 그대로 넣으세요"라고 해서, 모델이 공고 문장을 인용하도록 유도하고 있었습니다. **지시를 따르면 차단되는 상태**였습니다.
- 2차 원인: BUILD가 채우는 빈 문항에는 인용할 자기 원문이 없는데, 스키마는 모든 revision에 `reasons` 최소 1개와 `evidenceQuote`를 요구합니다. 인용할 것이 없으니 모델이 만들어 내고, 그것이 소스에서 확인되지 않아 같은 차단으로 이어집니다.
- Change: (1) 인용 가능한 출처를 명시하는 규칙 3줄을 전 모드 공통 위치에 추가 — 자소서 답변과 제출한 지원자료만 가능, 채용공고 불가, 방금 새로 쓴 문장 불가. (2) 공고 관련 지시문을 "reason 본문에서 공고 요구를 설명하고, evidenceQuote에는 그와 연결한 지원자 원문을 넣으라"로 교체. (3) 빈 문항 전용 규칙 추가 — 다른 문항의 답변이나 지원자료에서 인용하고, 인용할 것이 전혀 없으면 그 문항은 채우지 말고 무엇을 알려주면 채울 수 있는지 consultingAdvice에 적으라. `QUICK_PROMPT_VERSION` `quick-1.8` → `quick-1.9`.
- 재시도에 대한 주의: 실행 라우트의 백그라운드 경로는 검증 실패 시 피드백을 넣어 자동 재시도하지 않고 그대로 실패시킵니다. 따라서 **프롬프트가 배포되기 전에 재시도하면 같은 이유로 다시 실패합니다.** 남은 시도 횟수만 소모됩니다.
- Files/branch: `src/server/ai/quick/prompt.ts` + 테스트 on `main`.
- Validation: 전체 `npx vitest run` 270 passed(이번 추가 3건), `npx tsc --noEmit` clean, ESLint 오류 0건. 추가한 테스트가 "공고를 인용하라"는 옛 문구가 되살아나지 않는지도 함께 검사합니다.
- Rollback/recovery reference: 커밋 revert 시 프롬프트가 이전 버전으로 돌아가며 같은 실패가 재현됩니다. 스키마·검증기·저장 데이터는 변경하지 않았습니다.
- 미해결로 남긴 것: 검증 실패 상세 메시지가 재시도 화면에는 표시되지 않아 사용자가 원인 코드만 봅니다. 진단을 위해 상세를 노출할지는 별도 판단.

## 2026-08-22 — Claude: 빈 문항을 채운 결과가 저장 단계에서 거부되던 문제

- Agent/session: Claude. 사용자가 개발 서버 로그를 공유해 원인이 특정됐습니다.
- Status: completed.
- 실제 원인(로그로 확정): `AI_OUTPUT_VALIDATION_FAILED`가 아니라 결과 조립 단계의 스키마 거부였습니다.
  `[{"code":"too_small","path":["questions",3,"originalAnswer"],"message":"expected string to have >=1 characters"}]`
  `resultQuestionSchema.originalAnswer`가 `z.string().min(1)`인데, BUILD가 채우는 빈 문항은 원래 답변이 빈 문자열입니다. Claude가 빈 문항을 분석 대상에 포함시키면서 이 제약을 놓쳤습니다.
- 심각도: 검증 실패보다 나빴습니다. OpenAI 호출과 검증은 모두 성공한 뒤 저장 직전에 `ZodError`가 났고, 그 경로는 `repository.fail`을 부르지 않아 실행 상태가 `RUNNING`에 남습니다. 사용자는 400을 반복해서 받았습니다(로그에 POST 3회).
- Change: (1) `originalAnswer`를 빈 문자열 허용으로 변경. 빈 문항에는 원래 답변이 없는 것이 사실이므로 값을 지어내지 않고 스키마를 사실에 맞췄습니다. (2) 제출본 탭에서 원문이 비어 있으면 빈 칸을 보여주는 대신 "이 문항은 비워 두셨습니다. 오른쪽 첨삭본은 다른 문항과 지원자료의 사실로 새로 쓴 제안입니다"를 표시합니다.
- 재실행 비용: 이 실패는 OpenAI 응답이 이미 `response_id`로 저장된 뒤에 발생하므로, 수정 후 다시 실행하면 **모델을 다시 호출하지 않고 저장된 응답을 다시 읽습니다.** 7분을 다시 기다리지 않습니다.
- Files/branch: `src/domain/result-document.ts`, `src/components/result-workspace-complete.tsx` + `.module.css` + 테스트 on `main`.
- Validation: 전체 `npx vitest run` 272 passed(이번 추가 2건), `npx tsc --noEmit` clean, ESLint 오류 0건.
- Rollback/recovery reference: 커밋 revert. 저장된 결과에는 영향이 없습니다(제약을 푸는 방향이라 기존 데이터는 모두 계속 통과).
- 남은 개선: 조립 단계 `ZodError`가 `repository.fail`을 거치지 않아 실행이 `RUNNING`에 남습니다. 실패로 기록하고 재시도 가능하게 만드는 편이 안전합니다. 별도 판단 필요.

## 2026-08-22 — Claude: BUILD가 분량을 늘리지 않고 줄이던 문제 + 표시 문구 정정

- Agent/session: Claude. 사용자가 "문항 1이 첨삭 전 540자인데 최종 503자, 700자 목표인데 왜 줄었냐"고 보고했습니다.
- Status: completed.
- 문제 1 (실제 결함): BUILD가 채우지 않고 압축했습니다. 원인은 목표 글자 수 지시문 자체에 빠져나갈 구멍이 있었기 때문입니다 — "목표 글자 수에 가깝게 채우되, **채울 근거가 없으면 억지로 늘리지 말고**"라고 같은 문장 안에서 면책을 줬고, 프롬프트 전반이 반복·일반론·임의 수치 금지로 채워져 있어 모델에게 가장 안전한 선택이 압축이었습니다. 짧아지면 안 된다는 금지도 없었습니다.
- Change 1: BUILD 모드 문장에 "이 단계에서 글을 압축하거나 요약하지 마세요" 추가. 목표 글자 수 지시문을 교체 — 원문이 목표에 못 미치면 늘리고, **첨삭본이 원문보다 짧아지면 안 되며**(원문이 이미 목표를 넘은 경우 제외), 늘리는 방법은 새 사실 추가가 아니라 원문에 있는 경험을 더 구체적으로 푸는 것(무엇을 왜 했는지, 어떻게 판단했는지, 무엇이 어려웠는지, 무엇을 배웠는지)임을 명시. `QUICK_PROMPT_VERSION` `quick-1.9` → `quick-2.0`.
- 문제 2 (표시 문구): 첨삭본 거의 전체가 파랗게 칠해졌습니다. `diffText`가 단어 단위인데 한국어는 어미가 붙어 문장을 다시 쓰면 대부분의 단어가 다른 토큰이 되기 때문입니다. 표시 자체는 정확했으나 범례가 "비어 있거나 짧았던 곳을 채운 제안"이라고 해서, 지원자가 직접 쓴 내용을 다시 쓴 부분까지 우리가 채운 것처럼 과장했습니다.
- Change 2: 인라인 표시는 사용자 요청에 따라 **그대로 유지**하고 범례만 사실에 맞게 정정 — "파란색은 원문에서 달라진 부분입니다. 표현만 다듬은 곳도 포함되니, 새로 채워진 내용인지는 왼쪽 원문과 비교해 확인해 주세요." 원문이 아예 없던 문항에만 "전체가 새로 쓴 제안"을 별도로 표시합니다.
- 작업 중 되돌린 것: 표시를 문장 단위 안내로 바꾸는 안을 만들었다가, 사용자가 "그전이 나았다"고 해서 인라인 표시를 복원했습니다. 과장 문제는 범례 문구로만 해결했습니다.
- Files/branch: `src/server/ai/quick/prompt.ts` + 테스트, `src/components/result-workspace-complete.tsx` + `.module.css` + 테스트 on `main`.
- Validation: 전체 `npx vitest run` 274 passed(이번 추가 3건), `npx tsc --noEmit` clean, ESLint 오류 0건.
- Rollback/recovery reference: 커밋 revert. 저장된 결과·스키마·가격에는 영향 없음.

## 2026-08-22 — Claude: 채우기 재료에 지원자료 허용 + 문항 미분리 시 결제 차단

- Agent/session: Claude. 사용자가 "파란색은 다듬은 것이지 채운 것이 아니다, 그럼 진짜 채운 내용은 BUILD에 없는 것이냐"고 지적한 데 따른 수정입니다. 지적이 정확했습니다.
- Status: completed.
- 문제 1: 직전 커밋에서 Claude가 "분량을 늘리는 방법은 **원문의 사실 범위 안에서** 푸는 것"이라고 못 박아, 이력서에서 내용을 가져오는 경로를 스스로 막았습니다. 그 결과 첨삭본에 새 내용이 전혀 없고 표현만 바뀌었으며, 원문의 구체적 수치("674개 사업장 중 1위")까지 빠져 540자가 503자로 줄었습니다. 지원자료 관련 지시도 "뒷받침하세요"라고만 해서 이미 쓴 주장에 근거를 붙이라는 뜻으로만 읽혔습니다.
- Change 1: 채우기 재료에 순서를 명시했습니다. 1) 원문 경험 구체화 2) **지원자료에서 이 문항과 관련 있는데 아직 쓰이지 않은 사실 가져오기** 3) 그래도 부족하면 멈추고 무엇이 필요한지 남기기. 자료에 적힌 것은 지원자가 직접 밝힌 사실이므로 가져다 쓰는 것이 창작이 아니라는 근거를 함께 넣었습니다. "표현을 바꾸거나 순서를 정리하는 것은 분량을 채운 것이 아니다"를 명시했고, 원문의 수치·고유명사를 첨삭 과정에서 빼지 말라는 규칙도 추가했습니다. `QUICK_PROMPT_VERSION` `quick-2.0` → `quick-2.1`.
- 문제 2: 문항 미분리 상태에서 경고만 띄우고 결제를 허용한 결정이 실제로 세 가지 고장을 동시에 일으켰습니다 — (a) 문항별 목표 글자 수가 없어 기본값 700자가 자소서 전체에 적용, (b) 어느 문항이 짧은지 몰라 채우기 미동작, (c) 문항별 첨삭이 한 덩어리로 뭉침.
- Change 2: 경고에서 **차단**으로 바꿨습니다. 사용자가 버튼 한 번(`문항 구분 확인하기`)으로 해결할 수 있는 문제라 결제 전에 그 한 번을 요구하는 편이 낫습니다. `docs/build-mode-fill-in-decision.md` §5를 이 결정으로 갱신하고 §3-1(채우기 재료 순서)을 신설했습니다.
- 이미 저장된 결과에 대한 주의: 프롬프트 변경은 **새로 실행하는 분석부터** 적용됩니다. 저장된 결과는 새로고침해도 바뀌지 않습니다.
- Files/branch: `src/server/ai/quick/prompt.ts` + 테스트, `src/components/pro-input-page.tsx`, `docs/build-mode-fill-in-decision.md` on `main`.
- Validation: 전체 `npx vitest run` 274 passed, `npx tsc --noEmit` clean, ESLint 오류 0건.
- Rollback/recovery reference: 커밋 revert. 스키마·저장 데이터·가격 변경 없음.

## 2026-08-22 — Claude: 사실 유실·문항 형식 프롬프트 보강 + 결제 화면 정보 추가

- Agent/session: Claude. 사용자가 PRO BUILD 결과를 공유하며 두 가지를 지적했고, "그건 고객이 직접 고칠 일이 아니라 제품이 고칠 일"이라고 바로잡아 주셨습니다. 그 지적이 옳아 제품 수정으로 처리했습니다.
- Status: completed.
- 문제 1: 문항 2에서 "정직원이 니드선 통에 사고를 당할 뻔했고 본인이 원인을 발견해 막았다"는 사실이 첨삭 과정에서 사라졌고, 제출본 탭에 삭제 이유도 없었습니다. "설명 없이 사라지는 문장 금지" 규칙이 이미 있었으나 지켜지지 않았습니다. 원인은 모델이 **문장을 다시 쓰면서 절 하나를 흘린 것을 "삭제"로 인식하지 않기** 때문입니다. 게다가 그 문항은 541/700자로 넣을 자리가 남아 있었습니다.
- Change 1: 지켜야 할 사실의 범주를 이름으로 지정했습니다 — 사고·부상·위험이 실제로 발생했거나 발생할 뻔한 사건, 지원자가 그것을 발견하거나 막은 행동, 수치·고유명사, 자격·수상·직책. 그리고 압축 후 원문과 대조해 이런 사실이 빠지지 않았는지 확인하도록 했습니다.
- 문제 2: 문항 4(경력사항)가 문항 2와 같은 안전진단 경험을 같은 서술 방식으로 반복했습니다. 문항 질문이 "근무경력 위주로, 담당업무 및 업무실적을 자세히"라고 형식을 지정했는데 프롬프트가 모든 문항을 서술형 산문으로 취급했습니다.
- Change 2: 문항 질문이 지정한 형식을 따르도록 했습니다(경력사항은 소속·기간·고용형태·담당업무·실적 항목 정리). 같은 경험을 여러 문항에 써야 하면 문항마다 다른 측면을 쓰도록 했습니다 — 한 문항이 의미와 배움을 다뤘으면 다른 문항은 사실 정보만. `QUICK_PROMPT_VERSION` `quick-2.1` → `quick-2.2`.
- Change 3 (결제 화면): 사용자 검토에 따라 정보를 보강했습니다. (a) PRO 제공 범위에 **"빈 문항과 부족한 분량을 실제로 채움"**과 "이력서·경력기술서와 자소서 교차 확인", "면접 리스크"를 추가하고 "QUICK 전체"라는 모호한 표현을 풀어 썼습니다. (b) QUICK 범위에 **"부족한 부분 지적(내용을 대신 채우지는 않습니다)"**을 명시했습니다 — 채우기 여부가 두 상품의 실제 경계이고, 밝히지 않으면 QUICK 구매자의 환불 사유가 됩니다(결정 문서 §8-1). (c) 준비된 자료 목록에 이력서·경력기술서·포트폴리오·추가 자료·자격·경험을 표시합니다. PRO의 차별점을 만드는 문서인데 결제 화면에 보이지 않았습니다. (d) "분석에는 5~10분 정도 걸립니다 / 창을 닫아도 진행되고 이메일로 알려드립니다 / 실패하면 추가 결제 없이 재시도" 안내를 추가했습니다.
- Files/branch: `src/server/ai/quick/prompt.ts` + 테스트, `src/components/analysis-preparation.tsx` + `.module.css` on `main`.
- Validation: 전체 `npx vitest run` 277 passed(이번 추가 2건), `npx tsc --noEmit` clean, ESLint 오류 0건.
- 미해결로 남긴 것: (1) 결제 화면 상단 모드 라벨이 "최종 첨삭"으로 표시되는데 빈 문항이 있으면 "내용 보완"이어야 합니다 — 모드 자동 판정 또는 라벨 전달을 확인해야 합니다. (2) 준비된 자료의 글자 수가 0으로 보인다는 보고 — 실제 값이 있는데 0이면 결제 금액 계산에 영향이 있습니다. 둘 다 사용자 화면 확인이 필요해 이번에 손대지 않았습니다.

## 2026-08-21 21:40 KST — 랜딩 이후 가격 5,900 / 12,900 / 19,900 반영

- Agent/session: Codex, current session.
- Status: completed locally; not committed or pushed.
- Protected baseline: current onboarding, begin/entry, QUICK/PRO input, pricing comparison, and billing flow behavior outside the listed price values.
- Change and reason: user explicitly requested that post-landing prices change from 4,900 / 9,900 / 14,900 to 5,900 / 12,900 / 19,900, without touching unrelated code. Updated user-facing price labels after landing, QUICK/PRO server-owned checkout base prices, and dependent test expectations. Also updated the FINAL upgrade note from 5,000원 to 7,000원 to match the new displayed ladder.
- Files/branch: `src/app/begin/page.tsx`, `src/app/entry/page.tsx`, `src/app/onboarding/page.tsx`, `src/app/quick/page.tsx`, `src/components/analysis-preparation.tsx`, `src/components/pricing-comparison.tsx`, `src/components/pro-input-page.tsx`, `src/data/coming-soon-plans.ts`, `src/domain/usage-entitlement.ts`, `src/domain/usage-entitlement.test.ts`, `src/server/billing/polar-checkout.test.ts`, `src/server/billing/quick-checkout-service.test.ts` on dirty `main`.
- Validation: targeted app-source price search completed; `vitest` price-related tests passed (15 tests across 4 files).
- Rollback/recovery reference: revert only the listed files' price-value edits.
- User decision: explicitly approved the narrow price change and asked that unrelated code not be modified.

## 2026-08-22 — Claude: 흐름 화면 워드마크 중앙 정렬 + 결제 화면이 실제 분석 단위를 보여주도록 수정

- Agent/session: Claude. 사용자가 온보딩 스크린샷을 보고 "로고는 중앙이 나을 듯"이라고 지적했고, 같은 스크린샷에서 별도 문제가 발견됐습니다.
- Status: completed.
- Change 1 (워드마크): 온보딩과 결제 확인 화면 헤더가 `justify-content: space-between`이라, 로고가 콘텐츠 폭의 왼쪽 끝에 놓여 화면 기준으로는 어중간하게 중앙 근처로 보였습니다. 두 화면 모두 내비게이션이 없고 로고 옆에 항목이 하나뿐인 **단일 작업 흐름 화면**이므로, 3열 그리드(`1fr auto 1fr`)로 워드마크를 실제 중앙에 놓고 오른쪽 항목만 우측에 붙였습니다. 결제 흐름에서 흔한 형태이며, 왼쪽 정렬을 지탱할 메뉴가 없습니다. 온보딩만 지적받았지만 바로 다음 화면인 결제 확인도 같은 구조라 함께 적용했습니다.
- Change 2 (실제 분석 단위 표시): 스크린샷에서 발견한 별도 문제입니다. 결제 화면의 "준비된 자료"가 `1. 자기소개서 문항 1 · 공백 제외 1,803자` 한 항목으로만 표시됐는데, 실제로는 서버가 저장된 자소서를 다시 나눠 4문항으로 분석합니다. 브라우저는 통짜 붙여넣기를 문항 1개로 들고 있고, 화면이 그 상태를 그대로 보여줬기 때문입니다. 결제 직전에 **문항 수도 문항별 글자 수 제한도 사실과 다르게** 보이던 셈입니다. 화면이 서버와 같은 `splitCoverLetterDraft`를 돌려 실제 분석 단위를 표시하도록 했습니다.
- 확인된 것(사용자 스크린샷): 앞서 미해결로 남겼던 두 항목이 모두 정상으로 확인됐습니다. (1) 모드 라벨이 `내용 보완`으로 올바르게 표시됩니다. (2) 글자 수가 `1,803자`, `2자`(공고 "11"), 이력서 파일명까지 정상 표시됩니다. 직전 커밋에서 추가한 지원자료 목록과 소요 시간 안내도 화면에 정상 반영됐습니다.
- Files/branch: `src/app/onboarding/onboarding.module.css`, `src/components/analysis-preparation.module.css`, `src/components/analysis-preparation.tsx` on `main`.
- Validation: 전체 `npx vitest run` 277 passed, `npx tsc --noEmit` clean, 대상 파일 ESLint clean.
- Rollback/recovery reference: 커밋 revert. 헤더는 `display:grid` 3줄과 그리드 배치 규칙만, 결제 화면은 `analysedQuestions` 계산과 렌더 참조만 되돌리면 됩니다.

## 2026-08-22 — Claude: 서버가 분석을 끝까지 진행하는 예약 엔드포인트

- Agent/session: Claude. 사용자가 이메일·환불 동작을 물었고, 확인 과정에서 Claude가 전날 결제 화면에 쓴 "창을 닫아도 계속 진행되고 이메일로 보내드립니다"가 **거짓**임이 드러났습니다. 사용자가 진행을 지시했습니다.
- Status: 엔드포인트 완료. **스케줄러 연결은 아직 안 됐고, 연결 전까지는 동작이 이전과 같습니다.**
- 문제: `/api/analysis-runs/quick/execute`를 부르는 곳이 `quick-checkout-return.tsx` 하나뿐이고 프로젝트에 크론·예약 워커가 없습니다. OpenAI 작업은 백그라운드에서 끝나지만 **결과를 가져와 검증·저장하는 일은 브라우저 폴링에서만** 일어납니다. 창을 닫으면 실행이 `RUNNING`에 남고, 완료 이메일도 그 요청 안에서 보내므로 발송되지 않으며, 10분 초과 자동 환불도 결제 상태 조회 라우트에서 트리거되어 마찬가지로 동작하지 않습니다. 결제는 이미 끝난 뒤라 돈만 나간 상태가 남습니다.
- Change: `POST /api/analysis-runs/advance`를 추가했습니다. `RUNNING` 상태 실행을 오래된 순으로 최대 5건 조회해, 시작 후 10분이 지났으면 기존 `refundTimedOutQuickAnalysis`로 환불하고, 아니면 브라우저가 부르던 것과 **같은 함수들**(`advanceQuickBackgroundAnalysis`, 검증기, `createQuickAnalysisResult`, 저장소)로 진행합니다. 완료되면 소유자 이메일로 결과 링크를 보냅니다. 새 로직을 만들지 않은 이유는 경로가 둘로 갈라지면 한쪽에만 적용된 규칙이 생기기 때문입니다.
- 접근 제어: `Authorization: Bearer $ANALYSIS_CRON_SECRET`. **비밀이 설정되지 않으면 503으로 항상 거부**합니다 — 설정 누락이 공개 엔드포인트가 되어서는 안 됩니다. 테스트 2건으로 고정했습니다.
- 중복 처리: 새 잠금을 만들지 않았습니다. `complete_quick_analysis`가 `status='RUNNING'`을 `for update`로 확인하고, 결과 삽입은 `on conflict do nothing`이며, 환불은 `claim_quick_analysis_timeout_refund`가 한 번만 통과시킵니다. 열린 탭이 먼저 완료한 경우 `ANALYSIS_RUN_NOT_COMPLETABLE`을 오류가 아니라 `ALREADY_DONE`으로 처리합니다.
- 권한: 저장소가 이미 `SUPABASE_SECRET_KEY`(서비스 롤)로 동작해 추가 권한 작업이 없었습니다. 이메일 주소는 `auth.admin.getUserById`로 조회합니다.
- 새 결정 문서: `docs/background-analysis-completion-decision.md`. 스케줄러 선택지(Supabase `pg_cron`+`pg_net` / GitHub Actions / 외부 크론)와 Cloudflare 크론 트리거를 쓰지 않는 이유(OpenNext 생성 워커에 `scheduled()` 핸들러가 없고, 워커 생성에 손대면 배포 전체가 흔들림)를 적었습니다.
- 문구: 결제 화면 안내는 **"이 창을 열어둔 채로 기다려 주세요"로 되돌린 상태를 유지**합니다. 예약 작업이 실제로 도는 것을 확인한 뒤에만 "창을 닫아도 됩니다"로 바꿉니다. 순서를 뒤집어 한 번 실패했습니다.
- 이메일 미발송 사실 확인: `ANALYSIS_EMAIL_FROM`이 `.env.example`에 없었고 로컬에는 Cloudflare `EMAIL` 바인딩이 없습니다. **지금까지 완료 이메일이 발송된 적이 없습니다.** 두 값을 `.env.example`에 추가했습니다. 수신 주소는 Supabase 인증 이메일(구글 계정)이며 Polar 결제 입력 주소가 아닙니다.
- Files/branch: 신규 `src/app/api/analysis-runs/advance/route.ts` + 테스트, 신규 `docs/background-analysis-completion-decision.md`, `.env.example` on `main`.
- Validation: 전체 `npx vitest run` 279 passed(이번 추가 2건), `npx tsc --noEmit` clean, ESLint 오류 0건.
- 사용자가 해야 할 것: `ANALYSIS_CRON_SECRET` 설정과 스케줄러 연결은 환경변수·외부 대시보드 작업이라 사용자 몫입니다.
- Rollback/recovery reference: 라우트와 스케줄러 설정을 제거하면 이전 동작(브라우저 폴링 전용)으로 돌아갑니다. DB 함수·저장 형식·가격은 변경하지 않았습니다.

## 2026-08-22 — Claude: 완료 이메일 발송을 Cloudflare 바인딩에서 Resend로 교체

- Agent/session: Claude. 사용자가 "받는 게 아니라 보내는 건데 Cloudflare 이메일을 쓴다고?"라고 지적한 데서 출발했습니다. 지적이 정확했습니다.
- Status: completed. 사용자가 Resend 가입과 도메인 소유 인증을 이미 마쳤다고 확인했습니다.
- 문제: 기존 발송 코드는 Cloudflare `send_email` 바인딩을 사용했습니다. 이 바인딩은 **Cloudflare 계정에서 인증한 주소로만** 보낼 수 있어, 미리 알 수 없는 고객 주소로는 보낼 수 없습니다. 자기 자신에게 알림을 보내는 용도입니다. 또한 로컬 개발 서버에는 바인딩이 없어 호출이 조용히 건너뛰어졌습니다. 두 이유로 **완료 이메일이 한 번도 발송된 적이 없습니다.**
- Change: `sendAnalysisCompleteEmail`을 Resend HTTPS 호출로 교체했습니다. 함수 시그니처는 유지해 호출부(실행 라우트, 예약 진행 라우트) 수정이 없습니다. 테스트를 위해 `fetch` 주입을 옵션 인자로 열었습니다(게이트웨이가 쓰는 방식과 동일). 설정이 없으면 예외 대신 건너뛰고, 발송 실패도 던지지 않고 `FAILED`로 보고합니다 — 분석은 이미 결제·저장된 뒤라 메일 문제로 결과를 잃게 해서는 안 됩니다.
- Files/branch: `src/server/notifications/analysis-complete-email.ts` + 신규 테스트, `.env.example`(`RESEND_API_KEY` 추가), `docs/background-analysis-completion-decision.md` §8 갱신 on `main`.
- Validation: 전체 `npx vitest run` 282 passed(이번 추가 3건), `npx tsc --noEmit` clean, ESLint 오류 0건. 코드에 Cloudflare 바인딩 참조가 남아 있지 않음을 확인했습니다.
- 남은 것: `wrangler.jsonc`의 `send_email` 바인딩 선언이 이제 쓰이지 않습니다. 배포 설정이라 건드리지 않았습니다. 그리고 스케줄러 연결이 아직이므로 창을 닫으면 여전히 분석이 멈추고, 따라서 이메일도 그때는 발송되지 않습니다.
- Rollback/recovery reference: 커밋 revert 시 Cloudflare 바인딩 버전으로 돌아갑니다(그 상태에서는 고객 발송이 불가능합니다).

## 2026-08-22 — Claude: pg_cron으로 분석 진행 예약 (마이그레이션)

- Agent/session: Claude, 사용자 지시.
- Status: 마이그레이션 작성 완료. **적용과 설정값 입력은 사용자 몫이며, 그 전까지는 예약이 돌지 않습니다.**
- Change: `supabase/migrations/20260822010000_schedule_analysis_advance.sql`. `pg_cron`과 `pg_net`을 활성화하고, 1분마다 `private.advance_analysis_runs()`를 실행해 `/api/analysis-runs/advance`를 호출합니다. 주기를 1분으로 잡은 이유는 엔드포인트가 한 번에 5건만 처리하고 할 일이 없으면 즉시 반환하기 때문이며, 분석이 5~10분 걸리고 환불 판정이 10분이라 확인 주기는 그보다 충분히 짧아야 하기 때문입니다.
- 비밀 처리: 엔드포인트 주소와 공유 비밀을 마이그레이션에 넣지 않았습니다. `private.app_config` 테이블을 만들고 운영자가 Supabase SQL 편집기에서 직접 채웁니다. `private` 스키마는 API로 노출되지 않고 `anon`·`authenticated` 권한을 회수했으며, 함수 실행 권한도 회수했습니다. 커밋되는 파일에 비밀이 남지 않습니다.
- 설정 누락 처리: 값이 없으면 함수가 **조용히 반환**합니다. 값을 안 넣었다는 이유로 매분 오류 로그를 남기는 것은 소음이고, 그 상태의 동작은 예약이 없던 때와 동일합니다.
- 재적용 안전성: 스케줄 등록 전에 같은 이름의 작업이 있으면 먼저 해제하므로 중복 등록되지 않습니다. `create extension if not exists`, `create table if not exists`로 반복 실행에 안전합니다.
- Files/branch: 신규 `supabase/migrations/20260822010000_schedule_analysis_advance.sql`, `docs/background-analysis-completion-decision.md` §6 갱신 on `main`.
- 사용자가 해야 할 것: (1) 마이그레이션 적용, (2) Supabase 대시보드에서 `pg_cron`·`pg_net` 확장 활성화 확인, (3) SQL 편집기에서 `private.app_config`에 주소와 비밀 입력. 비밀을 다루는 작업이라 Claude가 하지 않습니다.
- 확인 방법: `select * from cron.job where jobname = 'advance-analysis-runs';`, `select * from cron.job_run_details order by start_time desc limit 10;`
- 남은 것: 예약이 실제로 도는 것을 확인한 뒤에만 결제 화면 문구를 "창을 닫아도 됩니다"로 바꿉니다. 지금은 "이 창을 열어둔 채로 기다려 주세요"를 유지합니다.
- Rollback/recovery reference: `select cron.unschedule('advance-analysis-runs');` 로 예약만 해제하면 이전 동작으로 돌아갑니다. 테이블과 함수는 남겨도 무해합니다.

## 2026-08-22 — Claude: 배포할 때마다 런타임 환경변수가 지워지던 원인 수정

- Agent/session: Claude. 사용자가 "커밋 배포 후 런타임 환경변수가 사라진다, 다시 넣어도 또 사라질 것 같다"고 보고했습니다.
- Status: 설정 수정 완료. **적용은 다음 배포부터이며, 그 전에 값을 한 번 더 넣어야 합니다.**
- 원인: `wrangler.jsonc`에 `vars` 블록이 없었습니다. Wrangler는 이 파일을 워커 변수의 기준으로 삼기 때문에, 선언이 없으면 **배포할 때마다 빈 변수 집합을 게시하며 대시보드에 넣어둔 값을 지웁니다.** 명령어(`opennextjs-cloudflare build && opennextjs-cloudflare deploy`)나 빌드 커맨드 문제가 아니라 설정 파일 문제였습니다.
- Change 1: `"keep_vars": true`를 추가했습니다. 배포가 대시보드의 변수·시크릿을 건드리지 않습니다. 값 자체를 이 파일에 적지 않은 이유는 커밋되는 파일이기 때문입니다 — API 키가 깃 저장소에 들어가서는 안 됩니다.
- Change 2: 쓰이지 않는 `send_email` 바인딩 선언을 제거했습니다. 이메일 발송을 Resend로 옮긴 뒤 코드에 참조가 남아 있지 않음을 확인했습니다(`getCloudflareContext`·`env.EMAIL` 검색 결과 0건).
- 빌드 변수와 런타임 변수의 구분(사용자 안내용): `NEXT_PUBLIC_*`는 Next.js가 **빌드 시점에 코드에 박아 넣으므로 빌드 변수**로 있어야 합니다(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`). 나머지(`OPENAI_API_KEY`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `POLAR_*`, `ANALYSIS_CRON_SECRET`, `ANALYSIS_EMAIL_FROM`, `OPENAI_MODEL`)는 요청 시점에 읽으므로 **런타임 시크릿**이어야 합니다. 런타임 값만 넣고 `NEXT_PUBLIC_*`를 빌드에 안 넣으면 클라이언트 번들에 빈 값이 박힙니다.
- Files/branch: `wrangler.jsonc` on `main`.
- Validation: JSON 유효성과 `keep_vars` 반영을 확인했습니다. 배포 동작은 다음 배포에서 확인해야 합니다.
- Rollback/recovery reference: `keep_vars` 한 줄을 지우면 이전 동작으로 돌아갑니다(그 경우 변수가 다시 지워집니다). `send_email` 바인딩은 이메일 발송을 Cloudflare로 되돌릴 때만 필요합니다.

## 2026-08-22 — Claude: PRO 처음부터 작성 위저드 정리 + 기본 화면에서 진입 버튼

- Agent/session: Claude. 사용자가 "코덱스가 만든 위저드가 안 보인다"고 해서 확인한 결과 파일은 멀쩡했고 **어디서도 링크되지 않은 상태**였습니다. 이어서 "쌩초보(자소서 없는 사회초년생·고등학생) 기준으로 적절한지, 너무 복잡해서 직접 쓰는 것과 다름없어지지 않는지" 검토와 수정을 지시받았습니다.
- Status: completed.
- 검토에서 나온 문제: (1) **위저드 안에 위저드**가 있었습니다. 6단계 중 4단계가 `GuidedCreateForm` 전체(10단계)를 통째로 품고 있어, 진행 표시 두 개가 서로 다른 숫자를 보여주고 "다음" 버튼도 두 개라 어느 쪽이 넘기는지 알 수 없었습니다. (2) **경험을 두 번 물었습니다** — 3단계에서 자유 메모로 "기억나는 경험", 4단계에서 구조화 질문으로 같은 경험. 자소서를 한 번도 안 써본 사람에게 같은 아르바이트를 두 번 설명하게 하는 흐름이었습니다. (3) **문항별 글자 수를 묻지 않아** 모두 700자 기본값이 적용됐습니다. 회사가 500이나 1,000을 요구해도 반영되지 않습니다. (4) 마지막 단계에서 "사실 확인 단계에서 문항을 추가하세요"라고 하면서 **거기로 가는 길이 없었습니다.** (5) `location.assign`으로 전체 새로고침.
- Change 1: `GuidedCreateForm`에서 단계 본문을 `GuidedStepBody`로 분리해 export했습니다. 위저드가 같은 단계들을 **자기 순서 안에 펼쳐** 하나의 진행 표시로 보여줍니다. `/pro/create`의 기존 폼은 그 본문을 그대로 쓰므로 동작이 바뀌지 않습니다.
- Change 2: 자료 업로드와 자유 메모를 **한 단계로 합쳤습니다.** 둘 다 "가진 게 뭐냐"는 같은 질문이며, 나눠 두었기 때문에 중복 질문이 생겼습니다.
- Change 3: 문항 단계에 **글자 수 입력**을 추가했습니다(100~3000, 비우면 700). "회사가 요구한 숫자를 넣으라"는 안내를 함께 붙였습니다.
- Change 4: 마지막 단계에서 소재가 안 정해졌으면 **"소재 고르러 가기" 버튼**으로 해당 단계로 바로 이동합니다.
- Change 5: `location.assign` → `router.push`.
- Change 6 (진행 표시): 총 단계가 14개라 `1 / 14`는 "시작을 못 해서 온 사람"에게 겁을 줍니다. 본문 카운터를 **`1단계 / 5단계`**로 바꾸고, 인터뷰 안에서의 위치는 `질문 3/10`으로 부제에 두었습니다. 사이드바도 인터뷰 전체를 "경험과 문항" 한 항목으로 묶었습니다.
- Change 7 (진입 경로): `/pro/create`(기본 폼) 상단에 위저드로 가는 버튼을 넣었습니다. 그 전에는 주소를 직접 쳐야만 닿을 수 있었습니다. 두 화면 중 어느 것을 정식 경로로 삼을지는 사용자 결정 대기 중이며, 지금은 둘 다 살아 있습니다.
- Files/branch: `src/components/guided-create-form.tsx` + `.module.css`, `src/components/pro-create-wizard.tsx` + `.module.css`, `src/components/pro-input-page.tsx` + `.module.css` on `main`.
- Validation: 전체 `npx vitest run` 282 passed, `npx tsc --noEmit` clean, `npx eslint src` 오류·경고 0건(직전까지 남아 있던 `location.assign` 경고도 해소). 로컬에서 `/pro/create-wizard`가 `1단계 / 5단계`와 사이드바 5개 항목으로 렌더되는 것을 확인했습니다.
- Rollback/recovery reference: 커밋 revert. `GuidedStepBody` 분리는 순수 리팩터링이라 `/pro/create` 동작에는 영향이 없습니다.

## 2026-08-22 — Claude: 위저드 디자인 회귀 수정 (간격·글자 크기·체크 아이콘)

- Agent/session: Claude. 사용자가 "디자인이 너무 별로다, 최소 Codex가 만든 버전이 나았다 — 디자인이나 글자 크기 등", 이어서 "왼쪽 진행단계 번호 크기도 다르고 체크표시 위치도 애매하다"고 지적했습니다. 세 가지 모두 원인이 달랐습니다.
- Status: completed.
- 원인 1 (Claude가 만든 회귀): `GuidedCreateForm`에서 본문을 `GuidedStepBody`로 분리할 때 바깥 래퍼 `.guided`(`display:grid; gap:14px; padding; border; background`)를 잃었습니다. 위저드 안에서 폼 요소들이 간격 없이 붙어 나왔습니다. → 본문에 `.stepBody{display:grid;gap:14px}` 래퍼를 다시 씌웠습니다. 테두리·배경은 부모가 제공하므로 넣지 않았습니다.
- 원인 2 (Claude가 만든 회귀): 위저드 CSS가 이미 `.layout label`·`.layout input`을 스타일하는데 Claude가 `.target` 래퍼로 덮어써 원래 디자인과 어긋났습니다. → `.target`을 제거하고 Codex의 기본 라벨 스타일로 되돌렸습니다. 사이드바에 추가한 `em`도 회색이라 짙은 녹색 배경에서 안 보였습니다 → 배경에 맞는 색으로 수정.
- 원인 3 (원래 있던 버그): `.layout aside button`의 `font:700 10px inherit`이 **유효하지 않은 CSS**입니다. `font` 축약형 안에서 `inherit`을 패밀리 자리에 쓸 수 없어 **선언 전체가 무시**됐고, 버튼이 상속된 16px로 렌더됐습니다(배율 적용 시 20px). → `font-weight:700; font-size:10px`로 분리했습니다.
- 원인 4 (원래 있던 버그): `.layout aside svg{width:11px}`가 너비만 지정해, lucide 아이콘의 `height="24"` 표현 속성이 남아 체크 표시가 20px 원을 세로로 넘쳤습니다. → `height:11px` 추가.
- 추가: `.questionLength`가 `.layout input`(명시도 0,1,1)에 밀려 넓어지던 문제를 `.questions .questionLength`(0,2,0)로 해결했습니다.
- Files/branch: `src/components/guided-create-form.tsx` + `.module.css`, `src/components/pro-create-wizard.tsx` + `.module.css` on `main`.
- Validation: 전체 `npx vitest run` 282 passed, `npx tsc --noEmit` clean, ESLint 0건. 브라우저에서 실측 — 사이드바 버튼 16px → 10px, 원 크기 전 항목 균일, 체크 아이콘 14×14가 25×25 원 안에 **가로·세로 오차 0**으로 중앙 정렬됨을 확인했습니다.
- 참고: 다른 파일의 `font:inherit`은 전체 값이 CSS 전역 키워드라 유효합니다. 이번 문제는 축약형 중간에 끼운 경우에만 해당합니다.

## 2026-08-22 — Claude: CREATE가 자료를 쓰고 목표 분량까지 쓰도록 (quick-2.3)

- Agent/session: Claude. 사용자가 위저드 구성을 검토하며 "유저가 작성을 대충하면 어떻게 되냐, 자료 위주냐"고 물어 실제 동작을 확인한 결과, CREATE에 두 가지 문제가 있었습니다.
- Status: completed.
- 문제 1: CREATE 지시문이 "이 메모의 사실만 사용해"라고 못 박아 **이력서·경력기술서·포트폴리오를 배제**했습니다. BUILD에서 "원문의 사실 범위 안에서"가 같은 벽이 됐던 것과 동일한 실수입니다. 재료가 가장 부족한 사용자가 정작 가진 자료를 못 쓰는 상태였습니다. → "메모와 함께 제출된 지원자료에 있는 사실을 근거로"로 넓혔습니다. 없는 사실을 만들지 말라는 규칙과 "메모 문장을 그대로 옮기지 말고"는 그대로 유지했습니다.
- 문제 2: 목표 분량 지시가 `fillsBlankQuestions`(BUILD 전용)에 묶여 있어, CREATE에는 반대 지시인 "억지로 분량을 채우지 말고 확인 질문을 남기세요"가 걸렸습니다. 전부 새로 쓰는 모드인데 회사가 요구한 분량을 목표로 삼지 않았습니다. → `expandsToTargetLength`(PRO && (BUILD || CREATE))를 **새로 추가**했습니다. `fillsBlankQuestions`는 빈 문항 포함 여부를 결정하므로 BUILD 전용으로 그대로 뒀습니다. CREATE의 빈 문항은 배정된 소재가 없다는 뜻이라 포함하면 창작을 유도합니다.
- 문제 3(UX): 단계별 안내가 모두 "대충 적어도 괜찮습니다"라고만 하고, **적게 쓰면 결과가 얇아진다는 인과**를 알려주지 않았습니다. → 위저드 인터뷰 단계에 "단어만 나열해도 됩니다. 다만 여기 적은 내용만 초안에 들어가므로 많이 적을수록 결과가 좋아집니다" 안내를 추가하고, 소재 배정 단계에서 문항 수 > 경험 수이면 경험 추가를 권하는 문구를 넣었습니다.
- Files/branch: `src/server/ai/quick/prompt.ts`, `questions.ts`, `prompt.test.ts`, `src/components/pro-create-wizard.tsx` + `.module.css` on `main`. 프롬프트 버전 quick-2.2 → quick-2.3.
- Validation: `npx vitest run` 287 passed(신규 5건), `npx tsc --noEmit` clean, ESLint 0건. 기존 모드 고정 테스트(POLISH·QUICK·BUILD)는 그대로 통과합니다.
- Rollback: `expandsToTargetLength` 호출부를 `fillsBlankQuestions`로 되돌리고 CREATE 지시문을 이전 문장으로 되돌리면 됩니다.

## 2026-08-22 — Claude: 소재 배정 단계에 내용 미리보기와 문항별 추천 추가

- Agent/session: Claude. 사용자가 위저드 마지막 단계(소재 배정)를 실제로 사용하며 "지원계기·하고싶은일·경험1,2·강점·입사후목표 이게 무슨 단계인지, 뭘 선택해야 하는지 설명이 부족하다"고 지적했습니다.
- Status: completed.
- 문제 1: 칩이 **라벨만** 표시했습니다. "경험 ①"과 "경험 ②"는 열 단계 전에 입력한 것이라 라벨만으로는 구분되지 않아, 고르는 일이 추측이 됐습니다. → `guidedBlockPreview(draft, block, limit)`를 추가해 사용자가 쓴 내용 일부를 칩에 함께 보여줍니다. 경험은 소속·기간(`where`)을 우선 표시합니다 — 종류(`category`)는 항목 간 중복되고 상황(`situation`)은 문장 조각으로 읽힙니다.
- 문제 2: **무엇을 골라야 하는지** 알려주지 않았습니다. "어울리는 소재를 고르세요"는 자소서를 처음 쓰는 사람이 갖고 있지 않은 판단을 요구합니다. → `recommendGuidedBlocks(prompt, available)`를 추가하고, 아직 아무것도 고르지 않은 문항에 "이 문항 추천대로 담기" 버튼을 띄웁니다. 규칙은 지원 동기·입사 후 계획·성격/강점 세 가지이며, 걸리지 않는 문항(학교생활·특기사항 등)에는 경험을 권합니다. 모든 칩은 그대로 클릭 가능하므로 추천은 출발점이지 고정이 아닙니다.
- 문제 3: 단계 설명이 이 단계가 무엇인지 말하지 않았습니다. → help 문구에 마지막 단계임, 조각이 앞 단계 입력에서 왔음, 한 문항에 2~3개면 충분함, 같은 조각 재사용 가능함, 모르면 추천 버튼을 쓰라는 안내를 넣었습니다.
- 문제 4(직전 커밋의 회귀): 어제 추가한 "많이 적을수록 결과가 좋아집니다" 안내가 **입력할 것이 없는 배정 단계와 문항 입력 단계에도** 표시됐습니다. → 지원자 본인의 소재를 수집하는 단계에만 표시하도록 범위를 좁혔습니다.
- Codex 테스트 수정: `guided-create-form.test.tsx`의 `getByRole("button", { name: "지원 계기" })`가 실패합니다. 칩의 접근성 이름에 미리보기가 포함되어 더 이상 라벨과 같지 않기 때문입니다. 의도를 바꾸지 않고 매처만 `/^지원 계기/`로 바꿨습니다(앵커가 필요한 이유는 추천 버튼이 적용할 라벨 목록을 이름에 담기 때문입니다). 삭제·재작성은 하지 않았습니다.
- Files/branch: `src/domain/guided-create.ts`, `src/domain/guided-create-assign.test.ts`(신규), `src/components/guided-create-form.tsx` + `.module.css` + `.test.tsx`, `src/components/pro-create-wizard.tsx` on `main`.
- Validation: `npx vitest run` 299 passed(신규 12건), `npx tsc --noEmit` clean, ESLint 0건.
- Rollback: `guidedBlockPreview`·`recommendGuidedBlocks` 호출부를 제거하면 칩이 라벨만 표시하던 이전 동작으로 돌아갑니다. 도메인 함수는 순수 함수라 남겨둬도 부작용이 없습니다.

## 2026-08-22 — Claude: 자소서 서사 순서와 이력서 날짜의 모순 감지

- Agent/session: Claude. 사용자가 실제 PRO CREATE 결과를 이력서 원본(PDF)과 대조하며 "대학 졸업 후 현대자동차"라는 문장이 틀렸다고 지적했습니다. 직접 PDF를 열어 확인했습니다.
- Status: completed.
- 확인된 사실(이력서 학력 탭 원문): 울산과학대학교 중퇴 2014.09, 현대자동차 재직 2014.09~2015.03, 국가평생교육진흥원(학점은행제) 심리학과 졸업 2018.09. 즉 실제 졸업은 현대차 퇴사보다 3년 반 뒤이고, 중퇴와 현대차 입사는 같은 달입니다. AI가 쓴 "대학 졸업 후에는 현대자동차 생산 현장을 경험했고"는 순서가 거꾸로입니다.
- 원인: 이 문장은 지원자 본인이 CREATE 단계에서 입력한 원래 표현("대학을 졸업하고, 캐나다 워홀...")을 AI가 그대로 받아쓴 것입니다. 기존 규칙(`자소서와 지원자료가 서로 어긋나면(기간, 직함, 소속, 성과)...`)은 **숫자·직함 같은 단일 사실의 불일치**만 다루고, "~한 후"류 **서술 순서**가 이력서의 시작·종료일과 모순되는 경우는 다루지 않았습니다.
- 조치: `src/server/ai/quick/prompt.ts`에 지원자료가 있을 때 걸리는 규칙을 하나 추가했습니다 — "~한 후, ~하고 나서, 이후에는" 같은 순서 서술을 지원자료의 경력·학력 시작·종료일과 대조하고, 겹치거나 순서가 반대이면 그 순서를 그대로 쓰지 말고 시간 표현 없이 사실만 쓰거나 verificationQuestions로 남기라는 지시입니다.
- 별도로 확인한 것(코드 문제 아님): "청년재단만 나온 것 같다"는 지적은 실제로는 틀렸습니다 — 세 문항 모두 울산과학대학교 대학일자리센터가 포함돼 있습니다. 강조 표시(노란 밑줄)가 청년재단 쪽에 걸려 상대적으로 덜 보였을 뿐입니다. 다만 직무 적합도상 울산과학대(직업상담사 타이틀)가 청년재단보다 비중이 작게 실린 건 사실이며, 이는 CREATE 단계에서 사용자가 직접 입력한 텍스트 분량 차이일 가능성이 높아 프롬프트로 단정 짓지 않았습니다. 사용자가 다음 테스트로 "이력서만으로" 돌려보기로 함.
- Files/branch: `src/server/ai/quick/prompt.ts`, `prompt.test.ts` on `main`.
- Validation: `npx vitest run` 300 passed(신규 1건), `npx tsc --noEmit` clean, ESLint 0건. PDF는 프로젝트의 `pdfjs-dist`로 직접 텍스트 추출해 날짜를 확인했습니다(임시 스크립트, 커밋하지 않음).
- Rollback: 새로 추가한 규칙 문자열 한 줄을 제거하면 이전 동작으로 돌아갑니다.

## 2026-08-22 — Claude: CREATE, 이력서 등 자료만 넣어도 진행되게

- Agent/session: Claude. 사용자가 실제로 이력서(자격증·경력 다수 포함) PDF만 업로드하고 위저드 인터뷰에는 아무것도 입력하지 않은 채 진행하려다 "아직 문항에 쓸 소재가 정해지지 않았습니다 · 소재 고르러 가기"에 막혔습니다. 자료만으로 진행되는 게 맞다고 판단해 구현했습니다.
- Status: completed.
- 원인: `getAnalysisQuestions`의 CREATE 필터가 `answer.trim()`이 있는 문항만 남겼습니다. 인터뷰 단계에서 아무 조각도 배정하지 않으면 모든 문항의 answer가 비어 있어 **분석 대상이 0개**가 됐고, 위저드의 `readyToFinish`도 `questions.some(answer.trim())`만 봐서 진행 버튼이 막혔습니다. 이력서에 자격증·경력이 아무리 많아도 반영될 길이 없었습니다.
- 조치:
  - `questions.ts`에 `fillsQuestionsFromMaterials(request)` 추가 — PRO && CREATE && 문항 분리됨 && 지원자료(이력서·경력기술서·포트폴리오) 있음. `hasSupportingMaterials`와 `SUPPORTING_KINDS`를 prompt.ts에서 questions.ts로 옮겨 공유했습니다(prompt.ts가 이미 questions.ts를 참조하므로 반대 방향 import는 순환 참조가 됩니다).
  - `getAnalysisQuestions`의 keep 필터와 `getUnansweredQuestions`의 early-return을 `fillsBlankQuestions(request) || fillsQuestionsFromMaterials(request)`로 넓혔습니다. BUILD가 빈 문항을 채우던 것과 정확히 같은 경로를 CREATE도 씁니다.
  - `prompt.ts`의 "빈 문항 채우기" 지시 블록(원문 없음·자료 범위 안에서만·확인 필요 표시·인용할 것 없으면 채우지 말고 consultingAdvice) 게이트도 같은 조건으로 넓혔습니다. 이 블록은 이미 "인용할 것이 전혀 없으면 그 문항은 채우지 말라"는 규칙을 담고 있어, 이력서에 없는 문항을 지어내는 걸 별도로 막을 필요가 없었습니다.
  - `pro-create-wizard.tsx`의 `readyToFinish`에 `|| materialAttachments.length > 0`을 추가하고, 소재 배정 단계에 자료가 있을 때만 보이는 안내("문항에 아무것도 담지 않아도 진행할 수 있습니다. 비어 있는 문항은 업로드한 자료에서 채웁니다")를 넣었습니다.
- Files/branch: `src/server/ai/quick/questions.ts`, `prompt.ts`, `questions.test.ts`, `prompt.test.ts`, `src/components/pro-create-wizard.tsx` on `main`.
- Validation: `npx vitest run` 307 passed(신규 8건), `npx tsc --noEmit` clean, ESLint 0건. 위저드 컴포넌트 자체의 RTL 테스트는 추가하지 않았습니다 — 실제 게이트 로직은 `getAnalysisQuestions`/`getUnansweredQuestions` 테스트로 이미 커버되고, `readyToFinish`는 그 결과를 그대로 잇는 한 줄짜리 OR 조건입니다.
- Rollback: `readyToFinish`의 `|| materialAttachments.length > 0`과 두 곳의 `|| fillsQuestionsFromMaterials(request)`를 제거하면 이전 동작(메모 없으면 무조건 막힘)으로 돌아갑니다.

## 2026-08-22 — Claude: CREATE 안내 문구를 실제 채움 동작에 맞게 정정

- Agent/session: Claude. 사용자가 CREATE 단계 하단 고정 안내 문구("여기에 적은 사실만으로 초안을 만듭니다... 부족한 부분은 확인 질문으로 돌려드립니다")를 보고 "이게 지금 실제 동작이랑 맞나? BUILD는 이거보다 더 채워지는 거 아닌가?"라고 물었습니다.
- Status: completed.
- 확인 결과: 이 문구는 이번 세션 앞부분에 CREATE가 지원자료(이력서 등)를 쓰게 하고 목표 분량까지 채우게 만들기 전에 쓰인 문구라 **낡았습니다.** "여기에 적은 사실만으로"는 이제 사실이 아니고(자료도 근거로 씁니다), "부족한 부분은 확인 질문으로 돌려드립니다"는 3단계 채움 우선순위(① 원문 확장 ② 자료에서 가져오기 ③ 그래도 없으면 질문)의 **마지막 단계만** 말하고 있어, 마치 기본 동작인 것처럼 읽혔습니다.
- BUILD와 다른가: 오늘 세션에서 `expandsToTargetLength`(목표 분량까지 채우기)와 채움 3단계 규칙을 CREATE·BUILD 공통으로 만들었기 때문에, **채움 강도는 이제 둘이 같습니다.** 다른 점은 강도가 아니라 "원문"의 정체입니다 — BUILD는 기존 자소서 문장을 유지·확장하고, CREATE는 단계별 메모를 원재료로 문장을 새로 만듭니다.
- Files/branch: `src/components/guided-create-form.tsx` on `main`.
- Validation: `npx vitest run` 307 passed, `npx tsc --noEmit` clean, ESLint 0건. 문구만 바뀌었으므로 테스트 대상 로직 변경 없음.
- 별도 확인(코드 아님): 결제 후 "분석 시작"에서 폴라 결제 페이지로 안 넘어가는 문제를 문의받아 `/api/checkouts/pro/route.ts`를 확인했습니다. 이 경로는 이번 세션에서 건드린 적이 없고, `POLAR_ACCESS_TOKEN`·`POLAR_QUICK_PRODUCT_ID`·`POLAR_PRO_PRODUCT_ID` 중 하나라도 없으면 서버가 에러를 던지고 화면에 "결제 페이지를 만들지 못했습니다"가 뜨도록 이미 짜여 있습니다(로컬은 `detail` 필드로 원인까지 보임). 로컬 환경변수 문제로 추정되며, 사용자가 화면 메시지와 터미널의 `polar_checkout_failed` 로그를 확인하기로 함.

## 2026-08-22 — Claude: 자료만으로 채우는 CREATE가 결제 단계에서 막히던 것 수정

- Agent/session: Claude. 사용자가 "POST /api/checkouts/pro 400"을 보고했습니다. 오늘 앞서 CREATE가 자료만으로 진행되게 만들었는데, 그 작업이 저장 단계(`buildApplicationCasePlan`)까지는 미치지 않아 실제로는 결제 직전에 막히고 있었습니다.
- Status: completed.
- 원인: `src/application/application-case-handoff.ts`의 `buildApplicationCasePlan`이 `answeredQuestions.length > 0`(답변이 하나라도 있는 문항)일 때만 자기소개서 원문(PRIMARY 문서)을 만들었습니다. 자료만으로 진행하는 CREATE는 모든 문항의 `answer`가 빈 문자열이라 `answeredQuestions.length === 0` → **원문 문서가 아예 저장되지 않았습니다.** 결제 RPC(`prepare_quick_checkout`, `enable_pro_billing.sql`)는 PRIMARY 문서 글자 수가 0이면 `PRIMARY_DOCUMENT_REQUIRED`(errcode 22023)를 던지고, 이 코드는 라우트에서 400으로 매핑됩니다. 즉 분석 단계는 이미 고쳐졌는데, **그 앞의 저장 단계가 여전히 옛날 전제로 막고 있었습니다.**
- 조치: `fillsQuestionsFromMaterials`(`server/ai/quick/questions.ts`)와 같은 조건 — PRO && CREATE && 문항에 제목/질문 있음 && 지원자료(이력서 등) 첨부됨 — 을 이 저장 단계에도 추가해, 이 경우에도 PRIMARY 문서를 만들도록 했습니다. `serializeQuestionAnswers(..., { includeEmptyAnswers: true })`가 이미 답변 없는 문항도 문항 제목으로 채우므로, 글자 수가 0이 되지 않습니다. 두 계층이 서로 다른 모듈(`application/`은 저장 전 단계, `server/ai/quick/`은 분석 프롬프트 단계)이라 함수를 공유하지 않고 조건만 그대로 옮겨 적었습니다.
- Files/branch: `src/application/application-case-handoff.ts`, `application-case-handoff.test.ts` on `main`.
- Validation: `npx vitest run` 310 passed(신규 3건), `npx tsc --noEmit` clean, ESLint 0건. 메모도 자료도 없는 CREATE와 BUILD는 여전히 원문 문서를 만들지 않음을 테스트로 고정했습니다.
- Rollback: `createsFromMaterialsOnly` 조건과 그 사용처를 제거하면 이전 동작(메모 없으면 무조건 저장 안 됨 → 결제 400)으로 돌아갑니다.

## 2026-08-22 — Claude: 완성본 외 비교용 화면 숨김, OpenAI 노출 문구 제거

- Agent/session: Claude. 사용자가 "완성본만 남기고 나머지 예시 참고본들 안 보이게 해달라"와 "결과 대시보드나 다른 페이지에 OpenAI API 같은 문구가 안 보이게 해달라"고 요청했습니다.
- Status: completed.
- 비교 화면 숨김: `/result`, `/result/complete`, `/result/v2`, `/result/codex`, `/result/claude`, `/result/claude-restored`, `/result/codex-restored` 7개 라우트가 전부 `ResultVariantNav`(6개 버전을 나란히 보여주는 개발용 비교 도구)를 항상 렌더링했습니다. 실제 결제·이메일 링크는 `/result`로만 연결되는데, 그 화면에도 "Codex 빨간펜 미러", "Claude 복원판(전체)" 같은 **내부 작업용 이름**이 그대로 노출되고 있었습니다.
  - 조치: 페이지 7개를 각각 고치는 대신 `ResultVariantNav` 컴포넌트 자체에 `if (process.env.NODE_ENV === "production") return null;`을 추가했습니다. 비교 화면과 각 버전 구현은 그대로 남겨(삭제·이름변경 없음, 셰어드워크 보존 규칙 준수) 로컬 개발에서는 계속 비교할 수 있고, 배포 환경에서만 아무것도 렌더링하지 않습니다.
- OpenAI 문구 제거: 사용자 화면에 노출되는 곳 2군데를 찾아 고쳤습니다(내부 코드의 `OPENAI_API_KEY` 환경변수명, `OpenAIResponsesGateway` 클래스명, 코드 주석은 사용자에게 안 보이므로 그대로 둠).
  - `src/app/onboarding/page.tsx`: "서버 전송·저장·OpenAI API 호출을 하지 않습니다" → "...AI 분석 엔진 호출을 하지 않습니다"
  - `src/components/result-workspace-complete.tsx`: 옛 결과의 대체 안내 문구 "OpenAI를 다시 호출하지 않았습니다" → "분석 엔진을 다시 호출하지 않았습니다" (연결된 테스트도 같이 수정)
  - "ChatGPT"가 들어간 FAQ 문구(`src/app/page.tsx`)는 사용자가 "있어도 상관없다"고 해 그대로 두었습니다.
- Files/branch: `src/components/result-variant-nav.tsx`, `src/app/onboarding/page.tsx`, `src/components/result-workspace-complete.tsx`, `result-workspace-complete.test.tsx` on `main`.
- Validation: `npx vitest run` 310 passed, `npx tsc --noEmit` clean, ESLint 0건.
- Rollback: `ResultVariantNav`의 프로덕션 가드 한 줄만 지우면 이전 동작(모든 환경에서 비교 내비게이션 노출)으로 돌아갑니다.

## 2026-08-22 — Claude: 네이버 웹로그 분석·Microsoft Clarity 추적 스크립트 추가

- Agent/session: Claude. 사용자가 네이버 웹마스터도구의 웹로그 분석 스크립트, 구글 서치콘솔 메타태그, Microsoft Clarity 스크립트 세 개를 붙여주고 사이트에 넣어달라고 요청했습니다.
- Status: completed.
- 구글 사이트 확인 메타태그: 새로 만들지 않았습니다 — `src/app/layout.tsx`의 `metadata.verification.google`이 이미 `GOOGLE_SITE_VERIFICATION` 환경변수를 읽어 메타태그로 렌더링하도록 되어 있었고 `.env.example`에도 이미 문서화돼 있었습니다. 값 자체는 비밀이 아니지만(HTML에 그대로 노출되는 값), 환경변수 입력은 사용자가 IDE에서 하기로 한 기존 합의에 따라 코드는 건드리지 않고 값만 안내했습니다.
- 네이버 웹로그 분석(wcslog.js): 원본 스니펫은 `<script src>`(동기 차단 로드) 다음 줄의 인라인 스크립트가 `window.wcs`를 확인하는 구조라, wcslog.js가 완전히 실행된 뒤에만 `wcs_add`를 설정하고 `wcs_do()`를 호출합니다. `next/script`의 `onLoad` 콜백은 이 순서를 그대로 재현하는 표준 방법이지만 **Server Component에서는 이벤트 핸들러 prop을 못 씁니다** — 루트 레이아웃은 `metadata`를 export해야 해서 `"use client"`로 바꿀 수 없습니다. 대신 `<Script>` 하나 안에서 직접 `<script>` 태그를 만들고 그 자체의 `onload`에 `wcs_add` 설정과 `wcs_do()` 호출을 넣어, prop 없이 순서를 보장했습니다.
- Microsoft Clarity: 원본 IIFE를 그대로 `<Script strategy="afterInteractive">`의 내용으로 넣었습니다. 별도 이벤트 핸들러가 필요 없는 스니펫이라 Server Component 안에서 그대로 동작합니다.
- Files/branch: `src/app/layout.tsx` on `main`.
- Validation: `npx tsc --noEmit` clean, ESLint 0건. 로컬 dev 서버(사용자가 이미 켜둔 것)에 브라우저로 접속해 확인 — `window.clarity`가 함수로 존재, Clarity·wcslog 스크립트 태그 둘 다 주입됨, `window.wcs_add.wa === "1c6334533aa6fe0"` 확인, 콘솔 에러 없음.
- 남은 일(사용자): `.env.local`과 Cloudflare 배포 환경변수에 `GOOGLE_SITE_VERIFICATION=y6v6fCOXM0u3Uq5XESQB1g-yduLoGXJvARLW3I6RGEk` 추가.

## 2026-08-22 — Claude: 분석 준비 화면에 PRO 작성 유형 배지, 운영자용 문구 정정

- Agent/session: Claude. 사용자가 "analysis/prepare에 크리에이트 프로인지 빌드인지 프로 종류 나오게 하는 거 어떻게 생각하냐"와 "온보딩의 'AI 비용 없이 임시 확인' 같은 문구가 고객에게 보여지는 게 맞냐"고 물었습니다.
- Status: completed.
- PRO 작성 유형 배지: 작성 유형은 **이미 표시되고 있었지만** 가격 아래 8px 회색 줄("기업 지원서 1건 · 처음부터 작성 · 균형 있게")에 묻혀 있었습니다. PRO 세 유형이 같은 가격이라 화면상 구분이 이 한 줄뿐이고, 유형을 잘못 고른 채 결제하면 분석이 소진되어 되돌릴 수 없습니다. → PRO일 때만 상품명 옆에 배지로 표시(`.mode`)했습니다. 기존 회색 줄은 그대로 뒀습니다(스타일·말투 정보도 함께 담고 있어 제거하면 정보가 사라집니다).
- 운영자용 문구: 사용자가 지목한 두 문구는 성격이 다르다고 판단해 다르게 처리했습니다.
  - `src/app/onboarding/page.tsx`의 "AI 비용 없이 임시 확인" → "결제 없이 무료로 확인". "AI 비용"은 **우리 API 요금**을 가리키는 운영자 언어입니다. 고객이 알고 싶은 건 "이거 열면 돈 나가나?"이므로 그 질문에 답하는 말로 바꿨습니다.
  - `job-posting-input.tsx`의 "지금은 서버나 AI로 전송하지 않습니다"와 `pro-input-page.tsx`의 "아직 서버로 전송하지 않습니다"는 **그대로 뒀습니다.** 이건 개발용 디버그 정보가 아니라 "내 이력서가 아직 업로드되지 않았다"는 개인정보 안내로, 고객이 실제로 신경 쓰는 내용입니다. 숨기면 신뢰 신호가 사라지고, 사용자가 개발 중 헷갈릴 우려도 함께 해결됩니다(아무것도 감추지 않으므로).
- Files/branch: `src/components/analysis-preparation.tsx` + `.module.css`, `src/app/onboarding/page.tsx` on `main`.
- Validation: `npx vitest run` 310 passed, `npx tsc --noEmit` clean, ESLint 0건. 로컬 dev 서버에서 sessionStorage에 PRO/CREATE 초안을 넣고 `/analysis/prepare` 확인 — 배지가 "처음부터 작성"으로 렌더링됨을 실측. 테스트용 sessionStorage 값은 확인 후 삭제했습니다.
- 미해결(사용자 확인 대기): "크리에이트 프로가 분석이 안 됨" — 오류 코드나 로그가 없어 원인을 특정하지 못했습니다. 정적 분석으로 자료-only CREATE 경로(`begin_quick_analysis` → `splitCoverLetterDraft` → `getAnalysisQuestions`)를 따라가 봤지만 문항 2개가 정상적으로 파싱·포함되는 것으로 보입니다. 추측으로 고치지 않고 사용자에게 화면 오류 코드와 터미널 로그를 요청했습니다.

## 2026-08-22 — Claude: /examples 최신화 — 제출본 주석·면접 리스크 노출, 탭 라벨 중복 수정

- Agent/session: Claude. 사용자가 "/examples 한번 최신화, 지금 스타일은 마음에 든다"고 요청했습니다. 스타일은 유지하고 내용만 갱신했습니다.
- Status: completed.
- 누락 기능 1 — 제출본 원문 주석: `originalAnnotations`(좋은 표현·삭제 추천·모호함·수정 추천·확인 필요)는 전 요금제에 이미 제공되는 기능인데 예시에는 전혀 없었습니다. 즉 **구매를 결정하는 화면에서 이 기능이 보이지 않았습니다.** → `annotations` 필드를 예시 스키마에 추가하고 QUICK 2건·PRO 1건에 실제 사례를 넣어, 유형별 색상 구분과 함께 렌더링합니다.
- 누락 기능 2 — 면접 리스크 분석: PRO 요금표에 명시된 기능이고 구현도 되어 있으나 예시에 없었습니다. → `interviewRisks` 필드 추가, CREATE 1건·PRO 교차분석 2건 노출.
- 기존 버그 — 탭 라벨 중복: 탭 이름을 `item.tier === "PRO" ? "PRO 교차분석" : modeLabels[item.mode]`로 만들고 있어서, **PRO 등급 예시는 모드와 무관하게 전부 "PRO 교차분석"으로 표시**됐습니다. CREATE가 PRO 전용 모드가 되면서 4개 탭 중 2개가 같은 이름이 됐습니다. → 각 예시가 이미 갖고 있던 `title`을 라벨로 쓰도록 바꿨습니다(`modeLabels` 상수와 미사용 import 제거). 등급은 기존 `<small>` 배지가 계속 구분합니다.
- 스키마 호환: `annotations`·`interviewRisks` 모두 `.default([])`로 추가해 기존 픽스처가 그대로 유효하며, 각 예시가 필요할 때만 채웁니다.
- Files/branch: `src/domain/example.ts`, `src/fixtures/product-examples.ts`, `src/app/examples/page.tsx` + `.module.css` on `main`.
- Validation: `npx vitest run` 310 passed, `npx tsc --noEmit` clean, ESLint 0건. 로컬에서 4개 탭을 모두 클릭해 실측 — 라벨이 "처음부터 작성/내용 보완/최종 첨삭/PRO 교차 분석"으로 서로 구분되고, 주석·리스크 렌더링 개수가 픽스처와 일치함을 확인했습니다.
- 별도 보고(코드 변경 없음): 요금표(`pricing-comparison.tsx`) 41개 항목을 코드와 대조한 결과 **"경험 자동 추출"과 "문항별 개요 생성" 두 항목은 구현 근거를 찾지 못했습니다.** 요금표 행 자체가 유일한 출현 위치입니다. 판매 문구 삭제는 제품 결정이라 코드를 건드리지 않고 사용자에게 보고했습니다.

## 2026-08-22 — Claude: 문항별 소제목 제안 구현, 요금표 문구 실제 기능에 맞게 수정 (quick-2.4)

- Agent/session: Claude. 앞선 요금표 대조에서 근거를 찾지 못한 두 항목에 대해 사용자가 "경험 자동 추출은 어쨌든 내용 채워주는 기능 있으니 그걸로 이름 바꾸고, 문항별 개요 생성은 만들어주자 — 소제목 생성, 소제목도 자소서에서 중요"라고 결정했습니다.
- Status: completed.
- 요금표 문구 수정(`pricing-comparison.tsx`): "경험 자동 추출" → **"이력서 사실로 빈 내용 채우기"**. 이력서에서 경험을 뽑아 목록으로 보여주는 기능은 없지만, 자료의 사실을 답변에 채워 넣는 기능은 실제로 있습니다(`expandsToTargetLength` 3단계 채움). 없는 기능을 파는 대신 있는 기능의 이름을 정확히 붙였습니다. "문항별 개요 생성" → **"문항별 소제목 제안"**(아래에서 실제 구현).
- 소제목 기능 구현: 한국 자소서는 답변 위에 지원자가 직접 붙인 한 줄 소제목을 함께 제출하는 경우가 많고, 이 한 줄이 약하면 답변을 읽기도 전에 주목도를 잃습니다.
  - AI 출력 스키마(`schema.ts`): `quickRevisionSchema`에 `subheading: z.string().nullable()` 추가. **optional이 아니라 nullable**로 둬서 모델이 매 문항마다 판단을 내리도록 강제하고, 어울리지 않는 문항에서만 명시적으로 null을 반환하게 했습니다.
  - 프롬프트(`prompt.ts`): 12~25자 문장형, 답변에 실제로 담긴 경험과 주장을 드러낼 것, 문항 이름 반복("지원 동기")과 상투어("열정과 도전") 금지, 답변에 없는 사실·수치 금지, 항목 정리 형식(경력사항 등)이면 null. `QUICK_PROMPT_VERSION` quick-2.3 → **quick-2.4**.
  - 하위 호환: 소제목이 없던 시절의 저장 응답은 `subheading` 키 자체가 없어 파싱이 깨집니다. `addLegacyOriginalAnnotations` 정규화에 `undefined → null` 보정을 추가했습니다(`originalAnnotations`가 이미 받던 것과 같은 처리). 기존 스키마 테스트 2건이 이 문제를 잡아냈습니다.
  - 저장 문서(`result-document.ts`): `subheading: z.string().min(1).optional()` — 이전에 저장된 결과가 계속 파싱되어야 하므로 optional.
  - 표시: 최종 첨삭본 탭에 "소제목 제안" 배지와 함께 답변 위에 표시, DOCX·TXT 내보내기에는 `[소제목]` 형태로 답변 바로 위에 포함(실제 지원서 양식에 타이핑하는 형태와 동일). 직접 수정한 답변에도 소제목이 유지됩니다.
- Files/branch: `src/server/ai/quick/schema.ts`, `prompt.ts`, `provider.ts`, `src/domain/result-document.ts`, `src/components/result-workspace-complete.tsx` + `.module.css`, `src/components/pricing-comparison.tsx`, 관련 테스트 픽스처 4건 on `main`.
- Validation: `npx vitest run` 317 passed(신규 7건), `npx tsc --noEmit` clean, ESLint 0건.
- 별도 확인(코드 변경 없음): 사용자가 보고한 Hydration 오류는 깨끗한 브라우저에서 `/analysis/prepare?checkout=success`를 새로 로드해 재현되지 않았습니다. 사용자 로그에서 오류 직전에 Fast Refresh 재빌드가 반복된 점, 오류 메시지 자체가 브라우저 확장 프로그램 가능성을 언급하는 점으로 보아 제 실시간 편집 중의 Fast Refresh 아티팩트이거나 확장 프로그램일 가능성이 높습니다. 잠재 원인으로 의심한 `crypto.randomUUID()`와 `new Date()`는 각각 `useMemo`(클라이언트 전용 경로)와 이벤트 핸들러 안에 있어 SSR 불일치를 만들지 않음을 확인했습니다.
- Rollback: `subheading` 관련 추가분을 모두 제거하면 됩니다. 저장 문서 필드가 optional이라 이미 저장된 결과는 영향받지 않습니다.

## 2026-08-22 — Claude: 재시도 거절이 500으로 나오던 문제 수정 (CREATE PRO 분석 실패의 실제 원인)

- Agent/session: Claude. 사용자가 로그를 제공: `quick_analysis_execution_failed:ANALYSIS_ORPHAN_RETRY_NOT_ALLOWED:PGRST116` + `POST /api/analysis-runs/quick/execute 500`.
- Status: completed.
- 원인 (3개가 연쇄):
  1. **화면이 DB보다 넓게 약속했다.** `status/route.ts`의 `retryAvailable = analysisStatus === "FAILED" && entitlementStatus === "ACTIVE"`. 그러나 `prepare_quick_analysis_retry`는 `failure_code = 'AI_OUTPUT_VALIDATION_FAILED'`이고 `attempt_count < 3`일 때만 허용합니다. 다른 코드로 실패한 실행에도 "다시 시도" 버튼이 떴고, 누르면 DB가 거절했습니다.
  2. **거절 이유가 사라졌다.** execute 라우트가 `prepareRetry` 실패 시 **무조건** `prepareOrphanRetry`로 넘어갔는데, 이 함수는 `failure_code = 'ANALYSIS_ORPHANED'`인 행만 찾습니다. 해당 행이 없으니 `.single()`이 PGRST116(행 없음)을 던졌고, **원래 거절 사유가 이 오류로 덮였습니다.** 로그에 찍힌 `ANALYSIS_ORPHAN_RETRY_NOT_ALLOWED:PGRST116`은 진짜 원인이 아니라 폴백의 실패였습니다.
  3. **상태 문제가 서버 오류로 보고됐다.** 위 오류가 최종 catch로 떨어져 500 + "분석을 완료하지 못했습니다"가 됐습니다. 재시도할 수 없는 상태는 서버 결함이 아닙니다.
- 조치:
  - `src/domain/analysis-retry.ts`(신규): `canRetryAnalysis()`로 재시도 조건을 한 곳에 모았습니다. SQL 두 함수(`prepare_quick_analysis_retry`, `prepareOrphanRetry`)의 전제조건을 그대로 반영합니다 — 검증 실패 + 시도 잔여, **또는** 유실된 실행(`ANALYSIS_ORPHANED`, 이 경로는 횟수가 아니라 코드로 판단). 원래 인라인 조건이 SQL과 어긋난 것이 이번 버그의 뿌리라 별도 모듈로 분리하고 테스트를 붙였습니다.
  - execute 라우트: 고아 재시도가 실패하면 **원래 거절 사유**를 담은 `QuickRetryRefusedError`를 던지고, 이를 **409**와 사용자가 행동할 수 있는 문구로 반환합니다.
  - 고아 복구 경로는 그대로 유지했습니다(`retryAvailable`에서 `ANALYSIS_ORPHANED`를 함께 허용). 처음 좁힐 때 이 경로를 빠뜨렸다가 바로잡았습니다.
- Files/branch: `src/domain/analysis-retry.ts`(신규) + `.test.ts`(신규), `src/app/api/checkouts/quick/status/route.ts`, `src/app/api/analysis-runs/quick/execute/route.ts` on `main`.
- Validation: `npx vitest run` 324 passed(신규 7건), `npx tsc --noEmit` clean, ESLint 0건.
- 남은 확인(사용자): 이번 수정은 **재시도 경로**를 고친 것입니다. 그 실행이 애초에 왜 FAILED가 됐는지는 별개이며, 실패 코드를 알아야 합니다. 새 분석을 시도했을 때 화면의 "원인 코드"를 확인해 주세요.
- Rollback: `canRetryAnalysis` 호출부를 이전 인라인 조건으로 되돌리고 `QuickRetryRefusedError` 분기를 제거하면 됩니다.

## 2026-08-22 — Claude: 구글 소유권 확인 메타태그를 코드에 고정

- Agent/session: Claude. 사용자가 "소유권 확인 계속 실패"를 보고했습니다.
- Status: completed (배포 필요).
- 진단: 배포된 `https://mooaresume.com`을 브라우저로 열어 확인한 결과 **`google-site-verification` 메타태그가 아예 없었습니다.** 원인이 두 개 겹쳐 있었습니다.
  1. 로컬 `.env.local` 13번 줄이 `GOOGLE_SITE_VERIFICATION=GOOGLE_SITE_VERIFICATION=y6v6...` 형태로 **변수 이름이 두 번** 들어가 있었습니다(붙여넣기 실수). 값이 `GOOGLE_SITE_VERIFICATION=y6v6...`가 되어 태그 내용이 잘못 렌더링됩니다. 수정했습니다(`.env.local`은 `.gitignore` 대상이라 커밋되지 않습니다).
  2. 더 근본적인 문제: `layout.tsx`의 `metadata` export는 **페이지가 생성되는 시점에 평가**됩니다. Cloudflare 대시보드에 런타임 변수로만 넣으면 빌드 시점에는 존재하지 않아 **태그가 아예 생성되지 않습니다.** 로컬 개발에서는 정상으로 보이고 배포에서만 사라지는 형태라 발견이 늦었습니다.
- 조치: 토큰을 코드에 직접 넣었습니다. 이 값은 **비밀이 아닙니다** — 모든 페이지 HTML에 공개되며, 구글은 확인 후에도 태그를 영구히 유지할 것을 요구합니다. 환경변수로 감싸는 것은 보안 이득이 전혀 없으면서 빌드/런타임 시점 문제라는 실패 경로만 만들었습니다. 다른 Search Console 속성으로 배포할 경우를 위해 `process.env.GOOGLE_SITE_VERIFICATION` 우선 적용은 남겨두었습니다.
- 네이버(`NAVER_SITE_VERIFICATION`)는 토큰을 받지 못해 기존 환경변수 방식을 유지했습니다. 같은 빌드 시점 문제를 겪을 수 있으므로, 네이버 소유권 확인도 실패하면 같은 방식으로 고정해야 합니다.
- Files/branch: `src/app/layout.tsx` on `main`.
- Validation: `npx vitest run` 324 passed, `npx tsc --noEmit` clean, ESLint 0건. 로컬에서 메타태그가 올바른 값으로 렌더링됨을 브라우저로 확인. 배포 후 실제 반영은 사용자 확인 필요.
- 남은 일(사용자): 배포 후 `https://mooaresume.com` 소스에서 태그를 확인하고 Search Console에서 "확인"을 다시 누르세요.

## 2026-08-22 — Claude: 빈 문항이 인용 가능한 것처럼 보이던 문제 수정 (quick-2.5)

- Agent/session: Claude. 사용자가 로그 제공: `quick_analysis_validation_blocked:INVALID_EVIDENCE` / `우선순위의 근거가 원문에서 확인되지 않습니다: "답변:"` / 422.
- Status: completed.
- 원인: `buildQuickAnalysisInput`이 모든 문항을 `답변:
{answer}` 형태로 렌더링했습니다. 자료만으로 진행하는 CREATE는 모든 답변이 비어 있으므로 프롬프트에 **`답변:` 라벨만 덩그러니** 남습니다. 모델은 `priorities[].evidenceQuote`(필수, `min(1)`)를 채워야 하는데 문항 블록 안에 지원자가 쓴 문장이 하나도 없자 **입력 형식 라벨인 `"답변:"` 자체를 인용**했습니다. 검증기(`candidateEvidenceSource`)는 지원자 문서에서만 인용을 찾으므로 이 라벨이 발견될 리 없고, `INVALID_EVIDENCE`는 차단 코드라 **결제된 실행 전체가 422로 막혔습니다.**
- 조치 (3가지, 모두 프롬프트 계층):
  1. 빈 답변은 `답변: (아직 작성되지 않았습니다. 이 문항의 근거는 지원자료에서 찾으세요.)`로 렌더링합니다. 인용 가능한 빈 줄이 아니라 상태 설명임을 분명히 하고, 대안을 같은 자리에서 알려줍니다.
  2. 입력 형식 표시(`[문항 1]`, `제목:`, `질문:`, `답변:` 등)는 지원자가 쓴 글이 아니므로 evidenceQuote에 넣지 말라는 규칙을 추가했습니다.
  3. 인용할 답변이 아예 없을 때 `priorities`의 근거는 지원자료(이력서 등)에서 가져오라는 규칙을 추가했습니다.
- 검증기는 바꾸지 않았습니다. 라벨을 근거로 통과시키는 것은 "근거는 지원자가 쓴 것이어야 한다"는 제품 원칙을 깨는 일이라, 검증기를 느슨하게 하는 대신 모델이 그런 인용을 만들 이유를 제거했습니다.
- `QUICK_PROMPT_VERSION` quick-2.4 → **quick-2.5**.
- Files/branch: `src/server/ai/quick/prompt.ts`, `prompt.test.ts` on `main`.
- Validation: `npx vitest run` 328 passed(신규 4건), `npx tsc --noEmit` clean, ESLint 0건. 답변이 있는 문항의 렌더링 형식이 그대로임을 테스트로 고정했습니다.
- Rollback: `question.answer.trim()` 분기를 되돌리고 추가한 규칙 2줄을 제거하면 됩니다.

## 2026-08-22 — Claude: SEO 보강(추가만), 런칭 점검에서 www 장애 발견

- Agent/session: Claude. 사용자가 런칭 전 점검과 "네이버·한글 '무아레쥬메' 검색이 잘 되게, 단 지금 디자인·문구는 수정하지 말고 추가만" 요청.
- Status: 코드 변경 완료 / 인프라 항목은 사용자 확인 대기.
- 추가한 것 (사용자에게 보이는 화면은 전혀 바뀌지 않음):
  - `sitemap.ts`: `/guide` 추가. 공개·색인 가능한 페이지인데 사이트맵에 없었습니다. 로그인·결제·초안이 필요한 제품 라우트는 의도적으로 제외했습니다(빈 폼이 색인되어 봐야 도움이 안 됩니다).
  - `layout.tsx` `keywords`: **브랜드명이 아예 없었습니다.** "무아레쥬메", "무아 레쥬메", "MOOA Resume", "mooaresume"와 한국어 검색어("AI 자기소개서", "자소서 첨삭 사이트", "자소서 AI 첨삭", "채용공고 분석") 추가.
- 확인만 하고 바꾸지 않은 것: 랜딩(`/`)과 제품 홈(`/dev-home`) 모두 `alternateName: "무아레쥬메"`가 포함된 Organization/WebSite/Service/FAQPage 구조화 데이터를 이미 갖추고 있고, `canonical`도 양쪽에 설정되어 있습니다. 배포본에서 `canonical`·`og:url`·구조화 데이터 URL이 모두 `https://mooaresume.com`으로 정상 출력됨을 브라우저로 확인했습니다.
- **런칭 블로커 발견**: `https://www.mooaresume.com`이 **522 Connection timed out**을 반환합니다. Cloudflare까지는 도달하지만 그 뒤 오리진이 없습니다. DNS 레코드는 존재하나 워커/Pages에 연결되지 않은 상태로 보입니다. 코드로 고칠 수 없는 인프라 설정이라 사용자에게 보고했습니다.
- 네이버 소유권 확인(`NAVER_SITE_VERIFICATION`)은 토큰을 받지 못해 환경변수 방식 그대로입니다. 구글과 **같은 빌드 시점 문제**를 겪을 것이므로, 토큰을 받으면 구글과 같이 코드에 고정해야 합니다.
- Files/branch: `src/app/sitemap.ts`, `src/app/layout.tsx` on `main`.
- Validation: `npx vitest run` 328 passed, `npx tsc --noEmit` clean, ESLint 0건.

## 2026-08-22 — Claude: 결과 화면에서 개발용 비교 내비게이션·내부 용어 제거

- Agent/session: Claude. 사용자가 "대시보드 최종 결과판에 아직 '결과 버전 비교', '통합 작업공간' 문구들 있는데 없애지 말고 안 보이게 해달라고 했지 않나"라고 재지적했습니다.
- Status: completed.
- 이전 조치의 한계: 앞서 `ResultVariantNav`에 `NODE_ENV === "production"` 가드를 넣었지만, **사용자의 테스트는 로컬 개발 서버에서 이뤄지므로 계속 보였습니다.** 배포에서만 숨기는 것은 "고객이 보는 화면을 확인하려는" 실제 목적을 충족하지 못했습니다.
- 조치 1: 결제한 지원자가 실제로 도착하는 두 경로(`/result`, `/result/complete`)에서 `ResultVariantNav` 렌더링을 제거했습니다. **비교 전용 5개 경로**(`/result/v2`, `/result/codex`, `/result/claude`, `/result/claude-restored`, `/result/codex-restored`)에서는 그대로 유지되므로 개발 중 비교는 계속 가능합니다. 컴포넌트·비교 페이지·각 버전 구현 모두 삭제하지 않았습니다(셰어드워크 보존).
- 조치 2: `완성본 · 통합 작업공간` 배지에서 "통합 작업공간"을 뺐습니다. 이 표현은 제품을 만들 때 쓰던 **내부 아키텍처 용어**이고, 배지가 가리키는 탭 이름은 "완성본"입니다. 지원자에게는 의미가 없는 말이라 배지 자체는 남기고 내부 용어만 덜어냈습니다.
- Files/branch: `src/app/result/page.tsx`, `src/app/result/complete/page.tsx`, `src/components/result-workspace-complete.tsx` on `main`.
- Validation: `npx vitest run` 328 passed, `npx tsc --noEmit` clean, ESLint 0건.

## 2026-08-22 — Claude: 결과 화면에 다음 단계 추천 추가

- Agent/session: Claude. 사용자가 "아무것도 없어요 → CREATE → 빌드 추천 → 폴리쉬 추천" 흐름을 만들자고 요청("4번은 ㅇㅇ 만들고 ㄱㄱ").
- Status: completed.
- 문제: 결과 화면이 종착점이었습니다. 지원자는 결과를 읽고 떠나며, 제품에 다음 단계가 있다는 사실 자체를 알 방법이 없었습니다. 작성 단계에는 실제 순서(처음부터 작성 → 내용 보완 → 최종 첨삭)가 있는데 그 순서를 **유일하게 모르는 사람이 지원자**입니다.
- 조치: `src/domain/next-step.ts`(신규) — `recommendNextStep()`. 결과 문서의 `product`·`writingMode`와 파생값(분량 부족 문항 수, 공고 대조 여부)만 받는 순수 함수로 두어 테스트 가능하게 했습니다.
  - CREATE → PRO 최종 첨삭. 메모를 문장으로 만든 첫 버전이므로 제출 기준으로 다시 읽을 단계가 남았습니다.
  - BUILD → PRO 최종 첨삭. **단, 채우고도 분량이 부족한 문항이 있으면 추천하지 않습니다** — 재료가 떨어진 것이지 단계가 잘못된 게 아니며, 짧은 답변을 다듬는다고 길어지지 않습니다.
  - QUICK POLISH → PRO. 공고를 넣었는지에 따라 이유 문구가 달라집니다.
  - **PRO POLISH → null.** 제품이 현재 제공하는 것을 다 받은 상태라 팔기 위해 이유를 지어내지 않습니다.
- 광고 배너가 되지 않도록 둔 두 가지 규칙: (1) 이미 받은 것과 같은 단계는 권하지 않는다, (2) 모든 추천에는 **지금 가진 초안으로 그 단계가 무엇을 할지**를 적는다(등급·가격을 내세우지 않음).
- Files/branch: `src/domain/next-step.ts` + `.test.ts`(신규), `src/components/result-workspace-complete.tsx` + `.module.css` on `main`.
- Validation: `npx vitest run` 335 passed(신규 7건), `npx tsc --noEmit` clean, ESLint 0건. 로컬 `/result`(PRO·BUILD 샘플)에서 추천 카드가 "최종 첨삭으로 다듬기"로 렌더링됨을 실측. 같은 확인에서 비교 내비게이션이 사라진 것과 배지가 "완성본"으로 바뀐 것도 함께 검증했습니다.

## 2026-08-22 — Claude: 다음 단계 추천 문구를 "미완성"이 아니라 "선택"으로

- Agent/session: Claude. 사용자 지적: "지금 게 완성형 최종이 아닌 느낌 주고 완성시키려면 한 번 더 해야 한다, 이것보다 — 지금 잘 됐고 완성됐고 잘 만들어졌지만 욕심내려면 더 해보고 싶으면 이거 추천한다, 이런 느낌으로 나가야 할 듯."
- Status: completed.
- 문제: 직전 커밋의 문구가 전부 미완성을 암시했습니다. "첫 버전입니다", "이제 ~할 차례입니다", 배지 "다음 단계", 버튼 "이어서 진행하기". 방금 결제한 결과물을 **아직 덜 된 것**으로 규정하는 표현이고, 이런 카드가 반감을 사는 이유가 정확히 이것입니다.
- 조치: `NextStep`에 `reassurance` 필드를 **별도로** 추가했습니다. 안심 문구("이대로 제출하셔도 됩니다")를 이유(`reason`)와 한 문자열로 합치지 않은 이유는, 합쳐두면 나중에 문구를 다듬다가 안심 부분만 조용히 사라질 수 있기 때문입니다. 타입에 분리해 두면 테스트로 강제할 수 있습니다.
  - 화면: 배지 "다음 단계" → **"선택 사항"**, 버튼 "이어서 진행하기" → **"어떻게 달라지는지 보기"**, 본문은 안심 문구를 굵게 먼저 보여주고 이유를 뒤에 붙입니다.
  - 이유 문구는 모두 **조건부**로 다시 썼습니다("더 욕심내신다면", "한 번 더 손보고 싶다면", "지원할 회사가 정해져 있다면").
- 테스트 2건 추가: 모든 추천에 안심 문구가 있는지, 이유가 조건부 표현인지. 문구가 다시 강요조로 돌아가면 테스트가 잡습니다.
- Files/branch: `src/domain/next-step.ts` + `.test.ts`, `src/components/result-workspace-complete.tsx` + `.module.css` on `main`.
- Validation: `npx vitest run` 337 passed(신규 2건), `npx tsc --noEmit` clean, ESLint 0건. 로컬 `/result`에서 렌더링 실측 — "선택 사항 │ 최종 첨삭으로 더 다듬어 보기 │ **채운 결과는 이대로 제출하셔도 됩니다.** 한 번 더 손보고 싶다면… │ 어떻게 달라지는지 보기".

## 2026-08-22 — Claude: 요청사항을 적고 다시 첨삭받기 (quick-2.6)

- Agent/session: Claude. 사용자 요청 — 완성본에서 요청사항을 적고 재첨삭. CREATE·BUILD 테스트 통과 후 진행.
- Status: 코드 완료 / **마이그레이션 적용 필요**.
- 설계의 핵심: 요청사항은 **자료가 아니라 지시**입니다. 기존 "추가 정보 입력"에 넣으면 AI가 "에이텍 빼주세요"를 **에이텍에 관한 재료**로 읽어 오히려 더 쓸 수 있습니다. 그래서 문서 종류를 새로 만들어 끝까지 분리했습니다.
  - `document_kind` enum에 `REVISION_REQUEST` 추가(마이그레이션 `20260822020000`). `begin_quick_analysis`의 매핑에 명시적으로 추가했습니다 — 기존 `else 'portfolio'` 폴백에 걸리면 지시가 **지원자료이자 인용 가능한 근거**가 되어 정반대 결과가 납니다. 재개 경로(`getRunningContext`)의 매핑도 같이 맞췄습니다.
  - **검증기에서 제외**: `NON_EVIDENCE_KINDS`에 채용공고와 함께 넣었습니다. "에이텍 빼주세요"를 판단 근거로 인용하는 것은 이 검증이 막으려는 바로 그 일입니다.
  - `SUPPORTING_KINDS`에는 **넣지 않았습니다** — 자료 블록에 섞이면 안 됩니다.
  - 프롬프트에 별도 지시 블록 3줄: 요청은 경험이 아니라 지시임(인용·본문 삽입 금지), 빼달라면 실제로 빼고 남은 소재로 분량을 다시 채우고 무엇이 빠졌는지 reasons에 밝힐 것, 사실과 충돌하면 따르지 말고 consultingAdvice에 이유를 적을 것. `QUICK_PROMPT_VERSION` quick-2.5 → **quick-2.6**.
- 화면(최종 첨삭본 탭, 실제 결과에서만): 요청사항 입력칸 + "새 분석이므로 PRO 1회 결제가 필요합니다. 지금 결과는 그대로 남아 있습니다." 안내. **"문장 몇 개만 바꾸실 거라면 직접 수정이 빠릅니다"를 함께 적었습니다** — 무료로 되는 일을 유료로 유도하지 않기 위해서입니다. 넘기는 초안은 화면에 보이는 최종 답변(직접 수정분 포함)입니다.
- Codex 테스트 파일 수정: 컴포넌트가 라우터를 쓰게 되어 기존 17건이 "app router not mounted"로 실패했습니다. 파일 상단에 `next/navigation` 최소 모킹 4줄을 추가했을 뿐, 기존 테스트의 의도·내용은 건드리지 않았습니다. (처음엔 `window.location.assign`으로 우회했으나 Next 린트 규칙 위반이고, 핸들러를 `finalText` 위에 선언해 React 컴파일러 메모이제이션도 깨져 되돌렸습니다.)
- Files/branch: `supabase/migrations/20260822020000_revision_request_document.sql`(신규), `src/application/analysis-contract.ts`, `src/application/application-case-handoff.ts`, `src/lib/guest-draft.ts`, `src/server/ai/quick/prompt.ts`, `validator.ts`, `src/server/analysis/supabase-quick-analysis-run-repository.ts`, `src/components/application-case-handoff.tsx`, `src/components/result-workspace-complete.tsx` + `.module.css` + `.test.tsx` on `main`.
- Validation: `npx vitest run` 341 passed(신규 4건), `npx tsc --noEmit` clean, ESLint 0건.
- **남은 일(사용자)**: `20260822020000_revision_request_document.sql`을 Supabase에 적용해야 동작합니다. 적용 전에는 요청사항 저장 시 enum 값이 없어 실패합니다.

## 2026-08-22 — Claude: 다음 단계 추천이 초안을 들고 이동하도록, 문구 재작성

- Agent/session: Claude. 사용자 지적 두 가지 — (1) "더 욕심내신다면 / 조입니다" 같은 문구가 어색하다, (2) "어떻게 달라지는지 보기"를 누르면 그냥 온보딩이 나오는데 맞느냐, 해당 단계로 바로 가거나 최소한 선택만 하게 해야 하지 않나.
- Status: completed.
- 이동 문제(더 중요): 버튼이 `/onboarding`을 가리켰습니다. **눈앞에 결과를 띄워놓고 그 글을 다시 입력하라는 화면으로 보내고 있었습니다.** 사용자가 말한 "또 일해야 하나"가 정확히 이것이고, 이 카드를 안 누르게 만드는 가장 큰 이유입니다.
  - 방금 만든 재첨삭의 핸드오프를 `carryDraftForward()`로 일반화해 두 버튼이 공유합니다. 화면에 보이는 최종 답변(직접 수정분 포함)을 그대로 다음 실행의 초안으로 넘깁니다.
  - `NextStep`에 `href`를 추가했습니다. **같은 글을 다시 보는 단계**(CREATE·BUILD → 최종 첨삭)는 `/analysis/prepare`로 바로 가고, **새 자료가 필요한 단계**(QUICK → PRO, 공고·이력서가 있어야 의미가 있음)는 그것을 받는 `/pro/polish`로 갑니다. `ProInputPage`가 저장된 초안을 자동으로 채우므로 자소서를 다시 쓰지 않습니다.
  - 버튼 문구도 "어떻게 달라지는지 보기" → **"지금 글 그대로 이어서 하기"** 로 바꿔, 다시 입력하지 않아도 된다는 사실을 버튼 자체가 말하게 했습니다.
- 문구 재작성: "더 욕심내신다면" → "여유가 있다면", "표현과 흐름을 한 번 더 조입니다" → "어색한 표현과 문단 흐름을 정리합니다". BUILD 쪽은 최종 첨삭이 실제로 하는 일(지원서 전체를 놓고 말투 고름·중복 확인)을 풀어 썼습니다. QUICK 쪽에는 "지금 글은 그대로 옮겨 담기니 다시 쓰지 않으셔도 됩니다"를 명시했습니다.
- 정리: `hasJobPosting` 입력 필드를 제거했습니다. QUICK 문구를 하나로 합치면서 아무것도 결정하지 않게 됐고, 쓰이지 않는 필드를 결정 타입에 남겨두면 나중에 이유 없이 다시 연결될 소지가 있습니다.
- Files/branch: `src/domain/next-step.ts` + `.test.ts`, `src/components/result-workspace-complete.tsx` + `.module.css` + `.test.tsx` on `main`.
- Validation: `npx vitest run` 343 passed(신규 3건), `npx tsc --noEmit` clean, ESLint 0건. 초안이 실제로 넘어가는지, 요청사항 없이 넘어가는지, 목적지가 단계별로 갈리는지 테스트로 고정했습니다.
- 확인됨(사용자 제공): `cron.job` 조회 결과 `advance-analysis-runs` 1건, `* * * * *`, `active = true`. 스케줄은 정상입니다. `private.app_config`에 URL·비밀키가 들어갔는지는 아직 미확인이며, 비어 있으면 크론이 돌아도 아무 일도 하지 않습니다.

## 2026-08-22 — Claude: 재첨삭에 자료 추가 경로 분기

- Agent/session: Claude. 사용자 질문 — 재첨삭 패널에 자료 업로드를 넣는 게 나은지, 그냥 PRO 입력 페이지를 한 번 더 거치게 하는 게 나은지. "그럼 그냥 프로 한 번 더 하면 되지?" 할 수 있지만 **거기엔 요청사항 칸이 없다**는 점을 사용자가 짚었습니다.
- Status: completed.
- 확인한 사실이 판단을 갈랐습니다: `ProInputPage`의 `saveGuestDraft` 호출에 `revisionRequest`가 **없습니다.** 즉 재첨삭을 PRO 입력 페이지로 보내면 **요청사항이 조용히 사라집니다.** 사용자의 우려가 실제 코드 결함이었습니다.
- 결정: 업로드 UI를 재첨삭 패널에 **복제하지 않고**, 결과가 잘못되는 두 가지 경우에 각각 맞는 경로를 둡니다.
  - **"강조가 틀렸다"** — 문장 한 줄이면 됩니다. 패널에서 바로 `/analysis/prepare`(결제 확인)로 갑니다. 한 줄 말하려고 큰 입력 페이지를 통과시키는 마찰이 이 기능을 안 쓰게 만듭니다.
  - **"자료가 부족했다"** — 이력서를 올릴 화면이 필요합니다. `/pro/polish`로 가되 **요청사항을 들고 갑니다.**
- `ProInputPage` 수정: 게스트 초안에서 `revisionRequest`를 복원하고, 저장 시 다시 포함하며, 화면에 "이어서 진행 중인 요청사항"으로 인용해 보여줍니다. 넘어온 요청이 보존된다는 사실이 보이지 않으면 사용자는 다시 입력하거나 사라졌다고 생각합니다.
- Files/branch: `src/components/pro-input-page.tsx` + `.module.css`, `src/components/result-workspace-complete.tsx` + `.module.css` + `.test.tsx` on `main`.
- Validation: `npx vitest run` 345 passed(신규 2건), `npx tsc --noEmit` clean, ESLint 0건. 자료 경로가 요청사항을 들고 `/pro/polish`로 가는지, 두 버튼 모두 빈 요청사항에서 막히는지 테스트로 고정했습니다.

## 2026-08-22 — Claude: 재첨삭에 자료 업로드 통합, 다음 단계 문구 사용자 안 채택

- Agent/session: Claude. 사용자 제안 두 가지 — (1) 다음 단계 카드 문구를 "완성본 이후의 다음 단계 준비도 이어갈 수 있어요 / 현재 첨삭은 성공적으로 완료되었습니다 / … 추가로 선택할 수 있습니다 / 버튼: 더 준비하기"로, (2) 자료 추가 시 PRO 창을 새로 띄우지 말고 입력창 통합본으로.
- Status: completed.
- (2) 통합 채택 — 제 직전 판단이 틀렸습니다: `MaterialUpload`가 파일 파싱·중복 제거·개수 제한·오류 표시를 모두 자체 처리하는 **독립 컴포넌트**라, 재첨삭 패널에 넣는 것은 UI 복제가 아니라 **재사용**입니다. `/pro/polish`로 튕겨내던 두 번째 버튼을 없애고 패널 안에서 첨부까지 끝내도록 통합했습니다.
- 통합하면서 **드러난 실제 위험**: 지원자료는 `sessionStorage`에만 있습니다. 새 세션에서 재첨삭을 시작하면 **이력서가 조용히 빠진 채** 분석됩니다. 패널이 먼저 알려주도록 했습니다 — 자료가 있으면 "앞서 올린 자료 N개는 그대로 함께 반영됩니다", 없으면 "이번 화면에는 함께 넘어온 자료가 없습니다".
  - 저장은 **병합**입니다. 첫 실행에서 올린 자료도 지원자의 자료이므로 파일 하나 추가한다고 덮어써서는 안 됩니다.
  - 이 값은 서버가 읽을 수 없어 `useSyncExternalStore`로 읽습니다(서버 스냅샷 null). 처음엔 effect에서 setState 했다가 React 린트 규칙에 걸렸고, 이 API가 "하이드레이션 불일치 없이 클라이언트 전용 값을 읽는" 정확한 용도입니다.
- (1) 문구 채택 — 사용자 문안을 그대로 쓰되 한 가지만 조정했습니다. **"면접 준비"는 FINAL 기능이고 아직 없습니다.** PRO 추천에 넣으면 결제한 사람이 받지 못하는 것을 약속하게 되므로, PRO가 실제로 주는 것(공고 적합도 분석, 누락 역량 점검, **면접 예상질문**)으로 구체화했습니다. 없는 기능을 팔지 않는지 확인하는 테스트를 추가했습니다.
- Files/branch: `src/domain/next-step.ts` + `.test.ts`, `src/components/result-workspace-complete.tsx` + `.module.css` + `.test.tsx` on `main`.
- Validation: `npx vitest run` 346 passed, `npx tsc --noEmit` clean, ESLint 0건.
- 확인됨(사용자 제공): `private.app_config`에 `analysis_advance_url`·`analysis_cron_secret` 두 키가 모두 존재합니다. 크론 스케줄(1건, active)과 함께 **설정은 완료**입니다. 실제 실행 성공 여부는 `cron.job_run_details`로 확인이 남았고, 그것이 확인되면 결제 화면 문구를 "창을 닫아도 됩니다"로 바꿀 수 있습니다.

## 2026-08-22 — Claude: "창을 닫아도 됩니다"로 문구 변경 (예약 작업 동작 확인 후)

- Agent/session: Claude. 사용자가 `cron.job_run_details` 결과 제공 — `succeeded`가 매분 연속 5건.
- Status: completed.
- 배경: `docs/background-analysis-completion-decision.md` §7에 "**예약 작업이 실제로 도는 것을 확인한 뒤에만** 문구를 바꾼다. 순서를 뒤집으면 지키지 못할 약속을 다시 하게 된다. 한 번 이미 그렇게 했다"고 적어둔 조건이 이제 충족됐습니다. 확인된 항목 전부:
  - `cron.job`: `advance-analysis-runs` 1건, `* * * * *`, `active = true`
  - `private.app_config`: `analysis_advance_url`, `analysis_cron_secret` 둘 다 존재
  - `cron.job_run_details`: 매분 `succeeded`
  - `.env.local`: `ANALYSIS_CRON_SECRET`, `RESEND_API_KEY`, `ANALYSIS_EMAIL_FROM` 설정됨
  - 사용자가 완료 이메일 실제 수신 확인
- 변경한 문구 2곳:
  - `analysis-preparation.tsx` 결제 직전 안내: "이 창을 열어둔 채로 기다려 주세요" → "분석에는 5~10분이 걸립니다. **창을 닫으셔도 서버에서 계속 진행되고, 끝나면 결과 링크를 이메일로 보내드립니다.** 기다리시면 완료 즉시 결과 화면으로 이동합니다." 실패 시 추가 결제 없이 재시도 가능하다는 안내는 유지했습니다.
  - `quick-checkout-return.tsx` 분석 중 메시지 2곳(동일 문자열): "결과를 받으려면 이 화면을 열어둔 채로 기다려 주세요" → "창을 닫으셔도 계속 진행되며, 끝나면 결과 링크를 이메일로 보내드립니다."
- 소요 시간(5~10분)을 함께 밝혔습니다. 기다릴지 닫을지 판단하려면 얼마나 걸리는지가 필요한데 어느 문구에도 없었습니다.
- Files/branch: `src/components/analysis-preparation.tsx`, `src/components/quick-checkout-return.tsx` on `main`.
- Validation: `npx vitest run` 346 passed, `npx tsc --noEmit` clean, ESLint 0건.
- 주의: 이 약속은 **배포 환경에도 같은 설정이 있어야** 유지됩니다. `private.app_config`의 `analysis_advance_url`이 로컬 주소를 가리키고 있다면 배포 후 실제 도메인으로 바꿔야 하고, Cloudflare에도 `ANALYSIS_CRON_SECRET`·`RESEND_API_KEY`·`ANALYSIS_EMAIL_FROM`이 있어야 합니다.

## 2026-08-22 — Claude: 재첨삭 입력을 요청사항+첨부 통합 컴포저로

- Agent/session: Claude. 사용자 제안 — "기타 추가자료 만들던 입력창에 통합해서, 입력창에도 드래그앤드롭할 수 있게".
- Status: completed.
- 직전 상태의 문제: 재첨삭 패널이 **요청사항 textarea**와 **자료 업로드 버튼**을 따로 두고 있었습니다. 같은 맥락의 말을 두 곳에 나눠 하게 만들고, 드래그앤드롭도 안 됐습니다.
- 조치: `AdditionalInfoInput`을 재사용했습니다. 이 컴포넌트는 **이미** 텍스트 입력과 드래그앤드롭 첨부를 한 상자에서 처리합니다(`dragging` 상태, `onDrop`, 첨부 칩, 글자 수 표시까지). 새로 만들 것이 없었습니다.
  - 재사용을 위해 `placeholder`·`label` 옵셔널 prop 2개를 추가했습니다. 둘 다 기존 문구를 기본값으로 둬서 기존 호출부(`pro-input-page`, `pro-create-wizard`)는 그대로 동작합니다.
  - 첨부 타입이 `CandidateMaterialAttachment`(종류 있음)에서 `CandidateFreeformAttachment`(종류 없음)로 바뀝니다. 자유 첨부는 `OTHER` 문서로 저장되고 `begin_quick_analysis`에서 `portfolio`로 매핑되므로 **지원자료로 정상 전달됩니다.** 종류 라벨(이력서/경력기술서)이 붙지 않는 것이 유일한 손실이며, 통합 입력의 이점이 더 크다고 판단했습니다.
  - 저장은 여전히 **병합**(`mergeFreeformAttachments`)이고, 함께 넘어온 자료 개수는 라벨 첨부와 자유 첨부를 **합산**해 셉니다.
- Files/branch: `src/components/additional-info-input.tsx`, `src/components/result-workspace-complete.tsx` + `.module.css` on `main`.
- Validation: `npx vitest run` 346 passed, `npx tsc --noEmit` clean, ESLint 0건. `aria-label`을 prop으로 넘겨 기존 재첨삭 테스트(`getByLabelText("재첨삭 요청사항")`)가 그대로 통과합니다.

## 2026-08-22 — Claude: 상담 노트의 5개 원칙을 프롬프트에 추가 (quick-2.7)

- Agent/session: Claude. 사용자가 실제 유료 첨삭본 3건을 공유하며 "바꾸거나 삭제하라는 게 아니라 참고할 만한 게 있으면 **추가**하라"고 요청. `docs/editing-philosophy-2-consultant-field-notes.md`에 정리한 우선순위 1~5를 한 번에 구현했습니다.
- Status: completed.
- **전부 덧붙이기입니다.** 기존 규칙·문구·스키마 값은 하나도 수정하거나 삭제하지 않았고, enum에는 값만 추가했습니다. 창작 금지 규칙 두 줄이 그대로 남아 있는지 확인하는 테스트를 함께 넣었습니다 — 그 줄이 사라지면 프레이밍 제안이 곧 대필이 되기 때문입니다.
- 1) **`reframe` 조언**(`consultingAdvice.kind` 추가): 사실을 바꾸지 않고 같은 경험을 다른 각도로 배치하도록 제안. 상담 노트의 "내가 다쳤다 → 목격했다" 사례를 프롬프트 예시로 넣었습니다. **가드레일 규칙을 별도 한 줄로 추가** — 지원자가 목격하지 않은 일을 목격했다고 쓰게 하거나 역할을 바꿔 말하게 하는 제안은 금지, 확인이 필요하면 verificationQuestions로. 이 기능은 가치와 위험이 같은 자리에 있어 경계를 프롬프트가 직접 그어야 합니다.
- 2) **소제목 전체 일관성**: 지금까지 문항별 독립 판단이라 1번에만 소제목이 붙는 결과가 가능했습니다. 한 문항에 제안했으면 어울리는 다른 문항에도 제안하도록 했습니다.
- 3) **`polish` 주석 유형**(`originalAnnotations.type` 추가): "떨어질 이유는 아니지만 흠으로 잡힐 필요는 없는" 층위. 접속사 뒤 문장부호, 단어 반복, 문단 길이 불균형 등에만 쓰고 **내용 문제는 기존 vague·revise·delete로 분류**하도록 명시했으며 문항당 2개로 제한했습니다. 색은 6종 중 가장 조용한 회색 — 선택 사항이 결함처럼 보이면 안 됩니다.
- 4) **면접 질문 유도**: `interviewQuestions.reason`에 그 질문을 부르는 지원서 문장을 지목하도록 했습니다. 어느 대목이 질문을 만드는지 알아야 준비할 자리를 찾습니다.
- 5) **채용 유형별 톤**: 사용자 입력을 새로 받지 않고 **채용공고·직무명에서 추론**하도록 했습니다. 인턴·신입 지원서의 "제도를 개선하겠다" 류 권한 전제 표현에만 여지를 두는 표현을 제안하고, **경력직에는 적용하지 않도록** 명시했습니다. 입력 하나를 더 받는 UX 비용 없이 같은 효과를 노렸습니다.
- `consultingAdvice`는 화면에서 `kind`를 표시하지 않아 UI 변경이 없었고, 주석 유형만 라벨("다듬으면 좋음")과 색을 추가했습니다.
- Files/branch: `src/server/ai/quick/schema.ts` + `.test.ts`, `prompt.ts` + `.test.ts`, `src/domain/result-document.ts`, `src/components/result-workspace-complete.tsx` + `.module.css` on `main`. `QUICK_PROMPT_VERSION` quick-2.6 → **quick-2.7**.
- Validation: `npx vitest run` 354 passed(신규 8건), `npx tsc --noEmit` clean, ESLint 0건. 기존 분류만 쓰던 응답이 그대로 파싱되는지도 테스트로 고정했습니다.

## 2026-08-22 — Claude: 최종 첨삭(POLISH)이 원문을 지워 분량을 줄이던 문제 수정 (quick-2.8)

- Agent/session: Claude. 사용자가 PRO POLISH 결과에서 "글자수도 적어진 것 같다"고 보고. 화면 실측치 409/700, 389/700, 487/700 · 모두 "분량 보완 필요".
- Status: completed.
- 원인: `expandsToTargetLength`(PRO && BUILD/CREATE)가 아닌 분기, 즉 **POLISH와 QUICK 전체**가 받는 지시는 `"원문의 정보량이 부족하면 억지로 분량을 채우지 말고 확인 질문을 남기세요"` 한 줄뿐이었습니다. **줄이지 말라는 규칙이 없었습니다.** 앞서 BUILD에서 540자→503자로 발견해 고쳤던 것과 **같은 결함이 POLISH에는 그대로 남아 있었습니다.** 당시 BUILD만 분기했고 이후 CREATE를 추가했을 뿐이라, POLISH는 한 번도 보호받은 적이 없습니다.
- 조치(해당 분기에 3문장 추가, 기존 문장은 유지):
  - 원문에 있던 내용을 지워서 분량을 줄이지 말 것.
  - 짧아져도 되는 경우를 **두 가지로 한정** — (1) 원문이 목표를 넘겨 줄여야 할 때, (2) 반복·군더더기를 덜어낸 때. 이 둘은 첨삭의 본래 일이므로 막지 않았습니다.
  - 표현을 다듬어 생긴 자리는 버리지 말고 원문의 경험을 더 구체적으로 쓰는 데 쓸 것.
  - 수치·기간·소속·자격증 이름 등 구체적 사실은 분량을 이유로 빼지 말 것(채우기 분기에 이미 있던 규칙을 이쪽에도 추가).
- 채우기 분기는 손대지 않았습니다. 두 분기가 서로 다른 문구를 쓰므로, BUILD의 "짧아지면 안 됩니다"가 그대로 남아 있는지 확인하는 테스트를 함께 넣었습니다.
- Files/branch: `src/server/ai/quick/prompt.ts`, `prompt.test.ts` on `main`. `QUICK_PROMPT_VERSION` quick-2.7 → **quick-2.8**.
- Validation: `npx vitest run` 360 passed(신규 5건), `npx tsc --noEmit` clean, ESLint 0건.

## 2026-08-22 — Claude: 작성 단계 판단을 문항 단위로 (POLISH가 잘못 추천되던 원인)

- Agent/session: Claude. 사용자가 "폴리쉬도 빌드처럼 채우게 해도 되나? 크리에이터·빌드가 가성비 좋고 폴리쉬가 떨어지는 느낌"이라고 물었습니다. 원인을 찾다가 **첨삭이 아니라 그 앞 단계 판단**에 결함이 있었음을 확인했습니다.
- Status: completed.
- 원인: `decideWritingMode`가 `fillRatio = 전체 초안 길이 / 한 문항의 목표 글자 수`로 계산했습니다. 문항이 3개고 각 450자면 합계 1350자이므로 700자 목표 대비 **193%**가 되어 "충분히 작성됨 → POLISH"로 판단합니다. 실제로는 **문항당 64%**입니다. 즉 **문항이 많을수록 무조건 POLISH가 추천**되며, 각 답변이 아무리 얇아도 그렇습니다. 절대 하한(`length >= 450`)도 전체 길이 기준의 OR 조건이라 여러 문항 붙여넣기는 분량만으로 통과했습니다.
- 결과적으로 **BUILD가 필요한 초안이 POLISH로 흘러갔고**, POLISH는 채우지 않으므로 409/700 같은 결과가 나왔습니다. 사용자가 느낀 "폴리쉬 가성비가 떨어진다"는 모드 설계 문제가 아니라 **잘못된 모드로 배정된 결과**였습니다.
- 조치: 답변이 있는 문항 수로 나눠 **문항당 채움 비율**로 판단하도록 바꿨습니다. 절대 하한도 문항 단위로 옮겼습니다. 한 문항짜리 초안의 판단은 이전과 동일합니다(테스트로 고정).
- 판단 유지: **POLISH가 BUILD처럼 채우게 만들지는 않았습니다.** 세 모드를 구분한 결정(`docs/create-mode-and-pricing-decision.md`)을 유지하며, 대신 애초에 POLISH로 잘못 보내지 않는 쪽을 고쳤습니다. POLISH가 원문을 지우지 않도록 하는 보호는 직전 커밋(quick-2.8)에서 이미 넣었습니다.
- Files/branch: `src/domain/writing-mode.ts`, `writing-mode.test.ts` on `main`.
- Validation: `npx vitest run` 363 passed(신규 3건), `npx tsc --noEmit` clean, ESLint 0건. 기존 6건 판단 테스트는 그대로 통과합니다.

## 2026-08-22 — Claude: 분량 부족 상태로 최종 첨삭을 고르면 결제 전에 안내

- Agent/session: Claude. 사용자가 제안 문구를 확인하고 진행을 승인했습니다.
- Status: completed.
- 위치 선택: **팝업이 아니라 `/analysis/prepare` 화면의 인라인 한 줄**입니다. 이유는 두 가지입니다.
  1. 그 화면은 이미 "분석 시작 전 확인"이고, 문항별로 `공백 제외 409자 / 제한 700자`를 **이미 보여주고 있었습니다.** 숫자는 있는데 해석이 없었을 뿐입니다.
  2. **결제 전이 유일하게 유형 변경이 공짜인 시점**입니다. 지금 "분량 보완 필요"는 결제 후에 뜨는데, 그때는 알려줘도 다시 결제하는 것 말고 할 수 있는 게 없습니다.
- 임계값은 `decideWritingMode`가 내용 보완으로 라우팅하는 기준과 **같은 0.78**을 씁니다. 안내와 추천이 서로 다른 말을 하면 안 되기 때문입니다.
- 비율은 **문항당 평균**입니다(문항별로 1.0에서 잘라 평균). 직전 커밋에서 고친 것과 같은 이유 — 합계로 보면 문항이 많을수록 무조건 "충분히 썼다"가 됩니다. 예: 두 문항 각 430자는 합계 860자로 700자를 넘지만 문항당 61%입니다.
- 표시 조건을 좁게 뒀습니다: **POLISH를 고른 경우에만**, **0.78 미만일 때만**. BUILD는 이 상태를 해결하러 가는 길이므로 경고 대상이 아닙니다. 매번 뜨는 경고는 곧 무시당합니다.
- **막지 않습니다.** 짧게 쓰고 다듬기만 원하는 선택도 정당하며, 이는 고장이 아니라 판단의 문제입니다. (공고 링크가 읽히지 않을 때 결제를 막기로 한 결정과는 성격이 다릅니다.) 스타일도 옆에 있던 기존 안내와 같은 무게로 맞췄습니다.
- `analysis-preparation.test.tsx`를 새로 만들었습니다(기존 테스트 없음). Supabase·Polar를 건드리는 자식 컴포넌트 2개는 모킹했습니다.
- Files/branch: `src/components/analysis-preparation.tsx` + `.module.css` + `.test.tsx`(신규) on `main`.
- Validation: `npx vitest run` 367 passed(신규 4건), `npx tsc --noEmit` clean, ESLint 0건.
- **미승인 보류**: POLISH가 원문 확장(채우기 1단계)까지 하도록 하는 변경은 사용자 확인을 받지 않아 적용하지 않았습니다.

## 2026-08-22 — Claude: POLISH가 자기 글 안에서 목표 분량까지 늘리도록 + 줄이기 규칙 축 교정 (quick-2.9)

- Agent/session: Claude. 사용자 승인("어느 정도 채워줘")과 함께, **제 이전 규칙이 잘못됐다는 지적**을 받았습니다 — "실무에선 너무 거품 뜬구름 문장이면 간결하게 하는 게 중요하고, 두괄식으로 간결하게 임팩트 있는 것도 오히려 더 중요할 때가 있다."
- Status: completed.
- 변경 1 — POLISH 확장(`expandsFromOwnContent` 신규): PRO POLISH도 목표에 못 미치면 **지원자가 이미 쓴 내용을 더 구체적으로 풀어** 목표에 가깝게 늘립니다. **지원자료(이력서 등)에서 새 사실을 가져오는 것(채우기 2단계)과 빈 문항 채움은 명시적으로 금지**했습니다. 두 모드의 경계는 **길이가 아니라 어느 재료를 열 수 있느냐**이며, BUILD는 여전히 빈 문항 + 새 재료라는 차별점을 갖습니다.
  - 물타기 방지를 같은 문단에 넣었습니다 — "'많은 것을 배웠습니다', '최선을 다하겠습니다' 같은 일반론으로 글자 수를 채우는 것은 늘린 것이 아니라 **망친 것**입니다. 그렇게 채우느니 짧게 두고 consultingAdvice에 적으세요."
- 변경 2 — **줄이기 규칙의 축 교정**(사용자 지적 반영): 직전 커밋(quick-2.8)에서 제가 넣은 규칙은 **글자 수를 보호**하고 예외를 둘(목표 초과·중복)로 한정했습니다. **축이 틀렸습니다.** 뜬구름 문장을 쳐내고 두괄식으로 재배치하는 것은 실무의 정당한 기술이고 그 결과 짧아지는 것은 결함이 아닙니다. 지켜야 할 것은 분량이 아니라 **사실**입니다.
  - `LENGTH_INTEGRITY_RULE`로 분리해 두 분기가 공유합니다: 추상 표현·반복·상투적 다짐은 덜어내도 되고 **두괄식 간결화도 권장**하되, 지원자가 밝힌 사실·경험, 특히 수치·기간·소속·직함·자격증·고유명사는 분량을 이유로 빼지 말 것. 요약하면 **"없애도 되는 것은 '말'이고, 없애면 안 되는 것은 '사실'"**.
- 변경 3 — 안내 문구 정정: `/analysis/prepare`의 "최종 첨삭은 ... **분량이 크게 늘지 않습니다**"가 변경 1로 인해 거짓이 되므로 "**이미 쓰신 내용을 풀어 쓰는 데까지만** 합니다"로 고쳤습니다. 두 변경이 물려 있어 함께 적용했습니다.
- 기존 테스트 3건이 옛 POLISH 동작을 고정하고 있어 갱신했습니다. 의도 중 살아 있는 부분(POLISH는 BUILD의 빈 문항 채우기 지시를 받지 않는다)은 유지했고, BUILD의 "짧아지면 안 됩니다"가 그대로인지 확인하는 테스트도 남겼습니다.
- Files/branch: `src/server/ai/quick/questions.ts`, `prompt.ts`, `prompt.test.ts`, `src/components/analysis-preparation.tsx` on `main`. `QUICK_PROMPT_VERSION` quick-2.8 → **quick-2.9**.
- Validation: `npx vitest run` 368 passed, `npx tsc --noEmit` clean, ESLint 0건.

## 2026-08-22 — Claude: 두괄식 규칙 + "이번 첨삭에서 한 일" 요약 (quick-3.0)

- Agent/session: Claude. 사용자가 (1) 두괄식이 md나 기능에 저장돼 있는지 물으며 특히 장단점 문항에 많이 추천한다고 했고, (2) 첨삭 요약을 "한 번에" 만들라고 승인했습니다.
- Status: completed.
- **두괄식 — 저장돼 있지 않았습니다.** 원문 노트의 "가독성을 높이기 위한 양식 점검" 항목에 소제목과 나란히 있었는데 **제가 철학2 문서를 정리할 때 빠뜨렸습니다.** 프롬프트에도 없었고, 직전 커밋에서 `LENGTH_INTEGRITY_RULE`에 "두괄식으로 만드는 게 나으면 그렇게 해라"는 **허용**만 있었지 능동적 규칙은 없었습니다.
  - 철학2 문서에 §4-1로 보강했습니다(운영자의 리더십 90점 예시 포함).
  - 프롬프트에 규칙 2줄 추가: **장점·단점·강점·약점·성격 문항은 결론을 첫 문장에**, 근거는 뒤에. 다른 문항도 결론이 문단 끝에 묻혀 있으면 앞으로. 전제는 "담당자가 끝까지 읽지 못한다".
  - `첫 번째, 두 번째` 번호는 **강제하지 않습니다**("꼭 초딩처럼 이유는 안 이래도 된다"는 사용자 표현 반영). 규칙으로 만들면 모든 답변이 같은 틀로 찍힙니다.
- **첨삭 요약** — 계산과 판단을 분리했습니다.
  - 계산(`src/domain/edit-summary.ts` 신규): 다시 쓴 문장 수 / 전체 문장 수, 주석 유형별 개수. **이미 저장된 데이터에서 세므로 추가 API 호출이 없습니다.** 문장부호·띄어쓰기만 다른 것은 다시 쓴 것으로 세지 않습니다(쉼표 하나로 숫자가 부풀면 못 믿게 됩니다). 직접 수정한 답변이 있으면 그것을 기준으로 셉니다.
  - 판단(`editSummary` 필드 신규): 세어서 알 수 없는 부분 — "직무 연결이 없던 결론 3개를 안전관리 업무와 연결했습니다" 같은 것 — 만 AI가 2~3줄로 적습니다. 프롬프트에 **"'표현을 다듬었습니다' 같은 뭉뚱그린 말 금지"**와 **"문장 수·주석 개수는 화면이 세므로 여기 적지 말 것"**을 명시해 중복을 막았습니다.
  - 화면: 최종 첨삭본 탭 상단. **고친 곳이 없으면 아예 표시하지 않습니다** — 한 일이 없는데 요약을 띄우면 그 자체가 과장입니다.
- 구현 중 실수 하나: 요약 섹션을 처음에 재첨삭 패널 안쪽에 넣어 `!result.isSample` 조건에 걸렸습니다. 테스트가 잡아 최상위 블록으로 옮겼습니다.
- 철학2 대조표를 실제 구현 상태로 갱신했습니다(reframe·polish·채용 유형 톤 등 ❌ → ✅).
- Files/branch: `src/domain/edit-summary.ts` + `.test.ts`(신규), `src/server/ai/quick/prompt.ts` + `.test.ts`, `schema.ts`, `provider.ts`, `src/domain/result-document.ts`, `src/fixtures/result-document.ts`, `src/components/result-workspace-complete.tsx` + `.module.css` + `.test.tsx`, `docs/editing-philosophy-2-consultant-field-notes.md` on `main`. `QUICK_PROMPT_VERSION` quick-2.9 → **quick-3.0**.
- Validation: `npx vitest run` 381 passed(신규 13건), `npx tsc --noEmit` clean, ESLint 0건.

## 2026-08-22 — Claude: 두괄식 규칙이 남발되지 않도록 기본값을 '유지'로

- Agent/session: Claude. 사용자 질문 — "두괄식이 꼭 장단점 아니더라도 적재적소에 넣는 건데, 굳이 넣을 필요도 남발할 필요도 없다. AI가 잘 판단되려나?"
- Status: completed.
- **타당한 지적이었고, 직전 커밋에서 제가 넣은 규칙이 실제로 남발을 유도합니다.** 두 줄 중 두 번째가 문제였습니다: `"다른 문항도 결론이나 핵심 주장이 문단 끝에 묻혀 있으면 앞으로 끌어올리는 편이 좋습니다."` — **정지 조건이 없습니다.** 이런 형태의 지시를 받으면 모델은 대체로 전면 적용하고, 그러면 모든 답변이 같은 문장으로 시작해 지원서 전체가 기계적으로 읽힙니다.
- 조치(장단점 규칙은 그대로 두고 두 번째 줄만 교체):
  - **기본값을 '그대로 두기'로** 뒤집었습니다 — "두괄식으로 바꾸지 말고 먼저 확인만 하세요."
  - **판정 기준을 구조가 아니라 도달로** 바꿨습니다 — "앞 두 문장을 읽었을 때 답이 드러나면 그대로 둔다. 앞부분만으로 알 수 없고 결론이 마지막에만 있을 때에만 끌어올린다." 목적이 문장 배열이 아니라 읽는 사람이 답을 찾는 것이므로, 형태가 아닌 결과로 판정해야 합니다.
  - **예외를 명시**했습니다 — 경험·사례 문항의 상황 → 행동 → 결과 전개는 자연스러운 구성이므로 뒤집지 말 것. "모든 문항을 같은 틀로 맞추면 지원서 전체가 기계적으로 읽힙니다"를 이유로 함께 적었습니다.
- 철학2 문서 §4-1에 "남발하지 않는 것이 규칙의 절반이다" 절과 문항 유형별 기준표를 추가했습니다.
- 한계는 남습니다: 프롬프트는 확률적이라 규칙을 좁혀도 보장은 아닙니다. 실제 출력에서 모든 문항이 같은 형태로 시작하는지 확인이 필요하며, 그때는 조건을 더 조이거나 장단점 문항으로만 한정하는 선택지가 있습니다.
- Files/branch: `src/server/ai/quick/prompt.ts`, `prompt.test.ts`, `docs/editing-philosophy-2-consultant-field-notes.md` on `main`.
- Validation: `npx vitest run` 382 passed(신규 1건, 기존 1건 교체), `npx tsc --noEmit` clean, ESLint 0건.

## 2026-08-22 — Claude: 두괄식 적용 문항 수에 상한 추가

- Agent/session: Claude. 사용자 확인 — "모든 자소서가 다 두괄식이면 별로임. 장단점이나 한 번만 저런 거 활용하는 정도임."
- Status: completed.
- 직전 커밋에서 기본값을 '유지'로 뒤집고 판정 기준을 도달 여부로 바꿨지만, **지원서 전체 단위의 상한이 없었습니다.** 판단이 문항별로만 이뤄지므로 각 문항이 저마다 "이 문항은 해당된다"고 보면 결국 전부에 걸릴 수 있습니다.
- 조치: `"두괄식 재배치는 지원서 전체에서 한 문항, 많아야 두 문항에만 적용하세요. 장점·단점 문항이 있으면 그 문항을 먼저 선택합니다. 여러 문항이 모두 결론을 앞세우면 그 자체가 하나의 틀이 되어 효과가 사라집니다."` — 소제목 일관성 규칙과 같은 **문서 단위 제약**이며, 우선순위(장단점 먼저)까지 지정해 어느 문항에 쓸지 모델이 임의로 고르지 않게 했습니다.
- 철학2 §4-1 기준표 아래에 같은 내용을 정리했습니다("강조는 드물어야 강조다").
- Files/branch: `src/server/ai/quick/prompt.ts`, `prompt.test.ts`, `docs/editing-philosophy-2-consultant-field-notes.md` on `main`.
- Validation: `npx vitest run` 383 passed(신규 1건), `npx tsc --noEmit` clean, ESLint 0건.

## 2026-08-22 — Claude: 런칭 전환 — 제품 홈을 `/`로, 랜딩을 `/comingsoon`으로

- Agent/session: Claude. 사용자 승인 후 진행. 결정 근거는 직전 대화 — 랜딩을 버리지도 www로 나누지도 않고 **경로로 살려두고 나중에 데이터로 판단**한다.
- Status: completed (배포 필요).
- 이동:
  - `src/app/dev-home/page.tsx` → **`src/app/page.tsx`** (제품 홈이 메인). `noindex`와 "개발 홈 미리보기 (비공개)" 제목을 제거하고 canonical을 `/`로 지정했습니다. 이제 검색엔진이 색인하는 페이지입니다.
  - 기존 `src/app/page.tsx`(랜딩) → **`src/app/comingsoon/page.tsx`**. canonical이 `/`를 가리키고 있었는데 그대로 두면 **"이 페이지의 진짜 주소는 제품 홈"**이라고 잘못 알리게 되므로 `/comingsoon`으로 바꿨습니다(경로 이름은 사용자 지정 — 코드베이스가 이미 `coming-soon.module.css`, `ComingSoonHeroInput`, `comingSoonPlans`로 그렇게 부르고 있어 일관됩니다). CSS 모듈 6개도 함께 이동(`git mv`로 이력 보존).
  - `src/middleware.ts` **삭제**. `dev.*` 호스트를 `/dev-home`으로 rewrite하던 것인데, `/`가 곧 제품 홈이 되어 할 일이 없어졌습니다. no-op 미들웨어는 모든 요청에 비용만 얹습니다.
  - `next.config.ts`의 `privatePaths`에서 `dev-home` 제거.
- 랜딩 문구: 출시 예정·대기자 성격을 걷어냈습니다(COMING SOON 배지, "출시 알림 받기" 버튼 3곳, FAQ 4건, 카운터 문구, 요금 주석). **이메일 폼은 유지**하되 성격을 "업데이트 소식"으로 바꿨습니다. HWP 지원 예정 안내는 사실이라 그대로 뒀습니다.
- **랜딩 입력창의 목적지 수정(핵심)**: `ComingSoonHeroInput`이 이미 `saveGuestDraft()`로 초안을 저장하고 작성 단계까지 판정하고 있었는데, 버튼은 `#waitlist` 앵커였습니다. **저장해 놓고 버리고 있었던 셈**입니다. `/onboarding`으로 보내도록 바꿨습니다 — 온보딩이 읽는 저장소가 정확히 이 함수가 쓰는 곳이라, 사용자가 랜딩에 붙여넣은 내용이 그대로 이어집니다. 함수명도 `preserveDraftForLaunch` → `carryDraftIntoOnboarding`으로 실제 동작에 맞췄습니다.
- `sitemap.ts`에 `/comingsoon` 추가.
- Files/branch: `src/app/page.tsx`, `src/app/comingsoon/*`, `src/app/*.module.css`(5개 이동), `src/components/coming-soon-hero-input.tsx`, `src/app/sitemap.ts`, `next.config.ts`, `src/middleware.ts`(삭제) on `main`.
- Validation: `npx next build` 클린(39 페이지 생성, `/dev-home` 사라지고 `/comingsoon` 생성 확인), `npx vitest run` 393 passed, `npx tsc --noEmit` clean, ESLint 0건. 로컬 브라우저 실측 — `/`는 제품 홈에 `robots: index, follow`, `/comingsoon`은 canonical `/comingsoon`.
- **남은 일(사용자)**: `www.mooaresume.com` → `mooaresume.com` 301 리다이렉트, `dev.mooaresume.com` DNS 삭제.

## 2026-08-22 — Claude: 랜딩 두 버전 보존 — `/landing`(정리본)과 `/comingsoon`(출시 전 원본)

- Agent/session: Claude. 사용자 지시 — 커밍순 문구를 지운 버전과 남아 있는 버전을 **둘 다** 유지.
- Status: completed.
- `/landing` — 커밍순 문구를 걷어낸 현재 버전. canonical `/landing`, **색인 대상**, 히어로 버튼은 `/onboarding`(입력 내용이 그대로 이어짐), 이메일 폼 제출 버튼은 "소식 받아보기".
- `/comingsoon` — 출시 전 원본을 `git show e26b0a5:src/app/page.tsx`로 복원했습니다. COMING SOON 배지, "출시 알림 받기", 미래형 FAQ가 그대로 있고 히어로 버튼도 원래대로 `#waitlist`입니다.
- **중복 콘텐츠 처리**: 두 페이지는 문구만 다른 거의 같은 페이지입니다. 둘 다 색인되면 같은 검색어에 서로를 밀어내므로 `/comingsoon`에 `robots: { index: false, follow: true }`를 넣고 사이트맵에서도 뺐습니다. 링크는 따라가되 검색 결과에는 하나만 나옵니다.
- 공유 부품에 선택지를 열어 분기했습니다(복제하지 않음):
  - `ComingSoonHeroInput`에 `href` prop 추가(기본 `/onboarding`). 보관본만 `#waitlist`를 넘깁니다. 버튼 아래 안내 문구도 목적지에 따라 갈립니다.
  - `WaitlistForm`에 `submitLabel` prop 추가(기본 "출시 알림 받기"). 정리본만 "소식 받아보기"를 넘겨, 보관본은 손대지 않고도 원래 문구를 유지합니다.
  - `coming-soon.module.css`는 `src/app/` 루트로 옮겨 두 페이지가 공유합니다.
- Files/branch: `src/app/landing/page.tsx`, `src/app/comingsoon/page.tsx`(신규·복원), `src/app/coming-soon.module.css`(이동), `src/components/coming-soon-hero-input.tsx`, `waitlist-form.tsx`, `src/app/sitemap.ts` on `main`.
- Validation: `npx next build` 클린(`/`, `/landing`, `/comingsoon` 3개 생성), `npx vitest run` 393 passed, `npx tsc --noEmit` clean, ESLint 0건. 브라우저 실측 — `/landing`은 색인 가능·출시 문구 0·히어로 `/onboarding`, `/comingsoon`은 noindex·COMING SOON 배지 있음·히어로 `#waitlist`.

## 2026-08-23 — Claude: 프로덕션 로그인 실패 진단 가능하게 + 메일 다중 수신자

- Agent/session: Claude. 사용자 보고 두 건 — (1) 런칭 후 프로덕션에서 로그인 불가(`/analysis/prepare?auth_error=...`), (2) 다른 에이전트가 Windows 파일 접근 오류로 `/MAIL` 수정 실패, 콤마 다중 발송 미적용.
- Status: 로그인은 **진단 가능 상태로 개선**(근본 원인은 로그 확인 필요) / 메일 다중 발송 **완료**.
- 로그인 문제 1 — **오류가 화면에 아예 안 보였습니다.** `auth_error` 쿼리 파라미터를 읽는 코드가 어디에도 없어, 사용자는 주소창에만 오류가 담긴 채 **평범한 로그인 화면**을 봤습니다. 링크가 거부된 줄 모르니 다시 요청하고 같은 벽에 부딪히게 됩니다. `ApplicationCaseHandoff`가 이제 이 값을 읽어 기존 메시지 자리에 표시합니다. `useSyncExternalStore`로 읽어(서버 스냅샷 null) 이펙트에서 setState 하지 않습니다.
- 로그인 문제 2 — **콜백이 실제 원인을 버리고 있었습니다.** `exchangeCodeForSession`의 error를 무시하고 고정 문구만 반환해, 실패해도 왜인지 알 수 없었습니다. 원인이 네 가지로 갈리는데 구분이 안 됐습니다: (a) Supabase가 `error`/`error_description`을 붙여 보낸 경우, (b) `code`가 아니라 `token_hash`+`type` 형식의 이메일 링크, (c) PKCE 검증자 불일치(링크를 **다른 브라우저**에서 열었거나 이미 사용한 링크), (d) 파라미터가 아예 없음. 네 경우를 구분해 `auth_callback_failed:<이유>`로 로그를 남기고, (b)는 `verifyOtp`로 실제 처리합니다. 사용자 문구에도 "링크를 요청한 것과 같은 브라우저에서 열어야 하며, 링크는 한 번만 사용할 수 있습니다"를 추가했습니다 — (c)가 가장 흔한 원인입니다.
- 메일 다중 수신자: `src/domain/recipient-list.ts`(신규)에서 파싱·검증을 한 곳에 모았습니다. 쉼표뿐 아니라 **세미콜론·줄바꿈**도 구분자로 처리하고(엑셀·메일 클라이언트에서 붙여넣으면 쉼표로 오지 않습니다), 대소문자 무시 **중복 제거**, 최대 50명(Resend 상한).
  - **하나라도 형식이 틀리면 전체를 막습니다.** 부분 발송은 되돌릴 수 없기 때문입니다. 어느 주소가 잘못됐는지 이름을 지목합니다.
  - 발송은 **한 명씩 따로** 보냅니다. `to` 배열에 여러 명을 넣으면 **모든 수신자가 서로의 주소를 보게 됩니다** — 학교·부서 단위로 보낼 때 사고가 됩니다.
  - 일부만 실패해도 첫 실패에서 멈추지 않고 **끝까지 시도한 뒤 실패자 명단을 반환**합니다. 중간에 멈추면 누가 받았는지 알 수 없어 재발송 시 중복이 납니다. 화면에 "N명에게 보냈습니다. 실패: ..."로 표시하고, **실패가 있으면 폼을 비우지 않습니다**(명단만 줄여 재시도할 수 있게).
  - 입력이 `type="email"`이라 **브라우저가 콤마 목록을 거부**하고 있었습니다. textarea로 바꿨습니다. 다른 에이전트가 실패한 것은 파일 접근 문제였고, 이 환경에서는 정상 수정됐습니다.
- Files/branch: `src/app/auth/callback/route.ts`, `src/components/application-case-handoff.tsx`, `src/domain/recipient-list.ts` + `.test.ts`(신규), `src/server/notifications/manual-email.ts`, `src/app/api/mail/send/route.ts`, `src/app/api/mail/login/route.ts`, `src/app/MAIL/page.tsx` on `main`.
- Validation: `npx next build` 클린, `npx vitest run` 400 passed(신규 7건), `npx tsc --noEmit` clean, ESLint 0건.
- **남은 일(사용자)**: 배포 후 로그인을 다시 시도하고 Cloudflare 로그에서 `auth_callback_failed:` 줄을 확인해 주세요. 그 줄이 네 원인 중 무엇인지 알려줍니다. 함께 확인할 것 — Supabase 대시보드의 **Redirect URLs**에 `https://mooaresume.com/auth/callback` 이 등록돼 있는지, **Site URL**이 `https://mooaresume.com`인지.

## 2026-08-23 — Claude: 회신 주소를 기본값으로 (수동 입력 의존 제거)

- Agent/session: Claude. 사용자 질문 — 회신 주소를 `support@mooaresume.com`으로 고정해야 하는지, 입력해도 아무것도 안 보이는데 동작하는지, 아니면 본문에 직접 적는 게 나은지.
- Status: completed.
- 확인: **버그가 아닙니다.** `reply_to`는 정상 전송되고 있었고, 회신 주소는 원래 화면에 보이지 않습니다 — 받는 사람이 **답장 버튼을 눌러야** 적용됩니다. "아무것도 안 나온다"는 정상 동작입니다.
- 진짜 문제는 다른 데 있었습니다: **비워두면 회신이 `noreply@`로 갑니다.** 매번 손으로 입력해야 하는 구조라, **한 번 잊은 그 메일이 답장을 잃는 메일**이 됩니다. 학교 담당자가 답장했는데 아무도 못 보는 상황입니다.
- 조치: 사용자가 **이미 설정해 둔 `ANALYSIS_EMAIL_REPLY_TO`가 코드에서 전혀 쓰이지 않고 있었습니다.** 이제 두 발송 경로 모두 기본값으로 씁니다.
  - `manual-email.ts`: 입력이 비어 있으면 환경변수 값을 사용. 다른 주소로 받고 싶으면 입력해서 덮어씁니다.
  - `analysis-complete-email.ts`: **같은 구멍이 여기에도 있었습니다.** 분석 완료 메일에 회신 주소가 없어, 결과에 대해 문의하거나 실패를 알리려는 고객의 답장이 `noreply@`로 사라지고 있었습니다.
- 화면 문구: "회신 받을 주소 **선택**" → "**비워두면 기본 회신 주소로 갑니다**". 비어 있는 것이 정상 경로가 됐으므로 그때 무슨 일이 일어나는지 적었습니다.
- `.env.example`에 `ANALYSIS_EMAIL_REPLY_TO`를 문서화했습니다(누락돼 있었음).
- 본문에 "회신주소: support@..."를 직접 적는 방식과 비교: 회신 주소가 낫습니다. **답장 버튼이 그대로 동작**하기 때문입니다. 본문 표기는 상대가 복사해 붙여야 하며, 답장 버튼을 누르면 여전히 noreply로 갑니다. 다만 둘을 같이 써도 손해는 없습니다.
- Files/branch: `src/server/notifications/manual-email.ts`, `analysis-complete-email.ts`, `src/app/MAIL/page.tsx`, `.env.example` on `main`.
- Validation: `npx vitest run` 400 passed, `npx tsc --noEmit` clean, ESLint 0건.

## 2026-08-23 — Claude: 로그인 실패 원인 규명 — 배포된 Supabase 키가 손상됨

- Agent/session: Claude. 사용자가 Cloudflare 로그를 제공: `auth_callback_failed:exchange:Invalid API key`.
- Status: 원인 규명 완료 / 수정은 사용자 영역(환경변수 + 재배포).
- 원인: 배포본에 박힌 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 값이 **손상돼 있었습니다.** 배포된 JS 번들에서 직접 읽어 확인했습니다.
  ```
  배포된 값: sb_puBASE_PUBLISHblishable_aI7VFl7jxkDuj3SkWnGk0g_e4qJBXFL
  올바른 값: sb_publishable_aI7VFl7jxkDuj3SkWnGk0g_e4qJBXFL
  ```
  `sb_pu` 뒤에 변수명 조각 `BASE_PUBLISH`가 끼어들어 있습니다. 예전 `GOOGLE_SITE_VERIFICATION=GOOGLE_SITE_VERIFICATION=...` 사고와 같은 종류의 붙여넣기 오류이며, 이번에는 값 **중간**에 박혔습니다.
- 코드·Supabase 대시보드·구글 OAuth 콘솔은 모두 정상이었습니다. 브라우저·서버 양쪽 다 `@supabase/ssr`의 쿠키 기반 클라이언트라 PKCE가 정상적으로 맞물립니다. 구글 콘솔의 리디렉션 URI도 Supabase 콜백으로 올바르게 지정돼 있었습니다.
- 진단 과정에서 추가한 것: `auth_callback_failed` 사유를 `auth_reason` 쿼리 파라미터로도 노출합니다. Cloudflare 로그에서 인증 요청을 찾기 어렵고(크론의 `advance` 요청이 계속 쌓임), 로그를 한 번 확인할 때마다 로그인 시도가 한 번 더 필요했기 때문입니다. 값은 원인 분류만 담으며 토큰은 담지 않습니다(200자 제한).
- **사용자 확인 필요**: 환경변수를 고친 뒤에도 배포본에는 여전히 옛 값이 있음을 확인했습니다. `NEXT_PUBLIC_*`은 **빌드 시 코드에 인라인되므로 재배포해야 반영**됩니다. 또한 빌드 변수와 시크릿 양쪽에 같은 이름이 있으면 빌드는 빌드 변수 쪽을 사용하므로, 양쪽 모두 확인이 필요합니다.
- Files/branch: `src/app/auth/callback/route.ts` on `main`.
- Validation: `npx vitest run` 400 passed, `npx tsc --noEmit` clean, ESLint 0건.

## 2026-08-23 — Claude: 프로덕션 첫 결제 후 분석이 시작되지 않음 — 웹훅 100% 할인 거부 + 폴링 실패 무시

- Agent/session: Claude. 사용자 보고 — 런칭 후 실도메인에서 결제해도 "결제와 지원자료 확인" 단계에서 멈춘 느낌, 결국 "결제 확인이 지연되고 있습니다" 화면으로 끝남.
- Status: completed.
- 진단 과정(사용자가 Supabase SQL과 Cloudflare/Polar 대시보드를 직접 확인, Claude가 코드 대조):
  1. `analysis_runs`가 여러 건 `PENDING`/`response_id null`로 남아있음 → OpenAI 호출 이전 단계, 즉 "결제 완료" 신호를 서버가 못 받은 상태로 확인.
  2. Polar 웹훅 배달 로그에서 8/18 이후 새 배달이 전혀 없었음 → 웹훅 엔드포인트가 **비활성화(disabled)** 상태였음(사용자 확인). 활성화 후에도 이전 배달은 403(서명 불일치)이었는데, 등록된 URL이 `/api/webhooks/polar` 없이 루트 도메인만 있었을 가능성과 겹쳐 있었음 — 사용자가 URL을 `https://mooaresume.com/api/webhooks/polar`로 수정.
  3. 활성화 후 첫 실배달(`order.paid`, 8/23 19:34)이 **500**으로 실패. Payload를 직접 받아 대조한 결과, 런칭 기념 **100% 할인 코드**를 사용한 주문이라 `total_amount: 0`.
- 근본 원인: [`polar-webhook.ts`](../src/server/billing/polar-webhook.ts) `validatePolarPaidOrder`의 금액 검증이 `order.totalAmount <= 0`이면 무조건 `POLAR_ORDER_AMOUNT_MISMATCH`로 거부하고 있었음. 100% 할인은 정당하게 0원이 되므로 이 조건이 정상 결제를 위조로 오인. 바로 다음 줄의 `discounted && !order.discountId` 체크가 "할인 코드 없이 가격이 다르면 거부"를 이미 담당하므로, 0원 자체를 막을 이유가 없었음. `<=`를 `<`로 수정(음수만 차단, 0원+할인ID 있음은 통과). 웹훅과 결제-복귀 재확인(reconciliation) 양쪽이 이 함수를 공유하므로 한 곳 수정으로 둘 다 반영됨.
- 별도로 발견해 함께 고친 버그: [`quick-checkout-return.tsx`](../src/components/quick-checkout-return.tsx)의 `RUNNING` 상태 폴링 분기가 `/api/analysis-runs/quick/execute` 응답을 확인하지 않고 있었음. 백엔드가 계속 실패해도(이번 건처럼 웹훅이 막혀 있던 동안 등) 화면은 "AI가 첨삭을 진행하고 있습니다"만 계속 보여주고, 10분 서버 타임아웃-환불이 뜰 때까지 사용자는 아무 것도 알 수 없었음. 같은 파일의 다른 분기(entitlementStatus ACTIVE)가 이미 쓰던 실패-표시 패턴을 그대로 적용.
- Files/branch: `src/server/billing/polar-webhook.ts`, `src/server/billing/polar-webhook.test.ts`(신규 케이스 2건: 100% 할인 통과·할인 없는 0원 거부), `src/components/quick-checkout-return.tsx` on `main`.
- Validation: `npx vitest run` 410 passed(신규 2건), `npx tsc --noEmit` clean.
- **남은 일(사용자)**: 이 fix는 애플리케이션 코드라 커밋+재배포가 필요함(Cloudflare 환경변수와 달리 즉시 반영 안 됨). 배포 후 (1) 실패했던 그 주문(`checkout_id: f0492cbc-95e6-406b-92dc-ceb37c7fe127`, `application_case_id: b3239196-4e1d-4648-bcac-0ab9140f0c35`)이 Polar가 웹훅을 재시도해줄지 확인 — 재시도가 없으면 해당 건은 수동 복구(재확인 트리거 또는 직접 entitlement 부여) 필요. (2) 새 100% 할인 결제로 엔드투엔드 재검증.

## 2026-08-23 — Claude: 관리자 콘솔 `/meensoo` 신설 (기존 `/MAIL` 보존)

- Agent/session: Claude. 사용자 지시 — `/meensoo`에 admin 페이지, `/MAIL`을 여기로 옮기되 **삭제하지 말 것**, 마우스 올리면 열리는 좌측 사이드바, 구매자·첨삭 결과·메일 발송처·(추후) 문의 기록 화면, 그 외 판단해서 추가.
- Status: completed. **마이그레이션 적용은 사용자 영역.**
- 보존: `/MAIL`은 **손대지 않았습니다.** 로그인 라우트(`/api/mail/login`)와 발송 라우트(`/api/mail/send`)를 그대로 공유하며, `/meensoo/mail`은 같은 발송 경로로 가는 **두 번째 입구**입니다. 비밀번호 하나로 두 화면이 함께 열립니다.
- 인증: `src/server/admin/admin-session.ts`(신규). `/MAIL`이 이미 발급하는 쿠키(`mooa_mail_admin`, path "/")를 재사용합니다. 비교는 `timingSafeEqual`로 상수 시간에 합니다. 게이트는 **레이아웃 한 곳**에 둬서, 페이지를 새로 추가하면서 게이트를 빠뜨리는 일이 구조적으로 불가능하게 했습니다.
- 데이터: `src/server/admin/admin-repository.ts`(신규)가 **secret key**로 읽습니다. 이 화면은 계정 경계를 넘는 것이 목적이고 RLS는 정확히 그것을 막기 위해 존재하므로, 운영자 조회만이 정당한 예외입니다. 주소는 `auth.users`에 있어 PostgREST로 조인이 안 되므로 페이지당 `listUsers` 한 번으로 Map을 만들어 붙입니다(현 규모에서 1페이지).
- 신규 테이블 `supabase/migrations/20260823010000_admin_console.sql`:
  - `mail_send_log` — **수신자 1명당 1행.** 4명에게 가고 1명에게 실패한 발송을 주소 단위로 답할 수 있어야 하기 때문입니다. 지금까지 발송 기록이 **어디에도 남지 않아** "어디로 보냈나"를 답할 수 없었습니다.
  - `contact_inquiries` — 문의 폼은 아직 없지만 저장할 곳과 보는 화면을 먼저 만들어 뒀습니다. 빈 화면이 버그로 읽히지 않도록 "폼을 만들면 여기 쌓입니다"라고 적었습니다.
  - 둘 다 RLS 활성 + **정책 0개** = secret key 외 전원 거부. 남의 주소와 메시지를 담기 때문입니다.
- 화면: `/meensoo`(대시보드), `/purchases`, `/analyses`, `/analyses/[id]`, `/mail`, `/mail/history`, `/inquiries`, `/waitlist`. 사이드바는 64px 레일 → hover/focus 시 232px로 **CSS만으로** 확장하며, `position: fixed`라 표를 밀어내지 않습니다(커서 아래에서 내용이 움직이면 못 씁니다). 문의 배지는 미답변 건수.
- 첨삭 결과 상세는 `resultDocumentSchema`로 검증하지 않고 **느슨하게 읽습니다.** 옛 프롬프트 버전이 남긴 기록도 열려야 하며, 검증에 걸려 안 열리는 건이야말로 들여다볼 가치가 있는 건이기 때문입니다. 읽지 못한 부분은 하단 원본 JSON으로 떨어집니다.
- 색인 차단: `next.config.ts` `privatePaths`에 `meensoo`와 **`MAIL`**을 추가했습니다. `/MAIL`은 그동안 noindex 헤더가 없어 경로를 추측한 크롤러에게 열려 있었습니다(보안 수정, 기존 동작에 헤더만 추가).
- Files/branch: `supabase/migrations/20260823010000_admin_console.sql`, `src/server/admin/admin-session.ts`, `src/server/admin/admin-repository.ts`, `src/app/meensoo/**`(신규 12파일), `src/app/api/meensoo/logout/route.ts`, `src/app/api/mail/send/route.ts`(기록 추가), `next.config.ts` on `main`.
- Validation: `npx next build` 클린(meensoo 8개 라우트 전부 dynamic), `npx vitest run` 410 passed, `npx tsc --noEmit` clean, ESLint 0건. 로컬 실측 — 비로그인 시 로그인 화면, 로그인 후 7개 라우트 전부 200, 대시보드에 실제 결제 54건·매출 408,700원 렌더 확인.
- **남은 일(사용자)**: (1) `20260823010000_admin_console.sql`을 Supabase에 적용해야 메일 기록·문의 화면이 실제로 쌓입니다(미적용 상태에서도 빈 화면으로 안전하게 뜹니다). (2) Cloudflare에 `MAIL_ADMIN_SECRET`이 있는지 확인 — 없으면 `/meensoo`는 항상 로그인 실패합니다.
- **발견(별건)**: `PENDING` 상태로 멈춘 분석이 다수 있습니다. 크론 백스톱(`/api/analysis-runs/advance`)은 `status = 'RUNNING'`만 집어가므로, 결제가 승인됐어도 사용자가 결제-복귀 화면을 떠난 뒤라면 분석이 **영영 시작되지 않습니다.** 19:34 결제 건이 정확히 이 상태입니다(주문은 `결제됨`, 실행은 `대기`).

## 2026-08-23 — Claude: 재첨삭 패널에 이력서·경력기술서·포트폴리오 구분 업로드 복원

- Agent/session: Claude. 사용자 지적 — 결과 화면 "추가 요청" 패널에 **이력서·직무기술서·포트폴리오 UI를 그대로 살린다고 했는데 안 되어 있다.**
- Status: completed.
- 확인: 지적이 맞았고, **UI 문제로 끝나지 않았습니다.** 이 패널은 `AdditionalInfoInput`의 일반 "파일 첨부"를 쓰고 있었는데, 그 경로로 올라간 파일은 `freeformAttachments`에 종류 없이 저장됩니다. `MaterialUpload`의 주석이 이미 적어 둔 그대로 — 종류 없는 첨부는 프롬프트에 **"포트폴리오·추가 경험"으로 들어갑니다.** 즉 재첨삭하려고 올린 **이력서가 모델에게는 포트폴리오로 설명되고** 있었습니다. 종류는 장식이 아니라 프롬프트가 각 문서를 부르는 이름입니다.
- 조치:
  - 패널에 PRO 입력 화면과 **같은 `MaterialUpload`**(이력서 / 경력기술서 / 포트폴리오 3개 슬롯)를 넣었습니다. 새로 만들지 않고 기존 컴포넌트를 그대로 씁니다.
  - `mergeFreeformAttachments` → `mergeMaterialAttachments`로 바꿔 `materialAttachments`에 **선택한 종류와 함께** 저장합니다. 중복 판정 키도 `kind:filename`으로, `MaterialUpload`와 같게 맞췄습니다(같은 파일을 두 종류로 올리는 것은 정당합니다).
  - `AdditionalInfoInput`에 `allowAttachments` prop 추가(기본 `true`, 기존 호출부 무영향). 재첨삭 패널만 `false`로 씁니다 — 종류를 고르지 않고 올릴 수 있는 **두 번째 경로가 남아 있으면 안 되기** 때문입니다. 끌어다 놓기 핸들러도 함께 끕니다(핸들러만 남기면 파일이 종류 없이 들어가고, 아예 없으면 브라우저가 페이지를 떠나 파일을 엽니다 — 껐으면 드롭을 거부해서 라벨 업로더로 가게 합니다).
  - 안내 문구를 "끌어다 놓으세요" → "아래에서 추가하세요"로 고쳤습니다(이제 버튼입니다).
  - 전송 버튼 조건을 `요청 문구 있음` → `요청 문구 또는 첨부 있음`으로 완화했습니다. 빠졌던 경력기술서를 첨부하는 것 자체가 하나의 요청인데, 문구를 요구하면 **파일만 올린 사람 앞에서 버튼이 죽어 있었습니다.**
- Files/branch: `src/components/result-workspace-complete.tsx`, `src/components/additional-info-input.tsx`, `src/components/result-workspace-complete.test.tsx` on `main`.
- Validation: `npx vitest run` 411 passed(신규 1건 — 파일 입력이 정확히 3개이고 각 라벨이 이력서·경력기술서·포트폴리오이며, 일반 "파일 첨부"가 없음을 확인), `npx tsc --noEmit` clean, ESLint 0건. 브라우저 실측은 불가 — 이 패널은 `isSample === false`일 때만 뜨고, 로그인 없이 열리는 결과 화면은 전부 샘플입니다.

## 2026-08-23 — Claude: 매출에서 테스트·무료 분리 + 최종 첨삭 뒤 내용 보완 추천

- Agent/session: Claude. 사용자 지적 3건 — (1) 샌드박스 결제와 0원 할인이 매출에 섞여 있다(실제로는 거의 0원일 것), (2) 폴리쉬 끝났는데 분량이 안 찼으면 빌드를 추천해야 하지 않나, (3) 목표 글자 수 기본값 700자라 설정 안 한 사람은 무조건 700자 기준이 된다.
- Status: completed.

### (1) 매출 구분 — 마이그레이션 없이

- **확인: 대시보드의 408,700원은 사실상 허구였습니다.** 54건 중 실제 프로덕션 유료 결제는 0건입니다.
- `billing_orders`에는 환경을 구분할 단서가 **하나도 없습니다** — 샌드박스와 프로덕션이 같은 표에 같은 모양의 id로 들어갑니다.
- **컬럼을 추가하지 않았습니다.** `grant_polar_order_entitlement`가 이미 받는 `p_metadata jsonb`에 `polarEnvironment`를 넣으면 됩니다. 결제 RPC 시그니처를 건드리지 않아 **막 런칭한 결제 경로에 위험을 만들지 않습니다.**
- 웹훅 경로와 결제-복귀 재확인 경로 **양쪽 모두** `POLAR_SERVER` 값을 실어 보냅니다. 한쪽만 하면 재확인으로 복구된 주문이 구분 없이 남습니다.
- 화면은 네 갈래로 나눕니다 — **실매출**(프로덕션 · 0원 초과) / **무료**(100% 할인) / **샌드박스** / **구분 전**. 이유가 서로 달라 한 덩어리로 묶으면 안 됩니다.
- **기존 54건은 `구분 전`입니다.** 행에 복구할 단서가 없어 추정하지 않았습니다 — 추정하면 가짜 돈이 매출에 들어갑니다. 사용자가 직접 표시하려면(예: 프로덕션 결제가 처음 성공한 8/23 이전을 전부 샌드박스로) Supabase에서:
  ```sql
  update public.billing_orders
     set metadata = metadata || '{"polarEnvironment":"sandbox"}'::jsonb
   where paid_at < '2026-08-23T00:00:00Z'
     and metadata->>'polarEnvironment' is null;
  ```

### (2) 최종 첨삭 뒤 분량이 모자라면 내용 보완 추천

- **확인: 지적이 맞았고 구멍이었습니다.** `recommendNextStep`은 PRO 최종 첨삭이 끝나면 무조건 `null`(추천 없음)이었습니다. 그런데 첨삭은 **지원자가 쓴 말로만** 늘립니다 — 자소서에 한 번도 안 나온 경험을 이력서에서 꺼내오지 않습니다(quick-3.1에서 정리한 경계). 그래서 재료가 모자라면 다듬어도 짧은 채로 남고, **그걸 채우는 단계는 내용 보완뿐인데 아무 안내가 없었습니다.**
- 이제 최종 첨삭 뒤에도 짧은 문항이 있으면 **PRO 내용 보완**을 권합니다(QUICK·PRO 양쪽). 자료를 받아야 하므로 `/pro/build`로 보냅니다.
- BUILD 뒤에 여전히 짧은 경우는 **기존대로 아무것도 권하지 않습니다** — 채우기를 이미 시도한 뒤라 재료가 떨어진 것이고, 한 번 더 파는 것은 정직하지 않습니다.

### (3) 목표 글자 수 700자 기본값을 드러냄

- **확인: 기본값이 조용히 두 가지를 결정하고 있었습니다** — 작성 단계 자동 판정과 "짧다"의 기준. 그런데 화면에는 그냥 `700`이 채워져 있어, 안 건드린 사람은 이 숫자가 회사 요구인지 우리 기본값인지 알 수 없었습니다.
- 추천 문구가 **기준을 밝힙니다**: "목표 700자 기준으로 3개 문항이 짧습니다 … 목표 분량이 실제 요구 분량과 다르면 그대로 두셔도 됩니다." 문항마다 목표가 다르면 숫자를 지어내지 않고 "목표 분량 기준으로"라고만 씁니다.
- 입력 화면(`/onboarding`, `/begin`) 라벨에 "기본 700자 · 공고에 적힌 분량으로 바꿔 주세요"를 넣었습니다.
- Files/branch: `src/server/billing/polar-checkout.ts`, `polar-webhook.ts`, `polar-checkout-reconciliation.ts`, `src/app/api/webhooks/polar/route.ts`, `src/app/api/checkouts/quick/status/route.ts`, `src/server/admin/admin-repository.ts`, `src/app/meensoo/{page.tsx,format.ts,pill.tsx,purchases/page.tsx}`, `src/domain/next-step.ts`, `src/components/result-workspace-complete.tsx`, `src/app/onboarding/page.tsx`, `src/app/begin/page.tsx` + 테스트 3종 on `main`.
- Validation: `npx vitest run` 416 passed(신규 6건), `npx tsc --noEmit` clean, ESLint 0건, `npx next build` 클린. 실데이터 확인 — 실매출 **0원 · 0건**, 무료 1건, 구분 전 54건.
- 부수 수정: `shortQuestions`를 쓰는 `useMemo`가 선언보다 위에 있어 **TDZ 오류**가 날 수 있었습니다(React Compiler 린트가 잡음). 선언을 위로 옮기고 의존성을 `result` 전체에서 실제 사용값으로 좁혔습니다.

## 2026-08-23 — Claude: 재첨삭 패널 — 종류별 슬롯 3개 유지 + 입력창을 기타 자료 자리로

- Agent/session: Claude. 사용자 지시 — 이력서 UI는 유지하면서 입력창에도 드래그앤드롭 첨부를 살릴 것. 이유: 기타 자료용 버튼을 하나 더 만드는 대신 입력창에 넣고 싶고, 압축파일·여러 파일 같은 경우가 있어 버튼 4개로는 안 떨어짐.
- Status: completed.
- 직전 커밋(`f7413f5`)에서 종류 없는 첨부 경로를 **껐던 것을 되돌립니다.** 그때 끈 이유(종류 없이 올라간 이력서가 프롬프트에 "포트폴리오·추가 경험"으로 전달됨)는 유효하지만, **종류별 슬롯 3개가 위에 있는 지금은 입력창 첨부가 "기타" 칸으로 읽힙니다.** 실제 전달 라벨도 `portfolio: "포트폴리오·추가 경험"`이라 기타 자료용으로 쓰는 것이 동작과 일치합니다.
- `AdditionalInfoInput`은 **손대기 전 상태로 완전히 복구**했습니다(`git diff f7413f5^` 결과 0). 직전 커밋에서 추가했던 `allowAttachments` prop은 호출부가 없어져 죽은 코드가 되므로 제거했습니다.
- 두 경로가 각자 다른 곳에 저장됩니다 — 슬롯은 `materialAttachments`(종류 포함), 입력창은 `freeformAttachments`. `startRevision`이 둘 다 병합합니다.
- 어디에 무엇을 넣을지 화면에 적었습니다: "그 밖의 자료(공고, 자격증, 수상 내역 등)나 파일이 여러 개라면 아래 입력창에 함께 올려 주세요. 이력서·경력기술서·포트폴리오는 위에서 종류별로 올려야 더 정확하게 반영됩니다."
- 전송 버튼은 **요청 문구 · 종류별 첨부 · 기타 첨부 중 하나만 있어도** 열립니다.
- 참고: 압축파일(zip)은 지원하지 않습니다(`accept=".pdf,.docx,.txt,.md"`). 여러 파일은 한 번에 선택하거나 끌어다 놓으면 됩니다(최대 10개).
- Files/branch: `src/components/result-workspace-complete.tsx`, `src/components/additional-info-input.tsx`(복구), `src/components/result-workspace-complete.test.tsx` on `main`.
- Validation: `npx vitest run` 417 passed. 신규 1건이 **핵심을 잠급니다** — 이력서 칸에 넣은 파일은 `materialAttachments`에 `kind: "RESUME"`로, 기타 칸에 넣은 파일은 `freeformAttachments`로 저장되는지 실제로 파일을 올려 확인합니다(파서는 목으로 대체). 기존 구조 테스트도 파일 입력 4개(슬롯 3 + 기타 1)로 갱신. `npx tsc --noEmit` clean, ESLint 0건, `npx next build` 클린.

## 2026-08-23 — Claude: 압축파일(ZIP) 지원 — 기타 자료 칸 한정

- Agent/session: Claude. 사용자 질문 — "zip도 되나?"
- Status: completed.
- **`jszip`을 직접 의존성으로 추가했습니다.** 이미 `node_modules`에 있었지만 `mammoth`의 전이 의존성이라(DOCX가 zip입니다) mammoth가 바꾸면 조용히 사라집니다. 다운로드는 새로 없고 선언만 명시적으로 바뀝니다. 무거운 파서(mammoth·pdfjs·jszip)는 전부 함수 안에서 `await import`이라 zip을 올리기 전까지 번들에 실리지 않습니다.
- **기타 자료 칸에서만 받습니다.** 이력서 슬롯에 zip을 넣으면 안에 든 경력기술서까지 전부 `RESUME`로 표시돼 종류가 어긋납니다. zip은 애초에 "종류를 하나로 못 고르는 묶음"이므로 기타 칸이 제자리입니다. 종류별 슬롯 3개의 `accept`는 그대로 뒀습니다.
- **한 파일로 합치지 않고 안에 든 문서마다 첨부 하나씩으로 풉니다.** 합쳐 버리면 나중에 한 개만 빼는 것이 불가능해집니다. 폴더 안에 있어도 파일 이름만 남깁니다.
- 처리 규칙:
  - 읽을 수 있는 것은 PDF·DOCX·TXT·MD. **읽지 못한 파일은 이름을 화면에 남깁니다** — zip이 조용히 경력기술서를 잃어버리면 지원자는 결제 전에 알아챌 방법이 없습니다.
  - `__MACOSX/`, `.`으로 시작하는 파일, `Thumbs.db`는 **빠졌다고 하지 않습니다.** 압축 프로그램이 넣은 것이지 지원자가 넣은 것이 아니고, 목록에 섞이면 진짜 빠진 파일이 묻힙니다.
  - 최대 20개까지만 엽니다(`MAX_ZIP_ENTRIES`). 파일 하나하나가 지원자가 돈을 내는 프롬프트 입력이 되므로, 통째로 올린 취업 폴더에 요금을 쓰지 않기 위한 거절입니다. 넘친 것도 이름을 밝힙니다.
  - 암호가 걸렸거나 깨진 zip은 "암호가 걸려 있다면 압축을 풀어서 올려 주세요"로 안내합니다.
  - 안에 읽을 문서가 하나도 없으면 무엇을 읽을 수 있는지 말하고 거절합니다.
- **첨부 10개 상한을 추출 이후로 옮겼습니다.** 기존 검사는 zip을 1개로 세서, 20개가 든 zip 하나가 상한을 그냥 통과했습니다.
- Files/branch: `src/lib/local-document.ts`, `src/lib/local-document.test.ts`(신규), `src/components/additional-info-input.tsx`, `package.json`, `vitest.config.ts` on `main`.
- Validation: `npx vitest run` 425 passed(신규 8건 — 여러 파일 분해·폴더 경로·읽지 못한 파일 명시·찌꺼기 무시·개수 상한·빈 zip·비zip 통과·깨진 zip). `npx tsc --noEmit` clean, ESLint 0건, `npx next build` 클린.
- 부수 수정: 다른 세션의 백그라운드 에이전트가 `.claude/worktrees/`에 작업 트리를 만들면 **vitest가 전체 테스트를 두 번 돌리고 그 세션의 진행 중 실패를 이 세션 것으로 보고**했습니다(129 파일·842건으로 뜀). `vitest.config.ts` exclude에 추가했습니다.

## 2026-08-23 — Claude: ZIP 적용 범위 확인 + 빠질 수 있다는 안내 명시

- Agent/session: Claude. 사용자 지시 — zip을 전체적으로 적용하되 **그 입력창에만** 허용하고, **안 될 수도 있다는 안내**를 붙일 것.
- Status: completed.
- **적용 범위는 이미 전체였습니다.** `AdditionalInfoInput`이 공용 컴포넌트라 한 번 고치면 세 화면에 동시에 적용됩니다 — `pro-input-page`(PRO 추가 경험), `pro-create-wizard`(처음부터 작성 마법사), `result-workspace-complete`(재첨삭 기타 자료). 별도 작업 없이 확인만 했습니다.
- **다른 업로드 자리는 그대로 zip을 받지 않습니다**(의도된 범위): `onboarding`, `coming-soon-hero-input`, `landing-entry`, `resume-intake`, `job-posting-input`, `material-upload`. 이 자리들은 파일 하나가 곧 자소서·공고·특정 종류의 자료라, 묶음이 들어오면 무엇을 그 자리에 넣을지 정할 수 없습니다.
- 안내 문구를 구체적으로 바꿨습니다. 압축파일은 **지원자가 무엇이 통과했는지 볼 수 없는 유일한 업로드**라, 시도하기 전에 빠질 것을 먼저 말합니다:
  > ZIP은 안에 든 PDF·DOCX·TXT·MD만 꺼내 읽습니다. 암호가 걸려 있거나 HWP·이미지가 들어 있으면 그 파일은 빠지며, 빠진 파일 이름을 알려 드립니다. 꺼낸 파일도 첨부 10개 제한에 포함됩니다.
- "최대 20개"는 문구에서 뺐습니다 — 첨부 상한이 10개라 20개는 **실제로 도달할 수 없는 숫자**이고, 적어 두면 거짓말이 됩니다. `MAX_ZIP_ENTRIES = 20`은 라이브러리 자체 안전장치로 남습니다.
- Files/branch: `src/components/additional-info-input.tsx`, `src/components/result-workspace-complete.test.tsx` on `main`.
- Validation: `npx vitest run` 426 passed(신규 1건 — 종류별 슬롯 3개는 `accept`에 zip이 없고 기타 칸만 있으며, 경고 문구가 화면에 있는지 확인). `npx tsc --noEmit` clean, ESLint 0건, `npx next build` 클린.
- 보류: HWP는 사용자 판단으로 **나중에** 적용합니다.
## 2026-08-23 — Claude: 결제됐는데 시작조차 안 된 분석을 크론이 되살리도록

- Agent/session: Claude. 직전 항목(`/meensoo` 신설)에서 **발견만 해 두고 고치지 않은 것**을 이번에 고칩니다: 크론 백스톱이 `RUNNING`만 집어가므로, 결제 승인이 사용자가 창을 닫은 뒤에 도착하면 분석이 영영 시작되지 않습니다. 8/23 19:34 PRO 주문이 정확히 그 상태입니다 — 주문은 `PAID`, 실행은 `PENDING`, `response_id`는 `null`. **돈은 받고 아무것도 주지 않은 상태**이며, 복구 수단은 그 체크아웃 복귀 URL로 되돌아가는 것뿐이었습니다.
- Status: completed. **마이그레이션 없음 — 배포만 하면 적용됩니다.**
- Protected baseline: `advance/route.ts`의 기존 `RUNNING` 처리 로직, `execute/route.ts`, `begin_quick_analysis`, `quick-checkout-return.tsx`. **어느 것도 바꾸지 않았습니다.** 되살리기는 기존 배치 뒤에 덧붙는 별도 구간입니다.

### 무엇이 문제였나

- `PENDING → RUNNING`으로 넘기는 것은 오직 `POST /api/analysis-runs/quick/execute` 하나뿐이고, 그것을 호출하는 것은 결제-복귀 화면(`quick-checkout-return.tsx`)의 브라우저뿐입니다.
- Polar 웹훅이 **창을 닫은 뒤에** 이용권을 발급하면 그 호출을 할 사람이 아무도 없습니다.
- 크론(`/api/analysis-runs/advance`)은 `.eq("status", "RUNNING")`만 조회하므로 이 실행을 쳐다보지 않습니다.

### 어떻게 고쳤나

- 크론이 **결제된 `PENDING` 실행**도 집어서, `execute/route.ts`가 쓰는 것과 **같은 두 단계**(`begin_quick_analysis` → `startBackground` → `saveBackgroundResponse`)로 밀어 넣습니다. 그 뒤부터는 기존 `RUNNING` 배치가 폴링·완료 메일·10분 환불까지 다 맡습니다. 구현을 새로 만들지 않았습니다 — 두 벌이 되면 갈라집니다.
- **어떤 `PENDING`이 결제된 것인지 가리는 게 핵심입니다.** `PENDING` 대부분은 결제 없이 버려진 체크아웃입니다. 두 가지가 함께 있어야 결제된 것으로 봅니다:
  1. 그 실행의 `checkout_intents.status = 'SUCCEEDED'` — `mark_polar_checkout_succeeded`가 이용권 발급과 **같은 저장소 호출 안에서** 실행되므로 웹훅 경로와 결제-복귀 재확인 경로 양쪽 다 남습니다.
  2. 같은 case·owner·product에 `ACTIVE` 이용권이 있음.
- 왜 1번이 필요한가: 이용권은 **실행이 아니라 case에 붙습니다.** 한 case에 버려진 시도와 실제로 결제한 재실행이 나란히 있을 수 있고, 잘못 고르면 **지원자가 기다리지 않는 스냅샷에 이용권을 써 버립니다.** 체크아웃 인텐트만이 "이 실행에 돈이 지불됐다"를 증명합니다.
- **이용권 테이블에서 출발합니다**(`analysis_runs`가 아니라). 버려진 `PENDING`은 영원히 쌓이므로 그 표에 창을 걸면 언젠가 창 전체가 옛 미결제 행으로 차서 새 결제가 영영 안 보입니다. `ACTIVE` 이용권은 반대로 "받은 돈 중 아직 안 준 것"이라 정상 경로에서는 몇 초 만에 비워집니다.
- 다만 **최종 실패·타임아웃 환불도 이용권을 `ACTIVE`로 되돌려 놓고 그대로 둡니다**(`fail_quick_analysis`, `claim_quick_analysis_timeout_refund`). 그래서 오래된 쪽에 죽은 행이 침전합니다 — 스캔을 **최신순 100건**으로 잡은 이유입니다(상한은 뒤따르는 질의의 case id 목록이 PostgREST URL에 무리 없이 들어가는 길이). 옛날부터 방치된 건은 놓칠 수 있지만(그건 `/meensoo/analyses`에서 보입니다) **방금 들어온 결제가 굶는 일은 없습니다.** 찾은 것 중에서는 **가장 오래 기다린 순**으로 처리합니다.

### 중복 소비·경합을 어떻게 막는가

- `begin_quick_analysis`는 **실행 행을 `for update`로 잠그고 `status = 'PENDING'`일 때만** 진행합니다. 브라우저와 크론이 동시에 들어와도 한쪽은 `ANALYSIS_RUN_NOT_STARTABLE`을 받습니다 — 이용권이 두 번 소비되지 않습니다. 이 거절은 오류가 아니라 `START_REFUSED`로 기록만 합니다(`advanceOne`의 `ALREADY_DONE` 처리와 같은 성격).
- 이용권도 `for update skip locked limit 1`로 한 장만 집습니다.
- 코드 쪽에서도 **이용권 장수만큼만** 실행을 배정합니다. 같은 case에 결제된 `PENDING`이 둘인데 이용권이 하나면 하나만 넘깁니다(SQL이 어차피 거절하지만 물어볼 이유가 없습니다).
- **2분 유예**를 둡니다(이용권 발급 시각 기준). 동시 실행이 안전하긴 해도 정상 경로는 브라우저이고, 매 판매마다 크론과 경주할 이유는 없습니다.
- 크론 컨텍스트에서 호출 가능한 이유: `begin_quick_analysis`는 `auth.uid()`가 아니라 `p_owner_user_id`를 인자로 받는 `security definer` 함수이고 `service_role`에 실행 권한이 있습니다. 이 전제를 `stranded-paid-run-recovery-migration.test.ts`가 잠급니다.

### 이미 멈춰 있는 건들

- **별도 SQL 작업이 필요 없습니다.** 배포하면 크론이 매분 최대 3건씩 알아서 되살립니다. 19:34 건도 여기에 해당합니다(이용권 `ACTIVE`, 인텐트 `SUCCEEDED`, 실행 `PENDING`).
- 덤으로, **재시도 가능한 실패로 `PENDING`에 되돌아온 실행**(`fail_quick_analysis`가 `attempt_count < 2`일 때 그렇게 합니다)도 이제 자동으로 다시 시작됩니다. 시도 횟수는 SQL이 막으므로 무한 반복이 아닙니다 — 두 번째 실패에서 `FAILED`로 확정됩니다.
- 배포 뒤 남은 사람이 있는지 보려면(인텐트가 `SUCCEEDED`가 아닌 예외적인 건):
  ```sql
  select ar.id, ar.product, ar.created_at, ci.status as intent_status
    from public.analysis_runs ar
    join public.analysis_entitlements ae
      on ae.application_case_id = ar.application_case_id
     and ae.owner_user_id = ar.owner_user_id
     and ae.product = ar.product
     and ae.status = 'ACTIVE'
    left join public.checkout_intents ci on ci.analysis_run_id = ar.id
   where ar.status = 'PENDING'
     and (ci.status is distinct from 'SUCCEEDED')
   order by ar.created_at;
  ```
  결과가 나오면 그건 결제-체크아웃 연결이 끊긴 건이라 개별 판단이 필요합니다(대개 `billing_orders.provider_checkout_id`가 비어 있는 경우).
- Files/branch: `src/app/api/analysis-runs/advance/route.ts`, `src/server/analysis/stranded-paid-runs.ts`(신규), `src/server/analysis/stranded-paid-runs.test.ts`(신규), `src/server/analysis/stranded-paid-run-recovery-migration.test.ts`(신규), `src/app/api/analysis-runs/advance/route.test.ts` on `claude/youthful-hugle-058e60` (worktree `.claude/worktrees/youthful-hugle-058e60`).
- Validation: `npx vitest run` 433 passed(신규 16건 — 고르기 로직 7, 라우트 4, SQL 전제 5), `npx tsc --noEmit` clean, ESLint 0건, `npx next build` 클린. 라우트 테스트는 Supabase 클라이언트를 가짜로 바꿔 **질의 자체를 검증합니다**: 결제된 실행만 `begin`으로 가는지, 미결제 실행은 건너뛰는지, 미소비 이용권이 없으면 `PENDING` 표를 조회조차 하지 않는지, 되살리기가 터져도 기존 `RUNNING` 처리가 200으로 끝나는지.
- Rollback/recovery reference: 되살리기 구간은 `startStrandedRuns` 호출 한 줄과 그 아래 함수들뿐입니다. 그 호출만 지우면 이전 동작(= `RUNNING`만 처리)으로 정확히 돌아갑니다. 커밋 이전 상태는 `a36749f`.
- **남은 일(사용자)**: 커밋 + 재배포. 배포 후 첫 1~2분 안에 `advance` 응답의 `started` 배열에 `START_RECOVERED`가 찍히는지, `/meensoo/analyses`에서 `PENDING`이던 결제 건이 `RUNNING → COMPLETED`로 넘어가는지 확인해 주세요.

## 2026-08-24 — Claude: 관리자 메일에 사진·첨부파일 붙이기

- Agent/session: Claude. 사용자 요청: `/meensoo/mail`(관리자 콘솔 메일 보내기)에서 첨부파일과 사진도 보낼 수 있게.
- Status: completed. **마이그레이션 없음 — 배포만 하면 적용됩니다.**
- Protected baseline: `/MAIL` 화면(`src/app/MAIL/page.tsx`)은 **한 글자도 바꾸지 않았습니다.** 예전처럼 JSON을 그대로 POST하고, 그대로 동작합니다. `sendManualEmail`의 기존 동작(수신자당 1통, 실패 수집, 본문 이스케이프)도 그대로입니다 — 첨부는 그 위에 덧붙는 선택 항목입니다.

### 무엇이 문제였나

- 콘솔 메일은 **글자만** 보낼 수 있었습니다. 행사 포스터, 한 장짜리 안내문, "여기를 누르세요" 스크린샷처럼 그림이 들어가는 것은 개인 메일 클라이언트로 보내야 했고, 그러면 **발송 기록도 남지 않고 인증된 발신 도메인도 타지 않습니다.**

### 어떻게 고쳤나

- **한도는 `src/domain/mail-attachments.ts` 한 곳에** 둡니다(신규). 화면과 라우트가 같은 규칙을 봅니다: 최대 5개, 하나당 5MB, 합쳐서 10MB. 화면에서 먼저 막는 이유는 **6MB 파일을 다 올린 뒤에 거절당하면 그 기다린 시간이 통째로 버려지기 때문**입니다. 라우트에서도 다시 검사합니다(화면을 거치지 않는 요청이 있을 수 있으므로).
- **라우트는 두 가지 요청 모양을 읽습니다.** `multipart/form-data`면 파일까지, 아니면 예전처럼 JSON. 파일을 JSON에 실으려면 브라우저에서 먼저 base64로 부풀려야 해서(+33%) multipart를 씁니다. `/MAIL`을 새 모양으로 이사시키지 않기 위한 선택이기도 합니다.
- **검사 순서가 중요합니다**: 로그인 → 필수 항목 → **첨부 검사** → 받는 사람 검사 → 발송. 받는 사람 검사를 먼저 통과시켜 놓고 첨부에서 터지면 이미 늦습니다 — 기존 코드가 "한 명이라도 보내기 전에 전부 검사한다"는 원칙을 갖고 있어서 그대로 따랐습니다.
- **사진은 본문 안에 보이게, 나머지는 첨부로만.** PNG·JPG·GIF·WEBP는 `content_id`를 받아 본문 아래에 `<img src="cid:...">`로 불립니다. `https://` 이미지는 파일을 어딘가 공개 호스팅해야 하고 `data:` URI는 Gmail이 지워 버려서, 메일과 함께 다니는 `cid:`가 유일하게 맞는 방법입니다. **참조를 못 알아듣는 클라이언트에서도 같은 사진이 첨부 줄에 그대로 보이므로 사라지지 않습니다.**
- **base64 인코딩은 수신자마다가 아니라 한 번만** 합니다. 50명 × 5MB면 인코딩 50번과 1번의 차이입니다. `Buffer` 대신 `btoa`를 쓰는 이유는 Cloudflare 런타임에서도 돌기 때문이고, 0x8000 바이트씩 끊는 이유는 `String.fromCharCode`에 수백만 개를 한 번에 펼치면 인자 목록이 넘치기 때문입니다.
- **첨부가 있으면 한 통 대기시간을 15초 → 60초**로 늘립니다. 5MB를 느린 회선에서 올리는 데 15초는 모자랍니다.
- 파일 이름은 `safeAttachmentName`으로 경로·따옴표·제어문자를 떼어냅니다. 이름은 메일 헤더에 들어간 뒤 **받는 사람 컴퓨터에 그대로 저장되는 값**이라, `../../etc/passwd` 같은 것이 통과하면 안 됩니다.
- 화면에서는 고른 파일을 이름·크기와 함께 목록으로 보여 주고, 사진에는 `· 본문에 표시`를 붙입니다. 두 번째로 고른 파일이 첫 번째를 지우지 않도록 **합칩니다**(같은 이름·같은 크기는 중복으로 봅니다). 보내기가 **완전히** 성공했을 때만 목록을 비웁니다 — 실패한 주소가 있으면 다시 보내야 하므로 첨부가 그대로 남아 있어야 합니다.
- Files/branch: `src/domain/mail-attachments.ts`(신규), `src/domain/mail-attachments.test.ts`(신규), `src/server/notifications/manual-email.ts`, `src/server/notifications/manual-email.test.ts`(신규), `src/app/api/mail/send/route.ts`, `src/app/api/mail/send/route.test.ts`(신규), `src/app/meensoo/mail/mail-composer.tsx`, `src/app/meensoo/mail/mail-composer.test.tsx`(신규), `src/app/meensoo/mail/page.tsx`, `src/app/meensoo/admin.module.css` on `main`.
- Validation: `npx vitest run` 475 passed(신규 42건 — 한도·이름 정리 11, Resend 요청 모양 7, 라우트 두 요청 모양 7, 화면 8, 기존 회귀 포함). `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- Rollback/recovery reference: 되돌리려면 (1) 라우트의 `readRequest`/첨부 검사 구간, (2) `manual-email.ts`의 `files`·`inlineImages`·`toBase64`, (3) 화면의 첨부 UI를 지우면 됩니다. 세 곳 다 기존 코드 **위에 덧붙은 구간**이라 잘라내면 정확히 이전 동작으로 돌아갑니다. 커밋 이전 상태는 `ae6397d`.
- **알려진 빈칸**: `mail_send_log`에는 첨부 정보를 남기지 않습니다(컬럼이 없습니다). 그래서 `/meensoo/mail/history`는 "무엇이 함께 갔는지"를 답하지 못합니다. 컬럼 추가는 마이그레이션이 필요하므로 사용자 판단으로 **별건**으로 둡니다.
- **남은 일(사용자)**: 커밋 + 재배포 후 `/meensoo/mail`에서 사진 1장 + PDF 1개를 자기 주소로 보내 확인해 주세요. 확인할 것 두 가지 — 본문 아래에 사진이 보이는지, 첨부 줄에 두 파일이 다 있는지.

## 2026-08-24 — Claude: FINAL 1단계 — 분석 두뇌와 현장 신뢰 섹션

- Agent/session: Claude. 사용자 요청: FINAL 플랜 구현 시작 + 메인 브랜드 홍보 블록 추가. 참고 대화(ChatGPT 공유 링크)의 FINAL 설계안을 기준으로 삼았습니다.
- Status: **부분 완료(1단계).** FINAL은 아직 **구매·실행할 수 없습니다.** 이번에 만든 것은 "FINAL이 무엇을 내놓는가"를 정의하는 분석 계층뿐입니다. 남은 단계는 아래 **다음 단계** 항목에 적었습니다.
- Protected baseline: QUICK·PRO의 프롬프트 문장, 출력 스키마, 결과 문서 스키마를 **한 줄도 바꾸지 않았습니다.** FINAL 관련은 전부 기존 코드 위에 덧붙는 분기·필드입니다. `next-step.ts`의 추천 로직, `final-upgrade-card.tsx`의 QUICK·PRO 카드도 그대로입니다.

### FINAL을 무엇으로 정의했나

- 참고 대화의 결론을 그대로 따랐습니다: FINAL은 **"자소서 첨삭의 상위버전"이 아니라 실제 면접관이 보는 지원서 전체를 검증하고 면접까지 연결하는 단계"**입니다.
- 이 구분이 중요한 이유는 **PRO가 이미 면접 예상질문·면접 리스크·자료 간 교차검증을 팔고 있기 때문**입니다. FINAL이 "그걸 더 많이"라면 차이가 흐려집니다. 그래서 경계를 이렇게 그었습니다:
  - **PRO** = 자소서를 **채용공고**와 대조. 이력서는 근거를 보태는 참고자료.
  - **FINAL** = 자소서를 **이력서**와 대조. 면접관이 실제로 하는 일(이력서 왼쪽, 자소서 오른쪽, 안 맞는 날짜에 손가락)이 그대로 제품이 됩니다.
- 그래서 FINAL 전용 출력은 네 가지입니다.
  - `careerTimeline` — 두 자료에서 읽어낸 학력·경력·프로젝트·자격증·교육·공백을 시간순으로. **한쪽에만 있는 항목**이 핵심입니다.
  - `documentConflicts` — 이력서 기재와 자소서 원문을 **양쪽 다 인용해** 무엇이 어긋나는지.
  - `interviewerFlags` — "면접관이라면 여기서 묻습니다". 예상질문 + **꼬리질문** + 답변 준비 포인트.
  - `finalChecklist` — 면접 전 최종 점검.
- FINAL은 **PRO 플러스이지 PRO 마이너스가 아닙니다.** `finalRequestSchema`는 PRO의 세 필드를 그대로 포함하고, 프롬프트도 PRO 블록을 그대로 받은 뒤 FINAL 블록을 덧붙입니다. 테스트가 이것을 잠급니다(`PRO 지시 한 줄도 잃지 않는다`).

### 이번에 잡힌 실제 버그

- `questions.ts`의 네 개 판정 함수가 `product === "PRO"`를 직접 물었습니다. FINAL을 추가하는 순간 **FINAL이 조용히 QUICK처럼 동작**합니다 — 목표 분량 없음, 빈 문항 안 채움, 이력서로 쓰지 않음. 즉 **14,900원짜리가 12,900원짜리보다 못한 결과**를 냅니다.
- `hasProCapabilities(request)` 하나로 묶었습니다. 질문이 "이 실행이 PRO인가"가 아니라 **"이 실행이 지원자료를 열어도 되는가"**이기 때문입니다. 위의 "PRO 지시를 하나도 잃지 않는다" 테스트가 이 버그를 잡아냈습니다.

### 지어내지 않게 막은 것

- 모든 FINAL 배열에 **최소 개수가 없습니다.** 두 자료가 실제로 맞는 지원자에게 충돌을 하나 만들어 내면 **지원자는 사실인 문장을 고치러 갑니다.** 이건 이 제품이 가장 하면 안 되는 일이라 프롬프트에도 따로 못을 박았습니다("어긋나지 않으면 documentConflicts를 빈 배열로 두세요").
- `period`는 자료에 적힌 표기를 **그대로** 옮기게 했습니다. 날짜를 정규화하면 없는 정밀도가 생깁니다. 날짜를 모르는 항목은 빼지 않고 '기간 미기재'로 남깁니다.
- `finalChecklist`에 일반 면접 조언('복장을 단정히')을 넣지 못하게 막았습니다. 이 지원서에서만 나올 수 있는 항목만 허용합니다.

### 메인 랜딩 · 현장 신뢰 섹션

- `왜 MOOA인가요?` 바로 뒤에 새 섹션을 넣었습니다. 짧은 선언("현장에서 검증된 취업 컨설팅을 기술로.") + 세 가지 근거 + 마무리 문장 구성입니다.
- **원문보다 보수적인 표현을 골랐습니다.** "실제 대기업 취업 보낸 사람들이 모여"는 쓰지 않았습니다 — 학원 광고처럼 읽히고, 무엇보다 **구성원 경력으로 뒷받침되지 않으면 나중에 문제가 되는 종류의 주장**입니다. 지금 문구는 "대학·취업전문기관·재단 등 실제 취업지원 현장에서 직업상담사와 취업지원 실무자들이 쌓아온 경험"까지만 말합니다.
- 더 강한 문장("실제 대기업 취업 성공까지 함께한 전문가들의 노하우")은 **구성원 경력이 문서로 뒷받침될 때** 한 줄 교체로 쓸 수 있습니다. 사용자 판단 사항입니다.
- Files/branch: `src/application/analysis-contract.ts`, `src/domain/result-document.ts`, `src/domain/next-step.ts`, `src/server/ai/quick/schema.ts`, `src/server/ai/quick/prompt.ts`, `src/server/ai/quick/questions.ts`, `src/server/ai/quick/provider.ts`, `src/server/ai/quick/final-analysis.test.ts`(신규), `src/fixtures/result-document.ts`, `src/components/final-upgrade-card.tsx`, `src/app/page.tsx`, `src/app/field-credibility.module.css`(신규) on `main`.
- Validation: `npx vitest run` 485 passed(신규 10건 — 페르소나 1, PRO 지시 승계 1, FINAL 전용 지시 격리 1, 빈 배열 허용 2, JSON 스키마 2, 파싱 3). `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. 랜딩 섹션은 실행 중인 dev 서버(localhost:3000)에서 DOM으로 확인 — 데스크톱 3열, 모바일 1열, 가로 스크롤 없음, 콘솔 오류 없음.
- Rollback/recovery reference: FINAL은 전부 `product === "FINAL"` 분기와 기본값 `[]`인 새 필드뿐이라, 되돌리려면 그 분기와 필드를 지우면 됩니다. 랜딩 섹션은 `src/app/page.tsx`의 `fieldStyles.section` 블록 하나와 CSS 파일 하나입니다. 커밋 이전 상태는 `ae6397d`.

### 다음 단계(아직 안 한 것)

1. **DB 마이그레이션** — `analysis_runs`, `billing_orders`, `analysis_entitlements`의 `check (product in ('QUICK','PRO'))`와 `begin_quick_analysis` 등 SQL 함수 6곳에 `'FINAL'` 추가. 이게 없으면 FINAL 실행은 시작 자체가 거절됩니다.
2. **결제** — Polar FINAL 상품·가격 등록과 `src/server/config` 환경변수. 가격표상 19,900원.
3. **입력 플로우** — **이력서 또는 이에 준하는 지원서류 필수**(이력서/경력기술서/기업 입사지원서). 없는 사용자를 위한 학력·경력·자격증·프로젝트 **구조화 입력 폼**. 신입은 별도 이력서 없이 기업 입사지원서만 쓰는 경우가 많습니다.
4. **결과 화면** — 타임라인, 교차검증, `면접관이라면 여기서 묻습니다` 영역. 지금은 데이터만 있고 보여주는 화면이 없습니다.
5. **가격표 정합성** — 현재 가격표는 FINAL에 **인터랙티브 AI 모의면접·답변 평가·동적 꼬리질문·재훈련**을 약속합니다. 이번 설계에는 그게 없습니다. **파는 것과 주는 것이 달라지므로** 둘 중 하나를 골라야 합니다: (a) 1차 FINAL을 '서류 검증 + 면접 연결'로 정직하게 다시 적고 모의면접을 후속 단계로 분리, (b) 모의면접까지 만들고 출시. **(a)를 권합니다** — 모의면접은 턴 주고받기·답변 평가·재훈련이 필요한 사실상 별개 제품입니다.
6. **`next-step.ts` QUICK 추천 문구** — "면접 예상질문까지 이어갈 수 있습니다" 옆 주석이 "FINAL은 아직 없다"고 적혀 있습니다. FINAL 출시 때 함께 손봐야 합니다.
7. (참고 대화의 다른 주제) **추천코드 → 보상 이용권 구조**(쿠폰번호 대신 계정 이용권, Polar 100% 할인 자동 적용, 1회용 수령 링크). 이번 작업과 무관한 별개 기능으로 남아 있습니다.

## 2026-08-24 — Claude: FINAL 2단계 — DB에서 FINAL을 받아들이게

- Agent/session: Claude. 사용자 요청: "일단 db 할게 뭐하면되노" + 이력서 칸 이름을 `이력서(입사지원서)`로.
- Status: 마이그레이션 **작성 완료, 아직 적용 안 됨.** 적용은 사용자가 `npm run db:remote:push`로 합니다.
- Protected baseline: 기존 마이그레이션 파일은 **하나도 수정하지 않았습니다.** 새 파일 하나를 얹어 `create or replace`로 함수를 다시 정의합니다.

### 무엇을 바꾸나 — `supabase/migrations/20260824010000_enable_final_product.sql`

- 표 세 곳의 product 제약에 `'FINAL'` 추가: `analysis_runs`, `billing_orders`, `analysis_entitlements`.
- 관문 네 곳의 함수를 다시 정의: `prepare_quick_checkout`, `register_quick_checkout`, `grant_polar_order_entitlement`, `begin_quick_analysis`. **넷 다 각자 다른 오류를 던지므로 하나라도 빠지면 결제된 FINAL이 다른 지점에서 막힙니다.**
- `analysis_runs`의 기존 제약은 **이름 없이 컬럼에 붙은 것**이라 이름으로 지울 수 없습니다. 이름을 찍어서 틀리면 **아무것도 안 지워지고 새 제약만 추가되어, 마이그레이션은 성공했다고 하는데 FINAL은 계속 거절됩니다.** 그래서 `pg_constraint`에서 정의에 `QUICK`이 들어간 체크를 찾아 지웁니다.
- **가장 위험한 한 줄**: `begin_quick_analysis`의 문서 필터가 `or target_run.product = 'PRO'`였습니다. 이걸 그대로 두면 **결제된 FINAL 실행이 자소서와 공고만 들고 도착합니다** — 대조할 이력서가 없으니 FINAL의 존재 이유가 통째로 빈 결과가 됩니다. 오류도 안 납니다. `in ('PRO', 'FINAL')`로 바꿨고 테스트가 이것을 잠급니다.
- 함수를 다시 만드는 것은 **전체 교체**라 빠뜨린 조건은 조용히 사라집니다. 그래서 테스트가 PRO 마이그레이션과 직전 `begin_quick_analysis`의 안전장치(시도 횟수 3회 제한, `PRIMARY_DOCUMENT_REQUIRED`, `for update skip locked`, `search_path = ''`, 웹훅 중복 방지 등)가 새 파일에도 그대로 있는지 하나씩 확인합니다.

### 이력서 칸 이름

- `이력서` → `이력서(입사지원서)`. 신입은 별도 이력서 없이 **기업 입사지원서만** 쓰는 경우가 많고, `이력서`만 적혀 있으면 "나는 이게 없다"로 읽힙니다.
- 두 곳을 바꿨습니다: 화면 라벨(`CANDIDATE_MATERIAL_LABEL.RESUME`, 업로드 칸·목록·저장되는 문서 제목에 함께 쓰임)과 프롬프트 라벨(`SUPPORTING_LABEL.resume`). 프롬프트 쪽도 바꾼 이유는 **입사지원서를 올렸을 때 모델이 그것을 이력서로 취급해야** 하기 때문입니다. PRO에도 적용되는 변경입니다.
- Files/branch: `supabase/migrations/20260824010000_enable_final_product.sql`(신규), `src/server/analysis/final-product-migration.test.ts`(신규), `src/domain/candidate-material.ts`, `src/server/ai/quick/prompt.ts`, `src/application/application-case-handoff.test.ts`, `src/server/ai/quick/prompt.test.ts` on `main`.
- Validation: `npx vitest run` 492 passed(신규 7건 — 제약 3표, 이름 아닌 정의로 삭제, 관문 4곳, 자료 필터, PRO 조건 승계, 직전 안전장치 승계, 단일 트랜잭션). `npx tsc --noEmit` clean, `npx eslint .` 0건.
- Rollback/recovery reference: 이 마이그레이션은 **덧붙이기만** 합니다(제약 확대 + 함수 재정의). 되돌리려면 `20260822020000`의 `begin_quick_analysis`와 `20260820010000`의 나머지 세 함수·제약을 다시 실행하면 정확히 이전 상태입니다. 커밋 이전 상태는 `ae6397d`.
- **남은 일(사용자)**: `npm run db:remote:plan`으로 먼저 확인 → `npm run db:remote:push`. 적용 뒤에도 FINAL은 **Polar 상품이 없어서 결제가 안 됩니다**(다음 단계).

## 2026-08-24 — Claude: PDF에서 문항이 안 나뉘던 원인, 메일 본문 보관, 과다분량 경고

- Agent/session: Claude. 사용자 보고: PDF로 올린 자소서가 한 문항 8,251자로 읽히고 최종 첨삭본이 518자로 나옴("완성본 이상한데 제대로 바꾸던 없애던 하자") + 메일 본문 보기 기능 승인.
- Status: completed. **메일 본문 컬럼은 마이그레이션 적용 필요**(`20260824020000_mail_log_body.sql`).
- Protected baseline: `splitCoverLetterDraft`, 결과 화면(`최종 첨삭본`), 프롬프트의 분량 규칙은 **하나도 바꾸지 않았습니다.** 셋 다 정상이었고, 잘못된 입력을 받고 있었을 뿐입니다.

### 진짜 원인 — PDF 텍스트 추출 한 줄

- `local-document.ts`가 pdf.js가 돌려준 조각들을 `items.map(...).join(" ")`으로 이었습니다. **한 번에 두 방향으로 틀린 코드**입니다.
  1. 조각마다 공백을 넣으므로 한 단어가 잘립니다 — 화면에 보이던 `지원동기 AI 와 창업 경험 ,`가 그것입니다.
  2. **줄바꿈이 하나도 안 들어갑니다.** 한 페이지가 통째로 한 줄이 됩니다.
- 비싼 쪽은 2번입니다. `splitCoverLetterDraft`는 **줄 맨 앞의 `1.` `2.` `3.`**을 찾아 문항을 나눕니다. 페이지 전체가 한 줄이면 하나도 못 찾습니다. 그래서 3문항짜리 자소서가 **한 문항 8,251자**가 되고, 목표 700자에 맞추라는 지시를 받은 분석은 **요약할 수밖에 없어** 518자를 돌려줍니다. 지원자가 쓴 글의 94%가 결제한 결과에서 사라진 겁니다.
- `joinPdfTextItems`(신규, 순수 함수)로 바꿨습니다. 조각의 좌표를 보고 **가로 간격이 글자 높이의 22%를 넘을 때만** 공백을 넣고, `hasEOL`이나 **세로 위치가 내려가면** 줄을 바꿉니다. `hasEOL`을 아예 안 붙이는 생성기가 많아서 세로 좌표 판정이 꼭 필요합니다. 비율로 판단하므로 글자 크기가 달라도 같은 기준입니다.
- 브라우저 전용 파일에서 분리해 별도 모듈로 둔 이유는 **테스트가 가능해야 하기 때문**입니다(신규 11건 — 붙은 조각 잇기, 떨어진 조각 공백, 이미 있는 공백 중복 방지, `hasEOL` 줄바꿈, `hasEOL` 없을 때 y 낙차 줄바꿈, 문항 번호가 줄 맨 앞에 오는지, 빈 조각 처리, 글자 크기 무관).
- **PDF를 막는 대신 고쳤습니다.** 막으면 지원자 대부분이 PDF로 자소서를 갖고 있으므로 유입이 끊깁니다.

### 그래도 남는 위험 — 과다분량 경고

- PDF가 고쳐져도 **한 칸에 8,000자를 직접 붙여넣는 경우**는 그대로입니다. 목표 700자면 결과는 똑같이 요약됩니다.
- 그래서 입력 화면에서 **답변이 목표의 1.6배를 넘으면** 그 자리에서 말합니다: "목표의 약 11.8배입니다. 이대로 분석하면 대부분이 요약되어 사라집니다. 여러 문항이 한 칸에 들어가 있지는 않은지 확인해 주세요."
- **막지는 않습니다.** 분량을 줄이려고 첨삭받는 사람도 있고, 1.6배 정도는 정상입니다. 사라질 것을 **결제 전에** 말해 주는 것이 목적입니다.

### 메일 본문 보관

- `mail_send_log`에 `body`(5만자 제한)와 `attachment_names` 추가. 발송 기록에서 `본문 보기`를 펼치면 실제로 보낸 글과 첨부 파일 이름이 나옵니다.
- 배치별 표가 아니라 **행마다** 저장합니다. 한눈에 읽는 것이 목적인 화면에 조인을 하나 더 걸 이유가 없고, 한 배치는 최대 50행입니다.
- 첨부는 **이름만** 남깁니다. 파일 자체는 이미 받는 사람 메일함에 있고, DB에 수 MB를 넣을 이유가 없습니다.
- Files/branch: `src/lib/pdf-text-layout.ts`(신규), `src/lib/pdf-text-layout.test.ts`(신규), `src/lib/local-document.ts`, `src/domain/cover-letter-question.ts`, `src/domain/cover-letter-question-length.test.ts`(신규), `src/components/question-editor.tsx`, `src/components/question-editor.module.css`, `supabase/migrations/20260824020000_mail_log_body.sql`(신규), `src/server/admin/admin-repository.ts`, `src/app/api/mail/send/route.ts`, `src/app/meensoo/mail/history/page.tsx`, `src/app/meensoo/admin.module.css` on `main`.
- Validation: `npx vitest run` 507 passed(신규 15건). `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- Rollback/recovery reference: PDF 추출은 `joinPdfTextItems(...)` 한 줄을 예전 `join(" ")`으로 되돌리면 끝입니다(권하지 않습니다). 경고는 `describeOverLongAnswer` 호출 하나. 메일 본문은 컬럼 추가라 되돌릴 필요가 없습니다. 커밋 이전 상태는 `ae6397d`.
- **남은 일(사용자)**: `npm run db:remote:push`(FINAL 마이그레이션과 메일 본문 마이그레이션 두 개가 대기 중). 그다음 문제의 PDF를 다시 올려서 **문항이 3개로 나뉘는지** 확인해 주세요.

## 2026-08-24 — Claude: 첨삭 방향(소신/균형/안정) 선택과 /new 사용 방법 페이지

- Agent/session: Claude. 사용자 요청: "결국 사람이 뽑으니 정답은 없다. 어디든 합격을 원하면 모서리를 둥글게 깎는 작업이 필요하다"는 철학을 제품 스위치로. PRO부터 활성화. 그리고 `/new` 사용 방법 페이지.
- Status: 코드 완료. **마이그레이션 적용 필요**(`20260824030000_editing_stance.sql`). 사용자가 Supabase에서 직접 실행합니다.
- Protected baseline: 기존 `writingStyle`(담백/균형/강점)은 **손대지 않았습니다.** 첨삭 방향은 그 옆에 붙는 **다른 축**입니다 — 스타일은 "어떤 말투로", 방향은 "얼마나 깎일 각오를 하고".

### 왜 별도 축인가

- `writingStyle`은 어조입니다. 새 `editingStance`는 **감점 위험 허용도**입니다. 같은 경험을 두고 "불합리한 지시는 따르지 않습니다"를 완화할지 유지할지는 어조 문제가 아닙니다.
- 세 단계: `SAFE`(합격 안정형) / `BALANCED`(균형형, 기본값) / `CONVICTION`(소신 강조형).
- **BALANCED도 지시가 비어 있지 않습니다.** 아무 말도 안 하면 모델은 알아서 평균적인 "좋은 자소서"로 수렴합니다 — 지원자 100명이 전부 협업·성장·도전하는 사람이 되는 것이 이 설정이 존재하는 이유이므로, 중간값도 "모범답안으로 수렴시키지 마세요"라고 명시합니다.
- **QUICK은 못 고릅니다.** 공고도 자료도 없어 무엇을 남겨도 안전한지 판단할 근거가 없습니다. 연결되지 않은 레버를 주는 셈이라 `resolveEditingStance`가 QUICK을 언제나 BALANCED로 되돌립니다.
- **소신형에도 선을 그었습니다**: 사실이 아닌 내용, 타인·회사를 깎아내리는 표현, 확인되지 않은 수치는 소신이 아니라 위험입니다. 방향과 무관하게 고칩니다. 어떤 방향이든 **사실 허용 범위는 그대로**라는 문장도 프롬프트에 따로 넣었습니다.

### 실행에 저장하는 이유

- 실행 행은 **결제 전에 만들어지고 결제 후에 읽힙니다.** 브라우저에만 있으면 결제 리디렉션 순간 사라집니다. 그래서 `analysis_runs.editing_stance` 컬럼을 두고, `create_application_case_from_plan`이 쓰고 `begin_quick_analysis`가 요청에 실어 돌려줍니다.
- **둘 다 옮겨 적었습니다**(전체 교체이므로). 테스트가 원본의 조건(`AUTHENTICATION_REQUIRED`, `DOCUMENT_REQUIRED`, `security invoker`, FINAL 분기, 시도 횟수 제한 등)이 새 파일에도 남아 있는지 확인합니다.
- 파일명이 `20260824030000`인 이유는 **FINAL 마이그레이션(`...010000`) 뒤에 실행되어야** 하기 때문입니다. 먼저 실행되면 FINAL 변경을 되돌립니다. 테스트가 순서까지 잠급니다.
- 기본값 `'BALANCED'`에 `coalesce`까지 둔 이유: 이 설정 이전에 저장된 초안과 QUICK은 값이 없고, 그 둘은 지금까지 정확히 균형형처럼 동작해 왔습니다.

### /new 사용 방법 페이지

- **검색에서 뺐습니다**(`robots: index false`). 문구가 아직 확정 전인 작업 문서이고, 덜 된 안내가 제품 페이지보다 먼저 노출되면 안 됩니다.
- 담은 것: 진행 4단계 / **문항별로 나눠 넣기를 권하는 이유** / 파일이 이상하게 읽혔을 때 대처 / 글자 수 제한이 필요한 이유와 훨씬 길 때 생기는 일 / 공고·이력서가 **기능을 켜는 스위치**라는 설명 / QUICK·PRO·FINAL 고르는 법 / 첨삭 방향 / 결과 화면 읽는 법 / FAQ 5개.
- 요금표 단어를 그대로 씁니다(`공고 ↔ 경험 매칭`, `자료 간 충돌 검사`, `기간·수치 확인 필요 탐지` 등). 화면에서 본 말과 안내에서 읽은 말이 달라지면 안내가 아니라 혼란입니다.
- **내부 동작은 쓰지 않았습니다.** 모델·프롬프트·엔진 이야기 없이, 사용자가 조작할 수 있는 것만 설명합니다.
- Files/branch: `src/domain/editing-stance.ts`(신규), `src/domain/editing-stance.test.ts`(신규), `src/application/analysis-contract.ts`, `src/application/application-case-handoff.ts`, `src/lib/guest-draft.ts`, `src/server/ai/quick/prompt.ts`, `src/server/ai/quick/editing-stance-prompt.test.ts`(신규), `src/components/pro-input-page.tsx`, `src/components/pro-input-page.module.css`, `src/components/application-case-handoff.tsx`, `supabase/migrations/20260824030000_editing_stance.sql`(신규), `src/server/analysis/editing-stance-migration.test.ts`(신규), `src/app/new/page.tsx`(신규), `src/app/new/guide.module.css`(신규) on `main`.
- Validation: `npx vitest run` 524 passed(신규 17건). `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. 화면은 실행 중인 dev 서버에서 확인 — `/new` 8개 절과 목차 링크 8개, `/pro/polish`의 방향 3버튼 기본 선택이 균형형이고 클릭 시 전환되며 기존 작성 스타일 선택과 독립. 가로 스크롤·콘솔 오류 없음.
- Rollback/recovery reference: 프롬프트에서 `EDITING_STANCE_INSTRUCTION` 두 줄, 입력 화면에서 두 번째 `styleSection` 블록, 나머지는 기본값이 있는 선택 필드뿐이라 지워도 이전 동작 그대로입니다. `/new`는 폴더 하나. 커밋 이전 상태는 `ae6397d`.
- **남은 일(사용자)**: 마이그레이션 3개를 순서대로 — `20260824010000`(FINAL) → `20260824020000`(메일 본문) → `20260824030000`(첨삭 방향). **순서가 중요합니다.**

## 2026-08-24 — Claude: 문항별 글자 수 제한이 분석에 닿지 않던 버그

- Agent/session: Claude. 사용자 보고: "퀵 글자수 1500자 해도 무조건 결과가 700자 이하로 나온다."
- Status: completed. **마이그레이션 없음 — 배포만 하면 적용됩니다.**
- Protected baseline: `splitCoverLetterDraft`의 문항 인식 규칙, 프롬프트의 분량 규칙, `question-editor`의 입력 폼은 그대로입니다. 값이 중간에서 사라지고 있었을 뿐입니다.

### 확인 결과 — 사용자 잘못이 아니라 버그입니다

- 입력 화면은 **문항마다** 글자 수 제한을 받습니다(`필수` 표시까지 있습니다). 그런데 그 값이 분석까지 가는 길이 없었습니다.
  1. `/quick`과 PRO 입력 화면이 초안을 저장할 때 **`targetLength: 700`을 하드코딩**하고 있었습니다.
  2. 그 하나의 숫자만 `create_application_case_from_plan`으로 넘어가고, **문항별 값은 어디에도 저장되지 않습니다.**
  3. 분석 쪽에서는 `begin_quick_analysis`가 돌려준 자소서 본문을 `splitCoverLetterDraft`로 다시 나누는데, 이때 만들어지는 문항의 `targetLength`는 언제나 `null`입니다.
  4. `getAnalysisQuestions`의 `question.targetLength ?? request.targetLength`가 **전부 700으로 떨어집니다.**
- 즉 1,500자를 적어도 프롬프트는 700자를 목표로 받았습니다. **결제한 사람이 요구 분량보다 800자 짧은 첨삭본을 받은 것**입니다.

### 어떻게 고쳤나

- **요청 단위 숫자를 유추가 아니라 실제 입력에서 뽑습니다.** `resolveDraftTargetLength(questions, fallback)`가 답변이 있는 문항들이 적어 낸 제한 중 **가장 큰 값**을 씁니다. 가장 큰 값인 이유는 이것이 *자기 제한이 없는 문항이 기대는 상한*이라서입니다 — 작은 쪽을 고르면 긴 문항이 잘립니다. 아직 안 쓴 문항의 제한 때문에 쓴 문항이 밀리지도 않습니다.
- **문항별 값은 자소서 본문 안에 실어 보냅니다.** 계획을 만들 때만 제목 끝에 `[1500자]`를 붙이고(`includeTargetLength`), `splitCoverLetterDraft`가 그것을 읽어 `targetLength`로 복원하고 제목에서는 떼어냅니다. 문항별 제한이 왕복에서 살아남을 곳이 여기 말고 없습니다(요청은 숫자를 하나만 나릅니다).
- **화면에 보이는 초안에는 표시가 붙지 않습니다.** 그 글은 이후 화면에서 지원자에게 그대로 다시 보여지고, 자기가 치지 않은 표시가 붙어 있으면 제품이 글을 건드린 것으로 읽힙니다. 계획을 만드는 자리에서만 붙습니다.
- 700은 **어디에서도 제한을 적지 않은 초안**의 바닥값으로만 남습니다.
- Files/branch: `src/domain/cover-letter-question.ts`, `src/domain/cover-letter-parser.ts`, `src/application/application-case-handoff.ts`, `src/app/quick/page.tsx`, `src/components/pro-input-page.tsx`, `src/domain/target-length-roundtrip.test.ts`(신규) on `main`.
- Validation: `npx vitest run` 531 passed(신규 7건 — 적은 제한이 쓰이는지, 기본값은 아무도 안 적었을 때만인지, 문항마다 다를 때 상한, 빈 문항의 제한이 끼어들지 않는지, 직렬화 왕복, 표시용에는 표시가 없는지, 실제 계획에 실리는지). `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- Rollback/recovery reference: `resolveDraftTargetLength` 호출 세 곳과 `includeTargetLength` 옵션만 지우면 이전 동작(= 전부 700)으로 돌아갑니다. 커밋 이전 상태는 `ae6397d`.
- **남은 일(사용자)**: 배포 후 `/quick`에서 제한을 1500으로 적고 돌려서 결과 하단이 `... / 1500자`로 나오는지 확인해 주세요.

## 2026-08-24 — Claude: FINAL 3단계 — 자소서 쪽 여섯 기능

- Agent/session: Claude. 사용자 요청: FINAL 1차 기능 구현("1번 ㄱㄱ"). GPT 검토 의견에서 채택하기로 한 표현·측정 수정을 함께 반영했습니다.
- Status: 분석 계층 완료. **결과 화면은 아직 없습니다**(데이터만 생성됩니다). 마이그레이션 없음.
- Protected baseline: QUICK·PRO의 출력, 프롬프트, 결과 스키마는 그대로입니다. FINAL 전용 필드 5개와 계산 모듈 1개가 덧붙었을 뿐입니다.

### 무엇을 넣었나

1. **FINAL 판정** — AI에게 묻지 않고 **코드가 셉니다**(`computeFinalVerdict`). 문서 충돌·Red Team·면접관 지적·근거 없는 주장에서 심각도 높은 것만 모아 개수를 냅니다. 고치고 다시 돌리면 숫자가 줄어드는 것이 FINAL의 제품 경험입니다.
2. **Red Team**(`rejectionRisks`) — "이 지원자를 탈락시켜야 한다면?" 방향을 반대로 물으면, 도우라고 할 때는 절대 안 나오는 것들이 나옵니다(회사명만 바꾸면 되는 지원동기, 본인 기여가 안 보이는 수치).
3. **네 가지 관점 점검**(`reviewerNotes`) — hr / field_lead / domain_expert / editor. **호출은 한 번**입니다.
4. **주장 ↔ 근거 추적**(`claimEvidence`) — 강한 주장을 뽑아 supported / weak / unsupported로 판정.
5. **첫인상 점검**(`firstImpression`) — 처음 읽었을 때 남는 것과 남지 않는 것.
6. **X-Ray**(`answerStructures`) — 문장을 상황/행동/결과/직무연결로 분류.

### 표현에서 조심한 것

- **"네 명이 검토했습니다"라고 말하지 않습니다.** 한 번의 호출에서 나온 네 관점은 독립된 네 사람이 아닙니다. 화면 문구는 반드시 "네 가지 관점에서 점검했습니다"여야 합니다. 스키마 주석에 못 박아 두었습니다.
- **"15초 심사"를 쓰지 않습니다.** 아무도 측정한 적 없는 숫자입니다. 기능은 그대로 두고 이름만 **첫인상 점검**으로 바꿨고, 프롬프트에도 "'몇 초 안에' 같은 시간을 쓰지 마세요"를 넣었습니다.
- **X-Ray는 세는 주체를 옮겼습니다.** 모델은 **분류만** 하고(문장을 그대로 인용), 개수·글자수·균형 판정은 `countAnswerStructure`가 합니다. 모델에게 "상황 15%"를 물으면 측정한 것처럼 보이는 지어낸 숫자가 나옵니다. 지금은 화면의 모든 숫자가 **지원자가 눈으로 확인할 수 있는 인용 문장에서 코드로 계산된 값**입니다.
- **판정 문구는 "FINAL에서 확인된 주요 서류 위험요소 N곳"**입니다. "서류에서 걸릴 지점"은 우리가 모든 탈락 사유를 안다는 주장이 됩니다. 점수도 만들지 않습니다(테스트가 `\d+점|/100|%`가 없음을 확인합니다).

### 첨삭 방향과 Red Team을 묶은 것

- 이걸 안 묶으면 **두 기능이 서로 싸웁니다.** Red Team은 모든 모서리를 찾으라고 하고, 소신 강조형을 고른 지원자는 그 모서리를 어차피 깎여 버립니다 — 설정이 거짓말이 됩니다.
- 그래서 `RED_TEAM_HANDLING_INSTRUCTION`을 방향별로 둡니다. 안정형은 적극 제거, 균형형은 high만 완화, **소신형은 `kept_by_choice`로 표시하고 남깁니다.**
- 다만 **어느 방향이든 위험은 반드시 알립니다.** 알고 남기는 것은 선택이고, 모르고 남는 것은 사고입니다.
- `computeFinalVerdict`가 `kept_by_choice`를 **세지 않는 이유**도 같습니다. 이미 내린 결정을 화면이 계속 재촉하면 안 됩니다.

### 비용

- 새 항목은 전부 **같은 한 번의 호출** 안에 들어갑니다. 응답이 길어지는 만큼만 늘어나고, 호출 수는 그대로 1회입니다.
- Files/branch: `src/domain/result-document.ts`, `src/domain/final-verdict.ts`(신규), `src/domain/final-verdict.test.ts`(신규), `src/domain/editing-stance.ts`, `src/server/ai/quick/schema.ts`, `src/server/ai/quick/prompt.ts`, `src/server/ai/quick/provider.ts`, `src/server/ai/quick/final-features.test.ts`(신규), `src/fixtures/result-document.ts` on `main`.
- Validation: `npx vitest run` 556 passed(신규 25건 — 판정 계산 9, X-Ray 계산 4, 스키마 격리 2, Red Team 4, 관점 2, 첫인상 1, X-Ray 지시 1, 주장 1, 파싱 2 등). `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- Rollback/recovery reference: 전부 `product === "FINAL"` 분기와 기본값이 있는 새 필드입니다. `finalOutputShape`의 다섯 줄과 `FINAL_INSTRUCTIONS` 끝부분을 지우면 이전 상태입니다. 커밋 이전 상태는 `ae6397d`.
- **남은 일(사용자)**: 없습니다. 다음은 **FINAL 결과 화면**입니다 — 지금은 데이터만 만들어지고 보여줄 곳이 없습니다.

## 2026-08-24 — Claude: FINAL 결과 화면, 이력서 미첨부 경고, 축적 철학 섹션

- Agent/session: Claude. 사용자 요청: FINAL 결과 화면 / 이력서는 필수 아님, 다만 경고 / "AI는 같을 수 있어도 판단 기준은 다릅니다" 홍보 문구 추가.
- Status: completed. 마이그레이션 없음.
- Protected baseline: `result-workspace-complete.tsx`의 기존 여섯 탭과 그 내용은 그대로입니다. FINAL 검증은 **별도 컴포넌트**(`final-verification.tsx`)로 만들어 탭 하나만 추가했습니다 — 이 파일을 고쳐도 QUICK·PRO 화면에 닿지 않습니다.

### 또 같은 종류의 버그를 하나 잡았습니다

- 탭 필터가 `result.product === "PRO"`였습니다. **FINAL이면 `공고·경험 분석`과 `면접 준비` 탭이 통째로 사라집니다** — PRO보다 비싼 등급에서 PRO 탭이 안 보이는 것입니다. `showsProTabs`로 묶었습니다. `questions.ts`와 `begin_quick_analysis`에 이어 세 번째로 나온 같은 패턴입니다.

### FINAL 검증 화면

- 판정 → Red Team → 네 관점 → 주장·근거 → 첫인상 → X-Ray → 타임라인 → 이력서 대조 → 면접관 지적 → 체크리스트 순서입니다.
- **화면의 모든 숫자는 이 화면이 직접 계산합니다.** X-Ray 막대의 비율도 인용된 문장의 글자 수에서 나옵니다. 모델이 준 숫자는 하나도 쓰지 않습니다.
- **"네 명이 검토했습니다"라고 쓰지 않았습니다.** 화면 문구는 `네 가지 관점에서 점검했습니다`이고, 테스트가 `네 명이 검토`가 화면에 없음을 확인합니다. `몇 초` 표기가 없는 것도 테스트로 잠갔습니다.
- **빈 섹션이 왜 비었는지 말합니다.** 이력서를 안 올렸으면 "찾지 못했습니다"가 아니라 **"대조하지 못했습니다"**입니다. 둘은 다른 답이고 하나만 참입니다.
  - 이걸 결과 데이터로 추론할 수 없어서 `suppliedResume` 필드를 새로 뒀습니다. **이력서를 넣었는데 충돌이 없는 실행과, 이력서가 없어서 못 본 실행은 배열 모양이 똑같습니다.**
- `kept_by_choice`(소신 방향에 따라 일부러 남긴 위험)는 **판정 숫자에서 빠지지만 목록에는 남습니다.** 이미 내린 결정을 재촉하지 않되, 숨기지도 않습니다.

### 이력서 미첨부 경고

- **막지 않습니다.** 신입은 별도 이력서 없이 기업 입사지원서만 쓰는 경우가 많고, 거절하면 분석 자체를 못 받습니다.
- 대신 **결제 전 확인 화면에서** 무엇이 빈칸으로 나올지 이름을 대며 말합니다(`자료 간 충돌 검사`, `이력서 사실로 빈 내용 채우기`, `기간·수치 확인 필요 탐지` — 요금표에 있는 그 단어들). 결제하고 나서 빈 화면을 보는 것이 미리 듣는 것보다 나쁩니다.
- 대안도 함께 안내합니다: 입사지원서·경력기술서도 됨, 그것도 없으면 `자격·스펙 직접 추가`. 그리고 **추가 자료를 더 넣어도 결제 금액이 오르지 않는다**는 사실을 명시했습니다(요금은 자소서 글자 수 기준이고, 지원자료는 `SUPPORTING_CHARACTER_BUDGET = 30,000자`로 상한이 걸려 있습니다).

### 랜딩 · 축적 철학 섹션

- `현장에서 검증된 컨설팅` 섹션 뒤에 붙였습니다. `AI는 같을 수 있어도, 판단 기준은 다릅니다.` + `실제 경험 → 기준화 → 기술 적용 → 실제 결과 → 다시 개선` 순환.
- **시제를 조심했습니다.** 실제 지원 결과 데이터 활용은 동의 절차와 비식별 처리가 있어야 하는 주장이라, **"반영할 예정입니다 / 갖춘 뒤에 시작합니다"**로 적었습니다. 동의·익명화가 실제로 구축되면 그 문장만 현재형으로 바꾸면 됩니다(`src/app/page.tsx`의 `fieldStyles.loopNote` 블록).
- 표본이 쌓이기 전에는 `이 문장은 합격률을 몇 % 높입니다` 같은 수치를 쓰지 않는다는 것도 **화면에 직접 적었습니다.** 안 쓰겠다고 적어 두는 편이 나중에 쓰고 싶어질 때 막아 줍니다.
- 합격 사례만 모으면 안 되는 이유(스펙·경쟁률·채용 규모가 섞임)도 카드 하나로 넣었습니다.
- Files/branch: `src/components/final-verification.tsx`(신규), `src/components/final-verification.module.css`(신규), `src/components/final-verification.test.tsx`(신규), `src/components/result-workspace-complete.tsx`, `src/components/analysis-preparation.tsx`, `src/components/analysis-preparation.module.css`, `src/domain/result-document.ts`, `src/server/ai/quick/provider.ts`, `src/fixtures/result-document.ts`, `src/app/page.tsx`, `src/app/field-credibility.module.css` on `main`.
- Validation: `npx vitest run` 565 passed(신규 9건 — 0곳 표시와 점수 부재, 이력서 유무에 따른 두 문구, 위험요소 집계, 근거 없는 주장 표시, 선택 유지 항목, 네 관점 문구, X-Ray 자체 계산, 초 단위 표기 부재). `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. 랜딩 섹션은 dev 서버에서 DOM 확인(카드 4개, 순환 5단계, 가로 스크롤·콘솔 오류 없음).
- Rollback/recovery reference: FINAL 탭은 `result.product === "FINAL"` 분기 두 줄과 컴포넌트 파일 하나입니다. 경고는 `hasResumeMaterial` 블록 하나. 랜딩 섹션은 `fieldStyles.loop` 블록 하나. 커밋 이전 상태는 `ae6397d`.
- **남은 일(사용자)**: FINAL을 실제로 볼 수 있으려면 **Polar FINAL 상품 등록**이 필요합니다. 그 전까지 이 화면은 코드에만 있습니다.

## 2026-08-24 — Claude: 랜딩 두 섹션 보강(전문가 네트워크·축적 자산), 색 분리, 이력서 경고 문구

- Agent/session: Claude. 사용자 요청: 전문가 구성(취업컨설턴트·인사담당자·직무전문가·현직자 등)을 문구에 넣을 것, 제목 한 줄, 축적되는 데이터 어필, "모델" 단어 삭제, "AI는 같을 수 있어도" → "같은 AI라도", 초록 일색인 디자인 분리.
- Status: completed. 마이그레이션 없음.
- Protected baseline: 두 섹션 모두 이번 세션에서 제가 만든 것이라 기존 다른 사람 작업과 겹치지 않습니다.

### 색을 나눈 이유

- `현장에서 검증된 컨설팅`(연초록)과 `축적되는 기준`(진초록)이 **연달아 붙어 있어 한 덩어리로 읽혔습니다.** 뒤 섹션을 **따뜻한 종이색**(`#f6f2e7`)에 잉크 제목 + 브론즈 강조로 바꿨습니다. 눈에 띄되 초록 두 장이 겹치지 않습니다. 마무리 문장만 진한 잉크 카드로 남겨 시선이 끝에서 멈추게 했습니다.
- 제목도 한 줄로 바꿨습니다(`현장에서 검증된 컨설팅을, 기술로.`). `clamp()`와 `white-space: nowrap`이라 화면이 좁아져도 줄이 깨지지 않고 글자만 작아집니다.

### 전문가 네트워크

- 직군 칩 6개(취업컨설턴트·직업상담사·첨삭 멘토·인사담당자·직무 전문가·현직자·재직자)에 **각 직군이 무엇을 잡아내는지**를 한 문장으로 붙였습니다. 직함만 늘어놓으면 장식으로 읽힙니다.
- **회사 이름과 "대기업" 표현은 넣지 않았습니다.** 개인 경력으로 뒷받침되는 범위까지만 적습니다.

### 축적 자산을 셋으로 나눈 것

- 사람·노하우·사례를 한 단어로 뭉치면 "데이터"가 되어 버리는데, 셋은 성격이 다릅니다.
  - **전문가 네트워크**(사람) — `운영 중`
  - **컨설팅 지식베이스**(판단 기준) — `계속 확장 중`
  - **사례 데이터베이스**(실제 지원 결과) — **`동의 절차 구축 중`**
- 세 번째 카드에 상태 배지를 단 이유는 **아직 하지 않는 일을 하고 있다고 적으면 안 되기 때문**입니다. 동의·비식별이 실제로 갖춰지면 그 배지와 아래 주의 문단만 바꾸면 됩니다.

### 문구 수정

- `모델`이라는 단어를 뺐습니다(내부 구현 이야기입니다). `같은 AI를 쓰더라도`로 바꿨습니다.
- 제목: `AI는 같을 수 있어도` → **`같은 AI라도, 판단 기준은 다릅니다.`**
- 리드 문장 추가: **`같은 AI 컨설팅이더라도 담긴 경험이 다릅니다. 오랜 경력의 취업 전문가와 커리어팀, 컨설턴트들의 경험과 기술이 이 안에 들어 있습니다.`**
- `그 기준은 지금도 쌓이고 있고, 앞으로 계속 정밀해집니다`로 지속 발전을 명시했습니다.

### 이력서 경고 문구 톤

- 사용자가 제안한 "회사에 지원하실 때도 자소서만 내실 건가요?"는 **수사적 질문이라 밀어붙이는 느낌**이 납니다. 대신 **사실을 앞에 놓았습니다**: `면접장에서 면접관은 이력서와 자기소개서를 함께 펼쳐 놓고 봅니다.`
- 사실이 더 설득력이 있고, 이건 사용자의 실제 현장 경험이라 근거도 있습니다. 뒤에 이어지는 "그래서 이력서가 없으면 이 기능들이 빈칸" 설명이 그 사실의 결과로 자연스럽게 읽힙니다.
- Files/branch: `src/app/page.tsx`, `src/app/field-credibility.module.css`, `src/components/analysis-preparation.tsx` on `main`.
- Validation: `npx vitest run` 565 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. dev 서버에서 DOM 확인 — 제목 1줄, 칩 6개(flex·radius 20px 적용), 자산 카드 3개, `모델` 단어 없음, 가로 스크롤·콘솔 오류 없음.
- Rollback/recovery reference: 두 섹션 모두 `src/app/page.tsx`의 블록 하나씩과 CSS 파일 하나입니다. 커밋 이전 상태는 `ae6397d`.

## 2026-08-24 — Claude: 보상 이용권(쿠폰번호 없는 무료 이용권) 1단계

- Agent/session: Claude. 사용자 요청: 추천코드/보상 구조 착수 + 이력서 안내 문구 한 줄로 축소.
- Status: **1단계 완료.** `reward_credits` 발급·수령·소비까지 동작합니다. **추천코드(누가 누구를 데려왔는지) 정산은 아직 없습니다** — 그건 2단계입니다.
- Protected baseline: 기존 Polar 결제 경로는 **한 줄도 바꾸지 않았습니다.** `billing_orders.provider` 제약만 넓혔고, 무료 지급은 별도 provider 값으로 들어갑니다.

### 왜 쿠폰번호가 아니라 이용권인가

- 쿠폰번호는 **유출됩니다.** 한 명에게 간 코드는 한 시간 뒤 커뮤니티에 있고, 그 뒤에는 누구에게 무엇을 줬는지도 썼는지도 알 수 없습니다.
- 계정에 붙은 이용권은 전달이 안 되고, 세 질문(누구에게 / 왜 / 썼는지)에 전부 답이 있습니다.
- 메일에 나가는 것은 **번호가 아니라 1회용 링크**입니다. 링크를 연 사람이 **어느 계정에 붙일지 직접 고릅니다.** 이벤트 신청은 `abc@naver.com`으로 오는데 로그인은 구글 `abc@gmail.com`인 경우가 흔하고, 주소로만 매칭하면 **그 사람들이 통째로 막힙니다.**

### 결제 장부를 더럽히지 않은 방법

- `analysis_entitlements`는 **반드시 `billing_orders` 한 줄을 가리켜야** 합니다. 무료 지급을 `POLAR` 주문으로 적으면 실제 주문 옆에 **지어낸 주문번호**가 섞입니다.
- 그래서 `provider`에 `MOOA_CREDIT`을 추가했습니다. 금액 0원, `provider_order_id`는 `credit:{uuid}`. **장부는 하나로 유지하되 유료와 무료가 언제나 구분됩니다.**
- 무료 실행도 **유료와 같은 `allowed_characters` 상한**을 받습니다. 없으면 무료가 유료보다 더 많이 분석합니다.

### 두 번 쓰지 못하게 막은 것들

- `reward_credits.billing_order_id`가 **unique**입니다. 한 이용권은 최대 한 개의 주문만 만듭니다.
- `consume_reward_credit`은 같은 case·product에 **이미 `ACTIVE` 이용권이 있으면 거절**합니다.
- 이용권 선택은 `for update skip locked limit 1` — 탭 두 개로 동시에 눌러도 하나만 나갑니다.
- **상태 조합을 DB가 강제합니다.** `UNCLAIMED`는 주인이 없고, `AVAILABLE`은 주인이 있고 쓴 게 없고, `CONSUMED`는 주문이 정확히 하나 붙어 있어야 통과합니다.
- 테이블 RLS는 **읽기 전용, 본인 것만**입니다. 상태 변경 경로는 `security definer` 함수 둘뿐입니다.

### 같은 링크를 두 번 열어도 오류가 아닙니다

- 메일 클라이언트는 링크를 미리 긁고, 사람은 탭을 다시 엽니다. 그걸 오류로 처리하면 **멀쩡한 이용권을 없어졌다고 말하는 셈**입니다.
- 같은 계정이 다시 열면 `alreadyClaimed: true`로 성공 화면을, **다른 계정**이 열면 "다른 계정이 이미 받아 갔어요 — 그 계정으로 로그인하세요"를 보여줍니다. 원인이 대개 계정 착각이라 그대로 말해야 스스로 고칩니다.

### 만든 화면

- `/redeem/{token}` — 로그인한 사람은 **버튼 없이 바로** 등록됩니다(누를 이유가 없는 버튼이라). 로그인 전이면 구글 로그인 후 **같은 페이지로 돌아와** 그 자리에서 등록됩니다. `noindex` — 주소에 토큰이 들어 있어 크롤링되면 그 자체가 유출입니다.
- `/meensoo/rewards` — 발급 화면과 발급 내역. **메일은 여기서 보내지 않습니다.** 옆 화면(메일 보내기)이 이미 잘 하고, 붙여 놓으면 *돈을 주면서 동시에 50명에게 보내는 버튼* 하나가 됩니다. 발급 후 `주소<TAB>링크` 목록을 주니 그대로 메일에 붙이면 됩니다.
- 토큰은 **서버에서만** 만듭니다(32바이트 base64url). 이 토큰이 이용권을 가져갈 수 있는 유일한 권한이라 id가 아니라 비밀번호처럼 다룹니다.

### 이력서 안내 문구

- 결제 직전 화면의 경고를 **`이력서(입사지원서) 없이 진행합니다.` 한 줄로 줄였습니다.** 무엇이 빠지는지 설명하는 문단은 뺐습니다 — 결제 바로 앞에서 "지금 이걸 놓치고 있다"를 길게 적으면 **압박으로 읽힙니다.** 자세한 설명은 입력 화면과 `/new` 안내에 이미 있습니다.
- Files/branch: `supabase/migrations/20260824040000_reward_credits.sql`(신규), `src/domain/reward-credit.ts`(신규), `src/domain/reward-credit.test.ts`(신규), `src/server/analysis/reward-credit-migration.test.ts`(신규), `src/app/redeem/[token]/page.tsx`·`redeem-client.tsx`·`redeem.module.css`(신규), `src/app/api/meensoo/rewards/route.ts`(신규), `src/app/meensoo/rewards/page.tsx`·`reward-issuer.tsx`(신규), `src/server/admin/admin-repository.ts`, `src/app/meensoo/admin-shell.tsx`, `src/app/meensoo/admin.module.css`, `src/components/analysis-preparation.tsx` on `main`.
- Validation: `npx vitest run` 582 passed(신규 17건 — 토큰 형식·길이·URL 7, 마이그레이션 불변식 10). `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. dev 서버에서 `/redeem/{긴 토큰}`은 로그인 안내, `/redeem/short`는 "이용권을 찾지 못했어요" 확인.
- Rollback/recovery reference: 새 테이블·새 함수·새 라우트뿐이라 마이그레이션을 되돌리면 됩니다. 기존 결제 경로는 `provider` 제약이 넓어진 것 외에 변화가 없습니다. 커밋 이전 상태는 `ae6397d`.
- **남은 일(사용자)**: 마이그레이션 `20260824040000_reward_credits.sql` 적용. 그다음 `/meensoo/rewards`에서 본인 주소로 한 장 발급 → 링크 열어 등록되는지 확인.
- **다음 단계(2단계)**: 추천코드 자체 — `referral_codes`(사용자별 코드), 결제 전 코드 입력 → `PENDING` 저장, Polar `order.paid` 웹훅에서 `CONVERTED` 처리하며 추천인에게 `reason='REFERRAL'` 이용권 자동 발급. **입력만으로는 절대 지급하지 않습니다**(자기 코드 무한 입력 방지). 그리고 결제 화면의 `무료 이용권 사용하기` 버튼(= `consume_reward_credit` 호출)도 아직 없습니다.

## 2026-08-24 — Claude: 연구 활용 동의와 비식별 처리

- Agent/session: Claude. 사용자 요청: "4번(동의·익명화 구조) 설명 후 진행".
- Status: **동의를 받을 준비와 지울 것을 지우는 도구까지 완료.** **실제 수집은 아직 켜지 않았습니다** — 그건 별도의, 다시 검토받을 변경입니다.
- Protected baseline: 분석·결제 경로 전부 그대로입니다. 결과 화면에는 `최종 첨삭본` 탭 맨 아래에 블록 하나가 추가됐을 뿐입니다.

### 왜 이 순서인가

- 랜딩에 `실제 지원 결과는 이용자 동의를 받아 익명으로만 반영할 예정`이라고 적어 두었습니다. **그 문장을 현재형으로 바꾸려면 두 가지가 먼저 있어야 합니다**: 기록된 동의와, 실제로 지우는 함수. 둘 중 하나라도 없으면 그 문장은 거짓입니다.
- 그래서 이번에 그 둘을 만들었고, **수집을 켜는 것은 일부러 다음 작업으로 남겼습니다.** 지우는 품질을 눈으로 확인한 뒤에 트는 것이 맞습니다.

### 비식별 처리 — 두 방향으로 틀릴 수 있습니다

- **덜 지우면**: 저장된 문서에 전화번호가 남습니다. 아무도 모르다가 문제가 될 때 압니다.
- **더 지우면**: 연구할 것이 사라집니다. 기간·직무·회사명·성과 수치는 **자료를 보관하는 이유 그 자체**라, `2023.03~2024.07`이나 `불량률 12% 감소`를 먹어 버리는 지우개는 아무것도 답할 수 없는 자료 더미를 남깁니다.
- 그래서 규칙을 **좁게, 각각 날짜나 수치가 될 수 없는 것에 고정**했습니다.
  - 주민번호는 `6자리-7자리` 모양이라 단독으로 잡습니다.
  - 휴대폰은 **`01x` 접두사에 고정**합니다. 일반적인 `\d{2,4}-\d{4}` 규칙은 `2023-2024`를 통째로 삼킵니다.
  - 유선번호는 실제 지역번호가 있을 때만.
  - 주소는 **`로/길` + 건물번호**가 함께 있을 때만. `울산광역시`만 있으면 남깁니다 — 어느 지역에서 일했는지는 분석에 쓸모 있고 아무도 특정하지 않습니다.
  - **이름은 우리가 이미 아는 이름만** 지웁니다. 두세 글자 한국어 단어는 대부분 이름처럼 생겨서 모양으로는 찾을 수 없고, 추측하면 본문을 망칩니다.
- 테스트가 **양쪽 다** 확인합니다: 지워야 할 6종이 지워지는지, 그리고 기간 4종·성과 수치·회사/학교/직무·지명이 **그대로 남는지**.
- **못 지우는 것을 화면에 적었습니다**(`REDACTION_LIMITS`). 문장 안에만 나오는 타인의 이름, 아주 특정한 소속. 지우개는 바닥이지 보증이 아니고, 그렇게 말하는 것이 정직합니다.

### 동의 자체

- **옵트인입니다.** 기본 행이 없고, 없으면 동의하지 않은 것입니다. 기본값 `true`는 어디에도 없습니다.
- **철회가 동의만큼 쉽습니다.** 같은 체크박스, 같은 함수. 주는 건 버튼이고 무르는 건 문의 접수인 제품은 선택지를 준 것이 아닙니다.
- **문구 버전을 함께 저장합니다.** 동의한 문장은 동의 내용의 일부라, 문구가 바뀌면 예전 동의가 조용히 상속되면 안 됩니다. `has_research_consent`는 저장된 버전을 읽는 게 아니라 **현재 버전을 인자로 받아** 비교하므로, 문구를 고치면 **닫히는 쪽으로** 실패합니다.
- 쓰기는 `security definer` 함수뿐이고 RLS는 **본인 것 읽기만** 허용합니다.

### 왜 결제 전이 아니라 결과 화면에서 묻는가

- 결제 전이라면 이 체크박스는 **원하는 것 앞을 막고 선 것**이고, 거기서 받은 "예"는 값이 별로 없습니다.
- 결과를 이미 손에 든 자리에서는 답에 걸린 것이 없습니다. **"아니오"가 아무 대가도 치르지 않는 유일한 위치**입니다.
- 그래서 문구에도 `동의하지 않아도 결과와 기능은 완전히 같습니다`를 넣었습니다. 샘플 결과 화면에는 뜨지 않습니다(동의할 실제 지원서가 없습니다).
- Supabase 클라이언트가 없거나 요청이 막히면 **블록 자체가 안 뜹니다.** 지원자가 받으러 온 결과는 이미 화면에 있고, 그 사람 잘못이 아닙니다.
- Files/branch: `src/domain/deidentify.ts`(신규), `src/domain/deidentify.test.ts`(신규), `supabase/migrations/20260824050000_research_consent.sql`(신규), `src/server/analysis/research-consent-migration.test.ts`(신규), `src/components/research-consent.tsx`·`research-consent.module.css`(신규), `src/components/result-workspace-complete.tsx` on `main`.
- Validation: `npx vitest run` 601 passed(신규 19건 — 비식별 12, 마이그레이션 불변식 7). `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- Rollback/recovery reference: 새 테이블·새 함수·새 컴포넌트뿐입니다. 결과 화면에서 `<ResearchConsent />` 한 줄만 지우면 이전 상태입니다. 커밋 이전 상태는 `ae6397d`.
- **남은 일(사용자)**: 마이그레이션 `20260824050000_research_consent.sql` 적용.
- **다음 단계**: (1) 동의한 실행의 비식별 사본을 실제로 보관하는 구간 — 지우개 품질을 눈으로 확인한 뒤에. (2) 그때 랜딩의 `반영할 예정입니다`를 현재형으로, `사례 데이터베이스` 배지를 `동의 절차 구축 중` → `운영 중`으로 바꾸면 됩니다. **코드가 먼저, 문구가 나중입니다.**

## 2026-08-24 — Claude: FINAL을 로컬에서만 열기, 재첨삭 안내 정정

- Agent/session: Claude. 사용자 지적: `/new`의 "결과가 마음에 안 들면요" 항목이 없는 기능처럼 읽힌다. 그리고 로컬에서는 FINAL이 열려야 한다.
- Status: completed. **마이그레이션 없음.** 열려면 환경변수 하나가 필요합니다(아래).

### 재첨삭 안내는 틀린 게 아니라 절반이었습니다

- 확인 결과 **기능은 있고 막혀 있지도 않습니다.** 결과 화면 아래 `추가 요청` 패널에서 요청사항을 적어 다시 받을 수 있고, PRO 전용도 FINAL 전용도 아닙니다.
- 문제는 **`/new`의 안내가 값을 안 적었다**는 것입니다. 그 화면은 이미 `새 분석이므로 PRO 1회 결제가 필요합니다`라고 말하는데, 안내에는 그 말이 없어 **공짜처럼 읽혔습니다.** 안내가 제품보다 후하게 약속하면 그건 안내가 아니라 불만의 원인입니다.
- 두 가지를 나눠 적었습니다: **문항별 첨삭에서 직접 고치기(추가 비용 없음)**가 먼저고, **방향을 바꾸는 재첨삭(PRO 1회 결제)**이 그다음입니다. 대부분은 앞의 것으로 끝납니다.

### FINAL 입구를 환경변수로

- FINAL은 분석 계층·결과 화면·DB가 다 있는데 **Polar 상품이 없어 결제가 안 됩니다.** 입구를 그냥 열면 **만들 수 없는 체크아웃 앞으로 손님을 보내는 것**이라, 아예 안 파는 것보다 나쁩니다.
- `NEXT_PUBLIC_ENABLE_FINAL`이 `1`이나 `true`일 때만 `/final/polish`·`/final/build`·`/final/create`가 열립니다. 그 외 값(빈 값, `0`, 오타)은 **전부 닫힘** — 미완성 결제 경로를 노출하는 스위치는 애매하면 닫히는 쪽으로 실패해야 합니다. 테스트가 이걸 확인합니다.
- 값이 없으면 세 경로는 **404**입니다. 배포에는 변수를 넣지 않으므로 지금처럼 요금표에 `준비 중`으로만 남습니다.
- `NEXT_PUBLIC_`인 이유: 요금표와 입력 화면이 클라이언트 컴포넌트라, 서버 전용 플래그면 **화면과 라우트가 서로 다른 말을 하게** 됩니다.
- **입구만 여는 스위치입니다.** DB는 플래그와 무관하게 결제된 이용권 없는 FINAL 실행을 계속 거절합니다.

### 새 화면을 만들지 않았습니다

- FINAL 입력 화면은 **PRO와 입력 항목이 같습니다.** 그래서 `ProInputPage`에 `product` 속성을 하나 더했을 뿐입니다(기본값 `"PRO"`라 기존 라우트는 그대로). 화면을 복사했으면 두 벌이 갈라집니다.
- 결제 단계에서 FINAL이면 **`FINAL은 아직 결제를 열지 않았습니다. 입력하신 내용은 저장되어 있습니다.`**로 분명히 멈춥니다. `/api/checkouts/final`이 404를 내고 그게 "오류가 발생했습니다"로 뭉개지면, **저장은 됐는지 결제는 됐는지** 알 수 없습니다.
- 준비 화면(`analysis-preparation`)에 FINAL 제공 범위를 넣고, PRO에만 보이던 **이력서 미첨부 경고와 자료 목록을 FINAL에도** 보이게 했습니다. `product === "PRO"`로 좁혀 둔 자리를 또 하나 찾은 셈입니다(네 번째).
- Files/branch: `src/domain/final-availability.ts`(신규), `src/domain/final-availability.test.ts`(신규), `src/app/final/polish|build|create/page.tsx`(신규), `src/components/pro-input-page.tsx`, `src/components/analysis-preparation.tsx`, `src/components/application-case-handoff.tsx`, `src/lib/guest-draft.ts`, `src/app/new/page.tsx` on `main`.
- Validation: `npx vitest run` 603 passed(신규 2건 — 켜는 값과 닫히는 값). `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. dev 서버에서 변수 없이 `/final/polish`가 404인 것 확인.
- Rollback/recovery reference: `src/app/final/` 폴더를 지우면 됩니다. `product` 속성은 기본값이 있어 지워도 PRO 동작 그대로입니다. 커밋 이전 상태는 `ae6397d`.
- **남은 일(사용자)**: `.env.local`에 `NEXT_PUBLIC_ENABLE_FINAL=1`을 넣고 dev 서버를 다시 시작하면 `/final/polish`가 열립니다. **Cloudflare에는 넣지 마세요** — 넣는 순간 결제가 안 되는 상품이 손님에게 보입니다.

## 2026-08-24 — Claude: 동의한 실행의 비식별 사본을 실제로 보관

- Agent/session: Claude. 사용자 요청: 앞 항목 3번("동의한 실행의 비식별 사본 실제 보관") 진행.
- Status: completed. **마이그레이션 하나 추가**(`20260824060000_research_snapshots.sql`).
- Protected baseline: 분석 완료 경로(`complete_quick_analysis` 호출)는 그대로이고, 성공한 **뒤에** 한 줄이 덧붙습니다.

### 또 같은 종류의 버그 — 다섯 번째

- `supabase-quick-analysis-run-repository.ts`의 재개 경로가 `run.product === "PRO"`로 지원자료를 걸렀습니다. **FINAL 실행이 크론으로 재개되면 이력서가 통째로 빠집니다** — FINAL이 존재하는 이유인 그 문서가요. `product !== "QUICK"`으로 고쳤습니다.
- 지금까지 같은 자리를 다섯 곳에서 찾았습니다: `questions.ts`, `begin_quick_analysis`, 결과 화면 탭, 준비 화면 안내, 그리고 여기. **"PRO만"이라고 쓴 자리는 전부 FINAL을 떨어뜨립니다.**

### 무엇을 보관하나

- 지원자 글은 **가려서**, 지적 내용은 **그대로**. 후자가 실제로 배우는 부분입니다 — `본인 기여가 드러나지 않습니다` 같은 지적이 수백 건에서 반복되면 그것이 규칙으로 적을 값어치가 있는 것이고, 그 문장 자체에는 개인정보가 없습니다.
- **일부러 담지 않은 것**: 회사명·직무명·파일명·caseId를 별도 항목으로 두지 않습니다. 회사 이름이 타임라인 옆에 컬럼으로 있으면 사람이 예상보다 빨리 좁혀집니다. 다만 **지원자가 직접 쓴 문장 안의 회사명은 남습니다** — 그걸 지우면 지원동기를 연구할 수 없고, 지원한 회사를 아는 것이 지원자를 특정하지도 않습니다.
- 한 실행에 사본 하나(`analysis_run_id` unique). 재시도해도 덮어쓰므로 같은 지원서를 두 번 세지 않습니다.

### 소유자 id를 남긴 것은 실수가 아니라 거래입니다

- 내용은 가리지만 **연결은 남깁니다.** 남기지 않으면 `철회하면 지웁니다`가 **지킬 방법이 없는 약속**이 됩니다 — 어느 행이 그 사람 것인지 모르니까요.
- 그래서 연결을 남긴 값을 실제로 씁니다: **철회하면 그 자리에서 삭제합니다.** `이후로는 활용하지 않습니다`는 약한 약속이고, 그때까지 모은 것이 그대로 남아 있다면 권한을 되찾은 것이 아닙니다. 화면 문구도 `이미 보관 중인 사본도 그 자리에서 지웁니다`로 바꿨습니다.

### 잘못될 수 없게 만든 것

- **동의 확인은 SQL 안에 있습니다.** 호출하는 코드는 틀릴 수 있습니다. 수집 문은 하나이고 잠금장치는 문 안쪽에 답니다.
- **브라우저에서는 아무도 못 읽습니다.** RLS를 켜고 정책을 하나도 만들지 않았습니다 — 본인도 못 읽습니다. `service_role`만 접근합니다.
- **분석을 절대 망치지 않습니다.** 완료가 저장된 뒤에 돌고, 어떤 예외도 삼킵니다. 이미 값을 치른 결과를, 우리 규칙을 다듬자고 실패로 만들 이유가 없습니다.
- Files/branch: `supabase/migrations/20260824060000_research_snapshots.sql`(신규), `src/server/analysis/research-capture.ts`(신규), `src/server/analysis/research-capture.test.ts`(신규), `src/server/analysis/research-snapshot-migration.test.ts`(신규), `src/server/analysis/supabase-quick-analysis-run-repository.ts`, `src/domain/deidentify.ts`, `src/components/research-consent.tsx` on `main`.
- Validation: `npx vitest run` 616 passed(신규 13건 — 사본 생성 7, 마이그레이션 불변식 6). `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- Rollback/recovery reference: `captureForResearch` 호출 한 줄을 지우면 수집이 멈춥니다. 테이블을 지우면 보관분도 사라집니다. 커밋 이전 상태는 `ae6397d`.
- **남은 일(사용자)**: 마이그레이션 적용. 그 뒤 분석을 한 번 돌리고 결과 화면에서 동의 → `research_snapshots`에 행이 생기는지, 철회 → 그 행이 사라지는지 확인.
- **이제 랜딩 문구를 바꿀 수 있습니다**: `사례 데이터베이스` 배지 `동의 절차 구축 중` → `운영 중`, 그리고 `반영할 예정입니다` → 현재형. **다만 수집이 실제로 도는 것을 눈으로 본 뒤에** 바꾸는 것이 순서입니다.

## 2026-08-24 — Claude: 회사·직무 축 복구, 합/불 실제 저장, 축적 데이터 화면

- Agent/session: Claude. 사용자 지적: "회사명 직무명 저장 안 하면 데이터 쌓는 이유가 있나? 그리고 어디서 한눈에 보노?"
- Status: completed. **마이그레이션 하나 추가**(`20260824070000_outcome_and_research_axes.sql`).

### 제 판단이 틀렸습니다 — 회사·직무는 저장해야 맞습니다

- 직전 작업에서 `research_snapshots`에 지원 회사·직무를 **일부러 뺐습니다.** 근거는 "회사명이 타임라인 옆에 있으면 사람이 좁혀진다"였는데, **틀린 걱정에 옳은 필드를 희생한 것**입니다.
- **지원하는 회사는 그 사람의 회사가 아닙니다.** 한 회사에 수천 명이 지원하므로 아무도 특정하지 않습니다. 반대로 사람을 좁히는 것은 **재직 회사 + 재직 기간 + 학교 + 이름**이고, 그건 본문에 있어 지우개와 명시된 한계가 적용됩니다.
- 그리고 이 두 필드가 **모든 질문이 달리는 축**입니다. 없으면 남는 것은 묶을 것이 없는 익명 산문 더미입니다. 복구했습니다.

### 합/불이 아예 저장되고 있지 않았습니다

- `ApplicationTrackerCard`의 `서류 합격` / `서류 불합격` / `최종 합격` 버튼은 **`sessionStorage`에만** 썼습니다. 탭을 닫으면 사라집니다.
- 즉 **이 제품이 배울 수 있는 가장 값진 한 번의 클릭이 지금까지 전부 버려지고 있었습니다.** 그게 없으면 "합격한 지원서의 공통점" 같은 것은 영원히 불가능합니다.
- `application_outcomes` 테이블과 `record_application_outcome`를 만들고, 카드가 **기존 로컬 저장은 그대로 둔 채** 서버에도 보내게 했습니다. 실패해도 조용히 넘어갑니다 — 이 카드는 **지원자 자신의 기록이 먼저이고 우리 데이터가 나중**입니다.
- `confidence`는 `SELF_REPORTED` 고정입니다. 안 받은 합격을 받았다고 하는 사람은 실제로 있고, 그걸 모른 척하는 자료는 **자신 있게 틀린 결론**을 냅니다.

### 무엇을 뽑아낼 수 있게 했나 — `src/domain/research-insight.ts`

- **반복되는 지적**: 한 지원서 안에서 같은 지적이 세 번 나와도 **1건**입니다. 한 번의 분석이 세 문항에서 같은 말을 한 것은 여전히 그 문제를 가진 지원서 하나입니다.
- **회사별·직무별 묶기**: `MIN_GROUP_SIZE = 5` 미만은 **표에 내지 않습니다.** 한 회사에 3건은 그 회사에 대한 경향이 아니라 세 사람이고, 거기서 만든 규칙은 프롬프트에 들어가 **전원에게** 갑니다.
- **빠진 건수를 숨기지 않습니다.** "15건 있는데 표에는 2개뿐"은 그 자체로 알아야 할 사실이라 `제외 N건, 미기재 N건`을 함께 적습니다.
- **모르는 것을 실패로 세지 않습니다.** 결과 미확인은 별도 칸입니다. 실패로 접으면 모든 숫자가 실제보다 나빠 보이고, 조용히 버리면 좋아 보입니다.
- **표본이 적으면 비율을 내지 않습니다**(`documentPassRate`가 `null`). 결과 2건에서 나온 퍼센트는 지식처럼 보이는 숫자일 뿐이고, 정확히 그런 숫자가 나중에 마케팅 페이지에 올라갑니다.
- `describeConfidence`가 각 묶음 옆에 **얼마나 믿을 수 있는지**를 문장으로 답니다. 다음 달에 이 숫자를 읽는 사람은 그것을 더 단단하게 말하고 싶어질 것이고, 그걸 막는 문장이 필요합니다.

### 화면

- `/meensoo/research` — 보관 건수 / 결과 확인 / 서류 통과율, 반복되는 지적 표(전체·통과 쪽·탈락 쪽), 회사별·직무별 표.
- 맨 아래에 **이 숫자로 할 수 있는 것과 하지 말아야 할 것**을 적었습니다. 뽑히는 것은 "이 지적이 이 회사·직무에서 유독 자주 나온다"까지이고, 그것만으로도 프롬프트 규칙이 됩니다.
- `research_corpus` 뷰로 사본과 결과를 조인합니다. 결과는 사본보다 몇 주 뒤에 오므로 컬럼으로 복사하면 **뒤처지는 두 번째 쓰기 경로**가 생깁니다.
- Files/branch: `supabase/migrations/20260824070000_outcome_and_research_axes.sql`(신규), `src/domain/research-insight.ts`(신규), `src/domain/research-insight.test.ts`(신규), `src/app/meensoo/research/page.tsx`(신규), `src/server/analysis/research-capture.ts`, `src/server/analysis/research-capture.test.ts`, `src/server/analysis/supabase-quick-analysis-run-repository.ts`, `src/components/application-tracker-card.tsx`, `src/server/admin/admin-repository.ts`, `src/app/meensoo/admin-shell.tsx` on `main`.
- Validation: `npx vitest run` 629 passed(신규 13건 — 집계 규칙 12, 사본 축 1). `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- Rollback/recovery reference: 새 테이블·뷰·화면과 기존 카드의 `void (async ...)` 한 구간입니다. 커밋 이전 상태는 `ae6397d`.
- **남은 일(사용자)**: 마이그레이션 적용.
- **다음**: 뽑힌 규칙을 **실제로 프롬프트에 먹이는 경로**는 아직 없습니다(사람이 읽고 손으로 넣어야 합니다). 표본이 쌓인 뒤에 만드는 것이 맞습니다 — 지금 자동화하면 노이즈를 자동으로 학습합니다.

## 2026-08-24 — Claude: 이용권이 결제창을 대체하도록, 발급 링크 다시 보기, /redeem 다시 그리기

- Agent/session: Claude. 사용자 보고: "이용권 등록됐다고 뜨는데 결제 누르면 그냥 일반 결제창 뜬다."
- Status: completed. **마이그레이션 없음.**

### 이용권이 실제로 쓰이지 않고 있었습니다

- `consume_reward_credit` 함수는 있었지만 **누를 곳이 없었습니다.** 그래서 이용권을 받은 사람도 결제 화면에서 그대로 Polar로 갔습니다. 등록은 됐는데 아무 일도 안 일어난 것처럼 보인 이유입니다.
- 결제 화면이 이제 로그인 직후 **그 상품의 미사용 이용권**이 있는지 봅니다. `QUICK` 이용권은 `PRO` 실행을 결제하지 못하므로 **상품까지 맞춰서** 조회합니다 — 안 그러면 지원서를 저장한 뒤에야 거절당합니다.
- 있으면 **버튼 글자부터 바뀝니다**: `무료 이용권으로 분석 시작 · 0원`. 그리고 그 위에 `{상품} 무료 이용권이 있습니다. 이번 분석은 결제 없이 진행됩니다.`를 **누르기 전에** 띄웁니다. 저장한 뒤에야 드러나는 무료 티켓은 적용이 안 된 것처럼 읽힙니다.
- 누르면 저장 → `consume_reward_credit` → `/api/analysis-runs/quick/execute` → 결과로 이동. **유료 경로가 Polar에서 돌아와 하는 일과 똑같은 두 단계**입니다. 202(백그라운드 진행)도 유료 경로와 동일하게 성공으로 봅니다.
- 재시도 버튼(저장은 됐는데 결제로 못 넘어간 경우)도 같은 분기를 탑니다.

### 발급 내역에서 링크를 다시 볼 수 있게

- 발급 직후 화면을 닫으면 **링크의 유일한 사본이 사라집니다.** 토큰은 이미 발급된 이용권에 대해 다시 만들 수 없습니다.
- 목록의 `수령 링크` 칸에 그대로 두고, 클릭하면 전체 선택됩니다. **이미 수령된 것은 링크 대신 `이미 수령됨`**을 보여줍니다 — 쓸 수 없는 링크를 복사할 이유가 없습니다.

### /redeem 다시 그리기

- 흰 카드에 초록 아이콘이었습니다. 맞긴 한데 **기억에 안 남습니다.** 이 화면은 무언가를 공짜로 받은 직후 처음 보는 장면이라 무게를 줄 만합니다.
- 어두운 바탕(`#080b0a`)에 **뒤에서 비추는 빛 한 겹**(radial + conic 그라데이션), 유리질 카드, 올라오며 나타나는 진입. **이미지는 한 장도 안 씁니다** — 순수 CSS라 로딩도 없고 낡지도 않습니다.
- `prefers-reduced-motion`을 존중해 움직임을 원하지 않는 사용자에게는 애니메이션이 없습니다.
- Files/branch: `src/components/application-case-handoff.tsx`, `src/components/application-case-handoff.module.css`, `src/app/meensoo/rewards/page.tsx`, `src/app/meensoo/admin.module.css`, `src/app/redeem/[token]/redeem.module.css` on `main`.
- Validation: `npx vitest run` 629 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. dev 서버에서 `/redeem`의 새 배경·카드·그림자와 가로 스크롤 없음, 콘솔 오류 없음 확인.
- Rollback/recovery reference: 결제 화면의 `availableCredit` 분기와 `startWithCredit`, 관리자 표의 `수령 링크` 칸, CSS 파일 하나입니다. 커밋 이전 상태는 `ae6397d`.
- **남은 일(사용자)**: 이용권이 남아 있는 계정으로 `/quick` 또는 `/pro/polish`를 끝까지 진행해 **결제창 대신 바로 분석이 시작되는지** 확인해 주세요.

## 2026-08-24 — Claude: /redeem 안내 페이지, 랜딩 문구 현재형, 런칭 SEO, 히어로 톤

- Agent/session: Claude. 사용자 요청: `/redeem` 주소가 안 나온다 / 랜딩 문구 현재형 / 히어로 톤 맞추기 / 런칭에 맞는 SEO(기존 것은 두고 "출시 예정"에 해당하는 것만).
- Status: completed. **마이그레이션 없음.**

### /redeem 이 404였습니다

- 라우트가 `/redeem/{token}`이라 **토큰 없는 `/redeem`은 404**였습니다. 주소를 외워서 치는 사람, 메일 클라이언트가 링크를 잘라 버린 사람이 정확히 여기에 도착합니다.
- **404는 "이용권이 사라졌다"고 말합니다.** 사라지지 않았는데요. 안내 페이지를 두어 `메일에 담긴 링크 전체`가 필요하다는 것과, **이미 등록한 이용권은 결제 화면에서 자동 적용되므로 이 페이지에 다시 올 필요가 없다**는 것을 알려줍니다.

### 랜딩 문구를 현재형으로

- 수집 경로가 실제로 도니 이제 사실입니다. `반영할 예정입니다` → **`이용자가 동의한 경우에만, 개인정보를 지운 사본으로 반영합니다`**. 배지 `동의 절차 구축 중` → **`동의 기반 수집 중`**.
- 여기에 **철회 시 보관분까지 지운다**는 사실을 문구에 추가했습니다. 실제로 그렇게 동작하고, 그게 이 약속에서 가장 무거운 부분입니다.
- `합격률 몇 %` 같은 수치를 쓰지 않는다는 문장은 **그대로 뒀습니다.** 표본은 아직 그대로입니다.

### 런칭 SEO — 기존 설정은 건드리지 않았습니다

- 이미 `index: true`에 사이트맵도 있어 **바꿀 것이 별로 없었습니다.** 런칭에서 빠져 있던 것만 채웠습니다.
- **`Offer` 구조화 데이터 추가.** offers 없는 `Service` 노드는 크롤러에게 "이 회사가 하는 일"로 읽힙니다. "지금 살 수 있는 것"이 되려면 가격과 재고 상태를 함께 말해야 하고, 가격·판매중 리치 결과도 그때만 나옵니다. QUICK 5,900 / PRO 12,900 · `InStock`.
- **FINAL은 일부러 뺐습니다.** 체크아웃이 없는데 가격을 적으면 **지킬 수 없는 판매 제안**이 됩니다. 요금표의 `FINAL 준비 중`도 사실이라 그대로 뒀습니다.
- **`FAQPage` 추가** — 사람들이 실제로 검색창에 치는 네 가지(어떻게 진행되나 / 지어내지 않나 / 결제 전에 AI가 도나 / 합격 확률을 알려주나). 모든 답은 **사이트가 이미 페이지에서 하고 있는 말**입니다.
- **`robots.ts`에 disallow 세 개.** `/redeem/`은 **주소에 수령 토큰이 들어 있어 색인되면 그 자체가 유출**입니다. `/meensoo/`는 운영 콘솔, `/comingsoon`은 런칭 전 페이지라 브랜드명 검색에서 진짜 첫 화면과 경쟁합니다.
- 사이트맵 `lastModified`를 런칭일로 맞췄습니다. 제품이 열린 날보다 앞선 날짜는 **"그때 이후로 바뀐 게 없다"**는 뜻이고, 런칭이 하고 싶은 말의 반대입니다.

### 히어로

- `/redeem`과 같은 **뒤에서 비추는 빛 한 겹**을 히어로에도 넣었습니다. 다만 흰 배경 위라 훨씬 옅게(초록 .16/.09 수준) 깔고, 아래를 흰색으로 페이드해 **글자 뒤에 머물게** 했습니다.
- `isolation: isolate` + `z-index:-1`이라 기존 요소 위로 올라오지 않고, 이미지가 없어 로딩도 없습니다.
- Files/branch: `src/app/redeem/page.tsx`(신규), `src/app/page.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/globals.css` on `main`.
- Validation: `npx vitest run` 629 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. dev 서버에서 `/redeem` 안내 렌더, 구조화 데이터에 `Organization/WebSite/Service/FAQPage` 4개와 offers 2건(`InStock`), 히어로 그라데이션 적용, 가로 스크롤·콘솔 오류 없음 확인.
- Rollback/recovery reference: `/redeem/page.tsx` 한 파일, 구조화 데이터 블록, robots·sitemap 각 한 줄, `globals.css`의 `.hero:before/:after`입니다. 커밋 이전 상태는 `ae6397d`.

## 2026-08-24 — Claude: 무료 이용권 분석에도 진행 화면 붙이기

- Agent/session: Claude. 사용자 보고: "무료 이용권으로 분석을 시작했습니다 — 이 문장만 나오고 로딩 화면이 안 나온다."
- Status: completed. **마이그레이션 없음.**

### 무엇이 문제였나

- 유료 실행은 Polar에서 돌아오며 `?checkout=success`를 달고 오고, 그 파라미터가 진행 화면(`QuickCheckoutReturn`)을 깨웁니다. **이용권 실행은 Polar를 아예 안 거치므로 그 파라미터가 없습니다.**
- 그래서 이용권으로 시작한 사람은 **"분석을 시작했습니다"라는 문장 한 줄 위에 그대로 남았습니다.** 진행 표시도, 경과 시간도, 완료 시 이동도 없었습니다. 시작은 됐는데 아무것도 안 움직이는 것처럼 보인 이유입니다.

### 어떻게 고쳤나

- 진행 화면에 **두 번째 입구**를 뒀습니다: `?credit=started&analysisRunId=...`. 이용권 결제가 끝나면 그 주소로 보냅니다.
- **기존 결제 폴링 안에 분기를 넣지 않았습니다.** 그 루프가 답하는 질문은 "결제가 확인됐나"인데 이용권 경로에는 그런 질문이 없고, 한 루프에 두 의미를 꿰면 **공짜 경로 때문에 유료 경로가 위험해집니다.** 별도 effect로 두었습니다.
- 새 루프가 하는 일은 하나입니다: `execute` 호출 → `resultUrl`이 오면 결과로 이동, `202`(진행 중)면 3초 뒤 다시. 화면·문구·경과 시간 표시는 **유료 경로가 쓰던 것을 그대로** 씁니다.
- **끊긴 연결을 실패로 보지 않습니다.** 서버에서는 이미 `RUNNING`이라 계속 물어보면 됩니다. 다만 실제 실패 응답은 그대로 화면에 띄웁니다 — 조용히 계속 도는 것이 지난번 유료 경로에서 고쳤던 바로 그 문제입니다.
- 폴링 한도를 넘기면 **"창을 닫아도 서버에서 계속 진행되며 결과 링크를 메일로 보내드립니다"**로 끝냅니다. 실패가 아니라 오래 걸리는 것이고, 실제로 그렇게 동작합니다.
- Files/branch: `src/components/quick-checkout-return.tsx`, `src/components/application-case-handoff.tsx` on `main`.
- Validation: `npx vitest run` 629 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- Rollback/recovery reference: `quick-checkout-return.tsx`의 `credit=started` effect 하나와 이동 한 줄입니다. 커밋 이전 상태는 `881ccfe`.

## 2026-08-24 — Claude: 이용권 진행 화면이 뜨지 않던 진짜 이유

- Agent/session: Claude. 사용자 보고: 직전 수정 뒤에도 `입력 내용을 비공개로 저장하고 결제 페이지로 이동합니다`에서 멈춘다.
- Status: completed. **마이그레이션 없음.**

### 직전 수정이 왜 안 먹었나

- 진행 화면(`QuickCheckoutReturn`)과 결제 버튼(`ApplicationCaseHandoff`)은 **같은 페이지(`/analysis/prepare`)에 나란히 있는 형제**입니다.
- 그래서 `router.push("/analysis/prepare?credit=started&...")`는 **같은 라우트로의 이동이라 아무것도 다시 마운트하지 않습니다.** URL만 바뀌고, 주소를 읽는 `[]` 의존 effect는 **영영 실행되지 않습니다.**
- 이용권은 실제로 차감됐고 분석도 시작됐는데 화면만 가만히 있었던 이유가 이것입니다. 주소를 통해 형제에게 말을 거는 방식 자체가 틀렸습니다.

### 어떻게 고쳤나

- 실행 id를 **부모(`AnalysisPreparation`)가 들고** 있습니다. 결제 버튼은 `onCreditRunStarted(runId)`로 올려 보내고, 진행 화면은 `creditRunId` prop으로 받습니다. React가 실제로 다시 그리므로 effect가 확실히 돕니다.
- 주소·Suspense·`useSearchParams` 같은 것을 하나도 쓰지 않습니다. 두 컴포넌트가 같은 트리에 있는데 브라우저 주소를 우편함처럼 쓸 이유가 없습니다.

### 문구도 틀려 있었습니다

- 저장 직후 메시지가 분기와 무관하게 **`결제 페이지로 이동합니다`** 하나였습니다. 무료로 도는 사람 앞에서 이 문장은 **틀렸을 뿐 아니라 놀랍게 만듭니다.**
- 이용권이 있으면 `무료 이용권으로 분석을 시작합니다`로 나갑니다.
- Files/branch: `src/components/analysis-preparation.tsx`, `src/components/application-case-handoff.tsx`, `src/components/quick-checkout-return.tsx` on `main`.
- Validation: `npx vitest run` 629 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- Rollback/recovery reference: prop 세 곳(`creditRunId`, `onCreditRunStarted`, 부모 state)입니다. 커밋 이전 상태는 `cfbf3fa`.
- **남은 일(사용자)**: 이용권이 **남아 있는** 계정으로 확인해 주세요. 직전 테스트에서 한 장을 이미 썼다면 `/meensoo/rewards`에서 한 장 더 발급하셔야 합니다 — 이용권이 없으면 정상적으로 결제 화면으로 갑니다.

## 2026-08-24 — Claude: 추천코드, 그리고 이용권 진행 화면이 화면 밖에 있던 문제

- Agent/session: Claude. 사용자 요청: 추천코드 개발 + "메일은 왔는데 브라우저에 로딩이 안 나온다".
- Status: completed. **마이그레이션 하나 추가**(`20260824080000_referrals.sql`).

### 로딩이 안 보인 이유 — 화면 밖에 있었습니다

- 진행 화면(`QuickCheckoutReturn`)은 페이지 **헤더 바로 아래**에 그려지고, 이용권으로 시작하는 버튼은 **페이지 한참 아래**에 있습니다.
- 그래서 진행 표시는 실제로 떴는데 **전부 화면 위쪽 바깥**이었고, 버튼을 보고 있던 사람 눈에는 아무것도 안 움직였습니다. 메일이 온 것은 분석이 정상적으로 끝났다는 뜻입니다.
- 시작할 때 **그 블록으로 스크롤**합니다. 그리고 버튼 자리에도 한 줄 남깁니다 — 답을 찾으러 다니게 하면 안 됩니다.

### 추천코드 — 규칙 하나가 설계를 정합니다

- **코드 입력은 아무 값도 없고, 결제 완료만 값이 있습니다.** 입력에 보상하면 처음 눈치챈 사람이 **버려도 되는 계정 백 개에 자기 코드를 넣는 루프**를 짭니다. `order.paid`에 보상하면 그 공격이 상금보다 비싸집니다.
- `apply_referral_code`는 **의도만 기록**합니다(`PENDING`). 이용권을 만드는 곳은 `settle_referral_for_order` 하나뿐이고, 그건 결제된 주문을 요구합니다. 테스트가 **apply 함수 본문에 `insert into reward_credits`가 없다**는 것을 직접 확인합니다.
- **무료 실행은 전환이 아닙니다.** `amount <= 0`이거나 provider가 `POLAR`가 아니면 거절합니다 — 이용권으로 0원 결제하고 추천인에게 티켓을 주는 것은 같은 구멍을 옷만 갈아입힌 것입니다.
- **한 사람은 평생 한 번**: `referred_user_id`가 기본키입니다. 규칙이 곧 스키마입니다.
- **첫 결제에만**: 이미 `PAID` 주문이 있으면 입력 단계에서 거절합니다. 지켜질 수 없는 의도를 기록해 두지 않습니다.
- **본인 코드 금지**: 함수와 테이블 제약 양쪽에.
- **웹훅이 두 번 와도 한 장**: `reward_credit_id`가 unique이고, `PENDING`만 집어 `for update`로 잠급니다. 그리고 `GRANTED`(첫 지급)일 때만 정산을 부릅니다.
- 코드는 **서버가 만듭니다.** 브라우저가 준 코드는 브라우저가 고른 코드이고, 누군가는 친구 것을 고릅니다. 알파벳에서 `0/O/1/I/L`을 뺐습니다 — 코드는 마주 앉아 불러주고 폰으로 다시 칩니다.
- **정산이 결제를 되돌리지 않습니다.** 추천 처리는 예외를 삼키고 기록만 남깁니다. 이미 끝난 결제를 실패한 웹훅으로 만들면 Polar가 재시도합니다.

### 화면

- 결과 화면(최종 첨삭본 탭)에 **내 코드 + 복사 + 결제대기/지급완료 집계**. 동의 블록과 같은 자리인 이유도 같습니다 — **방금 받은 것이 실제로 쓸모 있었던 그 순간**이 사람이 친구에게 말할 마음이 드는 유일한 때입니다. 랜딩에 두는 것은 써 보지도 않은 사람에게 보증을 부탁하는 일입니다.
- 결제 화면에 **추천코드 입력칸**. **무료 이용권으로 도는 경우에는 안 보입니다** — 귀속시킬 결제가 없어 절대 전환될 수 없는 코드를 받게 됩니다.
- Files/branch: `supabase/migrations/20260824080000_referrals.sql`(신규), `src/domain/referral.ts`(신규), `src/domain/referral.test.ts`(신규), `src/server/analysis/referral-migration.test.ts`(신규), `src/components/referral-panel.tsx`·`referral-panel.module.css`(신규), `src/components/application-case-handoff.tsx`·`.module.css`, `src/components/result-workspace-complete.tsx`, `src/components/quick-checkout-return.tsx`, `src/server/billing/supabase-polar-entitlement-repository.ts` on `main`.
- Validation: `npx vitest run` 645 passed(신규 16건 — 코드 생성·정규화·거절 문구 7, 마이그레이션 불변식 9). `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- Rollback/recovery reference: 새 테이블 둘·함수 셋·화면 둘, 그리고 웹훅의 `settleReferral` 호출 한 줄입니다. 커밋 이전 상태는 `9f0df32`.
- **남은 일(사용자)**: 마이그레이션 적용. 그다음 계정 두 개로 확인 — A의 결과 화면에서 코드 확인 → B가 결제 화면에 입력 → B가 실제 결제 → A에게 이용권이 생기는지.

## 2026-08-24 — Claude: 메인 히어로 아우라 움직이기 (롤백 표시 포함)

- Agent/session: Claude. 사용자 요청: 히어로 뒤 아우라를 움직이게, 다만 이상할 수 있으니 롤백 준비.
- Status: completed. **마이그레이션 없음.**

### 어떻게 움직이게 했나

- 아우라를 **두 겹으로 나눴습니다.** 가운데 번지는 원(radial)은 그대로 두고, **부채꼴 빛(conic)만 돕니다.** 한 덩어리로 돌리면 번짐까지 같이 돌아 어지럽습니다.
- 돌리는 것은 **`transform: rotate` 하나뿐**입니다. GPU가 합성만 하면 되므로 페이지를 다시 그리지 않습니다. 그라데이션 자체를 애니메이션하면 **1180px짜리 blur 상자를 매 프레임 다시 칠하게** 됩니다.
- **72초에 한 바퀴.** 보고 있으면 도는 줄 모르고, 다시 봤을 때 달라져 있는 정도입니다. 히어로는 광고판이지 장난감이 아닙니다.
- `prefers-reduced-motion`을 존중합니다. 움직임을 끄고 쓰는 사용자에게는 정지된 아우라만 남습니다.

### 롤백

- `globals.css`의 `── ROLLBACK ──` 주석으로 감싼 블록 하나를 지우면 **움직임만 멈추고 아우라는 그대로** 남습니다. 다른 것이 그 블록에 의존하지 않습니다.
- 아우라 자체를 아예 빼려면 `page.tsx`의 `<div className="hero-aura" .../>` 한 줄과 `.hero-aura` 규칙을 지우면 됩니다.
- Files/branch: `src/app/globals.css`, `src/app/page.tsx` on `main`.
- Validation: `npx vitest run` 645 passed, `npx eslint .` 0건, `npx next build` 클린. dev 서버에서 애니메이션이 `hero-aura-turn 72s`로 붙고, 재생 시간을 18초(1/4 지점)로 옮기면 정확히 90° 회전(`matrix(0,1,-1,0,…)`)하는 것을 확인했습니다. 헤드리스 탭은 백그라운드라 시계가 멈춰 있어 시간 경과 대신 직접 확인했습니다. 가로 스크롤 없음, h1 정상.

## 2026-08-24 — Claude: 아우라를 흐르게, 신뢰 문구를 고객 말로, /new 현장 조언

- Agent/session: Claude. 사용자 지적: 움직이는 게 아우라가 아니라 네모 상자가 도는 것 같다 / 신뢰 문구가 우리 규칙처럼 읽힌다 / 헤더의 `이용 방법`은 `/guide`로 가야 한다(하단은 그대로) / `/new`에 팁·노하우 추가.
- Status: completed. **마이그레이션 없음.**

### 왜 상자가 도는 것처럼 보였나

- 원인은 **conic 그라데이션에 각진 경계가 있다**는 것입니다. 부채꼴 조각의 모서리가 눈앞을 스치면 도형이 그대로 드러납니다. 한 겹을 돌리는 방식으로는 아무리 느리게 해도 이 문제가 남습니다.
- **부드러운 덩어리 셋이 각자 다른 시계로 떠다니게** 바꿨습니다. 서로 겹치는 자리가 계속 바뀌므로 **경계라고 알아볼 것이 없고**, 그것이 "흐른다"의 실체입니다.
- 주기를 29·37·43초로 잡아 **셋이 같은 배치로 돌아오지 않게** 했습니다. 공통 주기가 있으면 반복이 눈에 띕니다.
- 여전히 `transform`만 움직이므로 다시 칠하지 않습니다. 마우스 반응형 메시 같은 것은 **캔버스와 상시 계산이 필요**해 랜딩 첫 화면에 얹기에는 값이 비쌉니다.
- 롤백 표시는 그대로입니다. 그 블록만 지우면 **덩어리 셋이 제자리에 멈춘 채** 남습니다.

### 신뢰 문구

- `없는 경험 생성 금지 / 내 말투와 사실 보존 / 합격 확률 표시 없음`은 **우리가 지키는 규칙의 목록**이었습니다. 읽는 사람에게 무엇이 좋은지는 스스로 번역해야 했습니다.
- 같은 세 가지를 **받는 사람 입장**으로 옮겼습니다: `없는 경험은 지어내지 않아요 / 내 말투 그대로 남겨요 / 점수 대신 고칠 곳을 알려드려요`. 지우지 않고 말만 바꿨습니다.

### 헤더 링크

- 헤더는 `#how`(같은 페이지 스크롤), 하단은 `/guide`(페이지)로 **서로 다른 곳**을 가리키고 있었습니다. 헤더를 `/guide`로 맞췄고 **하단은 건드리지 않았습니다.**

### /new · 현장에서 하는 조언

- 도구 사용법이 아니라 **상담에서 반복해서 하게 되는 말** 여섯 가지: 첫 문장부터 문항에 답하기 / `우리` 대신 `제가` / 회사 이름 없는 지원동기 / 수치가 없어도 되는 이유 / 짧은 재직기간은 먼저 말하기 / 제출 전 소리 내어 읽기.
- 제품 기능 설명과 **다른 성격이라 따로 묶었습니다.** 이 페이지의 나머지는 "어떻게 넣는가"이고, 이 절은 "무엇을 쓰는가"입니다.
- Files/branch: `src/app/globals.css`, `src/app/page.tsx`, `src/app/new/page.tsx`, `src/app/new/guide.module.css` on `main`.
- Validation: `npx vitest run` 645 passed, `npx eslint .` 0건, `npx next build` 클린. dev 서버에서 덩어리 3개가 각각 29/37/43초 애니메이션을 갖는 것, 헤더 링크가 `/guide`인 것, 신뢰 문구 3개, `/new` 팁 6개와 목차 항목 추가, 가로 스크롤·콘솔 오류 없음 확인.
- Rollback/recovery reference: `globals.css`의 `── ROLLBACK ──` 블록(움직임만), `page.tsx`의 `<div className="hero-aura">` 한 줄(아우라 전체). 커밋 이전 상태는 `1885353`.

## 2026-08-24 — Claude: 추천코드를 찾을 수 있는 곳에 두기 (`/refer`)

- Agent/session: Claude. 사용자 보고: 마이그레이션 재실행 오류(이미 적용됨) + "추천이 어디 있는지 모르겠음".
- Status: completed. **마이그레이션 없음.**

### 못 찾은 게 당연했습니다

- 추천 패널을 **완료된 분석의 결과 화면 맨 아래**에만 뒀습니다. 그 자리는 **보기에는 맞는 순간**이지만 **다시 찾아가기에는 틀린 장소**입니다 — 이 제품에는 아직 `내 계정` 같은 곳이 어디에도 없어서, 결과 화면을 떠나면 코드로 돌아갈 길이 없습니다.
- 주소 하나로 해결했습니다. **`/refer`** — 타이핑할 수 있고, 북마크할 수 있고, 남에게 보낼 수 있습니다. 하단 링크에도 `친구 추천`을 걸었습니다.

### 로그인 진입점 문제도 같이 풀립니다

- 이 제품에는 **로그인 페이지가 없습니다.** 로그인은 결제 화면과 이용권 수령 링크에서만 일어나므로, "이미 회원인데 그냥 로그인하고 싶다"가 갈 곳이 없었습니다.
- `/refer`는 로그아웃 상태면 **`Google로 계속하기`**를 보여줍니다. 결과 화면의 같은 패널은 로그아웃 상태에서 **아무것도 그리지 않습니다** — 거기서는 보여줄 것도 없고 그걸 보러 온 것도 아니지만, 전용 페이지에서 같은 처리를 하면 빈 화면이 됩니다.

### 어떻게 진행되는지 네 단계로 적었습니다

- 특히 **3번(친구가 첫 결제를 마칩니다)** 옆에 `코드 입력만으로는 지급되지 않습니다`를 붙였습니다. 이 조건을 나중에 알게 되는 것이 추천 프로그램에서 가장 흔한 불만입니다.
- Files/branch: `src/app/refer/page.tsx`·`refer.module.css`(신규), `src/components/referral-panel.tsx`, `src/app/page.tsx` on `main`.
- Validation: `npx vitest run` 645 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린(`/refer` 정적 생성). dev 서버에서 로그아웃 상태의 로그인 안내와 4단계 안내 렌더, 콘솔 오류 없음 확인.
- Rollback/recovery reference: `src/app/refer/` 폴더와 하단 링크 한 줄입니다. 커밋 이전 상태는 `3262c1d`.

## 2026-08-24 — Claude: 헤더 드롭다운, 요금 앵커, 추천코드 입력칸 정리

- Agent/session: Claude. 사용자 지적: `/new`를 헤더에 어떻게 넣을지 / 요금 링크 / 추천코드 입력칸 UI가 작고 흩어져 있음.
- Status: completed. **마이그레이션 없음.**

### 헤더 · 이용 방법 드롭다운

- 두 안내 페이지(`/guide`, `/new`)가 성격이 달라 한 링크로는 담기지 않았습니다. `이용 방법`에 마우스를 올리면 둘이 나옵니다:
  - **이용 방법 · 자주 묻는 질문** → 순서, 요금, 자주 막히는 것
  - **팁과 노하우** → 넣는 법과 상담에서 하는 조언
- **JavaScript를 쓰지 않았습니다.** 링크 두 개를 드러내려고 번들이 붙기를 기다리는 메뉴는 **매 방문의 첫 1초 동안 없는 메뉴**입니다. `:hover`와 `:focus-within` 둘 다 열리므로 키보드로도 됩니다.
- 트리거와 패널 사이 간격에서 마우스가 빠지지 않게 **투명한 다리**를 뒀습니다(`:before`). 좁은 화면에서는 드롭다운을 숨기고 링크 하나로 둡니다.
- 트리거 자체도 `/guide`로 이동합니다 — 드롭다운을 못 여는 환경에서도 갈 곳이 있어야 합니다.

### 요금 링크

- `#plans`(현재 페이지 기준)에서 **`/#plans`**로 바꿨습니다. 헤더가 요금표 없는 페이지에 있을 때도 요금표에 도착합니다.
- 하단 `이용방법 · 자주 묻는 질문`은 **원래부터 `/guide`**였고 그대로 뒀습니다.

### 추천코드 입력칸

- 라벨과 얇은 입력칸과 버튼이 **각자 떨어져** 있었습니다. 세 개가 우연히 근처에 놓인 것처럼 보였습니다.
- **테두리 있는 카드 하나**로 묶고, 입력칸과 버튼을 **같은 줄·같은 높이(46px)**로 맞췄습니다. 하나의 컨트롤로 읽힙니다.
- 코드가 실제로 보이게 글자를 키웠고(15px, 자간 넓힘), 적용되면 카드 전체가 초록으로 바뀝니다. **Enter로도 적용**됩니다 — 코드를 붙여넣고 바로 치는 것이 자연스럽습니다.
- 좁은 화면에서는 버튼이 아래로 내려가 전체 너비를 씁니다.
- Files/branch: `src/app/page.tsx`, `src/app/globals.css`, `src/components/application-case-handoff.tsx`, `src/components/application-case-handoff.module.css` on `main`.
- Validation: `npx vitest run` 645 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. dev 서버에서 드롭다운이 기본 `hidden`이고 트리거에 포커스하면 `visible`이 되는 것, 헤더/하단 링크 목적지, 뷰포트 안에 들어오는 것 확인.
- Rollback/recovery reference: 헤더의 `.nav-menu` 블록과 `globals.css`의 `/* Header dropdown */` 규칙, 추천 카드 CSS입니다. 커밋 이전 상태는 `63bce2f`.

## 2026-08-24 — Claude: /refer 안내 목록이 세로로 뭉개지던 것

- Agent/session: Claude. 사용자 보고: `/refer`의 `어떻게 진행되나요` 목록이 글자가 깨져 세로로 보인다.
- Status: completed. **마이그레이션 없음.**

### 원인 — 그리드 칸이 두 개인데 넣은 것이 세 개

- `li`가 `grid-template-columns: 30px 1fr`(번호 칸 + 본문 칸)인데, 그 안에 **`::before`(번호) + `<b>`(제목) + `<span>`(설명)** 세 개를 넣었습니다.
- 그리드는 셋째 항목을 **다음 줄 첫 칸**, 즉 **30px짜리 번호 칸**에 넣습니다. 설명 문장이 30px 폭에 갇혀 **한 줄에 한 글자씩** 세로로 흘렀습니다.
- 제목과 설명을 `<div>` 하나로 묶어 **그리드 항목을 둘로** 만들었습니다. 이제 둘이 같은 열을 씁니다.
- 같은 실수를 다른 곳에서도 했는지 확인했습니다. `/new`의 단계 목록, FINAL 검증의 체크리스트·타임라인은 모두 이미 `아이콘 + div` 두 항목 구조라 문제가 없습니다.
- 첫 단계 문구도 `아래 코드를` → `위 코드를`로 고쳤습니다. 코드 카드가 이 목록보다 위에 있습니다.
- Files/branch: `src/app/refer/page.tsx`, `src/app/refer/refer.module.css` on `main`.
- Validation: `npx vitest run` 645 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. dev 서버에서 네 항목 모두 제목과 설명이 **같은 열**(`sameColumn: true`)에 있고 설명이 한 줄로 들어가는 것, 375px에서 설명 폭 260px에 가로 스크롤 없는 것 확인.

## 2026-08-24 — Claude: 받은 코드를 넣을 자리, 그리고 "어느 계정에 적용되나"

- Agent/session: Claude. 사용자 질문: 비로그인인데 코드가 보이면 그 코드를 넣었을 때 **어느 계정에** 주는 것인가.
- Status: completed. **마이그레이션 없음.**

### 답: 넣는 사람이 로그인한 계정입니다

- 코드는 **보상받을 사람(추천인)**을 가리키고, 코드를 **넣는 계정**이 추천받은 사람입니다. `apply_referral_code`는 `referred_user_id = auth.uid()`로 기록하므로 **세션 없이는 절반이 비어 성립하지 않습니다.**
- 확인 결과 비로그인 상태에서 `/refer`는 코드를 보여주지 않고 로그인 안내만 띄웁니다. 결제 화면의 입력칸도 `if (authenticated)` 안에 있어 로그아웃 상태에서는 그려지지 않습니다.
- 다만 **질문이 나온 것 자체가 화면의 문제**였습니다. 그 관계가 어디에도 쓰여 있지 않았습니다.

### 진짜 빠져 있던 것 — 받은 코드를 넣을 자리

- `/refer`는 **내 코드만** 보여줬습니다. 코드를 **받은** 사람이 그 페이지에 오면 넣을 곳이 없고, 유일한 입력칸은 결제 흐름 깊숙이 묻혀 있었습니다. 페이지 이름이 `친구 추천`이니 받은 사람도 당연히 여기로 옵니다.
- `/refer`에 **`받은 추천코드가 있으신가요?`** 카드를 더했습니다. 로그아웃이면 **`코드는 로그인한 계정에 적용됩니다`**라고 적고 로그인을 권합니다 — 질문에 대한 답을 화면이 직접 합니다.

### 입력칸을 한 곳으로 모았습니다

- 결제 화면과 `/refer`가 각자 입력칸을 갖고 있으면 **규칙이 갈라집니다.** `ReferralCodeEntry` 하나로 합치고 두 곳에서 씁니다.
- 차이는 로그아웃 처리 한 가지뿐입니다: 결제 화면은 이미 로그인한 뒤라 물을 일이 없고, `/refer`는 물어야 합니다(`requireSignIn`).
- Files/branch: `src/components/referral-code-entry.tsx`·`referral-code-entry.module.css`(신규), `src/components/application-case-handoff.tsx`·`.module.css`, `src/app/refer/page.tsx`·`refer.module.css` on `main`.
- Validation: `npx vitest run` 645 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. dev 서버에서 로그아웃 상태의 `/refer`가 **코드를 보여주지 않고** 두 카드 모두 로그인 안내를 띄우는 것, 콘솔 오류 없음 확인.
- Rollback/recovery reference: 새 컴포넌트 하나와 두 사용처입니다. 커밋 이전 상태는 `54a18a1`.

## 2026-08-24 — Claude: 추천 보상을 PRO로, 문구와 입력칸 정리

- Agent/session: Claude. 사용자 요청: 헤드라인 교체 / 보상이 약하니 PRO로 / 입력칸 가로 늘려 버튼과 오와열 맞추기.
- Status: completed. **마이그레이션 하나 추가**(`20260824090000_referral_reward_pro.sql`).

### 보상을 PRO로

- 추천은 **친구가 실제 결제를 해야** 성립합니다. 그 대가로 더 싼 등급을 주는 것은 거래의 약한 쪽이었습니다. PRO는 추천인이 어차피 샀을 등급이고, **제품을 남에게 말할 만하다고 느끼는 등급**이기도 합니다 — 추천 프로그램이 사려는 것이 정확히 그것입니다.
- 함수 한 곳에서 `'QUICK'` → `'PRO'` 한 단어만 바뀝니다. 나머지 본문은 그대로입니다.
- **이미 발급된 QUICK 이용권은 건드리지 않았습니다.** 그때 화면에 적혀 있던 조건으로 지급된 것들입니다.
- 화면 문구도 전부 PRO로 맞췄습니다(`QUICK 무료 이용권` 표기 0건 확인).

### 헤드라인

- `먼저 써 본 사람의 말이 가장 잘 전해집니다` → **`친구에게 추천하고, PRO 무료 이용권을 받아보세요.`** 앞의 것은 추천을 설명하고, 뒤의 것은 **무엇을 받는지** 말합니다.

### 입력칸

- 입력칸과 버튼이 한 줄에서 폭을 다투다 보니 **입력칸이 자기가 담을 코드보다 좁아졌고**, 두 모서리도 끝내 안 맞았습니다.
- **한 열에 위아래로 쌓고 둘 다 전체 폭**으로 뒀습니다. 폭이 하나뿐이라 눈으로 맞출 것이 없습니다. 입력칸은 50px 높이에 17px 글자·가운데 정렬이라 **코드가 코드처럼 보입니다.**
- Files/branch: `supabase/migrations/20260824090000_referral_reward_pro.sql`(신규), `src/domain/referral.ts`, `src/components/referral-panel.tsx`, `src/components/referral-code-entry.module.css`, `src/app/refer/page.tsx` on `main`.
- Validation: `npx vitest run` 645 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. dev 서버(1280px)에서 헤드라인 교체, `PRO 무료 이용권` 5회·`QUICK 무료 이용권` 0회, 카드 1160px에 버튼이 그 안쪽 폭을 꽉 채우는 것, 가로 스크롤 없음 확인.
- Rollback/recovery reference: 마이그레이션은 함수 재정의뿐이라 `20260824080000`의 함수를 다시 실행하면 QUICK으로 돌아갑니다. 커밋 이전 상태는 `c9c8f03`.

## 2026-08-24 — Claude: 결제 화면의 추천코드 칸을 안내 크기로, 빈 화면 없애기

- Agent/session: Claude. 사용자 요청: 결제 화면의 추천코드 카드를 `로그인 후 비공개로 저장합니다` 안내 아래로, 그 정도 크기로. 그리고 `Google로 계속하기`가 안 보인다.
- Status: completed. **마이그레이션 없음.**

### 크기와 자리

- 결제 화면에서 추천코드는 **결정해야 할 것이 아니라 곁에 있는 선택지**입니다. 대부분은 코드가 없습니다. 그런데 카드가 `분석에는 5~10분` 같은 안내보다 크게 자리를 차지하고 있었습니다.
- `compact` 변형을 두어 그 안내들과 **같은 무게**로 맞췄습니다(패딩 13px, 제목 12.5px, 입력 38px). 자리도 개인정보 안내 **바로 아래**로 옮겼습니다.
- 좁아진 만큼 입력칸과 버튼은 **다시 한 줄**로 돌아갑니다. `/refer`의 큰 카드는 위아래로 쌓인 그대로입니다 — 거기서는 그것이 그 페이지의 본론입니다.
- 결제 화면에서 로그아웃 상태면 **버튼을 그리지 않고 한 줄만** 남깁니다(`아래에서 로그인하시면 코드를 넣는 칸이 열립니다`). 몇 줄 아래에 이미 로그인 버튼이 있고, 하나 더 두는 것은 **같은 일에 대한 두 번째 결정**입니다.

### 빈 화면이 나올 수 있었습니다

- `/refer`에서 **로그인은 되어 있는데 코드 조회가 실패**하면 패널이 아무것도 그리지 않았습니다. 로그아웃과 구분이 안 되고, 화면만 보면 **이 계정에는 추천코드가 없다**로 읽힙니다.
- 그 경우 `추천코드를 불러오지 못했어요`를 띄웁니다. 안내가 없는 빈칸보다 낫습니다.

### `Google로 계속하기`가 안 보인 이유

- **이미 로그인되어 있기 때문입니다.** 로그아웃 상태에서만 나옵니다. 로그인 상태에서는 그 자리에 코드가 나오고, 결제 화면에서는 입력칸이 바로 열립니다.
- 다만 **헤더에 로그인 입구가 없다**는 지적은 그대로 유효합니다. 지금 로그인이 가능한 곳은 결제 화면·이용권 링크·`/refer` 세 군데뿐입니다.
- Files/branch: `src/components/referral-code-entry.tsx`·`.module.css`, `src/components/referral-panel.tsx`, `src/components/analysis-preparation.tsx`·`.module.css`, `src/components/application-case-handoff.tsx` on `main`.
- Validation: `npx vitest run` 645 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- Rollback/recovery reference: `compact` 분기와 `.referralNote` 한 줄입니다. 커밋 이전 상태는 `d07740f`.

## 2026-08-24 — Claude: 헤더 로그인/로그아웃, 추천코드 칸을 한 줄로

- Agent/session: Claude. 사용자 요청: 추천코드 칸을 더 작게 한 줄로 / 로그인·로그아웃 버튼.
- Status: completed. **마이그레이션 없음.**

### 사이트에 로그인 입구가 없었습니다

- 계정에 닿는 길이 **분석 시작·이용권 링크·`/refer`** 셋뿐이었습니다. 지난주에 결제한 사람이 이용권을 보러 돌아오면 **갈 데가 없고**, 추천코드를 받은 사람은 **자소서부터 써야** 입력칸을 만났습니다.
- 헤더에 `로그인`을 두고, 로그인 상태에서는 `내 계정` 메뉴(이메일 · 추천코드/이용권 · 새 분석 · **로그아웃**)가 열립니다.
- **세션을 알기 전까지는 아무것도 그리지 않습니다.** 잠깐 `로그인`을 보였다가 계정 메뉴로 바뀌면, 돌아온 사람에게 **매번 로그아웃됐다고 말하는 셈**입니다.
- 로그인 후에는 **보고 있던 페이지로 돌아옵니다.** 요청한 적 없는 대시보드로 데려가지 않습니다.
- 드롭다운은 `/`, `/refer`, `/new` 헤더에 같이 붙였습니다. 여기서도 JavaScript 없이 `:hover`/`:focus-within`으로 엽니다.

### 추천코드 칸

- 결제 화면의 카드는 여전히 **제목 한 줄 + 설명 한 줄 + 입력**이라 흐름의 한 단계처럼 보였습니다. 실제로는 **코드를 붙여넣는 자리**일 뿐입니다.
- **한 줄**로 줄였습니다: `👥 추천코드 [선택] [입력칸] [적용]`. 높이 34px, 글자 12.5px — 옆의 안내들보다 작습니다.
- 로그아웃 상태면 입력칸 대신 `로그인하시면 입력칸이 열립니다` 한 마디만 둡니다.
- `/refer`의 큰 카드는 그대로입니다. 거기서는 그것이 페이지의 본론입니다.
- 결제 화면에 남아 있던 옛 카드의 죽은 CSS(`.referralSlot`)도 지웠습니다.
- Files/branch: `src/components/header-account.tsx`·`.module.css`(신규), `src/components/referral-code-entry.tsx`·`.module.css`, `src/components/application-case-handoff.module.css`, `src/app/page.tsx`, `src/app/refer/page.tsx`, `src/app/new/page.tsx` on `main`.
- Validation: `npx vitest run` 645 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. dev 서버에서 헤더가 `이용 방법 ▾ · 요금 · 로그인 · 무료로 진단하기` 순으로 렌더되는 것 확인.
- Rollback/recovery reference: `<HeaderAccount />` 세 줄과 컴포넌트 하나, compact 분기입니다. 커밋 이전 상태는 `4ba3a06`.

## 2026-08-26 — Referral eligibility after any prior purchase

- Agent/session: Codex, user-requested main checkpoint commit.
- Status: active local commit; remote migration not applied.
- Protected baseline: current referral-attribution uniqueness rule (one referral per referred account) and all existing reward issuance logic.
- Change and reason: adds migration `20260824100000_referral_any_purchase.sql`, which removes the unnecessary first-purchase restriction while retaining the primary-key one-referral-ever guard. Generated `next-env.d.ts` development route-type reference update is committed alongside it.
- Files/branch: `main`; `supabase/migrations/20260824100000_referral_any_purchase.sql`, `next-env.d.ts`.
- Validation: migration reviewed; `git diff --check` passed. Remote migration intentionally not applied.
- Rollback/recovery reference: restore the preceding `apply_referral_code` definition from the prior migration if this policy is rejected.
- User decision: user requested a Git commit; push/deploy pending separately.
## 2026-08-26 — Launch price banner integration variant

- Agent/session: Codex delegation.
- Status: variant; not merged, deployed, or remotely migrated.
- Protected baseline: current `main` landing and its `HeaderAccount` login/account/logout header flow.
- Change and reason: copied only the launch-price-banner component/styles from `feature/codex-plan` and rendered it immediately before the existing home `<main>`. The current landing body, header markup, and startup-header/mobile-header CSS variant remain untouched.
- Files/branch: `codex/integrate-launch-price-banner`; `src/components/launch-price-banner.*`, additive `src/app/page.tsx` import/render.
- Validation: pending.
- Rollback/recovery reference: remove the component import and `<LaunchPriceBanner />`, then remove the two new component files.
- User decision: explicitly requested this isolated integration; final merge to `main` remains pending review.
## 2026-08-26 — Codex-plan worktree preservation before integration review

- Agent/session: Codex delegation from the main-worktree integration request.
- Status: variant; proposed integration only.
- Protected baseline: current `main` at `a1dd59d` plus its uncommitted `next-env.d.ts` and referral migration changes; the untracked `1/` screenshots in `C:\mooaresume-codex` are user files and excluded from every stage/commit operation.
- Change and reason: preserve the pre-main career-assessment, launch-bar, and mobile-header work as isolated feature commits before assessing a selective integration onto latest `main`. No merge, deployment, or remote migration will occur before user approval.
- Files/branch: `feature/codex-plan`; planned commits separated into career assessment and landing/mobile variant.
- Validation: pending after preservation commits.
- Rollback/recovery reference: branch commits created in this worktree; `1/` remains untracked and untouched.
- User decision: pending integration-plan review.
## 2026-08-26 — Career and header-style completion on integration variant

- Agent/session: Codex delegation.
- Status: variant; not merged, deployed, or remotely migrated.
- Protected baseline: latest `main` landing page and its `HeaderAccount` login/account/logout markup.
- Change and reason: cherry-picked the isolated career feature commit. Added only the mobile no-wrap and startup visual CSS files from the protected landing variant; the latest `src/app/page.tsx` body remains authoritative and imports those styles without changing the existing header structure.
- Files/branch: `codex/integrate-launch-price-banner`; additive `src/app/career/**`, career domain/components/docs/migration/Recharts, two header CSS modules, and minimal home imports.
- Validation: pending final local install, lint, typecheck, and build.
- Rollback/recovery reference: `f730972` for career and `9c67404` for the banner; delete only the two style imports/files to withdraw the header styling.
- User decision: final merge to `main` remains pending review.

## 2026-08-26 — Integration validation result

- Agent/session: Codex delegation.
- Status: variant; ready for review, not merged or deployed.
- Validation: career domain tests passed (4 files, 5 tests); full ESLint passed with 0 warnings after removing one unused import; TypeScript passed. `next build` was invoked but a prior local Next build process retained the build lock and did not produce `.next/BUILD_ID`; this is an unresolved local build-environment condition, not a reported source compile error.
- User decision: pending merge review; no remote Supabase migration was applied.

## 2026-08-26 — Launch banner visual refresh

- Agent/session: Codex delegation.
- Status: variant; not merged or deployed.
- Change and reason: refreshed the launch-price banner itself as a compact startup-style promotion: lime gradient surface, dark price CTA chip, compact icon treatment, and mobile-first content reduction. No header markup or account behavior changed.
- Files/branch: `codex/integrate-launch-price-banner`; `src/components/launch-price-banner.module.css`.
- Validation: targeted ESLint passed; diff check passed.
- Rollback/recovery reference: restore the previous CSS file from commit `9c67404`.
- User decision: pending merge review.
## 2026-08-26 — Launch banner contrast refinement

- Agent/session: Codex.
- Status: active local change pending push.
- Change and reason: the first visual refresh was live locally but remained too close to the original lime bar. Increased the visual distinction with a textured lime ribbon, dark launch badge, and stronger CTA contrast; header/account behavior remains unchanged.
- Files/branch: `main`; `src/components/launch-price-banner.module.css`.
- Validation: targeted ESLint passed; `git diff --check` passed.
- Rollback/recovery reference: restore the CSS from `e3785ae`.
- User decision: user requested the launch bar itself to look newer.

## 2026-08-24 — Claude: 추천을 첫 결제로 제한하던 조건 제거

- Agent/session: Claude. 사용자 지적: 1·2번 결제한 사람도 추천코드를 넣고 결제했으면 추천인에게 줘야 하는 것 아닌가. 막아야 할 것은 **한 사람이 추천 보상을 만드는 횟수**이지 첫 결제 여부가 아니다.
- Status: completed. **마이그레이션 하나 추가**(`20260824100000_referral_any_purchase.sql`).

### 지적이 맞습니다 — 두 규칙을 섞어 놨습니다

- 원래 함수는 **이미 결제한 적 있는 계정의 코드 입력을 거절**했습니다. 여기에 서로 다른 두 가지가 섞여 있었습니다.
  - **한 계정은 평생 한 번만 추천받는다** — 이게 진짜 방어선이고, 그건 `referral_attributions.referred_user_id` **기본키**가 이미 강제합니다.
  - **추천받는 사람이 이전에 결제한 적 없어야 한다** — 이건 **아무것도 지키지 못하면서**, 친구가 기존 고객이었다는 이유로 **추천인이 받아야 할 보상을 뺏습니다.**
- 3월에 QUICK을 산 사람이 8월에 친구 권유로 PRO를 사는 것은 **추천 프로그램이 존재하는 바로 그 경우**입니다. 조건을 뺐습니다.

### 빼도 구멍이 생기지 않습니다

- `referred_user_id`가 여전히 기본키이므로 **한 계정은 평생 한 번, 한 사람에게만** 추천받습니다.
- 새로 생기는 경우는 **친구 둘이 서로를 추천하고 각자 실제로 결제하는 것**뿐인데, 그건 판매 두 건입니다.
- 나머지 방어는 그대로입니다: 본인 코드 금지, 0원 주문 거절, `reward_credit_id` unique(웹훅 중복 방지).

### 화면 문구도 맞췄습니다

- `한 사람이 처음 결제할 때 한 번만 인정됩니다` → **`한 사람당 한 번만 인정됩니다. 이전에 결제한 적이 있어도 괜찮습니다.`**
- 테스트가 `첫 결제`라는 표현이 문구에 **없는지** 확인합니다. 함수가 더는 강제하지 않는 규칙을 화면이 약속하면 안 됩니다.
- `REFERRAL_NOT_FIRST_PURCHASE` 안내 문장은 남겨 뒀습니다. 옛 함수가 아직 도는 배포에서 일반 문장으로 흘러가지 않게 하기 위해서입니다.
- Files/branch: `supabase/migrations/20260824100000_referral_any_purchase.sql`(신규), `src/domain/referral.ts`, `src/domain/referral.test.ts`, `src/server/analysis/referral-migration.test.ts` on `main`.
- Validation: `npx vitest run` 650 passed(신규 5건), `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- Rollback/recovery reference: `20260824080000`의 `apply_referral_code`를 다시 실행하면 이전 규칙으로 돌아갑니다. 커밋 이전 상태는 `a1dd59d`.

## 2026-08-24 — Claude: 추천 보상을 친구가 산 등급에 맞춤

- Agent/session: Claude. 사용자 질문에서 나온 결정: 친구가 QUICK을 사도 PRO를 주는지 확인 → 산 것과 같은 등급으로.
- Status: completed. **마이그레이션 하나 추가**(`20260824110000_referral_reward_matches_purchase.sql`).

### 무엇이 문제였나

- 정산 함수가 **상품을 보지 않고** 언제나 `'PRO'`를 발급했습니다. 조건은 `amount > 0`과 `provider = 'POLAR'` 둘뿐이었습니다.
- 그래서 **5,900원짜리 QUICK 결제가 12,900원어치 PRO를 만들어 냈습니다.**
- 현금이 마이너스가 되지는 않습니다 — 이용권의 원가는 정가가 아니라 **API 호출 한 번**입니다. 진짜 문제는 **유인이 반대로 걸린다**는 것입니다: 눈치챈 사람이 친구에게 하는 말이 *"제일 싼 거 사, 나 PRO 받게"*가 됩니다.
- `paid_order.product`를 그대로 씁니다. 화면에 적기도 가장 쉬운 문장입니다: **친구가 결제한 것과 같은 상품의 이용권을 드립니다.**

### 문구

- 헤드라인에서 `PRO`를 뺐습니다(`친구에게 추천하고, 무료 이용권을 받아보세요`). QUICK 추천이 PRO를 주지 않는데 제목이 PRO를 약속하면 안 됩니다.
- 약관에 한 줄 추가했고, 테스트가 **화면에 `PRO 무료 이용권`이라는 표현이 없는지** 확인합니다.
- `/refer` 안내의 `첫 결제` 표현도 `결제`로 고쳤습니다 — 첫 결제 제한은 이미 없앴는데 안내에만 남아 있었습니다.
- Files/branch: `supabase/migrations/20260824110000_referral_reward_matches_purchase.sql`(신규), `src/domain/referral.ts`, `src/domain/referral.test.ts`, `src/server/analysis/referral-migration.test.ts`, `src/components/referral-panel.tsx`, `src/app/refer/page.tsx` on `main`.
- Validation: `npx vitest run` 651 passed(신규 1건 + 문구 검증 2건), `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- Rollback/recovery reference: `20260824090000`의 함수를 다시 실행하면 고정 PRO로 돌아갑니다. 커밋 이전 상태는 `80d3482`.

## 2026-08-24 — Claude: 받은 이용권을 볼 수 있는 곳 (`/refer` 지갑)

- Agent/session: Claude. 사용자 질문: 지급은 됐는데 **어떻게 쓰는지, 몇 장 있는지** 볼 데가 없다.
- Status: completed. 마이그레이션 없음.
- 이용권은 **쓰이는 순간에만** 보였습니다 — 결제 화면이 그 상품의 것을 하나 찾아보고, 없으면 아무 말도 하지 않았습니다. `지급되었습니다`를 듣고도 확인할 곳이 없었습니다.
- `/refer`에 **상품별 보유 수**를 넣었습니다(QUICK·PRO·FINAL 각각). 합쳐서 `이용권 2장`으로 적으면 **숫자가 없느니만 못합니다** — 둘은 서로 바꿔 쓸 수 없기 때문입니다.
- 가장 많이 오해하는 지점을 함께 적었습니다: **QUICK 이용권으로 PRO 분석을 시작할 수 없습니다.** 결제 화면에서 알게 되는 것보다 여기서 아는 편이 낫습니다.
- Files/branch: `src/components/credit-wallet.tsx`·`.module.css`(신규), `src/app/refer/page.tsx` on `main`.
- Validation: `npx vitest run` 651 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.

## 2026-08-24 — Claude: 유료 진행 선택지, 샘플 표기 오류, 검색 노출 보강

- Agent/session: Claude. 사용자 요청 세 가지.
- Status: completed. 마이그레이션 없음.

### QUICK 결제인데 PRO 이용권이 나온 것

- 맞습니다 — `20260824110000_referral_reward_matches_purchase.sql`을 적용하기 **전에** 테스트하셨기 때문입니다. 적용하면 산 등급과 같은 이용권이 나갑니다.

### 이용권이 있어도 결제할 수 있게

- 이용권이 있으면 **선택지가 하나뿐**이었습니다. 다른 지원서에 아껴 두고 싶거나, 무료 실행이 같은 실행인지 못 믿는 사람에게 **길이 없었습니다.**
- 버튼 아래에 `이용권을 아끼고 결제해서 진행할래요` 토글을 뒀습니다. 눈에 띄지 않는 크기로 — 기본은 여전히 이용권 사용입니다.

### 결과 화면이 유료 결과에도 `샘플`이라고 적고 있었습니다

- 준비도 카드가 `지원서 준비도 · 샘플`로 **고정**되어 있었습니다. 화면이 목업이던 시절의 잔재인데, **방금 돈을 낸 사람에게 그 점수가 가짜라고 말하고** 있었습니다. `isSample`일 때만 붙게 고쳤습니다.

### 검색 노출 (문구·디자인은 그대로, 추가만)

- 키워드를 **롱테일 중심으로** 넓혔습니다. `자소서 첨삭` 단독으로 치는 사람은 거의 없고 `무료 자소서 첨삭 사이트`, `자소서 첨삭 추천`처럼 칩니다.
- FAQ 구조화 데이터에 네 개를 더했습니다: **비용 / 무료로 받는 법 / 사람 첨삭과의 차이 / 이력서도 보는지.** 모두 사이트가 이미 화면에서 하고 있는 답입니다.
- `/guide`에 **자기 title·description·canonical**을 줬습니다. 사이트맵에는 있는데 사이트 공통 제목을 물려받아, 크롤러 눈에는 **홈페이지의 사본**으로 보였습니다.
- Files/branch: `src/components/application-case-handoff.tsx`·`.module.css`, `src/components/result-workspace-complete.tsx`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/guide/page.tsx` on `main`.
- Validation: `npx vitest run` 651 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.

## 2026-08-24 — Claude: `/analyze` 목업이 런칭된 사이트의 메인 CTA였습니다

- Agent/session: Claude. 사용자 질문: 결과화면 샘플로 가는 버튼이 런칭 때 없어져야 하는 것인가.
- Status: completed. 마이그레이션 없음. **`/analyze`를 리다이렉트로 교체**했습니다.
- Protected baseline: 원본 마크업을 `docs/removed-analyze-mock.tsx.txt`에 **텍스트로 보존**했습니다(`.tsx`가 아니라 `.txt`라 실수로 빌드·임포트되지 않습니다).

### 무엇이었나

- `/analyze`는 **완전한 껍데기**였습니다. 채용공고 입력칸에는 상태가 아예 없고, 자소서 텍스트는 어디에도 저장되지 않으며, `파일로 올리기`는 아무 동작도 하지 않고, `분석 시작하기`는 **`/result`(id 없음)** 로 갑니다 — 내장 샘플이 그려지는 주소입니다.
- 즉 지원서를 통째로 타이핑한 사람이 **한 글자도 남기지 못하고 남의 현대모비스 샘플을 보게 됩니다.**
- 그리고 이게 구석에 있는 페이지가 아닙니다. **사이트에서 `/analyze`로 가는 링크가 9개**이고 그중 하나가 헤더의 **`무료로 진단하기`** — 런칭된 제품의 가장 큰 행동 유도 버튼입니다.

### 어떻게 했나

- 지우지 않고 **`/onboarding?from=analyze`로 리다이렉트**합니다. 링크 9개가 전부 그대로 살아 있고, 도착하는 곳이 **같은 첫 질문을 진짜로 하는 화면**입니다.
- `/analyze`는 사이트맵에 없어 검색 노출에는 영향이 없습니다.
- Files/branch: `src/app/analyze/page.tsx`, `docs/removed-analyze-mock.tsx.txt`(신규) on `main`.
- Validation: `npx vitest run` 651 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- Rollback/recovery reference: 보존 파일의 내용을 `page.tsx`로 되돌리면 원상복구됩니다.

## 2026-08-24 — Claude: 결제 직전 `샘플 보기`가 샘플이 아니었던 것

- Agent/session: Claude. 사용자 질문: `/analysis/prepare`의 `결제 후 결과 화면 샘플 보기` 버튼을 남기는 게 나은지.
- Status: completed. 마이그레이션 없음.
- **남기는 것이 맞습니다.** 결제 직전에 `내가 받을 게 뭔데?`가 가장 큰 망설임이고, 그것을 보여주는 것은 정직한 설득입니다. 다만 두 가지가 어긋나 있었습니다.
- **`/result`는 샘플이 아닐 수 있습니다.** id가 없으면 그 사람의 **가장 최근 분석**을 가져오는 구조라, 이미 분석해 본 사람이 `샘플 보기`를 누르면 자기 예전 결과가 나왔습니다. 항상 샘플인 `/sample`로 바꿨습니다.
- **같은 탭에서 이동했습니다.** 결제 버튼 바로 아래에서 링크를 따라가면 그대로 결제 이탈입니다. 새 탭으로 열게 했습니다.
- Files/branch: `src/components/analysis-preparation.tsx` on `main`.
- Validation: `npx vitest run` 651 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.

## 2026-08-24 — Claude: 언제나 샘플인 결과 화면 (`/result/sample`)

- Agent/session: Claude. 사용자 제안: 없애기보다 메인 홈에 `첨삭 완성본 샘플 예시 보기` 버튼을 두자. 그리고 샘플도 최신 상태로.
- Status: completed. 마이그레이션 없음.

### 라벨이 참이 되게

- `/result`는 id가 없으면 **그 사람의 가장 최근 분석**을 가져옵니다. 그래서 `샘플`이라고 적힌 링크가 로그인한 사람에게는 **자기 예전 결과**를 보여줬습니다.
- `/result/sample`을 새로 뒀습니다. **id를 받지 않고 아무것도 조회하지 않으므로** 누구에게나 샘플입니다.
- 요약 페이지(`/sample`)가 아니라 **실제 결과 대시보드**를 그립니다. 탭, 문항별 Before → After, 내보내기 버튼까지 그대로 — 결제를 고민하는 사람이 보고 싶은 것은 설명이 아니라 그 화면 자체입니다.

### 두 자리에 걸었습니다

- **메인 홈 CTA 아래** — `무료 진단 시작` 밑에 `첨삭 완성본 샘플 예시 보기`. 결제 전 링크도 여기로 바꿨습니다(새 탭 유지).
- **사이트맵에 추가**(priority 0.8). `AI 자소서 첨삭 결과가 어떻게 나오나요` 같은 검색에 사이트의 어떤 산문보다 잘 답하고, **초안·로그인·결제 없이 열리는 유일한 제품 화면**이라 색인해도 안전합니다. 자체 title·description·canonical도 줬습니다.

### 샘플이 비어 있던 곳

- `consultingAdvice`가 **빈 배열**이라, PRO가 무엇인지 보여주는 바로 그 화면에서 상담 제안 패널이 **비어서** 그려지고 있었습니다.
- 같은 현대모비스 생산관리 지원서에 맞춰 네 개를 채웠습니다(결과 보완 / 지원동기 기업 연결 / 팀 성과와 본인 몫 분리 / 문항 간 경험 중복).
- Files/branch: `src/app/result/sample/page.tsx`(신규), `src/fixtures/result-document.ts`, `src/components/analysis-preparation.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/sitemap.ts` on `main`.
- Validation: `npx vitest run` 651 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린(`/result/sample` 정적 생성).

## 2026-08-24 — Claude: 히어로에 샘플 링크, 모바일 첫 화면 정리

- Agent/session: Claude. 사용자 요청: 샘플 보기를 상단에 크게 / 모바일이 너무 길고 장황하니 `입력칸 + 시작하기`로 단순하게, 제목은 `자소서 첨삭` 크게.
- Status: completed. 마이그레이션 없음.

### 먼저 확인 — 이제 `샘플 보기`는 누구에게나 샘플입니다

- 예전 `/result`가 id 없이 열리면 **그 사람의 최근 분석**을 가져왔습니다. 지금은 `/result/sample`이라 **조회 자체를 하지 않습니다.** 로그인 여부와 무관하게 같은 샘플입니다.
- `이전 기록 보기`는 **별개의 기능**입니다(내 분석 목록). 지금은 없고, 필요하면 따로 만들어야 합니다.

### 히어로

- 샘플 링크를 **입력칸 바로 아래, 신뢰 문구 위**로 올렸습니다. 결정이 나는 자리가 거기입니다.

### 모바일

- 휴대폰에서는 히어로가 **첫 화면 전부**입니다. 그런데 포지셔닝 문장 + 설명 문단 + 220px 입력칸이 겹쳐 **`시작하기` 버튼이 첫 화면 밖으로 밀려나** 있었습니다.
- 제목을 **검색어 그 자체**로 바꿨습니다: `자소서 첨삭 / 자기소개서 첨삭`. 설명 문단은 모바일에서 숨깁니다. 데스크톱 문구는 **한 글자도 바꾸지 않았습니다** — 두 개를 따로 두고 화면 폭으로 고릅니다.
- 입력칸을 220px → 132px로 줄였습니다. 그 결과 `시작하기`와 샘플 링크가 **첫 화면 안**으로 들어옵니다.
- 신뢰 문구 세 개는 모바일에서 세로로 쌓습니다(가로로는 줄바꿈이 지저분했습니다).
- Files/branch: `src/app/page.tsx`, `src/app/globals.css`, `src/components/landing-entry.module.css` on `main`.
- Validation: `npx vitest run` 651 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. 375px에서 제목이 모바일용으로 바뀌고 `시작하기`가 첫 화면 안에 들어오는 것, 1280px에서 기존 제목·문단이 그대로인 것 확인.

## 2026-08-24 — Claude: 샘플을 링크에서 버튼으로

- Agent/session: Claude. 사용자 요청: 모바일에서 `자소서 첨삭` 문구 지우고 예시 버튼 크게, 데스크톱에서도 `무료로 시작하기`와 같은 크기의 버튼으로 색만 다르게.
- Status: completed. 마이그레이션 없음.

### 밑줄 링크 → 버튼

- 샘플은 **두 번째 문**이지 각주가 아닙니다. `무료로 시작하기`와 **같은 폭·같은 높이**(1160×53 vs 1160×54)로 맞추고 **색만** 다르게 했습니다.
- 색은 잉크빛 파랑 `#1f4f8b`. 초록을 하나 더 쓰면 두 버튼이 **하나의 컨트롤을 반으로 자른 것**처럼 보이고, 이 파랑은 제목과 다투지 않을 만큼 어둡습니다.
- 문구도 줄였습니다: `첨삭 완성본 샘플 예시 보기` → `첨삭 예시 보기`. 버튼 안에서는 짧은 쪽이 읽힙니다.

### 모바일 제목: 지우되 없애지는 않음

- 요청대로 화면에서 **보이지 않게** 했지만 **DOM에서는 지우지 않았습니다.** `h1`이 하나도 없는 문서는 검색엔진이 요약할 수 없고, 그 페이지가 노리는 검색어가 `자소서 첨삭`입니다.
- `.visually-hidden`으로 처리해 크롤러와 스크린리더는 읽고 화면 자리는 차지하지 않습니다. 모바일 첫 화면은 이제 **입력칸 + 시작하기 + 첨삭 예시 보기** 셋뿐입니다.
- 375×812에서 두 버튼 모두 첫 화면 안(시작하기 669, 예시 776)입니다.
- Files/branch: `src/app/page.tsx`, `src/app/globals.css` on `main`.
- Validation: `npx vitest run` 651 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. 1280px에서 버튼 폭 일치, 375px에서 제목 높이 1px·가로 넘침 없음 확인.

## 2026-08-24 — Claude: 모바일 첫 화면을 세 덩어리로

- Agent/session: Claude. 사용자 요청: 모바일 제목을 `자기소개서 첨삭`으로 크게, 예시 버튼을 제목 **위**로, 배너의 `입력은 간단하게 ~ 한곳에서 이어집니다` 문단 삭제.
- Status: completed. 마이그레이션 없음.

### 제목: 숨김 → 다시 보이게, 대신 짧게

- 직전 커밋에서 모바일 `h1`을 통째로 숨겼는데, 요청대로 **보이게 되돌리고 문구만 `자기소개서 첨삭`으로 줄였습니다.**
- 나머지 검색어(`자소서 첨삭`, `AI 첨삭`)는 `h1` 안의 숨김 `span`에 실어 보냅니다. 크롤러에게는 세 개 다 보이고, 화면은 한 줄만 씁니다.
- 모바일에서 `AI 취업 지원서 코치` 눈썹 문구는 숨깁니다. 제목이 그 역할을 대신하고, 둘 다 두면 같은 자리를 두 번 씁니다.

### 순서: 예시 버튼이 제목 위로

- `.hero`를 모바일에서만 flex column으로 만들고 `.hero-sample{order:-1}` **한 줄**로 올렸습니다. **마크업은 그대로**라 데스크톱 배치도, 제목의 읽기 순서도 건드리지 않습니다.
- 확신 없이 들어온 사람은 초안을 붙여넣기 **전에** 결과물을 먼저 보고 싶어 합니다.

### 배너 문단

- `한 방에 올리고, 원클릭으로 시작하세요.`가 이미 같은 말을 합니다. 밑의 두 줄은 모바일에서 숨깁니다.
- 이 파일의 기존 700px가 아니라 **760px**에 넣었습니다 — 히어로와 같은 폭에서 같이 바뀌어야 700~760 구간에서 배너만 데스크톱 모양으로 남는 일이 없습니다.
- Files/branch: `src/app/page.tsx`, `src/app/globals.css`, `src/app/one-click.module.css` on `main`.
- Validation: `npx vitest run` 651 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. 375px에서 예시(266~324) → 제목(342~390) → 시작하기(676~730) 모두 첫 화면 안, 가로 넘침 없음. 1280px에서 눈썹·제목·문단·버튼 순서 전부 이전 그대로.

## 2026-08-24 — Claude: 모바일 제목을 `나만의 취업 코치`로

- Agent/session: Claude. 사용자 요청: `자기소개서 첨삭`이 투박하니 주제목 `나만의 취업 코치` + 부제목 `자기소개서 컨설팅 받기`, 크고 굵고 귀엽게.
- Status: completed. 마이그레이션 없음.

### 무엇이 바뀌었나

- 모바일 `h1`이 **이름표에서 말 거는 문장**이 됐습니다: `나만의 취업 코치`. `취업 코치` 두 글자에 초록 그라데이션을 넣어 시선이 **누구를 위한 것인지**에 먼저 닿게 했습니다.
- 부제목 `자기소개서 컨설팅 받기`는 **알약 모양 칩**입니다. 두 번째 제목 줄로 두면 주제목과 크기를 다투는데, 칩은 **지금 할 일**처럼 읽힙니다.
- 42px / weight 900 / 자간 -.05em. 팔 길이에서 한 눈에 읽히는 무게입니다.

### 검색어는 어디로 갔나

- 제목에서 `자소서 첨삭`이 빠졌지만 **문서에서 빠진 건 아닙니다.** 같은 `h1` 안 숨김 span에 `자소서 첨삭 · 자기소개서 첨삭 · AI 첨삭`이 그대로 있습니다. 크롤러는 읽고, 화면은 안 씁니다.
- Files/branch: `src/app/page.tsx`, `src/app/globals.css` on `main`.
- Validation: `npx vitest run` 651 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. 375px에서 예시(266) → 제목(342~443) → 시작하기(729~783) 전부 첫 화면 안, 가로 넘침 없음. 1280px에서 모바일 제목·칩 숨김, 기존 제목/눈썹 그대로.

## 2026-08-24 — Claude: 결과 보고 보상 (합격 인증 → 무료 이용권)

- Agent/session: Claude. 사용자 요청: 후기가 없는 카테고리라 결과 데이터로 신뢰를 만들자 → 합격 인증 시 이용권 지급.
- Status: completed (코드/테스트). **마이그레이션 미적용** — 사용자가 `npm run db:remote:push` 실행 필요.

### 이 기능의 유일한 규칙

- **지급은 "합격"이 아니라 "보고"에 대한 대가입니다.** 탈락 보고도 합격 보고와 **똑같이** 한 장입니다.
- 합격에만 주면 일주일 안에 통과율이 90%가 됩니다. 그건 없는 것보다 나쁩니다 — 그 숫자를 랜딩에 쓰고, 그 신호로 첨삭 규칙을 학습시키게 되니까요.
- 약속 문구는 **버튼 위**에 놓았습니다. `합격이든 불합격이든 똑같이 드립니다.` 누른 **뒤에** 알게 되면 정직에 비용이 붙는다는 걸 배웁니다.

### 막아둔 구멍

- **한 지원 건에 한 장** — `application_outcomes.reward_credit_id uuid unique` + `for update`. 화면이 아니라 DB가 막습니다.
- **분석 안 한 지원 건은 제외** — `analysis_runs.status = 'COMPLETED'` 필요. 없으면 빈 지원 건 만들고 두 번 클릭이 무한 이용권입니다.
- **결과 대기는 제외** — `결과 대기`는 보고가 아니라 나중에 보고하겠다는 약속입니다.
- 본인 확인은 `security definer` 함수 안에서 (`case_owner_id <> current_user_id`).

### 지급 내용

- **QUICK 한 장** (20,000자). 결제 등급을 따라가면 FINAL 구매자가 버튼 한 번에 FINAL을 또 받습니다. 이건 환불이 아니라 **다음 지원서로 돌아올 이유**입니다.
- 로그인 상태에서 누르므로 메일 링크 없이 `AVAILABLE` + `claimed_at`으로 바로 들어갑니다 (추천 보상과 같은 패턴).
- Files/branch: `supabase/migrations/20260824120000_outcome_report_reward.sql`, `src/domain/outcome-reward.ts`(+test), `src/server/analysis/outcome-reward-migration.test.ts`, `src/components/application-tracker-card.tsx`, `src/components/application-tracker-card.module.css` on `main`.
- Validation: `npx vitest run` 667 passed (+16), `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- Rollback: 마이그레이션 미적용 상태이므로 파일 삭제로 되돌릴 수 있습니다. 적용 후에는 `record_application_outcome`을 `20260824070000` 버전으로 `create or replace` 하고 `application_outcomes.reward_credit_id`를 drop 하면 됩니다.

### 배포 전 주의 — 밀린 마이그레이션

- `supabase db push`가 `20260821030000_include_supporting_materials_for_pro.sql`를 순서 밖 미적용으로 보고합니다.
- **`--include-all`을 쓰면 안 됩니다.** 그 파일은 `begin_quick_analysis`를 통째로 재정의하는데, 그 뒤 `20260822020000`(REVISION_REQUEST), `20260824010000`·`20260824030000`(FINAL)이 같은 함수를 더 새로 정의했습니다. 지금 실행하면 옛 정의가 덮어써 FINAL이 자료를 못 받습니다.
- 내용은 이미 최신 정의에 포함돼 있으므로 실행 없이 표시만 합니다: `npx supabase migration repair --status applied 20260821030000` 후 `npm run db:remote:push`.

## 2026-08-24 — Claude: 밀린 마이그레이션 8건을 다시 실행 가능하게

- Agent/session: Claude. 계기: `supabase db push`가 `20260823010000_admin_console.sql`에서 `relation "mail_send_log" already exists`로 중단, 뒤의 13건이 전부 막힘.
- Status: completed (파일 수정). 적용은 사용자가 실행.

### 왜 막혔나

- `mail_send_log`가 **원격에 손으로 먼저 만들어져** 있었습니다. 마이그레이션 기록에는 없으니 push가 다시 만들려 하고, `create table`은 이미 있으면 실패합니다. 한 문장이 실패하면 **그 뒤 전부** 멈춥니다.

### 무엇을 바꿨나 — 스키마는 그대로, 재실행만 가능하게

- `create table` → `create table if not exists`, `create index` → `if not exists`, `add column` → `add column if not exists`.
- `create type`은 `if not exists`가 없어서 `do $$ ... exception when duplicate_object then null; end $$;`로 감쌌습니다.
- 정책과 트리거는 교체가 안 되므로 앞에 `drop policy/trigger if exists`를 붙였습니다.
- `20260824120000`의 제약 교체는 `drop constraint if exists`로 바꿨습니다.
- **정의는 한 글자도 바꾸지 않았습니다.** 새로 만드는 DB에서는 결과가 완전히 같고, 이미 있는 DB에서는 멈추지 않을 뿐입니다.
- Files/branch: `supabase/migrations/20260823010000_admin_console.sql`, `20260824040000_reward_credits.sql`, `20260824050000_research_consent.sql`, `20260824060000_research_snapshots.sql`, `20260824070000_outcome_and_research_axes.sql`, `20260824080000_referrals.sql`, `20260824120000_outcome_report_reward.sql`, `20260826010000_career_assessment_profiles.sql` on `main`.
- Validation: `npx vitest run` 667 passed. 마이그레이션 내용 검증 테스트(추천·결과보상)가 모두 통과하므로 문자열 정의는 보존됐습니다.
- Rollback: `git revert`. 원격에 이미 적용된 뒤라도 정의가 동일해 되돌릴 이유가 없습니다.

### 참고 — 20260821030000

- 사용자가 `migration repair --status applied 20260821030000`로 표시만 했습니다. 그 파일의 `begin_quick_analysis` 정의는 이후 세 번 갱신돼 이미 최신 정의에 포함돼 있습니다.

## 2026-08-24 — Claude: 관리자 콘솔 시각 정리

- Agent/session: Claude. 사용자 요청: `/meensoo/research` 화면이 투박하니 요즘 스타일로.
- Status: completed. 마이그레이션 없음. **클래스 이름·구조·문구는 그대로**, 시각 속성만 바꿨습니다(공용 파일이라 다른 관리자 화면도 같이 좋아집니다).

### 왜 투박해 보였나

가장 큰 원인은 색이 아니라 **빈 화면 세 개**였습니다. 100px짜리 회색 공백이 세로로 쌓이면 "대기 중"이 아니라 **고장 난 화면**으로 읽힙니다.

- 데이터가 0건이면 표 세 개 대신 **`수집 대기` 블록 하나**를 보여줍니다. 무엇이 들어오는지(동의 → 비식별 → 결과) 3단계로 적고, 왜 5건부터 보여주는지도 함께 씁니다. **빈 콘솔도 뭔가는 알려줘야 합니다.**

### 나머지

- 숫자 카드: 평면 채움 → 미세 그라데이션 + 안쪽 하이라이트, 라벨 위 짧은 강조선, 30px `tabular-nums`. 단위(`건`, `%`)는 작고 흐리게 — 같은 크기로 두면 `0건`이 두 자리 수처럼 읽힙니다.
- 패널: 반경 14px, 헤더를 본문보다 살짝 밝게 해서 굵은 구분선 없이 헤더로 읽히게.
- 표: 헤더 대문자 소문자간격, 셀 `tabular-nums`.
- 설명 문단: 인라인 `style`과 `<br/><br/>` 대신 `.prose` — 최대 폭 860px, 문단 사이 얇은 구분선.
- 대기 표시 점은 `prefers-reduced-motion`에서 멈춥니다.
- Files/branch: `src/app/meensoo/admin.module.css`, `src/app/meensoo/research/page.tsx` on `main`.
- Validation: `npx vitest run` 667 passed, `npx tsc --noEmit` clean, `npx eslint src/app/meensoo` 0건, `npx next build` 클린.

### 확인된 사실 — 배지는 그대로 둡니다

- 보관 사본 **0건**. 연구 관련 마이그레이션이 방금까지 원격에 적용돼 있지 않았으므로 당연한 결과입니다. `db push` 후 동의 상태로 분석을 한 번 돌려 1건 이상을 확인하기 전에는 랜딩 배지를 `운영 중`으로 바꾸지 않습니다.

## 2026-08-24 — Claude: 모바일에서 예시 버튼의 무게를 낮춤

- Agent/session: Claude. 계기: 사용자 스크린샷. 모바일 첫 화면에서 **남색 예시 버튼이 초록 시작 버튼보다 세 보임**.
- Status: completed. 마이그레이션 없음.

### 위로 올렸더니 생긴 문제

- 데스크톱에서는 예시 버튼이 시작 버튼 **아래**에 있어 같은 무게로 둬도 순서가 위계를 만듭니다.
- 모바일에서는 **위**로 올라갔습니다. 꽉 찬 남색이 먼저 오고 초록이 나중에 오면 **"파란 게 버튼이고 초록이 대안"**으로 읽힙니다 — 정확히 반대입니다.
- 그래서 **모바일에서만** 옅은 남색 배경(`#eef3fa`) + 남색 글씨로 낮췄습니다. 테두리만 남기지 않고 옅게 채운 건, 빈 버튼은 누를 수 있어 보이지 않기 때문입니다. **데스크톱은 꽉 찬 남색 그대로입니다.**

### 초록 배경이 잘리던 선

- `.hero-aura`는 `overflow:hidden`인 620px 상자입니다. 모바일에서는 그 아래 모서리가 화면 한가운데에 걸려 **초록 번짐이 가로선으로 뚝 끊겨** 보였습니다(스크린샷의 입력칸 위 경계).
- 높이를 520px로 줄이고 아래쪽에 마스크 그라데이션을 넣어 **끊기지 않고 사라지게** 했습니다. 데스크톱은 그대로(620px, 마스크 없음).
- Files/branch: `src/app/globals.css` on `main`.
- Validation: `npx vitest run` 667 passed, `npx tsc --noEmit` clean, `npx eslint src/app` 0건, `npx next build` 클린. 375px에서 예시 `#eef3fa`/남색 글씨, 시작 `#176b4a`/흰 글씨, 마스크 적용 확인. 1280px에서 예시 꽉 찬 남색·흰 글씨, 마스크 `none` 확인.

## 2026-08-24 — Claude: 예시 버튼을 하늘색 채움으로

- Agent/session: Claude. 사용자 피드백: 옅게 뺀 버전은 별로, 파랑이 맞고 하늘색으로 톤 맞출 것.
- Status: completed. 마이그레이션 없음.

- 남색 `#1f4f8b` → 하늘색 `#1e7bb8`, 모바일·데스크톱 **둘 다 꽉 찬 채움**으로 통일했습니다.
- 직전 커밋의 옅은 배경(`#eef3fa`)은 되돌렸습니다. **화면 위쪽의 물 빠진 버튼은 비활성처럼 보입니다.**
- 위계는 색을 빼서가 아니라 **브랜드 초록보다 밝다**는 것으로 만듭니다. 밝은 파랑이 먼저 오고 짙은 초록이 뒤에 오면 초록이 여전히 무겁게 읽힙니다.
- 흰 글씨 대비 4.6:1로 본문 기준을 넘깁니다(직전 남색은 대비는 높았지만 초록보다 어두워 위계가 뒤집혔습니다).
- Files/branch: `src/app/globals.css` on `main`.
- Validation: `npx vitest run` 667 passed, `npx tsc --noEmit` clean, `npx next build` 클린. 375px에서 `rgb(30,123,184)`/흰 글씨, 예시(266~322)·시작(727~781) 모두 첫 화면 안, 가로 넘침 없음.

## 2026-08-24 — Claude: FINAL 입구가 플래그를 읽게

- Agent/session: Claude. 계기: 사용자가 로컬에서 FINAL을 테스트하려는데 온보딩 FINAL 카드가 `COMING SOON`으로 비활성.
- Status: completed. 마이그레이션 없음.

### 원인 — 플래그가 절반만 걸려 있었습니다

- `NEXT_PUBLIC_ENABLE_FINAL=1`은 `.env.local`에 이미 있었고, `/final/build|polish|create` 라우트는 그 플래그를 읽습니다.
- 그런데 **온보딩 카드는 `<div className={styles.disabled}>`로 하드코딩**돼 있었습니다. 라우트는 열려 있는데 **들어갈 문이 없어서**, 플래그가 존재하는 유일한 이유인 로컬 전 구간 테스트가 불가능했습니다.
- 가격표(`pricing-comparison.tsx`)도 `pending: true` 하드코딩이었습니다.

### 고친 것

- 온보딩 카드: `isFinalEnabled()`가 참이면 작성 모드에 맞춰 `/final/build|polish|create`로 가는 링크, 거짓이면 **기존 `COMING SOON` 블록을 그대로** 유지합니다(문구·마크업 보존).
- 가격표: `pending: !isFinalEnabled()`, CTA도 함께. **표는 준비 중이라는데 입구는 열려 있는 불일치**는 손님이 먼저 발견합니다.
- 라이브 사이트는 플래그가 없으므로 **보이는 것이 전과 완전히 같습니다.**
- Files/branch: `src/app/onboarding/page.tsx`, `src/components/pricing-comparison.tsx`, `src/domain/final-availability.entry.test.ts` on `main`.
- Validation: `npx vitest run` 670 passed (+3), `npx tsc --noEmit` clean, `npx eslint` 0건, `npx next build` 클린. 로컬에서 온보딩 FINAL 카드가 `/final/build` 링크로 바뀌고 `COMING SOON` 블록 0개, `/final/build`가 404 아닌 실제 화면으로 열리는 것 확인.

## 2026-08-24 — Claude: FINAL 결제 경로 전 구간 개통

- Agent/session: Claude. 계기: 로컬에서 FINAL 시작 시 `저장할 입력 내용을 다시 확인해 주세요.` — 사용자가 Polar FINAL 상품 id를 넣어도 동일.
- Status: completed. 마이그레이션 없음.

### 원인 — Polar가 아니었습니다

`src/application/application-case-handoff.ts`의 `product: z.enum(["QUICK", "PRO"])`. **FINAL이 목록에 없어서** Zod가 거부했고, `/api/application-cases`가 그 문구로 400을 냈습니다. 결제까지 가지도 못한 겁니다.

**PRO만 좁게 본 여섯 번째 사례**입니다(앞선 다섯 건은 `questions.ts`, `begin_quick_analysis`, 결과 탭 필터, 분석 준비 안내, 크론 재개 경로).

### 같이 열어둔 나머지 — 하나만 고치면 다음 화면에서 또 막힙니다

- `usage-entitlement.ts`: `productTierSchema`에 FINAL 추가, `createFinalCheckoutQuote` 신설. **분량은 PRO와 같은 30,000자, 가격만 19,900원.** 분량을 줄이면 진행 중에 업그레이드한 사람이 갑자기 기존보다 적게 들어가게 됩니다.
- `quick-checkout-service.ts`, `checkouts/quick/status/route.ts`, `quick-checkout-return.tsx`: 상품 enum 확장.
- `validator.ts`: 근거로 인정하는 문서 범위를 FINAL도 PRO와 동일하게.
- `result-workspace-complete.tsx`: 재첨삭 옵션 타입 확장.

### Polar FINAL 상품 id

- `POLAR_FINAL_PRODUCT_ID`는 **선택**입니다. 필수로 만들면 FINAL 상품이 없는 라이브 사이트에서 **QUICK·PRO 결제까지 같이 죽습니다.**
- 비어 있는 상태로 FINAL 결제를 시도하면 `POLAR_FINAL_PRODUCT_ID가 필요합니다.`로 **이름을 대고** 실패합니다. 빈 id를 그대로 보내면 Polar가 다른 설정 실수와 구분되지 않는 422를 돌려줍니다.
- 웹훅·정산의 `expectedProductIds`에도 FINAL을 넣어 결제 후 이용권 지급이 이어지게 했습니다.
- `.env.example`에 항목과 설명을 추가했습니다.
- Files/branch: `src/application/application-case-handoff.ts`, `src/domain/usage-entitlement.ts`, `src/server/billing/polar-checkout.ts`, `src/server/billing/polar-checkout-reconciliation.ts`, `src/app/api/webhooks/polar/route.ts`, `src/app/api/checkouts/quick/status/route.ts`, `src/server/billing/quick-checkout-service.ts`, `src/components/quick-checkout-return.tsx`, `src/components/result-workspace-complete.tsx`, `src/server/ai/quick/validator.ts`, 관련 테스트 픽스처 3건, `.env.example`, `src/domain/final-availability.entry.test.ts` on `main`.
- Validation: `npx vitest run` 673 passed (+3), `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.
- 보존: `result-workspace-{v2,claude-restored,codex-restored}.tsx`의 `=== "PRO"` 필터는 **의도적으로 그대로 뒀습니다.** 보관용 변형이라 현재 흐름에 쓰이지 않습니다.

## 2026-08-24 — Claude: Google Ads 태그 설치 (AW-18415179469)

- Agent/session: Claude. 사용자가 Google Ads 전환 측정 태그 스니펫을 전달.
- Status: completed. 마이그레이션 없음.

- `src/app/layout.tsx`에 `next/script`로 추가했습니다. **네이버·Clarity 태그와 같은 방식**(`afterInteractive`)입니다.
- Google 안내는 `<head>` 바로 다음을 요구하지만 `</body>` 끝에 넣었습니다. **전환 측정은 태그가 실행되기만 하면 되지 먼저 실행될 필요는 없고**, 서드파티 라이브러리를 첫 렌더 경로에서 빼는 편이 낫습니다. 기존 두 태그도 같은 자리입니다.
- `window.gtag = gtag;`를 한 줄 더했습니다. Google 스니펫의 `function gtag(){}`는 클래식 스크립트라서 전역이 되는 것뿐이라, 컴포넌트에서 전환 이벤트를 부를 때 확실히 찾히도록 명시했습니다.
- 로컬 확인: `typeof window.gtag === "function"`, `dataLayer` 4건, `gtag/js?id=AW-...` 스크립트 태그 존재.
- **아직 안 한 것:** 전환 이벤트(`gtag('event','conversion',...)`) 연결. 지금은 페이지뷰·리마케팅만 잡힙니다. 결제 완료 지점에 붙이려면 Google Ads에서 전환 라벨을 발급받아야 합니다.
- **EEA 동의 모드**는 넣지 않았습니다. 현재 대상이 국내이고, 동의 모드는 동의 배너와 함께 설계해야 의미가 있습니다.
- Files/branch: `src/app/layout.tsx` on `main`.
- Validation: `npx vitest run` 673 passed, `npx tsc --noEmit` clean, `npx eslint src/app/layout.tsx` 0건, `npx next build` 클린.

## 2026-08-29 — Claude: PRO 입력 화면 모바일 가독성 + 간편 입력 스위치 설계 메모

- Agent/session: Claude. 사용자 요청: (1) PRO 화면이 모바일에서 안 보임, (2) 간편/상세 입력 스위치 구상을 MD로 저장하고 할 일에 추가.
- Status: (1) completed, (2) 문서만 작성 — **구현 미착수.** 마이그레이션 없음.

### (1) PRO 화면 모바일

- 원인은 레이아웃이 아니라 **글자 크기**였습니다. `pro-input-page.module.css`가 900px 데스크톱 칼럼 기준이라 **8~11px**이 전면에 깔려 있습니다. 모니터에서 작게 보이는 크기가 팔 길이에서는 안 읽힙니다.
- 더 큰 문제: **입력칸이 9~12px**이었습니다. **iOS Safari는 16px 미만 컨트롤에 포커스가 가면 페이지를 확대하고 되돌리지 않습니다.** 필드를 한 번 누를 때마다 화면이 확대돼 오른쪽이 잘린 채 고정됩니다. 이게 "안 보인다"의 실체로 보입니다.
- 640px 이하 미디어 쿼리를 **파일 끝에 덧붙였습니다.** 기존 규칙은 한 줄도 고치지 않았고 크기·여백만 올립니다. **모든 입력칸은 16px** — 취향이 아니라 확대를 막기 위한 값입니다.
- 데스크톱은 완전히 그대로입니다.
- Files/branch: `src/components/pro-input-page.module.css` on `main`.
- Validation: `npx vitest run` 673 passed, `npx eslint .` 0건, `npx next build` 클린. **화면 확인은 못 했습니다** — dev 서버가 내려가 있어 `localhost:3001`이 응답하지 않았습니다. 사용자 확인 필요.

### (2) 간편 입력 스위치

- `docs/simple-input-switch-plan.md` 신규. 사용자 대화 원문을 그대로 붙이지 않고 **중복을 걷어내 설계 메모로 정리**했습니다.
- 핵심: 입력은 큰 박스 하나, 분류는 무아가. 스위치는 `간편 ● ── ○ 상세`, 기본값 간편. **들어오는 데이터는 양쪽 동일**하고 분류 주체만 다릅니다.
- 비용 방어를 문서의 절반으로 뒀습니다. **개수 제한만으로는 부족합니다** — 자소서를 PDF 하나로 합쳐 올리는 사람을 막으면 안 되므로 파일 수가 아니라 실제 내용량(페이지·글자 수)을 봐야 합니다.
- 결제 전에는 **외부 API 비용 0원인 검사만**(파일명·크기·ZIP 목록·중복 hash·페이지 수·텍스트 추출), OCR과 HWP 변환은 결제 후.
- HWP는 OpenAI API 공식 지원 목록에 없으므로 Upstage 라우팅. 모든 파일에 비싼 Parse를 쓰지 않도록 확장자별 분기를 적어 뒀습니다.
- `알집` 표기는 `.alz`/`.egg`를 실제로 처리하기 전까지 쓰지 않습니다.
- 구현 순서 6단계와 미결정 3건을 문서 끝에 정리했습니다. **1순위는 서버 한도 + Pre-check** — 없으면 나머지는 비용 사고입니다.

## 2026-08-29 — Claude: 포지셔닝·차별화 판단 메모

- Agent/session: Claude. 사용자가 "차별화 없으려나" 걱정과 함께 ChatGPT 토론 원문 재전달(앞부분 추가분 포함).
- Status: 문서만. **구현 미착수.** 마이그레이션 없음.

- `docs/positioning-and-differentiation.md` 신규. 입력 화면 쪽은 `simple-input-switch-plan.md`에 이미 있으므로 **파일 한도·HWP·Upstage는 그쪽에만 두고 중복하지 않았습니다.**
- 담은 것: 공고 분석은 차별점이 아니라는 진단(ChatGPT/사람인/커리어마이징) / 판단 기준 두 줄 / 한 문장 재정의 후보 / 밀어야 할 넷(15초 심사, 감점요소 제거 철학, 제출 준비도, X-Ray 요구↔증거) / FINAL 서류→면접 연결 / 경험은행 / 시장 근거 / 다음 순서 6단계.
- **제가 덧붙인 것 — 원문에 없던 긴장 3가지**를 문서 끝에 적었습니다. 그대로 밀면 나중에 부딪힙니다.
  1. **한 번 결제와 경험은행은 서로 당깁니다.** 락인은 재방문에서만 값을 하는데 1회 결제는 사람을 떠나보냅니다. 결과 보고 보상이 이미 그 역할을 노리고 있습니다.
  2. **경험은행 콜드 스타트.** 첫 사용자에게는 값이 0입니다. 1회차부터 이득이 나려면 첫 분석에서 경험을 **자동 추출**해 넣어야 합니다. 폼을 채우게 하면 안 됩니다.
  3. **넷 중 기술적으로 방어되는 것은 없습니다.** 복제되지 않는 유일한 자산은 **결과 데이터**이고, 수집 구조는 이미 있습니다.
- 순서 1순위는 **제출 준비도 화면**입니다. `readiness`가 이미 있어 가장 적은 작업으로 인상이 가장 크게 바뀝니다. 문구·포지셔닝 교체는 **하나라도 실물이 선 뒤**에 — 없는 것을 말로 먼저 약속하지 않습니다.

## 2026-08-29 — Claude: 한 문항짜리 자소서가 막다른 길이던 문제

- Agent/session: Claude. 사용자 보고: PRO·FINAL에서 자소서에 `11`만 쳐도 진행이 안 되고, `문항 구분 확인하기`를 눌러도 계속 같은 안내가 나옴.
- Status: completed. 마이그레이션 없음.

### 무엇이 잘못됐나

- `pro-input-page.tsx`가 `splitCoverLetterDraft(bulkAnswer).length <= 1`이면 제출을 **막았습니다.**
- 그런데 `문항 구분 확인하기`를 눌러도 그 함수는 **똑같이 1개를 돌려줍니다.** 즉 **누르면 풀린다고 안내하면서 절대 풀리지 않는 버튼**이었습니다.
- `11`만의 문제가 아닙니다. **자유기술 1문항짜리 자기소개서는 실제로 존재하고, 그런 지원자는 결제 화면에 영영 도달할 수 없었습니다.**

### 고친 방식

- 안내는 **그대로 둡니다.** 벽이 아니게만 바꿨습니다.
- `ResumeIntake`가 `onSplitConfirmed`로 **"사용자가 구분 결과를 실제로 봤다"**를 페이지에 알립니다. 확인을 눌렀고 결과가 정말 1문항이면 그건 답이지 미완료가 아닙니다.
- 확인 후 문구가 바뀝니다: `한 문항으로 진행합니다. … 여러 문항을 붙여넣으셨다면 문항 사이에 1. 지원 동기처럼 번호와 제목을 넣어 주세요.`
- 본문을 다시 고치면 확인이 **풀립니다.** 안 그러면 1문항으로 확인해 둔 상태가, 그 뒤 4문항을 통짜로 붙여넣은 글까지 보증하게 됩니다.
- 파일 업로드로 들어온 경우도 확인된 것으로 봅니다(구분 결과 화면이 바로 열립니다).
- Files/branch: `src/components/pro-input-page.tsx`, `src/components/resume-intake.tsx`, 신규 `src/components/pro-input-split-gate.test.ts` on `main`.
- Validation: `npx vitest run` 677 passed (+4), `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.

### 확인한 사실 — Google Ads

- 프로덕션에 `AW-18415179469` 태그가 **실제로 실려 있습니다**(`curl https://mooaresume.com`로 확인). `태그를 찾을 수 없음` 메일은 배포 이전에 발송된 것입니다.
- `404 도착 페이지`는 PRO 화면 문제가 아닙니다. `/`, `/pro/polish`, `/onboarding`, `/quick`, `/guide`, `/new`는 전부 **200**입니다.
- 없는 주소로 확인된 것: `/final`, `/pricing`, `/price`, `/about`, `/contact`, `/faq`, `/login`, `/signup`, `/pro`, `/final/build`(플래그 off라 정상), `/home`, `/index.html`. 광고 최종 URL이 이 중 하나일 가능성이 큽니다.

## 2026-08-29 — Claude: 간편/상세 입력 스위치 (1차)

- Agent/session: Claude. 사용자 요청: 비교해보려면 스위치부터 만드는 게 맞겠다. 설계는 `docs/simple-input-switch-plan.md`.
- Status: completed (UI + 분류 + 매핑). **파일 한도·Pre-check·HWP는 아직입니다.**  마이그레이션 없음.

### 만든 것

- **`src/domain/document-classify.ts`** — 파일명 먼저, 그다음 본문 첫 1,500자. **모델을 부르지 않습니다.** 분류는 결제 전에 돌기 때문에, 여기서 유료 호출을 하면 결제하지 않을 사람에게 돈을 씁니다.
  - 힌트 순서가 중요합니다. `경력기술서`에는 `경력`이, `자기소개서`는 `자소서`로 줄어들어, 느슨한 규칙을 앞에 두면 둘 다 삼킵니다.
  - 파일명이 `문서1.pdf`처럼 쓸모없으면 `자격 요건`·`지원 동기`·`경력 사항` 같은 제목 패턴으로 판단합니다.
  - 붙여넣은 글(파일명 없음)은 자기소개서로 봅니다. 기타로 두면 정작 중요한 문서를 놓칩니다.
- **`src/components/simple-intake.tsx`** — 큰 박스 하나 + 파일 추가(다중, ZIP 포함) + **분류 결과 목록**. 행마다 종류를 바꿀 수 있습니다. **고칠 수 없는 추측은 추측 안 하느니만 못합니다** — 이 확인 단계가 채팅창과 제품을 가르는 부분입니다.
- **`src/domain/simple-intake-mapping.ts`** — 간편 입력을 **기존 저장 형태 그대로** 변환합니다. 결제·분석·서버는 지금과 똑같은 걸 받습니다. 파이프라인을 둘로 만들면 FINAL을 빠뜨릴 곳도 둘이 됩니다.
  - 붙여넣은 글이 첨부된 자소서 파일보다 **우선**합니다. 둘 다 넣은 사람은 붙여넣은 쪽을 뜻합니다.
  - 첨부 상한(목록당 10개, 5만 자)을 여기서 지키고 **잘린 파일 이름을 돌려줍니다.** 저장 시점에 던지면 화면을 다 채운 뒤라 손쓸 수 없습니다.
- **스위치** — `간편 · 상세`, **기본값 간편**. 두 화면은 **둘 다 mount 상태로 둡니다.** 오가는 것은 비교지 초기화가 아니라서, 넘어갈 때 입력이 사라지면 아무도 두 번 누르지 않습니다. 갈라지는 것은 **저장되는 payload뿐**입니다.
- 진행 불가 사유도 이름을 댑니다: `자기소개서 내용을 붙여넣거나…` / `채용공고를 함께 넣어 주세요…`. 박스가 하나라 `필수 항목을 확인하세요`로는 무엇이 모자란지 알 수 없습니다.
- Files/branch: 신규 `src/domain/document-classify.ts`(+test), `src/domain/simple-intake-mapping.ts`(+test), `src/components/simple-intake.tsx`, `.module.css`; 수정 `src/components/pro-input-page.tsx`, `.module.css` on `main`.
- Validation: `npx vitest run` 691 passed (+14), `npx tsc --noEmit` clean, `npx eslint` 0건, `npx next build` 클린. **화면 확인 미완** — dev 서버가 내려가 있습니다.
- 보존: 상세 입력은 **한 줄도 지우지 않았습니다.** 기존 `/pro/*` 화면 전체가 그대로 상세 모드로 남습니다.

## 2026-08-29 — Claude: Google 태그를 head로 이동

- 사용자 문의: Google 안내대로 `</head>` 앞에 넣어야 하는 것 아닌가.
- `afterInteractive` → `beforeInteractive`. 태그는 **어느 쪽이든 서빙되는 HTML에 들어 있었고**(`curl`로 확인) 그래서 동작에는 문제가 없었지만, 배치 때문에 광고 계정이 제한되면 **실제 돈**이 나갑니다. 스크립트가 `async`라 확실히 해두는 비용은 거의 0입니다.
- 네이버·Clarity 태그는 그대로 둡니다. 그쪽은 검사하는 곳이 없습니다.
- Files: `src/app/layout.tsx`.

## 2026-08-29 — Claude: 결과 메일 링크가 결제 화면으로 보내던 문제

- Agent/session: Claude. 사용자 보고: 결과 메일 링크 → `로그인하러 가기` → 결제 전 화면 → 로그인해도 시작 버튼이 회색으로 멈춤.
- Status: completed. 마이그레이션 없음.

### 원인

- `/result?analysisRunId=…`에 비로그인으로 들어오면 `<Link href="/analysis/prepare">로그인하러 가기</Link>`를 보여줬습니다. **거기는 로그인 화면이 아니라 결제 전 화면**입니다.
- 메일 앱이 여는 브라우저에는 그 탭의 `sessionStorage`가 없으므로 초안이 비어 있고, 그래서 결제 버튼이 회색입니다.
- 게다가 이동하면서 **`analysisRunId`가 사라져** 원래 보려던 결과로 돌아갈 길도 없습니다.

### 고침

- `ResultSignIn` 신설. Google 로그인 후 **`/result?analysisRunId=…` 바로 그 주소로** 돌아옵니다(`auth/callback?next=`).
- 결과가 안 보이는 경우 문구도 고쳤습니다. 진행 중일 수도 있지만, **결제한 계정과 다른 구글 계정으로 로그인한 경우**가 실제로 더 흔합니다. 둘 다 말하고 `다시 확인하기`를 같은 주소로 겁니다.
- Files: 신규 `src/components/result-sign-in.tsx`, `.module.css`; 수정 `src/app/result/page.tsx`.

## 2026-08-29 — Claude: 간편 입력 2차 (좌우 스위치·드래그·한도·말풍선)

- 사용자 피드백 5건 반영.
- **좌우 스위치** — 버튼 두 개 → 트랙 위를 미끄러지는 knob. 버튼 두 개는 *어느 쪽이 켜져 있나*를 읽게 만들고, knob은 그냥 보입니다. `role="switch"`, 모션 감소 설정 존중.
- **드래그 앤 드롭** — 박스 전체가 드롭 영역입니다. 끌어오는 동안 덮개가 뜹니다. **어디에 놓을지 모르는 드래그는 거절당한 것처럼 보입니다.**
- **한도 (`src/domain/upload-limits.ts`)** — 최대 **20개 · 총 50MB**를 보여주고, 한 파일 **10MB**는 숨깁니다. 그건 우리가 고른 값이 아니라 `extractLocalDocument`가 그보다 크면 읽지 못하기 때문입니다. 더 크게 약속하면 던지는 읽기를 약속하는 셈입니다.
  - **일괄 거절하지 않습니다.** 25개를 끌어다 놓으면 20개를 받고 못 받은 5개의 **이름과 이유**를 말합니다.
  - 파일 **개수만 세는 건 방어가 안 됩니다.** 자소서를 80쪽 PDF 하나로 합치는 건 정당한 사용이라 막으면 안 되고, 진짜 상한은 **쪽수·글자 수**입니다. 그건 Pre-check 단계 몫이라 아직입니다.
- **말풍선** — 형식·개수·용량·ZIP 처리 방식을 `?` 툴팁에 넣었습니다. 본문에 다 적으면 입력 박스가 **경고문**처럼 읽힙니다. 모바일에서는 왼쪽 기준으로 붙여 화면 밖으로 나가지 않게 했습니다.
- **디자인** — QUICK의 담백한 입력과 구분되도록 이중 방사형 그라데이션 + `한 번에 넣기` 배지 + 그림자. 이 화면은 **폼처럼 보이면 안 됩니다.**
- Files: 신규 `src/domain/upload-limits.ts`(+test); 수정 `src/components/simple-intake.tsx`, `.module.css`, `src/components/pro-input-page.tsx`, `.module.css`.
- Validation: `npx vitest run` 698 passed (+7), `npx tsc --noEmit` clean, `npx eslint` 0건, `npx next build` 클린.

## 2026-08-29 — Claude: 간편 입력 3차 (거절 누적·글자 수)

- Agent/session: Claude. 사용자 피드백 2건.
- Status: completed. 마이그레이션 없음.

### 못 넣은 파일이 쌓입니다

- 전에는 새로 넣을 때마다 안내가 **교체**됐습니다. 1번 파일이 거절된 뒤 2번을 넣어 2번도 거절되면 **1번은 해결된 것처럼** 보였습니다.
- 이제 목록에 **더해집니다.** 같은 파일·같은 사유는 한 번만 셉니다. `지우기`로 비웁니다.

### 글자 수

- **필수로 하지 않았습니다.** 글자 수 제한이 없는 공고도 많고, 필수로 만들면 그 사람들이 막힙니다.
- 박스 아래 **선택 입력 한 칸**. 한 번 적으면 **글자 수를 밝히지 않은 모든 문항**에 채워집니다. 대부분의 지원서는 문항마다 다르지 않고 하나입니다.
- **문항마다 다른 경우**: 제목 뒤에 `(800자)`처럼 적으면 **그 문항은 적힌 값을 씁니다.** 한 칸에 적은 숫자가 회사가 실제로 문항 옆에 인쇄한 값을 덮어쓰면 안 됩니다.
- 이걸 되게 하려고 `readTargetLengthMarker`를 넓혔습니다. 전에는 우리가 쓰는 `[500자]`만 읽었는데, 한국 공고는 `(500자)`·`500자 이내`·`[500자]`를 비슷한 빈도로 씁니다. **제목에 버젓이 적힌 제한이 안 적힌 것으로 취급되고 있었습니다.** 쓰는 형식은 그대로입니다.
- 100 미만은 무시합니다. 저장 스키마가 거절하는 값이라, `50` 오타가 두 화면 뒤에서 터지면 안 됩니다.
- Files: `src/domain/cover-letter-question.ts`(+test), `src/domain/simple-intake-mapping.ts`(+test), `src/components/simple-intake.tsx`, `.module.css`, `src/components/pro-input-page.tsx`.
- Validation: `npx vitest run` 704 passed (+6), `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.

## 2026-08-29 — Claude: 모바일 밀도, 결과 막다른 길, 글자 수 안전장치

- Agent/session: Claude. 사용자 피드백 4건.
- Status: completed. 마이그레이션 없음.

### 1. 글자 수 안전장치 — 이게 제일 중요합니다

- 지금까지 글자 수를 안 적으면 목표 길이가 **초안 자체의 길이**로 떨어졌습니다. 8,000자를 붙여넣으면 **8,000자가 목표**가 되고, PRO BUILD는 그 8,000자를 **채우려고** 합니다. 그대로 두면 요금이 터집니다.
- 이제 **기본 700자가 미리 채워져 있습니다.** 한국 자소서 문항은 500~1,000자이고, 700이면 틀려도 **다듬는 정도로 끝나지 없는 내용 1,000자를 지어내지 않습니다.**
- 그리고 **글자 수 없이는 진행이 막힙니다.** 미리 채워져 있으므로 이 문구를 보는 건 **일부러 지운 경우**뿐입니다.
- 자소서 문항에 `(500자)`가 적혀 있으면 **그걸 먼저 씁니다.** 사장님 말씀대로 보통 자소서에 이미 적혀 있습니다.
- 어떤 기준이 적용되는지 화면에 되돌려 보여줍니다: `모든 문항 700자 기준으로 봅니다.` / `문항별로 500 · 700자 기준으로 봅니다.`

### 2. 결과가 안 보일 때 — 돈 낸 사람에게 막다른 길을 주면 안 됩니다

- 설명만 있고 **할 수 있는 게 없었습니다.** 이제 세 가지를 줍니다:
  - **다른 계정으로 로그인하기** — 실제로 가장 흔한 원인입니다. `prompt=select_account`로 구글 계정 선택창을 강제하고, 먼저 로그아웃합니다. 안 그러면 구글이 같은 세션을 그대로 돌려줘서 **버튼이 아무것도 안 하는 것처럼** 보입니다.
  - **다시 확인하기**
  - **`support@mooaresume.com`로 결제하신 메일 주소를 알려주세요.** 마지막 줄은 사과가 아니라 사람이어야 합니다.

### 3. 모바일 밀도

- 온보딩 유형 선택: 세로 3줄 → **가로 3칸.** 카드 하나가 한 화면이면 결정 하나가 스크롤 세 번이 됩니다. 긴 제목과 설명은 숨기고 **짧은 라벨**(`처음부터 작성`/`내용 보완`/`완성본 검수`)만 남깁니다 — 어차피 사람들이 그걸로 고릅니다.
- QUICK·PRO·FINAL 카드도 **가로 3칸**, 설명 숨김.
- PRO `이 유형 진행 순서` 4칸: 세로 1줄 → **2×2.** 순서를 한눈에 보라고 있는 건데 네 번 스크롤하면 의미가 없습니다.

### 4. 메인 모바일에 PC 권장

- `자기소개서 컨설팅 받기` 아래 작게 `(자료를 올리고 결과를 보기에는 PC를 추천합니다)`.
- **`h1` 바깥**에 뒀습니다. 어느 기기를 쓰라는 참고 문구가 크롤러에게 이 페이지를 설명하는 한 줄에 들어가면 안 됩니다.
- Files: `src/domain/simple-intake-mapping.ts`(+test), `src/components/simple-intake.tsx`, `.module.css`, `src/components/pro-input-page.tsx`, `.module.css`, `src/components/result-sign-in.tsx`, `.module.css`, `src/app/result/page.tsx`, `src/app/onboarding/onboarding.module.css`, `src/app/page.tsx`, `src/app/globals.css`.
- Validation: `npx vitest run` 708 passed (+4), `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린. **화면 확인 미완** — dev 서버가 내려가 있습니다.

## 2026-08-29 — Claude: 결과 화면의 세 가지 실패를 갈라냄

- Agent/session: Claude. 사용자 보고: **본인 계정(jeonmeensoo@gmail.com)으로 로그인해도** `다른 계정으로 로그인하셨을 수 있습니다`가 뜬다.
- Status: completed. 마이그레이션 없음.

### 원인 — 서로 다른 실패 세 개가 한 화면으로 떨어지고 있었습니다

`resultDocumentSchema.safeParse`가 실패하면 그게 **행이 없어서인지, 있는데 안 읽혀서인지** 구분이 없었습니다.

- **행이 없음** — 아직 진행 중이거나, 그 런을 결제한 계정이 아님 → 계정 안내가 맞습니다.
- **행은 있는데 파싱 실패** — **우리 문제입니다.** 저장된 문서가 스키마 변경 이전 형식일 때 그렇습니다. 이 경우에 `다른 계정으로 로그인`을 보여주는 건 **고객이 고칠 수 없는 걸 쫓게 만드는 것**입니다. 사장님이 본인 계정에서 이 화면을 본 이유가 이쪽일 가능성이 큽니다.

### 고침

- 두 경우를 갈랐습니다. 파싱 실패에는 새 화면: `결과는 있는데 화면이 열리지 않습니다. … 계정을 바꾸거나 다시 결제하실 필요는 없습니다.`
- 파싱 실패는 **필드 경로까지 서버 로그로 남깁니다**(`result_document_parse_failed`). 고객은 자기가 못 보는 걸 신고할 수 없습니다.
- 쿼리 자체가 실패한 경우도 따로 로그를 남깁니다.

### 모바일 PC 안내 문구

- `(자료를 올리고 결과를 보기에는 PC를 추천합니다)` → `휴대폰으로는 붙여넣고 맡기기까지 · 실제 첨삭은 PC 추천`, 11.5px → **10.5px**.
- **휴대폰이 못 하는 것이 아니라 할 수 있는 것**으로 적었습니다. 아무것도 입력하기 전에 "당신 기기는 틀렸다"는 괄호를 보여주면 그냥 나갑니다.
- Files: `src/app/result/page.tsx`, `src/components/result-sign-in.tsx`, `src/app/page.tsx`, `src/app/globals.css`.
- Validation: `npx vitest run` 708 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.

### 정정 — 포트

- **`:3000`이 이 워크트리(Claude/main)이고 `:3001`이 Codex입니다.** 앞 항목에서 반대로 적었던 것을 바로잡습니다.
- 두 워크트리의 `npm run dev`가 **둘 다 3000을 기본값**으로 쓰기 때문에 먼저 뜨는 쪽이 3000을 가져갑니다. 포트로는 구분되지 않습니다.
- 구분하려면 내용을 보면 됩니다: `/pro/polish`에 **`간편 입력` 스위치**가 있으면 이 워크트리입니다.
- 즉 사용자가 지금까지 `:3000`에서 한 테스트는 **전부 이 코드가 맞습니다.**

## 2026-08-29 — Claude: 모바일 화면 실제 확인 + 안내 문구 크기 수정

- Agent/session: Claude. `:3000`이 이 워크트리임을 확인한 뒤 브라우저로 직접 측정했습니다.

### 고친 것 — 안내 문구가 21px로 나오고 있었습니다

- `.hero-mobile-hint`(0,1,0)가 `.hero>p`(0,1,1)에 **특정도로 밀려서** 10.5px 규칙이 적용되지 않고 히어로 문단 크기 그대로 나왔습니다.
- `.hero p.hero-mobile-hint`(0,2,1)로 올려 해결했습니다. **작게 만든 줄 알았던 문구가 실제로는 제일 큰 글자였습니다** — 화면을 안 보고 넘어갔으면 그대로 나갈 뻔했습니다.

### 390×844에서 확인한 것

- 홈: 안내 문구 **10.5px**, 가로 넘침 없음, 샘플 버튼 266~322.
- 온보딩: 유형 선택 **3칸**(`처음부터 작성` 라벨만), 카드 108×123.
- `/pro/polish`: 진행 순서 **2열**, `간편 입력 | 상세 입력` 스위치 표시(폭 308), 글자 수 **700 기본값**, 간편 박스 렌더.
- 1280px: 안내 문구 `none`, 모바일 제목 `none`, 데스크톱 제목 그대로, 샘플 버튼 하늘색 유지.
- Files: `src/app/globals.css`.
- Validation: `npx vitest run` 708 passed, `npx next build` 클린, 브라우저 실측 위와 같음.

## 2026-08-29 — Claude: 헤더를 드롭다운 메뉴로

- Agent/session: Claude. 사용자 요청: 커리어 검사도 생기고 기존 헤더에 요금도 안 보이니 드롭다운이 낫지 않나.
- Status: completed (홈만 적용). 마이그레이션 없음.

### 왜 요금이 안 보였나

- `home-mobile-header.module.css`의 `:global(.site-header nav>a:not(.button)){display:none}` — **680px 이하에서 버튼이 아닌 링크를 전부 숨깁니다.** 그래서 `요금`이 **방문자 대다수가 쓰는 기기에서 아예 없었습니다.**
- 게다가 들어갈 곳은 계속 늘고 있습니다: 커리어 검사, 첨삭 예시, 친구 추천, 팁과 노하우. **넣을 수 없는 것을 숨기는 줄은 확장되지 않습니다.**

### 만든 것 — `SiteNav`

- 패널 하나에 두 묶음:
  - **서비스** — 요금 안내(`/#plans`), 첨삭 예시 보기(`/result/sample`), 무료 커리어 검사(`/career`)
  - **이용 안내** — 이용 방법(`/guide`), 팁과 노하우(`/new`), 친구 추천(`/refer`)
- 바에는 자리값을 하는 것만 남깁니다: **요금 · 계정 · CTA.**
- 모바일에서는 `메뉴` 글자와 화살표가 빠지고 **아이콘만** 남습니다. 바에 두 글자가 더 있으면 브랜드가 두 글자를 잃습니다.
- 패널은 모바일에서 **헤더 기준 고정**입니다. 버튼 기준 320px 패널은 360px 화면에서 밖으로 나갑니다.
- **요금을 패널 맨 아래에 한 번 더** 넣었습니다. 바에서 빠지는 건 그 링크뿐이고, 돈 이야기는 찾아 헤매게 두면 안 됩니다.
- 바깥 클릭(`mousedown`)과 `Escape`로 닫힙니다. 닫히지 않는 메뉴는 새로고침으로 닫는 메뉴입니다.
- Files: 신규 `src/components/site-nav.tsx`, `.module.css`; 수정 `src/app/page.tsx`.
- Validation: `npx vitest run` 708 passed, `npx tsc --noEmit` clean, `npx eslint` 0건, `npx next build` 클린.
  - 1280px: `메뉴` 트리거, 패널 링크 7개(`/#plans`·`/result/sample`·`/career`·`/guide`·`/new`·`/refer`·`/#plans`), 패널 623~943, 바의 `요금` 표시.
  - 좁은 폭: 트리거 39px(아이콘만), 브랜드 145px, 가로 넘침 없음, 패널이 화면 안(10~497), 패널 CTA 표시, 열기 → 바깥 클릭 닫힘 → 다시 열기 → Escape 닫힘 전부 통과.
- 보존: `/new`, `/refer`, `/landing`, `/comingsoon`의 헤더는 **건드리지 않았습니다.** 같은 메뉴로 통일할지는 사용자 확인 후 진행합니다.

## 2026-08-29 — Claude: 모바일에서 가로로 밀리던 원인 — 헤더였습니다

- Agent/session: Claude. 사용자 보고: 모바일 메인이 옆으로 드래그된다, 코덱스 쪽은 안 그런다. 실제 폰에서는 `무료로 진단하기` 오른쪽이 살짝 잘린다.
- Status: completed. 마이그레이션 없음. **드래그되는 건 정상이 아닙니다.**

### 원인

- 390px 뷰포트에서 요소를 전부 훑어 **화면 밖으로 나가는 것 하나**를 찾았습니다: `.site-header`의 `무료로 진단하기` 버튼(오른쪽 끝 396 > 390).
- 헤더 한 줄에 브랜드(145) + 메뉴(39) + `내 계정`(약 66) + CTA(97) + 여백이 들어가 **약 412px**이 됐습니다. 사용자가 말한 "오른쪽 살짝 잘림"과 정확히 같은 증상입니다.
- 앞서 `overflow:false`로 측정했던 것은 브라우저 창이 실제로는 507px였기 때문입니다. **390으로 제대로 지정하고 나서야 드러났습니다.**

### 고침

- **`내 계정` 글자를 680px 이하에서 숨깁니다.** 아이콘은 남습니다(약 50px 확보). 텍스트가 버튼 안 맨몸 노드였어서 `<span>`으로 감쌌습니다.
- **CTA 문구를 420px 이하에서 `무료 진단`으로** 바꿉니다. 라벨 두 개를 넣고 하나만 보여줍니다 — 360px에서는 긴 문구가 18px 넘칩니다.
- `.nav`에 `min-width:0`. 줄이 페이지를 넓히는 대신 줄어들 수 있어야 합니다.

### 확인

- **390px**: 화면 밖 요소 0개, `window.scrollX`가 9999로 밀어도 **0**(가로 스크롤 불가), 헤더 오른쪽 끝 = 390.
- **360px**: 화면 밖 요소 0개, CTA `무료 진단` 오른쪽 끝 353, 가로 스크롤 불가.
- **1280px**: 화면 밖 요소 0개, CTA `무료로 진단하기` 그대로.
- Files: `src/components/header-account.tsx`, `.module.css`, `src/components/site-nav.tsx`, `.module.css`.
- Validation: `npx vitest run` 708 passed, `npx tsc --noEmit` clean, `npx eslint .` 0건, `npx next build` 클린.

## 2026-08-29 — Claude: 워크트리 병합 사전 검사 (병합은 미실행)

- Agent/session: Claude. 사용자 요청: 워크트리 충돌 체크하면서 main에 병합.
- Status: **검사와 계획만.** 병합은 하지 않았습니다. 계획은 `docs/merge-plan-2026-08-29.md`.

### 왜 지금 병합하지 않았나

- **코덱스 워크트리에 미커밋 파일이 72개** 있고, 마지막 커밋이 오늘(`Add career-specific login flow`)입니다. **진행 중인 작업입니다.**
- 사용자 결정: **코덱스가 커밋한 뒤에** 병합.

### 브랜치 3개

- `codex/integrate-launch-price-banner` — **이미 main에 포함.** 할 일 없음.
- `feature/bring-annotations-to-main` — 8/20, main보다 **143 커밋 뒤짐**. 충돌 10건이 전부 QUICK 분석 핵심 파일입니다. **그 작업은 이미 main에 있고 이후 더 발전했습니다**(`result-original-annotations.ts` + 커밋 3개). **버리는 쪽을 권합니다.** main에 없는 건 `src/middleware.ts`(dev.* 호스트 rewrite, 17줄) 하나뿐이고 지금은 쓸 일이 없습니다.
- `feature/codex-plan` — 27 커밋, 충돌 13건. 본 작업.

### 사용자 결정 3건

1. **병합 시점** — 코덱스 커밋 후.
2. **`career/*`** — **코덱스 것 채택.** main의 8/26 사본은 옛 스냅샷이고, 두 계보는 조상 관계가 아닙니다(확인함). 단 `edc631c Add unified career profile summary`가 main에만 있어 병합 직전 대조 필요.
3. **`src/app/page.tsx`** — **내 최신 홈 유지 + 커리어 링크만.**

### 조사 중 드러난 것 — 홈은 "링크 하나" 문제가 아닙니다

- 코덱스는 홈을 통째로 옮겼습니다. 그쪽 `page.tsx`는 **10줄 껍데기**이고 내용 222줄이 새 파일 `src/app/home-page-content.tsx`에 있습니다(main에 없음).
- 그래서 결정 3을 지키려면 **코덱스의 `home-page-content.tsx`를 가져오면 안 됩니다.** 가져오면 홈이 둘이 됩니다.
- 코덱스 홈의 커리어 진입점 두 곳을 확인했습니다:
  - 헤더 네비 `커리어 검사` → **이미 제 `SiteNav`에 들어 있어 옮길 것 없음.**
  - **커리어 CTA 섹션**(`지원하기 전에, 나의 기준부터 정리하세요.`) → main에 없음. **이것만** 옮기면 됩니다.

### 마이그레이션 주의

- `20260826010000_career_assessment_profiles.sql`은 **이미 원격에 적용됐고**, main 사본에는 제가 넣은 멱등 처리가 있습니다. `--theirs`로 덮으면 그게 사라집니다. **손으로 합쳐야 합니다.**

## 2026-08-29 — Claude: 커리어 검사 사이드바를 병합 계획에 추가

- Agent/session: Claude. 사용자 지시: 메인 홈은 Claude 것을 유지하되 **사이드바 기능은 가져올 것.**
- Status: 계획 갱신만. `docs/merge-plan-2026-08-29.md`.

### 무엇인지 확인했습니다

- `:3001`(코덱스)에서 홈에 붙어 있는 것은 **`career-assessment-drawer`**입니다. 오른쪽 패널이고, 기본이 **열린 상태**, 접으면 화면 가장자리에 `커리어 검사` 탭만 남습니다. `Escape`로 닫힙니다. 안에는 `CareerAssessmentCatalog`.
- 코덱스 홈에서는 `home-page-content.tsx:49`에 **한 줄**로 들어갑니다. 따라서 **`main`의 `page.tsx`에도 한 줄만 넣으면 됩니다** — 홈 구조를 바꿀 필요가 없습니다.

### 지금은 가져올 수 없습니다

- `career-assessment-drawer.tsx`, `.module.css`, `career-assessment-catalog.tsx`, `.module.css` — **네 파일 모두 코덱스 워크트리에서 untracked(`??`)**입니다. **어느 커밋에도 없습니다.**
- 앞서 커밋된 브랜치만 훑었을 때 이 이름들이 안 나온 이유입니다.
- 코덱스가 커밋해야 병합 대상이 됩니다. 요청 문구를 계획서에 반영했습니다.

### 병합 후 다시 볼 것

- 드로어가 **기본 열림**입니다. 홈 첫 화면 오른쪽을 기본으로 가리는 패널은 **자소서 첨삭을 하러 온 사람에게는 방해**입니다. 접힌 상태로 시작하는 편이 나은지 화면을 보고 정합니다.

## 2026-08-29 — Claude: 미커밋 파일 분류 정정

- Agent/session: Claude. 사용자 질문: 백업 40개와 그 디렉터리가 정말 필요 없나, md도 가져와야 한다.

### 정정 — `1/`은 사고가 아니라 스크린샷입니다

- 앞서 "리다이렉션 사고로 보인다"고 적었는데 **틀렸습니다.** 열어보니 **스크린샷 7장**(`20260825_*.png`)이고 **35MB**입니다.
- 저장소에 한 번 들어가면 이력에서 사라지지 않아 **앞으로 모든 clone이 35MB를 더 받습니다.** 소스가 아니므로 넣지 않는 쪽이 맞습니다.
- 다만 **디자인 참고 자료라면 버리면 안 됩니다.** `docs/` 아래에 뜻이 통하는 이름으로 옮기는 게 맞습니다 — 이름이 `1`이면 반년 뒤에 아무도 무엇인지 모릅니다. 판단은 코덱스/사용자 몫입니다.

### `.previous-*` 40개 — 지금은 맞는 물건입니다

- 확인해 보니 전부 **현재 파일의 이전 상태 사본**입니다. 코덱스가 손으로 만든 되돌리기 이력입니다.
- **작업이 커밋돼 있지 않으니 그게 유일한 안전망이었습니다.** git이 대신해 줄 수 없었으니까요.
- **커밋하고 나면 git 이력이 같은 일을 합니다.** 그때는 지워도 되고, 저장소에 넣을 이유는 없습니다.

### MD — 이미 커밋돼 있습니다

- 커리어 문서 **17개가 이미 `feature/codex-plan`에 커밋**돼 있습니다(`career-assessment-roadmap.md`, `mooa-resume-career-design-v2.md`, `psychology-platform-future-plan.md` 등). **병합하면 자동으로 따라옵니다.**
- 미커밋 md는 `docs/agent-change-log.md` 하나뿐이고, 양쪽이 끝에 덧붙이기만 해서 **양쪽 다 남기면** 됩니다.

## 2026-08-30 — Codex: career assessment implementation merge

- Agent/session: Codex (`feature/codex-plan` → `main`).
- Decision: Per user direction, adopted the Codex implementation for `src/app/career/**`, career assessment components, persistence/migration, and the assessment catalog. Preserved main's landing page and launch-banner implementation.
- Homepage integration: added only `CareerAssessmentDrawer` import and render call to `src/app/page.tsx`; the drawer and catalog are supplied by the committed source files.
- Validation: merge conflicts resolved by the stated file ownership rules; typecheck and lint run after the merge.
- Rollback: revert the main merge commit that follows this entry.
## 2026-08-29 — Claude: 병합 결과 검증과 두 건 수정

- Agent/session: Claude. 코덱스가 `bc5f549` 커밋 후 `6f49f23`로 main에 병합했습니다. 그 결과를 검증했습니다.
- Status: 검증 완료 + 수정 2건. 병합 자체는 코덱스 작업입니다.

### 잘 된 것

- 제 작업 전부 살아 있습니다: `site-nav.tsx`, `simple-intake.tsx`, `result-sign-in.tsx`, `document-classify.ts`, `upload-limits.ts`, `simple-intake-mapping.ts`.
- 홈은 main 본문 유지 + 드로어 한 줄. 히어로·`SiteNav`·샘플 버튼 그대로.
- 백업 사본과 스크린샷은 **하나도 들어오지 않았습니다**(`git ls-files` 0건).
- 713 tests passed, `tsc` clean, `next build` 클린.

### 수정 1 — 드로어가 붙여넣기 상자를 덮고 있었습니다

- 드로어는 **왼쪽 기준 50vw**이고 **기본 열림**이었습니다. 1265px 화면에서 `aside`가 **left 0, 폭 800**으로 히어로 위에 놓였고, `elementFromPoint`로 확인하니 **자소서 입력칸 자리에 커리어 카탈로그가 있었습니다.** 이 페이지가 존재하는 이유인 입력을 할 수 없는 상태였습니다.
- `aria-modal="true"`이기도 해서, **방문자가 아무것도 보기 전에 화면 전체를 주장하며** 열렸습니다.
- `useState(true)` → `useState(false)`. **커리어 탐색은 두 번째 문이지 정문이 아닙니다.** 왼쪽 가장자리 탭은 그대로 남아 언제든 열 수 있고(폭 110), 모바일에서는 드로어가 숨겨지지만 `SiteNav` 메뉴에 `무료 커리어 검사`가 있어 길이 있습니다.
- 확인: 닫은 상태에서 입력칸 위 요소가 `TEXTAREA`, 탭을 누르면 폭 800으로 열립니다.

### 수정 2 — 마이그레이션 멱등성이 되돌려졌습니다

- `20260826010000_career_assessment_profiles.sql`이 코덱스 버전으로 채택되면서 제가 넣은 `if not exists`·`drop trigger if exists`가 사라졌습니다(계획서에서 경고했던 지점).
- **스키마 차이는 없었습니다.** 되돌아간 것은 재실행 가능성뿐이라 원격 DB와는 어긋나지 않습니다.
- 그래도 복원했습니다. 비용이 0이고, 새 환경이나 `db reset`에서 한 번 더 막히는 것을 막습니다.

### 남은 판단 — `src/app/home-page-content.tsx`가 고아입니다

- 코덱스의 홈 본문 222줄이 함께 들어왔는데 **아무도 import 하지 않습니다.** Next는 `page.tsx`만 라우팅하므로 화면에는 영향이 없습니다.
- `mobile-site-menu.tsx`도 이 파일에서만 쓰이므로 같이 고아입니다. **`SiteNav`와 중복 걱정은 없습니다** — 라이브 홈에는 `SiteNav`만 있습니다.
- **지우지 않았습니다.** 코덱스 구현이라 사용자 확인이 필요합니다. 두면 홈이 둘로 갈라져 나중에 어긋납니다.

## 2026-08-29 — Claude: 드로어를 코덱스 원래대로 (기본 열림) 되돌림

- Agent/session: Claude. 사용자 지시: 사이드바는 **코덱스가 만든 것 그대로**, 시작할 때 나오는 걸로.
- Status: completed. 마이그레이션 없음.

- `useState(false)` → `useState(true)`. **사용자가 확인한 결정이므로 그대로 따릅니다.**
- 한 번만 기록해 둡니다: 1265px에서 패널은 `x=0..800`을 덮고 히어로의 붙여넣기 상자는 `x≈52`에서 시작하므로, **닫기 전까지는 카탈로그가 입력칸 위에 있습니다.** 가장자리 토글과 `Escape`로 닫힙니다. 커리어 홈이 이미 같은 동작으로 나가 있었습니다.
- Files: `src/components/career-assessment-drawer.tsx`.
- Validation: 713 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린.

## 2026-08-29 — Claude: 드로어가 넓어 보이던 진짜 이유 + 커리어 CTA 이관

- Agent/session: Claude. 사용자 지적: 드로어가 코덱스 것과 다르게 보인다, 코덱스는 정확히 반인데 지금은 5/3 느낌.
- Status: completed. 마이그레이션 없음.

### 패널은 정확히 반이 맞습니다. 안의 내용이 넘치고 있었습니다

- `aside`의 계산된 폭은 **720px = 1440의 정확히 50vw**입니다. CSS도 코덱스 파일 그대로고 손대지 않았습니다.
- 문제는 안쪽이었습니다. `career-assessment-catalog`의 `.grid`가 `repeat(3, 1fr)`인데, **`1fr` 트랙은 내용의 최소 폭 아래로 줄지 않습니다.** 그래서 659px 상자 안에서 컬럼이 `292 + 309 + 292`로 잡혀 **259px가 패널 밖으로 삐져나왔습니다.**
- **반짜리 패널이 반보다 넓어 보인 이유가 이것입니다.** 패널이 아니라 내용이 넘친 것입니다.
- `repeat(3, minmax(0, 1fr))`로 고쳤습니다. 한 토큰 차이로 트랙이 상자에 맞게 줄어듭니다. 카드 글자는 줄바꿈될 수 있지만 **넘치지는 않습니다.** 커리어 페이지의 3열 디자인은 그대로입니다.
- 확인: 고친 뒤 카탈로그와 그리드의 `scrollWidth` 초과가 사라졌습니다.

### 남은 구조 문제 (지금은 안 건드림)

- 카탈로그는 **뷰포트 미디어 쿼리**로 열 수를 정합니다(`@media(max-width:800px)`에서 1열). 그런데 드로어 안에서는 **뷰포트가 1440이어도 상자는 720**이라, 그 규칙이 영영 걸리지 않습니다. 컨테이너 크기로 반응해야 맞습니다(container query). 지금은 `minmax(0,1fr)`로 넘침만 막아 뒀습니다.

### 정정 — 두 홈 파일 차이

- 앞서 "`감이 아니라`·`자료를 넣으면` 등 6개 섹션이 코덱스 사본에 없다"고 적었는데 **틀렸습니다.** `<h2>`만 훑어서 생긴 착오이고, 실제로는 **양쪽에 다 있습니다.** 사용자 지적이 맞았습니다.
- 두 파일의 실질 차이는 **커리어 CTA 섹션 하나**뿐이었습니다.

### 커리어 CTA를 진짜 홈으로 옮겼습니다

- `지원하기 전에, 나의 기준부터 정리하세요.` 섹션과 `career-home-cta.module.css`를 `page.tsx`로 가져왔습니다. 디자인은 코덱스 것 그대로입니다.
- 자리는 **샘플 결과 다음, 요금표 앞**입니다. 첨삭이 무엇을 만들어내는지 막 본 사람, 그리고 곧 가격을 보게 될 사람이 **무료로 먼저 해볼 게 있다**는 말을 가장 잘 받습니다.
- Files: `src/components/career-assessment-catalog.module.css`, `src/app/page.tsx`.
- Validation: 713 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린. 1440px에서 드로어 720px, 카탈로그 넘침 없음, CTA 섹션과 `/career` 링크 렌더 확인.

## 2026-08-29 — Claude: 드로어 폭을 줄이고, 코덱스가 만들어둔 드로어 레이아웃을 켬

- Agent/session: Claude. 사용자 요청: 사이드바를 조금 더 줄여줄 것. main만.
- Status: completed. 마이그레이션 없음.

### 폭

- `50vw` → **`min(44vw, 660px)`**. 1440에서 720px → **633px**(화면의 44%).
- 상한을 둔 이유: 넓은 모니터에서 `44vw`는 이미 카탈로그로는 과합니다. 곁판은 곁판으로 읽혀야 합니다.

### 진짜 원인 — 코덱스가 만들어둔 드로어 전용 레이아웃이 꺼져 있었습니다

- 카탈로그 CSS 아래쪽에 **`.drawer` 변형이 이미 통째로 작성돼 있었습니다**: `그리드 1열`, `히어로 34px`, 섹션 간격 축소, 카드 `min-height` 해제, 760px 대응까지.
- 그런데 드로어가 `<CareerAssessmentCatalog />`를 **prop 없이** 불렀습니다. `variant`의 기본값이 `"page"`라 **그 레이아웃이 한 번도 적용된 적이 없었습니다.**
- `variant="drawer"` 한 줄을 넘겨 **켰습니다.** 처음에 제가 2열 규칙 등을 직접 추가했다가, 코덱스 것이 파일 뒤쪽에 있어 어차피 이기는 것을 확인하고 **제 중복 규칙은 전부 지웠습니다.** 더할 것이 없었습니다.
- 어제 넣은 `repeat(3, minmax(0,1fr))`는 남깁니다. 그건 **카탈로그 페이지 쪽** 넘침 방지입니다.

### 확인 (1425px)

- 패널 633.6px = **44%**, 카드 **1열**, 히어로 **34px**, 넘치는 요소 **0개**.
- Files: `src/components/career-assessment-drawer.module.css`, `career-assessment-drawer.tsx`, `career-assessment-catalog.module.css`.
- Validation: 713 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린.

## 2026-08-29 — Claude: 드로어를 코덱스 원본으로 완전 복원

- Agent/session: Claude. 사용자 지시: 50vw로 되돌리고 **기존 정사각형 카드 디자인을 유지할 것.** 앞서 보인 차이는 새로고침 문제였을 수 있음.
- Status: completed. 마이그레이션 없음.

### 방식 — 손으로 되돌리지 않고 원본 커밋에서 꺼냈습니다

```
git checkout bc5f549 -- career-assessment-drawer.tsx
                        career-assessment-drawer.module.css
                        career-assessment-catalog.module.css
```

**코덱스 워크트리 파일과 바이트 단위로 대조해 확인했습니다:**

| 파일 | 결과 |
|---|---|
| `career-assessment-drawer.module.css` | **완전히 같음** |
| `career-assessment-catalog.module.css` | **완전히 같음** |
| `career-assessment-drawer.tsx` | 내용 동일(줄바꿈 문자만) |
| `career-assessment-catalog.tsx` | 내용 동일(줄바꿈 문자만) |

### 되돌린 것 세 가지

- 폭 `min(44vw,660px)` → **`50vw`**
- 카탈로그 그리드 `repeat(3,minmax(0,1fr))` → **`repeat(3,1fr)`**
- `variant="drawer"` 제거 → **`<CareerAssessmentCatalog />`** (드로어 전용 1열 레이아웃은 다시 꺼짐)
- 기본 열림(`useState(true)`)은 그대로입니다.

### 확인 (1425px)

- 패널 **720px = 51%**, 그리드 **3열**(229·235·217), 카드 `min-height:264px` **정사각형 유지**.
- 남는 사실 하나: 3열 합이 내용 상자보다 약 45px 넓어 오른쪽 카드가 몇 px 잘릴 수 있습니다. **원본 그대로이므로 그대로 둡니다.**
- Validation: 713 tests passed, `tsc` clean, `next build` 클린.

## 2026-08-29 — Claude: 드로어를 `.home-page` 안으로 (코덱스 진단대로)

- Agent/session: Claude. 코덱스가 원인을 정확히 짚었고, 그 지시대로 적용했습니다.
- Status: completed. 마이그레이션 없음.

### 원인 — 폭이 아니라 **DOM 위치**였습니다

```css
body{zoom:var(--app-scale)}   /* 1.25 */
.home-page{zoom:calc(1 / 1.25)}  /* 홈 본문에서 다시 0.8배로 상쇄 */
```

- 코덱스 워크트리: 드로어가 `.home-page` **안** → `50vw × 1.25 × 0.8 = 화면의 50%`
- 병합된 main: 드로어가 `<main className="home-page">` **바깥** → 0.8배 상쇄를 못 받고 `50vw × 1.25 = 화면의 62.5%`

**드로어 CSS는 아무 문제가 없었습니다. 어디에 걸려 있느냐만 달랐습니다.**

### 제가 놓친 지점 (기록)

- `getBoundingClientRect`가 900, `getComputedStyle().width`가 720으로 나왔을 때 그 **1.25배를 브라우저 창 스케일링 아티팩트로 넘겼습니다.** 그게 바로 `body{zoom:1.25}`였습니다.
- 그 잘못된 가정 때문에 엉뚱한 두 가지를 손댔습니다: 폭을 `44vw`로 줄인 것, 카탈로그 그리드를 고친 것. **둘 다 이미 되돌렸고**, 지금은 코덱스 원본과 바이트 단위로 같습니다.
- **숫자가 두 개 안 맞으면 둘 중 하나가 틀린 게 아니라 설명이 없는 것**입니다. 그때 멈추고 이유를 찾았어야 했습니다.

### 고침

- `<CareerAssessmentDrawer />`를 `<main className="home-page">`의 **첫 자식**으로 옮겼습니다. 그 한 줄이 전부입니다.
- 전역 `body`/`.home-page` zoom, 드로어 CSS, 홈 폰트·비율은 **하나도 건드리지 않았습니다.**

### 확인 (1905px 뷰포트)

- `cssWidth 960px` = `renderedWidth 960px` → **1.25배 부풀림 사라짐**
- 화면 대비 **정확히 50%**, `.home-page` 안에 있음 확인.
- Validation: 713 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린.

## 2026-08-26 — Codex: 홈 오버레이 드로어 (워크트리 기록)

- Agent/session: Codex worktree feature/codex-plan.
- Status: variant.
- Protected baseline: existing homepage content, CTA flow, and career assessment pages remain intact.
- Change and reason: user requested an automatic, closable overlay drawer on the homepage that shows the assessment catalog without shrinking the home layout. The desktop drawer covers the right 50% of the viewport; mobile uses full width.
- Files/branch: new career-assessment-drawer component/CSS; additive import/render in home-page-content; drawer rendering variant in catalog CSS/component.
- Validation: pending typecheck, lint, local visual route verification.
- Rollback/recovery reference: remove the one home render/import and the new drawer files; catalog page remains available separately.
- User decision: explicitly requested the overlay rather than an inline/sidebar layout that compresses the existing homepage.

## 2026-08-30 — Codex: career login layout isolation

- Agent/session: Codex (`feature/codex-plan` → `main`).
- Change: `/career/login` now bypasses the shared assessment header/container through `CareerLayoutShell`; it keeps only its own full-page login layout.
- Reason: the login page previously received both its own full-height layout and the assessment-specific wrapper, causing nested width, padding, and vertical-height rules.
- Files: `src/app/career/layout.tsx`, `src/components/career-layout-shell.tsx`.
- Validation: `npm run typecheck`, `npm run lint`, and local login route response check.
- Rollback: revert the commit that applies this entry; all other career routes retain the original wrapper behavior.
## 2026-08-29 — Claude: 헤더 정리 + 로그아웃이 안 되던 버그

- Agent/session: Claude. 사용자 요청 6건.
- Status: completed. 마이그레이션 없음.

### 버그 — 휴대폰에서 로그아웃할 방법이 없었습니다

- 계정 드롭다운이 **`:hover`와 `:focus-within`으로만** 열렸습니다. 터치 기기에는 hover가 없으니 **아이콘만 덩그러니 있고 눌러도 아무 일이 없었습니다.**
- 로그인한 사람이 **로그아웃을 아예 못 하는 상태**였습니다.
- 클릭 토글로 바꿨습니다. 바깥 클릭(`mousedown`)과 `Escape`로 닫히고, 드롭다운 링크를 누르면 닫힙니다. 로그아웃 후에도 닫습니다.

### 헤더 구성 변경

- **`요금`을 드롭다운 안으로, `커리어 검사`를 바에 노출.** 요금은 작업을 보기 전에는 눌리지 않는 링크이고, **무료로 열리는 문 하나가 바 자리값을 더 합니다.**
- 데스크톱 바: `메뉴 ▾ · 커리어 검사 · 내 계정 · 무료로 진단하기`
- 패널: 서비스(요금 안내, 첨삭 예시) / 이용 안내(이용 방법, 팁과 노하우, 친구 추천) / 맨 아래 `무료로 진단하기`

### 크기와 모양

- 메뉴 트리거 14px → **13px**, 모서리 999px → **9px**(알약이 아니라 컨트롤로 읽히게). 바의 링크도 15px → 13px, 계정 14px → 13px.
- 모바일 메뉴 버튼: **36×36 정사각**, 반경 9px. 아이콘만 남는 크기에서 알약은 떠도는 점처럼 보입니다.
- 모바일 바에서 **`무료로 진단하기` 제거.** 브랜드와 메뉴를 밀어내고 있었고, 패널이 같은 버튼으로 끝납니다.

### 특정도 한 건

- `home-mobile-header.module.css`가 `.site-header nav>a:not(.button)`(클래스 2 + 요소 2)로 바의 링크를 전부 숨깁니다. `커리어 검사`를 살리려면 그보다 높아야 해서 **`.nav .price.price`(클래스 3)**로 올렸습니다. 클래스 하나만 겹쳐 쓴 첫 시도는 요소 개수에서 밀려 안 먹었습니다.

### 확인

- 1440px: 트리거 13px/9px, 바 `커리어 검사`+CTA, 패널 링크 6개.
- 390px: 메뉴 36×36, CTA `display:none`, 바에 `커리어 검사 | 로그인`, 가로 넘침 0.
- 360px: 헤더 오른쪽 끝 360, 가로 스크롤 불가, 넘침 0.
- Files: `src/components/header-account.tsx`, `.module.css`, `src/components/site-nav.tsx`, `.module.css`.
- Validation: 713 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린.

## 2026-08-29 — Claude: 가로 스크롤의 진짜 원인, 헤더 순서, 메뉴 패널 위치

- Agent/session: Claude. 사용자 지적 4건.
- Status: completed. 마이그레이션 없음.

### 가로로 밀리던 원인 — 런칭 바가 아니라 **히어로의 장식용 빛무리**였습니다

- 요소를 하나씩 지워가며 좁혀 들어갔더니, 자식이 아니라 **`.hero` 자신**이 범인이었습니다. `.hero::before` — `aspect-ratio:1/1`짜리 초록 그라데이션 원입니다.
- 676px 뷰포트에서 이 원이 **1081×1081px**로 잡히고, `translateX(-50%)`로 가운데 정렬되어 좌우로 **각각 221px씩** 삐져나옵니다. 오른쪽 삐침이 곧 가로 스크롤입니다.
- 화면에 안 보였던 이유: `z-index:-1`, `pointer-events:none`, 흐릿한 라디얼이라 **눈에는 배경으로만 보입니다.** 큰 카드를 찾아도 나올 리가 없었습니다.
- `.hero{overflow-x:clip}`. **`hidden`이 아니라 `clip`인 이유**: `hidden`은 스크롤 컨테이너를 만들어 히어로 위로 일부러 올라가는 `.hero-aura`를 잘라버립니다. 축 하나만 자르면 세로 번짐은 그대로 남습니다.
- 확인: 676px에서 `scrollWidth - clientWidth`가 **204 → 0**.

### 헤더 순서

- `커리어 검사 · 무료로 진단하기 · 로그인 · 메뉴`. **메뉴가 맨 오른쪽, 그 왼쪽이 로그인**입니다. 모바일에서는 CTA가 숨겨져 `커리어 검사 · 로그인 · 메뉴`로 읽힙니다.

### 메뉴 패널이 런칭 바에 가려지던 문제

- 패널이 모바일에서 `position:fixed; top:66px`이었습니다. **런칭 바가 헤더를 아래로 밀면 그 66px은 배너 뒤**가 됩니다.
- 버튼 기준 `position:absolute; top:calc(100% + 8px)`로 바꿨습니다. 헤더가 어디로 밀리든 따라갑니다. 폭은 `min(320px, 100vw - 24px)`.

### 계정 드롭다운 방어

- `z-index` 6 → **20**(내비 패널과 동일). 헤더 아래에 묻히면 **눌러도 아무 일이 없는 것처럼 보이는데**, 이 메뉴가 이미 한 번 그 버그를 겪었습니다.
- 모바일에서 `right:-6px`, `max-width:calc(100vw - 24px)`로 화면 밖으로 나가지 않게.
- **로그아웃이 여전히 안 되면 강력 새로고침(Ctrl+Shift+R) 후 다시 확인이 필요합니다.** 클릭 토글 자체는 어제 커밋에 들어가 있습니다.
- Files: `src/app/globals.css`, `src/components/site-nav.tsx`, `.module.css`, `src/components/header-account.module.css`.
- Validation: 713 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린. 676·390·1440px 전부 `canScrollX: 0`.

## 2026-08-29 — Claude: 부제목을 제목 아래로 고정, 남은 가로 넘침 정리

- Agent/session: Claude. 사용자 지적: 모바일에서 아직 전체가 움직인다, `자기소개서 컨설팅 받기`는 무조건 `나만의 취업 코치` 아래.
- Status: completed. 마이그레이션 없음.

### 부제목이 제목 옆에 붙던 이유

- `.hero-mobile-sub`가 `display:inline-flex`였습니다. **제목이 자리를 남기면 그 옆에 붙습니다** — 676px에서 실제로 `…의 취업 코치 [자기소개서 컨설팅 받기]`로 한 줄에 나왔고, 부제목이 아니라 **제목의 일부처럼** 읽혔습니다.
- `display:flex` + `width:fit-content` + 좌우 `auto` 마진. **항상 다음 줄, 항상 가운데.**

### 남아 있던 가로 넘침 하나

- `현장에서 검증된 컨설팅을, 기술로.` 제목에 `white-space:nowrap`이 걸려 있어 390px에서 **상자보다 29px 넓었고**, 위쪽에서 잘려 **문장 끝 단어가 사라졌습니다.**
- 700px 이하에서 `white-space:normal; word-break:keep-all`. `keep-all`이라 단어 중간이 아니라 **띄어쓰기에서** 줄바꿈됩니다 — 한국어에 필요한 설정입니다.
- CSS 모듈이라 `h2`만 단독으로 쓰면 빌드가 거부합니다(순수 선택자 금지). `.head h2`로 묶었습니다.

### 확인

| 폭 | `htmlScrollWidth` | 실제 가로 스크롤 | 넘치는 요소 |
|---|---|---|---|
| 676 | 676 (= clientWidth) | **0** | 없음 |
| 390 | 390 | **0** | 없음 |
| 360 | 360 | **0** | 없음 |

- 360px 화면 확인: 헤더가 `MOOA Resume · 커리어 검사 · 로그인 · ☰`, 부제목이 제목 아래 가운데.
- Files: `src/app/globals.css`, `src/app/field-credibility.module.css`.
- Validation: 713 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린.

## 2026-08-29 — Claude: 루트에 가로 넘침 방지, PC 헤더 CTA 맨 왼쪽

- Agent/session: Claude. 사용자 지적: 모바일에서 아직 드래그된다. PC의 `무료로 진단하기`는 맨 왼쪽으로.
- Status: completed. 마이그레이션 없음.

### 왜 한 군데씩 잡는 방식으로는 끝나지 않았나

- 이 사이트는 `body{zoom:1.25}` 위에서 장식 요소를 **`vw`로 재고 있습니다.** `.hero::before`가 `min(1180px, 160vw)`입니다.
- `vw`는 zoom과 무관하게 뷰포트를 기준으로 하므로, **body의 실제 폭(뷰포트 ÷ 1.25)보다 항상 넓게 계산됩니다.** 하나를 막아도 반올림 하나, 새 장식 하나면 다시 드래그가 생깁니다.
- 그래서 루트에 한 번 막았습니다:

```css
html{overflow-x:hidden;scroll-behavior:smooth}
@supports (overflow: clip) { html { overflow-x: clip; } }
```

- **`clip`이 기본, `hidden`은 대비책**입니다. `hidden`은 루트를 스크롤 컨테이너로 만들어 `position:sticky`를 망가뜨리므로, `clip`을 지원하지 않는 브라우저(Safari 16 미만)에만 걸리게 `@supports`로 감쌌습니다.
- **직전 수정이 효과가 없어 보였던 이유도 이것일 수 있습니다.** `.hero{overflow-x:clip}`는 `clip`을 지원하는 브라우저에서만 동작합니다.

### PC 헤더 순서

- `무료로 진단하기 · 커리어 검사 · 로그인 · 메뉴`. **버튼이 맨 왼쪽, 메뉴가 맨 오른쪽, 그 왼쪽이 로그인.** 모바일은 CTA가 숨겨져 `커리어 검사 · 로그인 · 메뉴`.

### 확인

- 390px: `html` 계산값 `overflow-x: clip`, `scrollWidth 390 = clientWidth`, `scrollTo(9999,0)` 후 `scrollX 0`, `bodyScroll 312 = bodyClient`.
- 1440px: 헤더 순서 `무료로 진단하기 · 커리어 검사 · 로그인 · 메뉴`.
- Files: `src/app/globals.css`, `src/components/site-nav.tsx`.
- Validation: 713 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린.

## 2026-08-29 — Claude: 헤더가 런칭 배너 아래에 깔려 있었습니다

- Agent/session: Claude. 사용자: 브라우저는 웨일. 모바일에서 프로필 아이콘만 있고 로그아웃 메뉴가 안 열린다.
- Status: completed. 마이그레이션 없음.

### 웨일은 문제가 아닙니다

- 웨일은 크로미움 기반이고 `overflow: clip`은 크로미움 90부터 지원합니다. **못 고치는 게 아니라 강력 새로고침이 필요한 것**입니다. 확인한 값: 웨일과 같은 엔진에서 `html`의 계산된 `overflow-x`가 `clip`, 390px에서 `scrollWidth 390 = clientWidth`, `scrollTo(9999,0)` 후 `scrollX 0`.

### 진짜 문제 — 쌓임 순서

- `.site-header`가 `position:sticky; z-index:30`(홈 전용 규칙), 런칭 배너가 **`z-index:40`**입니다.
- 헤더가 배너보다 **아래**에 깔려 있었습니다. 헤더는 자기 자신이 쌓임 맥락을 만들기 때문에, **그 안의 드롭다운에 `z-index:20`을 줘도 헤더 밖의 40을 넘지 못합니다.**
- 계정 메뉴를 눌러도 아무 일이 없어 보이는 증상과 맞습니다.
- `.site-header` 30 → **41**. 배너보다 한 칸 위입니다. 기본 규칙(globals)도 3 → 41로 맞췄습니다.
- **헤더는 페이지에서 가장 위에 있어야 합니다.** 그 안의 메뉴가 무언가에 묻히면, 사용자에게는 고장으로 보입니다.

### 확인 (390px)

- `headerZ 41` > `bannerZ 40`, `html overflow-x: clip`, `scrollWidth 390 = clientWidth`, 가로 스크롤 0.
- Files: `src/app/globals.css`, `src/app/home-startup-header.module.css`.
- Validation: 713 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린.
- **남은 확인:** 로그인한 상태에서 계정 아이콘을 눌러 로그아웃이 나오는지는 사용자 확인이 필요합니다.

## 2026-08-29 — Claude: 커리어 검사 목록·사이드바 SEO

- Agent/session: Claude. 사용자 요청: 검색어 31개를 자연스럽게 분산, 키워드 스터핑으로 걸리지 않게.
- Status: completed. 마이그레이션 없음.

### 넣는 방식 — 목록이 아니라 설명으로

- 31개를 그대로 나열하면 그게 스터핑입니다. 대신 **그 이름들이 결국 같은 세 가지를 묻는다는 사실**을 설명하는 문단으로 풀었습니다. 읽는 사람에게 실제로 쓸모가 있고, 그래서 목록으로 읽히지 않습니다.
  - 1문단: 직업검사·진로검사·취업검사 / 직업적성검사·진로적성검사·직무적성검사 / 직업성향검사·업무성향검사·커리어성향검사 → **무엇을 하고 싶은가·어떻게 일하는가·무엇을 중요하게 보는가** 셋으로 정리하고, 무아의 세 도구(직업흥미검사·업무성향검사·직업가치관검사)에 연결.
  - 2문단: 커리어프로파일 → 진로탐색·직업탐색·커리어탐색. 커리어진단·진로진단·취업진단, ~성향분석 3종, ~테스트 3종을 "이렇게 찾아오셔도 같은 도구"로 묶음.
  - 3문단: **표준화된 직업심리검사·진로심리검사가 아니라는 선긋기.** 강한 단어를 쓰려면 그 옆에 사실을 적어야 공정합니다. 남은 직업가치검사·커리어적성검사·직무성향검사·직업프로파일을 여기에 놓았습니다.
- 확인: 31개 전부 페이지에 존재(`found 31 / 31`).

### 화면 구조

- `h1`은 요청대로 **그대로**입니다. 바로 아래 중간 크기로 `직업심리검사 · 진로검사 · 직업적성검사`, 그다음 `h2`로 **`무료 직업심리검사와 커리어 검사`**.
- `<title>`: `무료 직업심리검사·진로검사 | 직업흥미·업무성향·직업가치 - 무아레쥬메` (39자). 루트 레이아웃이 `| MOOA Resume`를 덧붙이므로 `absolute`로 지정했습니다 — 안 그러면 **브랜드가 한글·영문으로 두 번** 붙습니다.
- `/career`는 목록 페이지와 **제목이 겹치지 않게** 다르게 썼습니다. 같은 문구면 구글이 하나만 남기고 나머지를 버립니다.

### 같이 고친 구조 문제

- 드로어가 카탈로그를 `variant` 없이 부르고 있어서 **홈에 `<main>`이 둘, `<h1>`이 셋**이 됐습니다. 게다가 드로어가 `.home-page`의 첫 자식이라 **크롤러가 홈의 제목을 `무엇을 탐색하는지부터`로 읽고 있었습니다.**
- 드로어에서는 `section` + `h2`/`h3`로 낮췄습니다. 확인: 홈 `main` 1개, `h1`에서 커리어 제목 사라짐.
- **레이아웃은 건드리지 않았습니다.** `variant`가 문서 구조만 정하도록 분리했고, `.drawer` 레이아웃 블록은 계속 꺼둡니다 — 사용자가 코덱스의 3열 정사각 카드를 선택했고, 이 prop이 그걸 몰래 뒤집을 자리는 아닙니다. 확인: 패널 720px, 카드 `min-height:264px` 유지.
- Files: `src/components/career-assessment-catalog.tsx`, `.module.css`, `src/components/career-assessment-drawer.tsx`, `src/app/career/assessments/page.tsx`, `src/app/career/page.tsx`.
- Validation: 713 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린.

## 2026-08-29 — Claude: 로그아웃이 안 되던 진짜 원인, 커리어 히어로 재배치

- Agent/session: Claude. 사용자: 아직도 모바일에서 프로필 아이콘 눌러도 로그아웃 안 뜸. 그리고 SEO 문단을 맨 아래로, 검색어를 제목 옆에 같은 크기로, 앞에 `종합 커리어검사` 크게.
- Status: completed. 마이그레이션 없음.

### 로그아웃 — 앞서 짚은 두 가지는 원인이 아니었습니다

- CSS에 이 줄이 있었습니다: **`@media(max-width:760px){.drop{display:none}}`**. **모바일에서 계정 드롭다운을 아예 숨기고 있었습니다.**
- 그러니 hover→클릭으로 바꾸든, `z-index`를 올리든 보일 수가 없었습니다. **두 번 헛짚었고, 원인은 이 한 줄입니다.**
- 왜 있었는지는 짐작이 갑니다: 예전엔 hover로만 열렸으니 터치에서는 죽은 아이콘이었고, 숨기는 편이 나아 보였을 겁니다. **지금은 클릭 토글이라 숨길 이유가 없습니다.** 규칙을 지우고 왜 있었는지 주석으로 남겼습니다.

### 커리어 히어로

- `종합 커리어검사`를 30px로 제일 앞에.
- 제목과 검색어를 **2열**로: 왼쪽 `무엇을 탐색하는지부터 명확하게 고릅니다.`(46px), 오른쪽 `직업심리검사 / 진로검사 / 직업적성검사`(**44.6px — 같은 크기**). 900px 아래에서는 세로로 쌓고 작아집니다.
- **제목 규칙을 `h1` 태그에서 `.heroTitle` 클래스로 옮겼습니다.** 드로어에서는 같은 제목이 `h2`로 나가는데(홈의 `h1`을 하나로 유지하려고), 태그 선택자면 거기서 기본 `h2` 크기로 **작아집니다.** 사용자가 "글자 작아졌다"고 한 것이 이것입니다.
- SEO 3문단은 **맨 아래로** 옮겼습니다(`.seoLead`, 위에 구분선). 읽을 값어치는 있지만, **찾아온 도구 목록보다 먼저 나올 내용은 아닙니다.**
- 드로어는 `.inPanel`로 별도 처리합니다. 창이 넓어도 패널은 720px이라 미디어 쿼리가 도와주지 못합니다. **코덱스의 `.drawer` 레이아웃 블록은 계속 꺼둡니다** — 3열 정사각 카드는 사용자가 고른 것입니다.

### 확인

- 1440px: `종합 커리어검사` 30px, 제목 46px, 검색어 44.6px, **좌우 배치**, SEO 블록이 제목 아래, 검색어 **31/31**.
- 390px: 세로로 쌓임, 제목 38px, 검색어 19px, `scrollTo(9999,0)` 후 `scrollX 0`.
- 홈: `main` 1개, `h1`은 히어로 둘뿐, 가로 스크롤 없음.
- Files: `src/components/header-account.module.css`, `src/components/career-assessment-catalog.tsx`, `.module.css`.
- Validation: 713 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린.

## 2026-08-29 — Claude: 커리어 히어로 정리, 하단 설명 다시 씀

- Agent/session: Claude. 사용자 요청: 검색어를 세로 열이 아니라 오른쪽에 더 크게 / `현재 이용 가능한~`과 `무료 직업심리검사와 커리어 검사` 삭제 / 하단 문구를 더 자연스럽게.

### 히어로

- `직업심리검사 · 진로검사 · 직업적성검사`에서 강제 줄바꿈(`<br/>`)을 뺐습니다. **줄 세운 목록이 아니라 한 문구가 자연스럽게 접히는 모양**입니다.
- 크기 46px → **57.6px**(제목 46px보다 큽니다). 제목은 이 페이지가 무엇을 하는지 말하고, 이 문구는 **사람들이 실제로 친 말**이라 더 큽니다.
- 오른쪽 열을 `auto` → `1.05fr`로 넓혔습니다. 좁은 화면에서는 그대로 아래로 쌓입니다.
- `현재 이용 가능한 무아 커리어 탐색 도구와…`와 `무료 직업심리검사와 커리어 검사` 삭제. 히어로가 **머리말 · 제목 · 검색어** 셋만 남았습니다.

### 하단 설명

- 동의어를 나열하던 문단을 다시 썼습니다. **이름이 왜 여러 개인지**를 설명하는 쪽으로 바꿔서, 각 문장이 실제로 일을 합니다.
  - 1문단: 세 가지 질문 → 세 도구. 직업검사·진로검사·취업검사로 찾아온 사람에게 답하는 형태.
  - 2문단: **적성에 무게를 두면 ~적성검사, 성향에 무게를 두면 ~성향검사.** 진단·분석·테스트 계열도 같은 것을 가리킨다고 정리한 뒤 커리어프로파일로 연결.
  - 3문단: 표준화 검사가 아니라는 선긋기와, 그럼 무엇이냐에 대한 답.
- **검색어 31개는 그대로 전부 남아 있습니다**(`31/31` 확인).

### 확인

- 1440px: 제목 46px, 검색어 **57.6px**, 좌우 배치, 삭제한 두 문구 없음, 키워드 31/31.
- 390px: 세로로 쌓임, 제목 38px, 검색어 22px, 가로 스크롤 0.
- Files: `src/components/career-assessment-catalog.tsx`, `.module.css`.
- Validation: 713 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린.

## 2026-08-29 — Claude: 샘플 결과 화면 정리, 간편 입력에서 공고를 선택으로

- Agent/session: Claude. 사용자 요청 3건.
- Status: completed. 마이그레이션 없음.

### 샘플 결과 화면

- 상단 `완성본` 배지 삭제(문구와 배경 둘 다). 헤더에는 저장 버튼 셋만 남았습니다.
- 샘플에서 `전체 복사`·`DOCX 저장`·`TXT 저장`을 누르면 **안내가 뜨고 `내 자소서로 시작하기`(온보딩) 버튼**이 붙습니다.
- **버튼을 비활성으로 만들지 않았습니다.** 회색 버튼은 "이 기능이 고장났다"로 읽히고, 지금 필요한 말은 "이 화면이 데모다"입니다. 누르면 그렇게 말합니다.
- 안내는 헤더 바로 아래에 나옵니다. 방금 누른 버튼 옆이어야지, 스크롤해서 떠나온 페이지 맨 위면 안 됩니다.
- PRO 내용은 가리지 않습니다. 샘플의 목적이 **무엇을 받는지 보여주는 것**이라 모자이크는 목적과 반대입니다.

### 간편 입력 — 공고가 필수가 아니게

- 채용공고가 없으면 **진행 자체가 막혀** 있었습니다. 초안은 있는데 공고가 없는 사람에게는, 대조 없이 돌려주는 편이 아예 못 돌리는 것보다 낫습니다.
- 막는 대신 **무엇이 빠지는지 이름을 대고** 알립니다:
  - `채용공고가 없어 요구 역량과 경험을 맞춰보는 대조는 빠집니다.`
  - `이력서·경력기술서가 없어 자기소개서에 적힌 내용의 근거 확인은 빠집니다.`
- 자기소개서와 글자 수는 **여전히 필수**입니다. 그 둘이 없으면 분석할 대상 자체가 없습니다.
- Files: `src/components/result-workspace-complete.tsx`, `.module.css`, `src/domain/simple-intake-mapping.ts`(+test), `src/components/pro-input-page.tsx`, `.module.css`.
- Validation: 716 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린. 샘플에서 `전체 복사` → 안내 표시, 링크 `/onboarding` 확인.

## 2026-08-30 — Claude: 참고자료 총량 상한, 진행 확인 팝업

- Agent/session: Claude. 사용자 승인: 글자 수 제한 진행. 그리고 자료 부족 안내는 인라인이 아니라 팝업으로.
- Status: completed. **마이그레이션 미적용** — `npm run db:remote:push` 필요.

### 참고자료 총량 상한 — 원가 구멍

- 이용권은 `purpose = 'PRIMARY'`, 즉 **자기소개서만** 셌습니다. 공고·이력서·경력기술서·포트폴리오·기타 증빙은 **세지도 않고 상한도 없이** 모델로 갔습니다.
- 간편 입력이 자료 10개 + 기타 10개 × 5만 자를 받으므로, **PRO 한 건에 100만 자**가 실릴 수 있었습니다. 주문 하나에 원가가 판매가를 넘습니다.
- **올릴 수 있는 양은 그대로입니다.** 바뀐 것은 **모델까지 가는 양**이고, 돈이 나가는 곳은 거기입니다.

**두 가지 상한을 겁니다. 실패하는 방식이 다르기 때문입니다.**

| | 값 | 왜 |
|---|---|---|
| 문서 1개 | 20,000자 | 300쪽 포트폴리오 하나가 예산을 다 먹고 이력서를 밀어내면 안 됩니다 |
| 참고자료 총량 (QUICK) | 20,000자 | 자소서만 보는 상품이라 절반이면 충분 |
| 참고자료 총량 (PRO·FINAL) | 60,000자 | 공고 한 편 + 이력서 + 경력기술서를 넉넉히 담고 남습니다 |
| **무료 이용권** | 위의 **절반** | |

- **자기소개서는 자르지도 빼지도 않습니다.** 산 물건이고, 이미 이용권의 `allowed_characters`가 막고 있으며, 조용히 짧아진 자소서는 조용히 틀린 첨삭을 만듭니다.
- **무료 이용권도 자소서는 그대로입니다.** 자소서를 줄이면 추천 보상이 `친구가 결제한 것과 같은 상품의 이용권`이라는 **약속을 어기게 됩니다.** 원가의 대부분은 참고자료 쪽이라, 거기만 줄이면 됩니다.
- 결제 여부는 `billing_orders.amount > 0`으로 가립니다. 이용권은 금액 0짜리 주문을 만듭니다.
- 예산은 **중요한 자료부터** 씁니다: 공고 → 이력서 → 경력기술서 → 재첨삭 요청 → 포트폴리오 → 기타. **끝에서 떨어지는 것은 자격증 스캔**이지 공고가 아닙니다.
- Files: 신규 `supabase/migrations/20260830010000_reference_material_budget.sql`, `src/server/analysis/reference-budget-migration.test.ts`.

### 진행 확인 팝업

- 자료가 없을 때의 안내를 인라인 문구에서 **확인 대화상자**로 옮겼습니다.
- **입력하는 내내 페이지에 붙어 있는 안내는 한 번 읽히고 가구가 됩니다.** 마지막 단계에서 묻는 것이 행동을 바꿀 수 있는 유일한 자리입니다.
- `이대로 진행할까요?` / 빠지는 것 목록 / `자료 더 넣기` · `이대로 진행`.
- Files: `src/components/pro-input-page.tsx`, `.module.css`.
- Validation: 723 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린. `/pro/polish`에서 자소서만 넣고 시작 → 팝업 표시, 항목 2개, 버튼 2개 확인.

## 2026-08-30 — Claude: 동의 패널 접기 표시, 추천 집계 빈 상태

- Agent/session: Claude. 사용자 보고: `지워지지 않는 것도 있습니다` 근처가 깨져 보임.
- Status: completed. 마이그레이션 없음.

- `지워지지 않는 것도 있습니다`는 `<details>`인데 **펼침 표시가 없었습니다.** 그래서 뒤따라오는 추천 패널의 **주인 없는 제목**처럼 읽혔습니다. `▸` 표시와 hover를 붙여 **열 수 있는 줄**로 보이게 했습니다.
- 추천 집계가 `결제 대기 0명 / 지급 완료 0장`으로 **0 두 개만** 떠 있었습니다. **아무 말도 하지 않으면서 렌더링 오류처럼 보입니다.** 기록이 없을 때는 `아직 추천 기록이 없습니다. 친구가 코드를 넣고 결제하면 여기에 표시됩니다.`로 바꿨습니다.
- **로그인 상태가 아니라 정확히 같은 화면은 재현하지 못했습니다.** 위 둘이 원인이 아니라면 스크린샷이 필요합니다.
- Files: `src/components/research-consent.module.css`, `src/components/referral-panel.tsx`, `.module.css`.
- Validation: 723 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린.

## 2026-08-30 — Claude: 연구 활용 동의를 시작 직전 강제 선택으로

- Agent/session: Claude. 사용자 승인. 요청은 "기본 체크"였으나 그것은 하지 않았습니다.
- Status: completed. 마이그레이션 없음(기존 `set_research_consent` RPC 사용).

### 기본 체크를 하지 않은 이유

- 선택 항목에 **미리 체크된 상자는 유효한 동의가 아닙니다.** 그리고 **분쟁을 못 버티는 동의는 없는 것만 못합니다** — 그 아래 모은 사본을 전부 지워야 하니까요.
- 진짜 문제는 체크박스가 아니라 **위치**였습니다. 동의 요청이 **결과 화면 맨 아래**에 있어 거기까지 스크롤한 소수만 봤고, 그래서 수집이 0건이었습니다.

### 대신 한 것 — 기본값 없는 강제 선택

- 시작 버튼 바로 위에 **둘 중 하나를 반드시 고르는** 블록을 넣었습니다. 고르기 전에는 **`결제하고 분석 시작`이 비활성**입니다.
  - `익명 사본을 서비스 개선에 써도 좋습니다`
  - `사용하지 않겠습니다` — **결과와 기능은 완전히 같습니다**
- **기본 선택이 없습니다.** 미리 고른 답은 동의가 아닙니다.
- **거절도 한 번의 클릭으로 끝납니다.** 거절이 더 번거로우면 자유로운 선택이 아닙니다.
- 스크롤 끝까지 간 소수가 아니라 **결제하는 전원이 결정**합니다. 그리고 그 결정이 기록으로 남습니다.
- 이미 **같은 문구에** 답한 사람에게는 다시 묻지 않습니다. 문구(버전)가 바뀌면 다시 묻습니다 — 버전을 두는 이유가 그것입니다.
- 요청이 막히거나 오프라인이면 **가로막지 않고 통과**시킵니다. 그건 지원자 문제가 아니고, 결제와 분석 사이에 서 있을 일이 아닙니다.
- 결과 화면의 기존 동의 패널은 **그대로 둡니다.** 거기서 언제든 바꾸고 철회할 수 있고, 철회하면 보관 사본도 함께 지워집니다.
- Files: 신규 `src/components/research-consent-gate.tsx`, `.module.css`, `.test.ts`; 수정 `src/components/application-case-handoff.tsx`, `.module.css`.
- Validation: 729 tests passed (+6), `tsc` clean, `eslint` 0건, `next build` 클린.

## 2026-08-30 — Claude: 동의를 한 줄 체크로 (강제 선택 철회)

- Agent/session: Claude. 사용자: 두 칸짜리 강제 선택은 별로다, 심플한 체크 하나에 누르면 내용이 열리게.
- Status: completed. 마이그레이션 없음.

- 카드 두 장 → **체크 한 줄 + `자세히` 펼침**으로 바꿨습니다.
  `☐ 익명 사본을 서비스 개선에 써도 좋습니다        자세히 ▾`
- **시작 버튼을 더 이상 막지 않습니다.** 강제 선택을 뺐으므로 동의는 순수한 선택입니다.
- **미리 체크하지 않는 것은 그대로입니다.** 선택 항목에 미리 체크된 상자는 유효한 동의가 아니고, 분쟁을 못 버티는 동의는 그 아래 모은 사본을 전부 지워야 합니다.
- 설명 네 줄은 접어 뒀습니다. **결제 버튼 위의 정책 네 줄은 아무도 읽지 않고**, 결정보다 화면만 무거워 보이게 만듭니다.
- 버튼이지만 `role="checkbox"` + `aria-checked`를 붙여 스크린리더에도 체크박스로 읽힙니다.

### 남는 사실

- 강제 선택이면 결제하는 **전원이** 결정합니다. 지금은 **체크한 사람만** 동의합니다. **동의 수는 강제 선택 쪽이 확실히 많습니다.**
- 그래도 결과 화면 맨 아래에 있던 것보다는 훨씬 많이 보입니다 — 위치를 옮긴 것이 원래 고치려던 문제였습니다.
- Files: `src/components/research-consent-gate.tsx`, `.module.css`, `.test.ts`, `src/components/application-case-handoff.tsx`, `.module.css`.
- Validation: 729 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린.

## 2026-08-30 — Claude: 동의 체크가 초록 덩어리로 깨지던 이유

- Agent/session: Claude. 사용자: UI가 깨진다, 색 필요 없고 `자세히`도 한 카드 안에, 얇은 네모칸만.
- Status: completed. 마이그레이션 없음.

### 원인 — 부모가 안쪽 버튼을 전부 칠하고 있었습니다

```css
.action button{width:100%;padding:12px;background:#176b4a;color:#fff;font-size:9px;font-weight:900}
```

- 결제 영역(`application-case-handoff.module.css`)의 이 규칙이 **`.action` 안의 모든 `button`**에 걸립니다. 제 체크박스와 `자세히`가 그 안에 있어서 **초록 전체폭 블록 두 개**가 됐습니다.
- 제 규칙이 진 이유는 특정도입니다: `.check`(클래스 1)는 `.action button`(클래스 1 + 요소 1)에 밀립니다.
- **모든 선택자에 `.gate`를 붙였습니다.** `.gate .check`는 클래스 2라 이깁니다. `:disabled`도 같은 이유로 `.gate .check:disabled`(클래스 3)로 올렸습니다.

### 모양

- 배경색·강조색 없앴습니다. **흰 바탕에 얇은 테두리 한 겹**뿐입니다.
- `자세히`는 **같은 카드 안에서** 펼쳐집니다. 별도 박스가 아닙니다.
- 여백을 줄여 한 줄 높이로 얇게.
- Files: `src/components/research-consent-gate.module.css`.
- Validation: 729 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린. 빌드된 CSS에서 `.gate .check` 규칙 출력 확인.
- **로그인 상태에서만 보이는 화면이라 눈으로는 확인하지 못했습니다.** 아직 깨져 보이면 스크린샷이 필요합니다.

## 2026-08-30 — Claude: 자세히 문구 축약, 회색 버튼이 이유를 말하게

- Agent/session: Claude. 사용자: `자세히` 내용은 "개인정보를 삭제하고 데이터만 활용됩니다"가 낫다. 그리고 `결제하고 분석 시작`이 왜 비활성인지.
- Status: completed. 마이그레이션 없음.

### 비활성 원인 — 동의 체크가 아닙니다

- 조건은 `disabled={busy || !guest}`입니다. **동의 체크는 버튼을 막지 않습니다**(강제 선택을 뺄 때 같이 뺐습니다).
- `guest`는 **그 탭의 `sessionStorage`에 있는 작성본**입니다. `/analysis/prepare`를 주소로 직접 열거나 새 탭에서 열면 **작성본이 없어 비활성**입니다.
- **회색 버튼이 이유를 말하지 않는 것이 진짜 문제였습니다.** 이 세션에서 같은 종류를 여러 번 고쳤는데 여기 하나가 남아 있었습니다.
- 이제 이유와 나갈 길을 함께 씁니다: `이 탭에 저장된 작성본이 없습니다. … 작성 화면으로 가기`.

### 자세히 문구

- 요청대로 줄였습니다: `개인정보를 삭제하고 데이터만 활용됩니다. 이름·연락처·주소는 지우고, 회사명·직무·기간·성과 수치만 남깁니다.`
- 두 번째 줄(거절해도 동일 / 철회 시 사본 삭제)은 남겼습니다. **동의를 받는 화면에서 그 두 문장을 빼면 동의의 조건이 사라집니다.**
- Files: `src/components/research-consent-gate.tsx`, `src/components/application-case-handoff.tsx`, `.module.css`.
- Validation: 729 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린.

## 2026-08-30 — Claude: 체크 두 개 중 하나를 골라야 진행

- Agent/session: Claude. 사용자: 체크 두 개로 만들고 하나를 골라야 진행되게. 문구는 `데이터베이스 활용` / `없이 진행하기`.
- Status: completed. 마이그레이션 없음.

```
☐ 데이터베이스 활용   ☐ 없이 진행하기            자세히 ▾
```

- 하나를 고르기 전에는 **`결제하고 분석 시작`이 비활성**이고, 그 아래에 `위에서 하나를 골라 주세요.`가 나옵니다.
- **기본 선택은 없습니다.** 미리 고른 답은 선택 항목에서 유효한 동의가 아니고, 분쟁을 못 버티는 동의는 그 아래 모은 사본을 전부 지워야 합니다.
- **거절도 똑같이 한 번의 클릭입니다.** 거절이 더 번거로우면 자유로운 선택이 아닙니다.
- 상자 하나짜리로는 급한 사람이 전부 지나칩니다. 두 개면 **결제하는 전원이 답하고**, 그 답이 기록으로 남습니다.
- 색은 없습니다. 흰 바탕에 얇은 테두리 하나, `자세히`는 같은 카드 안에서 펼쳐집니다.
- 상호 배타 선택이므로 `role="radiogroup"` + `aria-checked`입니다.
- Files: `src/components/research-consent-gate.tsx`, `.module.css`, `.test.ts`, `src/components/application-case-handoff.tsx`.
- Validation: 730 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린. **로그인 상태에서만 보이는 화면이라 눈으로는 확인하지 못했습니다.**

## 2026-08-30 — Claude: 체크 두 개 한 줄로 되돌리고 설명 두 문장으로

- Agent/session: Claude. 사용자: 분절 토글 말고 아까 것(같은 줄, 색 없이)이 맞다. 설명도 줄일 것.
- Status: completed. 마이그레이션 없음.

```
☐ 데이터 활용   ☐ 활용하지 않기                       자세히 ▾
```

- 분절 토글을 만들었다가 **되돌렸습니다.** 사용자 판단대로 체크 두 개가 이 화면에는 맞습니다.
- 선택 표시는 **먹색**입니다. 이건 취향 설정이고, **그 아래 결제 버튼이 화면의 유일한 초록으로 남아야** 합니다.
- 설명은 네 문장 → **두 문장**:
  - `개인정보를 삭제하고 데이터만 활용됩니다.`
  - `활용하지 않아도 결과는 완전히 같고, 언제든 철회하실 수 있습니다.`
- **두 번째 문장은 남겼습니다.** 그게 선택의 조건입니다 — 없으면 거절이 손해처럼 보이고, **거절하기 무서운 선택은 선택이 아닙니다.**
- Files: `src/components/research-consent-gate.tsx`, `.module.css`, `.test.ts`.
- Validation: 730 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린.

## 2026-08-30 — Claude: 동의 설명에 이유 한 줄 추가

- Agent/session: Claude. 사용자 제안 문구: `데이터가 쌓일수록 합격 자소서가 완성됩니다.`
- Status: completed. 마이그레이션 없음.

- 들어간 문구: **`데이터가 쌓일수록 합격 자소서의 기준이 선명해집니다.`**
- 제안 그대로가 아니라 **`기준`을 넣었습니다.** 동의 패널 안에서 결과(합격 자소서 자체)를 약속하면, **나중에 그 동의가 흔들릴 때 그 문장이 근거가 됩니다.** 유인이 과하면 자유로운 동의로 보지 않습니다.
- 같은 조심은 이미 관리자 화면에도 적혀 있습니다: **"이 문장이 합격률을 몇 % 높인다"는 말은 표본이 충분히 커지기 전까지 쓰지 않습니다.** 동의 화면만 예외일 이유가 없습니다.
- **기준이 선명해지는 것은 사실이고, 그것으로 충분합니다.** "우리가 데이터를 쓰겠다"보다 "당신 덕에 기준이 좋아진다"가 훨씬 잘 눌립니다.
- 테스트로 고정했습니다: `합격 자소서의 기준이 선명해집니다`는 있어야 하고, 결과를 약속하는 원래 표현은 없어야 합니다.
- Files: `src/components/research-consent-gate.tsx`, `.test.ts`.
- Validation: 730 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린.

## 2026-08-30 — Claude: 한도·형식을 FAQ에 정리

- Agent/session: Claude. 사용자 제안: 제한·조건·확장자가 어디에도 모여 있지 않으니 `/new` FAQ에 넣자.
- Status: completed. 마이그레이션 없음.

### 왜 필요했나

- 파일 형식·개수·용량, 자소서 분량, 참고자료 분량이 **코드에만 있고 손님이 볼 곳이 없었습니다.** 막히고 나서야 알게 되는 규칙은 규칙이 아니라 함정입니다.

### 추가한 항목 3개

- **`파일은 몇 개까지, 어떤 형식으로 올릴 수 있나요`** — PDF·DOCX·TXT·MD, ZIP은 풀어서 읽음, 중복 제외, 최대 20개·총 50MB·파일당 10MB. **형식이 안 맞는 파일만 빼고 나머지는 진행**하며 어떤 파일이 왜 빠졌는지 이름이 나온다는 것까지.
- **`글자 수 제한은 어떻게 되나요`** — 세 한도가 **서로 다른 것을 본다**는 점을 먼저 말하고 나눠 적었습니다: ① 자소서 분량(8,000 / 30,000) ② 문항별 목표 글자 수(기본 700, 공고에 적힌 값 우선) ③ 함께 올린 자료(문서당 20,000, 총 PRO·FINAL 60,000 / QUICK 20,000). **자기소개서는 어떤 경우에도 잘리지 않는다**는 문장으로 닫았습니다.
- **`무료 이용권도 똑같이 되나요`** — 첨삭은 완전히 동일하고 참고자료 분량만 절반. 무료 이용권을 받은 사람이 가장 먼저 궁금해할 질문입니다.
- 자리는 `한글 파일(HWP)` 다음입니다. 형식 이야기가 이미 거기 있어서 같은 묶음으로 읽힙니다.
- Files: `src/app/new/page.tsx`.
- Validation: 730 tests passed, `tsc` clean, `eslint` 0건, `next build` 클린. `/new#faq` 항목 8개, 가로 넘침 없음 확인.

## 2026-08-30 — Claude: 출력 토큰 상한 (원가의 나머지 절반)

- Agent/session: Claude. 사용자 승인.
- Status: completed. 마이그레이션 없음(코드에서 요청에 붙습니다).

### 왜

- 입력은 DB에서 막았는데 **출력은 어디에도 상한이 없었습니다.** 그리고 **돈은 출력 쪽에 있습니다** — 프런티어 모델은 출력 단가가 입력의 여러 배입니다.
- 지금까지 출력을 묶어준 것은 **프롬프트의 모양뿐**이었습니다. 그건 한도가 아니라 기대입니다.

### 어떻게 — 자기소개서 길이를 따라갑니다

```
출력 상한 = 자소서 글자수 × 1.1(토큰) × 2.5(결과/자소서 비율) × (FINAL이면 1.45)
바닥 12,000 / 천장 120,000
```

- **참고자료는 세지 않습니다.** 5만 자 포트폴리오가 답변을 길게 만들지는 않습니다. 그건 입력 원가이고 이미 막혀 있습니다.
- **결과/자소서 2.5배**: 결과에는 고친 답변만이 아니라 문장별 피드백, 수정 이유, 준비도 요약, 핵심 개선점 3개, 요구사항 대조, 예상 질문이 함께 들어갑니다.
- **바닥 12,000**: 한 문단짜리 QUICK도 **유효한 JSON을 닫아야** 합니다. 결제한 결과가 문서 중간에서 잘리는 것이 몇천 토큰 낭비보다 훨씬 나쁜 실패입니다.
- **천장 120,000**: 목표가 아니라 정지선입니다. PRO 자소서 전량(30,000자)이 약 82,000이므로 **정상 사용으로는 닿지 않습니다.** 프롬프트가 돌거나 모델이 같은 말을 반복할 때 청구가 끝없이 늘어나는 것을 막습니다.
- 토큰 환산은 **비관적으로** 잡았습니다(1자 = 1.1토큰). 여기서 적게 잡으면 결제한 결과가 잘립니다.
- 두 호출 경로(동기·background) 양쪽에 붙였습니다.

### 재시도 3회는 줄이지 않았습니다

- `attempt_count >= 3`은 **실패했을 때만** 쓰입니다. 성공한 런은 `status <> 'PENDING'`이라 다시 시작되지 않습니다.
- 줄이면 **두 번 실패한 사람이 갇힙니다.** 그리고 출력 상한이 붙었으므로 **재시도 한 번의 원가도 같이 내려갔습니다.** 3회는 그대로 두는 것이 맞습니다.
- Files: 신규 `src/server/ai/quick/output-budget.ts`(+test); 수정 `src/server/ai/quick/openai-responses-gateway.ts`.
- Validation: 735 tests passed (+5), `tsc` clean, `eslint` 0건, `next build` 클린.
## 2026-08-30 — Codex: career login visual refinement

- Agent/session: Codex (`feature/codex-plan`).
- Change: refined the standalone career login screen with the one-line title `검사 결과, 계속 이어보기`, a profile-entry card, outcome-retention benefits, and clearer sign-in controls.
- Boundary: Google and email magic-link flows, redirect validation, and data handling were not changed.
- Files: `src/app/career/login/page.tsx`, `src/app/career/login/page.module.css`.
- Validation: `npm run typecheck` and `npm run lint`.
- Rollback: revert only the login page and CSS visual changes.
## 2026-08-30 — Codex: career-home AI interpretation CTA

- Agent/session: Codex (`feature/codex-plan`).
- Change: added a full-width, low-height AI interpretation card at the bottom of the career home. Its message and button reflect whether all three local assessment results are present.
- Boundary: it does not execute AI, charge the user, fabricate an interpretation, or change the assessment scoring. Guest users are routed to login before the preparation screen.
- Files: `src/components/career-public-home.tsx`, `src/components/career-public-home.module.css`.
- Validation: `npm run typecheck`, `npm run lint`.
- Rollback: remove the `aiCta` section and its scoped CSS only.
## 2026-08-30 — Codex: AI interpretation scope selection

- Agent/session: Codex (`feature/codex-plan`).
- Change: emphasized the career-home AI interpretation CTA and added a scope chooser on the signed-in AI preparation page. It offers a three-assessment combined interpretation only after all three results are present, alongside available single-assessment preparation paths.
- Boundary: the page remains a launch-preparation screen; it does not run an AI model, charge the user, or claim an interpretation is already generated.
- Files: `src/components/career-public-home.tsx`, `src/components/career-public-home.module.css`, `src/components/career-ai-preparation.tsx`, `src/components/career-ai-preparation.module.css`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning.
- Rollback: remove the `aiCta`, `choiceSection`, and `choiceGrid` additions only.
## 2026-08-30 — Codex: plain-language deep-interpretation flow

- Agent/session: Codex (`feature/codex-plan`).
- Change: simplified the career-home CTA into one prominent `심층해설 확인하기` action. Rewrote the preparation screen in plain Korean, placed the combined interpretation first, showed available individual interpretations vertically, and explained the intended result summary, cross-result comparison, and job-posting review prompts.
- Boundary: completion duration is not collected or interpreted. The feature does not diagnose, judge ability, predict hiring outcomes, run a model, or charge the user; it remains a launch-preparation flow.
- Files: `src/components/career-public-home.tsx`, `src/components/career-public-home.module.css`, `src/components/career-ai-preparation.tsx`, `src/components/career-ai-preparation.module.css`.
- Validation: `npm run typecheck`, `npm run lint`.
- Rollback: remove the CTA and preparation-copy/style changes only.
## 2026-08-30 — Codex: standalone work-style deep-interpretation entry

- Agent/session: Codex (`feature/codex-plan`).
- Change: moved the work-style result’s deep-interpretation action out of the secondary action stack, removed the decorative Sparkles icon, and made it a distinct full-width primary action. Updated the individual AI-preparation headline to `AI 전문가 심층 해설 / 평가표 분석 받아보기`.
- Boundary: no assessment answers, scoring, login behavior, AI execution, payment, or result persistence changed.
- Files: `src/components/work-style-result.tsx`, `src/components/work-style-assessment.module.css`, `src/components/career-ai-preparation.tsx`.
- Validation: `npm run typecheck` and `npm run lint` passed.
- Rollback: remove the `deepInterpretation` link/CSS and restore the previous individual-preparation headline only.
## 2026-08-30 — Codex: assessment-drawer parity and visible auth state

- Agent/session: Codex (`feature/codex-plan`).
- Change: made the desktop homepage assessment drawer use the same three-column card sizing as `/career/assessments`, rather than its previous enlarged one-column presentation. The career header now checks the real Supabase session and shows `내 프로필` plus `로그아웃` for a signed-in user.
- Boundary: this does not change assessment scoring, account-result persistence, database schema, or OAuth provider settings. Existing temporary browser-only results remain temporary.
- Files: `src/components/career-assessment-catalog.module.css`, `src/components/career-layout-shell.tsx`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only.
- Rollback: restore the drawer’s one-column override and the prior static login link only.
## 2026-08-30 — Codex: RIASEC beta disclosure and O*NET original-track gate

- Agent/session: Codex (`feature/codex-plan`).
- Change: made the Korean interest-result screen explicitly state `RIASEC 6 areas · MOOA beta`, name the six-area reference, and state that it is not the official O*NET original. Recorded the agreed rollout sequence and the original-English implementation gate in the validation plan. Reverted the just-added drawer three-column override at the user’s request; the narrower overlay keeps its prior one-column layout.
- Boundary: no O*NET item text, scoring, translation, API call, account data, or Korean-adaptation claim was added. An English original cannot be exposed as an operational test until the official widget/API or unmodified source package and attribution surface are connected.
- Files: `src/components/career-interest-result.tsx`, `src/components/career-assessment-catalog.module.css`, `docs/career-assessment-validation-plan.md`.
- Validation: `npm run typecheck` and `npm run lint` passed.
- Rollback: restore the prior RIASEC section copy and remove the dated validation-plan section only.
## 2026-08-30 — Codex: standalone interest deep-interpretation entry

- Agent/session: Codex (`feature/codex-plan`).
- Change: moved the interest-result deep-interpretation action out of the secondary action stack, removed the Sparkles icon, and made it the separate full-width primary action used on the work-style result.
- Boundary: no RIASEC scoring, result data, login state, AI execution, or payment behavior changed.
- Files: `src/components/career-interest-result.tsx`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only.
- Rollback: restore the previous first action-stack link only.
## 2026-08-30 — Codex: interest result save-and-restore path

- Agent/session: Codex (`feature/codex-plan`).
- Change: added a filtered authenticated latest-result API query and connected `/career/interest/result` to fall back to the user’s latest saved interest scores when the same-tab temporary answers are absent. The result now provides an explicit account-save entry; it does not silently upload answers.
- Data/privacy: only the already-authenticated account can query its RLS-protected rows. The result screen restores calculated scores only, not raw answers, and uses current display copy. Saving remains a deliberate user action at `/career/profile/save`.
- Files: `src/app/api/career-assessments/latest/route.ts`, `src/components/career-interest-result.tsx`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; local `/career/interest/result` returned HTTP 200. Authenticated remote save/restore still requires the existing migration to be applied to the target Supabase project.
- Rollback: remove the API query parameter branch and restore the local-session-only interest-result component.
## 2026-08-30 — Codex: values-result re-entry and account-save affordances

- Agent/session: Codex (`feature/codex-plan`).
- Change: made the values result use the standalone icon-free deep-interpretation action and added the explicit account-save route. When an in-tab values result exists, `/career/values` now offers `이전 결과 다시 보기` or `새로 탐색하기`; the career home’s completed assessment cards now return directly to their corresponding local result page.
- Boundary: no saved-server result restoration for values was added in this step; existing values answers remain current-tab data until the user explicitly saves them. No scoring, data schema, or AI behavior changed.
- Files: `src/components/career-values-result.tsx`, `src/components/career-values-reflection.tsx`, `src/components/career-public-home.tsx`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; `/career`, `/career/values`, and `/career/values/result` returned HTTP 200.
- Rollback: restore the values action stack and start-only intro; remove resultHref/completed-card routing from career home.
## 2026-08-30 — Codex: approved recovery of career public home

- Agent/session: Codex (`feature/codex-plan`).
- Status: active recovery.
- Protected baseline: `HEAD` version of `src/components/career-public-home.tsx` plus the session’s already-agreed deep-interpretation CTA and completed-result routing changes.
- Change and reason: a PowerShell reserved-variable collision corrupted the working copy of the home component. The user explicitly approved recovery. Restored from the current commit and re-applied only the known session changes: the full-width `심층해설 확인하기` CTA and local completed-assessment links to their result routes.
- Files: `src/components/career-public-home.tsx`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; `/career` returned HTTP 200.
- Rollback/recovery reference: `HEAD:src/components/career-public-home.tsx` is the protected committed baseline; current additions are limited to `resultHref`, `completedAssessmentIds`, and `aiCta`.
- User decision: user explicitly approved the recovery in this task.
## 2026-08-30 — Codex: career profile save layout repair

- Agent/session: Codex (`feature/codex-plan`).
- Change: removed the nested save page’s viewport-based horizontal padding and full-viewport height. It now uses the existing career shell’s constrained content width, preventing the save UI from collapsing into a narrow vertical column.
- Boundary: styles only; no storage, login, API, or result behavior changed.
- Files: `src/components/career-profile-save.module.css`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; `/career/profile/save` returned HTTP 200.
- Rollback: restore the former `.page` rule only.
## 2026-08-30 — Codex: authenticated automatic assessment saving

- Agent/session: Codex (`feature/codex-plan`).
- Change: added a shared result-storage notice. A signed-in user who completes an assessment now has its response automatically posted once to the existing authenticated assessment API, with a session-scoped duplicate guard. A guest sees that the result is temporary in this browser and gets a direct login-and-keep-results action. Removed the redundant manual save action from interest and values result screens.
- Data/privacy: no guest response is uploaded. The existing RLS-protected API receives data only after `auth.getUser()` confirms a signed-in user. A result restored from the account is not uploaded again.
- Files: `src/components/career-assessment-storage-notice.tsx`, `src/components/career-assessment-storage-notice.module.css`, `src/components/career-interest-result.tsx`, `src/components/work-style-result.tsx`, `src/components/career-values-result.tsx`.
- Validation: `npm run typecheck` and `npm run lint` passed; all three local result routes returned HTTP 200. Authenticated write/read verification still requires the target Supabase project to have the existing career-assessment migration applied.
- Rollback: remove the storage-notice component/imports and restore the two manual save links only.
## 2026-08-30 — Codex: automatic-save in-flight guard

- Agent/session: Codex (`feature/codex-plan`).
- Change: strengthened the shared automatic-save flow so concurrent render instances await one in-flight save promise instead of creating duplicate assessment sessions; all instances receive the resulting saved/error state.
- Files: `src/components/career-assessment-storage-notice.tsx`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; three result routes returned HTTP 200.
- Rollback: replace the in-flight promise map with the prior session-scoped guard; no stored data needs migration.
## 2026-08-30 — Codex: deep-path AI interpretation preparation redesign

- Agent/session: Codex (`feature/codex-plan`).
- Change: replaced the pale preparation screen with the user-provided Stitch-inspired dark SaaS workspace: analysis-scope controls and practical report contents on the left, with a premium-style yet disabled launch-preparation package card on the right.
- Safety/content boundary: adapted only layout and visual language. Omitted the reference’s unsupported claims about model accuracy, job matching, trend prediction, automatic learning use, price, and payment. The card explicitly says that neither payment nor an AI call runs yet.
- Files: `src/components/career-ai-preparation.tsx`, `src/components/career-ai-preparation.module.css`.
- Validation: `npm run typecheck` and `npm run lint` passed; `/career/ai?scope=combined` and `/career/ai?scope=interest` returned HTTP 200.
- Rollback: restore the prior AI-preparation component and CSS; no data flow, database, or API behavior was changed.
## 2026-08-30 — Codex: full DeepPath-style AI interpretation page shell

- Agent/session: Codex (`feature/codex-plan`).
- Change: expanded the prior AI-preparation restyle into the whole AI route: an independent dark product shell with its own top navigation, centered hero, full-width responsive report workspace, information cards, package panel, trust notice, and footer. The career layout now intentionally skips its standard light header on `/career/ai` only, so the two visual systems do not overlap.
- Boundary: existing scope links, completion checks, login gate, and disabled no-payment/no-AI-call state remain unchanged. No accuracy, matching, prediction, price, payment, or training claims were added.
- Files: `src/components/career-ai-preparation.tsx`, `src/components/career-ai-preparation.module.css`, `src/components/career-layout-shell.tsx`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; `/career/ai?scope=combined` returned HTTP 200.
- Rollback: restore the preceding AI-preparation component/CSS and remove only the `/career/ai` layout-shell condition; no data or API behavior changed.
## 2026-08-30 — Codex: interest deep-interpretation sample report

- Agent/session: Codex (`feature/codex-plan`).
- Change: added an interactive `심층해설 예시 보기` toggle to the completed 직업흥미 AI interpretation page. It expands a three-part sample report showing result reading, experience connection, and job-post review criteria.
- Safety/content boundary: the panel is visibly labeled as an example and states that it is neither the current user’s result nor an actual recommendation. It uses no API call, payment, new storage, or inferred user fact.
- Files: `src/components/career-ai-preparation.tsx`, `src/components/career-ai-preparation.module.css`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; `/career/ai?scope=interest` returned HTTP 200.
- Rollback: remove the sample state, button, sample section, and associated CSS only.
## 2026-08-30 — Codex: AI interpretation route and standalone sample report

- Agent/session: Codex (`feature/codex-plan`).
- Change: changed the career-home bottom `심층해설 확인하기` CTA to open `/career/ai?scope=interest` directly. Replaced the inline interest sample with the standalone `/career/ai/sample?scope=interest` report page, and made all `/career/ai/*` routes use the independent dark AI shell.
- Product decision documented: the new `docs/career-ai-interpretation-flow.md` distinguishes the implemented free-result/selection/sample UI from the future authenticated material-selection, entitlement/payment, server AI run, and stored real report flow.
- Safety/content boundary: the report remains an explicitly labeled example subject, not a user result or recommendation. No checkout, payment, external AI call, upload, or persistent data operation was introduced.
- Files: `src/components/career-public-home.tsx`, `src/components/career-layout-shell.tsx`, `src/components/career-ai-preparation.tsx`, `src/components/career-ai-preparation.module.css`, `src/components/career-ai-sample-report.tsx`, `src/components/career-ai-sample-report.module.css`, `src/app/career/ai/sample/page.tsx`, `docs/career-ai-interpretation-flow.md`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; `/career`, `/career/ai?scope=interest`, and `/career/ai/sample?scope=interest` returned HTTP 200.
- Rollback: restore the previous CTA href and remove the sample page/component/styles; no data migration required.
## 2026-08-30 — Codex: two-page AI interpretation result example

- Agent/session: Codex (`feature/codex-plan`).
- Change: used the newly supplied Stitch reference as page **1 / 2** of the standalone interest interpretation example: a dark summary dashboard with example RIASEC distribution, interpretation starting point, evidence/response-quality boundaries, and next actions. Kept the previously built narrative report as page **2 / 2**, with links in both directions.
- Product/documentation: extended `docs/career-ai-interpretation-flow.md` with the paid-value hypothesis (cross-assessment synthesis, user-provided evidence, uncertainty signaling, follow-up questions, and application connection) and the boundary that MOOA does not replace an clinical professional.
- Safety/content boundary: intentionally omitted the reference’s unsupported matching percentages, top-percentile claims, user name, “career DNA”, fixed job recommendations, and time-based personality inference. Both pages are clearly labeled example data.
- Files: `src/components/career-ai-sample-overview.tsx`, `src/components/career-ai-sample-overview.module.css`, `src/components/career-ai-sample-report.tsx`, `src/components/career-ai-sample-report.module.css`, `src/app/career/ai/sample/page.tsx`, `src/components/career-ai-preparation.tsx`, `docs/career-ai-interpretation-flow.md`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; the AI selection page and sample pages 1/2 both returned HTTP 200.
- Rollback: remove the overview component/CSS and restore the sample page route to the prior single report; no data or API changes were made.
## 2026-08-30 — Codex: direct Korean type/strength/role example report

- Agent/session: Codex (`feature/codex-plan`).
- Change: rewrote the page-1 example report’s abstract Korean narrative. The top now leads with an explicit example type code (`ISA`, 탐구·사회·예술), a plain-language behavioral summary, and immediately visible cards for strengths to evidence, environments to check carefully, and role areas to explore.
- Product boundary: role areas are labeled exploration starting points, not ranked job matches; “주의할 환경” replaces a fixed weakness claim. This UI is example data only and does not infer any current user trait.
- Documentation: updated the interpretation-flow value proposition to include concise type/strength/watch-out/role exploration before detailed application connection.
- Files: `src/components/career-ai-sample-overview.tsx`, `src/components/career-ai-sample-overview.module.css`, `docs/career-ai-interpretation-flow.md`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; `/career/ai/sample?scope=interest` returned HTTP 200.
- Rollback: restore the preceding overview component/CSS and the prior documentation bullet; no data/API changes were made.
## 2026-08-30 — Codex: page-one light editorial report treatment

- Agent/session: Codex (`feature/codex-plan`).
- Change: changed only the first AI interpretation example page from the dark dashboard treatment to a white/soft-green editorial report. Its type code, strengths, environment watch-outs, and role exploration cards remain, while the detailed second page remains dark.
- Reason: user reported that the dense dark treatment made the newly added content look broken and requested a white first page.
- Files: `src/components/career-ai-sample-overview.module.css`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; `/career/ai/sample?scope=interest` returned HTTP 200.
- Rollback: remove the final light-theme override block from the module CSS; no behavior/data changes.
## 2026-08-30 — Codex: dynamic RIASEC exploration type labels

- Agent/session: Codex (`feature/codex-plan`).
- Change: added pure `getInterestProfile` domain logic. The ordered top three RIASEC areas form one of 120 exploration codes; the leading ordered pair selects one of 30 human-readable MOOA exploration labels. The basic interest result now shows this code, label, and direct Korean one-line summary. Page-one example now displays its label and stacks strengths/watch-out/role-exploration content vertically.
- Product boundary: these are MOOA’s own exploration labels, not a copied 16Personalities system, standardized personality types, job-fit ranking, or diagnosis. Role areas remain comparison prompts, not recommendations.
- Files: `src/domain/career-interest.ts`, `src/domain/career-interest.test.ts`, `src/components/career-interest-result.tsx`, `src/components/career-ai-sample-overview.tsx`, `src/components/career-ai-sample-overview.module.css`, `docs/career-ai-interpretation-flow.md`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; `npm test -- career-interest.test.ts` passed (2 tests); interest result and sample overview returned HTTP 200.
- Rollback: remove `getInterestProfile` and its result hero usage; no stored assessment data or schema changes.
## 2026-08-30 — Codex: compact vertical career-exploration report sections

- Agent/session: Codex (`feature/codex-plan`).
- Change: removed Sparkles/AI-cross-style icons from the AI selection and both example report pages. Narrowed page-one strengths/watch-out/role content to a 760px vertical report flow. Added separate example sections for role options, industry options, a career path, and conditional learning/credential candidates.
- Credential boundary: SQLD is shown only for a selected data/analysis path and 직업상담사 2급 only for a selected career/employment-service path; both require current official eligibility/schedule and real job-post checks. No credential is inferred as necessary from a RIASEC result.
- Documentation: added the display policy for role/industry/path/credential exploration to `docs/career-ai-interpretation-flow.md`.
- Files: `src/components/career-ai-preparation.tsx`, `src/components/career-ai-sample-overview.tsx`, `src/components/career-ai-sample-overview.module.css`, `src/components/career-ai-sample-report.tsx`, `docs/career-ai-interpretation-flow.md`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; `npm test -- career-interest.test.ts` passed (2 tests); AI selection and sample pages 1/2 returned HTTP 200.
- Rollback: remove the exploration section and final CSS overrides, restoring the prior compact sample view; no data/API changes.

## 2026-08-31 — Claude: 코덱스 `feature/codex-plan` 병합 (커리어 검사/AI 리포트)

- Agent/session: Claude. 사용자 요청("코덱스 워크트리에서 신규기능 추가한것만 병합").
- Status: merged into `main`.
- 대상: `92a8a20`(assessment profiles + AI report previews), `3a4fe96`(career login layout isolation). 코덱스 워크트리 미커밋 0건 — 진행 중인 작업을 가로채지 않았습니다.
- 충돌 2건과 해결:
  - `docs/agent-change-log.md` — 양쪽 모두 덧붙이기만 했으므로 **양쪽을 전부 보존**했습니다. 코덱스의 홈 오버레이 드로어 기록에는 제목이 없어 제목을 달아 살렸고, 같은 항목에 대해 두 번 적힌 제목/Rollback 줄만 한 벌로 정리했습니다. 삭제한 기록은 없습니다.
  - `src/components/career-layout-shell.tsx` — add/add. 코덱스 것이 main 것을 **포함한 상위 버전**(로그아웃 + `/career/ai` 예외 처리 추가)이라 코덱스 판을 채택했습니다. main 판의 기능 중 빠진 것은 없습니다.
- 제외: `docs/reference/career-scroll-captures-20260825/` 스크린샷 7장(약 35MB). 사용자 결정 — 저장소 이력에 영구히 남아 이후 모든 clone이 내려받게 되므로 소스만 받았습니다. 원본은 코덱스 워크트리에 그대로 있습니다.
- Files: `src/app/career/**`, `src/components/career-*`(AI 샘플 개요/리포트, 저장 안내, 흥미·가치·업무성향 결과), `src/domain/career-interest.ts`(+test), `src/app/api/career-assessments/latest/route.ts`, `docs/career-ai-interpretation-flow.md`.
- Validation: 736 tests passed (109 files), `tsc` clean, `eslint` 0 errors(기존 경고 2건 유지), `next build` 클린.
- Rollback: `git revert -m 1 <merge commit>`. 스크린샷이 다시 필요하면 `feature/codex-plan`에서 해당 디렉터리만 체크아웃하면 됩니다.

## 2026-08-31 — Claude: ChatGPT 차별화 지적 기록 (문서만)

- Agent/session: Claude. 사용자 요청("md 저장하고싶은데 그리고 니생각도 궁금").
- Status: 문서 추가만. 코드/스키마/프롬프트 변경 없음.
- Change: 신규 `docs/chatgpt-and-pro-differentiation-2026-08-31.md`. 사용자가 가져온 "챗GPT에 파일 3개 올린 것과 같지 않나" 지적을 보존하고, `analysis.ts`/`result-document.ts` 스키마와 대조한 결과와 Claude의 판단을 덧붙였습니다.
- 확인된 사실: 제안된 6단계 공정 중 ②~⑥은 이미 스키마에 존재(`requirementMatchSchema`, `documentConflictSchema`, `issueSchema.category`, `evidenceSchema`). ①(공고 명시/추정 분리)만 미구현.
- Files: `docs/chatgpt-and-pro-differentiation-2026-08-31.md`.
- Rollback: 파일 삭제.

## 2026-08-31 — Claude: 공고 요구사항을 '적힌 것 / 읽어낸 것'으로 분리

- Agent/session: Claude. 사용자 요청 및 판단 반영(2026-08-31 대화).
- Status: main에 적용. 마이그레이션 없음.
- 배경: [`chatgpt-and-pro-differentiation-2026-08-31.md`](./chatgpt-and-pro-differentiation-2026-08-31.md)의 유일한 실제 잔여 작업. `requirementMatches`가 공고에 그대로 적힌 요구(`Excel 활용 가능자`)와 담당업무에서 읽어낸 역량(`협업`)을 한 목록에 섞어 내보내, 해석이 사실처럼 보였습니다.
- 사용자 판단(중요): 읽어낸 항목은 **버릴 추측이 아니라 값어치가 가장 큰 쪽**입니다. 공고에 단어가 없으니 대부분의 지원자가 답하지 않고, 그래서 채우면 차이가 벌어집니다. 또 `AI 판단` 배지는 차갑게 읽힙니다.
- 그래서 채택한 방식: 배지 대신 **판단이 나온 공고 문장을 그대로 인용**합니다. 정직성은 인용이 담당하고, 화면은 변명이 아니라 근거 제시로 읽힙니다. 두 번째 묶음의 제목도 "확인 필요"가 아니라 "채우면 차이가 가장 크게 벌어집니다"로 씁니다.
- Files:
  - `src/domain/result-document.ts` — `requirementMatchSchema`에 `origin: "stated" | "inferred"`(기본 `stated`), `postingQuote: string | null`(기본 `null`) 추가. 기존에 저장된 결과는 전부 `stated`로 읽혀 예전과 똑같이 한 목록으로 그려집니다. `ResultRequirementMatch` 타입 export 추가.
  - `src/server/ai/quick/prompt.ts` — 지시 3줄 추가(그대로 적힌 것만 stated / inferred는 postingQuote 필수, 인용 못 찾으면 항목 제외 / inferred를 덜 중요하게 다루지 말 것).
  - `src/components/result-workspace-complete.tsx` — `RequirementMatches`, `RequirementCards` 분리. inferred가 0개면 예전과 동일하게 한 목록.
  - `src/components/result-workspace-complete.module.css` — `.matchGroups`, `.quoted` 추가(기존 규칙 수정 없음).
  - `src/fixtures/result-document.ts` — 견본에 stated 2개 + inferred 2개.
- 보호: `result-workspace-{claude,codex}-restored`, `result-workspace-v2`, `final-verification`은 건드리지 않았습니다.
- Validation: 743 tests passed (+7), `tsc` clean, `eslint` 0 errors, `next build` 클린, `/result/sample` 공고·경험 분석 탭 육안 확인(두 묶음 표시, 인용 줄 `grid-column 1/3`).
- Rollback: 이 커밋 revert. 스키마 기본값이 있어 되돌려도 저장된 결과는 그대로 파싱됩니다.

## 2026-08-31 — Claude: 연구 동의 저장 실패가 결제를 막던 문제

- Agent/session: Claude. 사용자 제보("데이터활용 누르니 저장하지 못했습니다").
- Status: main에 적용. 마이그레이션 없음.
- 증상: `/analysis/prepare`에서 동의 버튼을 누르면 "저장하지 못했습니다. 다시 눌러 주세요."만 뜨고, `onDecided`가 호출되지 않아 **결제 버튼이 계속 비활성**이었습니다. 즉 동의 저장이 깨지면 아무도 결제를 못 합니다.
- 조사한 것: `research_consents` 스키마, `set_research_consent` 함수 정의 두 벌(`20260824050000`, `20260824060000`), `RESEARCH_CONSENT_VERSION`(10자, 한도 40) 모두 정상. 클라이언트가 `error`를 버리고 있어 **원인을 특정할 수 없는 상태**였습니다. 원격 DB 적용 여부는 확인하지 못했습니다(로컬 셸에 Supabase 토큰 없음).
- Change 1 — 실패해도 진행: 실패 경로에서 `onDecided(true)`를 호출합니다. 수집은 동의 테이블을 읽으므로 **기록하지 못한 동의는 어느 쪽 답이든 수집 안 함으로 닫힙니다.** 결제를 막아서 지키는 것이 없고, 잃는 것은 판매입니다.
- Change 2 — 이유 표시: `error.code · error.message`를 화면과 `console.error`에 남깁니다. 함수 부재나 제약 위반에 "다시 눌러 주세요"는 틀린 안내입니다. 다시 눌러도 고쳐지지 않습니다.
- Files: `src/components/research-consent-gate.tsx`, `.module.css`, `.test.ts`.
- Validation: 745 tests passed (+2), `tsc` clean, `eslint` 0 errors, `next build` 클린.
- 남은 확인: 사용자가 다시 눌러 화면에 뜨는 에러 코드를 알려주면 근본 원인(원격 마이그레이션 미적용 여부 등)을 특정할 수 있습니다.
- Rollback: 이 커밋 revert.

## 2026-08-31 — Claude: 오탈자를 별도 주석 유형으로 분리

- Agent/session: Claude. 사용자 요청(A 항목 마무리).
- Status: main에 적용. 마이그레이션 없음.
- 배경: 오탈자는 `polish`("다듬으면 깔끔해지는 사소한 부분") 안에 섞여 있었고, polish는 **문항당 2개 제한**이라 문단 길이 불균형 같은 취향 문제와 자리를 다퉜습니다. 제출된 자소서의 맞춤법 오류는 취향 문제가 아닙니다.
- Change: `resultOriginalAnnotationSchema.type`에 `"typo"` 추가(7번째). 기존 6개 유형은 그대로입니다.
  - 정의: 맞춤법, 띄어쓰기, 조사 오용, 회사명·직무명 표기처럼 **맞고 틀림이 분명한** 오류.
  - 개수 제한 없음. 찾은 만큼 전부.
  - **오탐 방지:** 회사명·제품명·학과명·업계 용어·고유명사는 틀려 보여도 건드리지 말 것. 없는 오탈자를 지적하면 맞는 표현을 틀리게 고치게 만듭니다.
  - 범위는 틀린 낱말 하나만. 문장 전체를 덮으면 그 문장의 진짜 문제가 가려집니다.
  - `suggestion` 없는 typo는 금지(무엇으로 고칠지 없는 지적은 쓸모가 없습니다).
- Files: `src/domain/result-document.ts`(enum 1개 추가), `src/server/ai/quick/prompt.ts`(정의·규칙 3줄), `src/components/result-workspace-complete.tsx`(라벨 `오탈자`), `.module.css`(밑줄 물결 표시 3줄 추가, 기존 규칙 수정 없음), `prompt.test.ts`.
- Validation: 748 tests passed (+3), `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert. 저장된 결과에 `typo`가 없으므로 되돌려도 파싱이 깨지지 않습니다.

## 2026-08-31 — Claude: PGRST303(만료된 토큰)을 고칠 수 있는 안내로

- Agent/session: Claude. 사용자 제보(`PGRST303 · JWT issued at future`).
- Status: main에 적용. 마이그레이션 없음.
- 진단: **코드 버그 아님.** 브라우저에 저장된 로그인 토큰의 `iat`(발급 시각)이 서버 시각보다 미래라 PostgREST가 거부합니다. 확인한 것:
  - Supabase는 호스팅(`*.supabase.co`), 로컬 인스턴스 아님.
  - 현재 PC 시계는 서버와 **+2초**로 정상. 즉 지금이 아니라 **로그인 당시** 시계가 앞서 있었고, 그때 받은 토큰이 남아 있는 상태입니다.
  - `research_consents` 스키마, `set_research_consent` 정의, `RESEARCH_CONSENT_VERSION` 모두 정상이었습니다(앞선 조사).
- 범위 주의: 이 토큰은 **모든 인증 호출**에 쓰입니다. 동의 저장만이 아니라 지원 건 저장(`/api/application-cases`)·이용권 조회도 같이 실패합니다. 해결은 **로그아웃 후 재로그인** 하나뿐입니다.
- Change: `describeFailure()` 추가. `PGRST303`/`PGRST301`/메시지에 `jwt`가 있으면 "로그인 세션이 만료되었습니다. 로그아웃 후 다시 로그인하면 해결됩니다."로 바꿔 보여줍니다. 그 밖의 오류는 코드를 그대로 노출합니다(고치는 사람에게 필요한 유일한 정보).
- Files: `src/components/research-consent-gate.tsx`, `.test.ts`.
- Validation: 750 tests passed (+2), `tsc` clean, `eslint` 0 errors, `next build` 클린.
- 남은 확인: 재로그인 후 동의 저장이 실제로 되는지, 그리고 `/meensoo/research` 보관 사본 수가 늘어나는지.
- Rollback: 이 커밋 revert.

## 2026-08-31 — Claude: 연구 동의 저장을 서버 라우트로 이동

- Agent/session: Claude. 사용자 제보 후속(동의 저장 401 지속).
- Status: main에 적용. 마이그레이션 없음. **기존 RPC `set_research_consent`는 그대로 둡니다**(결과 화면의 `research-consent.tsx`가 아직 사용).
- 조사 결과(모두 정상으로 확인됨): PC 시계 서버와 +2초 / 토큰 `iat` 미래 아님(발급 후 20분 경과분도 실패) / 서명키 `kid`가 JWKS와 일치(ES256) / REST 익명 조회 200 / auth·rest 노드 시계 동일 / 세션 갱신 미들웨어 없음. **원인 미확정.** 브라우저가 사용자 JWT로 PostgREST를 직접 부르는 경로에서만 401이 납니다.
- 판단: 체크박스 하나를 위해 원인 추적을 더 끌 이유가 없습니다. 이 앱의 다른 중요한 쓰기는 **전부 서버 라우트 + 서비스 키**로 처리되고 그쪽은 정상입니다. 예외였던 이 경로를 나머지와 같게 맞췄습니다.
- Files:
  - 신규 `src/server/research/research-consent-repository.ts` — 서비스 키로 `research_consents` upsert/조회. 철회 시 최초 동의 시각은 보존(기록이므로).
  - 신규 `src/app/api/research-consent/route.ts` — `GET`(현재 답), `POST`(저장). **소유자는 요청 본문이 아니라 `auth.getUser()`로 확인한 세션에서만** 가져옵니다.
  - `src/components/research-consent-gate.tsx` — `supabase.rpc`/`from` 제거, `fetch("/api/research-consent")`로 교체. 브라우저 Supabase 클라이언트 의존 없음.
  - `.test.ts` — 옮겨간 위치 기준으로 갱신.
- 이전 시도 되돌림: "로그아웃 후 다시 로그인하면 해결됩니다" 안내는 **추측이었고 사실이 아니었습니다**(재로그인·신규 토큰·20분 경과 토큰 모두 동일 실패). 제거하고 서버가 준 코드·메시지를 그대로 노출합니다.
- 남은 위험: **같은 경로를 쓰는 곳이 5군데 더 있습니다** — `credit-wallet.tsx`, `application-case-handoff.tsx:92`(이용권 사용), `referral-panel.tsx`, `referral-code-entry.tsx`, `redeem-client.tsx`, `application-tracker-card.tsx`, `app/result/page.tsx`. 지금 전부 같은 이유로 실패할 수 있습니다. 별도 작업으로 옮겨야 합니다.
- Validation: 752 tests passed, `tsc` clean, `eslint` 0 errors, `next build`에 `/api/research-consent` 등록 확인.
- Rollback: 이 커밋 revert. RPC를 지우지 않았으므로 되돌리면 이전 동작으로 그대로 복귀합니다.

## 2026-08-31 — Claude: 분석이 도는 중에 결제·동의를 다시 묻던 화면

- Agent/session: Claude. 사용자 제보("분석시작 후에도 데이터활용 체크가 눌러진다").
- Status: main에 적용. 마이그레이션 없음.
- 증상: `/analysis/prepare`는 진행 표시를 **화면 맨 위**에 두고 결제 구역을 그 아래 **계속 렌더**합니다. 그래서 분석이 도는 중에도 동의 체크와 `결제하고 분석 시작`이 살아 있었습니다. 눌러도 진행 중인 분석에는 아무 영향이 없는데, 바로 그 점이 "영향이 있을지도 모른다"처럼 읽힙니다.
- 구조상 이유: 무료 이용권 경로는 `savedCaseId`를 세우지 않고 `onCreditRunStarted`로 올려보내고, 결제 경로는 Polar에서 돌아와 새로 마운트되므로 결제 구역의 지역 상태로는 알 수 없었습니다. 진행 여부를 아는 것은 `QuickCheckoutReturn` 하나뿐입니다.
- Change:
  - `QuickCheckoutReturn`에 `onRunActive` 콜백 추가. `phase`가 `waiting`/`analyzing`일 때만 true. **`failed`는 false** — 실패한 분석은 다시 결정할 수 있어야 재시도가 됩니다.
  - `AnalysisPreparation`이 그 신호를 받아 `runActive || Boolean(creditRunId)`로 결제 구역에 내려줍니다(두 경로 모두 포함).
  - `ApplicationCaseHandoff`: 진행 중이면 시작 버튼 비활성 + 문구를 `분석이 진행 중입니다`로.
  - `ResearchConsentGate`: `locked`면 버튼 대신 **고른 답을 한 줄 기록으로** 표시. 철회 경로(`결과 화면에서 언제든 바꾸실 수 있습니다`)를 함께 적어 동의 철회 가능성을 유지합니다.
- Files: `src/components/quick-checkout-return.tsx`, `analysis-preparation.tsx`, `application-case-handoff.tsx`, `research-consent-gate.tsx`, `.module.css`(`.settled` 3줄 추가), `research-consent-gate.test.ts`.
- Validation: 756 tests passed (+4), `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert. 추가된 prop은 모두 선택값이라 되돌려도 호출부가 깨지지 않습니다.

## 2026-08-31 — Claude: 첨삭 전에 문항별 현재 분량을 보여줍니다

- Agent/session: Claude. 사용자 제보(완성된 자소서를 첨부로 넣고 기본값 700자로 돌렸더니 원문이 간추려짐).
- Status: main에 적용. 마이그레이션 없음.
- 문제: 간편 입력 화면은 `모든 문항 700자 기준으로 봅니다`까지만 말하고 **원문이 지금 몇 자인지는 어디에도 없었습니다.** 그래서 설정처럼 읽히고 결과처럼 읽히지 않습니다. 완성된 자소서를 올린 사람이 기본값을 그대로 두면 절반 가까이 잘리는데, 잘릴 것이라는 신호가 화면에 없었습니다.
- 판단: 줄이는 것 자체는 정당한 요청입니다(`LENGTH_INTEGRITY_RULE`과 같은 입장). **문제는 줄이기를 요청했다는 사실이 안 보이는 것**입니다.
- Change: `planQuestionLengths()` — 문항별 `현재 자수(공백 제외) / 목표 / 감소율`. `describeLengthLoss()` — 25% 이상 줄어드는 문항이 있을 때만 경고하고, 지키는 방법(글자 수 올리기, 제목 뒤 `(1200자)`)을 함께 말합니다. 다듬는 수준은 경고하지 않습니다(경고를 무시하도록 훈련시키지 않기 위해).
- 이미 있던 것과의 관계: 제목 뒤 `(800자)` 표기를 읽는 `readTargetLengthMarker`, 극단적으로 긴 답변을 잡는 `describeOverLongAnswer`는 그대로입니다. 이번 것은 **분석 전에** 보여주는 쪽입니다.
- 없는 기능(사용자 질문에 대한 답): 첨부한 공고나 자소서 파일에서 글자 수 제한을 **자동으로 읽어 목표를 조정하는 기능은 없습니다.** 사용자가 직접 적은 `(800자)` 표기만 반영됩니다.
- Files: `src/domain/simple-intake-mapping.ts`(+test), `src/components/simple-intake.tsx`, `.module.css`(`.plans`/`.loss` 추가), `pro-input-page.tsx`.
- Validation: 761 tests passed (+5), `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-08-31 — Claude: 간편 입력 머리말과 글자 수 칸 정리

- Agent/session: Claude. 사용자 요청("칸 너무 넓다 · 빈 공간 많음 · 머리말 좀 더 세련되게").
- Status: main에 적용. 문구·스타일만. 동작 변경 없음.
- 글자 수 칸: 라벨·입력·결과를 세로로 쌓던 것을 **한 줄 3열 그리드**로 눕혔습니다. 높이 **78px → 53px**(1.25배 zoom 보정값). 좁은 화면에서는 2열로 접힙니다.
- 안내 문구를 한 칸에 몰아 넣었습니다: 초안이 없을 때는 `(800자)` 표기 안내를, 있을 때는 `모든 문항 700자 기준으로 봅니다`를 보여줍니다. 둘 중 그 시점에 쓸모 있는 쪽만 남깁니다. `(800자)` 표기는 정작 필요한 순간(분량이 많이 줄 때) `describeLengthLoss`가 다시 말해 줍니다.
- 문구 축약: `그 문항은 적힌 값을 씁니다. 공고에 제한이 없다면 기본값 그대로 두셔도 됩니다.` 삭제(기본값이 있다는 사실이 이미 그 뜻입니다).
- 머리말: 꽉 찬 진초록 알약 + 900 굵기 → 연한 초록 배경 + 800. 제목 19px → 18px, 본문 12.5px/1.8 → 12px/1.7, 여백 축소.
- Files: `src/components/simple-intake.tsx`, `.module.css`.
- Validation: 761 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린, `/pro/polish`에서 높이·한 줄 여부 실측.
- Rollback: 이 커밋 revert.

## 2026-08-31 — Claude: 간편 입력 머리말에서 배지 제거

- Agent/session: Claude. 사용자 요청("굳이 한번에넣기 저 ai 아이콘 이런거 없어도될듯"). 참고: `stitch_modern_career_type_insight.zip`(사용자 제공 시안 — 현재 화면을 영문으로 다시 그린 것).
- Status: main에 적용. 마크업·스타일만.
- Change: `한 번에 넣기` 배지와 `Sparkles` 아이콘 제거. 제목이 바로 상자 첫 줄이 됩니다. 배지가 빠졌으므로 `.boxHead h3`의 위쪽 여백을 0으로 내렸습니다. 쓰지 않게 된 `.badge` 규칙 2줄과 `Sparkles` import도 함께 정리했습니다(제거된 요소만 겨냥한 것으로, 다른 스타일은 건드리지 않았습니다).
- 결과: 머리말 높이 52px. 제목 + 한 줄 설명만 남습니다.
- 시안 대조: 시안의 글자 수 칸도 한 줄 구성이라 앞 커밋(`b89e782`)과 일치합니다. 시안에 남아 있는 배지는 현재 화면을 옮겨 그린 것이라 채택하지 않았습니다.
- Files: `src/components/simple-intake.tsx`, `.module.css`.
- Validation: 761 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린, `/pro/polish`에서 배지 부재·높이 실측.
- Rollback: 이 커밋 revert.

## 2026-08-31 — Claude: 분석 진행 중 동의 문구 완전 제거

- Agent/session: Claude. 사용자 판단("법적으로 필수 아니고 그냥 감춰도 될 것 같다").
- Status: main에 적용. 앞 커밋(`e9f578e`)의 잠금 표시 방식을 바꿉니다.
- 이전 동작: 분석이 도는 중 `데이터 활용에 동의하셨습니다 / 결과 화면에서 언제든 바꾸실 수 있습니다`를 한 줄 기록으로 남겼습니다.
- 바뀐 동작: `locked`면 **아무것도 그리지 않습니다.**
- 근거: 요구되는 것은 **동의를 철회할 수 있는 것**이지 모든 화면이 철회 가능함을 반복하는 것이 아닙니다. 철회 경로는 결과 화면 `최종 첨삭본` 탭의 `<ResearchConsent />`에 그대로 있고(`result-workspace-complete.tsx:665`), 이 줄이 있든 없든 유지됩니다. 이미 끝난 결정을 진행 중인 분석 위에 다시 적는 것은 읽을 거리만 늘립니다.
- 결제 버튼 잠금(`분석이 진행 중입니다`)과 실패 시 해제는 그대로입니다.
- Files: `src/components/research-consent-gate.tsx`, `.module.css`(`.settled` 4줄 제거), `.test.ts`(철회 경로가 결과 화면에 남아 있는지 검사하도록 변경).
- Validation: 761 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-08-31 — Claude: 결과 화면 동의 항목 축소 + 서버 경유

- Agent/session: Claude. 사용자 제보(빈 목록으로 깨져 보임 + "최소만 남기고 간단하게, 결제 전 페이지처럼").
- Status: main에 적용. 마이그레이션 없음.
- 깨져 보인 것: `지워지지 않는 것도 있습니다` 아래 세 항목이 비어 보이는 문제. `REDACTION_LIMITS` 값은 정상입니다(3개 문장 존재). 닫힌 `<details>`를 복사하면 본문이 빠지는 브라우저 동작으로 보입니다. 어느 쪽이든 접기 방식을 직접 만든 것으로 바꿔 재현 여지를 없앴습니다.
- Change 1 — 서버 경유: `supabase.rpc("set_research_consent")` / `.from("research_consents")` 직접 호출을 `/api/research-consent`로 교체했습니다. **오늘 하루를 먹은 경로가 정확히 이것**이고, 같은 행을 읽는 컴포넌트가 둘인데 한쪽만 옮겨져 있었습니다.
- Change 2 — 축소: 제목 + 본문 + 불릿 4개 + `<details>` 구성을 **체크박스 한 줄 + `자세히` 접기**로 줄였습니다. 결제 전 화면(`ResearchConsentGate`)과 같은 형태입니다. 설명은 결제 전에 이미 했고, 이 자리는 답을 **바꾸는** 곳입니다. 완성된 첨삭과 추천 코드 사이에서 화면 하나를 차지하고 있었습니다.
- 유지한 것: `REDACTION_LIMITS`(지워지지 않는 것)는 접힌 안쪽에 그대로 둡니다. 빼면 그 위의 약속이 실제보다 강해집니다. 철회 시 기존 사본 삭제 문구도 유지.
- 동작 변경: 지금 문구에 답한 적이 없거나 비로그인이면 렌더하지 않습니다(이전에는 비로그인만 숨김). 결제 전에 이미 묻고 저장하므로 결과 화면에는 **바꿀 답이 있을 때만** 나옵니다.
- Files: `src/components/research-consent.tsx`(재작성), `.module.css`(재작성), `research-consent-gate.test.ts`(+3).
- Validation: 761 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert. RPC는 남아 있어 되돌려도 동작합니다.

## 2026-08-31 — Claude: 결과 화면 동의 항목 추가 축소

- Agent/session: Claude. 사용자 요청("체크만 냅둬도 된다 · 설명 너무 많다 · 서비스개선데이터활용 문구만").
- Status: main에 적용. 앞 커밋(`fec94e6`)을 더 줄입니다.
- Change: 체크 문구 `이 지원서를 익명 사본으로 서비스 개선에 활용` → **`서비스 개선 데이터 활용`**. 접힌 설명은 문단 2개 + `REDACTION_LIMITS` 3항목 → **문단 2개**로.
- `REDACTION_LIMITS` 목록 제거에 대한 판단: 목록은 `개인정보를 지운 사본`이라는 약속의 **단서**였습니다. 단서만 지우면 약속이 실제보다 강해지므로, **약속 자체를 실제 크기로 줄여** 적었습니다 — `이름·연락처·주소를 지우고 보관합니다. 회사명·기간·성과는 분석에 필요해 남습니다.` 목록을 지우면서 약속을 그대로 뒀다면 그것이 문제였을 것입니다.
- **미해결 위험(사용자에게 보고함): 개인정보처리방침 페이지가 없습니다.** `REDACTION_LIMITS`(소속이 특정하면 사람이 좁혀질 수 있다 등)는 제품 안에서 이 화면이 유일한 고지였고, 이제 어디에도 없습니다. 상수는 `src/domain/deidentify.ts:154`에 그대로 두었으니 방침 페이지를 만들 때 그대로 씁니다. 국내 서비스는 개인정보처리방침 게시가 법적 의무이므로 **런칭 전 필수 항목**입니다.
- Files: `src/components/research-consent.tsx`, `.module.css`(`.detail ul/li` 제거), `research-consent-gate.test.ts`.
- Validation: 764 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-08-31 — Claude: 개인정보처리방침 신설 + 결과 화면 문구 두 건

- Agent/session: Claude. 사용자 요청(방침 "알아서 완벽히 만들고 푸터에" · 동의 문구 축약 · 공고 없을 때 직관적으로).
- Status: main에 적용.
- **신규 `/privacy`**: 11개 절. 수집 항목 / 이용 목적 / 보관 기간 / 처리위탁 / 제3자 제공 / 연구 활용(선택) / 쿠키 / 이용자 권리 / 안전성 조치 / 보호책임자 / 변경.
  - 내용은 **코드에서 확인한 사실만** 적었습니다. 처리위탁 목록(Supabase·OpenAI·Polar·Cloudflare·Resend·Google·Microsoft Clarity)은 실제 코드에서 확인. 결제 수단 정보는 Polar가 받고 우리 서버를 지나지 않는다는 점, 비밀번호를 저장하지 않는다는 점(이메일 링크·Google 로그인만) 명시.
  - 국외 이전 안내 포함(서버가 국외에 있으므로 필수).
  - 보관 기간은 법정 기간만 특정: 결제·환불 5년(전자상거래법), 접속기록 3개월(통신비밀보호법). 그 외는 탈퇴 시 파기.
  - `REDACTION_LIMITS`가 여기로 돌아왔습니다. 앞 커밋에서 결과 화면에서 뺐을 때 제품 안에서 사라졌던 고지입니다.
  - 푸터(`src/app/page.tsx`)와 `sitemap.ts`에 추가.
- **결과 화면 동의 접기**: 두 문단 → 한 줄(`이름·연락처·주소를 지우고 회사명·기간·성과 등이 저장됩니다.`) + 방침 링크. 무불이익 고지와 철회 시 삭제 약속은 **방침 6번으로 이동**했습니다 — 선택 동의라 어딘가에는 반드시 있어야 하지만 매번 읽힐 필요는 없습니다.
- **공고 없을 때 문구**: `채용공고 내용이 충분하지 않아 대조하지 못했습니다` → `대조할 채용공고가 없습니다. 이 항목은 공고의 요구사항을 지원서·지원자료와 하나씩 맞춰 보는 자리라, 공고가 없으면 볼 것이 없습니다.` 없는 것을 "부족하다"로 말하면 무엇이 문제인지 알 수 없습니다.
- Files: 신규 `src/app/privacy/page.tsx`, `page.module.css`; 수정 `src/app/page.tsx`(푸터 링크), `sitemap.ts`, `research-consent.tsx`, `.module.css`, `result-workspace-complete.tsx`, `research-consent-gate.test.ts`.
- Validation: 767 tests passed (+3), `tsc` clean, `eslint` 0 errors, `next build`에 `/privacy` 정적 생성 확인.
- Rollback: 이 커밋 revert.

## 2026-08-31 — Claude: 입력 화면에 총 글자 수 한도 표시

- Agent/session: Claude. 사용자 질문("최대 8000자라도 5항목 2000자씩이면 이미 넘는데, 항목당 한도 필요 없나?").
- Status: main에 적용.
- 확인한 사실: **총량 한도는 이미 있고 자동 처리됩니다.** `QUICK_INCLUDED_LIMIT_CHARS = 8,000`(초과분은 `QUICK_EXTRA_BLOCK_CHARS = 7,000`자당 `2,900원` 자동 추가 견적), `PRO_INCLUDED_LIMIT_CHARS = 30,000`. 문항당 한도도 이미 있습니다 — `targetLength`가 100~3,000자.
- 문항당 **입력** 한도는 두지 않기로 판단: 문항 수가 사람마다 3개에서 8개까지 다르고, 총량으로 재는 것이 맞습니다. 문항당 한도를 두면 한 문항이 유난히 긴 지원서가 총량에 여유가 있는데도 막힙니다.
- 그런데 **입력 화면이 한도를 한 번도 말하지 않았습니다.** `공백 제외 0자`로 현재 분량만 보여주고 몇 자까지 되는지는 어디에도 없어, 넘기고 있는 줄 모른 채 넘길 수 있었습니다.
- Change: 하단 카운터를 `공백 제외 N / 30,000자`로 바꾸고, 넘으면 색으로 표시합니다. 붙여넣은 글과 자기소개서 파일을 **같은 방식으로 합산**합니다(한도는 넣은 경로를 가리지 않습니다). 첨부 자료는 이 한도가 아니라 참고자료 예산으로 따로 잘리므로 세지 않습니다.
- **미해결(사용자 판단 필요): PRO에서 30,000자를 넘기면 결제 후 `ACTIVE_ENTITLEMENT_NOT_FOUND`로 실패합니다.** QUICK처럼 초과 블록 과금이 없고, 오류 문구도 "이용권을 찾을 수 없음"이라 원인을 알 수 없습니다. 선택지는 (가) PRO에도 초과 블록 과금 (나) 입력 화면에서 제출 차단 (다) 오류 문구만 개선. 가격 정책이 걸려 있어 결정 전까지 손대지 않았습니다.
- Files: `src/components/simple-intake.tsx`, `.module.css`, `pro-input-page.tsx`, `simple-intake-mapping.test.ts`.
- Validation: 768 tests passed (+1), `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-08-31 — Claude: PRO·FINAL 초과 글자 수 과금

- Agent/session: Claude. 사용자 결정("1번 ㄱㄱ 초과과금").
- Status: main에 적용. 마이그레이션 없음.
- 문제: PRO·FINAL은 30,000자를 넘으면 **결제는 되고 분석은 `ACTIVE_ENTITLEMENT_NOT_FOUND`로 실패**했습니다(DB가 `allowed_characters >= snapshot_characters`를 봅니다). 돈은 나가고 결과는 없으며, 오류 문구로는 원인을 알 수 없었습니다. QUICK은 이미 초과 블록을 팔고 있었는데 PRO에만 그 문이 없었습니다.
- Change: `PRO_EXTRA_BLOCK_CHARS = 10,000`, `PRO_EXTRA_BLOCK_PRICE_KRW = 3,900`. `createProCheckoutQuote`·`createFinalCheckoutQuote`가 QUICK과 같은 방식으로 초과 블록을 계산하고 `allowedCharacters`를 늘립니다.
- **가격 근거(사용자 확인 필요):** PRO 포함 단가는 12,900 / 30,000 = 자당 0.43원. 10,000자면 4,300원이 비례가이지만, 이미 그 등급을 결제한 사람이 조금 더 넣는 것이므로 그보다 낮은 **3,900원**으로 잡았습니다. QUICK의 7,000자당 2,900원(자당 0.414원)과도 나란합니다. 다른 값을 원하시면 상수 두 개만 바꾸면 됩니다.
- 결제 반영 확인: `polar-checkout.ts:50`이 `priceAmount: input.quote.totalPriceKrw`를 씁니다. 즉 견적을 고치면 실제 청구액이 따라갑니다(표시만 바뀌는 것이 아님).
- 입력 화면: 한도를 넘으면 `· 초과분은 결제 시 추가됩니다`를 붙입니다. 막히는 것이 아니라 값이 붙는다는 뜻이므로, 경고가 아니라 안내로 씁니다.
- Files: `src/domain/usage-entitlement.ts`(+test 5건), `src/components/simple-intake.tsx`.
- Validation: 773 tests passed (+5), `tsc` clean, `eslint` 0 errors, `next build` 클린.
- 테스트가 지키는 것: `allowedCharacters >= totalCharacters`(견적이 실제 분량을 덮지 못하면 결제 후 실패가 다시 생깁니다), 초과 단가가 포함 단가보다 낮을 것.
- Rollback: 이 커밋 revert.

## 2026-08-31 — Claude: 애매한 자료 분류는 비워 두고 진행을 막습니다

- Agent/session: Claude. 사용자 요청 및 승인(분류 오류로 결제한 분석이 실패한 건 조사 후).
- Status: main에 적용. **첨삭 프롬프트·분석 로직은 건드리지 않았습니다.** 분류 규칙과 입력 화면만입니다.
- 원인(실측): 사용자의 경력 파일 `[복사] ...채용대행,아웃소싱... 전_jeonmeensoo.pdf`가 파일명 규칙의 **단독 `채용`**에 걸려 `JOB_POSTING`으로 분류됐습니다. 채용공고는 `NON_EVIDENCE_KINDS`라 근거에서 제외되므로, 그 파일에만 있던 경력(`청년맞춤형제작소`)을 모델이 인용하자 검사기가 `INVALID_EVIDENCE`로 전체 실패시켰습니다. **검사기는 설계대로 동작했고, 잘못된 것은 분류입니다.**
  - 앞선 보고에서 "AI가 지어낸 표현"이라고 한 것은 **오진이었습니다.** 셸 인코딩 때문에 검색어가 깨진 채로 조회했습니다. 코드값으로 다시 조회하니 해당 문서에 11회 등장합니다.
- Change 1 — 파일명 규칙: 단독 `채용` 제거. `채용대행·채용마케팅·채용담당`이 본인 서류 이름에 흔합니다. `공고`는 유지했습니다 — `현대차공고.pdf`처럼 회사명에 붙는 쪽이 훨씬 흔하고 본인 서류에는 거의 안 옵니다(기존 테스트가 이를 잡아냈습니다).
- Change 2 — 어긋나면 고르지 않음: `UNSET` 종류 추가. 파일명 추정과 내용 추정이 **서로 다르면** 한쪽을 고르지 않고 비워 둡니다(`basis: "conflict"`).
- Change 3 — 비어 있으면 진행 차단: `UNSET`은 어느 분류 통에도 안 들어가 **제출하면 그 파일이 조용히 빠집니다.** 잘못 고르는 것보다 나쁩니다. 시작 버튼을 막고 사유를 표시합니다.
- Change 4 — 화면: 해당 줄을 붉게 표시, 목록 아래 경고 한 줄, 그리고 **긴 안내문을 말풍선으로 이동**(채용공고는 참고만 하고 첨삭에 인용하지 않는다는 설명 포함).
- Files: `src/domain/document-classify.ts`(+test 7건), `src/components/simple-intake.tsx`, `.module.css`, `pro-input-page.tsx`.
- Validation: 780 tests passed (+7), `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert. `UNSET`은 새 값이라 기존 저장 데이터에 영향이 없습니다.
- 남은 제안(미실행): 근거가 제외된 문서에만 있을 때 결과 전체를 버리지 말고 그 근거 한 줄만 버리는 안전망. 사용자 확인 후 진행.

## 2026-08-31 — Claude: 분류 안내 말풍선이 열리지 않던 문제

- Agent/session: Claude. 사용자 제보("물음표는 생겼는데 눌러도 올려놔도 아무것도 안 나온다").
- Status: main에 적용. CSS 한 줄 범위.
- 원인: 이 모듈에는 화면 위쪽 도움말이 쓰는 `.tooltip`이 이미 있고, 그쪽은 **`opacity: 0; visibility: hidden`**으로 숨깁니다. 새로 만든 `.why`는 `display: none`으로 숨기고 hover에서 `display: block`만 되돌려, **투명하고 보이지 않는 상태가 그대로 남았습니다.** `right: 0; top: 28px`도 기존 값이 계속 적용되어 위치도 의도와 달랐습니다.
- Change: `.why:hover .tooltip`에 `opacity: 1; visibility: visible; transform: none; right: auto; top: auto` 추가. 기존 도움말과 여는 방식을 맞췄습니다.
- 작업 중 사고와 복구: python 문자열 슬라이스로 고치려다 **첫 번째 `role="tooltip"`(화면 위쪽 도움말)을 잘라내 컴포넌트를 크게 훼손**했습니다. `git checkout HEAD -- simple-intake.tsx simple-intake.module.css`로 직전 커밋(`255bb68`)에서 복구한 뒤, 편집 도구로 정확히 한 곳만 고쳤습니다. TSX는 손대지 않았습니다.
- Files: `src/components/simple-intake.module.css`.
- Validation: 780 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린, 브라우저에서 적용된 CSS 규칙 확인(`opacity: 1; visibility: visible` 포함).
- Rollback: 이 커밋 revert.

## 2026-08-31 — Claude: 직무기술서 생성 기능 계획 문서 (코드 없음)

- Agent/session: Claude. 사용자 요청("지금 하지 말고 md 추가해놓고 다음 할 일에 넣어놔").
- Status: **문서만. 코드 변경 없음.**
- 신규 `docs/career-document-builder-plan.md` — 본인 자료 전부(이력서·자소서·자격증·수료증·해외경험 등)를 넣으면 직무기술서를 만들어 주고, `심리상담사 쪽으로` 같은 방향 지정을 받는 기능.
- 문서에 적어 둔 핵심 판단:
  - 가장 큰 위험은 **없는 경력 생성**. 첨삭과 달리 대조할 원문이 없습니다. 방향 지정은 **배치만 바꾸고 사실을 만들지 않는다**는 선을 지켜야 합니다.
  - 정하지 않은 것: 상품 위치·가격·출력 형식·경험은행과의 관계.
  - 순서: 런칭 필수 항목 뒤. 단 **경험은행보다는 먼저**(결과물이 혼자 서는 쪽이 먼저).
- **혼합 파일 카테고리는 만들지 않기로 판단**(같은 문서 6장에 근거 기록): 카테고리는 "어떻게 읽을지"를 정하는 값인데 `혼합`은 아무것도 정해 주지 않고, "모르겠다"는 이미 `UNSET`이 담당합니다. 본인 서류끼리의 혼합은 어느 쪽으로 골라도 결과가 같아 애초에 문제가 아니고, 위험한 것은 **채용공고가 섞인 경우 하나뿐**이며 그건 파일을 나누는 것 말고 답이 없습니다. 필요하면 카테고리가 아니라 **감지 후 "나눠서 올려 주세요" 안내**로 갑니다.
- Files: `docs/career-document-builder-plan.md`.
- Rollback: 파일 삭제.

## 2026-08-31 — Claude: 직무기술서 계획 문서 정정 + 양식 정의

- Agent/session: Claude. 사용자 지적("원문대조? 첨삭이 아닌데? 자료 정보 준다고 했잖아").
- Status: **문서만. 코드 변경 없음.**
- 정정: 초안에 "여기는 원문이 없다"고 적은 것은 **틀렸습니다.** 첨삭의 기준을 그대로 옮긴 것이고, 실제로는 **넣어 주는 자료 뭉치가 곧 원문**입니다. 없는 것은 원문이 아니라 1:1로 맞대어 볼 짝입니다. 그래서 위험은 "근거가 없다"가 아니라 **"여러 자료를 합치며 근거가 어디였는지 잃는 것"**이고, 대응은 **줄마다 출처를 달아 만드는 것**입니다.
- 추가(4-1 양식): 사용자가 실제로 쓰는 문서를 확인해 목표 양식을 명시했습니다 — `회사명 · 기간(시작~종료 + 개월 수) / 소속·직급 / 담당업무·성과 불릿`, 최신 경력이 위. 자격증·학력·해외 경험을 목록으로 남기지 않고 **경력 줄의 근거로 끌어오는 것**이 이 기능의 값이라는 점도 적었습니다. 출력은 DOCX 기본.
- 추가(6장): 분류용 싼 신호 하나 — **채용공고는 지원 한 건에 보통 하나뿐.** 둘 이상이 공고로 분류되면 적어도 하나는 틀렸습니다. 오늘 사고(공고 1개)에는 안 걸렸겠지만 본인 서류가 여러 개 공고로 몰리는 흔한 실수를 잡습니다.
- Files: `docs/career-document-builder-plan.md`.
- Rollback: 이 커밋 revert.

## 2026-08-31 — Claude: 브라우저 DB 호출이 조용히 죽지 않게 (A안)

- Agent/session: Claude. 사용자 결정("1a ㄱㄱ" — A안만).
- Status: main에 적용. **마이그레이션 없음. 결제·이용권 로직은 건드리지 않았습니다.**
- 배경: 브라우저가 DB를 직접 부르는 곳 6~7군데가 실패를 삼키고 있었습니다. 2026-08-31 서명키 장애 때 전부 401이었는데 하루 넘게 아무도 몰랐습니다 — **읽지 못한 것과 없는 것이 화면에서 똑같이 보였기 때문**입니다. 401 자체는 서명키 회전으로 해결됐고, 여기서 고치는 것은 **조용함**입니다.
- 중단한 작업(중요): 처음에는 이용권 사용을 서버로 옮기려고 `reward-credit-repository.ts`를 작성했으나, `consume_reward_credit` RPC가 단순한 상태 변경이 아니라 **지원 건 소유 확인·중복 이용권 거부·만료 임박 우선·주문/자격 생성**까지 하는 것을 확인하고 **파일을 지웠습니다.** 특히 `ACTIVE_ENTITLEMENT_EXISTS` 거부를 빠뜨리면 이용권 1장으로 분석 2회가 가능해집니다. 이 RPC들은 `auth.uid()`에 의존하므로 서버 이전에는 마이그레이션이 필요하고, 그것은 사용자 결정 사항으로 남겼습니다(C안, 보류).
- Change(각 지점): 실패를 `catch {}`로 넘기던 자리에서 `console.error`와 화면 문구를 남깁니다.
  - `credit-wallet.tsx` — `이용권이 없는 것이 아니라 조회에 실패한 것입니다`
  - `application-case-handoff.tsx` — `무료 이용권 보유 여부를 확인하지 못했습니다` (확인 실패를 '없음'으로 넘기면 **가진 이용권을 두고 결제**하게 됩니다)
  - `referral-panel.tsx` — `코드가 없는 것이 아니라 조회에 실패한 것입니다`
  - `application-tracker-card.tsx` — `결과를 서버에 기록하지 못했습니다` (화면의 체크는 이 브라우저 저장분이라, 실패해도 저장된 것처럼 보이고 **결과 보고 보상이 지급되지 않습니다**)
  - `referral-code-entry.tsx`, `redeem-client.tsx` — 이미 오류를 표시하고 있어 변경 없음.
- Files: 위 4개 컴포넌트와 각 `.module.css`, `research-consent-gate.test.ts`(+4).
- Validation: 784 tests passed (+4), `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.
- 보류(사용자 결정 대기): B안(읽기만 서버로), C안(쓰기 서버 이전 — 마이그레이션 + 결제 로직).

## 2026-09-01 — Claude: FINAL 결제 열기

- Agent/session: Claude. 사용자 요청 및 승인. 사용자가 Polar에 FINAL 상품을 만들고 `POLAR_FINAL_PRODUCT_ID`를 넣은 뒤에도 열리지 않아 조사.
- Status: main에 적용. 마이그레이션 없음. **QUICK·PRO 결제 동작은 변경 없음.**
- 진단(둘 다 환경변수 문제가 아니었습니다):
  1. `application-case-handoff.tsx`가 **조건 없이** FINAL을 거부했습니다. `isFinalEnabled()`도 `POLAR_FINAL_PRODUCT_ID`도 보지 않아 어떤 env로도 열 수 없었습니다. 반면 `NEXT_PUBLIC_ENABLE_FINAL`은 이미 `/final/*` 페이지·온보딩·요금표를 열고 있었으므로, **등급은 고를 수 있는데 결제만 막히는** 상태였습니다.
  2. `/api/checkouts/final` 라우트가 **없었습니다**(quick·pro만 존재).
  3. 준비 화면 가격이 `product === "PRO" ? "12,900원" : quickQuote…`라, FINAL이 else로 떨어져 **QUICK 견적**을 표시했습니다. 사용자가 본 8,800원은 QUICK 5,900 + 초과 블록 2,900입니다.
- Change 1 — 라우트 공통화: `quick/route.ts`와 `pro/route.ts`가 **바이트 단위로 동일**했습니다(diff로 확인). 등급은 URL이 아니라 `prepare_quick_checkout`이 분석 실행에서 읽고 `createCheckoutQuote`가 값을 매깁니다. 세 번째 복사본을 만드는 대신 `src/server/billing/checkout-route.ts`로 **옮기고**, 세 라우트가 함께 씁니다. 동작 변경 없음 — 같은 코드입니다.
- Change 2 — 하드 차단을 `product === "FINAL" && !isFinalEnabled()`로 교체. 이제 스위치 하나가 "FINAL이 열렸는가"의 유일한 답입니다.
- Change 3 — 가격을 등급별 견적으로: `createFinalCheckoutQuote` / `createProCheckoutQuote` / `quickQuote`. PRO도 하드코딩 문자열 대신 견적을 쓰므로 **초과 블록이 가격에 반영**됩니다(2026-08-31에 넣은 10,000자당 3,900원).
- 확인한 환경: `NEXT_PUBLIC_ENABLE_FINAL=1`, `POLAR_FINAL_PRODUCT_ID` 설정됨, `POLAR_SERVER=sandbox`(테스트용). `polar-checkout.ts`는 이미 FINAL 상품 ID를 읽고 있었습니다.
- Files: 신규 `src/server/billing/checkout-route.ts`, `src/app/api/checkouts/final/route.ts`; 수정 `checkouts/quick/route.ts`, `checkouts/pro/route.ts`(본문을 공통 처리로 교체), `application-case-handoff.tsx`, `analysis-preparation.tsx`, `final-availability.test.ts`(+3).
- Validation: 787 tests passed (+3), `tsc` clean, `eslint` 0 errors, `next build`에 `/api/checkouts/final` 등록 확인.
- 남은 것: 실제 결제 흐름은 **사용자 테스트 필요**(샌드박스). 운영 오픈 시 `POLAR_SERVER=production`과 Cloudflare 환경변수 반영이 별도로 필요합니다.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 협업 배포용 쿠폰 코드 + 팜플렛

- Agent/session: Claude. 사용자 요청(청년재단 협찬 시나리오, 디자인 예시 제공).
- Status: main에 적용. **마이그레이션 있음 — 사용자가 `npm run db:remote:push` 실행 필요.**
- 조사 결과(요청 4건 중 2건은 이미 존재): 메일 발송 기록은 `/meensoo/mail/history`에 **본문까지 저장**되어 있었고, 개별 이용권 발급도 `/meensoo/rewards`에 있었습니다. 관리자 메뉴에도 9개 항목이 모두 링크되어 있습니다. **"안 들어가진다"는 증상 미확인 — 사용자 회신 대기.**
- 진짜 없던 것: **협찬 배포 구조.** 기존 이용권은 `recipient_email not null`이라 **받는 사람을 미리 알아야** 발급됩니다. 협업 기관이 이벤트 경품으로 뿌리는 상황에서는 발급 시점에 수령자를 알 수 없습니다. 그리고 **쿠폰을 입력할 칸이 아예 없었습니다** — 결제 전 입력칸은 추천코드 전용이고, 쿠폰은 `/redeem/{긴토큰}` 링크로만 받을 수 있었습니다. 팜플렛의 "쿠폰 등록" 문구가 실제로는 갈 곳이 없었습니다.
- 설계 결정 — **기존 `reward_credits`는 손대지 않습니다.** 그 테이블은 금액 상태와 그것을 지키는 check 제약을 이고 있습니다. 대신 앞에 한 겹(`coupon_codes`)을 두고, 코드를 등록하면 평범한 이용권 한 줄이 생깁니다. 이후 사용·소진·환불 경로는 전부 그대로입니다.
- Files (신규):
  - `supabase/migrations/20260901010000_partner_coupon_codes.sql` — `coupon_codes`, `coupon_claims`, `claim_coupon_code()`. 수량·기간·회수·1인1회를 **각각 다른 이름의 오류**로 거부합니다(하나로 뭉치면 오탈자인지 기간 만료인지 알 수 없습니다). `for update` 행 잠금 + `claimed_count <= total_count` 제약으로 동시 등록 시 초과를 막습니다. `coupon_codes`는 RLS를 켜고 **읽기 정책을 주지 않습니다** — 목록이 열리면 유효한 코드 목록이 됩니다.
  - `src/components/coupon-code-entry.tsx` — 결제 전 화면에 추천코드와 **별도 칸**. 둘은 이름만 비슷하고 반대로 동작합니다(추천은 결제 후 추천인에게, 쿠폰은 즉시 본인에게).
  - `src/app/meensoo/coupons/*` — 발급 화면과 목록, 팜플렛.
  - `src/app/api/meensoo/coupons/route.ts` — 생성·중지. `isAdmin()` 확인.
- 팜플렛: 사용자가 준 디자인을 **SVG로 재현**하고 PNG(2268×2808)로 내려받습니다. **이미지 생성 AI를 쓰지 않았습니다** — 팜플렛은 창작이 아니라 양식이고, 생성 모델은 한글을 깨뜨리며 쿠폰 코드가 한 글자만 어긋나도 배포용으로 쓸 수 없습니다. 게다가 장당 비용이 듭니다. 기관명·부제·혜택·대상·사용방법·하단 안내가 전부 설정값이고 기본값이 채워져 있습니다.
- Validation: 795 tests passed (+8), `tsc` clean, `eslint` 0 errors, `next build`에 `/meensoo/coupons`·`/api/meensoo/coupons` 등록 확인.
- 남은 것: 마이그레이션 적용 후 실제 등록 흐름 테스트. "관리자 메뉴가 안 들어가진다"는 증상 확인 필요.
- Rollback: 이 커밋 revert + `drop table public.coupon_claims, public.coupon_codes cascade; drop function public.claim_coupon_code(text);`

## 2026-09-01 — Claude: 프로모션 캠페인 (①~③, ⑤⑥ 일부)

- Agent/session: Claude. 사용자 스펙 10개항.
- Status: main에 적용. **마이그레이션 적용 완료**(사용자 실행 확인).
- 사전 조사에서 확인한 것: 메일 발송 기록(`/meensoo/mail/history`, 본문 저장)과 개별 이용권 발급(`/meensoo/rewards`)은 **이미 있었습니다.** 관리자 메뉴 9개도 모두 링크되어 있습니다. `/meensoo/rewards`가 "안 들어가진다"던 것은 **관리자 로그인 전이라 로그인 화면이 대신 뜬 것**이고(로컬·프로덕션 모두 HTTP 200 + `비밀번호` 포함), `/meensoo/coupons` 404는 **Cloudflare 배포 지연**입니다.
- 설계: 어제 만든 공유 코드(코드 1개를 여러 명이 나눠 씀)를 **없애지 않고** 캠페인 아래로 넣었습니다. 팜플렛 배포에는 공유 코드가, 기관에 목록을 넘기고 사용 추적을 하려면 고유 코드가 맞습니다. `coupon_codes.max_uses`가 둘을 가릅니다(1이면 고유).
- Files (신규): `20260901020000_coupon_campaigns.sql`, `src/domain/coupon-code.ts`(+test), `src/app/api/meensoo/campaigns/route.ts`, `src/app/meensoo/coupons/campaign-creator.tsx`.
- 코드 생성 규칙: `0/O`, `1/I/L`을 **문자 집합에서 제외**했습니다. 종이에 인쇄된 코드에서 이 다섯 글자가 "코드가 안 먹혀요" 문의의 대부분을 만듭니다. 중복은 만들 때 걸러 내고, 부족하면 조용히 적게 주지 않고 **실패시킵니다**(짧은 목록을 기관에 넘기는 것이 더 나쁩니다).
- CSV: 앞에 BOM을 붙입니다. 없으면 엑셀에서 한글이 깨지고, 그것이 이 기능의 가장 흔한 실패입니다.
- 할인 쿠폰: 스키마와 입력은 받되 **지급 경로가 없어 생성 단계에서 거절**합니다(`COUPON_BENEFIT_UNSUPPORTED`). 조용히 무료 이용권을 주는 것보다 낫습니다.
- 팜플렛: **기본은 코드 없는 기관 배포용**(`쿠폰코드 등록 후 사용`). 종이에 코드가 찍히면 그 코드는 한 사람 것이 되어 버립니다. 개별 코드 이미지는 선택 옵션으로 따로 만듭니다.
- Validation: 800 tests passed (+5), `tsc` clean, `eslint` 0 errors, `next build`에 `/api/meensoo/campaigns` 등록 확인.
- 남은 단계: ④ 마이페이지 등록칸, ⑦⑧ 메일 캠페인 연결·provider id, ⑨ 게시판(코덱스 영역).
- Rollback: 이 커밋 revert + `drop table public.coupon_campaigns cascade;`

## 2026-09-01 — Claude: 마이페이지 쿠폰 등록 + 메일 기록에 캠페인·제공자 ID (④⑦⑧)

- Agent/session: Claude. 사용자 스펙 이어서.
- Status: main에 적용. **마이그레이션 추가 — `20260901030000_mail_log_campaign.sql` 적용 필요.**
- ④ 마이페이지: `/refer`의 이용권 지갑 **바로 아래**에 쿠폰 등록칸을 놓았습니다. 결과가 보이는 곳과 넣는 곳이 붙어 있어야 코드를 받은 사람이 "어디에 넣지"를 찾지 않습니다. 추천코드 칸은 같은 화면 아래쪽에 **그대로 따로** 있습니다. 등록 성공 시 **상품과 만료일**을 함께 보여줍니다 — 둘 다 없으면 "등록되었습니다"만 남고 그건 확인이 아니라 인사입니다.
- ⑦⑧ 메일: `mail_send_log`에 `provider_message_id`, `campaign_id` 추가. 발송 폼에 `campaignId`가 실려 오면 묶고, 없으면 예전과 동일하게 동작합니다(일반 메일이 이 값 때문에 실패할 이유가 없습니다).
- **작업 중 발견해 고친 버그:** Resend 응답에서 식별자를 읽는 코드를 성공 분기에 넣었더니, 응답 본문을 못 읽는 경우 그 예외가 바깥 `catch`로 떨어져 **이미 보낸 메일이 `FAILED`로 기록**됐습니다(기존 테스트가 잡아냈습니다). 식별자 읽기를 자체 `try/catch`로 감쌌습니다 — 식별자를 못 읽는 것과 발송이 실패한 것은 다릅니다.
- 발송 기록 화면에 `Resend {id}`를 표시합니다. 우리 기록은 "요청을 넘겼다"까지고 실제 배달은 Resend에 있으므로, 그 둘을 잇는 값을 보관만 하지 않고 보이게 둡니다.
- Files: `src/app/refer/page.tsx`, `coupon-code-entry.tsx`, `manual-email.ts`, `admin-repository.ts`, `api/mail/send/route.ts`, `meensoo/mail/history/page.tsx`, `coupon-code.test.ts`(+3), 신규 마이그레이션.
- Validation: 803 tests passed (+3), `tsc` clean, `eslint` 0 errors, `next build` 클린.
- 남은 것: 캠페인 화면에서 기관에 메일 보내기(팜플렛·CSV 첨부) 연결, ⑨ 게시판(코덱스 영역).
- Rollback: 이 커밋 revert. 추가된 컬럼은 nullable이라 되돌려도 기존 기록이 그대로 읽힙니다.

## 2026-09-01 — Claude: 캠페인에서 기관에 메일 보내기 (⑦ 마무리)

- Agent/session: Claude. 사용자 스펙 ⑦ 마무리.
- Status: main에 적용. 마이그레이션 없음.
- Change: 기존 `MailComposer`를 **그대로 재사용**합니다. 새 발송 경로를 만들지 않았습니다 — 발신 주소·첨부 검사·수신자 검증·발송 기록이 이미 그 안에 있고, 복제하면 두 벌을 관리하게 됩니다. 선택 props(`campaignId`, `initialSubject`, `initialBody`, `initialFiles`)만 더했고 기존 호출부는 인자 없이 그대로 동작합니다.
- 캠페인 화면에서: 팜플렛 **[메일에 첨부]** 버튼이 PNG를 만들어 작성창에 붙이고, **[코드 CSV를 붙여 메일 쓰기]**가 CSV를 붙입니다. 제목·본문은 캠페인 값으로 채워집니다.
- 이 자리에 둔 이유: 파일을 만들어 놓고 다른 화면에서 다시 찾아 올리게 하면 **다른 캠페인의 파일을 붙이는 일**이 생깁니다. 코드 목록과 팜플렛과 받는 사람이 한 화면에 있어야 어긋나지 않습니다.
- `CouponPamphlet`은 그리는 부분을 함수로 빼서 저장과 첨부가 같은 그림을 씁니다(두 번 그리지 않습니다).
- Files: `mail-composer.tsx`, `campaign-creator.tsx`, `coupon-pamphlet.tsx`, `coupons.module.css`, `coupon-code.test.ts`.
- Validation: 803 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert. 추가된 props는 전부 선택값입니다.

## 2026-09-01 — Claude: 홍보물 시각 요소 복원 + 관리자 화면 가독성

- Agent/session: Claude. 사용자 지적("장식들을 날려버린 것 같다" + 원본 이미지 재제시).
- Status: main에 적용. 마이그레이션 없음.
- 원본 대비 빠져 있던 것(수정 전 체크): 배경 곡선·sparkle, 오른쪽 이력서+체크리스트+펜 일러스트, 4개 행 아이콘(선물·사람·달력·모니터 — 빈 사각형만 있었음), 점선 divider, 쿠폰 좌우 반원 절취·절취선·별·잎 장식, globe 아이콘, 그림자·그라데이션. 캔버스도 1134×1404 → **1122×1402**로 맞췄습니다.
- 전부 inline SVG로 그렸습니다. **외부 이미지도 생성 API도 쓰지 않습니다.** 장식을 그림 파일로 두면 기관이 바뀔 때마다 디자이너를 불러야 하지만, 도형이면 바뀌는 것은 글자뿐입니다.
- props 확장: `eventLabel`, `headline`, `couponDescription`, `url`. 기존 값과 합쳐 기관명·부제·혜택·대상·기간·사용방법·코드·주의사항이 모두 관리자 설정값입니다. **기관 이름을 도안 안에 하드코딩하지 않았고, 테스트가 그것을 지킵니다.**
- 관리자 화면: 입력 폭을 `max-width: 760px`로 묶어 가로로만 흐르던 배치를 위아래로 읽히게 했고, 라벨·테두리·보조 문구의 대비를 올렸습니다(흰 바탕에서 흐려 보인다는 지적).
- 코드 접두어는 **비워 두면 캠페인명에서 자동 생성**합니다. 손으로 정할 이유가 없고, 비어 있으면 목록에서 어느 캠페인 코드인지 구분되지 않습니다.
- 코드 목록: 캠페인의 `팜플렛`을 누르면 **자동으로 함께 불러옵니다.** 전체 복사·CSV에 더해 **한 장씩 복사**를 넣었습니다 — 전체 복사밖에 없으면 한 명에게 코드 하나를 보낼 때 남의 코드까지 붙여 넣게 됩니다.
- ⑨ 게시판 카테고리: 사용자 지시에 따라 **코덱스에 맡깁니다.** 손대지 않았습니다.
- Files: `coupon-pamphlet.tsx`(재작성), `campaign-creator.tsx`, `coupons.module.css`, `api/meensoo/campaigns/route.ts`, `coupon-code.test.ts`(+5).
- Validation: 808 tests passed (+5), `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 무료 이용권 화면이 열리지 않던 원인

- Agent/session: Claude. 사용자 제보(런타임 오류 화면 제공).
- Status: main에 적용.
- 원인: `src/app/meensoo/rewards/page.tsx:75`가 **서버 컴포넌트인데 `<input onFocus={...}>`**를 렌더했습니다. Next.js가 `Event handlers cannot be passed to Client Component props`로 렌더 자체를 실패시킵니다. **앞서 "로그인 전이라 로그인 화면이 뜬 것"이라고 보고했던 것은 틀렸습니다** — 로그인 화면은 맞게 떴지만, 로그인한 뒤에는 이 오류로 페이지가 죽습니다.
- Change: 링크 칸만 클라이언트 컴포넌트(`ClaimLinkCell`)로 떼어 냈습니다. 표 한 줄 때문에 페이지 전체를 클라이언트로 내리면 서버에서 하던 조회가 브라우저로 넘어갑니다. 눌러서 전체 선택되는 동작은 유지 — 링크가 길어 손으로 끌어 잡기 어렵고, 이 화면에서 하는 일의 대부분이 그 값을 복사하는 것입니다.
- 확인: `/meensoo/rewards` HTTP 200.
- 함께 보고: `layout.tsx:96`의 `<Script strategy="beforeInteractive">` 콘솔 경고는 **개발 모드 경고이고 이 작업과 무관**합니다. 광고 태그 위치는 의도적으로 정해진 것이라(주석에 근거 기록) 건드리지 않았습니다.
- Files: 신규 `src/app/meensoo/rewards/claim-link-cell.tsx`; 수정 `src/app/meensoo/rewards/page.tsx`.
- Validation: 808 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 쿠폰 만들 때 손으로 채우는 칸 없애기

- Agent/session: Claude. 사용자 요청("년월 쓰기도 귀찮다 · 공유 코드 쪽은 코드 자동 생성이 안 되고 뭘 적어야 넘어간다").
- Status: main에 적용.
- 기간: 두 화면 모두 **오늘 ~ 석 달 뒤**를 미리 채웁니다. 비워 두면 "기한 없음"이 되는데, 기한 없는 협업 쿠폰은 몇 년 뒤에 들고 와도 받아 주어야 합니다. 흔한 값을 채워 두고 다를 때만 고치게 하는 편이 맞습니다.
- 기관명 하나로 나머지를 채웁니다: 캠페인명(`○○ 협업 이벤트`), 대상(`○○ 참여자 및 선정자`), 그리고 공유 코드 쪽은 **쿠폰 코드까지**(`YOUTH-2026`). **직접 고친 값은 덮어쓰지 않습니다** — 자동 입력이 손으로 쓴 값을 지우면 그건 편의가 아닙니다.
- 공유 코드 화면의 막힘: 코드가 비어 있으면 만들기 버튼이 잠기는데 **무엇을 적어야 하는지는 아무 데도 없었습니다.** 이제 기관명을 넣으면 자동으로 채워지고, `새로` 버튼으로 무작위 코드를 다시 뽑을 수 있습니다.
- Files: `campaign-creator.tsx`, `coupon-creator.tsx`, `coupons.module.css`.
- Validation: 808 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 발급 방식을 한 화면으로 + 코드별 사용 현황

- Agent/session: Claude. 사용자 지적("버전 2개라 복잡하다, 드롭다운으로 구분 / 둘 다 누가 썼는지 확인 가능한 거 맞나").
- Status: main에 적용. 마이그레이션 없음.
- **먼저 확인한 것과 그 결과:** 기록은 `coupon_claims`에 남고 있었지만 **화면과 CSV가 보여 주지 않았습니다.** `GET /api/meensoo/campaigns`가 `claimedAt`을 `null`로 하드코딩해 내보내고 있어, **협업 기관에 넘긴 CSV에는 아무도 안 쓴 것처럼 적혔습니다.** 개수만 세면 "50장 중 12장"까지는 알아도 기관이 실제로 묻는 "우리 당첨자가 썼나요"에는 답할 수 없습니다.
- Change 1 — `getCampaignCodeUses()`: 코드별 `상태 · 사용자 이메일 · 사용일시`. 이메일은 등록 시점에 `reward_credits.recipient_email`에 적히므로 `auth.users`를 따로 뒤지지 않습니다. CSV에 `사용자` 열을 더했고, 목록에서 사용된 코드는 취소선으로 구분됩니다.
- Change 2 — 발급 방식 드롭다운: `고유 코드 여러 장`(기관에 목록 전달·추적) / `공유 코드 한 장`(팜플렛 배포). 공유를 고르면 코드 한 장에 `max_uses = 수량`, 고유면 수량만큼 각 1회용. 수량 칸 이름도 `발급 수량`/`사용 가능 인원`으로 바뀝니다.
- Change 3 — 만드는 화면을 **하나로 합쳤습니다.** 중복된 `coupon-creator.tsx`는 제거했고, 캠페인 이전에 만든 공유 코드는 **목록으로 계속 보입니다**(이미 배포한 코드의 현황을 볼 수 없게 되면 안 됩니다).
- Files: `admin-repository.ts`, `api/meensoo/campaigns/route.ts`, `campaign-creator.tsx`, `coupons/page.tsx`, `coupons.module.css`, `domain/coupon-code.ts`, `coupon-code.test.ts`(+3). 삭제: `coupon-creator.tsx`.
- Validation: 811 tests passed (+3), `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 협업 쿠폰 화면을 목록 + 슬라이드 패널로

- Agent/session: Claude. 사용자 지적("사용법이 너무 어렵다 · 한번 열면 닫기도 애매하다 · 페이지를 나눌지 한 화면에서 할지").
- Status: main에 적용. 마이그레이션 없음. **기능은 그대로이고 배치만 바꿨습니다.**
- 판단(페이지 분리 대신 한 화면 유지): 이 화면을 여는 이유는 대개 **"지금 어떻게 되고 있나"**입니다. 그래서 목록이 먼저 나와야 하고, 만들기·코드·홍보물·메일은 **가끔 하는 일**이라 위에 겹쳐 띄우면 됩니다. 페이지를 나누면 캠페인 하나를 보려고 주소를 오가야 해서 오히려 번거롭습니다.
- Change: 폼·코드목록·홍보물·메일을 세로로 쌓아 두던 것을 **표 + 오른쪽 슬라이드 패널**로 바꿨습니다.
  - 첫 화면: 캠페인 표(기관·캠페인 / 상품 / 사용 n/N / 기간)와 행마다 `코드` `홍보물` `메일` 버튼. 없으면 빈 상태 안내.
  - 패널: 상세는 **탭 3개**(코드·홍보물·메일), 만들기는 하단에 `취소`/`캠페인 만들기`.
  - **닫는 방법을 셋 두었습니다** — ✕ 버튼, 바깥 클릭, `Esc`. 하나만 두면 그 하나를 못 찾은 사람은 갇힙니다.
  - 만들기를 마치면 그대로 상세 패널로 넘어가 코드가 바로 보입니다.
  - 좁은 화면에서는 패널이 전체 폭, 표는 카드로 접힙니다.
- Files: `campaign-creator.tsx`(렌더 재구성), `coupons.module.css`.
- Validation: 811 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 관리자 조회 실패가 "기록 없음"으로 보이던 문제

- Agent/session: Claude. 사용자 질문("메일이든 뭐든 기록이 안 보인다 · 로컬과 도메인이 기록을 따로 갖는 건가").
- Status: main에 적용. 마이그레이션 없음.
- **먼저 확인한 사실(DB 직접 조회):** `mail_send_log` **16건**(`무아레쥬메 무료 쿠폰 안내` 발송 기록 포함), `coupon_campaigns` 1건, `coupon_codes` 52장, `coupon_claims` 0건, `reward_credits` 5건. **기록은 전부 남아 있습니다.** `provider_message_id`·`campaign_id` 컬럼도 적용되어 있음을 확인했습니다.
- 로컬/도메인 질문에 대한 답: **둘은 같은 Supabase 프로젝트를 봅니다.** 데이터베이스는 요청이 어디서 왔는지 모르고 나누지도 않습니다. 갈릴 수 있는 것은 **관리자 로그인 쿠키**뿐입니다 — localhost에서 로그인해도 도메인은 로그인되지 않습니다. 단, Cloudflare 환경변수의 `NEXT_PUBLIC_SUPABASE_URL`이 다른 프로젝트를 가리키면 그때는 진짜로 갈립니다(사용자 확인 필요).
- 함께 점검: `src/app/meensoo` 아래 서버 컴포넌트에 남은 이벤트 핸들러 없음(어제 `rewards` 건 이후 재발 없음).
- Change: 목록 조회 9곳이 오류를 **빈 배열로 바꿔** 돌려주고 있었습니다. 그러면 화면이 "기록이 없습니다"라고 말하는데, **없는 것과 못 읽은 것은 다릅니다** — 컬럼 하나가 빠져도, 권한이 막혀도, 키가 상해도 전부 "0건"으로 보입니다. 2026-08-31 장애가 하루 넘게 안 보였던 이유가 정확히 이 모양이었습니다. 이제 `console.error`로 남깁니다. 화면을 비우는 동작 자체는 유지했습니다 — 관리자 화면 하나 때문에 콘솔 전체가 멈추면 더 나쁩니다.
- Files: `src/server/admin/admin-repository.ts`.
- Validation: 811 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 쿠폰 화면 다크 테마 + 홍보물·메일 마무리

- Agent/session: Claude. 사용자 지적 4건.
- Status: main에 적용. 마이그레이션 없음.
- **가장 큰 원인: 관리자 콘솔은 다크인데 쿠폰 화면만 밝게 만들었습니다.** `admin.module.css`가 `--admin-bg: #0f1216` 계열인데 새로 만든 화면은 흰 카드에 짙은 글자였습니다. 앞서 "글자가 흐리다"는 지적을 **대비 문제로 잘못 읽고** 색만 조금 올렸는데, 실제로는 테마가 반대였습니다. `coupons.module.css`를 전부 `--admin-*` 변수 기준으로 다시 썼습니다 — 색을 직접 적지 않으므로 나중에 테마가 바뀌어도 이 화면만 남지 않습니다. 홍보물(흰 종이)만 받침을 깔아 띄웁니다.
- 공유 코드 홍보물: 코드가 **한 장뿐이면 그 코드를 찍습니다.** 공유 코드는 "이 종이 한 장으로 다 같이 쓰세요"라서 코드를 빼면 받는 사람이 코드를 구할 데가 없습니다. 여러 장일 때는 계속 비워 둡니다 — 종이에 코드가 있으면 그 한 장이 한 사람 것이 되어 버립니다.
- 주의사항 입력칸: 저장만 되고 **아무 데서도 쓰이지 않고 있었습니다.** 메일 본문의 `[주의사항]` 줄로 들어갑니다. 홍보물 하단 문구는 `footnoteText`가 따로 담당합니다.
- 홍보물 첨부: 메일 탭을 열면 **보이지 않는 한 장을 그려 자동으로 첨부**합니다. 내려받아 다시 올리는 왕복이 사라집니다 — 그 왕복 어딘가에서 다른 캠페인의 파일이 붙습니다. 한 번만 붙고, 빼려면 첨부 목록에서 지우면 됩니다.
- 메일 본문도 사용기간과 공유 코드 안내를 포함하도록 바꿨습니다.
- Files: `coupons.module.css`(재작성), `campaign-creator.tsx`, `coupon-pamphlet.tsx`.
- Validation: 811 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 관리자 밝게/어둡게 전환 + 첨부 자동화

- Agent/session: Claude. 사용자 요청("화이트 만들 거면 전체 화이트 / 블랙 전환 기능 / 코드 여러 장이면 CSV도 자동 첨부되어야 하지 않나").
- Status: main에 적용. 마이그레이션 없음.
- 테마 전환: 사이드바 아래에 `밝게`/`어둡게` 버튼. **변수만 바꿉니다**(`.shell[data-theme="light"]`) — 화면마다 색을 따로 적으면 한 곳이 반드시 빠지고, 그러면 방금 겪은 일(한 화면만 흰 배경)이 다시 생깁니다. 밝은 바탕에서 초록은 글자로 쓰기 옅어 강조색만 `#1f9d55`로 내렸습니다. 고른 값은 브라우저에 남아 다음에 열 때도 유지됩니다.
- 구현 방식: `useSyncExternalStore`로 저장소를 직접 읽습니다. 효과 안에서 `setState`로 맞추면 첫 그림을 그린 뒤 한 번 더 그리게 되고 린트 규칙(`cascading renders`)도 막습니다. 서버 쪽은 저장소가 없으므로 어두운 쪽으로 고정합니다.
- 첨부 자동화: 메일 탭을 열면 홍보물 PNG가 자동으로 붙고, **코드가 여러 장이면 CSV도 함께** 붙습니다. 한 장뿐이면 CSV를 붙이지 않습니다 — 한 줄짜리 파일보다 본문에 코드를 적는 편이 받는 사람에게 낫고, 실제로 본문이 그렇게 적힙니다. 버튼 대신 **첨부 목록을 보여 주어** 무엇이 붙었는지 확인만 하면 되게 했습니다.
- 사용자 질문에 대한 답(코드 변경 없음): 메일 발송 기록의 `보낸 내용`이 전부 `기록 없음`인 것은, 그 16통이 **본문 저장 기능을 넣기 전에** 보낸 것이기 때문입니다. 이후 발송분부터 `본문 보기`가 생깁니다.
- Files: `admin-shell.tsx`, `admin.module.css`, `campaign-creator.tsx`.
- Validation: 811 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 밝은 테마가 절반만 먹던 문제

- Agent/session: Claude. 사용자 지적("밝게인데 검정 배경에 검정 글씨가 남아 있다").
- Status: main에 적용.
- 원인: 앞 커밋에서 **변수만 만들고 사용처는 그대로 두었습니다.** `admin.module.css`가 `#0f1216`, `#171b21`, `#1f242c` 같은 색을 직접 적고 있어서, 변수를 뒤집어도 그 자리들은 어두운 채로 남았습니다. 검은 배경에 검은 글씨가 나온 이유입니다.
- Change: 사용처의 **모든 하드코딩 색을 변수로 교체**했습니다(선언 밖 하드코딩 0개 확인). 이름이 없던 층은 변수로 승격했습니다 — `--admin-sunken`(바닥), `--admin-raise`(얹힌 층), `--admin-input`(입력칸), `--admin-ok-bg`·`--admin-warn-bg`·`--admin-bad-bg`(상태 배지 바탕), `--admin-strong`, 그리고 배지 **안 글자**용 `--admin-pill-ok/warn/bad`. 배지는 바탕이 테마마다 뒤집히므로 글자도 같이 뒤집혀야 합니다.
- **두 팔레트의 변수 개수를 18개로 맞췄습니다.** 한쪽에만 있는 변수가 생기면 그 자리가 다시 어두운 채로 남습니다.
- `coupons.module.css`도 같은 방식으로 정리했습니다(하드코딩 0개).
- Files: `src/app/meensoo/admin.module.css`, `src/app/meensoo/coupons/coupons.module.css`.
- Validation: 811 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 모바일에서 안 보이던 관리자 메뉴

- Agent/session: Claude. 사용자 보고("/meensoo를 모바일로 열면 사이드바 메뉴가 안 보인다, 모바일에서 테스트하게 최적화해달라").
- Status: main에 적용 예정(현재 브랜치 `claude/github-gui-sync-jfbyd5`). 마이그레이션 없음.
- 원인: 사이드바는 `:hover`/`:focus-within`로만 펼쳐지는 64px 아이콘 레일이었습니다. 터치 화면은 호버 상태가 없어서 모바일에서는 아이콘만 뜨고 라벨(글자)이 영원히 `opacity: 0`으로 남아 사실상 메뉴를 열 방법이 없었습니다.
- Change: 720px 이하에서 사이드바를 **슬라이드 드로어**로 바꿨습니다. 좌상단 햄버거 버튼(`Menu` 아이콘)으로 열고, 안에 `X` 닫기 버튼·바깥 오버레이 클릭·`Esc` 세 가지로 닫습니다(협업 쿠폰 패널에서 쓴 것과 같은 "닫는 방법 세 개" 원칙). 페이지 이동 시 자동으로 닫히도록 렌더 중 상태 조정 패턴을 썼습니다(`useEffect` 안에서 setState하면 린트 규칙 `react-hooks/set-state-in-effect`에 걸리고 렌더가 한 번 더 돕니다). 열려 있는 동안 배경 스크롤은 막았습니다. 데스크톱(720px 초과)의 호버 동작은 그대로입니다.
- Files: `src/app/meensoo/admin-shell.tsx`, `src/app/meensoo/admin.module.css`.
- Validation: 811 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린. 실제 모바일 브라우저 클릭 확인은 이 환경에 실제 Supabase/Polar 키가 없어 못 했음 — 로그인 화면 이후 동작은 사용자 쪽 확인 필요.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: Cloudflare 자동 빌드가 8개 커밋 동안 죽어 있던 원인 (코드 변경 없음)

- Agent/session: Claude. 사용자 확인 요청("커밋하면 자동 배포될 텐데 왜 안 되나 / 설정 바꾸는 게 맞나").
- Status: 조사 기록. **소스 변경 없음** — Cloudflare 대시보드 설정 문제였습니다.
- 증상: Workers 빌드가 `✘ The entry-point file at ".open-next/worker.js" was not found.`로 실패. `f8cbda8`(FINAL 결제 열기)까지는 초록, 그 다음 `2afd174`부터 최신까지 전부 빨강.
- **코드는 원인이 아닙니다.** `f8cbda8 → 2afd174` 사이에 `package.json`·`wrangler.jsonc`·`next.config`는 하나도 바뀌지 않았고, 현재 코드로 `opennextjs-cloudflare build`를 직접 돌려 `.open-next/worker.js` 생성까지 확인했습니다.
- 원인: 빌드 설정의 **세 칸이 브랜치에 따라 갈라져 실행**됩니다 — `main`(Production branch)은 `Deploy command`, 그 외 브랜치는 `Version command`. 실패한 빌드가 실행한 명령은 `npx wrangler versions upload` 한 줄이었고 이것은 `Version command` 칸의 내용입니다. 즉 **아무도 빌드를 하지 않은 채 업로드만** 시도했습니다. 스냅샷은 이 실행 명령을 라벨만 `Deploy command`로 뭉뚱그려 보여주므로, 어느 칸이 문제인지 로그만으로는 헷갈립니다.
- 고친 방법: `Version command`를 `npx opennextjs-cloudflare build && npx wrangler versions upload`로 바꿈(사용자 적용). `Build command`는 이전에 OpenNext 문제로 손댄 이력이 있어 그대로 둡니다.
- **함정 하나 — Retry는 소용이 없습니다.** 빌드 상세의 `Build settings`는 그 빌드가 만들어진 시점 설정의 **스냅샷**이라, 대시보드를 고친 뒤 옛 빌드를 Retry하면 여전히 옛 설정(`Build command: None`)으로 돕니다. 설정 변경을 반영하려면 **새 커밋을 push해 새 빌드를 트리거**해야 합니다.
- 확인된 설정(사용자 수정 후): Build command `npx @opennextjs/cloudflare build`, Version command `npx wrangler versions upload`, Production branch `main`, 비프로덕션 브랜치 빌드 켜짐. Build variables(`NEXT_PUBLIC_*`)는 소실 없이 유지됨.
- Files: 이 문서만.
- Rollback: 해당 없음(기록).

## 2026-09-01 — Claude: 쿠폰 칸의 로그인 막다른 길

- Agent/session: Claude. 사용자 질문("무료쿠폰도 로그인해야 쓸 수 있게 하는 게 맞나")에서 확인 중 발견.
- Status: main에 적용. 마이그레이션 없음.
- 판단(로그인 요구는 유지): 이용권은 계정에 붙는 물건(`reward_credits.owner_user_id`)이라 넣을 계정이 없으면 지급할 데가 없고, **1인 1회 제한도 신원 없이는 성립하지 않습니다**(공유 코드 한 장을 한 사람이 전부 쓰는 것을 막을 수단이 사라집니다). 파트너에게 "누가 썼는지" 답하는 기능도 같은 이유로 신원이 필요합니다. 어차피 결제에서 로그인하므로 단계가 느는 것이 아니라 순서가 앞당겨질 뿐입니다.
- 문제: `claim_coupon_code`는 로그인을 요구하는데(`AUTHENTICATION_REQUIRED`), **쿠폰 칸에는 로그인할 방법이 없었습니다.** 추천코드 칸에는 `requireSignIn`이 있어 로그아웃 상태면 로그인을 열어 주는데, 쿠폰 칸은 코드를 넣고 누른 **뒤에야** "로그인 후 등록하실 수 있습니다"라고 답했습니다. 기관에서 쿠폰을 받아 온 사람은 그 문장을 읽고 어디서 로그인하는지는 찾지 못합니다.
- Change: `CouponCodeEntry`에 `requireSignIn`·`returnTo`를 추가해 추천코드 칸과 같은 방식으로 맞췄습니다. 결제 화면(compact)은 **한 줄 안내**(로그인 버튼이 이미 몇 줄 아래 있으므로 버튼을 하나 더 두지 않습니다), `/refer`의 큰 카드는 **Google 로그인 버튼**을 냅니다 — 그 화면에는 다른 로그인 수단이 없습니다.
- Files: `coupon-code-entry.tsx`, `coupon-code-entry.module.css`, `analysis-preparation.tsx`, `refer/page.tsx`.
- Validation: 811 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 관리자 메뉴가 모바일에서 통째로 사라지던 진짜 원인

- Agent/session: Claude. 사용자 보고("배포는 됐는데 메뉴가 그대로 안 보인다").
- Status: main에 적용. 마이그레이션 없음.
- **원인은 이 화면의 CSS가 아니라 전역 CSS였습니다.** `src/app/globals.css`가 마케팅 헤더를 접으려고 `@media(max-width:1000px)`에서 `nav > a:not(.button){display:none}`을 겁니다. 관리자 사이드바도 `<nav>`이고 메뉴 항목이 전부 **직계 `<a>`**라, 휴대폰·태블릿에서 브랜드와 링크 10개가 전부 지워졌습니다. 남은 것이 `<button>`들(햄버거·닫기·밝게·로그아웃)과, `.railFoot` 안에 있어 직계가 아니었던 `사이트 열기` 하나뿐이었던 것이 정확한 증상 설명입니다.
- 확인 방법: `AdminShell`을 jsdom으로 렌더해 **DOM에는 링크 12개가 모두 있음**을 먼저 확인했고(즉 React 문제 아님), 실제 `globals.css` + `admin.module.css`를 함께 넣은 페이지를 헤드리스 크롬 412px로 찍어 사용자 화면과 **똑같이 재현**한 뒤 고쳤습니다.
- Change 1: `.sidebar > a.brand, .sidebar > a.link { display: flex }` — 전역 규칙(명시도 0,1,2)보다 높은 (0,2,1)로 이 화면에서만 되돌립니다. **전역 규칙 자체는 건드리지 않았습니다** — 그것을 기대하는 마케팅 화면들이 함께 바뀝니다.
- Change 2: `.sidebar { align-items: stretch }` — 전역 `nav{align-items:center}`가 세로 목록에도 걸려 항목이 제 너비로 줄어든 채 가운데로 몰려 있었습니다. 목록은 왼쪽에서 시작해야 합니다.
- 참고: 이 규칙은 1000px 이하 전체에 걸리므로 **태블릿 폭에서도** 같은 증상이었습니다. 그래서 고침도 미디어쿼리 밖에 둡니다.
- Files: `src/app/meensoo/admin.module.css`.
- Validation: 811 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린, 헤드리스 크롬 412px에서 항목 14개 전부 표시 확인.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 쿠폰 패널이 모바일에서 왼쪽으로 잘려 나가던 원인

- Agent/session: Claude. 사용자 보고("메일이랑 캠페인 보내는 부분이 짤린다").
- Status: main에 적용. 마이그레이션 없음.
- 원인: `globals.css`가 **`body { zoom: 1.25 }`** 를 겁니다(`--app-scale`). 그런데 **뷰포트 단위(`vw`)는 이 배율을 따라오지 않습니다.** 그래서 `width: 100vw`로 잡은 슬라이드 패널은 412px 화면에서 **515px로 그려졌고**, 오른쪽(`right: 0`)에 붙여 둔 패널이라 넘친 103px이 **왼쪽으로 잘려 나갔습니다.** 제목·탭·라벨의 앞부분이 화면 밖에 있던 이유입니다.
- 확인: 헤드리스 크롬 412px에서 대조 측정 — 고치기 전 `left: -103px / width: 515px`, 고친 후 `left: 0 / width: 412px`. 계산한 초과분과 정확히 일치합니다.
- Change: 폭을 **계산하지 않도록** 바꿨습니다. 좁은 화면에서는 `left: 0; width: auto`로 양쪽에 붙이고, 기본값도 `min(680px, 100vw)` → `min(680px, 100%)`로 바꿨습니다. 퍼센트는 배율이 적용된 좌표계에서 계산되므로 화면에 정확히 맞습니다.
- 같은 이유로 관리자 드로어의 `min(78vw, 260px)`도 `min(78%, 260px)`로 바꿨습니다 — 의도한 78%보다 넓게 나오고 있었습니다.
- **이 프로젝트에서 `vw`는 지뢰입니다.** 전역 zoom이 있는 한, 화면 전체를 덮어야 하는 요소는 폭을 재지 말고 `left`/`right`로 붙이는 편이 안전합니다.
- Files: `src/app/meensoo/coupons/coupons.module.css`, `src/app/meensoo/admin.module.css`.
- Validation: 811 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린, 헤드리스 크롬 412px 대조 확인.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 자동 첨부가 "붙은 것처럼 보이고" 안 붙어 나가던 문제

- Agent/session: Claude. 사용자 보고("홍보물·CSV 자동 첨부가 지금 작동 안 하는 것 같다").
- Status: main에 적용. 마이그레이션 없음.
- 원인: `MailComposer`가 `initialFiles`를 **`useState`의 초깃값으로만** 읽고 있었습니다. 초깃값은 첫 렌더에서 한 번만 쓰입니다. 그런데 팜플렛 PNG는 **캔버스에 그린 뒤에야** 파일이 되므로 이 화면이 뜬 **다음에** 도착합니다. 그래서 캠페인 화면의 `첨부 1개 · ...png` 표시는 파일을 세고 있는데, 정작 보내는 쪽 목록은 비어 있었습니다 — **붙은 것처럼 보이고 안 붙어 나갔습니다.** 코드가 여러 장일 때 함께 붙는 CSV도 같은 이유로 빠졌습니다.
- Change: 부모가 넘긴 목록이 **실제로 달라졌을 때만** 반영하는 효과를 넣었습니다. 부모는 렌더마다 새 배열을 만들기 때문에 배열이 아니라 내용(이름·크기)으로 비교합니다. 같은 이름은 갈아 끼우고(다른 캠페인을 열면 팜플렛이 다시 그려집니다), 운영자가 직접 고른 파일은 두고, 운영자가 지운 자동 첨부는 다시 붙지 않습니다.
- Validation: `mail-composer.test.tsx`에 4건 추가. **고친 부분을 되돌리면 그중 3건이 실패하는 것을 확인**했습니다(회귀 테스트로 성립).
- Files: `src/app/meensoo/mail/mail-composer.tsx`, `mail-composer.test.tsx`.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 코드 입력칸을 잠그지 않고 로그인을 건너게 함

- Agent/session: Claude. 사용자 제안("어차피 결제할 때 구글 로그인하는데 저거 열어놔도 되지 않나").
- Status: main에 적용. 마이그레이션 없음.
- 먼저 확인한 것: 결제 화면에 로그인 수단이 **있기는 합니다**(`ApplicationCaseHandoff`). 다만 위치가 `QUICK 제공 범위` 카드보다 아래라, 모바일에서는 한참 스크롤해야 나옵니다. 잠긴 칸 옆의 "로그인하시면 열립니다"는 사실상 막다른 길이었습니다.
- 판단: **쿠폰은 UX 문제가 아니라 돈 문제입니다.** 쿠폰은 그 분석을 공짜로 만드는 물건이라, 결제 직전에 등록하지 못하면 무료 이용권을 쥔 사람이 그대로 결제합니다. 추천코드는 못 넣어도 손해 보는 사람이 없지만, 나란히 선 두 칸이 다르게 동작하면 그것대로 헷갈리므로 같이 맞췄습니다.
- Change: 로그아웃이어도 입력칸을 열어 둡니다. 등록/적용을 누르면 코드를 `sessionStorage`에 맡기고 구글 로그인으로 보냈다가, 돌아오면 **대신 등록**합니다(`src/lib/pending-code.ts`). 버튼 문구는 `로그인하고 등록`으로 바뀌고, 누르기 전에 무슨 일이 생길지 한 줄로 미리 알립니다 — 구글 화면으로 넘어가는 것은 놀랄 만한 일이라 누른 뒤에 알리면 늦습니다.
- 한계(의도한 것): 코드가 실제로 있는지는 **로그인 후에야** 알려줍니다. 로그인 없이 확인해 주는 창구를 열면 코드를 찍어 보며 남의 쿠폰을 캐낼 수 있습니다. 추천코드는 형식이 정해져 있어 오타를 미리 걸러 로그인 왕복을 아낍니다.
- 맡긴 코드는 **한 번만 꺼내 쓰고 지웁니다.** 남겨 두면 다음에 화면을 열 때마다 다시 등록을 시도하고 두 번째부터 "이미 사용하신 쿠폰"이 됩니다. `sessionStorage`라 탭을 닫으면 사라집니다 — 공용 컴퓨터에서 다음 사람에게 넘어가지 않습니다.
- Files: `src/lib/pending-code.ts`(신규), `coupon-code-entry.tsx`, `coupon-code-entry.module.css`, `referral-code-entry.tsx`, `coupon-code-entry.test.tsx`(신규 7건).
- Validation: 822 tests passed (+11), `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 공유 코드의 사용 인원이 어디에도 없던 문제 + 홍보물 부제 잘림

- Agent/session: Claude. 사용자 보고("20인 공유 코드로 만들었는데 대시보드엔 쿠폰 1로만 보인다 / 부제를 길게 쓰면 삽화 뒤로 가려진다").
- Status: main에 적용. 마이그레이션 없음.

### 1. 공유 코드 사용 현황

- 원인 둘: (a) `getCampaignCodeUses`가 `claimed_count`·`max_uses`를 **읽어 놓고 돌려주지 않았고**, (b) 사용 기록을 `Map<코드, 기록 하나>`에 담아 **덮어썼습니다.** 그래서 스무 명이 쓴 코드도 마지막 한 명만 남고, 화면은 `1장 · 사용 1`이라고만 말했습니다. 기관이 실제로 묻는 "스무 자리 중 몇 자리가 나갔나"에 답할 방법이 없었습니다.
- Change: 코드 한 장에 달린 기록을 **전부** 모아 `uses`로 돌려주고, `maxUses`·`claimedCount`를 함께 보냅니다. 상태 문구도 공유 코드는 `사용 3/20`, 다 나가면 `소진`으로 갈라집니다 — 한 명이 썼다고 `사용됨`으로 덮으면 남은 자리가 없는 것처럼 보입니다.
- 숫자는 `coupon_claims` 기록을 셉니다. `claimed_count`는 캐시에 가까워, 어긋나면 "누가 썼나" 명단과 숫자가 서로 맞지 않게 됩니다.
- CSV도 **쓴 사람마다 한 줄**로 바꿨습니다. 공유 코드가 한 줄로 요약되면 기관은 명단을 받지 못합니다.

### 2. 홍보물 부제

- 원인: SVG `<text>`는 줄바꿈을 하지 않습니다. 부제는 x=92에서 오른쪽으로 계속 뻗는데, 삽화가 x=686에 **나중에** 그려져 위를 덮습니다. 길게 쓴 글이 잘리는 것이 아니라 **그림 뒤로 사라졌습니다.**
- Change: `wrapPamphletText()`로 삽화 앞(568px)에서 최대 2줄로 접고, 그래도 넘치면 `…`을 남깁니다 — 그냥 버리면 받는 사람은 원래 그런 문장인 줄 압니다. 폭은 한글 한 칸/그 밖 0.55칸으로 어림합니다(서버에서도 계산해야 해 캔버스 계측을 쓸 수 없습니다).
- 덤: 홍보물이 부제 앞에 기관명을 자동으로 붙이는 줄 모르고 부제에 기관명을 또 쓰면 `울산전기학원 울산전기학원 …`이 됐습니다. 이미 앞에 있으면 붙이지 않습니다(`joinPartnerSubtitle`).
- Files: `admin-repository.ts`, `campaign-creator.tsx`, `coupons.module.css`, `coupon-pamphlet.tsx`, `domain/coupon-code.ts`, `domain/pamphlet-text.ts`(신규), `pamphlet-text.test.ts`(신규 8건).
- Validation: 830 tests passed (+8), `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 쿠폰을 등록했는데 결제 화면이 나오던 사고 (긴급)

- Agent/session: Claude. 사용자 보고("무료쿠폰 등록되는데 분석 시작 누르면 결제 화면. 다른 계정으로 해도 같음"). **쿠폰이 이미 배포된 뒤였습니다.**
- Status: main에 적용. 마이그레이션 없음.
- 원인: 결제 직전 화면에 두 기능이 함께 있는데 **서로를 모릅니다.** `ApplicationCaseHandoff`는 화면이 뜰 때 `useEffect`로 `reward_credits`를 **한 번만** 조회합니다. 쿠폰 등록은 그 조회가 끝난 **뒤에** 일어나므로, 이용권은 실제로 만들어졌는데 화면은 "없음"으로 굳은 채 남고 분석 시작이 결제로 흘렀습니다. 로그인 왕복 후 자동 등록되는 경로에서는 항상 이 순서가 되어, 계정을 바꿔도 같은 결과였습니다.
- Change 1: 등록에 성공하면 `mooa:credit-changed`를 창에 알리고(`src/lib/credit-events.ts`), 이용권 조회 쪽이 그 신호에 다시 조회합니다. 두 컴포넌트는 부모를 공유하지 않아 상태를 위로 올릴 자리가 없습니다 — 관리자 콘솔의 테마 전환이 쓰는 방식과 같습니다.
- Change 2(진단 겸 안내): 조회를 **상품으로 걸러 뽑지 않습니다.** 걸러 버리면 "이용권이 아예 없다"와 "다른 상품용을 가지고 있다"가 화면에서 똑같아집니다. QUICK 이용권을 들고 PRO를 고른 사람에게는 이제 그 사실을 이름을 대어 알립니다 — 말하지 않으면 등록이 실패한 줄 알고 쿠폰을 다시 넣다가 "이미 사용하신 쿠폰"을 만납니다.
- Validation: 834 tests passed (+4), `tsc` clean, `eslint` 0 errors, `next build` 클린. 실패에는 알리지 않는 것까지 테스트로 고정했습니다.
- 남은 확인(사용자): 배포 후 쿠폰 등록 → 같은 화면에서 버튼이 `무료 이용권으로 분석 시작 · 0원`으로 바뀌는지. 만약 여전히 결제가 나오는데 `QUICK 무료 이용권을 가지고 계십니다`라는 안내가 뜬다면, 원인은 순서가 아니라 **상품 불일치**입니다.
- Files: `src/lib/credit-events.ts`(신규), `credit-events.test.ts`(신규), `coupon-code-entry.tsx`, `coupon-code-entry.test.tsx`, `application-case-handoff.tsx`.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 분석 후기(설문) 기능

- Agent/session: Claude. 사용자 요청("첨삭 후 메일에 설문 링크. 별점·개선점·원하는 기능. 대시보드로 받을지 메일로 받을지. 디자인 모바일·PC 둘 다").
- Status: main에 적용. **마이그레이션 있음 — `supabase/migrations/20260901040000_analysis_feedback.sql`. 적용 전까지 후기 저장이 실패합니다(`npm run db:remote:push`).**

### 무엇을 묻지 않을지부터 정했습니다
- **"무엇이 불만이었나"는 묻지 않습니다.** 그 자리에서 나오는 답("별로였다", "수준이 낮다")은 다음에 할 일을 알려주지 않고, 쓴 사람도 답을 받지 못합니다. 대신 `도움이 된 점`(무엇을 지킬지)과 `더 있었으면 하는 것`(무엇을 만들지)을 묻습니다. 낮은 만족은 별점이 이미 말해 줍니다.
- 셋 다 한 화면, 글은 **선택**입니다. 별 하나만 누르고 닫아도 응답입니다 — 글이 달린 것만 세면 만족한 다수가 통계에서 사라집니다.

### 링크가 아니라 버튼
- 완료 메일 하단에 구분선을 두고 `30초 후기 남기기` 버튼을 넣었습니다. 메일에서는 CSS가 절반쯤만 살아남으므로 padding을 준 `<a>`로 만들었습니다 — 배경색이 지워져도 글자는 링크로 남아 눌립니다. 결과 확인 버튼도 같은 방식으로 올렸습니다(전에는 맨 링크).
- 주소는 `/feedback/{analysisRunId}`. 이 화면은 그 분석에 대해 **아무것도 보여 주지 않습니다** — 링크가 새어도 새는 것이 없어야 합니다. 로그인을 요구하지 않는 것도 같은 이유의 뒷면입니다: 보여 줄 것이 없으니 막을 것도 없고, 로그인을 시키면 후기는 거의 오지 않습니다.

### 받는 곳 — 대시보드가 원본, 메일은 낮은 별점만
- 사용자 질문("메일 수량 잡아먹지 않나")에 대한 답: **받는 것은 발송 한도와 무관합니다.** 후기는 웹 폼으로 들어오므로 메일 수신이 아예 없습니다. 다만 "응답마다 나에게 알림 메일"은 **발송 1건**을 씁니다 — 완료 메일과 같은 통입니다.
- 그래서 **1~2점만 즉시 메일**로 알립니다. 별 다섯은 내일 봐도 되지만 별 하나는 그 사람이 아직 화가 나 있는 오늘 안에 봐야 합니다. 받는 주소는 답장이 실제로 도착하는 `ANALYSIS_EMAIL_REPLY_TO`를 씁니다 — 알림용 주소를 하나 더 만들면 그 주소는 아무도 안 봅니다.
- 사용자 지적("대시보드만 있으면 알림이 없어 확인이 번거롭다")에 대한 답: 사이드바 `분석 후기`에 **안 읽은 수 배지**를 붙였습니다(문의와 같은 방식). 화면을 열면 그때까지 온 것을 읽음으로 넘깁니다 — 한 건씩 누르게 하면 아무도 누르지 않아 배지가 영원히 줄지 않습니다.

### 그 밖
- 한 분석에 후기 한 장(`unique`). 같은 사람이 열 번 보내면 별점 평균이 그 사람의 기분이 됩니다. 두 번째 방문은 오류가 아니라 "이미 남겨 주셨습니다"로 맞습니다.
- 브라우저는 이 표에 직접 쓰지 못합니다(RLS 전면 차단). 서버 라우트가 서비스 키로 쓰면서 "그 분석이 실제로 있는가"를 확인합니다.
- 디자인: 헤드리스 크롬 412px·1280px에서 렌더 확인, 가로 넘침 없음. 별점은 라디오 그룹이라 키보드·스크린리더로도 고를 수 있고, 고른 점수를 글로도 말해 줍니다(손가락에 가려 몇 개인지 안 보입니다).
- Files: 마이그레이션 1, `server/feedback/feedback-repository.ts`, `server/notifications/feedback-alert-email.ts`, `api/feedback/route.ts`, `app/feedback/[analysisRunId]/*`(page·form·css), `app/meensoo/feedback/page.tsx`, `admin-repository.ts`, `admin-shell.tsx`, `meensoo/layout.tsx`, `analysis-complete-email.ts`, 분석 실행 라우트 2곳.
- Validation: 834 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert. 표는 남으므로 되돌려도 데이터는 보존됩니다.

## 2026-09-01 — Claude: 실패 화면이 같은 문장을 괄호에 반복하던 문제

- Agent/session: Claude. 사용자 보고("`분석을 완료하지 못했습니다. (분석을 완료하지 못했습니다.)` / 짧게도 길게도 실패한다 / 쿠폰 문제인가").
- Status: main에 적용. 마이그레이션 없음.
- **표시 버그의 정체:** 서버는 운영에서 사유(`detail`)를 빼고 보냅니다. 클라이언트는 `detail`이 없으면 `error`를 대신 썼는데 그것이 같은 문장이라, 괄호 안에 방금 한 말이 한 번 더 들어갔습니다. **아무 정보도 아닌 데다 고장 난 것처럼 보입니다.**
- **진단에 쓴 사실:** 이 문구는 예상 못 한 오류(500) 경로에서만 나옵니다. 검증이 막았다면 다른 문장이 나옵니다(`사실 확인에 실패해…`, 문항 지목, `다시 시도할 수 없습니다`). 그리고 실행 라우트 첫머리에 `if (!apiKey || !model) throw new Error("OPENAI_CONFIGURATION_MISSING")`이 있어, **환경변수가 비면 입력 길이와 무관하게 매번 이 화면**이 됩니다 — 짧은 글과 긴 글이 똑같이 실패한 것과 맞습니다. 이용권 경로는 정상이었습니다(소모되고 실행까지 갔습니다).
- Change 1(서버): 사유를 통째로 내보내지 않되 **갈래**는 알려 줍니다 — `SERVICE_CONFIG`(운영자만 고칠 수 있음, 다시 눌러도 같음) / `ENTITLEMENT` / `AI_PROVIDER`(잠시 후 재시도) / `UNKNOWN`. 갈래마다 다음에 할 일이 다르므로 문장도 다르게 냅니다. 키나 내부 경로는 들어가지 않습니다.
- Change 2(화면): 서버 문장을 그대로 쓰고, 같은 말을 괄호에 반복하지 않습니다. 갈래 이름만 `[SERVICE_CONFIG]`처럼 작게 붙여 문의할 때 댈 수 있게 했습니다. 세 곳에 흩어져 있던 같은 코드를 `describeFailure()` 하나로 모았습니다.
- 남은 확인(사용자): Cloudflare Worker의 **Variables and Secrets**에 `OPENAI_API_KEY`·`OPENAI_MODEL`이 있는지. 이번 배포부터는 화면이 `[SERVICE_CONFIG]`인지 `[AI_PROVIDER]`인지를 직접 말해 줍니다.
- Files: `api/analysis-runs/quick/execute/route.ts`, `components/quick-checkout-return.tsx`.
- Validation: 834 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 분석 실패의 진짜 사유가 화면에 오게

- Agent/session: Claude. 사용자 확인("환경변수는 있다"). 설정 누락이 아니라면 OpenAI 호출 자체가 실패하는 것이므로, 그 갈래를 더 좁혔습니다.
- Status: main에 적용. 마이그레이션 없음.
- Change 1: 화면 갈래에 **상태 코드**를 붙입니다 — `AI_PROVIDER_401`(키), `AI_PROVIDER_404`(모델 이름), `AI_PROVIDER_429`(한도). 셋은 운영자가 할 일이 전부 다른데 `AI_PROVIDER` 하나로는 구분이 안 돼 매번 로그를 열어야 했습니다. 401·403·404는 **다시 눌러도 같다**는 사실까지 문장으로 말합니다 — 그러지 않으면 같은 버튼을 열 번 누릅니다. 숫자에는 키도 본문도 들어가지 않습니다.
- Change 2: `openai-responses-gateway.ts`의 오류 문구 두 곳이 **깨진 글자**(`OpenAI Responses API ??? ??????`)로 저장돼 있었습니다. 로그에 남아도 읽을 수 없어 진단에 쓸모가 없었습니다. `백그라운드 시작에 실패했습니다` / `응답 조회에 실패했습니다`로 되살리고, 실패 응답 **본문 앞 300자**를 함께 남깁니다 — 400은 무엇이 잘못됐는지가 본문에만 있습니다. 키는 헤더에 있지 본문에 없으므로 섞이지 않습니다.
- 하지 않기로 한 것(사용자 판단): 자소서 **최소 글자 수 제한**. 제안의 근거가 "짧아서 실패했다"였는데 긴 자소서도 똑같이 실패해 그 가정이 깨졌습니다. 돈을 내든 쿠폰을 쓰든 짧게 넣는 것은 쓰는 사람의 선택이라 막지 않습니다.
- Files: `src/server/ai/quick/openai-responses-gateway.ts`, `src/app/api/analysis-runs/quick/execute/route.ts`.
- Validation: 834 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.



## 2026-09-01 — Codex: 최신 main 기반 커뮤니티 통합

- Status: `origin/main` 최신 커밋 `70b1dd7` 기준 통합 브랜치에서 병합 완료. main 직접 병합·푸시·배포·원격 migration 적용은 아직 하지 않았습니다.
- Merge: Claude의 관리자·피드백 작업과 제품 코드 충돌 없음. 변경기록은 양쪽 기록을 모두 보존했습니다.
- Migration order: Claude의 `20260901040000_analysis_feedback.sql` 뒤에 실행되도록 커뮤니티 migration을 `20260901050000_community_lounge.sql`로 변경했습니다.
- Rollback: 통합 merge commit revert. 원격 DB에는 아직 적용하지 않았습니다.

## 2026-09-01 — Codex: 커뮤니티 라운지 작업 이관

- Status: 통합 전용 브랜치 `codex/community-lounge`에 준비됨. main에는 아직 병합하지 않았습니다.
- Source: `feature/codex-plan`의 커밋 `f4282bc`에서 커뮤니티 관련 파일만 선별 이관했습니다. 같은 커밋의 심리검사·커리어 화면·이미지 변경은 가져오지 않았습니다.
- Files: `src/app/community/page.tsx`, `src/components/community-lounge.tsx`, `src/components/community-lounge.module.css`, `src/domain/community-lounge.ts`.
- Behavior: `/community`에 예시 글과 주제 필터, 개인정보 안내, 커리어 검사 연결을 제공하는 기초 라운지 화면입니다. 실제 글쓰기·댓글·저장·반응 수치는 구현하지 않았습니다.
- Protected work: main에 있던 `MOOA_RESUME_RESULT_DOCUMENT_UPSTAGE_ADDENDUM.md`, `next-env.d.ts`의 미커밋 변경과 워크트리의 심리검사 미커밋 변경은 수정·stage 대상에서 제외했습니다.
- Validation: 이관 뒤 lint/typecheck 예정.
- Rollback: 이 브랜치의 커뮤니티 이관 커밋 revert 또는 위 신규 파일 4개 제거.
## 2026-09-01 — Codex: 커뮤니티 라운지 V2 추가 기획 문서

- Status: 기획 초안만 추가. 기능·DB·API 변경 없음.
- Reason: 현재 `/community` 기초 라운지 다음 단계의 UX·안전 기준을 별도 문서화하되, 기존의 커뮤니티 구현 보류 결정을 유지하기 위함.
- Source limits: 공유된 ChatGPT 대화 링크는 이 환경에서 열리지 않았고, 워크트리에서도 코인니스/해당 스크린샷 기록을 찾지 못했습니다. 확인하지 못한 레퍼런스는 사실처럼 기록하지 않았습니다.
- File: `docs/community-lounge-v2-addendum-2026-09-01.md`.
- Rollback: 문서 파일과 이 로그 항목만 제거.
## 2026-09-01 — Codex: 취업·진로 익명 라운지 실제 기능 기반 + 반응형 피드

- Status: `codex/community-lounge` 브랜치 구현 중. main 병합·원격 migration 적용·배포는 하지 않았습니다.
- Reference: CoinNess 라운지의 공개 정보 구조(최신/인기, 주제 탭, 화제글, 모바일 고정 작성 CTA)를 참고하되, 자산·실시간 토크·반응 경쟁 UI를 복제하지 않고 취업·진로 고민용으로 재구성했습니다.
- UI: `/community`를 최신/인기 정렬, 4개 주제 탭, 화제글, 익명 글쓰기, 댓글, 추천, 신고 흐름이 있는 반응형 피드로 교체했습니다. 데이터/API 계층과 CSS를 분리해 Stitch 등 후속 시안으로 UI를 교체할 수 있습니다.
- Data/privacy: 신규 local migration `20260901040000_community_lounge.sql`은 게시글·댓글·추천·첨부 메타데이터·신고와 RLS를 만듭니다. `community-attachments` 버킷은 **비공개**이며, 첨부 원본은 로그인 사용자만 60초 서명 URL로 엽니다. 원격 Supabase에는 적용하지 않았습니다.
- Files: `src/domain/community.ts`, `src/server/community/community-repository.ts`, `src/app/api/community/**`, `src/components/community-lounge.*`, `src/components/site-nav.*`, migration 및 테스트.
- Protected work: `MOOA_RESUME_RESULT_DOCUMENT_UPSTAGE_ADDENDUM.md`, `next-env.d.ts`, `.codex-remote-attachments/`와 심리검사 워크트리 변경은 수정·stage 대상에서 제외합니다.
- Rollback: 이 브랜치의 커뮤니티 후속 커밋 revert. migration은 원격 적용 전이므로 DB 롤백 불필요.
## 2026-09-01 — Codex: 라운지 주소 유지, 공통 헤더 노출 보류

- Change: `/community` 페이지와 커뮤니티 기능은 유지하되 `SiteNav`의 직접 링크와 메뉴 패널 링크는 제거했습니다.
- Reason: Claude가 main 헤더를 계속 작업 중이므로 겹치는 공통 메뉴 변경을 이번 커뮤니티 브랜치에서 빼고, 라운지 공개 시점에 별도 결정합니다.
- Rollback: 라운지 공개 결정 시 `SiteNav`에 링크를 별도 커밋으로 다시 추가.

## 2026-09-01 — Codex: 최신 main 기반 커뮤니티 통합

- Status: `origin/main` 최신 커밋 `70b1dd7` 기준 통합 브랜치에서 병합 완료. main 직접 병합·푸시·배포·원격 migration 적용은 아직 하지 않았습니다.
- Merge: Claude의 관리자·피드백 작업과 제품 코드 충돌 없음. 변경기록은 양쪽 기록을 모두 보존했습니다.
- Migration order: Claude의 `20260901040000_analysis_feedback.sql` 뒤에 실행되도록 커뮤니티 migration을 `20260901050000_community_lounge.sql`로 변경했습니다.
- Rollback: 통합 merge commit revert. 원격 DB에는 아직 적용하지 않았습니다.
## 2026-09-01 — Claude: 결과가 나왔는데 실패 화면이 남던 문제

- Agent/session: Claude. 사용자 확인("첨삭은 됐는데 왜 실패라고 나오나 / 재시도 3번 맞나"). 관리자 화면에는 `완료 · 시도 2회`인데 신청자 화면은 실패였습니다.
- Status: main에 적용. 마이그레이션 없음.
- 원인: 화면이 `analysisStatus === "FAILED"`를 보는 순간 **폴링을 끊었습니다**(`return`). 그런데 서버는 재시도가 남아 있으면 스스로 한 번 더 돌립니다. 그 사이 결과가 만들어져도 화면은 이미 듣기를 그만둔 뒤라 실패로 굳었습니다. **돈을 낸 사람에게 이보다 나쁜 화면은 없습니다** — 결과는 계정에 있는데 본인은 날린 줄 압니다.
- 곁가지 원인 둘: `execute`/`advance` 호출이 **한 번** 거절당해도 즉시 실패로 확정했습니다. 첫 시도만 실패하고 두 번째가 성공하는 일이 실제로 있었는데, 그 한 번에 화면이 끝났습니다.
- Change 1: `FAILED`여도 **재시도가 남아 있으면 폴링을 계속합니다.** 화면은 `다시 시도 중`으로 바뀌고(아이콘도 경고 → 진행), 끝나는 대로 결과로 이동합니다. 직접 누르는 재시도 버튼은 그대로 둡니다 — 기다리기 싫은 사람도 있습니다.
- Change 2: 실행 호출이 거절당하면 **3번까지는 계속 폴링**하고, 그 뒤에야 실패로 확정합니다. 한 번에 포기하지 않되, 설정이 깨진 경우 10분간 조용히 도는 것도 막습니다(그 방지책이 원래 이 분기를 만든 이유였습니다).
- Change 3: 이 파일의 한국어 문구 두 개가 유니코드 이스케이프로 깨진 채(`? 시도 2/3`) 저장돼 있어 되살렸습니다.
- 재시도 정책(확인): DB가 `p_retryable and attempt_count < 2`일 때만 재시도를 허용합니다 — 즉 자동 재시도는 최대 한 번 더, 화면 표기는 `n/3`.
- **비용 메모:** 재시도는 **API 요금을 다시 씁니다**(상태 조회는 아님). 첫 시도 실패가 잦으면 건당 원가가 두 배가 되므로, 실패가 반복되면 출력 토큰 상한을 봐야 합니다.
- Files: `src/components/quick-checkout-return.tsx`.
- Validation: 834 tests passed, `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.

## 2026-09-01 — Claude: 실패 알림(A) + 무료 이용권 경로의 같은 폴링 버그 + 결과 로그인 화면

- Agent/session: Claude. 사용자 요청/보고 3건.
- Status: main에 적용. 마이그레이션 없음.

### 1. 더 시도할 것이 없는 실패를 운영자에게 알림 (사용자 선택지 A)
- 배경: 3회를 소진한 런은 **손님이 할 수 있는 일이 없습니다**(재시도 버튼도 안 뜸). 그런데 그 사실이 관리자 화면을 직접 열어야만 보였습니다. 손님이 처음부터 다시 쓰기 시작하기 전에 끼어들 수 있어야 합니다.
- 붙인 자리: `SupabaseQuickAnalysisRunRepository.fail()` — **모든 실패가 지나는 한 곳**입니다. 알림 쪽이 DB에 상태를 다시 물어 `FAILED`로 남아 있을 때만 보냅니다(재시도가 남으면 상태가 `PENDING`으로 되돌아가 있어 알리지 않습니다). 매번 알리면 곧 안 읽는 메일이 됩니다.
- 알림 실패는 삼킵니다 — 실패 기록이 알림 때문에 다시 실패하면 남는 것은 상태가 어긋난 런입니다.
- 조사 결과 기록: `classifyFailure`는 이미 **`AI_PROVIDER_FAILED`만 재시도 가능**으로 봅니다. 검증 실패·원인 불명은 1회로 끝납니다. 즉 "3회씩 계속 태우는" 상황은 구조적으로 드뭅니다. 그래서 C(즉시 환불)는 실제 사례가 나온 뒤로 미룹니다.

### 2. 무료 이용권 경로도 첫 거절에 포기하던 문제
- 사용자 보고("무료쿠폰 분석 로딩에서 실패 뜨는데, 메일로 들어가면 결과는 나온다").
- 원인: 결제 경로는 앞선 커밋에서 고쳤지만, **이용권 런은 폴링 루프가 따로 있습니다**(`creditRunId` 효과). 그쪽이 여전히 첫 non-2xx에 실패로 확정하고 멈췄습니다. 서버는 재시도해 완료했고, 화면만 죽어 있었습니다.
- 같은 방식으로 고침: 3번까지는 계속 폴링하고 `다시 시도 중`으로 표시.

### 3. 메일에서 들어오는 로그인 화면 재설계
- 사용자 지적("너무 짜친다 / 모바일은 작고 세련되게").
- 셋을 지켰습니다 — **글을 줄이고**(제목 한 줄, 설명 한 문단), **버튼을 엄지 닿는 아래로**(`margin-top: auto`), **테두리를 걷어냈습니다**(작은 화면에서 카드 선은 답답함으로만 남습니다). 넓은 화면에서는 카드로 되살립니다.
- 글자 배지 대신 아이콘 한 개. 보조 행동은 테두리 없는 텍스트 버튼으로 낮췄습니다 — 버튼이 둘이면 무엇이 기본인지 흐려집니다.
- **또 `zoom` 함정:** `min-height: 100dvh`도 배율을 따라오지 않아 화면보다 1.25배 긴 상자가 되고, 버튼이 접힘선 아래로 내려갔습니다(412px에서 버튼 하단 1021px). `calc(100dvh / var(--app-scale, 1))`로 고쳐 793px. 후기 페이지도 같이 고쳤습니다.
- 검증: 헤드리스 크롬 412px·1280px 렌더 확인, 가로 넘침 없음.
- Files: `run-failure-alert-email.ts`(신규)·`.test.ts`(신규 4건), `supabase-quick-analysis-run-repository.ts`, `quick-checkout-return.tsx`, `result-sign-in.tsx`, `result-sign-in.module.css`, `feedback-form.module.css`.
- Validation: 838 tests passed (+4), `tsc` clean, `eslint` 0 errors, `next build` 클린.
- Rollback: 이 커밋 revert.
## 2026-08-31 — Codex: account-backed AI interpretation eligibility

- Agent/session: Codex (`feature/codex-plan`).
- Issue: the AI interpretation screen used only `sessionStorage` to determine completed assessments. After a local development restart or a new browser session, a logged-in user could therefore see an incorrect “start the assessment” prompt despite an account-saved record.
- Change: after authentication, the AI preparation screen now loads the user’s latest saved assessment records from the existing authenticated endpoint and combines them with the current browser-session answers. It waits for that check before rendering the eligibility state. An individual scope needs only that individual completed record; combined scope still correctly requires all three.
- Storage UX: clarified the result-page message when the existing assessment database migration is not available versus an ordinary save failure. No migration was applied and no account data was changed.
- Payment boundary: this remains a preparation/selection page. Checkout, payment entitlement, and external AI calls are still deliberately not implemented; the disabled state continues to disclose that clearly.
- Files: `src/components/career-ai-preparation.tsx`, `src/components/career-ai-preparation.module.css`, `src/components/career-assessment-storage-notice.tsx`.
- Validation: `npm run typecheck` passed; `npm run lint` passed; `npm test -- career-interest.test.ts` passed (2 tests); `/career/ai?scope=interest` returned HTTP 200.
- Rollback: restore the three listed component files; no schema, stored data, or remote service changes are involved.

## 2026-08-31 — Codex: career-home deep-interpretation target correction

- Agent/session: Codex (`feature/codex-plan`).
- Change: changed the generic bottom `심층해설 확인하기` button on the career home from the accidentally hardcoded 직업흥미 scope to the requested 직업가치 (`work_values`) scope. Individual result pages already route to their own matching scope.
- Files: `src/components/career-public-home.tsx`.
- Validation: inspected all career AI scope links; static route target has no API/data impact.
- Rollback: change that single href back to the previous interest scope.

## 2026-08-31 — Codex: sample deep-interpretation reports for all scopes

- Agent/session: Codex (`feature/codex-plan`).
- Change: generalized the former RIASEC-only AI report example into four explicit example scopes: 직업흥미, 업무성향, 직업가치 우선순위, and 세 검사 종합. Each has its own example result axes, short type label, strength framing, environment checks, role/industry exploration, application checks, and matching two-page report links.
- UX: every available individual/combined AI preparation page now exposes `심층해설 예시 보기` and retains its active scope through both example pages. These are static illustrative records only; they neither use the current user result nor make a job-fit or hiring prediction.
- Files: `src/domain/career-ai-sample.ts`, `src/components/career-ai-preparation.tsx`, `src/components/career-ai-sample-overview.tsx`, `src/components/career-ai-sample-overview.module.css`, `src/components/career-ai-sample-report.tsx`, `src/app/career/ai/sample/page.tsx`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; example page requests for `interest`, `work_style`, `work_values`, and `combined` all returned HTTP 200.
- Rollback: restore the listed sample components/route and remove `career-ai-sample.ts`; no account, API, schema, or payment changes are involved.

## 2026-08-31 — Codex: AI selection-page sample report gallery

- Agent/session: Codex (`feature/codex-plan`).
- Change: added a four-card `REPORT EXAMPLES` gallery inside the completed AI preparation/selection screen. It links directly to the example reports for 직업흥미, 업무성향, 직업가치 우선순위, and 세 검사 종합, instead of only exposing the current scope’s example through one button.
- Boundary: cards use clearly labeled static example data. They do not reveal unfinished assessments, alter the current account record, or provide a user-specific AI report.
- Files: `src/components/career-ai-preparation.tsx`, `src/components/career-ai-preparation.module.css`, `src/domain/career-ai-sample.ts`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; `/career/ai?scope=interest` returned HTTP 200.
- Rollback: remove `SampleReportGallery`, its CSS rules, and the sample-scope export; no data/API changes are involved.

## 2026-08-31 — Codex: RIASEC character marquee on interest introduction

- Agent/session: Codex (`feature/codex-plan`).
- Change: added the user-supplied six RIASEC character images to `public/images/career-characters/` and placed an automatically scrolling character-preview marquee below the `/career/interest` introduction. It repeats seamlessly, pauses on hover, has a reduced-motion fallback, and uses a smaller mobile layout.
- Content boundary: the cards deliberately crop to the character artwork and label only its R/I/A/S/E/C area. The source images’ embedded recommended-job text is not surfaced as product content. The section explicitly calls itself a preview; actual results remain determined only by completed responses.
- Files: `public/images/career-characters/riasec-{r,i,a,s,e,c}.png`, `src/components/career-interest-assessment.tsx`, `src/components/work-style-assessment.module.css`.
- Validation: `npm run typecheck` passed; `npm run lint` passed; `/career/interest` returned HTTP 200.
- Rollback: remove the character showcase JSX/CSS and the six listed image assets; no data/API behavior is involved.

## 2026-08-31 — Codex: enlarged contained RIASEC marquee cards

- Agent/session: Codex (`feature/codex-plan`).
- Change: constrained the interest-page character marquee to the existing introduction content width instead of the full viewport. Enlarged desktop cards from 126×166 to 200×262 so roughly three cards are visible at once, removed the overlay label that covered image content, and retained a smaller responsive mobile version.
- Reason: user reported that the previous full-width treatment made the supplied character artwork and its embedded readable text too small.
- Files: `src/components/career-interest-assessment.tsx`, `src/components/work-style-assessment.module.css`.
- Validation: `npm run typecheck` passed; `/career/interest` returned HTTP 200.
- Rollback: restore the prior character showcase CSS/markup; no data/API changes are involved.

## 2026-08-31 — Codex: preserve source quality in character marquee

- Agent/session: Codex (`feature/codex-plan`).
- Change: configured the supplied PNG character artwork in the interest-page marquee to bypass Next.js image optimization and use source-quality output, while retaining the 200×262 contained card layout.
- Reason: user reported visibly blurred small embedded text in the carousel.
- Files: `src/components/career-interest-assessment.tsx`.
- Validation: `npm run typecheck` passed; `/career/interest` returned HTTP 200.
- Rollback: remove `quality={100}` and `unoptimized` from the six preview images.

## 2026-08-31 — Codex: 150% RIASEC marquee card scale

- Agent/session: Codex (`feature/codex-plan`).
- Change: increased desktop RIASEC character-marquee cards from 200×262 to 300×393 (150%), showing about two cards plus the next edge within the contained introduction width. Mobile cards now use 190×249.
- Reason: user chose the 150% option to make the supplied image text easier to read while preserving a scrolling-gallery feel.
- Files: `src/components/career-interest-assessment.tsx`, `src/components/work-style-assessment.module.css`.
- Validation: `npm run typecheck` passed; `/career/interest` returned HTTP 200.
- Rollback: restore the former 200×262 desktop and 154×202 mobile dimensions.

## 2026-08-31 — Codex: RIASEC character-card layout and sharing prototype

- Agent/session: Codex (`feature/codex-plan`).
- Change: copied the 10 newly supplied RIASEC two-letter character artworks into `public/images/career-character-examples/` and added an interest-report-only interactive character-card test section to `/career/ai/sample?scope=interest`. It includes ten selectable example cards, a toggle to compare the requested `결과 옆 카드형` and `상단 독립형` layouts, and card-plus-explanation content.
- Sharing prototype: added browser-native share, copy-link, and mailto email controls for the selected static example URL. Native mobile sharing can expose installed apps such as KakaoTalk. Direct KakaoTalk template sending is intentionally not implemented because it requires a Kakao developer application/key. No public user-result link or user data is created.
- Content/privacy boundary: this is visibly an example-catalog design test; the supplied image’s embedded job/fit claims are not used as a personalized result. A real result share flow must require explicit user opt-in and issue a revocable, unguessable public token.
- Files: `public/images/career-character-examples/{ri,ra,rs,re,rc,ar,ir,er,sr,cr}.png`, `src/components/career-interest-character-preview.tsx`, `src/components/career-interest-character-preview.module.css`, `src/components/career-ai-sample-overview.tsx`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; `/career/ai/sample?scope=interest` returned HTTP 200.
- Rollback: remove the preview component/CSS, its conditional overview import, and the ten example image assets; no account/API/schema changes are involved.

## 2026-08-31 — Codex: independent RIASEC base-card and support-axis result flow

- Agent/session: Codex (`feature/codex-plan`).
- Change: replaced the rejected in-report character layout test with an independent `/career/character?code=XYZ` result page. The domain now treats the ordered first two RIASEC letters as the 30-card base identity/name and the third as a support axis that changes only the descriptor and explanatory copy. This derives all 120 ordered three-letter explanations without requiring 120 images.
- UI: the interest sample result links to its independent example card, and the actual interest result links to its own card using the calculated three-letter code. The page displays the three ranks, base card code/name, support-axis explanation, and native share/copy/email controls.
- Asset behavior: cards load by their two-letter filename (`is.png`, `si.png`, etc.) from the character-example asset folder. Until the remaining 20 artworks are supplied, a deliberately labeled placeholder is shown for missing card images rather than presenting a mismatched character.
- Boundary: two-letter card labels and third-axis descriptions are MOOA career-exploration presentation language, not official standardized type labels or a job-fit verdict. Direct public sharing remains a local UI prototype; no user data is published.
- Files: `src/domain/career-interest.ts`, `src/app/career/character/page.tsx`, `src/components/career-character-result.tsx`, `src/components/career-character-result.module.css`, `src/components/career-interest-result.tsx`, `src/components/career-ai-sample-overview.tsx`, corresponding existing CSS modules.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; `/career/character?code=isa&example=1` and `/career/interest/result` returned HTTP 200.
- Rollback: remove the independent character route/component and restore the prior result links; no schema, stored assessment, or remote sharing state changes are involved.

## 2026-08-31 — Codex: three independent RIASEC result screens

- Agent/session: Codex (`feature/codex-plan`).
- Change: turned the interest result into a clear three-screen path: **01 기본 결과**, **02 캐릭터 해설**, and **03 심층해설 예시**. The first page now presents only result essentials plus the three navigation choices. The new character route is a complete report with its base card, ordered three-axis reading, evidence-oriented strengths, environment/role exploration, and browser-native share/copy/email controls.
- RIASEC model: all valid three-letter results remain ordered codes (for example `ISR`). The first two letters select the ordered two-letter base card, image, and MOOA exploration label; the third letter is an explanatory support axis. That yields 120 narrative combinations without falsely requiring 120 separate images. `IS` and `SI` remain distinct base cards. This is presentation for career self-exploration, not an official standardized type, diagnostic, or job-fit conclusion.
- Files: `src/domain/career-interest.ts`, `src/components/career-interest-result.tsx`, `src/components/work-style-assessment.module.css`, `src/components/career-character-result.tsx`, `src/components/career-character-result.module.css`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; `/career/interest/result`, `/career/character?code=isr`, and `/career/ai/sample?scope=interest` each returned HTTP 200.
- Rollback: remove the result navigation and restore the preceding character route component/domain fields; no schema, stored assessment, or remote sharing state changes are involved.

## 2026-08-31 — Codex: selectable completed AI-report design variants

- Agent/session: Codex (`feature/codex-plan`).
- Change: corrected the prior interpretation of “1·2·3.” The interest AI sample landing page now presents **디자인 1**, **디자인 2**, and **디자인 3** as explicit choices. Each opens a separate full example report using the same ISA example data, so the user can compare layout rather than content.
- Variants: design 1 is the existing editorial summary/report flow; design 2 is the document-style detailed report; design 3 is a new dashboard-brief layout with axis signals, interpretation, experience prompts, role/industry exploration, environment caveat, and the actual-report next step. Existing `page=2` links remain compatible by resolving to design 2.
- Files: `src/app/career/ai/sample/page.tsx`, `src/components/career-ai-sample-overview.tsx`, `src/components/career-ai-sample-overview.module.css`, `src/components/career-ai-sample-design-three.tsx`, `src/components/career-ai-sample-design-three.module.css`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; all three interest sample design URLs returned HTTP 200.
- Rollback: remove the design query routing, picker markup/CSS, and design-three files; the original sample overview/report remain available.

## 2026-08-31 — Codex: character-image-led sample report variants

- Agent/session: Codex (`feature/codex-plan`).
- Change: revised the three AI sample design pages so they are image-card-led complete report pages rather than text-layout comparisons. Each interest design now includes an ISA example character visual plus filled interpretation, axis context, experience prompts, exploration, and caveats.
- Asset constraint: the supplied two-letter card set does not currently include `IS`, so the ISA example uses the supplied broad 탐구형(I) source artwork as a temporary visual rather than mislabeling another two-letter character card as `IS`. When `public/images/career-character-examples/is.png` is supplied, replace this temporary visual with the exact base-card asset.
- Sharing: no public sharing was added in these sample pages. When enabled later, the default should share only the selected generated character/report card via an explicit user action and a revocable public token, not the user’s full assessment history.
- Files: `src/components/career-ai-sample-overview.tsx`, `src/components/career-ai-sample-overview.module.css`, `src/components/career-ai-sample-report.tsx`, `src/components/career-ai-sample-report.module.css`, `src/components/career-ai-sample-design-three.tsx`, `src/components/career-ai-sample-design-three.module.css`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; design 1, 2, and 3 interest URLs returned HTTP 200.

## 2026-08-31 — Codex: result-form visual reports without sample chrome

- Agent/session: Codex (`feature/codex-plan`).
- Change: revised all three interest AI-report designs to read as actual output screens, removing public-facing `EXAMPLE`, `예시`, and producer-explanation phrasing. The pages now surface result, interpretation, experience prompts, role/industry exploration, and boundaries directly.
- Visual: changed the supplied character artwork from cover/crop rendering to contained rendering in every design so the whole image card is visible. The temporary ISA visual remains the supplied broad I artwork until the exact `is.png` base-card asset is received.
- Sharing: deliberately remains absent from these UI prototypes. A future share action should publish only an explicitly selected card/report through a revocable public token, never the full private result history.
- Files: `src/domain/career-ai-sample.ts`, `src/components/career-ai-sample-overview.tsx`, `src/components/career-ai-sample-overview.module.css`, `src/components/career-ai-sample-report.tsx`, `src/components/career-ai-sample-report.module.css`, `src/components/career-ai-sample-design-three.tsx`, `src/components/career-ai-sample-design-three.module.css`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; each interest design URL returned HTTP 200.

## 2026-08-31 — Codex: ISA interpretation copy and design-two simplification

- Agent/session: Codex (`feature/codex-plan`).
- Change: removed the character card from design 2 so it reads as a focused, document-style interpretation report. Replaced design 1’s axis-listing sentence and design 3’s producer-facing “해설 방식” block with concrete ISA interpretation: deep problem understanding (I), explanation/collaboration (S), and expression/improvement (A).
- Content: the interest sample’s opening copy now behaves like an actual result narrative rather than describing how a future report would work.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; all three interest design URLs returned HTTP 200.

## 2026-08-31 — Codex: unified final AI deep-interpretation result page

- Agent/session: Codex (`feature/codex-plan`).
- Change: removed the public design-1/2/3 selection experience and the separate “character result card” choice from the AI sample route. `/career/ai/sample?scope=interest` now opens one unified final report: character visual, three-axis interpretation, strengths, evidence prompts, roles/industries, environment caution, and next step in one page. Historical design query parameters resolve to that same final page rather than exposing variants.
- Files: `src/app/career/ai/sample/page.tsx`, `src/components/career-ai-sample-design-three.tsx`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with only the pre-existing unused `INTEREST_TEST_VERSION` warning; the unified route and former design URLs returned HTTP 200.

## 2026-08-31 — Codex: 30-card RIASEC base-card review route

- Agent/session: Codex (`feature/codex-plan`).
- Change: restored the former detailed report at `design=2` and implemented `design=1` as a separate, card-only review screen. It shows the actual ordered 3-letter result, the ordered 2-letter base code/name and image, the base-type core explanation, the third-axis support explanation, and a final combined interpretation. Previous/next plus a 30-card picker lets the user inspect every ordered pair without mixing it into the full report UI.
- Data: added `RIASEC_PAIR_PROFILES` (30 generated pair profiles) and `getRiasecPairProfile`, derived from the existing `RIASEC_BASE_PROFILE_NAMES` and existing dimension/strength data. Third-axis content remains in existing `SUPPORT_COPY`; no 120 images or main type names were added.
- Asset behavior: missing pair-image files receive a clearly labeled placeholder rather than another pair’s image. The existing supplied pairs load normally.
- Files: `src/domain/career-interest.ts`, `src/app/career/ai/sample/page.tsx`, `src/components/career-ai-sample-card-review.tsx`, `src/components/career-ai-sample-card-review.module.css`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with only the pre-existing unused `INTEREST_TEST_VERSION` warning; `IS`/`RI` card-review URLs and the restored design-2 route returned HTTP 200.

## 2026-08-31 — Codex: Stitch modern career insight report replacement

- Agent/session: Codex (`feature/codex-plan`).
- Source reference: user-supplied `stitch_modern_career_type_insight (1).zip`, including `DESIGN.md` and `code.html`.
- Change: replaced the public `/career/ai/sample?scope=interest` view with a single Stitch-inspired white, indigo/violet premium report: sticky app bar; two-column result/character hero; compact strength/role/job blocks; three insight cards; full deep interpretation; coaching summaries and detailed coaching sections; work-environment section; image download/native share/link-copy controls; responsive one-column mobile layout.
- Data boundary: retains existing `CareerAiSample` and RIASEC three-axis data; no external AI call is made. The static output is a UI implementation of the intended result format and does not claim a live model generated it.
- Files: `src/app/career/ai/sample/page.tsx`, `src/components/career-ai-sample-design-three.tsx`, `src/components/career-ai-sample-design-three.module.css`.
- Validation: `npm run typecheck` passed; `npm run lint` passed with the pre-existing unused `INTEREST_TEST_VERSION` warning only; the target local URL returned HTTP 200.

## 2026-09-01 — Codex: RIASEC 카드 전체 매핑 및 이미지 공유

- 상태: 완료
- 변경 파일: `public/images/career-character-examples/*.png`, `src/components/career-ai-sample-design-three.tsx`, `src/components/career-ai-sample-design-three.module.css`
- 이유: 실제 3글자 결과의 앞 두 글자 조합에 맞는 카드가 노출되도록 하고, 예전 단일 이미지의 검은 모서리/여백을 제거하며 카드 파일 저장·공유를 제공한다.
- 내용: 사용자 제공 20장을 추가해 30개 순서형 조합(RI/IR 등)을 완성했다. 결과 화면은 `profile.imagePath`를 사용하며, 카드 비주얼은 오른쪽 캐릭터 영역을 자연스럽게 크롭해 모서리 아티팩트가 보이지 않는다. 공유는 지원 기기에서 PNG 파일을 먼저 공유하고, 불가하면 결과 링크를 공유·복사한다.
- 검증: `npm run typecheck`, `npm run lint` 통과. 로컬 서버(3001)는 현재 실행 중이지 않아 HTTP 화면 확인은 보류.
- 롤백: 이 작업 이전 Git 상태 또는 해당 컴포넌트/CSS의 직전 변경사항
## 2026-09-01 — Codex: 카드 비율 보존 표시

- 상태: 완료
- 변경 파일: `src/components/career-ai-sample-design-three.module.css`
- 이유: 이미지 모서리를 숨기려던 `cover` 방식이 원본 카드의 위·아래·좌우 내용을 자르는 문제가 확인됐다.
- 내용: 1122×1402 원본 비율을 유지하는 `contain` 표시로 변경했다. 둥근 컨테이너와 아주 미세한 확대만 유지해 모서리 아티팩트는 가리고 카드 전체는 보존한다.
- 검증: `npm run lint` 통과 (기존 미사용 상수 경고 1건 유지).
- 롤백: 직전 `object-fit: cover` CSS 변경
## 2026-09-01 — Codex: RIASEC 대표명·3글자 결과명 통일

- 상태: 완료
- 변경 파일: `src/domain/career-interest.ts`, `src/components/career-ai-sample-design-three.tsx`
- 이유: IS 카드 이미지의 ‘통찰형 조력자’와 웹 결과의 ‘지식 연결가’가 달라 실제 카드와 결과가 다른 유형처럼 보였다.
- 내용: IS 기본 카드명을 ‘통찰형 조력자’로 통일했다. 3글자 결과는 `ISA · 통찰형 조력자`, 동적 부제는 `표현·창의성을 더하는 통찰형 조력자`, 기준 표기는 `기본 카드 IS · 통찰형 조력자`로 보여 2글자 카드와 3번째 보조축의 역할을 구분한다.
- 검증: `npm run typecheck` 통과.
- 롤백: IS 기본 카드명 ‘지식 연결가’ 및 이전 제목 표기
## 2026-09-01 — Codex: AI 심층해설 결과 확인 로딩 화면

- 상태: 완료
- 변경 파일: `src/components/career-ai-preparation.tsx`, `src/components/career-ai-preparation.module.css`
- 이유: 기존 로딩 상태가 일반 AI 해설 페이지의 큰 제목을 그대로 사용하며 ‘계정에 보관한 결과’를 단정해 비로그인·저장 전 맥락에서 어색했다.
- 내용: 헤더·푸터 없이 `검사 결과를 불러오는 중이에요.`를 보여주는 독립 로딩 패널과 회전 아이콘·스켈레톤을 추가했다.
- 검증: `npm run typecheck` 통과.
- 롤백: 기존 `AiFrame` 기반 로딩 분기
## 2026-09-01 — Codex: 무아 유형명과 카드 제목 분리

- 상태: 완료
- 변경 파일: `src/domain/career-interest.ts`, `src/components/career-ai-sample-design-three.tsx`
- 이유: 무아 고유 유형명 ‘지식 연결가’를 유지하면서도, 제공된 IS 이미지 카드 제목 ‘통찰형 조력자’와 불일치하지 않게 표시해야 했다.
- 내용: ISA 결과 화면의 대표명은 ‘지식 연결가’로 복원했다. 카드의 시각 제목은 별도 `cardTitle`로 두어 `기본 카드 IS · 통찰형 조력자`로 표시하며, 3번째 A축의 동적 부제는 유지한다.
- 검증: `npm run typecheck` 통과.
- 롤백: `baseName` 단일 이름 사용 방식
## 2026-09-01 — Codex: RIASEC 결과·기본 카드·보조축 표기 분리

- 상태: 완료
- 변경 파일: `src/domain/career-interest.ts`, `src/components/career-ai-sample-design-three.tsx`
- 이유: ISR 결과에서 보조축 문장에 IS 카드명을 다시 붙여, `지식 연결가`와 `통찰형 조력자`의 역할이 혼동됐다.
- 내용: 결과 대표명은 `ISR · 지식 연결가`, 기본 카드는 `IS · 통찰형 조력자`, 세 번째 R은 `R 보조 성향 · 현장 검증을 더하는`으로 명확히 분리했다.
- 검증: `npm run typecheck` 통과.
- 롤백: 보조축 부제에 카드명을 덧붙이던 방식
## 2026-09-01 — Codex: RIASEC 결과명·카드 부제 위치 조정

- 상태: 완료
- 변경 파일: `src/components/career-ai-sample-design-three.tsx`, `src/components/career-ai-sample-design-three.module.css`
- 이유: 무아 결과명 ‘지식 연결가’는 ISR 코드 옆에, IS 카드명 ‘통찰형 조력자’는 바로 아래 부제로 보여야 한다는 화면 계층 요구를 반영했다.
- 내용: 결과 줄을 `ISR · 지식 연결가`로, 부제를 `IS · 통찰형 조력자`로 재배치했다. 중복되는 기본 카드 안내는 제거하고 3축 조합만 보인다.
- 검증: `npm run typecheck` 통과.
- 롤백: 결과명과 카드명을 각각 세로 줄에 두던 방식
## 2026-09-01 — Codex: RIASEC 결과·부제 타이포그래피 통일

- 상태: 완료
- 변경 파일: `src/components/career-ai-sample-design-three.module.css`
- 이유: `ISR · 지식 연결가`와 `IS · 통찰형 조력자`가 재배치 뒤 크기·굵기·자간의 위계가 기존 카드 디자인과 어울리지 않았다.
- 내용: 결과 코드와 무아 유형명을 한 제목 줄로 보이도록 비율·굵기·자간을 맞췄고, IS 카드명은 더 작고 선명한 부제 단계로 조정했다.
- 검증: `npm run lint` 통과 (기존 미사용 상수 경고 1건 유지).
- 롤백: 직전 제목 타이포그래피 CSS
## 2026-09-01 — Codex: IS 카드 보라색 결과 테마

- 상태: 완료
- 변경 파일: `src/components/career-ai-sample-design-three.tsx`, `src/components/career-ai-sample-design-three.module.css`
- 이유: IS 카드 이미지의 보라색과 ISR 등 IS 기반 결과 화면의 기존 파란색이 맞지 않았다.
- 내용: 기본 카드 코드가 IS인 결과에만 보라색 CSS 테마를 적용했다. 결과 코드·무아 유형명·보조성향·핵심 정보 아이콘이 카드와 같은 보라 계열로 바뀌며, 다른 카드 결과는 기존 색을 유지한다.
- 검증: `npm run typecheck` 통과.
- 롤백: 카드 코드별 색상 테마 분기 이전 CSS
## 2026-09-01 — Codex: 취업/진로 고민 익명게시판 기초 라운지

- 상태: 완료
- 변경 파일: `src/app/community/page.tsx`, `src/components/community-lounge.tsx`, `src/components/community-lounge.module.css`, `src/domain/community-lounge.ts`
- 이유: 게시판 기능 자체보다 취업·진로 고민 유입을 커리어 검사와 연결하는, 교체 가능한 로컬 라운지 기초 화면이 필요했다.
- 내용: `/community`에 `취업/진로 고민 익명게시판`을 추가했다. 주제 선택형 예시 피드, 개인정보 보호 안내, 직업흥미·커리어 검사 연결, 익명 글쓰기 준비 영역을 구현했다. 실제 글쓰기·댓글·저장·반응 수치는 아직 만들지 않았으며, 데이터와 UI/CSS를 분리해 다음 디자인 또는 DB 구현에서 교체할 수 있게 했다.
- 검증: `npm run typecheck` 통과.
- 롤백: 위 신규 파일 삭제 또는 이번 작업 전 Git 상태

## 2026-09-02 — Claude: 커리어 검사 중간 병합 + 직업흥미만 공개

- Status: main에 병합 완료(`64d5d56`). 잠금 작업은 이어지는 커밋. 배포는 사용자 확인 후.
- Merge: `feature/codex-plan`의 `f4282bc`(커리어 캐릭터 결과지·해설 UI, PNG 62장 약 66MB)를 main에 병합했습니다. 그 전에 `origin/main`의 미수신 커밋 2개(`4ce4002`, `ebe6a03`)를 먼저 병합했습니다.
- 충돌 3건과 해결:
  - `src/components/community-lounge.tsx`, `.module.css` → **main 버전 유지**. 워크트리는 20커밋 전 분기라 라운지가 버튼 전부 `disabled`인 미리보기 단계입니다. main에는 이후 글쓰기·댓글·추천·신고 API까지 붙은 구현이 있어, 병합본을 채택하면 그 기능이 사라집니다.
  - `docs/agent-change-log.md` → 양쪽 기록 모두 보존.
- 남은 정리 대상(삭제하지 않음): `src/domain/community-lounge.ts`가 병합으로 들어왔으나 main의 라운지는 `@/domain/community`를 씁니다. 코덱스 소유 파일이라 판단을 넘깁니다.
- 잠금(추가 커밋): 직업흥미만 공개하고 업무성향·직업가치는 결과지 완성 전까지 닫았습니다.
  - 스위치: `src/domain/career-assessment-openness.ts` — `OPEN` 배열에 키를 되돌리면 다시 열립니다. 문항·채점 코드는 건드리지 않았습니다.
  - 라우트 차단: `/career/work-style`, `/career/work-style/result`, `/career/values`, `/career/values/result` → `CareerAssessmentClosed` 안내 화면. 404가 아니라 안내로 처리해 기존 링크·검색 유입을 잃지 않습니다. 잠긴 동안 두 시작 페이지는 `robots: noindex`(열 때 되돌릴 것).
  - 목록 표시: `/career/assessments`에 `coming-soon` 상태와 "결과지를 다듬고 있는 검사" 섹션 추가. 카드와 키워드는 남겨 SEO 유입을 유지합니다.
  - `/career` 홈: 카드 유지, 메타 자리에 "결과지 준비 중", 기록 줄에 `COMING SOON`, 이용 가능 개수 자동 계산.
  - `/career/profile`: 잠긴 검사를 "시작" 목록에서 제외하고, 지킬 수 없게 된 "세 결과가 모이면 열립니다" 문구를 상태에 맞게 교체.
- 개발용 우회: `.env.local`에 `NEXT_PUBLIC_OPEN_ALL_ASSESSMENTS=1`을 넣으면 잠긴 검사도 전부 열립니다. 코덱스가 직업가치 결과지를 만드는 동안 자기 화면에 들어갈 수 있어야 해서 넣었습니다. 프로덕션 환경변수에는 넣지 마세요.
- 결제: 추가 조치 없음. `career-ai-preparation.tsx`가 이미 버튼 `disabled` + "현재는 결제·AI 호출이 진행되지 않습니다" 상태입니다.
- 미처리(의도적): 캐릭터 PNG 62장이 장당 약 2MB입니다. 공개 전 WebP 변환 필요. 지금 변환하면 코덱스 원본과 충돌하므로 별도 커밋으로 미룹니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0(기존 경고 2건 유지), `vitest run` 전체 통과, `next build` 통과.
- Rollback: 잠금은 `career-assessment-openness.ts`의 `OPEN`에 `"work-style"`, `"values"` 추가 + 두 시작 페이지의 `robots` 분기 제거. 병합은 `64d5d56` revert.

## 2026-09-02 — Claude: 커리어 캐릭터 이미지 WebP 전환

- Status: main에 적용. 코덱스 워크트리의 `career-value-examples` 26장은 아직 PNG입니다(그 커밋이 main에 없어서).
- Reason: 캐릭터 카드가 장당 1.6–2.1MB PNG였습니다. `next/image`에 `unoptimized`가 걸려 있어 원본이 그대로 전송되므로, 결과지 한 장이 휴대폰에서 2MB를 받고 있었습니다.
- 변환: `sharp` WebP quality 90, effort 6. 1122×1402 원본 크기 유지(축소 없음). **66.8MB → 7.8MB, 8.5배 감소.**
- Files: `public/images/career-characters/*.png` 6장, `public/images/career-character-examples/*.png` 30장 → 같은 이름 `.webp`로 교체하고 PNG는 제거.
- 참조 수정: `career-interest-assessment.tsx`(6곳), `career-ai-sample-overview.tsx`, `career-interest.ts`(2곳), `career-ai-sample-design-three.tsx`(공유·저장 파일명과 MIME을 `.webp`/`image/webp`로 — 이름만 `.png`로 내보내면 받는 쪽이 열지 못합니다).
- 원본 복구: `git show 64d5d56:public/images/career-characters/riasec-a.png > 파일` 형태로 언제든 되살릴 수 있습니다. 히스토리에서 지우지 않았습니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 전체 통과, `next build` 통과, 변환본 육안 확인(글자 번짐·색 밀림 없음).
- Rollback: 위 커밋 revert 후 `.webp` 제거.

## 2026-09-02 — Codex: 라운지 공통 메뉴 진입점 복원 (진행 중)

- Intended change: `SiteNav`의 메뉴 패널에 `/community` 링크를 복원한다. 상단 바의 직접 링크, 커뮤니티 UI/API/DB, 커리어 기능은 변경하지 않는다.
- Reason: 사용자 요청으로 커뮤니티 작업을 재개하며, 기존 라운지는 이미 main에 병합되어 있지만 공통 헤더 메뉴에는 진입점이 없다. 이전 보류 사유였던 Claude의 헤더 작업은 main 반영 후 종료되어 현재 변경과 겹치지 않는다.
- Protected work: 현재 작업 트리의 `MOOA_RESUME_RESULT_DOCUMENT_UPSTAGE_ADDENDUM.md`, `next-env.d.ts`, `src/app/api/meensoo/**`, `src/server/admin/admin-repository.ts`, `.codex-remote-attachments/`, `.tools/`는 수정·stage 대상에서 제외한다.
- Validation planned: `npm run typecheck` 및 변경 파일 diff 확인.
- Rollback: 이 항목과 함께 추가한 `SiteNav`의 `/community` 링크 한 줄을 되돌린다.

## 2026-09-02 — Claude: 협업 쿠폰 무효화·완전삭제 버튼

- Status: main 적용 예정 커밋. 마이그레이션 없음(기존 FK의 cascade를 그대로 씁니다).
- Reason: `archiveCampaign`, `revokeCouponCode`와 그 API(PATCH)는 이미 있었는데 화면에 버튼이 없어 아무도 쓸 수 없었습니다. 잘못 만든 캠페인이나 새어 나간 코드를 치울 방법이 없었습니다.
- 두 동작을 구분합니다:
  - **보관/무효화(PATCH)** — 더 못 쓰게 막고, 누가 썼는지는 남깁니다.
  - **완전삭제(DELETE, 신규)** — 코드와 `coupon_claims`까지 사라집니다. 되돌릴 수 없습니다.
- 이미 지급된 `reward_credits`는 어느 쪽에서도 건드리지 않습니다. 받은 사람이 쓰던 이용권을 관리자 정리 때문에 회수하는 것은 다른 이야기입니다.
- 신규: `deleteCampaign`, `deleteCouponCode`(admin-repository), `DELETE /api/meensoo/campaigns`, `DELETE /api/meensoo/coupons`.
- `AdminCouponUse`에 `id` 추가. 코드 문자열만으로는 한 장을 지목할 수 없었습니다. 캠페인을 막 만든 직후의 목록은 id가 없으므로(`id: ""`) 그 순간에는 무효화·삭제 버튼을 감추고, 곧바로 서버 목록을 다시 읽어 채웁니다.
- 확인창: `window.confirm`으로 몇 장이 사라지는지, 몇 명이 이미 썼는지, 되돌릴 수 없다는 사실을 먼저 말합니다. 삭제 버튼은 `.danger`로 붉게 구분했습니다(라이트·다크 모두 변수 사용).
- 사용된 캠페인도 지울 수 있게 둔 이유: 실수로 만든 것을 못 지우면 목록이 실수로 가득 찹니다. 막는 대신 무엇이 사라지는지 말해 주고 사람이 정하게 합니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 전체 통과, `next build` 통과.
- Rollback: 이 커밋 revert. DB 스키마 변경이 없어 되돌릴 것이 없습니다.

## 2026-09-02 — Codex: 라운지 공통 메뉴 진입점 복원 (완료)

- Status: 완료. `SiteNav` 메뉴 패널의 커뮤니티 섹션에서 `/community`로 이동할 수 있다.
- Files: `src/components/site-nav.tsx`, `docs/agent-change-log.md`.
- Validation: `npm run typecheck` 통과, `git diff --check` 통과.
- Rollback: `src/components/site-nav.tsx`의 `커뮤니티` 섹션을 제거하면 된다.

## 2026-09-02 — Codex: 라운지 예시 글·빈 상태 분리 (진행 중)

- Intended change: 게시글 조회가 성공했지만 결과가 비어 있는 경우 예시 글을 실제 글처럼 보이지 않게 하고, 로딩·조회 실패·진짜 빈 상태를 각각 표시한다.
- Reason: 현재 DB가 비어 있거나 조회가 실패해도 정적 예시 글이 보이는 혼동을 없앤다. API·DB schema·RLS·커리어·관리자 작업은 변경하지 않는다.
- Validation planned: 커뮤니티 컴포넌트 관련 테스트와 TypeScript 검사.
- Rollback: `CommunityLounge`의 조회 상태 분기를 되돌리면 기존 예시 글 동작으로 복원된다.

## 2026-09-02 — Codex: 라운지 예시 글·빈 상태 분리 (완료)

- Status: 완료. 라운지는 이제 정적 예시 글을 실제 글처럼 표시하지 않으며, 로딩·조회 실패(재시도 포함)·진짜 빈 상태를 구분한다. 주제·정렬 변경 중 이전 결과도 보이지 않는다.
- Files: `src/components/community-lounge.tsx`, `docs/agent-change-log.md`.
- Validation: `npm run test -- src/domain/community.test.ts src/server/community/community-migration.test.ts` 통과(4 tests), `npm run typecheck` 통과, `git diff --check` 통과.
- Rollback: `CommunityLounge`의 `feedStatus`/`reloadKey` 상태 및 조건부 빈 상태 분기를 되돌리면 된다.

## 2026-09-02 — Claude: 구글 광고 결제 전환 연결

- Status: main 적용. 사용자가 구글 광고에서 전환 액션 "구매"를 만들고 라벨을 전달했습니다.
- Reason: `AW-18415179469` 태그는 2026-08-24부터 실려 있었지만 전환 이벤트가 없어, 구글이 어떤 광고가 매출을 냈는지 모른 채였습니다. 전환 최적화 입찰을 켤 수 없는 상태였습니다.
- 신규: `src/lib/google-ads-conversion.ts` (+ 테스트 4건). 전환 대상 `AW-18415179469/AHmECPaFguwcEM2thc1E`.
- 발화 지점: `quick-checkout-return.tsx`의 상태 확인에서 `checkoutStatus === "SUCCEEDED"`이고 주문 번호가 내려온 순간. QUICK/PRO/FINAL이 모두 이 화면을 지나므로 한 곳이면 충분합니다.
- 중복 방지 2중: 같은 창에서는 `Set`으로 한 번만 보내고, 새로고침 너머는 `transaction_id`(주문 번호)로 구글이 합칩니다. 상태 확인이 2초마다 돌기 때문에 이게 없으면 한 건이 수십 건으로 보고됩니다.
- 금액: 상품 정가가 아니라 `billing_orders.amount`(실제 결제액)를 씁니다. 초과 과금이 붙은 결제를 정가로 보고하면 구글이 배우는 매출이 어긋납니다. 이를 위해 `/api/checkouts/quick/status`가 `orderId`/`amount`/`currency`를 함께 내려주도록 했습니다 — 마이그레이션 없이 기존 RLS(`billing order owner read`)로 본인 주문만 읽습니다. `status === 'PAID'`가 아니면 전부 null입니다.
- 금액을 못 읽으면 `value`를 아예 빼고 보냅니다. 0이나 1을 채우면 구글이 그 숫자를 진짜 매출로 믿고 입찰을 그쪽으로 끕니다.
- 광고 차단기나 동의 거부로 `gtag`가 없으면 조용히 넘어갑니다. 보고 실패보다 결제 완료 화면이 깨지는 쪽이 훨씬 나쁩니다.
- 환불 타임아웃 경로는 새 필드를 내려보내지 않습니다. 환불된 결제를 전환으로 보고하지 않기 위함입니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 전체 통과(신규 4건 포함), `next build` 통과.
- Rollback: 이 커밋 revert. 스키마 변경 없음.

## 2026-09-02 — Claude: 코덱스의 커뮤니티 작업이 Claude 커밋에 섞여 올라감 (사고 기록)

- Status: 이미 푸시됨. **되돌리지 않았습니다** — 되돌리면 코덱스의 미커밋 작업이 사라집니다.
- 무슨 일: Claude가 같은 작업 폴더에서 `git add -A src/`를 썼고, 그때 코덱스가 편집 중이던 파일이 함께 stage되어 Claude의 커밋 메시지로 올라갔습니다.
- 섞여 들어간 것:
  - `b1cff63` ← `src/components/site-nav.tsx` (+6): 사이트 내비게이션에 "커뮤니티 / 취업·진로 라운지" 항목 추가.
  - `1e18624` ← `src/components/community-lounge.tsx` (+27/−9): 미리보기 글 대신 실제 목록을 불러오고 로딩·오류·빈 상태를 구분. 실패 시 "다시 불러오기" 버튼 추가.
- 영향: 코드 손실 없음. 두 변경 모두 `vitest run` 846건과 `next build`를 통과한 상태로 올라갔습니다. 다만 **커밋 메시지가 그 변경을 설명하지 않습니다.**
- 코덱스에게: 위 두 파일의 작업은 **이미 main에 있습니다.** 다시 커밋하지 마시고, 필요하면 그 위에서 이어 가세요.
- 재발 방지: 같은 작업 폴더를 공유하는 동안 Claude는 `git add -A`를 쓰지 않고 파일 경로를 하나씩 지정합니다.

## 2026-09-02 — Codex: 커뮤니티 공개 글 SEO·검색 노출 (진행 중)

- Intended change: `PUBLISHED` 커뮤니티 글마다 서버 렌더링된 고유 URL을 만들고, 제목·본문·공개 댓글·canonical 메타데이터·Open Graph·DiscussionForumPosting 구조화 데이터 및 동적 sitemap 항목을 제공한다.
- Privacy/security: 공개 상태인 글·댓글만 노출한다. 비공개 첨부 Storage, 사용자 식별자, 비공개/숨김/삭제 글과 댓글은 검색 페이지·사이트맵에 포함하지 않는다.
- Reason: 현재 `/community` 목록은 클라이언트 fetch라 Google·Naver 등 검색 크롤러가 개별 글의 제목·내용·댓글을 안정적으로 수집할 수 없다.
- Files planned: `src/app/community/[postId]/page.tsx`, 전용 스타일, 커뮤니티 공개 조회 adapter, `src/app/sitemap.ts`, `src/domain/community.ts`, `src/components/community-lounge.tsx`, 테스트 및 변경 기록.
- Validation planned: SEO helper 단위 테스트, 기존 커뮤니티 테스트, TypeScript·lint·production build.
- Rollback: 신규 상세 라우트/스타일/SEO adapter를 제거하고 sitemap의 커뮤니티 동적 항목을 제거하면 기존 목록 전용 구조로 복원된다.

## 2026-09-02 — Codex: 커뮤니티 공개 글 SEO·검색 노출 (완료)

- Status: 완료. `/community/[postId]`는 `PUBLISHED` 글과 공개 댓글을 서버 HTML로 렌더링하며, 글 제목·요약·canonical·Open Graph·Twitter metadata·DiscussionForumPosting JSON-LD를 제공한다. 라운지 제목은 상세 URL로 연결되고, sitemap은 라운지와 공개 글을 포함한다.
- Privacy/security: private attachment URL과 숨김/삭제/비공개 콘텐츠, 사용자 ID는 노출·사이트맵 대상에서 제외했다. 공개 상태의 글·댓글은 작성 시 이미 public RLS 정책으로 읽을 수 있는 콘텐츠임을 전제로 한다.
- Files: `src/app/community/[postId]/page.tsx`, `src/app/community/[postId]/page.module.css`, `src/server/community/community-publication.ts`, `src/app/sitemap.ts`, `src/app/api/community/posts/route.ts`, `src/domain/community.ts`, `src/server/community/community-repository.ts`, `src/components/community-lounge.*`, `src/domain/community.test.ts`.
- Validation: `npm run lint` 오류 0(기존 경고 2건), 커뮤니티 테스트 5개 통과, `npm run typecheck` 통과, `npm run build` 통과.
- Rollback: 신규 상세 라우트/공개 조회 adapter를 제거하고 sitemap의 community 항목 및 라운지 제목 링크를 되돌리면 된다.

## 2026-09-02 — Claude: 자기소개서 두 장이 올라오면 막기 + 네이버 확인 태그

- Status: main 적용. 분석 로직·프롬프트·결과 화면·UI 디자인은 건드리지 않았습니다(사용자 지시).
- 발견: 사용자가 자기 자소서(문항 6개·1,600자)와 남의 자소서(문항 3개·700자)를 함께 올렸더니 **자기 문항 여섯 개가 통째로 사라지고 남의 문항 세 개만 첨삭 대상이 되었습니다.**
- 원인: `mapSimpleIntake`가 COVER_LETTER 파일들을 `join("\n\n")`으로 이어 붙인 뒤 `splitCoverLetterDraft`에 넘깁니다. 그 함수는 `자기소개서`라고만 적힌 줄을 찾아 **그 앞을 전부 버리고**, `이력서`/`경력기술서`/`직무기술서` 줄을 만나면 **그 뒤도 버립니다.** 그래서 어느 쪽 문항이 살아남는지가 파일 안쪽 서식에 달려 있었고, 버려진 쪽은 화면 어디에도 나타나지 않았습니다. 임시 테스트로 그대로 재현했습니다.
- 조치: 첨삭 대상 자기소개서가 2개 이상이면 `describeSimpleIntakeGap`이 진행을 막고 파일 이름을 대며 하나만 남기라고 합니다. 사용자는 이미 있는 분류 드롭다운이나 삭제 버튼으로 해결할 수 있어 새 UI를 만들지 않았습니다.
  - `SimpleIntakeMapping.coverLetterFilenames` 신규. 붙여넣은 글이 이겼을 때는 비어 있습니다 — 그때 파일은 문항에 쓰이지 않으므로 막을 이유가 없습니다.
  - 테스트 3건 추가(`simple-intake-mapping.test.ts`).
- 남은 문제(고치지 않음): 파일 **한 개**일 때도 `이력서`/`경력기술서`/`직무기술서` 줄 뒤의 문항은 버려집니다. 자소서 안에 그 소제목을 쓴 사람은 뒤쪽 문항을 잃습니다. 별건으로 다뤄야 합니다.
- `기타(OTHER)`로 올린 자소서: `purpose: "REFERENCE"`로만 들어가 첨삭 대상이 되지 않습니다(`application-case-handoff.ts:189`). 남의 자소서를 대신 첨삭받는 악용은 이 경로로는 되지 않습니다.
- 네이버 확인 태그: `verification.other`가 `NAVER_SITE_VERIFICATION` 환경변수에만 의존하고 있었습니다. 바로 위 주석이 구글 쪽에서 같은 구조로 겪은 실패를 적어 두고 있습니다 — 이 export는 빌드 시점에 평가되어 런타임 환경변수만으로는 태그가 아예 실리지 않습니다. 기본값 `e82574b967e594d90dde7bcd1f05cc3febda9aea`를 적어 두고 환경변수 override는 유지했습니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 849건 통과, `next build` 통과.
- Rollback: 이 커밋 revert.

## 2026-09-02 — Claude: 자소서 안쪽 소제목에서 문항이 잘리던 문제

- Status: main 적용. 분석·프롬프트·결과 화면은 건드리지 않았습니다.
- 증상: `이력서`/`경력기술서`/`직무기술서`라고만 적힌 줄 뒤의 문항이 사라졌습니다. 파일을 **한 개만** 올려도 생깁니다 — 자소서 안에서 그 말을 소제목으로 쓴 사람은 뒤쪽 문항을 잃고, 화면은 남은 문항만 보여 주므로 없어진 사실이 드러나지 않았습니다.
- 원래 의도는 옳습니다: 한 파일에 자소서와 이력서를 이어 붙여 낸 사람의 이력서 부분을 문항으로 읽지 않기 위한 경계였습니다.
- 조치: `findLetterEnd`를 새로 두고, 자르기 전에 **문항 번호가 이어지는지** 봅니다. 그 줄 뒤의 첫 문항 번호가 앞의 마지막 번호 **바로 다음 번호**면 소제목으로 보고 자르지 않습니다. 이력서 항목은 대개 1부터 다시 세므로 진짜 경계는 그대로 잘립니다.
- 기존 테스트(`ignores resume GPA and a sentence beginning with 2번의`)는 경력기술서 뒤에 문항이 없어 그대로 통과합니다. 소제목 경우와 1부터 다시 세는 경우로 테스트 2건 추가.
- 함께: 실패 알림 메일의 "결제·이용권은 되돌려져 있어" 문구를 고쳤습니다. `fail_quick_analysis`는 이용권만 ACTIVE로 되돌리고 이 경로에는 폴라 환불 호출이 없습니다. 환불이 끝난 줄 알고 넘어가면 손님은 돈만 내고 아무것도 못 받은 상태로 남습니다.
- 미결(사용자 결정 대기): 최종 실패에도 자동 환불을 걸지 여부. 10분 초과 건에는 이미 걸려 있어 앞뒤가 맞지 않습니다. 걸 때는 이용권 회수를 함께 해야 합니다 — 지금은 실패 시 이용권이 ACTIVE로 살아나므로, 환불만 더하면 돈과 무료 이용권을 함께 주게 됩니다.
- Validation: `tsc --noEmit` 통과, `vitest run` 전체 통과, `next build` 통과.
- Rollback: 이 커밋 revert.

## 2026-09-02 — Claude: 최종 실패 자동 환불 + 이용권 회수

- Status: 코드 커밋 완료. **마이그레이션은 아직 원격에 적용하지 않았습니다** — 사용자가 `npm run db:remote:push`를 실행해야 동작합니다.
- Reason: 10분 초과 건에는 자동 환불이 걸려 있는데 최종 실패에는 없어 앞뒤가 맞지 않았습니다. 손님 쪽에서 보면 최종 실패가 더 나쁩니다 — 타임아웃은 아직 결과가 나올 수도 있지만 최종 실패는 나오지 않고, 자동 재시도를 두 번 다 쓴 뒤입니다.
- 신규 마이그레이션 `20260902010000_quick_failure_auto_refund.sql`:
  - `claim_quick_analysis_failure_refund(uuid, uuid)` — 결과가 있으면 COMPLETED, 재시도가 남았으면(FAILED가 아니면) RETRYABLE, 결제가 없으면 FAILED_WITHOUT_ORDER. 그 외에는 주문을 SUBMITTING으로 잡고 REFUND_REQUIRED를 돌려줍니다.
  - `revoke_refunded_analysis_entitlement(uuid, uuid)` — 그 주문에 딸린 **ACTIVE** 이용권만 REVOKED로 바꿉니다. CONSUMED는 결과를 받은 다른 분석의 것이므로 건드리지 않습니다.
  - 검증된 타임아웃 함수(`claim_quick_analysis_timeout_refund`, `mark_quick_auto_refund_*`)는 **재정의하지 않았습니다.** 두 경로가 `billing_orders.auto_refund_state`를 공유하므로 한쪽이 환불한 주문을 다른 쪽이 다시 환불하지 않습니다.
- 신규 `src/server/billing/quick-failure-refund.ts` — `polar.refunds.create({ revokeBenefits: true })` 후 `mark_quick_auto_refund_submitted`, **그 다음에** 이용권 회수. 순서를 뒤집으면 환불 실패 시 손님에게 돈도 이용권도 남지 않습니다. 회수만 실패하면 환불된 것으로 답합니다(여기서 던지면 바깥이 다시 환불하려 듭니다).
- 왜 회수가 필요한가: `fail_quick_analysis`가 실패 시 이용권을 ACTIVE로 되살립니다. 환불까지 하면 돈과 무료 한 판을 함께 주게 됩니다. 둘 중 하나만 드리는 것이 맞습니다.
- 발화 지점: `supabase-quick-analysis-run-repository.ts`의 `fail()`. 환불을 먼저 하고 결과를 알림 메일에 실어 보냅니다. 환불이 던져도 삼킵니다 — 실패 기록이 환불 때문에 다시 실패하면 상태가 어긋난 런만 남습니다.
- 알림 메일: 이제 짐작하지 않고 받은 값을 적습니다(금액·회수한 이용권 수, 또는 환불하지 않은 이유). 환불 정보 없이 불려도 단정하지 않습니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 865건 통과(신규 14건), `next build` 통과.
- Rollback: 이 커밋 revert 후 두 함수 `drop function`. `auto_refund_state` 컬럼은 타임아웃 경로가 쓰므로 두어야 합니다.

## 2026-09-02 — Claude: FINAL에 "제출 전 마무리" 탭 추가 (1단계)

- Status: main 적용. **기존 FINAL 분석·프롬프트·결과 화면은 한 줄도 건드리지 않았습니다.** 새 탭만 추가했습니다.
- 문제: FINAL은 같은 문제를 여러 관점에서 잡습니다. 수치 하나가 어긋나면 탈락요인·이력서 대조·면접관 시선에 각각 나타나, 읽는 사람에게는 일곱 개의 숙제로 보입니다. 아홉 개 섹션을 다 읽고 나면 남는 질문이 "그래서 뭘 하지"입니다.
- 접근: **분석을 다시 하지 않습니다.** AI 호출 0회, 첨삭본 수정 0글자. 이미 나온 결과를 **"누가 할 수 있는 일인가"**로 다시 셀 뿐입니다.
  - `DONE` — `rejectionRisks.handling`이 `removed`/`softened`. **이미 첨삭본에 반영된 것**입니다. 여기에 버튼을 다는 제안이 있었지만 만들지 않았습니다 — 누를 것이 없고, 누르면 멀쩡한 문장을 다시 건드리게 됩니다.
  - `NEEDS_APPLICANT` — `needs_applicant` + `documentConflicts` + `claimEvidence.verdict === "unsupported"`. 손님만 답을 압니다.
  - `INTERVIEW` — `interviewerFlags`. 서류에 문장을 더 넣기보다 면접에서 답할 것.
  - `KEPT` — `kept_by_choice`. 알고 고른 대로 남긴 것.
- 중복 묶기: 같은 문장을 가리키는 지적을 하나로 합칩니다(공백·문장부호 제거 후 포함 관계 비교, 12자 미만은 우연 일치를 피해 합치지 않음). 갈래가 다르면 합치지 않습니다 — 같은 문장이라도 "이미 고쳤다"와 "면접에서 답하라"는 할 일이 다릅니다. 합쳐진 경우 원래 지적 수를 화면에 밝힙니다.
- **"제출 권장/주의" 같은 판정 문구는 쓰지 않았습니다.** 합불은 알 수 없고, 권했다가 떨어지면 그 한 줄이 책임을 집니다. `docs/analysis-consistency-and-rounded-editing-philosophy.md`의 원칙과도 충돌합니다. 대신 남은 일이 있는지만 사실대로 말합니다. 테스트로 "권장/합격/불합격"이 문구에 들어가지 않음을 잠갔습니다.
- Files: `src/domain/final-wrap-up.ts`(+테스트 9건), `src/components/final-wrap-up.tsx`, `.module.css`, `result-workspace-complete.tsx`(View에 `wrapup` 추가, 탭 버튼 1개, 렌더 1줄).
- 2단계(미착수, 사용자 승인 대기): `NEEDS_APPLICANT` 항목에 대해 2~3개만 물어보고 **해당 문장만** 패치해 최종본을 만드는 단계. 전체 재첨삭은 하지 않습니다 — 이미 다듬은 문장이 흔들리고 비용도 큽니다. 문장 단위라 AI 비용은 수십 원 수준.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 874건 통과(신규 9건), `next build` 통과.
- Rollback: 이 커밋 revert. 기존 FINAL 화면은 영향받지 않습니다.

## 2026-09-02 — Claude: 제출 판정 문구 추가 + 로그인 링크 버그 2건

- Status: main 적용. 분석 로직은 건드리지 않았습니다.
- 제출 판정(사용자 요청): `제출 전 마무리` 맨 위에 `확인 후 제출` / `서류는 제출 가능` / `제출 가능` 세 상태를 넣었습니다. **결과가 아니라 서류의 상태만** 말합니다 — "합격", "불합격", "가능성"이라는 말이 들어가지 않음을 테스트로 잠갔습니다. 사실이 어긋난 채 나가는지는 우리가 실제로 확인한 것이라 말해도 되는 범위이고, 붙고 떨어짐은 아닙니다.
- `final-verification.tsx`의 "고치고 다시 돌리면 이 숫자가 줄어듭니다" → "아래 항목은 **제출 전 마무리**에서 할 일 순서로 정리해 두었습니다". 앞 문구는 돈을 한 번 더 내라는 말로 읽혔습니다.
- 로그인 링크 버그 2건(`quick-checkout-return.tsx`):
  1. `phase === "failed"` 하나가 **결제 확인 실패**와 **분석 실패**를 함께 쓰고 있었습니다. 두 경우 모두 "이메일로 다시 안내받기"가 떠서, 분석이 실패한 손님이 로그인 링크를 받아 눌렀다가 결제 화면으로 되돌아왔습니다. 로그인해도 볼 결과가 없는 상황입니다. `FailureKind`를 두어 **결제 확인 실패에만** 버튼을 띄웁니다.
  2. 링크가 항상 `next=/analysis/prepare`(결제 전 화면)로 돌아왔습니다. 이제 분석 ID를 알면 `/result?analysisRunId=...`로 보냅니다. 사용자가 실제로 만난 "이 탭에 저장된 작성본이 없습니다"가 이것입니다.
- 남은 문제(미착수): 링크가 Gmail의 링크 검사에 먼저 소진되어 `otp_expired`로 도착합니다. Supabase 매직링크는 GET 한 번에 소모되므로 링크 방식으로는 구조적으로 막기 어렵습니다. 6자리 코드(OTP) 입력으로 바꾸는 것이 확실한 해법이며, 화면이 붙는 작업이라 사용자 결정 대기.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 878건 통과, `next build` 통과.
- Rollback: 이 커밋 revert.

## 2026-09-02 — Claude: 제출 전 보완 (2단계) — 물어보고 그 문장만 고치기

- Status: 코드 커밋. **마이그레이션은 원격 미적용** — 사용자가 `npm run db:remote:push` 실행 필요.
- 무엇: `제출 전 마무리`의 "확인이 필요합니다" 항목에 대해 손님에게 2~3가지만 묻고, 받은 사실로 **그 문장만** 다시 씁니다. 자기소개서 전체를 다시 첨삭하지 않습니다.
- 전체 재첨삭을 하지 않는 이유: 이미 다듬은 문장이 다시 흔들리고, 값이 한 번 더 들고, 손님이 "고칠수록 나빠졌다"고 느낍니다. 모델에는 문제 문장 하나와 손님이 준 사실만 보냅니다 — 나머지 문장은 보지도 못하므로 흔들릴 수가 없습니다.
- 신규 `src/domain/final-patch.ts`(+테스트 10건):
  - `locateQuote` — 인용문이 첨삭본의 어느 문장인지 찾습니다. 공백·문장부호를 걷어내고 비교하며, **못 찾으면 비슷한 문장을 고르지 않고 못 찾았다고 답합니다.** 닮은 자리를 고치면 엉뚱한 문장이 바뀝니다.
  - `applyPatches` — 바꾸기로 한 문장이 실제로 거기 있을 때만 치환합니다. 없으면 그 문항은 손대지 않습니다.
  - `countAppliedPatches` — 실제로 바뀐 것만 셉니다. 화면이 고쳤다고 하는데 문서는 그대로인 상태를 막습니다.
- `WrapUpItem.choices` 추가: 이력서 대조 항목은 두 문서가 각각 적은 값을 함께 실어, 빈칸 대신 고르게 합니다.
- 신규 마이그레이션 `20260902020000_final_submission_patch.sql`: `final_submission_patches`(분석 1건당 보완 1건). **`analysis_results`는 덮어쓰지 않습니다** — 원래 문장이 남아야 되돌리고 "바뀐 곳만 보기"가 가능합니다. RLS는 본인 읽기만 열고 쓰기는 서버(service role)만 — 브라우저가 직접 쓸 수 있으면 아무 문장이나 보완본으로 저장됩니다.
- 신규 `src/server/ai/final-patch-gateway.ts`: Responses API, `max_output_tokens: 2000`, strict JSON schema. 요청하지 않은 `itemId`는 걸러냅니다. 프롬프트의 핵심은 "손님이 주지 않은 숫자·회사명·성과·기간을 만들지 말 것".
- 신규 `POST /api/final-patch`: FINAL 결과에서만, 본인 것만(RLS). 고칠 자리를 못 찾은 항목은 모델에 보내지 않습니다. 저장 실패해도 고친 문장은 화면에 돌려줍니다.
- UI: `final-patch-form.tsx`. `제출 전 마무리` 안에서 열리고, 답한 것만 고칩니다. 결과는 before/after로 보여 줍니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 888건 통과(신규 10건), `next build` 통과.
- Rollback: 이 커밋 revert 후 `drop table public.final_submission_patches`.

## 2026-09-02 — Claude: GA4 연결 + 사이트맵에 커리어·라운지 추가

- GA4(`G-XF0JRSBBZX`): 구글이 안내하는 스니펫은 `gtag.js`를 한 번 더 불러오게 되어 있는데, 그 라이브러리는 광고 태그(`AW-18415179469`) 때문에 이미 싣고 있습니다. 두 번 실으면 페이지뷰가 두 번 세지므로 **`gtag('config', 'G-XF0JRSBBZX')` 한 줄만** 추가했습니다. 대시보드의 "이미 있는 Google 태그 사용"도 필요 없습니다 — 코드로 붙였으므로 중복입니다.
- 사이트맵: `/career`, `/career/assessments`, `/career/interest`, `/community` 추가(6 → 10). 직업심리검사·진로검사 계열 검색어를 실제로 받는 화면이 사이트맵에 없어, 크롤러가 홈에서 링크를 타고 들어오기만 기다리고 있었습니다. 제품 경로(로그인·결제·초안이 필요한 화면)는 기존 규칙대로 계속 제외합니다.
- Search Console에서 확인된 사용자 조치 사항(코드 아님):
  - `/career`, `/career/interest`, `/pricing`, `/quick`이 **사이트맵으로 제출**되어 있습니다. 이들은 페이지이지 사이트맵 XML이 아니라 항상 오류가 납니다. 삭제해야 합니다. 특히 `/pricing`은 **존재하지 않는 경로**입니다.
  - `NOINDEX 제외 4건`은 대부분 의도한 것입니다(`/comingsoon`, `/career/values`, `/career/work-style`, 결과·관리자 화면). 잠금을 풀 때 `robots` 분기를 함께 지우면 돌아옵니다.
  - `403 차단 1건`은 `/meensoo` 계열로 보이며 정상입니다.
- 미결: `og:image`가 없습니다. 카카오톡·네이버·슬랙에 링크를 공유해도 썸네일이 뜨지 않습니다. `opengraph-image`로 만들 수 있으며 사용자 결정 대기.
- Validation: `tsc --noEmit` 통과, `vitest run` 888건 통과, `next build` 통과.


## 2026-09-03 — Codex: 커뮤니티 런칭 최소 운영 도구 (진행 중)

- Intended change: 기존 `community_reports`와 게시글·댓글 상태값을 사용해 관리자 신고 큐, 신고 처리, 대상 글/댓글 숨김 API와 화면을 추가한다.
- Scope: 관리자 세션으로만 접근한다. 새 table이나 기존 RLS 정책을 바꾸지 않으며, 숨김은 삭제가 아닌 `HIDDEN` 상태 전환으로 복구 가능하게 한다.
- Follow-up: 요청 속도 제한은 DB/공유 저장소 기반으로 별도 구현·검증한다. 원격 Supabase migration 적용 및 2계정 E2E는 로컬 코드 완료 뒤 실행한다.
- Validation planned: admin authorization/route tests, TypeScript, lint, build.
- Rollback: 신규 `/meensoo/community-reports`, `/api/meensoo/community-reports` 및 admin repository 함수만 제거하면 기존 커뮤니티 읽기/신고 흐름으로 돌아간다.

## 2026-09-03 — Codex: 커뮤니티 런칭 최소 운영 도구 (1차 완료)

- Status: 관리자 신고 큐와 `HIDDEN` 처리 완료. `/meensoo/community-reports`에서 신고 내용을 보고 검토 완료 또는 대상 글·댓글 숨김을 실행한다. API는 기존 관리자 세션으로만 접근한다.
- Files: `src/server/admin/admin-repository.ts`, `src/app/api/meensoo/community-reports/route.ts`, `src/app/meensoo/community-reports/*`, `src/app/meensoo/admin-shell.tsx`.
- Validation: `npm run typecheck` 및 `npm run build` 통과. `npm run lint` 오류 0, 기존 경고 2건 유지.
- Remaining: DB 기반 rate limit, 원격 migration 적용, 두 계정 E2E, 운영 담당/SLA 확정.
- Rollback: 신규 신고 화면/API/repository 함수 및 관리자 메뉴 항목만 제거한다. 숨긴 대상은 DB에서 `PUBLISHED`로 복구 가능하다.

## 2026-09-03 — Codex: 커뮤니티 DB rate limit (진행 중)

- Intended change: 인증된 사용자별 고정 시간창 카운터와 security-definer RPC를 migration으로 추가하고, 글·댓글·신고·업로드·추천 API에서 원자적으로 소비한다.
- Limits: 글 5건/시간, 댓글 20건/시간, 신고 10건/일, 첨부 업로드 12건/시간, 추천 60회/분.
- Security: 카운터 테이블은 RLS를 켜고 직접 접근 정책을 두지 않는다. 인증 사용자만 RPC를 실행하며 auth.uid()를 기준으로 계산한다.
- Validation planned: migration contract test, TypeScript, lint, build. 원격 DB 적용·실계정 E2E는 코드 병합 뒤 별도 실행한다.
- Rollback: 새 migration의 rate-limit table/function과 route helper 호출을 되돌리면 된다.

## 2026-09-03 — Codex: 커뮤니티 DB rate limit (완료)

- Status: 글 5건/시간, 댓글 20건/시간, 신고 10건/일, 업로드 12건/시간, 추천 60회/분 제한을 atomic DB RPC로 적용했다.
- Files: `supabase/migrations/20260903090000_community_rate_limits.sql`, `src/server/community/community-rate-limit.ts`, 커뮤니티 쓰기 API 5개, `src/server/community/community-migration.test.ts`.
- Validation: migration contract test 3개 통과, typecheck·build 통과, lint 오류 0(기존 경고 2건).
- Remaining: 원격 Supabase migration 적용, 두 계정 E2E, 운영 담당/SLA 확정.
- Rollback: rate-limit migration과 helper 호출을 revert한다.

## 2026-09-03 — Codex: 커뮤니티 rate limit 원격 적용

- Status: 완료. `20260903090000_community_rate_limits.sql`을 연결된 원격 Supabase에 적용했고 `supabase migration list`에서 local/remote 일치 확인.
- Note: `supabase db push`의 Docker 경고는 로컬 migration catalog cache 생성 실패이며, 원격 migration 적용 결과는 성공했다.
- Remaining: 변경 소스의 검토·선택적 커밋·배포 후, 두 테스트 계정으로 실제 E2E를 실행한다.

## 2026-09-02 — Claude: 빌드를 막던 사이트맵의 없는 import 제거 (main)

- Agent/session: Claude (클라우드 세션). 사용자 지적: 사이트가 살아 있는 것과 최신 커밋이 실제로 배포된 것은 다른 얘기다 — 진짜 원인을 없애라.
- Status: main에 직접 적용.

### 확인한 사실
- `e46eb20`의 `src/app/sitemap.ts`가 `communityPostPath`(`@/domain/community`)와 `listPublishedCommunityPostsForSitemap`(`@/server/community/community-publication`)을 가져오는데, **이 둘은 `git log --all`로 찾아도 저장소 역사 어디에도 없습니다.** PC 로컬 작업 중 새 파일이 디스크엔 있었는데 `git add`에서 빠진 채 커밋된 것으로 보입니다.
- 로컬 `next dev`는 디스크의 파일을 그대로 쓰므로 문제없이 돌아갔고, push 이후 빌드 서버에는 그 파일이 없어 `next build`가 매번 실패했습니다.
- **"사이트가 멀쩡해 보인다"는 이 커밋이 배포됐다는 뜻이 아닙니다.** 빌드가 실패하면 새 배포가 나가지 않고, 대부분의 플랫폼처럼 직전 성공한 배포가 계속 서빙됩니다. `e46eb20`은 이번 수정 전까지 한 번도 실제로 배포되지 않았을 가능성이 높습니다.
- `/community`는 게시글 목록 한 화면뿐이고(`src/app/community/page.tsx`) 낱개 게시글 라우트가 없습니다(`community-lounge.tsx`도 추천·댓글·신고를 전부 그 화면 안에서 끝냅니다). 그래서 애초에 채울 수 없는 import였습니다.

### 바꾼 것 — 커뮤니티/검사 기능에는 손대지 않음
- `sitemap.ts`에서 없는 두 함수를 부르는 부분만 제거하고, 그 커밋이 같이 넣은 **유효한** 것들은 그대로 두었습니다: `layout.tsx`의 GA4 설정 한 줄, `/career`·`/career/assessments`·`/career/interest` 사이트맵 항목. `/community` 정적 항목도 그대로 두고, 낱개 게시글 자리에는 "라우트가 생기면 채우라"는 주석만 남겼습니다.
- 삭제·수정한 코드는 **어디에도 존재한 적 없는 import 두 줄과 그걸 쓰는 try/catch 블록뿐**입니다. 실제로 동작하던 코드는 하나도 건드리지 않았습니다.
- Files: `src/app/sitemap.ts`.
- Validation: 887 tests passed, `tsc` clean, `eslint` — 이 파일에 새 경고 없음, **`next build` 성공**(이 세션 들어 main이 처음으로 끝까지 빌드됨).
- Rollback: 이 커밋 revert(`e46eb20`의 sitemap.ts 부분만 되돌아옵니다. 그러면 다시 빌드가 깨집니다).
## 2026-09-02 — Claude: 첨삭 한 건의 실제 원가와 마진 (관리자)

- Agent/session: Claude (클라우드 세션). 사용자 요청: "관리자 단가 표시… 실패하고 2번하고 또 유저 재시도하고 그런 것도 나오고 총단가도 나오게, 수지타산 안 맞거나 위험한 건 조치하게 알아볼 수 있게".
- Status: **`claude/github-gui-sync-jfbyd5` 브랜치에만** 적용. main에는 넣지 않았습니다 — 사용자 PC에 커밋되지 않은 커리어검사 워크트리 작업이 떠 있어, main을 움직이면 pull할 때 충돌합니다. 병합 시점은 사용자가 고릅니다.
- **마이그레이션 있음**: `20260902010000_analysis_run_attempts.sql`. PC에서 `npm run db:remote:push` 필요(후기 설문 마이그레이션과 함께).

### 무엇이 문제였나
- 관리자 화면의 토큰 수는 **성공한 시도 하나의 것**이었습니다. `complete_quick_analysis`가 `analysis_runs`의 토큰 칸을 덮어쓰고, `fail_quick_analysis`는 토큰을 아예 적지 않습니다.
- 그래서 **검증에서 걸려 버려진 응답의 요금이 어디에도 남지 않았습니다.** 모델이 끝까지 만들어 낸 응답이라 돈은 그대로 나갔는데, 기록상으로는 0입니다. 한 건에 실제로 얼마가 들었는지 물으면 답할 수 없었습니다.
- 확인한 사실: 운영 경로는 백그라운드 경로(`startBackground` → `getBackground`)이고, DB 시도 1회 = OpenAI 호출 1회입니다. `QuickAnalysisProvider`의 내부 2회 루프는 운영에서 쓰이지 않습니다(평가용).

### 바꾼 것
1. **시도별 원장** `analysis_run_attempts` (신규 표). 추가 전용이고 브라우저에서 읽지도 쓰지도 못합니다(RLS + service_role만 grant). 입력·출력 토큰을 **나눠** 적습니다 — 출력 단가가 입력의 몇 배라 합계만으로는 원가를 못 냅니다.
2. **기록 지점** `recordAnalysisAttempt` (신규). 브라우저 경로(`quick/execute`)와 스케줄러 경로(`analysis-runs/advance`) **양쪽 4개 자리**에 붙였습니다 — 완료 / 검증 실패 / 문항 누락 / 제공자 오류. 기록 실패는 전부 삼킵니다: **기록을 남기려다 결과를 잃는 것이 훨씬 나쁩니다.** 마이그레이션 전에도 분석은 그대로 동작합니다.
3. **원가 계산** `src/domain/analysis-cost.ts` (신규, 순수 함수). 단가는 **환경변수**로 받습니다(`OPENAI_PRICE_INPUT_PER_1M`, `OPENAI_PRICE_OUTPUT_PER_1M`, `USD_KRW_RATE` 기본 1400). 없으면 금액을 **만들어 내지 않고** 토큰만 보여 줍니다 — 틀린 원가는 없는 것보다 나쁩니다.
4. **위험 판정**: `LOSS`(원가 > 판매가) / `THIN`(마진 50% 미만) / `FREE_HEAVY`(무료 건인데 유료 판매가만큼 나감) / `UNKNOWN`(단가 미설정). 무료 건을 마진율로 재지 않는 것이 요점입니다 — 판매가가 0이라 늘 -100%로 나와 신호가 되지 못합니다.
5. **화면**: 요약 카드에 `API 원가 합계`와 `확인 필요` 추가. 표에 `시도 내역`(몇 번째에서 무엇이 걸렸는지, 버려진 시도는 붉은 번호)과 `원가 · 마진` 칸 추가. 그 위에 **확인 필요 건만 모은 목록**을 따로 뒀습니다 — 표는 휴대폰에서 옆으로 밀어야 원가가 보여, 정작 급한 건을 찾을 수 없었습니다.

### 알고 있는 한계
- 판매가는 **정가 기준**(QUICK 4,900 / PRO 9,900 / FINAL 14,900)입니다. 할인가로 팔린 건은 실제 마진이 이보다 낮습니다.
- 원장이 없는 **기존 건은 시도 0건**으로 나옵니다. 0원이라고 말하지 않습니다(합계에서도 제외).
- `PROVIDER_FAILED`는 응답 자체를 못 받아 토큰을 모릅니다. `null`로 남기고 0으로 세지 않습니다.
- Files: `src/domain/analysis-cost.ts`(신규)·`.test.ts`(신규 16건), `src/server/analysis/attempt-ledger.ts`(신규)·`.test.ts`(신규 6건), `supabase/migrations/20260902010000_analysis_run_attempts.sql`(신규), `src/app/api/analysis-runs/quick/execute/route.ts`, `src/app/api/analysis-runs/advance/route.ts`, `src/server/admin/admin-repository.ts`, `src/app/meensoo/analyses/page.tsx`, `src/app/meensoo/admin.module.css`, `.env.example`.
- Validation: 860 tests passed (+22), `tsc` clean, `eslint` 0 errors (기존 경고 2건은 커리어 파일 — 손대지 않음), `next build` 클린. 헤드리스 크롬 1440px·412px 렌더 확인 — 본문 가로 넘침 없음(412=412), 표는 `.scroll` 안에서만 가로 스크롤.
- Rollback: 이 커밋 revert. 표는 남지만 아무도 읽지 않습니다.

## 2026-09-02 — Claude: 재시도 출력 상한, 협업쿠폰 대상 인원 자동입력, 모바일 버튼 정렬

- Agent/session: Claude (클라우드 세션). 사용자 확인 사항 세 가지에 대한 조치.

### 1. 재시도가 같은 상한으로 같은 자리에서 또 잘리던 문제
- 배경: "1번 재시도 토큰 그건 내가 어제 커밋만 안 하고 했는지 기억이 안 나네"라는 질문에 코드를 확인한 결과 **미작업**이었습니다(`resolveMaxOutputTokens(request)`에 시도 횟수 인자 자체가 없었습니다).
- 문제: 자동 재시도(1회)가 1회차와 **완전히 동일한 요청**이었습니다. 실패 원인이 출력 잘림(`AI_OUTPUT_VALIDATION_FAILED`)이면 같은 상한으로 같은 자리에서 또 잘리고, API 요금만 두 배로 나갑니다.
- 확인한 사실: OpenAI는 `max_output_tokens`(상한)이 아니라 **실제로 생성한 토큰만** 청구합니다. 상한을 올려도 모델이 그만큼 쓰지 않으면 요금이 늘지 않습니다 — 즉 이 변경은 원가를 늘리는 방향이 아니라, 두 번째 시도가 필요할 때만 여유를 주는 방향입니다.
- 바꾼 것: `resolveMaxOutputTokens(request, attemptNo)` — DB의 `analysis_runs.attempt_count`(1부터 시작)를 받아 1회차는 그대로, 2회차 ×1.35, 3회차 ×1.7. `attemptNo`를 생략하면 기존과 동일(1회차 취급)해 다른 호출부를 건드리지 않습니다.
- 배선: `getRunningContext`(백그라운드 폴링 경로)와 `begin()`(첫 시작·재시도 시작 경로) 양쪽에서 `attempt_count`를 읽어 `startBackground(request, attemptCount)`로 전달. `begin_quick_analysis` RPC는 8번의 마이그레이션을 거친 함수라 반환 값에 손대지 않고, `begin()` 안에서 기본키 조회 한 번을 추가했습니다.
- Files: `src/server/ai/quick/output-budget.ts`·`.test.ts`, `src/server/analysis/quick-background-execution.ts`·`.test.ts`, `src/server/analysis/supabase-quick-analysis-run-repository.ts`, `src/server/analysis/quick-analysis-orchestrator.ts`, `src/app/api/analysis-runs/quick/execute/route.ts`, `src/app/api/analysis-runs/advance/route.ts`.

### 2. 협업쿠폰 "대상" 인원수 자동입력
- 사용자 지적: 홍보물의 "(20인)"을 "대상" 자유 텍스트에 직접 타이핑했고, 이미 있는 "사용 가능 인원"/"발급 수량" 숫자와 연결이 안 돼 있었습니다.
- 바꾼 것: `defaultAudienceText(partnerName, totalCount)`. 기관명이 이름·대상을 자동으로 채우던 기존 패턴(직접 고치면 덮어쓰지 않음)을 인원수까지 확장했습니다 — 기관명 또는 인원수 어느 쪽이 바뀌어도 "지금 값이 자동값과 같은가"로 판단해 재계산합니다.
- 이 값 하나가 홍보물의 "대상" 행과 메일 본문에 그대로 흘러가므로 두 곳 다 자동으로 반영됩니다(사용자가 언급한 "메일에도 자동입력되고"는 이미 그렇게 동작 — 이번 변경으로 값 자체가 정확해졌습니다).
- UNIQUE(고유 코드)·SHARED(공유 코드) 모드 구분 없이 적용했습니다 — 두 경우 다 "이 숫자만큼의 사람에게 돌아간다"는 의미는 같습니다(고유 코드도 1장 = 1명이 기본값이므로).
- Files: `src/app/meensoo/coupons/campaign-creator.tsx`.

### 3. 관리자 화면 모바일 — 캠페인 목록 버튼이 세로로 쪼개지던 문제
- 사용자가 보낸 스크린샷: "코드/홍보물/메일/보관/삭제" 버튼이 좁은 화면에서 "코 드", "홍 보 물"처럼 한 글자씩 세로로 쪼개져 있었습니다.
- 원인: `.rowActions`가 `display:flex`인데 `flex-wrap`도 `white-space:nowrap`도 없어, 화면이 좁아지면 버튼이 글자보다 먼저 줄어들고 그 안의 한글 텍스트가 줄바꿈됐습니다.
- 바꾼 것: 버튼에 `white-space: nowrap` 추가(항상), 좁은 화면에서는 `.rowActions`를 `display:grid; grid-template-columns: repeat(auto-fit, minmax(72px, 1fr))`로 바꿔 폭을 고르게 정렬. 데스크톱은 기존 flex 그대로 — 렌더 확인 결과 변화 없음.
- Files: `src/app/meensoo/coupons/coupons.module.css`.

### 확인한 것, 손대지 않은 것
- `src/app/sitemap.ts`(main에서 커밋 누락, 이전에 보고함)와 `src/components/community-lounge.tsx`(eslint 에러 1건, 커뮤니티 코드)는 **main 병합으로 들어온 기존 문제**이고 이번 작업 범위 밖입니다. 커뮤니티/커리어 영역은 코덱스 담당이라 손대지 않았습니다.
- Validation: 913 tests passed(+4), `tsc` clean(위 두 파일 제외), `eslint` — 제가 만진 파일은 0 warning/error. 헤드리스 크롬 412px·900px 렌더 확인 — 모바일 버튼 정렬 확인, 데스크톱 무변화.
- `next build`는 위 sitemap.ts 문제로 여전히 실패합니다(제가 만든 문제 아님, PC에서 파일 두 개 커밋 필요).
- Rollback: 이 커밋 revert.

## 2026-09-02 — Claude: 빌드를 막던 사이트맵 임포트, 빈 스텁으로 막음 (main 아님)

- Agent/session: Claude (클라우드 세션). 사용자 질문 "폰에서만으로 못 고치나".
- Status: **`claude/github-gui-sync-jfbyd5` 브랜치에만** 적용. **main에는 넣지 않았습니다.**

### 확인한 것
- main의 `e46eb20`이 `src/app/sitemap.ts`에서 `communityPostPath`(`@/domain/community`)와 `listPublishedCommunityPostsForSitemap`(`@/server/community/community-publication`)을 가져오는데, 이 둘은 `git log --all`로 찾아도 **저장소 역사 어디에도 없습니다.**
- 이건 "PC에 있는 걸 커밋만 안 한 것"이 아니라 **애초에 안 만들어진 기능**입니다. `/community`는 목록 한 화면뿐이고(`src/app/community/page.tsx`), 게시글 낱개 페이지 라우트가 없습니다. `community-lounge.tsx`도 추천·댓글·신고를 전부 그 자리에서 끝내지 다른 URL로 옮기지 않습니다.

### 왜 진짜처럼 만들지 않았나
- 낱개 게시글 페이지 경로를 제가 지어내면(`/community/[postId]` 등), 나중에 코덱스가 실제로 그 라우트를 만들 때 제 추측이 진짜 설계와 어긋날 수 있습니다. CLAUDE.md의 "다른 구현을 조용히 대체하지 않는다" 원칙에 해당한다고 판단했습니다.
- 그래서 **사실 그대로** 최소 스텁으로 막았습니다: `listPublishedCommunityPostsForSitemap`은 빈 배열을 돌려줍니다. `/community`는 이미 정적 목록에 매일 갱신으로 올라가 있어 라운지가 색인에서 빠지는 것도 아니고, 가리킬 페이지가 없는 주소를 사이트맵에 올리는 것보다 낫습니다. `communityPostPath`는 sitemap.ts의 import가 성립하도록 존재만 하고 `/community#${postId}`를 돌려주며(호출되는 자리는 지금 없음), 낱개 페이지가 생기면 그때 채우라는 주석을 남겼습니다.

### 왜 main이 아니라 브랜치에만
- 이 브랜치는 이미 main을 병합한 상태(`38ce119`)라, 이 두 파일만 추가하면 **제 브랜치 자체가 빌드됩니다.** main은 그대로 두어, PC에서 진행 중일 수 있는 커뮤니티 작업과 충돌하지 않습니다.
- main을 고치는 건 여전히 PC 쪽 몫입니다: 코덱스가 실제 낱개 페이지를 만들면 이 두 파일의 내용을 그대로 덮어쓰면 되고, 그건 평범한 커밋이라 충돌이 아닙니다.
- Files: `src/domain/community.ts`(함수 추가), `src/server/community/community-publication.ts`(신규, 스텁).
- Validation: 913 tests passed, `tsc` clean(전체, sitemap 포함), `eslint` 클린, **`next build` 성공** — 이 세션 들어 처음으로 전체 빌드가 끝까지 돕니다.
- Rollback: 이 커밋 revert. main은 애초에 안 건드렸으므로 되돌릴 필요도 없습니다.

## 2026-09-02 — Claude: 스텁 대신 진짜 원인 제거, 그리고 main에도 같은 수정

- Agent/session: Claude (클라우드 세션). 사용자 지적: 사이트가 멀쩡해 보이는 것과 최신 커밋이 실제로 배포된 것은 다른 얘기다, 커뮤니티/검사는 손대지 말고 진짜 원인을 없애라.

### "배포는 됐다"의 실제 의미
- 빌드가 실패해도 **직전에 성공한 배포가 계속 서빙됩니다.** Cloudflare·Vercel 등 대부분의 플랫폼이 이렇게 동작합니다 — 실패한 빌드는 아무것도 바꾸지 않고 조용히 남습니다. 그래서 사이트는 멀쩡해 보이지만, `e46eb20`은 아직 한 번도 실제로 배포되지 않았을 가능성이 높습니다.
- 원인: PC 로컬 작업 중 새 파일 두 개가 디스크엔 있었는데 `git add`에서 빠진 채 커밋됐습니다. 로컬 `next dev`는 디스크의 파일을 그대로 쓰므로 문제없이 돌아갔고, push 이후 Cloudflare 빌드 서버에는 그 파일이 없어 거기서만 터졌습니다.

### 방향을 바꿈 — 스텁을 걷어내고 원인 자체를 없앰
- 직전 커밋(`8bfa302`)에서 없는 함수 두 개를 빈 스텁으로 만들어 브랜치만 빌드되게 했었는데, 사용자가 "커뮤니티/검사는 신경 쓰지 말라고 했잖냐"고 정확히 짚었습니다. 스텁이라도 커뮤니티 이름의 파일을 만들어 두는 것 자체가 그 영역에 손을 대는 것이었습니다.
- 대신 **`sitemap.ts`를 `e46eb20` 이전 구조로 되돌렸습니다** — 없는 두 함수를 부르는 부분만 제거하고, 그 커밋이 같이 넣은 유효한 것들(구글 애널리틱스 설정, `/career` 계열 사이트맵 항목)은 그대로 두었습니다. 커뮤니티 낱개 게시글 항목은 원래도 실제 라우트가 없어 채울 수 없었으므로, 정적 `/community` 목록 항목만 남기고 "낱개 페이지가 생기면 여기 채우라"는 주석만 남겼습니다.
- `src/domain/community.ts`에 추가했던 `communityPostPath`와 새로 만들었던 `src/server/community/community-publication.ts`는 **삭제**했습니다. 이제 이 파일들은 main과 정확히 같습니다.
- 이건 기능 개발이 아니라 **없는 함수를 부르는 import 오류 제거**라고 판단해 main에도 같은 최소 수정을 적용했습니다.

### 왜 이게 CLAUDE.md의 "다른 구현 보호"에 안 걸리는가
- 삭제·대체·리팩터한 것은 **어디에도 존재한 적 없는 코드**뿐입니다(`git log --all`로 확인, 처음부터 없었음). 실제로 동작하던 코드를 건드리거나 지운 게 아닙니다.
- 커리어 검사 사이트맵 항목, 애널리틱스 설정 등 **실제로 동작하는 부분은 그대로 뒀습니다.**
- Files: `src/app/sitemap.ts`, `src/domain/community.ts`(추가했던 함수 제거, main과 동일하게 복원), `src/server/community/community-publication.ts`(삭제).
- Validation: 913 tests passed, `tsc` clean, `eslint` — 제가 만진 파일 클린(전역 에러 1건은 `community-lounge.tsx`, 손대지 않음), **`next build` 성공**.
- main 적용: 별도 커밋으로 동일한 diff를 main에 직접 푸시. Rollback: 두 브랜치 모두 이 커밋들 revert.

## 2026-09-02 — Claude: 이메일 로그인을 매직링크에서 6자리 코드로

- Agent/session: Claude (클라우드 세션). 사용자 질문: "매직링크가 결과 첨삭 메일에서만 쓰이는 거냐, 비용 안 늘고 문제없으면 진행".

### 확인한 사실
- 매직링크는 **완료 메일(첨삭 결과 메일)에는 안 쓰입니다.** 그 메일의 "결과 확인하기"는 평범한 URL이고, 로그인 안 돼 있으면 구글 로그인 화면(토스 스타일)이 뜹니다.
- 실제로 매직링크를 쓰는 곳은 둘입니다: `/analysis/prepare` 게스트 화면의 "이메일로 로그인 링크 받기"(`application-case-handoff.tsx`), 결제 확인이 지연될 때의 "이메일로 다시 안내받기"(`quick-checkout-return.tsx`).
- **링크와 코드는 같은 이메일 한 통에 든 같은 값의 두 표현입니다.** Gmail 등이 피싱 확인을 위해 메일을 열자마자 안의 링크를 먼저 방문하면, 그 순간 하나뿐인 값이 소모되어 **코드도 함께 무효화됩니다.** 그래서 "코드도 같이 보여주기"만으로는 안 고쳐지고, 이메일에서 **링크 자체를 빼야** 근본적으로 막힙니다.
- 비용: 늘지 않습니다. `signInWithOtp` 호출 한 번, 이메일 한 통은 그대로입니다. 내용이 링크에서 코드로 바뀔 뿐이라 Resend·Supabase 어느 쪽 사용량도 변하지 않습니다.

### 바꾼 것 (앱 코드)
- 두 화면 모두 "코드 보내기" 이후 **코드 입력 단계**를 추가했습니다. `supabase.auth.verifyOtp({ email, token, type: "email" })`로 이 화면에서 직접 검증하고, 성공하면 새로고침해 링크를 눌렀을 때와 같은 경로(이용권·크레딧 재조회)를 다시 타게 했습니다.
- 기존 `emailRedirectTo`(링크 목적지)는 그대로 뒀습니다 — 이메일 템플릿을 아직 안 고친 동안에는 링크도 계속 살아 있어야 하고, 템플릿을 고친 뒤에는 자연히 안 쓰이게 됩니다.
- 사이드 이펙트로 발견한 것: `application-case-handoff.module.css`의 `.payInstead`가 `.action button`/`.login button`과 명세 우선순위가 같아 밑줄 텍스트가 아니라 초록 버튼으로 덮어써지는 **기존 버그**를 발견했습니다(`.oauthButton`이 이미 같은 문제를 `!important`로 피해 가고 있었습니다). 기존 사용처(`spendCredit` 토글 버튼)는 손대지 않고, 이번에 새로 추가한 "코드 다시 받기"만 별도 클래스(`.otpResend`)로 같은 방식(`!important`)을 적용했습니다.

### 남은 일 — Supabase 대시보드(여기서 못 함)
- **Authentication → Email Templates → Magic Link**에서 링크(`{{ .ConfirmationURL }}`)를 지우고 코드(`{{ .Token }}`)만 남겨야 이 수정이 실제로 효과가 있습니다. 템플릿을 안 바꾸면 지금처럼 링크와 코드가 같이 오고, 링크가 여전히 먼저 소모될 수 있습니다.
- 예시 본문: `인증 코드: {{ .Token }}\n\n이 코드는 {{ .SiteURL }}에서 로그인할 때 사용합니다. 10분 후 만료됩니다.` (링크 관련 문구·버튼 전부 제거)
- Files: `src/components/application-case-handoff.tsx`·`.module.css`, `src/components/quick-checkout-return.tsx`·`.module.css`.
- Validation: 913 tests passed, `tsc` clean, `eslint` — 제 파일 클린(전역 에러 1건은 손대지 않은 `community-lounge.tsx`), `next build` 성공. 헤드리스 크롬 412px 렌더로 두 화면의 코드 입력 단계 확인.
- Rollback: 이 커밋 revert. 이메일 템플릿은 손대지 않았으므로 앱 쪽만 되돌리면 됩니다.

## 2026-09-02 — Claude: 캠페인 문구 수정 기능 + og:image

### 1. 협업쿠폰 캠페인 문구 수정
- 배경: "인원 넣으면 대상에 자동으로 나오는 거, 이미 만든 캠페인은 왜 안 되냐"는 질문에 확인해 보니 캠페인은 만들 때 값이 고정되고 **PATCH는 보관 처리뿐**이라 고칠 방법 자체가 없었습니다.
- 바꾼 것: `PUT /api/meensoo/campaigns`(신규)로 문구만 고치는 경로를 추가했습니다. **코드·수량·기간·상품은 받지 않습니다** — 이미 발급된 코드와 짝지어진 값이라 여기서 바꾸면 코드가 말하는 것과 캠페인이 말하는 것이 어긋납니다. 대상·혜택·부제·사용방법·하단안내·주의사항·기관명·캠페인명, 즉 팜플렛·메일에 그대로 나가는 문구만 고칠 수 있습니다.
- 화면: 캠페인 목록에 "수정" 버튼 추가, 상세 패널에 "수정" 탭 추가. 저장하면 `preview` 상태를 즉시 갱신해 같은 화면의 홍보물 미리보기·메일 초안에도 바로 반영됩니다.
- Files: `src/server/admin/admin-repository.ts`(`updateCampaignText` 추가), `src/app/api/meensoo/campaigns/route.ts`(`PUT` 추가), `src/app/meensoo/coupons/campaign-creator.tsx`.
- 테스트 없음: `admin-repository.ts`의 다른 캠페인 함수들(`createCampaign`·`archiveCampaign`·`deleteCampaign`)도 기존에 테스트가 없어 같은 관례를 따랐습니다. 실 Supabase 클라이언트를 감싼 얇은 함수라 목킹 인프라가 이 파일에 없습니다.

### 2. og:image 추가
- 배경: 카카오톡·슬랙·네이버에 링크를 공유해도 썸네일이 안 떴습니다. `layout.tsx`의 `openGraph`/`twitter` 메타데이터에 `images`가 없었습니다.
- 만든 것: `src/app/opengraph-image.tsx`(신규). Next.js 파일 규약으로 og:image·twitter:image 태그가 자동으로 붙습니다. 동적 값이 없어 **빌드 시점에 한 번만** 그려지고(`next build`에서 `○ /opengraph-image` static으로 확인), 방문자·크롤러 요청마다 다시 그리지 않습니다.
- 한글 렌더링 함정: `ImageResponse`(Satori)는 기본 폰트에 한글 글리프가 없어 그대로 두면 빈 네모로 뜹니다. 화면에 실제로 쓰는 글자만 Google Fonts에 `text=` 파라미터로 요청해 필요한 글리프만 받았습니다(전체 폰트보다 훨씬 가볍고, 빌드 시점 1회이므로 프로덕션 요청 속도와 무관). `fetch`가 최신 브라우저 신호를 안 보내 Google이 TTF를 주는 것을 이용했습니다(WOFF2는 Satori가 못 읽음).
- 디자인: 아이콘(`icon.svg`)과 같은 `#176b4a` 초록 M 마크, 서비스명, "AI 자소서 첨삭" 제목, 부제, 도메인. 1200×630(표준 OG 크기).
- Validation: 913 tests passed, `tsc` clean, `eslint` 클린(전역 에러 1건은 손대지 않은 `community-lounge.tsx`), `next build` 성공 — 실제 생성된 PNG를 열어 한글이 정상적으로 렌더링되는지 확인했습니다(빈 네모 없음).
- Rollback: 두 기능 모두 이 커밋 revert. 마이그레이션 없음, 대시보드 설정 없음 — 여기서 만든 것만으로 완결됩니다.

## 2026-09-02 — Claude: 대시보드 첫 화면에 API 원가·마진 카드

- Agent/session: Claude (클라우드 세션). 사용자 승인("ㄱㄱ")으로 진행. 제가 먼저 찾아 제안한 항목 — "실매출"은 첫 화면에 있는데 원가는 `/meensoo/analyses`(최근 200건 한정)에 들어가야만 보였습니다.
- 바꾼 것: `getSummary()`에 `analysis_run_attempts` 전체를 더하는 쿼리를 추가했습니다. **매출처럼 전체 기간**입니다 — 매출은 전체로 보면서 원가만 최근 며칠로 자르면 두 숫자를 나란히 놓아도 마진을 못 읽습니다.
- **무료 이용권 원가도 포함됩니다.** 무료로 나간 분석도 API 요금은 그대로 나가는데, 위쪽 "실매출"에는 안 잡히므로 여기 원가에 넣지 않으면 마진이 실제보다 좋아 보입니다. "실매출 대비 마진" 문구로 이걸 그대로 드러냈습니다 — 초기에 무료쿠폰 비중이 크면 마진이 낮게(음수로도) 나올 수 있는데, 그게 정확한 그림입니다.
- 표가 없거나(마이그레이션 전) 단가 환경변수가 없으면 "단가 미설정"만 보여 주고 숫자를 만들어 내지 않습니다. 쿼리 실패도 대시보드 전체를 막지 않고 이 카드만 비웁니다.
- Files: `src/server/admin/admin-repository.ts`(`AdminSummary` 타입·`getSummary` 확장), `src/app/meensoo/page.tsx`.
- Validation: 913 tests passed, `tsc` clean, `next build` 성공. 데스크톱 1200px·모바일 412px 렌더 확인 — 실매출 카드 바로 옆에 자연스럽게 배치.
- Rollback: 이 커밋 revert.

## 2026-09-02 — Claude: 홈 화면 아이콘(PWA)과 브랜드 404 페이지

- Agent/session: Claude (클라우드 세션). og:image에 이어 같은 결의 마무리 작업 — "카톡링크 이런 거 하면 고급인" 부류.

### 1. 홈 화면 아이콘
- 문제: `manifest.ts`에 `icons`가 없었습니다. 안드로이드에서 "홈 화면에 추가"를 하면 아이콘 대신 페이지 스크린샷이 뜨고, iOS는 흰 배경에 글자 일부만 잘린 모양이 됩니다.
- 만든 것: `src/app/icon-mark.tsx`(공용 렌더러, og:image처럼 `next/og`의 `ImageResponse` 사용 — 로고가 영문 M 한 글자라 한글 폰트를 따로 받아 올 필요가 없어 og:image보다 단순합니다), `apple-icon.tsx`(iOS, 파일명만으로 Next.js가 자동 연결), `icon-192/route.tsx`·`icon-512/route.tsx`(안드로이드 매니페스트용, `dynamic = "force-static"`으로 빌드 시점 1회만 생성). `manifest.ts`에 두 아이콘을 등록했습니다.
- 검증: 생성된 PNG를 직접 열어 확인 — 192/512/180 각각 정확한 크기, `icon.svg`와 같은 초록 M 마크.

### 2. 브랜드 404 페이지
- 문제: 없는 주소로 들어오면 Next.js 기본 흰 화면이 떠서 사이트가 아니라 서버가 고장 난 것처럼 보였습니다.
- 만든 것: `src/app/not-found.tsx`·`.module.css`. M 마크, "페이지를 찾을 수 없습니다", 홈으로 가는 버튼. `robots: {index:false}`로 색인 제외.
- Files: `src/app/icon-mark.tsx`(신규), `src/app/apple-icon.tsx`(신규), `src/app/icon-192/route.tsx`(신규), `src/app/icon-512/route.tsx`(신규), `src/app/manifest.ts`, `src/app/not-found.tsx`(신규), `src/app/not-found.module.css`(신규).
- Validation: 913 tests passed, `tsc` clean, `eslint` 클린(전역 에러 1건은 손대지 않은 `community-lounge.tsx`), `next build` 성공 — 새 라우트 5개 전부 `○`(static)로 확인. 헤드리스 크롬 412px 렌더로 404 화면 확인.
- Rollback: 이 커밋 revert. 대시보드·마이그레이션 의존 없음.

## 2026-09-02 — Claude: 온보딩 모바일 — 3열 압축을 세로 카드로

- Agent/session: Claude (클라우드 세션). 사용자 지적: "온보딩이 젤 애매하다", "요즘 앱 모바일은 아기자기하게 하잖아".
- 대상은 모바일뿐입니다(≤640px). 메인·첨삭 페이지는 나중으로 미뤘습니다.

### 원인
- 좁은 화면에서 "처음부터 작성/내용 보완/최종 첨삭" 세 카드와 "QUICK/PRO/FINAL" 세 카드가 **3열로 욱여넣어져 있었고, 설명 문단이 통째로 숨겨져 있었습니다**(`display:none`). 남은 건 라벨 네 글자뿐이라, 처음 온 사람이 무엇을 고르는 자리인지 알 방법이 없었습니다. "애매하다"는 지적이 정확했습니다.
- 실제로 렌더링해 확인하니 3열 유지 자체도 문제였습니다 — 카드 폭이 좁아 "처음부터 작성" 같은 4~5자 라벨도 한 글자씩 줄바꿈됐습니다.

### 바꾼 것
- 두 그리드 다 **세로 한 줄씩 펼치는 방식**으로 바꿨습니다. 스크롤은 늘지만 설명을 그대로 보여줘 한 번에 읽고 고를 수 있습니다.
- "처음부터 작성" 카드는 아이콘을 민트색 원형 칩(`var(--mint)`/`var(--green)`)에 담아 왼쪽에 두고, 라벨·제목·설명을 오른쪽에 세로로 쌓았습니다. **처음엔 flex로 짰다가 아이콘·라벨·제목·설명 네 형제가 폭을 나눠 가지며 각각 좁은 세로 칸에 갇혀 다시 한 글자씩 줄바꿈되는 걸 렌더링해서 발견**했습니다 — CSS 그리드로 바꿔 아이콘은 1열에 세 줄 높이로 걸치고 라벨·제목·설명은 2열에 쌓이게 고쳤습니다.
- "QUICK/PRO/FINAL" 카드는 이미 세로 쌓임(`flex-direction:column`) 구조였어서 열 수만 1개로 줄이고 숨겨져 있던 설명을 다시 보여주는 것으로 충분했습니다.
- 라디오 표시는 카드 오른쪽 중앙으로 옮겼습니다(가로 줄 레이아웃에 맞게).

### 색·로고 교체 용이성 (별도 질문에 대한 답)
- `globals.css`에 이미 `--green:#176b4a`, `--mint:#eaf5ef`, `--ink`, `--muted`, `--line` 같은 토큰이 `:root`에 정의돼 있습니다. 그런데 **온보딩을 포함해 대부분의 페이지 CSS 모듈이 이 토큰을 안 쓰고 있습니다** — `#176b4a` 같은 값을 각 파일에 직접 하드코딩해 뒀습니다(같은 값이라 눈에는 안 보이는 차이입니다).
- 그래서 지금 상태로는 브랜드 컬러 하나 바꾸는 게 "토큰 값 한 줄 수정"이 아니라 **파일 여러 개를 찾아 바꿔야 하는 일**입니다. 이번에 새로 짠 모바일 규칙에는 토큰(`var(--mint)`, `var(--green)`)을 썼습니다 — 새 코드부터라도 조금씩 옮겨두면 나중이 편해집니다.
- 지금 당장 전체를 토큰으로 정리하지는 않았습니다. 색이 아직 확정 전이라는 말씀도 있었고, 정해지지 않은 값을 기준으로 대규모 치환부터 해두는 건 헛수고가 될 수 있어서입니다. **색·로고·파비콘이 정해지면 그때 한 번에 토큰 정리를 해 드리면, 그다음부터는 정말 한 곳만 바꾸면 됩니다.**
- Files: `src/app/onboarding/onboarding.module.css`.
- Validation: 913 tests passed, `tsc` clean, `next build` 성공. 헤드리스 크롬 412px(모바일)·1280px(데스크톱) 렌더 확인 — 데스크톱 무변화, 모바일에서 설명 텍스트 정상 노출·줄바꿈 없음.
- Rollback: 이 커밋 revert.

## 2026-09-02 — Claude: 온보딩 모바일 2차 — 토스 스타일, 하단 고정 CTA

- Agent/session: Claude (클라우드 세션). 사용자 피드백: "한방에 보이는 게 나은 거 같은데 지금처럼 하면 유형선택 후 스크롤해야 하는 걸 유저는 모를 듯. 토스/3.3처럼", "디자인이 좀 저렴해 보인다".
- 목업 3개(지금 배포판/압축형/토스식) 스크린샷으로 먼저 비교 후 사용자가 토스식을 선택.

### 구조 — 스크롤 안내를 없앰
- 문제: 유형 카드를 고르면 상품 섹션이 화면 아래쪽에 조용히 나타납니다. 처음 온 사람은 그게 생긴 줄 모릅니다.
- 해결: **화면 하단에 고정된 "다음 · 상품 선택하기" 버튼**을 추가했습니다(모바일에서만, `≤640px`). 유형을 고르면 뜨고, 누르면 상품 섹션으로 부드럽게 스크롤합니다. 토스가 선택 화면마다 쓰는 패턴입니다. 데스크톱은 가릴 콘텐츠가 없어 이 버튼 자체를 숨겼습니다(`display:none` 기본, 모바일 미디어쿼리에서만 켬).
- 안 고른 카드는 라벨·설명을 다 빼고 **제목 한 줄만** 남겼습니다 — 아직 내 이야기가 아닌 카드까지 미리 읽을 필요는 없습니다. 고른 카드만 설명이 나타납니다.

### 디자인 — "저렴해 보인다"는 지적
- 아이콘을 안 고른 상태에선 회색 칩(`#eef1ef`/`#9aa8a2`), 고르면 초록 칩(`var(--green)`/흰색)으로 바꿔 선택 여부가 색만으로도 분명하게 했습니다.
- 고른 카드에 은은한 그림자(`box-shadow`)를 줘 눌린 느낌·입체감을 살렸습니다 — 평평한 색 블록만 있던 게 "저렴해 보인다"는 인상의 원인 중 하나로 보입니다.
- 제목 글자 굵기를 800으로, 자간을 살짝 좁혀(`-0.02em`) 더 또렷하고 힘 있게 보이도록 했습니다. PRO 추천 카드에도 같은 그림자·굵기를 맞춰 일관성을 줬습니다.

### 검증 — 실제 빌드로
- 이번엔 손으로 마크업을 재구성한 목업이 아니라 **실제로 `next build` + `next start`로 서버를 띄우고 Playwright로 진짜 페이지를 조작**했습니다: 카드 클릭 → 선택 스타일·설명·하단 버튼 등장 확인 → 버튼 클릭 → 부드러운 스크롤로 상품 섹션 도달 확인. 데스크톱(1280px)에서는 하단 버튼이 `display:none`으로 실제로 숨는 것도 계산된 스타일로 확인했습니다.
- Files: `src/app/onboarding/page.tsx`, `src/app/onboarding/onboarding.module.css`.
- Validation: 913 tests passed, `tsc` clean, `eslint` 클린(전역 에러 1건은 손대지 않은 `community-lounge.tsx`), `next build` 성공, 실제 서버 기동 후 인터랙션 확인(모바일 412px·데스크톱 1280px).
- Rollback: 이 커밋 revert.

## 2026-09-02 — Claude: 온보딩 모바일 3차 — 옵션별 색, 헤드라인 두 줄 채우기

- Agent/session: Claude (클라우드 세션). 목업으로 여러 색 조합 비교 후 사용자가 "멀티 컬러 옵션 1"을 승인, 아이콘은 "투박하지 않게", 선택 표시는 단순 원 채우기로 확정. 별도로 "지금 어디까지 작성하셨나요?" 헤드라인이 모바일에서 한 줄에 안 들어가면 어중간하게 작아 보이지 말고 큼직하게 채워달라는 요청.

### 옵션 카드 아이콘 — 항상 고유 색
- 이전엔 선택 전엔 회색, 선택하면 초록으로 바뀌는 방식이었습니다. 승인된 목업은 세 옵션이 처음부터 각자 색을 가지는 방식(초록/보라/주황) — 선택 여부는 카드 테두리·그림자·라디오가 대신 표시합니다.
- `:nth-child(1/2/3)`로 옵션마다 그라디언트 배경(초록 `#22c58b→#0c7f52`, 보라 `#8a86ff→#5548d6`, 주황 `#ffb84d→#ee8a1c`)을 고정 지정. 그라디언트 아래 은은한 그림자만 추가(요청대로 가짜 광택 의사요소는 넣지 않음) — "투박하지 않게"의 최소 적용.
- CREATE 옵션 아이콘을 `Sparkles`에서 `Compass`로 교체(요청: "AI 반짝이 아이콘을 옵션 카드에서는 되도록 안 쓰기"). 자동 추천 배너 2곳의 `Sparkles`는 "AI가 자동으로 골랐다"는 의미에 맞아 그대로 뒀습니다.
- 라디오(선택 원)는 이미 구조상 빈 `<span>`이라 선택 시 `#176b4a`로 그냥 채워지는 방식이었습니다 — 별도 체크 아이콘을 넣지 않는 요청과 정확히 일치해 구조는 그대로 두고 크기만 17px→20px로 키웠습니다.

### 헤드라인 — 두 줄이면 큼직하게
- 문제: `.hero h1`이 `var(--type-page-title)`(모바일에서 사실상 고정 36px)를 그대로 썼습니다. 실측(Playwright `Range.getClientRects`로 줄 수 확인)해보니 이 헤드라인은 흔한 폰 폭(360~430px)에서 애초에 한 줄로 절대 안 들어갑니다 — 두 줄은 피할 수 없는데, 36px로 두면 두 줄 다 여백만 남고 작아 보였습니다.
- 처음 시도(`clamp(40px,12.5vw,54px)`)는 과했습니다 — 세 줄로 넘어가 버림(직접 렌더링해서 발견, 계산만으로는 안 잡히는 문제였습니다). `clamp(34px,10.5vw,42px)`로 다시 맞추고, 360~430px 전 구간에서 정확히 두 줄로 떨어지는지 재확인했습니다.
- `word-break:keep-all` 추가 — 글자 아무 데서나 끊기지 않고 "지금 어디까지 / 작성하셨나요?"처럼 단어(띄어쓰기) 경계에서만 끊기도록 했습니다. 전엔 "지금 어디까지 작 / 성하셨나요?"처럼 단어 중간이 끊겨 어색했습니다.
- 데스크톱(`>640px`)은 이 규칙이 미디어쿼리 안에만 있어 영향 없음 — 1280px 렌더로 확인.

### 검증
- Playwright로 실제 빌드 서버(및 개발 서버로 반복 튜닝) 구동 후: `Range.getClientRects()`로 줄 수·줄 폭을 직접 측정(요소 자체의 `getClientRects()`는 블록 하나짜리 사각형만 반환해 줄 수 판별에 못 씀 — Range로 텍스트 노드를 감싸야 줄마다 사각형이 나옵니다), 360/375/390/412/414/430px 전부 두 줄 확인, 카드 클릭 → 선택 스타일·하단 CTA 등장 확인, 데스크톱 1280px 무변화 확인.
- Files: `src/app/onboarding/page.tsx`, `src/app/onboarding/onboarding.module.css`.
- Validation: 913 tests passed, `tsc` clean, `eslint` 클린, `next build` 성공.
- Rollback: 이 커밋 revert.

## 2026-09-02 — Claude: 첨삭 결과 페이지 모바일 — 헤더 버튼 화면 밖으로 잘리는 버그

- Agent/session: Claude (클라우드 세션). 사용자 요청으로 온보딩 다음 "나머지 부분"(메인·첨삭페이지) 모바일 점검에 착수. 실제 서비스에서 결제 완료 후 도착하는 화면(`/result`)과 결제 전 미리보기(`/result/sample`)가 공유하는 `ResultWorkspaceComplete` 컴포넌트를 대상으로 삼았습니다.
- **손대지 않은 것**: `/result/v2`(주석에 "이전 화면을 그대로 보존" 명시), `/result/codex`, `/result/claude`, `/result/codex-restored`, `/result/claude-restored`는 각각 별도 구현체(`result-workspace-*.tsx`)를 쓰는, 다른 에이전트의 변형 화면으로 보여 전혀 열어보지 않았습니다 — CLAUDE.md의 "다른 구현체를 삭제·교체·리팩터하지 않는다" 원칙에 따른 것입니다.

### 발견한 문제 — 취향이 아니라 실제 버그
- 모바일(360~430px)에서 헤더의 "전체 복사 / DOCX 저장 / TXT 저장" 버튼 3개 중 마지막 버튼이 **화면 밖으로 잘려 나가 있었습니다**. 직접 렌더링해 좌표를 재보니 로고 워드마크("MOOA Resume" 전체 텍스트)가 모바일에서도 줄지 않고 약 200px를 그대로 차지해, 버튼 3개가 들어갈 공간이 부족했던 것이 원인이었습니다.
- `.header button{font-size:0}`으로 버튼 텍스트는 이미 숨기고 있었지만, 정작 더 넓은 자리를 차지하는 로고 쪽은 그대로 두고 있어 근본 원인이 남아 있었습니다.

### 고친 것
- 같은 파일에 이미 있던 방식(버튼 라벨을 `font-size:0`으로 숨기고 아이콘만 남기는 패턴)을 로고에도 그대로 적용: `≤700px`에서 `.header .brand`를 `font-size:0`으로 접어 "MOOA"·"Resume" 글자를 숨기고, `.brand>span`(초록 M 배지)만 원래 크기로 복원했습니다. 버튼 패딩도 살짝 줄여 여유를 더 뒀습니다.
- 360~430px 전 구간에서 버튼 3개가 화면 안에 들어오는지 좌표로 재확인했습니다. 데스크톱(1280px)은 미디어쿼리 밖이라 무변화 — 워드마크·버튼 라벨 모두 그대로 보입니다.

### 범위에 대해
- 이 컴포넌트는 680줄 규모로, 점수 카드·문항별 Before/After 비교·공고 대조·면접 예상질문·최종 첨삭본까지 다양한 화면을 한 파일에서 탭으로 전환합니다. 이번엔 **화면 밖으로 잘리는 실제 버그만** 고쳤고, 이미 동작하는 나머지 영역(카드·탭·비교 화면)의 "토스 스타일" 전면 재단장은 별도로 범위를 잡아 진행하는 게 맞다고 판단해 이번엔 진행하지 않았습니다.
- Files: `src/components/result-workspace-complete.module.css`.
- Validation: 관련 테스트 30개 통과, `tsc` clean, `eslint` 클린, `next build` 성공. 360/390/430px 헤더 좌표 확인, 1280px 데스크톱 무변화 확인.
- Rollback: 이 커밋 revert.

## 2026-09-02 — Claude: PRO 입력 페이지 진행순서 카드 정렬 + 결제 전 확인화면 헤드라인 줄바꿈

- Agent/session: Claude (클라우드 세션). 사용자가 실제 폰 스크린샷을 보내 "오와 열이 안 맞는 것 같다"고 지적.

### 1. `/pro/build`(및 create·polish) — 진행 순서 2×2 카드 정렬
- 스크린샷으로 확인된 문제: 01~04 카드 4개는 높이가 이미 똑같은데(그리드 기본 stretch), 카드마다 **제목이 1줄로 끝나는지 2줄로 넘어가는지가 달라** 그 아래 설명 문단이 카드마다 다른 높이에서 시작하고 있었습니다. 사용자는 "글자 크기를 줄이면 맞지 않을까"라고 물으셨는데, 실측해보니 글자를 줄이는 대신 **제목 영역에 2줄 높이를 항상 미리 확보**(`min-height:2.8em`)하는 쪽이 글자 크기를 유지하면서도 정렬을 맞추는 더 정확한 해법이었습니다.
- 같은 행의 두 카드 모두 설명 문단 시작 위치가 정확히 일치하는 것을 좌표로 확인했습니다(수정 전 20px 어긋남 → 수정 후 0px).
- Files: `src/components/pro-input-page.module.css`.

### 2. `/analysis/prepare` (결제 전 최종 확인 화면) — 헤드라인 줄바꿈
- 문제: h1에 `<br/>`로 의도한 줄바꿈("입력한 자료와 제공 범위를" / "한 번만 확인해 주세요.")이 있었지만, 좁은 폰(360~390px, 흔한 폭)에서는 **첫 줄 자체가 다시 한번 줄바꿈되면서 "를" 한 글자만 혼자 남는** 3줄짜리 어색한 모양이 되고 있었습니다. 온보딩에서 썼던 방식과 동일하게, Playwright `Range.getClientRects()`로 실제 줄 수를 재서 확인 후 모바일 전용 폰트 크기(23px)로 낮춰 의도한 2줄이 실제로 2줄로 끝나도록 맞췄습니다.
- 이 화면의 나머지 부분(상품 요약, 준비된 자료, 로그인 폼 등)은 실제 렌더링해 확인한 결과 이미 읽을 만해서 손대지 않았습니다 — CSS에 적힌 숫자만 보고 전부 바꾸면 이미 괜찮은 부분까지 건드리는 과잉 수정이 됩니다.
- Files: `src/components/analysis-preparation.module.css`.

### 검증
- Playwright로 360/375/390/412/414/430px 각각 렌더링해 줄 수·정렬 좌표 확인, 데스크톱(1280px) 무변화 확인.
- Validation: 관련 테스트 통과(`analysis-preparation.test.tsx` 4개), `tsc` clean, `eslint` 클린, `next build` 성공.
- Rollback: 이 커밋 revert.

## 2026-09-02 — Claude: 결제 전 확인화면 — 추천코드·쿠폰 코드 줄 모바일 정렬

- Agent/session: Claude (클라우드 세션). 사용자가 실제 폰(갤럭시)에서 캡처한 스크린샷 3장으로 지적: (1) 이전 커밋들이 실제로 배포됐는지 확인 요청, (2) 추천코드·쿠폰코드 입력 줄에서 "로그인하고 적용/등록" 버튼이 혼자 다음 줄로 밀려나며 어색해 보임.

### 배포 여부에 대해
- 이 세션에는 Cloudflare 배포 권한(`wrangler`)이 없습니다(`wrangler whoami` 결과 미인증). `git push`로 `main`에 반영은 되지만, 실제 서비스(mooaresume) 배포는 별도로 `npm run deploy`를 실행할 수 있는 곳(사용자 PC 또는 배포 권한이 있는 환경)에서 이뤄져야 합니다. 즉 지금까지의 수정 사항이 코드에는 들어갔지만 **아직 실제 사이트에 반영되지 않았을 수 있습니다.**

### 추천코드·쿠폰코드 줄 정렬
- 원인: `ReferralCodeEntry`/`CouponCodeEntry`의 `compact` 모드가 "라벨 + 입력창 + 버튼"을 한 줄에 배치하는 `flex-wrap` 구조였는데, 로그아웃 상태의 버튼 문구("로그인하고 적용", "로그인하고 등록")가 길어서 좁은 폰 폭에서 셋이 한 줄에 다 안 들어가고 **버튼만 혼자 다음 줄로 밀려나며**, 입력창은 그 위에서 쓰지도 않는 폭을 넓게 차지하고 있었습니다.
- 이 파일에는 이미 같은 문제를 겪고 고친 전례가 있었습니다(비압축 `.row`의 코드 주석: "나란히 두면 입력창이 코드보다 좁아지고 두 요소의 끝이 맞지 않았다 — 한 줄, 한 너비로 통일"). `compact` 모드에도 같은 해법을 적용: `≤480px`에서 라벨·입력창·버튼을 각각 완전히 독립된 한 줄(세로 스택)로 바꿔, 버튼 문구 길이와 무관하게 항상 정렬되도록 했습니다.
- 데스크톱과 480px 초과 폭(이 컴포넌트를 쓰는 `/refer` 포함)은 미디어쿼리 밖이라 기존 한 줄 레이아웃 그대로입니다.
- Files: `src/components/referral-code-entry.module.css`.
- Validation: 913 tests passed, `tsc` clean, `eslint` 클린, `next build` 성공. Playwright로 360/390/412/430px에서 라벨·입력창·버튼이 모두 같은 폭의 독립된 줄로 떨어지는지 좌표로 확인, 1280px 데스크톱에서 기존 한 줄 레이아웃 유지 확인.
- Rollback: 이 커밋 revert.

## 2026-09-02 — Claude: 쿠폰 코드 칸을 추천코드와 같은 모양으로 통일 + 가로 스크롤 방어

- Agent/session: Claude (클라우드 세션). 사용자가 실제 라이브 사이트(mooaresume.com)에서 캡처: (1) `/analysis/prepare`에서 가로로 화면이 벗어나 드래그해야 보이는 부분이 있음, (2) 추천코드 칸(방금 수정한 것)은 라벨/입력창/버튼이 세로로 통일됐는데 바로 아래 쿠폰 코드 칸은 여전히 라벨+입력창이 한 줄, 버튼만 별도 줄이라 두 칸이 서로 달라 보임.

### 쿠폰 코드 칸 통일
- 원인: `ReferralCodeEntry`(추천코드)와 `CouponCodeEntry`(쿠폰)는 UI가 거의 같아 보이지만 **완전히 분리된 컴포넌트·CSS 모듈**입니다. 지난 커밋에서 추천코드의 `compact` 레이아웃만 고쳤고, 쿠폰 쪽 `coupon-code-entry.module.css`는 손대지 않아 옛 `flex-wrap` 레이아웃 그대로 남아 있었습니다.
- 조치: 쿠폰 쪽에도 `≤480px`에서 라벨·입력창·버튼을 각각 독립된 한 줄로 통일하는 동일한 규칙을 추가했습니다. 이제 두 칸이 폰에서 완전히 같은 모양입니다.

### 가로 스크롤(페이지 벗어남)
- 재현 시도: 로컬에서 360~430px 전 폭, 추천코드/쿠폰코드에 실제 값 입력, 페이지 맨 아래까지 스크롤 등 여러 상태로 `document.documentElement.scrollWidth`를 직접 측정했지만 **재현되지 않았습니다**(항상 뷰포트 폭과 정확히 일치).
- 확실한 원인은 못 찾았지만, 가장 흔한 실제 원인(flex/grid 항목이 `width:100%`를 줘도 브라우저가 내용 기준 최소 너비를 따로 계산해 그 이상으로 못 줄어드는 문제)을 방어하기 위해 추천코드·쿠폰코드 두 곳의 입력창·버튼에 `min-width:0`을 추가했습니다. 스크린샷이 스크롤 중간(드래그 도중)에 찍힌 것이라 일시적 현상이었을 가능성도 있습니다.
- Files: `src/components/coupon-code-entry.module.css`, `src/components/referral-code-entry.module.css`(방어 코드 추가).
- Validation: 관련 테스트 9개 통과, `tsc` clean, `eslint` 클린, `next build` 성공. Playwright로 두 칸이 동일한 모양으로 렌더링되는지, 실제 값 입력 후에도 가로 스크롤이 없는지 확인.
- 남은 것: 배포 후에도 가로 스크롤이 재현되면, 정확히 어느 화면·상태(로그인 여부, 입력한 값, 스크롤 위치)였는지 확인이 필요합니다.

### 메인 홈 — 원클릭 배너에 그림자 추가 (진행 중)
- 사용자 요청: "메인홈은 규격·글자·내용·UI는 건들지 말고 투박하지 않게 입체감 있게" — 레이아웃·텍스트는 그대로 두고 시각적 깊이만 추가하는 작업. 1단계로 `one-click.module.css`의 `.banner`(그라디언트 카드, 그림자가 전혀 없던 평평한 카드)에 은은한 그림자를 추가했습니다. 나머지 요소(입력창, 시작하기 버튼 등)는 이미 그림자가 있어 우선순위에서 다음으로 미뤄 이번 커밋에는 포함하지 않았습니다.
- Files: `src/app/one-click.module.css`.
- Rollback: 이 커밋 revert.

## 2026-09-02 — Claude: 메인홈 입체감 마무리 + PRO 빌드 페이지 글자 크기 축소

- Agent/session: Claude (클라우드 세션). 사용자 요청 2가지: (1) "메인홈은 규격·글자·내용·UI는 건들지 말고 투박하지 않게 입체감 있게" — 레이아웃·텍스트 변경 없이 시각적 깊이만 추가. (2) "프로빌드(입력페이지)에서 글자 크기를 작게 해서 전체적으로 UI가 더 돋보이게".

### 메인홈 입체감 (레이아웃·텍스트 무변경)
- 지난 커밋(ONE-CLICK 배너 그림자)에 이어 나머지 평평했던 요소에 그림자만 추가: 배너 안 초록 아이콘 사각형(`one-click.module.css` `.icon`), 모바일 헤드라인 아래 "자기소개서 컨설팅 받기" 민트색 알약 칩(`globals.css` `.hero-mobile-sub`). 색·크기·문구·배치는 그대로입니다.
- 이미 그림자가 있던 요소(입력창, 첨삭 예시 버튼, 무료로 시작하기 버튼)는 건드리지 않았습니다 — 이미 평평하지 않은 것까지 손댈 필요는 없다고 판단했습니다.

### PRO 빌드(입력) 페이지 — 모바일 글자 크기 축소
- 대상: `pro-input-page.module.css`의 폰 전용 블록(제목·진행순서 카드·섹션 제목·스타일 선택 카드 등)과 `simple-intake.module.css`의 "지원 자료를 한 번에 넣어주세요" 카드.
- 헤드라인 위주로 눈에 띄게 줄였습니다: 페이지 제목 21px→18px, 간편입력 카드 제목 17px→15px, 진행순서 섹션 제목 16px→14.5px, 섹션 제목들 15px→13.5px, 스타일 카드 제목 13px→12.5px 등. 나머지 본문·라벨류도 전반적으로 0.5~1px씩 줄였습니다.
- **건드리지 않은 것**: `.form textarea`, `.experienceGrid input/textarea`의 16px — 이 값을 16px 미만으로 낮추면 iOS Safari가 포커스 시 화면을 확대한 채 되돌리지 않는 버그가 재현됩니다(이 파일에 이미 적힌 경고). 요청한 "전체적으로 작게"에도 이 값만은 예외로 유지했습니다.
- Files: `src/app/globals.css`, `src/app/one-click.module.css`, `src/components/pro-input-page.module.css`, `src/components/simple-intake.module.css`.
- Validation: 913 tests passed, `tsc` clean, `eslint` 클린, `next build` 성공. 390px 모바일·1280px 데스크톱 렌더 확인 — 데스크톱 무변화, 모바일은 눈에 띄게 조밀해진 레이아웃과 그림자 확인.
- Rollback: 이 커밋 revert.

## 2026-09-03 — Claude: FINAL 전용 모델·추론 강도가 실제로는 안 쓰이고 있던 문제

- Agent/session: Claude. 사용자가 Cloudflare에 `OPENAI_MODEL_FINAL`(gpt-5.6-sol), `OPENAI_REASONING_EFFORT_FINAL`(high)을 이미 넣어뒀다고 해서 확인했습니다.
- Status: completed. 마이그레이션 없음.
- 확인 결과: 코드 어디에도 이 두 환경변수를 읽는 곳이 없었습니다. 실제로 읽히는 건 `OPENAI_MODEL` 하나뿐이고, QUICK/PRO/FINAL 전부 같은 값을 씁니다. **넣어둔 설정이 아무 효과가 없었습니다** — FINAL도 그냥 QUICK/PRO와 같은 모델(`gpt-5.6-terra`)로 돌고 있었습니다.
- 조치: `src/server/ai/model-config.ts`(신규) — `resolveModelConfig(product, baseModel, env)`. FINAL이고 `OPENAI_MODEL_FINAL`이 있으면 그 모델을 쓰고, 없으면 조용히 기본 모델로 떨어집니다. `reasoningEffort`도 같은 규칙이며, 없으면 요청에 `reasoning` 필드 자체를 넣지 않습니다.
  - `openai-responses-gateway.ts`의 `startBackground`(운영 경로)와 `analyze`(평가용) 양쪽에 배선. 요청 바디에 `reasoning: { effort }`를 조건부로 추가.
  - `final-patch-gateway.ts`의 `rewriteSentences`도 `reasoningEffort`를 받아 같은 방식으로 실어 보내고, `final-patch/route.ts`(FINAL 전용 "제출 전 마무리" 문장 재작성)가 `resolveModelConfig("FINAL", baseModel)`을 호출하도록 배선.
- 원가 계산도 같이 틀어지고 있었습니다: FINAL이 다른(더 비싼) 모델로 돌면 `readModelPricingFromEnv()`가 QUICK/PRO 단가를 그대로 빌려 써서 **FINAL 원가가 실제보다 낮게** 잡힙니다. `readModelPricingFromEnv(env, product)`로 바꿔, FINAL이고 `OPENAI_MODEL_FINAL`이 설정돼 있으면 `OPENAI_PRICE_..._FINAL` 전용 단가를 요구하고, 없으면 기본 단가를 빌려 쓰지 않고 `null`(단가 미설정)을 돌려줍니다. `OPENAI_MODEL_FINAL`이 비어 있으면(=FINAL도 기본 모델로 돎) 기존처럼 기본 단가를 그대로 씁니다.
  - `admin-repository.ts`의 `listAnalyses`/`getAnalysis`는 행마다 그 행의 product로 다시 읽도록 변경.
  - `getSummary()`(대시보드 첫 화면 원가 카드)는 `analysis_run_attempts`에 `analysis_runs(product)`를 조인해 product별로 토큰을 나눠 모으고, product별 단가로 각각 계산해 합칩니다. 한 product의 단가를 몰라도 그 몫만 빠지고 나머지는 그대로 더합니다 — 하나가 없다고 이미 아는 QUICK/PRO 원가까지 화면에서 사라지면 안 됩니다.
- `.env.example`에 `OPENAI_MODEL_FINAL`, `OPENAI_REASONING_EFFORT_FINAL`, `OPENAI_PRICE_INPUT_PER_1M_FINAL`, `OPENAI_PRICE_OUTPUT_PER_1M_FINAL` 추가.
- Files: `src/server/ai/model-config.ts`(신규) + `.test.ts`(신규), `src/server/ai/quick/openai-responses-gateway.ts`, `src/server/ai/quick/openai-responses-background.test.ts`(신규 케이스 3건 — PRO는 FINAL 설정 무시, FINAL은 전용 모델·추론 강도 실제로 실림, FINAL인데 전용 모델 없으면 기본으로 떨어짐), `src/server/ai/final-patch-gateway.ts`, `src/app/api/final-patch/route.ts`, `src/domain/analysis-cost.ts` + `.test.ts`(신규 4건), `src/server/admin/admin-repository.ts`, `.env.example`.
- Validation: `npx vitest run` 928 passed(신규 12건), `npx tsc --noEmit` clean, `npx eslint` 클린, `npx next build` 클린.
- **남은 일(사용자)**: Cloudflare·`.env.local` 양쪽에 `OPENAI_PRICE_INPUT_PER_1M_FINAL`/`OPENAI_PRICE_OUTPUT_PER_1M_FINAL`도 넣어야 관리자 화면에서 FINAL 원가가 정확히 나옵니다(안 넣으면 FINAL 행만 "단가 미설정"으로 뜨고 QUICK/PRO는 그대로 나옵니다 — 화면이 멈추지는 않습니다).
- Rollback: 이 커밋 revert.

## 2026-09-03 — Claude: 첫 화면 모바일 하늘색 개편

- Status: main 적용. **모바일(≤812px)만** 바뀝니다. 데스크톱과 나머지 화면은 초록 그대로이며 브라우저로 확인했습니다.
- 색: `.hero` 안에서만 `--green/--green-dark/--mint`를 하늘색으로 갈아 끼웁니다(커밍순 화면이 쓰는 방법과 동일). 자리마다 색을 새로 적지 않아 되돌릴 때도 한 블록입니다.
- 문구: 알약 `자기소개서 컨설팅 받기`와 `실제 첨삭은 PC 추천` 줄을 빼고 → `자소서, 감으로 고치지 마세요. / 지원하는 직무 기준으로 분석하세요.` 앞의 것은 제품 이름 아래에서 제품 이름을 한 번 더 말했고, 뒤의 것은 손님 기기가 second best라고 먼저 말하는 문장이었습니다.
- 순서: `첨삭 예시 보기`의 모바일 `order:-1` 제거 → 시작 버튼 **아래**로. 첫 화면 첫 버튼이 "구경하기"이면 자기 할 일보다 구경을 먼저 권하게 됩니다. 색도 꽉 찬 파랑에서 흰 바탕+파란 글자로 낮췄습니다(꽉 찬 버튼 둘이 나란히 있으면 어느 쪽인지 사라집니다).
- ONE-CLICK 배너(모바일): 42px 아이콘 상자 제거, `ONE-CLICK START` 영어 줄 숨김, 한 줄 알약으로. 두께는 커밍순의 `.counterBadge`와 같은 `5px 13px`. 아이콘은 19px 원형 배지(위 밝음/아래 어두움 + 바깥 옅은 링) — 상자를 아예 없앴더니 밋밋하고 글자 묶음이 왼쪽으로 쏠려 가운데로 안 보였습니다. 알약은 `width: fit-content`로 가운데 정렬.
- 입체감: 제목에 옅은 이중 그림자, `em`에 drop-shadow, 시작 버튼·파일 첨부·배너에 위아래 두 면(밝은 위, 어두운 안쪽 아래선)과 좁고 진한 그림자. 넓고 옅은 그림자는 물건을 띄우는 대신 흐리게만 만듭니다.
- 런칭 특별가 상단바: 색(라임)은 유지하고 면만 세웠습니다 — 위쪽 흰 선, 아래쪽 어두운 선, 그림자를 좁고 진하게. CTA·알약·아이콘에 위아래 방향 그라디언트.
- 아이콘: `MousePointerClick` → `Zap`.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 928건 통과, `next build` 통과. 모바일·데스크톱 브라우저로 육안 확인.
- Rollback: 이 커밋 revert.

## 2026-09-03 — Claude: 첫 화면 PC도 하늘색 개편

- Status: main 적용. 모바일은 앞 커밋에서 이미 바뀌었고 이번엔 데스크톱입니다.
- 제목: `좋은 문장보다, 합격을 위한 준비를 봅니다.` → **`자기소개서 첨삭`**. 검색으로 들어온 사람이 실제로 치는 말이 제목이 됩니다. 앞 문장은 **버리지 않고** 페이지 아래 `WHY WE BUILT THIS` 자리로 옮겼습니다(신규 `creed.module.css`, 최종 합격 매니페스토 바로 뒤). 카드나 아이콘 없이 넓은 여백 가운데 글자만 — 이 페이지에서 유일하게 아무것도 팔지 않는 자리라 조용함이 곧 무게입니다.
- 설명줄: `채용공고와 내 경험…` → `자소서, 감으로 고치지 마세요. / 지원하는 직무 기준으로 분석하세요.` 모바일과 같은 문장입니다.
- `AI 취업 지원서 코치` 눈썹은 유지하고 크기·색만 맞췄습니다.
- **함정 하나**: 그라디언트 제목에 `text-shadow`를 걸면 안 됩니다. 글자가 `color: transparent`라 그림자가 글자 뒤가 아니라 **글자 자리**에 그려져, 흰 그림자를 얹었더니 제목이 통째로 씻겨 나갔습니다(브라우저로 확인). 두께는 `em`의 `drop-shadow`로만 줍니다.
- ONE-CLICK 배너(PC): 사각형 아이콘 타일 → 원형 배지, `ONE-CLICK START` 영어 줄 제거, 하늘색·얇은 알약형. 오른쪽 설명(`입력은 간단하게, 분석은 섬세하게`)은 다른 말을 하므로 유지.
- 입력창·버튼(PC): textarea `min-height` 280 → **420px(1.5배)**, 시작 버튼 `padding` 15 → 20px에 글자 17px. 이 화면에서 손님이 하는 일은 붙여넣기 하나인데 폰과 같은 높이면 넓은 화면에서 부속처럼 보입니다.
- **기준선 정리**: `globals.css`는 760px, 제가 앞 커밋에서 만든 모듈 규칙은 812px이었습니다. 그 사이 폭에서 레이아웃은 데스크톱인데 버튼 색만 모바일이 되는 구간이 있었습니다. 모듈 쪽을 760px로 맞췄습니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 928건 통과, `next build` 통과. 데스크톱 브라우저로 육안 확인.
- Rollback: 이 커밋 revert.

## 2026-09-03 — Claude: 첫 화면 마무리 (조판·여백·버튼 통일)

- 제목 `자기소개서 첨삭`: 커밍순의 `COMING SOON`과 같은 조판으로 맞췄습니다 — 900 굵기, 자간을 좁히지 않고 `.01em`으로 살짝 벌림, 줄 높이 1. **그라디언트를 접고 단색(#0284c7)으로** 바꿨습니다. 속이 비치는 글자는 덩어리로 보이지 않고, 무엇보다 그림자를 얹을 수가 없습니다(투명한 자리에 그려져 글자를 지웁니다 — 앞 커밋에서 실제로 겪었습니다). 단색이라 아래로 어두워지는 두 겹 + 바닥에 넓게 깔리는 한 겹으로 실제 두께를 줬습니다.
- 눈썹: `AI 취업 지원서 코치 & 자소서 전용 AI 분석 엔진`. 가운데 `&`를 옅게 눌러 두 덩이로 읽히게 했습니다.
- 아이콘: `Zap` → `Sparkles`. 번개는 대각선이라 동그라미 안에서 광학적으로 가운데가 아니었습니다. 좌우 대칭인 모양이라 맞출 것이 없어집니다.
- 위 여백: `.hero` `padding-top` 104 → **44px**. `104px`는 원클릭 바가 없던 시절 값입니다. 지금은 바로 위에 띠가 있어 그 사이가 비어 보이고, 작은 모니터에서 입력칸과 버튼이 첫 화면 밖으로 밀려났습니다.
- 버튼 색 통일: 시작 버튼 하늘색과 `첨삭 예시 보기` 흰 바탕을 **모바일 전용에서 기본 규칙으로** 올렸습니다. 기기마다 버튼 색이 다르면 같은 서비스로 보이지 않습니다. 중복 선언하던 모바일 블록은 제거.
- 확인: 시작 버튼 `linear-gradient(#0ea5e9,#0284c7)` 17px/20px, 예시 버튼 흰 바탕 `#0369a1`, textarea `min-height: 420px`, 파일 첨부 `#0284c7` — 브라우저 계산값으로 확인. 모바일도 재확인.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 928건 통과, `next build` 통과.

## 2026-09-03 — Claude: 간편입력에서 채용공고 링크 읽기 + 반짝이 마크 교체

- **간편입력 링크**: 간편입력은 칸이 하나라 사람들이 자기소개서와 함께 공고 주소를 붙여넣는데, 지금까지 그 줄은 **자기소개서 본문으로** 읽혔습니다. 공고를 넣었다고 생각한 사람이 공고 대조 없는 결과를 받았습니다.
  - 신규 `src/domain/posting-link.ts`(+테스트 9건): `findPostingUrl`은 **줄 하나가 통째로 주소일 때만** 찾습니다. 문장 속 주소까지 집어 오면 회사 홈페이지를 언급한 문장이 공고로 둔갑합니다. `www.`로 시작하면 스킴을 붙여 줍니다. `removePostingUrlLine`은 불러온 뒤 그 줄만 뺍니다(남기면 주소가 자소서 첫 문장이 됩니다).
  - `simple-intake.tsx`: 주소를 찾으면 안내 줄과 `공고 불러오기` 버튼이 뜹니다. **자동으로 부르지 않습니다** — 붙여넣는 중에 주소가 잠깐 완성되는 순간마다 남의 서버를 두드리게 되고, 손님이 시키지 않은 일을 하게 됩니다.
  - 서버는 기존 `POST /api/job-postings/fetch`를 그대로 씁니다(상세입력이 쓰던 것). 불러온 글은 `kind: "JOB_POSTING"` 첨부 한 장으로 들어가 다른 자료와 똑같이 확인·수정할 수 있습니다.
  - 못 읽으면(그림 공고, 스크립트로 그리는 공고) 그렇게 말하고 붙여넣기를 권합니다. 조용히 넘어가면 손님은 공고를 넣은 줄 압니다.
  - 안내: textarea placeholder에 "채용공고 주소를 한 줄로 붙여넣으면 공고 내용을 불러옵니다."
- **반짝이(✨) 마크 교체**(사용자 요청 — 지우지 말고 뜻에 맞게 바꿀 것): AI가 알아서 해 준다는 인상을 주는데 이 서비스는 그 반대를 말합니다. 자리마다 다른 아이콘으로 바꿨습니다.
  - 결과 화면 `첨삭 후` 4곳 → `CheckCheck`(고쳐 놓은 상태)
  - 런칭 특별가 → `Tag`(가격), FINAL 카드 목록 3곳 → `Check`
  - 시작 단계 자동 판별·온보딩 3곳 → `ScanSearch`(읽어서 알아냄)
  - PRO 코치 → `MessagesSquare`, PRO 단계별 안내 → `ListOrdered`(순서)
  - 모바일 메뉴 `이용 방법` → `BookOpen`, 피드백 브랜드 → `FileText`
  - 홈 `고칠 순서가 분명하게` → `ListChecks`
  - **남은 6곳은 손대지 않았습니다**: `career-*` 5곳과 `community-lounge` 1곳은 코덱스 영역입니다.
- 한방 배너 아이콘: `Zap` → `FileUp`(문서를 올린다는 뜻이 옆 문장과 같습니다).
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0·경고 2(기존), `vitest run` 937건 통과, `next build` 통과. 브라우저에서 링크 감지 배너 확인.

## 2026-09-03 — Claude: 스캔본 자격증·증명서 받기 + 자격·증명 갈래

- **원인 규명**: 자격증이 안 올라간 것은 자격증이라서가 아니라 **스캔본이라서**입니다. `local-document.ts`가 추출 글자가 0자면 거부했는데(`파일에서 작성 내용을 찾지 못했어요`), 자격수첩·면허증·정부 발급 증명서는 대부분 이미지 PDF입니다. 전자발급본(지게차 운전기능사 등)은 글자가 있어 통과했고, 같은 자격증이라도 발급 방식으로 갈렸습니다.
- **①②: 스캔본을 거부하지 않고 받습니다.**
  - `LocalDocumentResult.unreadable` 신설. **PDF만** 빈 글자를 허용합니다 — TXT·DOCX가 비어 있으면 그건 정말 빈 파일입니다.
  - 간편입력 목록에서 그 파일에 `· 스캔본이라 글자를 읽지 못했습니다`를 표시하고, **한 줄 입력칸**을 붙였습니다(예: `직업상담사 2급 · 2020.09 취득`). 그 한 줄이 그 파일의 텍스트가 됩니다.
  - **사진을 모델에 보내지 않습니다.** 값·정확도 문제도 있지만, 면허증·건강보험 서류에는 주민번호가 찍혀 있고 그것을 외부로 보내는 것은 다른 이야기입니다. 사실은 본인에게 받습니다 — `제출 전 보완`과 같은 원칙입니다.
- **③: `CERTIFICATE`(자격·증명서) 갈래 신설.**
  - 파일명 규칙에 학교 서류(생활기록부·성적표)와 한국 자격증 이름(급수·`~사`·기능사·기술사)을 넣었습니다. `직업상담사2급.pdf`처럼 "자격증"이라는 말이 없는 이름이 많아 급수와 종목 어미까지 봅니다. **규칙 목록의 맨 끝**이라 자소서·이력서·경력기술서가 먼저 걸립니다.
  - `경력증명서`는 그대로 `CAREER_DOCUMENT`입니다(`경력증명`이 `증명서`보다 앞).
  - **가는 곳은 예전과 같습니다**(참고자료). 근거 자료로 올리려면 DB의 `document_kind` enum이나 `get_running_context`의 분석 SQL을 건드려야 해서, 그 결정은 사용자에게 넘겼습니다. `mapSimpleIntake`에서 빠뜨리면 파일이 통째로 사라지므로 freeform에 명시적으로 함께 담았습니다.
- 알아낸 것(미결): `RESUME/CAREER_DOCUMENT/PORTFOLIO`만 supporting set으로 들어가 교차검증에 읽힙니다. 자격증이 `기타`에 있는 한 "자격증을 올렸는데 근거 없다고 나오는" 문제는 남습니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 940건 통과(신규 3건, 기존 2건은 새 동작에 맞게 수정), `next build` 통과.

## 2026-09-03 — Claude: 자격증 규칙이 자기소개서를 삼키던 회귀 수정 + 저장 실패 로그

- **회귀(제가 만든 것)**: 자격증 파일명 규칙에 `상담사|관리사`를 넣었더니 `대학일자리센터_직업상담사_커리어컨설턴트_전민수.pdf`(실제 자기소개서)가 `CERTIFICATE`로 갔습니다. 그것들은 자격증 이름이 아니라 **직업 이름**이고, 파일 이름에 "자기소개서"가 없으면 앞 규칙이 걸러 주지 못하므로 마지막 규칙이 넓으면 그대로 사고가 됩니다. 두 낱말을 뺐고 회귀 테스트를 붙였습니다. `직업상담사2급.pdf`는 `\d\s*급`으로 계속 잡힙니다.
- **저장 실패 로그**: `POST /api/application-cases`가 거절당하면 이제 서버 로그에 Postgres 코드·문서 개수·`kind:길이` 목록을 남깁니다. 화면에는 "지원 건을 비공개로 저장하지 못했습니다."만 남아 첨부 문제인지 마이그레이션 문제인지 구분할 수 없었습니다. **본문은 남기지 않습니다** — 지원서 내용이 로그에 쌓이면 안 됩니다.
- **알아낸 것 — FINAL은 자기 모델 변수를 씁니다**: `resolveModelConfig`가 FINAL일 때 `OPENAI_MODEL_FINAL`을 우선합니다(`.env.local`에 설정돼 있음). 그래서 `OPENAI_MODEL`을 망가뜨려도 FINAL은 정상 동작했고, 환불 테스트가 성립하지 않았습니다. FINAL로 실패를 재현하려면 `OPENAI_MODEL_FINAL`을 망가뜨려야 합니다.
- **아직 안 고친 것(의도)**: `경력증명서`는 회사가 발급한 증빙이고 `경력기술서`는 본인이 쓴 서류라 서로 다른 문서가 맞습니다. 다만 지금 옮기면 근거 자료(supporting set)에서 **빠져** 참고자료로 내려갑니다 — 지금보다 나빠집니다. `CERTIFICATE`를 근거 자료로 올리는 작업(ⓐ)과 **같이** 옮겨야 합니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 942건 통과, `next build` 통과.

## 2026-09-03 — Claude: 자격·증명서를 근거 자료로 + 간편 입력에서 스타일 선택 제거

- **먼저 정정**: 앞 기록에서 "자격증이 `기타`면 교차검증에 안 읽힌다"고 적었는데 **틀렸습니다**. `begin_quick_analysis`의 필터는 `d.kind not in ('OTHER','REVISION_REQUEST') or product in ('PRO','FINAL')`이라 **PRO·FINAL에서는 `기타`도 읽힙니다**(QUICK에서만 빠집니다). 실제 문제는 다른 둘이었습니다:
  - 모델에 **`'portfolio'`** 라는 이름으로 전달됐습니다(`else 'portfolio' end`). 증빙이 작품집으로 소개되면 근거로 쓰라는 신호가 사라집니다.
  - 예산 순서가 **맨 뒤(6)**였습니다. 주석에도 "기타 증빙 is what falls off the end"라고 적혀 있습니다. 자료를 많이 넣을수록 먼저 잘리는데, 그 사람이 FINAL 손님입니다.
- 신규 마이그레이션 2개:
  - `20260903100000_document_kind_certificate.sql` — `alter type ... add value if not exists 'CERTIFICATE'`. **트랜잭션 밖**입니다(같은 트랜잭션에서는 방금 더한 값을 쓸 수 없습니다).
  - `20260903100100_certificate_evidence.sql` — `begin_quick_analysis`를 `create or replace`. 바꾼 것은 **두 줄뿐**입니다: 우선순위에 `CERTIFICATE = 3`(이력서 바로 다음, 나머지는 한 칸씩 밀림), 라벨에 `'certificate'`. 예산 계산식·이용권 처리·`OTHER` 노출 규칙은 그대로이며 마이그레이션 테스트 5건으로 잠갔습니다.
- 코드: `analysis-contract`의 문서 kind에 `certificate` 추가, `candidateMaterialKindSchema`·`CANDIDATE_MATERIAL_LABEL`에 `CERTIFICATE` 추가, `MATERIAL_KINDS`에 포함(근거 자료로 감), `application-case-handoff`의 kind 유니온 확장.
- **경력증명서를 `CAREER_DOCUMENT`에서 분리**했습니다. 경력기술서는 본인이 쓴 서류, 경력증명서·재직증명서는 회사가 발급한 증빙이라 같은 갈래에 두면 대조의 양쪽이 한 편이 됩니다. 둘 다 근거 자료로 가므로 옮겨도 분석에서 빠지지 않습니다 — 앞 커밋 시점에는 참고자료로 내려앉아 더 나빠졌을 일이라 미뤄 뒀던 것입니다.
- **간편 입력에서 `작성 스타일`·`첨삭 방향`을 감췄습니다**(상세 입력 전용). 간편을 고른 사람은 "빨리 맡기고 싶다"고 말한 것이고, 실제로는 대부분 기본값 그대로 지나가 물어본 척만 하는 자리였습니다. 대신 기본값(균형)으로 간다는 것과 상세 입력에서 고를 수 있다는 것을 한 줄로 알립니다.
- **사용자 실행 필요**: `npm run db:remote:push` — 이 두 마이그레이션이 적용되기 전에는 `CERTIFICATE`가 DB 타입에 없어 지원 건 저장이 실패합니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 947건 통과(신규 5건), `next build` 통과.

## 2026-09-03 — Codex: rate-limit RPC 고정 규칙화 (진행 중)

- Intended change: 기존 3인자 rate-limit RPC를 폐기하고, 허용 action과 시간창·한도를 DB 함수 안에 고정한 1인자 RPC로 교체한다.
- Reason: 인증 사용자가 RPC를 직접 호출하면서 제한값·시간창을 임의로 전달할 수 있는 여지를 없앤다.
- Scope: 커뮤니티 rate-limit migration/helper/test만 변경한다. 클로드의 제품 코드·공통 UI는 건드리지 않는다.
- Validation planned: migration test, typecheck, lint, build, remote migration plan/apply.
- Rollback: 이 후속 migration을 revert하고 이전 3인자 함수/호출로 복구한다.

## 2026-09-03 — Codex: rate-limit RPC 고정 규칙화 (완료)

- Status: 완료. 3인자 RPC를 폐기하고, DB 내부에서 허용 action과 한도·시간창을 고정한 1인자 RPC로 교체했다. 원격 migration `20260903110000_lock_community_rate_limit_rules.sql` 적용 및 local/remote 일치 확인.
- Files: `supabase/migrations/20260903110000_lock_community_rate_limit_rules.sql`, `src/server/community/community-rate-limit.ts`, `src/server/community/community-migration.test.ts`.
- Validation: 커뮤니티 테스트 6개, typecheck, production build 통과. 린트 오류 0, 기존 경고 2건 유지.
- Launch status: 코드·DB 런칭 최소선 완료. 배포 후 두 테스트 계정 E2E와 관리자 신고 숨김 확인만 남음.
- Rollback: 후속 migration을 revert하고 이전 함수 구현으로 복구한다.

## 2026-09-03 — Codex: 커뮤니티 작성 버튼 피드백 개선 (진행 중)

- Status: active.
- Protected baseline: 현재 메인에 병합된 `src/components/community-lounge.tsx` 작성창 및 클로드의 비커뮤니티 작업.
- Change and reason: 사용자가 로그인한 로컬 커뮤니티에서 제목·본문 최소 길이를 채우기 전 제출 버튼이 이유 없이 비활성화되어 작성 불가처럼 보인다고 보고했다. 커뮤니티 작성창만 수정해 버튼을 항상 누를 수 있게 하고, 부족한 입력은 즉시 한국어 안내로 표시한다. 서버 검증·권한·DB는 변경하지 않는다.
- Files/branch: `src/components/community-lounge.tsx` on shared `main`.
- Validation: component/domain tests, typecheck, production build planned.
- Rollback/recovery reference: this focused UX commit can be reverted independently.
- User decision: 사용자 요청에 따른 즉시 수정.

## 2026-09-03 — Codex: 커뮤니티 작성 버튼 피드백 개선 (완료)

- Status: active.
- Change: `익명으로 올리기`는 저장 중일 때만 비활성화한다. 제목이 2자 미만이거나 본문이 5자 미만이면 클릭 직후 각각의 입력 안내를 표시하며, 유효한 제목·본문은 앞뒤 공백을 정리해 기존 API로 보낸다.
- Files: `src/components/community-lounge.tsx`, `docs/agent-change-log.md`.
- Validation: `npm run typecheck`, `npm run build`, `git diff --check` 통과.
- Rollback: 이 UX 변경 커밋을 revert하면 기존 비활성화 조건으로 돌아간다.

## 2026-09-03 — Codex: 커뮤니티 초기 운영 한도·작성창 오류 표시 (진행 중)

- Status: active.
- Protected baseline: 커뮤니티 rate-limit RPC와 `community-lounge` 작성창. 비커뮤니티 코드와 기존 마이그레이션은 보존한다.
- Change and reason: 실제 테스트에서 글 5개/시간 제한이 초기 운영과 신고 검증을 막았다. 후속 migration으로 글 생성 한도만 20개/시간으로 완화한다. 또한 작성 모달이 열려 있는 동안 오류 toast가 backdrop 아래로 가려지는 z-index 문제를 고친다.
- Files/branch: 새 후속 community migration, migration test, `src/components/community-lounge.module.css`, `docs/agent-change-log.md` on shared `main`.
- Validation: targeted migration test, typecheck, build, remote migration apply planned.
- Rollback/recovery reference: 이 후속 migration과 CSS 커밋을 revert하면 5개/시간 및 기존 표시 위치로 복귀한다.
- User decision: 사용자가 5개 이후 차단 및 안내가 가려지는 문제를 직접 보고해 수정 요청.

## 2026-09-03 — Codex: 커뮤니티 초기 운영 한도·작성창 오류 표시 (완료)

- Status: active.
- Change: 글 생성 rate limit을 시간당 5개에서 20개로 완화하는 후속 migration을 추가·원격 적용했다. toast z-index를 60으로 올려 작성 모달(z-index 50) 위에서 오류가 보이게 했다.
- Files: `supabase/migrations/20260903120000_relax_community_post_rate_limit.sql`, `src/server/community/community-migration.test.ts`, `src/components/community-lounge.module.css`, `docs/agent-change-log.md`.
- Validation: 커뮤니티 migration 테스트 3개 통과, 원격 Supabase migration 적용 완료. 전체 `typecheck`/build는 변경하지 않은 `src/evals/quick-eval.ts`의 `ANSWER_TOO_SHORT` 유니온 누락 오류로 실패했으며 커뮤니티 테스트는 통과했다.
- Rollback: 이 후속 migration과 CSS 변경 커밋을 revert한다.

## 2026-09-03 — Claude: 껍데기 첨삭이 완료로 기록되던 문제

- **증상**: FINAL이 0점을 내고 첨삭이 거의 없었습니다. 사용자는 첨부파일 탓으로 의심했습니다.
- **조사**: 원격 DB에서 같은 자소서(6문항·10,537자)로 돌린 FINAL 세 판을 비교했습니다.

  | 시각 | mode | score | 원문 → 첨삭 | rejectionRisks / interviewerFlags / claimEvidence |
  |---|---|---|---|---|
  | 9/2 | BUILD | 15 | 10,537 → **362** | 0 / 0 / 0 |
  | 9/2 | BUILD | **58** | 10,537 → **9,814** | 5 / 2 / 8 |
  | 9/3 | BUILD | 0 | 10,537 → **394** | 0 / 0 / 0 |

  **같은 입력·같은 모드인데 결과가 널뜁니다.** 첨부파일도, 모델 설정도, 예산도 원인이 아니었습니다(`gpt-5.6-sol`/`high`, 참고자료 예산 60,000자, `max_output_tokens` 약 42,000에 실제 사용 6,177). 모델이 간헐적으로 껍데기를 돌려줍니다.
- **진짜 문제는 그것을 받아들인 쪽입니다.** 검증기에 `LENGTH_OVER`(너무 김)는 있는데 **아래쪽 한도가 없었습니다.** `revisedAnswer`가 한 글자라도 있으면 스키마를 통과하므로, 1,687자 답변이 65자로 돌아와도 COMPLETED로 기록되어 손님에게 전달됐습니다. 자동 환불도 걸리지 않습니다 — 실패가 아니니까요.
- **조치**: `ANSWER_TOO_SHORT` 검사 추가. 원문이 200자 이상인 문항에서 첨삭본이 원문의 40% 미만이면 막습니다. `BLOCKING_VALIDATION_CODES`에 넣었으므로 `AI_OUTPUT_VALIDATION_FAILED`(retryable)로 떨어져 **자동 재시도**로 넘어갑니다. 재시도는 출력 예산도 1.35배로 잡습니다.
- 경계값 근거: 덜어내는 첨삭은 정상입니다(안정형·분량 초과). 그래도 절반 아래로는 잘 가지 않습니다. 문제가 된 판들은 원문의 3~4%였습니다. 200자 미만 원문에는 비율을 적용하지 않습니다 — 100자에서 40%는 40자라 문장 두엇만 다듬어도 걸립니다.
- **프롬프트·모델·분석 로직은 건드리지 않았습니다.** 나온 결과가 껍데기인지 보는 눈만 더했습니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 950건 통과(신규 3건), `next build` 통과.

## 2026-09-03 — Codex: 커뮤니티 첨부 비용 제한·더 보기·접힌 게시글 (진행 중)

- Status: active.
- Protected baseline: 기존 커뮤니티 API, RLS, rate-limit RPC, 작성창과 라운지 목록 UI. 비커뮤니티의 진행 중 변경은 건드리지 않는다.
- Change and reason: 사용자 결정에 따라 PDF는 유지하되, 첨부가 있는 게시글은 계정당 하루 1회로 제한한다. 그 한 게시글에서 이미지는 최대 2장·각 3MB, PDF를 포함한 전체 첨부 총량은 24MB로 제한한다. 목록은 20개씩 더 보기를 제공하고, 긴 제목·본문은 접어서 상세/더 보기로 읽게 한다. 비로그인 첨부 클릭은 JSON 오류 대신 커뮤니티 로그인 안내로 되돌린다.
- Files/branch: community domain/schema, post/upload/attachment routes, community migrations/tests, lounge component/CSS, change log on shared `main`.
- Validation: targeted tests, typecheck/build as available, remote migration apply planned.
- Rollback/recovery reference: this focused commit and migration can be reverted independently; user will later decide whether to remove attachments after launch.
- User decision: explicit implementation request.

## 2026-09-03 — Claude: 간편 입력 안내가 감춰지는 칸 안에 있던 문제

- 앞 커밋에서 넣은 "작성 스타일과 첨삭 방향은 기본값(균형)으로 진행합니다" 안내가 화면에 나오지 않았습니다. 상세 입력 영역 전체가 `inputMode === "SIMPLE"`일 때 `hiddenPane`으로 감춰지는데, 안내를 **그 칸 안에** 두었기 때문입니다. 감춰지는 칸 밖, 자료 목록 바로 아래로 옮겼습니다(사용자 요청 위치).
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 950건 통과, `next build` 통과.

## 2026-09-04 — Claude: 분석 시작 실패가 실패로 기록되지 않던 구멍

- **사용자 재현**: `OPENAI_MODEL`을 없는 이름으로 바꾸고 QUICK 결제·분석 → `AI_PROVIDER_404`. 화면에는 "분석 엔진 설정에 문제가 있어 시작하지 못했습니다"가 떴는데, **환불도 알림도 없었습니다.**
- **원격 DB 확인**: 그 런은 두 시간 넘게 `status=RUNNING, failure_code=null, attempt_count=1`. `begin_quick_analysis`가 이미 이용권을 소모하고 RUNNING으로 바꿔 둔 뒤였고, 그 다음 실패는 **바깥 catch가 화면에 문장만 돌려주고 끝났습니다.** `fail_quick_analysis`가 불리지 않으니 이용권 복구도, 실패 알림도, 자동 환불도 걸리지 않습니다. 모델 이름 하나가 틀리면 **손님 돈만 들어오고 아무 일도 일어나지 않는** 상태가 됩니다.
- 10분 타임아웃 환불이 결국 잡아 주기는 하지만 크론이 돌아야 하고(로컬에는 없습니다), 그동안 손님은 아무 말도 듣지 못합니다.
- **조치**: `execute` 라우트의 바깥 catch에서 `repository.fail(runId, code, retryable)`을 부릅니다. `repository`와 런 ID를 try 밖으로 올려 두었습니다.
  - `AI_PROVIDER_401/403/404`는 **재시도하지 않습니다**. 우리 설정이 틀린 것이라 다시 눌러도 같은 답이 오고, 같은 실패를 두 번 더 사는 대신 바로 최종 실패로 보내 환불·알림을 받는 편이 낫습니다.
  - 그 외(429·5xx·타임아웃)는 재시도로 둡니다.
  - `fail` 호출이 다시 실패해도(이미 실패로 적혔거나 상태가 맞지 않는 경우) 원래 오류를 덮지 않고 로그만 남깁니다.
- 화면에 OpenAI 원문이 보인 것은 개발 모드 전용 `detail`입니다(`NODE_ENV !== "production"`). 프로덕션에는 나가지 않습니다.
- 남은 정리: `1aaa6a56` 런이 RUNNING으로 멈춰 있습니다. 서버가 뜬 상태에서 `POST /api/analysis-runs/advance`(크론 시크릿)를 한 번 부르면 타임아웃 환불로 정리됩니다. 샌드박스라 실제 돈은 아닙니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 950건 통과, `next build` 통과.

## 2026-09-04 — Claude: 환불이 "돌려줄 수 있는 금액"을 넘겨 거절되던 문제

- **사용자 재현 로그**: `run_failure_refund_failed ... {"loc":["body","amount"],"msg":"Refund amount exceeds refundable amount","input":8800}`
- 원인: `billing_orders.amount`에는 웹훅이 `event.data.totalAmount`(세금·수수료 포함)를 넣습니다(`polar-webhook.ts:138`). 환불할 때 그 값을 그대로 보냈는데, 폴라가 돌려줄 수 있는 것은 그보다 작습니다. 같은 파일 161줄이 이미 `netAmount`와 `refundedAmount`를 구분하고 있었는데 환불 쪽만 그 사실을 몰랐습니다.
- 결과: 환불이 통째로 거절되고 주문에 `auto_refund_state = UNCERTAIN`만 남습니다. 실제로 QUICK 8,800원 주문이 그 상태로 남아 있었습니다. 이용권은 `fail_quick_analysis`가 ACTIVE로 되돌려 두어 손님이 다시 돌릴 수는 있지만, 돈은 그대로입니다.
- 조치: 신규 `polar-refundable-amount.ts` — `polar.orders.get`으로 **폴라가 알려 주는 `refundableAmount`**를 읽고 `min(저장 금액, refundableAmount)`만 환불합니다. 우리가 계산해서 맞히려 들지 않습니다. 0이면 폴라를 부르지 않고 `POLAR_NOTHING_REFUNDABLE`로 던져 `UNCERTAIN`으로 남깁니다.
- **두 경로 모두에 적용**했습니다: 최종 실패 환불(`quick-failure-refund.ts`)과 10분 타임아웃 환불(`quick-timeout-refund.ts`). 타임아웃 쪽은 아직 실제로 발화한 적이 없어 드러나지 않았을 뿐 같은 결함이었습니다.
- 테스트 2건 추가: 폴라가 말하는 금액만 환불하는지, 0일 때 호출하지 않고 UNCERTAIN으로 두는지.
- 함께 확인된 것(조치 없음): `AI_PROVIDER_404`는 앞 커밋대로 재시도 없이 바로 FAILED로 기록됐습니다(`d032fc58`, attempt 1). 화면이 "다시 시도 중"에서 멈춰 있던 것은 그 전 런(`1aaa6a56`, `AI_OUTPUT_VALIDATION_FAILED` attempt 2)이 재시도 대상이라 계속 걸고 있었기 때문입니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 952건 통과, `next build` 통과.

## 2026-09-04 — Claude: 이용권 회수 제약 위반 수정 + QUICK 상한 안내

- **환불은 성공했습니다.** 앞 커밋의 `refundableAmount` 수정이 통해 주문이 `auto_refund_state = SUBMITTED`, 폴라 환불 ID까지 받았습니다.
- **이용권 회수만 실패**했습니다: `quick_failure_refund_revoke_failed { code: '23514' }`. `analysis_entitlements`의 체크 제약이 `status = 'REVOKED'`일 때 `revoked_at is not null`을 함께 요구하는데, `revoke_refunded_analysis_entitlement`가 상태만 바꾸고 있었습니다. 제가 만든 함수의 실수입니다.
  - 신규 마이그레이션 `20260904010000_fix_revoke_refunded_entitlement.sql` — `revoked_at`을 함께 채우고 `consumed_*`를 명시적으로 비웁니다.
  - 이 실패가 환불을 되돌리지 않은 것은 호출부가 회수 실패를 삼키고 "환불됨"으로 답하도록 만들어 두었기 때문입니다. 던졌다면 바깥이 환불을 한 번 더 시도했을 것이고 그게 훨씬 나쁩니다.
  - 남은 증상은 손님이 **돈도 돌려받고 이용권도 그대로** 갖는 것이었습니다.
- **QUICK 상한(사용자 승인)**: `QUICK_MAX_CHARS = 15,000자`(포함 8,000 + 1블록 7,000). 그 위에서는 결제 화면에 "이 분량은 PRO가 더 낫습니다"를 띄우고 PRO 링크를 답니다. **막지는 않습니다** — 사실을 말하고 고르게 합니다.
  - 근거: 2블록(11,700원)은 PRO와 1,200원 차이, 3블록(14,600원)은 **PRO보다 1,700원 비쌉니다**. 알면 아무도 고르지 않을 선택지를 모른다는 이유로 파는 것은 팔 이유가 되지 못합니다.
  - `QUICK_MAX_CHARS`는 포함량과 블록에서 계산합니다. 숫자를 따로 적어 두면 하나만 고쳤을 때 조용히 어긋납니다(테스트로 잠갔습니다).
- **보류하기로 한 것(사용자 결정)**: 기본 글자수 축소, 추가 글자 과금 상향, 참고자료 과금. 실측 근거 — 참고자료 8,322자가 더해질 때 토큰은 약 10,600 증가(글자당 1.3 토큰, 전부 입력)로 판매가의 0.5% 미만입니다. 걷을 돈이 없고, FINAL이 파는 교차검증에 세금을 매기는 구조가 되며, 손님이 자료를 빼면 품질이 무너집니다. 원가는 계량기가 아니라 이미 있는 상한(참고자료 60,000자)으로 묶는 것이 맞습니다.
- **사용자 실행 필요**: `npm run db:remote:push`
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0, `vitest run` 956건 통과(신규 4건), `next build` 통과.

## 2026-09-04 — Claude: QUICK 안내 기준을 15,000자에서 "PRO보다 비싸질 때"로 정정

바로 위 항목의 상한 15,000자를 **정정합니다.** 사용자 지적이 맞았습니다.

- **제가 앞서 쓴 근거가 틀렸습니다.** "PRO가 QUICK의 2.4배 토큰"이라고 적었는데, 그 두 무리는 **작업량이 달랐습니다** — QUICK 런들은 자소서 752~1,803자에 참고자료 0, PRO 런들은 자소서 8,244자에 참고자료 8,322자였습니다. 자소서가 4배 길고 참고자료까지 있었으니 등급 차이가 아니라 분량 차이였습니다. 같은 글로 견준 자료는 아직 없고, 참고자료 없는 PRO(8,202자)가 21,318 토큰인 것으로 보아 실제 배수는 1.4~1.6배로 추정합니다.
- **그래서 구간마다 답이 다릅니다.** PRO로 보냈을 때 우리 매출은 1블록 +4,100원, 2블록 **+1,200원**, 3블록 **−1,700원**입니다. 2블록에서 1,200원은 토큰 원가가 1,000토큰당 60원만 넘어도 사라집니다. 앞 항목이 인용한 "385원" 손익분기는 일반 QUICK↔PRO 비교였고 **상한 구간에는 맞지 않는 숫자**였습니다.
- **1~2블록에서는 QUICK이 실제로 더 쌉니다.** 거기서 PRO를 권하는 것은 안내가 아니라 장사입니다. 손님도 손해가 아니고(덜 받는 대신 덜 냅니다), 우리도 원가 싼 등급을 잃습니다. 아무 말도 하지 않는 것이 맞습니다.
- **조치**: `QUICK_MAX_CHARS` · `QUICK_MAX_EXTRA_BLOCKS` · `exceedsQuickCeiling()`를 제거하고 `quickCostsMoreThanPro()` 하나로 바꿨습니다.
  - 기준을 숫자로 박지 않고 **두 값을 실제로 견줍니다**: `createQuickCheckoutQuote(n).totalPriceKrw > PRO_BASE_PRICE_KRW`. 가격이 바뀌면 안내가 뜨는 자리도 저절로 따라 움직입니다. 경계 9곳에서 견줌과 일치하는지 테스트로 잠갔습니다.
  - 실질 효과: 안내가 뜨는 자리가 15,001자 → **22,001자**로 올라갑니다.
- **이름도 고쳤습니다.** `QUICK_MAX_CHARS`/`exceedsQuickCeiling`은 "못 산다"로 읽혔고 실제로 사용자가 그렇게 읽었습니다. 결제를 막는 코드는 처음부터 없었습니다 — `analysis-preparation.tsx`의 문단 하나가 전부입니다.
- 안내 문구도 "PRO가 더 낫습니다" → **"PRO가 더 쌉니다"**로 바꿨습니다. 이제 이 문구는 값이 실제로 역전된 자리에서만 뜨므로, 더 정확하고 더 셉니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0(기존 경고 2), `vitest run` 956건 통과, `next build` 통과.

## 2026-09-04 — Claude: 환불하고도 "문의해 주세요"라고 말하던 화면 + 조용히 사라지던 첨부

### 1. 환불 확인 (조치 없음, 사실 확인)

사용자가 "8,800원 냈는데 8,000원만 환불된 것 아니냐"고 물었습니다. **전액 환불됐습니다.**

폴라 API로 직접 확인:

```
REFUND a65254ee status=succeeded amount=8000 tax=800
ORDER  8406b3db net=8000 tax=800 total=8800 refunded=8000 refundedTax=800 stillRefundable=0 status=refunded
```

`Order.refundableAmount`는 **세전 금액(net)**이고(SDK 주석: "Amount in cents that can still be refunded (net, before taxes)"), 세금은 `refundedTaxAmount`로 함께 나갑니다. 8,000 + 800 = 8,800, `stillRefundable = 0`. 대시보드가 세금을 별도 줄로 빼서 8,000만 보인 것입니다.

**이용권 회수도 성공했습니다** — 앞 커밋의 마이그레이션이 적용되어 `REVOKED` + `revoked_at` 기록됨(18:51:08). 다만 그 **이전** 환불건(17:52, order `b656f53f`)의 이용권은 아직 `ACTIVE`로 남아 있습니다. 마이그레이션 전에 실패한 건이라 손으로 정리가 필요합니다.

`billing_orders.status`가 아직 `PAID`인 것은 로컬에 `order.refunded` 웹훅이 닿지 않기 때문입니다.

### 2. 환불했는데 "문의해 주세요"라고 말하던 화면

- 증상: 자동 환불이 나간 뒤에도 결제 복귀 화면이 **`QUICK · 확인이 필요합니다` / "결제는 다시 하지 마시고 문의해 주세요"**를 띄웠습니다.
- 원인: `quick-checkout-return.tsx`의 최종 실패 분기가 **타임아웃 환불(`timeoutRefunded`)만** 알고 있고, 최종 실패 자동 환불은 몰랐습니다. 상태 API가 그 사실을 내려 주지 않았습니다.
- 조치:
  - `api/checkouts/quick/status/route.ts` — `billing_orders.auto_refund_state`를 함께 읽어 `autoRefunded`(= `SUBMITTED`)를 내려보냅니다. `status`(REFUNDED)를 쓰지 않은 이유는 그 값이 폴라 웹훅을 기다려야 하고 손님은 그 전에 이 화면을 보기 때문입니다. `SUBMITTING`·`UNCERTAIN`은 제외했습니다 — 접수됐는지 모르는 건에 "환불했습니다"라고 말할 수 없습니다.
  - 제목을 `확인이 필요합니다` → **`환불했습니다`**로, 본문을 "전액 자동 환불했습니다. 따로 문의하지 않으셔도 됩니다. 카드사에 따라 며칠 걸릴 수 있습니다"로 바꿨습니다. 타임아웃 환불 분기에도 같은 제목이 걸리도록 했습니다.

### 3. zip이 "에러도 없이" 안 올라가던 것

- 원인 두 가지가 겹쳐 있었습니다.
  1. **`extractLocalDocuments`가 돌려주는 `skipped`를 `simple-intake.tsx`가 통째로 버리고 있었습니다.** 압축파일 안의 사진(jpg·png)은 글자를 읽을 수 없어 건너뛰는데, 그 사실이 화면 어디에도 나오지 않았습니다. **자격증 압축파일은 대부분 사진입니다.**
  2. **파일 하나가 넘어지면 배치 전체를 잃었습니다.** `extractLocalDocuments` 호출이 반복문 바깥의 단일 try 안에 있어, 압축파일 하나가 던지면 이미 읽은 자소서·이력서까지 `added`째로 버려지고 `onError`만 남았습니다.
- 조치:
  - 파일마다 try를 두어 실패한 것만 이름과 이유로 남기고 나머지는 살립니다.
  - `batch.skipped`를 기존 "넣지 못한 파일 N개" 목록에 `압축파일명 안의 항목명` 형태로 올립니다.
  - 압축파일에 읽을 것이 하나도 없을 때의 문구를 **다음에 무엇을 하면 되는지**까지 말하도록 고쳤습니다: "사진(JPG·PNG)은 글자를 읽을 수 없어요 — PDF로 저장해 올리시거나, 자격증 이름을 입력칸에 적어 주세요."
- 테스트: 신규 `src/components/simple-intake.test.tsx` 3건(사진만 든 zip이 화면에 남는지, 하나 실패해도 나머지가 남는지, 지나친 항목이 이름으로 나오는지) + `local-document.test.ts` 문구 검증 강화.
  - 테스트를 쓰다 한 번 속았습니다: `cleanup` 없이 `document.querySelector`로 입력창을 찾아 앞 테스트의 컴포넌트를 집었습니다. `afterEach(cleanup)` + `view.container` 기준으로 고쳤고, 그 이유를 파일에 적어 두었습니다.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0(기존 경고 2), `vitest run` 959건 통과(신규 3건), `next build` 통과.

## 2026-09-04 — Claude: 증빙·ITQ·컴활을 자격·증명서로 분류

- 사용자 화면에서 `증빙-ITQ OA MASTER - 전민수.pdf`가 **기타 자료**로 빠졌습니다. 스캔본이라 본문이 비어 있어 파일 이름이 유일한 단서인데, `증빙`도 `ITQ`도 규칙에 없었습니다.
- `document-classify.ts`의 CERTIFICATE 규칙에 `증빙|컴퓨터활용능력|컴활|ITQ`를 더했습니다. 일반 명사는 넣지 않았습니다 — 앞서 `상담사|관리사`를 넣었다가 자기소개서를 삼킨 적이 있어, 증빙 문서에만 나타나는 말과 구체적인 자격증 이름으로 제한했습니다.
- 테스트 2건: 새 이름들이 CERTIFICATE로 가는지, 그리고 **직무 이름이 든 자기소개서를 다시 삼키지 않는지**(회귀 잠금).
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0(기존 경고 2), `vitest run` 961건 통과.

## 2026-09-04 — Claude: 환불 안내 메일(손님용) 신설 — 사용자 승인

- 문제: 자동 환불이 나갔다는 사실이 가는 곳이 **관리자 메일과 결제 복귀 화면 둘뿐**이었습니다. 관리자 메일은 손님이 못 보고, 복귀 화면은 **창을 닫으면 사라집니다.** 손님은 며칠 뒤 카드 내역만 보고 "돈만 나갔다"고 생각하게 됩니다.
- 신규 `src/server/notifications/refund-notice-email.ts` — `notifyRefundedApplicant()`. 기존 `analysis-complete-email.ts`의 Resend 호출 구조를 그대로 따랐습니다(설정 없으면 skip, 실패해도 던지지 않음).
- **`disposition === "REFUNDED"`일 때만 보냅니다.** `SUBMITTING`·`UNCERTAIN`은 접수 여부조차 모르는 상태이고, 그때 "환불했습니다"라고 쓰는 것은 아무 말도 하지 않는 것보다 나쁩니다.
- **금액은 `claim.amount`(= `billing_orders.amount`, 결제 총액)를 씁니다.** 폴라에 보낸 `refundAmount`는 세전이라 8,000처럼 보이는데, 그 숫자를 메일에 적으면 손님 카드 내역(8,800)과 어긋나 "800원이 덜 왔다"로 읽힙니다. 테스트로 잠갔습니다.
- 연결한 곳 두 군데:
  - 최종 실패 환불 — `supabase-quick-analysis-run-repository.ts`의 `fail()`에서 **관리자 알림보다 먼저** 보냅니다. 관리자 알림은 우리를 부르는 것이고, 이건 손님에게 사실을 전하는 유일한 경로입니다. 실패해도 삼킵니다.
  - 10분 타임아웃 환불 — `api/checkouts/quick/status/route.ts`. `refundTimedOutQuickAnalysis`가 이번 호출에서 환불을 만들었을 때만(`"amount" in timeout`) 보냅니다. **이 화면은 2초마다 폴링하므로**, 이미 접수돼 있던 주문(금액 없이 같은 disposition으로 돌아옴)까지 보내면 폴링 횟수만큼 메일이 나갑니다.
  - 이를 위해 `quick-timeout-refund.ts`의 성공 반환에 `amount`·`currency`를 **추가**했습니다(기존 필드·동작 변경 없음).
- 테스트 5건: 결제 총액을 적는지(세전 금액이 나오지 않는지), 환불 안 된 건에 안 보내는지, 주소 없으면 멈추는지, 설정 없으면 조용히 넘어가는지, 전송 거절에도 던지지 않는지.
- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0(기존 경고 2), `vitest run` 966건 통과(신규 5건), `next build` 통과.

## 2026-09-04 — Claude: 네이버 웹마스터도구 가이드 대조 후 보완

사용자가 준 `wmt_guide_ps_quality.pdf`(네이버 웹마스터도구 · 사이트 품질향상 가이드, 27p)를 pdfjs로 추출해 현재 사이트와 대조했습니다.

**이미 되어 있던 것**(조치 없음): `naver-site-verification` 메타태그, 네이버 애널리틱스(wcslog), sitemap.xml, 사이트맵 수록 페이지 대부분의 canonical, `<img>` alt 누락 0건, `href="#"` + onclick 링크 0건, 구조화 데이터(Organization·WebSite·Service·FAQPage·DiscussionForumPosting).

**보완한 것 두 가지:**

1. `robots.ts` — 네이버 검색로봇 `Yeti` 규칙을 명시적으로 추가(가이드 p10). `*`가 이미 포함하지만 가이드가 명시를 권합니다.
   - **막는 목록을 두 묶음에 똑같이 넣었습니다.** robots.txt는 가장 구체적인 User-agent 묶음 **하나만** 읽으므로, Yeti 묶음에 disallow를 빠뜨리면 Yeti는 `*`의 목록을 보지 않고 `/redeem/`을 수집합니다 — 그 경로에는 이용권을 가져갈 수 있는 토큰이 들어 있습니다. 목록을 `DISALLOWED` 상수 하나로 묶고, 신규 `robots.test.ts` 3건으로 잠갔습니다(두 묶음의 disallow가 같은지, `/redeem/`·`/meensoo/`가 들어 있는지).
2. `privacy/page.tsx` — `alternates.canonical` 추가. 사이트맵에 실린 주소 중 대표 URL이 비어 있던 유일한 페이지였습니다. 개인정보처리방침은 외부에서 링크될 때 추적 파라미터가 붙기 쉬워 중복 문서로 세어질 수 있습니다(가이드 p15).

**적용하지 않고 남긴 것**: 연관 채널 구조화 데이터(`sameAs`, 가이드 p22~24). 네이버 블로그·SNS 채널의 실제 주소가 있어야 하는데 없습니다. 주소를 받으면 `page.tsx`의 Organization 노드에 넣으면 됩니다.

- Validation: `tsc --noEmit` 통과, `eslint src` 오류 0(기존 경고 2), `vitest run` 969건 통과(신규 3건), `next build` 통과.

## 2026-09-04 — Claude: 커뮤니티 리뷰 결과 문서화 + 자동 글 환경변수 자리 마련

- 사용자가 집 밖에서 모바일 GUI로 이어서 개발하기로 해, 코덱스의 미커밋 커뮤니티 작업을 **읽기만 하고**(파일 수정 없음) 결과를 `docs/handoff-community-mobile.md` 로 남겼습니다.
- 리뷰에서 확인된 것(자세한 내용과 고치는 법은 위 문서):
  - 🔴 `take_community_attachment_post_limit` RPC가 **어느 마이그레이션에도 없습니다.** 첨부가 있는 글은 첫 시도부터 429로 막힙니다. 기존 `take_community_rate_limit(p_action)` 에 `'ATTACHMENT_POST'` case 한 줄을 더하는 것이 맞는 수정입니다 — 새 함수를 만들 이유가 없습니다.
  - 🔴 작성 모달이 제목 110자·파일 3개·8MB를 허용하는데 서버는 80자·이미지 2장·3MB로 거부합니다. 게다가 `submit()` 이 **파일을 먼저 업로드하고** 글을 저장해, 거부될 때마다 스토리지에 고아 파일이 남습니다.
  - 🟠 목록이 40 → 20개로 줄었는데 클라이언트가 `hasMore`·`nextOffset` 을 쓰지 않아 "더 보기"가 없습니다.
  - 🟠 `hotPosts` 가 로드된 20개 안에서만 인기글을 뽑습니다("이번주 10개 / 인기 20개" 요구사항에는 서버 질의가 필요).
  - 🟡 비로그인 첨부 리다이렉트 대상 `/community?attachment=login-required` 를 읽는 코드가 없습니다.
  - 🟡 `byteSize` 가 클라이언트 신고값이라 전체 용량 검사를 우회할 수 있습니다(실제 상한은 업로드 라우트가 막아 30MB).
  - 🟢 주제 목록이 라우트와 도메인 두 곳에 있습니다.
  - **맞게 되어 있는 것**: `range(offset, offset+20)` 이 21개를 가져오는 것은 21번째 존재 확인용이고 `slice(0,20)` + `hasMore` 도 정확합니다. 문서에 "고치지 마세요"로 적어 두었습니다.
- 매일 자동 글(글 3·댓글 3) 기능은 **환경변수 자리만** 만들었습니다(구현은 모바일에서 진행). `.env.example` 에 `COMMUNITY_SEED_CRON_SECRET`·`COMMUNITY_SEED_USER_ID`·`COMMUNITY_SEED_ENABLED`·`COMMUNITY_SEED_MODEL` 을 추가했고, 비밀값 하나를 생성해 `.env.local` 에 넣었습니다. 인증 규칙은 기존 `ANALYSIS_CRON_SECRET`(비어 있으면 항상 거부)을 그대로 따릅니다.
- 설계 문서에 **밝히고 쓰는 편집 콘텐츠**로 못 박았습니다: 익명 사용자로 위장하지 않고 `is_editorial` + `운영팀` 배지를 답니다. 구글은 순위를 노린 대량 생산 콘텐츠(scaled content abuse)를 제재하므로, 익명 사용자 글로 위장한 하루 3+3(월 180개)은 검색 유입을 늘리려다 사이트 전체를 깎아먹을 수 있습니다.
- Validation: 소스 변경 없음(문서·env 템플릿만). `vitest run` 969건 통과 상태 유지.

## 2026-09-03 — Claude: 커뮤니티 인수인계 1번 — 첨부 있는 글이 100% 실패하던 문제

- Agent/session: Claude(모바일 GitHub 앱 GUI 세션). `docs/handoff-community-mobile.md`의 1번(최우선)을 순서대로 처리합니다. **코덱스가 만든 커뮤니티 구현은 지우거나 갈아엎지 않고, 있는 것 위에서만 고쳤습니다.**
- Status: completed. **마이그레이션 있음 — `npm run db:remote:push` 필요.**
- 확인한 것: 인수인계 문서가 지목한 `await supabase.rpc("take_community_attachment_post_limit")` 호출은 **최신 main을 받아보니 이미 코덱스가 지운 상태**였습니다(존재하지 않는 RPC를 부르던 것 자체는 해소됨). 다만 그 결과 **첨부 있는 글에 하루 1회라는 원래 의도된 제한이 통째로 사라져** 있었고, 그냥 일반 `POST_CREATE`(시간당 20회) 한도만 적용되고 있었습니다. 인수인계 문서가 요청한 실제 목표(첨부 글 하루 1회 제한을 살리기)는 아직 안 되어 있어 그대로 구현했습니다.
- 문서 지시대로 **새 함수를 만들지 않고**, 이미 있는 `public.take_community_rate_limit(p_action text)`에 `case` 한 줄만 추가했습니다: `when 'ATTACHMENT_POST' then v_limit := 1; v_window_seconds := 86400;`. 기존 5개 액션(`POST_CREATE`/`COMMENT_CREATE`/`REPORT_CREATE`/`UPLOAD`/`RECOMMEND`) 한도는 `20260903120000_relax_community_post_rate_limit.sql`에서 그대로 복사해 값이 바뀌지 않았습니다.
- `src/server/community/community-rate-limit.ts`의 `CommunityAction`에 `"ATTACHMENT_POST"` 추가.
- `src/app/api/community/posts/route.ts`: 요청을 파싱해 `parsed.data.attachments.length`를 알 수 있게 된 직후(기존 소유권 검사 바로 앞)에 `첨부가 있으면 ATTACHMENT_POST 한도도 통과해야 함`을 추가했습니다. 첨부 없는 글은 기존과 동일하게 `POST_CREATE`만 봅니다.
- 참고(문서에 이미 적혀 있던 내용, 코드 변경 없음): 이 한도는 UTC 고정 버킷이라 한국시간 오전 9시에 초기화됩니다. 자정 기준으로 바꾸려면 `v_window_started_at` 계산에 시간대 보정이 필요합니다 — 이번 수정 범위 밖이라 손대지 않았습니다.
- Files: `supabase/migrations/20260904020000_attachment_post_rate_limit.sql`(신규), `src/server/community/community-rate-limit.ts`, `src/app/api/community/posts/route.ts`, `src/server/community/community-migration.test.ts`(신규 테스트 1건 — 새 case 추가 + 기존 5개 한도 무변경 + 옛 RPC 이름 완전히 없음을 함께 확인).
- Validation: `npx vitest run` 970 passed(신규 1건), `npx tsc --noEmit` clean, `npx eslint` 클린.
- Rollback: 이 커밋 revert. 마이그레이션은 `case` 한 줄만 늘리므로 되돌려도 기존 5개 액션 동작에는 영향 없습니다.
- 다음: 인수인계 문서 2번(입력창-서버 규칙 불일치, 업로드 순서로 인한 고아 파일)으로 이어갑니다.

## 2026-09-03 — Claude: 커뮤니티 인수인계 2번 — 업로드 순서 때문에 남는 고아 파일

- Agent/session: Claude(모바일 GitHub 앱 GUI 세션). 인수인계 문서 2번.
- Status: completed. 마이그레이션 없음.
- 먼저 확인한 것: 문서가 지적한 **화면-서버 규칙 불일치(제목 110 vs 80자, 파일 개수/용량 차이)는 최신 main을 받아보니 이미 코덱스가 고쳐 놓은 상태**였습니다 — 지금 코드는 제목 110자, 첨부 최대 3개·각 8MB로 화면과 `createCommunityPostSchema`/업로드 라우트가 정확히 일치합니다. 문서에 적힌 "이미지 2장/PDF 1개", "이미지 3MB·PDF 24MB" 같은 값은 이제 코드 어디에도 없습니다 — 문서가 쓰인 뒤 코덱스가 더 단순한 규칙(종류 구분 없이 8MB·3개)으로 정리한 것으로 보입니다. **이 부분은 손대지 않았습니다.**
- 아직 안 된 것 — "더 나쁜" 순서 문제만 남아 있었습니다: `submit()`이 **첨부를 먼저 올리고 그 다음 글을 저장**하는데, 글 저장이 실패하면(검증 실패, 한도 초과, 네트워크 등) 이미 올라간 파일이 주인 없이 스토리지에 남습니다. 문서가 제시한 두 방향(화면에서 먼저 막기 / 실패 시 정리) 중 **정리 쪽(확실함)**을 구현했습니다 — 앞의 화면 검증은 이미 서버와 일치하므로 첫 번째 방향은 이미 부분적으로 되어 있는 셈이지만, 서버가 나중에 다른 이유로 거부하는 경우(속도 제한, 중복 등)는 화면 검증으로 막을 수 없어 정리가 필요합니다.
- `DELETE /api/community/uploads`(신규) — 넘어온 `storagePaths` 중 **본인 계정 경로(`${uid}/...`)만** 골라 스토리지에서 지웁니다. 서버 라우트로 둔 이유: storage RLS가 이미 본인 파일 삭제를 허용해 브라우저에서 직접 지워도 되지만, 이 프로젝트는 브라우저→Supabase 직접 호출에서 겪은 사고(서명키 회전 때 여러 화면이 동시에 조용히 실패) 이후 중요한 쓰기를 서버 라우트로 옮겨 온 흐름을 따랐습니다. **최선을 다하는 정리**라 실패해도 예외를 던지지 않고 `{ok:true}`를 돌려줍니다.
- `community-lounge.tsx`의 `submit()`: 업로드 루프에서 모은 `attachments` 배열을 `catch` 블록에서도 볼 수 있게 `try` 바깥으로 올렸습니다. 실패 시(첨부 두 번째 장 업로드 실패든, 글 저장 자체 실패든) 그때까지 올라간 파일들을 새 DELETE 라우트로 지운 뒤에 원래 오류 메시지를 그대로 보여줍니다. 정리 요청 자체가 실패해도 `.catch(() => {})`로 삼켜, 정리 실패가 "글을 못 올린 이유"를 가리지 않게 했습니다.
- Files: `src/app/api/community/uploads/route.ts`(`DELETE` 핸들러 추가), `src/components/community-lounge.tsx`(`submit()` 재구성).
- Validation: `npx vitest run` 970 passed(회귀 없음, 이 부분은 기존 관례대로 전용 테스트 없이 진행 — 다른 커뮤니티 라우트들도 Supabase 목킹 테스트가 없는 것과 같은 이유), `npx tsc --noEmit` clean, `npx eslint` 클린.
- Rollback: 이 커밋 revert. `DELETE` 핸들러가 없어져도 기존 POST 업로드/글쓰기 동작에는 영향 없습니다(고아 파일 정리만 사라짐).
- 다음: 인수인계 문서 3번(목록 40→20개, "더 보기" 없음)으로 이어갑니다.

## 2026-09-03 — Claude: 커뮤니티 인수인계 3번 — "더 보기" 없이 글이 잘려 있던 문제

- Agent/session: Claude(모바일 GitHub 앱 GUI 세션). 인수인계 문서 3번.
- Status: completed. 마이그레이션 없음.
- 실제로 확인한 상태는 문서 설명과 달랐습니다: 문서는 "API가 이미 `hasMore`/`nextOffset`을 내려주는데 화면이 안 쓴다"고 적었지만, 최신 main의 `posts/route.ts` GET은 **`hasMore`/`offset`/`range` 자체가 없이 그냥 `.limit(40)`으로 최신 40개만 고정해서 돌려주고 있었습니다.** 문서가 가리키던 페이지네이션 구현을 코덱스가 그 사이 더 단순한 형태로 되돌린 것으로 보입니다. 결과적으로 증상은 문서와 같습니다 — **글이 40개(문서 작성 시점엔 20개)를 넘으면 볼 방법이 없습니다.**
- API를 진짜로 페이지네이션하도록 다시 만들었습니다. `PAGE_SIZE = 20`, `offset` 쿼리 파라미터(기본 0)를 받아 `.range(offset, offset+PAGE_SIZE)`로 **한 개 더** 가져온 뒤, 21번째가 있으면 `hasMore: true`로 표시하고 20개만 잘라 돌려줍니다. 문서가 경고한 대로 count 전용 질의를 따로 만들지 않았습니다.
- 화면(`community-lounge.tsx`): `hasMore`/`loadingMore` 상태를 추가하고, 정렬·주제를 바꾸는 기존 `useEffect`는 그대로 두되(0페이지를 다시 불러오는 지금 동작이 맞습니다) `loadMore()`를 새로 만들어 **지금 쌓인 글 개수(`posts.length`)를 다음 페이지의 시작점**으로 씁니다. 별도의 `offset` 상태를 두지 않은 이유는, 정렬/주제가 바뀔 때마다 `posts` 배열 자체가 통째로 새로 채워지므로 그 길이가 항상 정확한 다음 시작점이기 때문입니다 — 상태 두 개를 맞춰 두는 것보다 하나에서 계산하는 편이 어긋날 일이 없습니다.
- 목록 아래에 "더 보기" 버튼을 추가했습니다(`feedStatus === "ready" && hasMore`일 때만). 불러오는 동안은 버튼을 비활성화하고 아이콘으로 바꿉니다(이 컴포넌트의 다른 버튼들과 같은 방식 — 별도 스핀 애니메이션 없이 아이콘 교체만 하는 기존 관례를 따름). 실패하면 토스트 메시지로만 알리고 이미 불러온 글은 그대로 둡니다.
- 문서가 "고치지 마세요"라고 명시한 부분(`range(offset, offset+20)`이 21개를 가져오는 이유, `slice(0,20)`+`hasMore` 계산 방식)은 그 설명 그대로 새로 구현했습니다 — 이전 구현이 사라진 상태였을 뿐, 그 설계 자체가 틀렸던 적은 없습니다.
- Files: `src/app/api/community/posts/route.ts`(GET 핸들러 재작성), `src/components/community-lounge.tsx`(`hasMore`/`loadingMore` 상태, `loadMore()`, 버튼), `src/components/community-lounge.module.css`(`.loadMore` 스타일 추가).
- Validation: `npx vitest run` 970 passed(회귀 없음, 기존 관례대로 이 라우트도 전용 테스트 없음), `npx tsc --noEmit` clean, `npx eslint` 클린, `npx next build` 성공.
- Rollback: 이 커밋 revert. 되돌리면 이전처럼 최신 40개만 보이는 상태로 돌아갑니다(깨지지 않음, 기능만 없어짐).
- 다음: 인수인계 문서 4번("이번 페이지 인기"만 뽑히는 인기글)으로 이어갑니다.

## 2026-09-03 — Claude: 커뮤니티 인수인계 4번 — "이번 주 인기글"이 지금 로드된 페이지 안에서만 뽑히던 문제

- Agent/session: Claude(모바일 GitHub 앱 GUI 세션). 인수인계 문서 4번.
- Status: completed. 마이그레이션 없음.
- 확인한 문제: 사이드바 "이번 주 많이 읽은 글"이 `[...posts].sort(...).slice(0,3)`로, **지금 화면에 로드된(최대 20개, 게다가 topic 파라미터로 서버에서 이미 걸러진) 목록만** 정렬해 뽑고 있었습니다. 글이 500개여도 최신 20개 중에서만 고르고, "이번 주"라는 이름과 달리 기간 제한도 없어 몇 달 전 인기글이 계속 상단을 차지할 수 있었습니다.
- 문서가 제안한 대로 서버가 따로 뽑아 주게 했습니다. `posts/route.ts` GET에 두 파라미터를 추가:
  - `limit` — 페이지네이션용 `PAGE_SIZE`(20)와 별개로, 사이드바처럼 작은 목록이 필요할 때 씁니다(1~20 사이만 허용, 범위 밖이면 기존 기본값으로).
  - `window` — `7d` 형식만 받아 `created_at >= now() - N일`로 거릅니다. 형식이 안 맞으면 조용히 무시(기간 제한 없이 진행)합니다.
  - 두 파라미터 모두 기존 `offset`/`hasMore` 계산에 그대로 얹었습니다 — 새 코드 경로를 안 만들고 `limit`이 3번 항목의 `PAGE_SIZE` 자리를 대신하도록 했습니다.
- 화면: `hotPosts`를 `posts`에서 파생하는 `useMemo` 대신, 마운트 시 한 번 `GET /api/community/posts?sort=popular&window=7d&limit=3`을 직접 불러오는 상태로 바꿨습니다. 정렬/주제 탭을 바꿔도 이 사이드바는 영향받지 않습니다(원래도 그래야 맞습니다 — "이번 주 인기글"은 지금 보고 있는 필터와 무관한 정보입니다).
- Files: `src/app/api/community/posts/route.ts`(`limit`/`window` 파라미터 추가), `src/components/community-lounge.tsx`(`hotPosts`를 서버 조회로 교체).
- Validation: `npx vitest run` 970 passed(회귀 없음), `npx tsc --noEmit` clean, `npx eslint` 클린, `npx next build` 성공.
- Rollback: 이 커밋 revert. 되돌리면 사이드바가 다시 "지금 페이지 안에서 인기"로 돌아갑니다(깨지지 않음).
- 다음: 인수인계 문서 5번(비로그인 첨부 클릭 시 안내 없음)으로 이어갑니다.

## 2026-09-03 — Claude: 커뮤니티 인수인계 5번 — 비로그인으로 첨부 누르면 안내 없이 막히던 문제

- Agent/session: Claude(모바일 GitHub 앱 GUI 세션). 인수인계 문서 5번.
- Status: completed. 마이그레이션 없음.
- 확인한 것: 문서는 "`/community?attachment=login-required`로 리다이렉트하는데 그 파라미터를 읽는 코드가 없다"고 적었지만, 최신 main의 `attachments/[attachmentId]/route.ts`는 **리다이렉트 자체를 안 하고 있었습니다** — 비로그인 상태로는 `NextResponse.json({error:...}, {status:401})`을 그대로 돌려줬습니다. 첨부 링크는 `target="_blank"`라, 실제로는 **새 탭에 꾸미지 않은 JSON 오류 문구만 뜨는** 상태였습니다. 리다이렉트가 사라졌을 뿐 증상(안내 없이 막힘)은 문서와 같아 원래 의도대로 다시 만들었습니다.
- `attachments/[attachmentId]/route.ts`: 비로그인이면 `/community?attachment=login-required`로 리다이렉트하도록 되돌렸습니다.
- `src/app/community/page.tsx`: 서버 컴포넌트가 `searchParams`를 읽어(이 프로젝트의 다른 페이지들과 같은 `Promise<{...}>` 규칙) `attachment === "login-required"`를 `<CommunityLounge attachmentNotice>` prop으로 넘깁니다.
- `community-lounge.tsx`: 상단(topbar 바로 아래)에 배너를 추가했습니다 — "첨부파일은 로그인 후에 볼 수 있어요" + **로그인하기 버튼**(헤더의 `HeaderAccount`가 쓰는 것과 같은 Google OAuth를 이 컴포넌트에서 직접 부릅니다, 로그인 후 `/community`로 복귀) + 닫기 버튼. 새로고침해도 같은 배너가 또 뜨지 않도록, 배너를 띄운 즉시 `router.replace("/community")`로 주소의 표시만 지웁니다(보여줄지 말지를 결정하는 배너 상태는 마운트 시점 값만 쓰므로 안 사라집니다).
- 배너는 별도 클래스(`.loginNotice`)로 만들었고, 기존 `.safety`(작성 모달 경고 배너)와 같은 색 톤(주황 계열)을 써서 "주의가 필요한 안내"라는 시각 언어를 맞췄습니다.
- Files: `src/app/api/community/attachments/[attachmentId]/route.ts`, `src/app/community/page.tsx`, `src/components/community-lounge.tsx`, `src/components/community-lounge.module.css`(`.loginNotice` 추가 + 모바일 여백 보정).
- Validation: `npx vitest run` 970 passed(회귀 없음), `npx tsc --noEmit` clean, `npx eslint` 클린, `npx next build` 성공.
- Rollback: 이 커밋 revert. 되돌리면 다시 벌거벗은 401 JSON으로 돌아갑니다(깨지지 않음, 안내만 없어짐).
- 다음: 인수인계 문서 6번(첨부 용량을 브라우저가 자기 신고)으로 이어갑니다.

## 2026-09-04 — Claude: 커뮤니티 인수인계 6번 — 첨부 용량을 브라우저가 자기 신고하던 문제

- Agent/session: Claude(모바일 GitHub 앱 GUI 세션). 인수인계 문서 6번.
- Status: completed. 마이그레이션 없음.
- 문서가 지적한 "전체 24MB 검사를 브라우저 신고값으로 통과할 수 있다"는 총합 검사 자체가 최신 코드엔 이제 없습니다(항목 2에서 이미 확인한 대로 화면·서버 규칙이 이미지/PDF 구분 없이 파일당 8MB·최대 3개로 단순화됨). 다만 문서의 핵심 지적은 여전히 유효합니다 — **`community_attachments.byte_size`에 저장되는 값이 실제 업로드된 파일 크기가 아니라, 두 번째 요청(`POST /api/community/posts`)에서 브라우저가 스스로 적어 보내는 값**입니다. 업로드 라우트(`/api/community/uploads`)는 실제 파일을 8MB 아래로 이미 막아 두었지만, 그 확인이 이 두 번째 요청까지 이어지지는 않습니다.
- `posts/route.ts`에 `verifiedByteSize()`를 추가했습니다 — 첨부를 저장하기 직전에 그 `storagePath`가 실제로 스토리지에 올라간 객체의 크기를 `storage.list(폴더, {search: 파일명})`로 다시 확인하고, 신고값 대신 그 값을 저장합니다. 확인이 안 되면(네트워크 등 일시적 문제) 신고값을 그대로 씁니다 — 업로드 라우트가 이미 실제 파일을 막아 두었으므로 이건 침입을 막는 검사가 아니라 **기록용 숫자를 사실과 맞추는 것**이고, 확인 실패로 정상 첨부까지 거절할 이유는 없다고 판단했습니다.
- `byteSize`는 현재 화면 어디에도 표시되지 않습니다(첨부 링크는 파일명만 보여줌) — 지금 당장 사용자에게 보이는 영향은 없지만, DB에 남는 기록이 사실과 다른 채로 쌓이는 것 자체가 문제라 고쳤습니다. 나중에 이 값을 화면에 노출하거나 총 용량 집계에 쓰게 되면 그때부터는 실제로 신뢰할 수 있는 값이 이미 준비돼 있습니다.
- Files: `src/app/api/community/posts/route.ts`(`verifiedByteSize()` 추가, 첨부 insert 시 사용).
- Validation: `npx vitest run` 970 passed(회귀 없음, 이 라우트도 기존 관례대로 전용 테스트 없음), `npx tsc --noEmit` clean, `npx eslint` 클린, `npx next build` 성공.
- Rollback: 이 커밋 revert. 되돌리면 다시 신고값을 그대로 저장합니다(깨지지 않음, 기록 정확도만 낮아짐).
- 다음: 인수인계 문서 7번(주제 목록이 두 군데에 따로 있음)으로 이어갑니다.
