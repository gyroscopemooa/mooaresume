# MOOA Resume Development Checkpoint — 2026-08-20 (Claude session)

## Current state

- Branch `feature/original-annotations`, pushed to `origin`. Not merged to `main`, no PR opened yet.
- Latest commits: `86eb5b1` (bulk-revert state fix), `26bb5df` (originalAnnotations feature).
- `typecheck` / `test` (140 tests) / `eval` (8 tests) all green as of this checkpoint.
- Local dev flow (upload → 문항 세분화 or 전체 복붙 → 로그인 → 결제(Polar sandbox) → 분석 시작) verified working end-to-end via `dev.localhost:3000`.

## Completed

1. **QUICK submission-review feature** (`originalAnnotations`)
   - Stopped `highlightedPhrases` from failing whole QUICK analyses (deprecated, validation removed — was the cause of a past post-payment failure bug).
   - Added `originalAnnotations` (`good`/`delete`/`vague`/`revise`, tied to exact `start`/`end` spans in the submitted text via `locatePhraseInOriginal`/`resolveOriginalAnnotations` in `src/server/ai/quick/validator.ts`).
   - New "제출본" tab in `result-workspace-v2.tsx`: inline `<mark>` highlights on the original text + feedback cards.
2. **Bug fix**: `resume-intake.tsx` — "전체로 다시 입력" only reset the `view`, leaving the parent `questions` array at its prior multi-question shape (null target lengths). Now collapses to a single question via `onChange` too. This was the cause of "글자수 안 넣으면 다음 안 넘어가짐" when returning to bulk-paste from split view.
3. **Added a reset/새로 시작하기 button** on `/quick` (`resume-intake.tsx` had a dead `clearGuestDraft()` export that nothing called).
4. **Prompt calibration** (`src/server/ai/quick/prompt.ts`) for `delete` vs `revise` classification, grounded in `docs/analysis-consistency-and-rounded-editing-philosophy.md`:
   - `delete` should fire on real problems (과장, 근거 없는 주장, 논리 불일치, 질문 이탈, 반복, 공격적/장황한 표현) — not just "removable without meaning loss" (too passive, user pushed back on an earlier overcorrection).
   - Quoting a third party (교수/상사/동료 피드백) is not by itself a delete reason — only when there's no follow-through action, or the quote repeats.
5. Diagnosed (not yet fully fixed) two infra issues, see Remaining.

## Remaining

1. **Cloudflare Pages/Workers build command is wrong** — deploy log shows `npx wrangler versions upload` runs with no prior `opennextjs-cloudflare build` step, so `.open-next/worker.js` is missing and every push-triggered deploy fails. Needs a manual dashboard fix: Settings → Builds → **Build command** → `npx opennextjs-cloudflare build` (Deploy command `npx wrangler versions upload` is fine as-is). This is dashboard-only, can't be fixed via a repo commit. (Note: `docs/development-checkpoint-2026-08-17.md` recorded Build command as `None` with Deploy command `npm run deploy` — config has since been changed to the broken `wrangler versions upload`-only setup, presumably by another session.)
2. **Supabase Auth Redirect URLs** needed `http://dev.localhost:3000/**` (wildcard) added for local dev login to land back on `dev.localhost` instead of falling back to `Site URL` (which is now `https://mooaresume.com`, production). User added this and local login now works.
3. **Production Polar checkout** (`https://mooaresume.com` flow) still fails with "결제 요청 값이 올바르지 않습니다." (Zod validation error on `POST /api/checkouts/quick`) — root cause not confirmed. `NODE_ENV=production` hides the `issues` detail and this code path doesn't `console.error`, so it needs to be reproduced on **local** dev (where `issues` is returned in the response) to see the exact failing field. Not yet reproduced locally — deprioritized in favor of local testing per user's decision ("일단 후자는 신경 안 써도 될 듯 ... 어차피 로컬로 계속하는게 맞으니").
4. No PR opened yet for `feature/original-annotations` → `main`.
5. `git push` over HTTPS via Git Credential Manager (`manager-core`) hung twice (~2 min timeout, no visible popup) before succeeding on a third attempt with no visible prompt — likely a cached-credential race, not consistently reproducible. If it hangs again, the user needs to run the push themselves in a visible terminal (`! git push ...`) in case a GCM window needs interaction.

## Important configuration / findings

- `mooaresume.com` (root host, any environment) = public "Coming Soon" landing (`src/proxy.ts`, matcher `/`). `dev.<host>` rewrites root to the real in-development homepage (`/dev-home`). Sub-paths (`/quick`, `/result`, `/begin`, etc.) are unaffected by this and work the same regardless of the `dev.` prefix.
- Cross-origin dev asset loading: testing through a Cloudflare quick tunnel (`*.trycloudflare.com`) requires `allowedDevOrigins` in `next.config.ts`, otherwise Next.js dev blocks the JS chunks silently and the page loads but nothing is interactive. Not added to the repo (was going to be a temporary local-only change); add `allowedDevOrigins: ['*.trycloudflare.com']` if tunnel-based testing is needed again.
- QUICK pricing: base 4,900원, included 12,000 non-whitespace chars, +2,900원/7,000-char block beyond that. Model is `gpt-5.6-terra` ($2/1M input, $12/1M output as of the 2026-07-30 price cut). Rough cost per run: ~$0.04–$0.07 for a small single-question request, up to ~$0.15–$0.3 for a large multi-question request near the char limit with a validation retry. Either way, margin against 4,900원 (~$3.5) is large (~90%+) — no cost-driven pricing pressure right now.
- `AGENTS.md` at repo root gets auto-regenerated by `next dev` (see the file's own `<!-- BEGIN:nextjs-agent-rules -->` block) — it's expected/harmless to include in commits; deleting it just makes it reappear.
