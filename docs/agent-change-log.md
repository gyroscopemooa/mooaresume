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

### 참고 — 포트

- 사용자가 `:3000`(Codex 워크트리)에서 확인 중이었습니다. **거기에는 이 세션의 변경이 하나도 없습니다.** 확인은 `:3001`에서 해야 합니다.
