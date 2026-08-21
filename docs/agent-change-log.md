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
