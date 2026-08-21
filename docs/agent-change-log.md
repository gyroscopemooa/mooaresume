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
