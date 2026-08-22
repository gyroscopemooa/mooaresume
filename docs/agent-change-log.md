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
