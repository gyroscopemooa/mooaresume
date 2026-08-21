# AGENTS.md — MOOA Resume

## Mission

Build the initial MOOA Resume product as a simple, reliable AI resume/cover-letter analysis service while preserving a clean path to future human expert review and university B2B.

Read `PROJECT_SPEC.md` before making architectural or product decisions.

## Priority

1. User privacy and security
2. Correctness and traceability
3. Simple MVP UX
4. Maintainable modular architecture
5. Future extensibility only where it does not increase current product complexity

## Product boundary

Implement current MVP features only.

Do NOT implement unless explicitly requested:
- expert marketplace
- expert chat
- bid/quote system
- payouts
- university admin system
- WebRTC
- video/avatar interviews
- facial-expression or gaze scoring
- success-probability scoring
- AI-detector features
- unrelated platform ideas

Future concepts may influence data-model boundaries, but they must not create unused production complexity.

## Architecture

- Next.js App Router
- strict TypeScript
- modular monolith
- Supabase PostgreSQL/Auth/Storage/RLS
- OpenAI Responses API
- Structured Outputs for machine-consumed AI results
- server-side secret handling
- no OpenAI or Supabase service-role secret in browser bundles

Keep domain logic out of React components and route handlers where practical.

Prefer:
`UI -> application/service layer -> domain/AI/data adapters`

## Domain language

Use these core concepts consistently:

- `ApplicationCase`: one job application/project
- `Document`: logical user document
- `DocumentVersion`: immutable version
- `SubmissionSnapshot`: exact document versions used for an analysis/review
- `AnalysisRun`: execution metadata
- `AnalysisResult`: structured AI output
- `Review`: conceptual parent for AI/human review; do not build human marketplace yet

Do not make “resume text” the root aggregate.

## User roles

Do not hardcode a single `user.role`.

Identity, reviewer capability, and organization membership must remain separate concepts.

## AI requirements

- Never invent candidate facts, achievements, metrics, employers, titles, responsibilities, dates, or credentials.
- If a fact is missing, return a request for clarification or mark it `needs_verification`.
- Distinguish:
  1. objective checks,
  2. qualitative AI judgments,
  3. unverifiable claims.
- Never present an employment success probability.
- Every qualitative score should have evidence/reasons.
- Store model, prompt version, rubric version, and schema version for each analysis run.
- Prefer typed Structured Outputs over free-form text parsing.
- Keep model names configurable.

## Data and privacy

- User documents are private by default.
- Enable RLS on user-data tables.
- Storage buckets holding resumes/applications must not be public.
- Only server code may use elevated credentials.
- Design future human review so reviewers see only explicitly shared Snapshot data.
- Avoid logging full resume contents unless required.
- Do not expose signed file URLs with long expiry times.

## Coding style

- TypeScript strict mode.
- Avoid `any`; if unavoidable, explain.
- Prefer small pure functions for scoring/normalization.
- Use Zod for external/input validation where appropriate.
- Do not duplicate schemas manually across layers if a shared typed schema can be used.
- Avoid premature abstractions and dependency-heavy patterns.
- Do not introduce a new package when the platform or existing dependencies already solve the need reasonably.

## Database

Use migrations for schema changes.

Before introducing a table:
- explain why it is required now,
- avoid future-only empty tables.

Use immutable document versions rather than overwriting historical content needed for analysis traceability.

## UI

- Korean-first
- mobile responsive
- professional employment-service aesthetic
- minimal visual clutter
- important top 3 actions/issues first
- progressive disclosure for detail
- no fake metrics
- no excessive decorative dashboards

## Testing

For each feature:
- test pure transformation/schema logic
- test authorization boundaries where practical
- validate AI result schema
- run lint/typecheck/tests before declaring completion

For AI prompts, prefer repeatable fixtures/evals over subjective “looks good” testing.

## Codex behavior

For planning/review tasks:
- inspect relevant files first,
- do not modify unless requested.

For implementation tasks:
- make in-scope local changes,
- run non-destructive validation,
- summarize changed files and decisions.

Ask before:
- destructive data operations,
- production deployment,
- paid external actions,
- secret/key rotation,
- deleting user data,
- materially expanding scope.

Do not ask for confirmation for normal local file edits, tests, lint, typecheck, or read-only inspection when implementation was requested.

## Cross-agent change preservation

These rules apply to Codex, Claude, Cursor agents, and any other coding agent working in this repository.

- Read `docs/agent-change-log.md` and inspect Git status/branches before editing overlapping code.
- Treat user work and another agent's committed or uncommitted implementation as protected. Do not delete, replace, rename, reshape, or silently "improve" it.
- Record every source, config, schema, prompt, UX, migration, deletion, rename, or behavior change in `docs/agent-change-log.md`, including agent, files, reason, validation, rollback reference, and status.
- If an alternative implementation is desired, keep the existing implementation intact and create a separate branch or clearly named mirror/variant. Present both to the user before integration.
- Obtain the user's explicit choice before replacing one variant with another, merging an alternative into the active path, or removing a protected variant.
- If an overlapping change is unavoidable for correctness or security, record the intended transformation first, preserve a recoverable Git reference, and explain the impact before proceeding.
- Never use a broad cherry-pick, merge, checkout, formatter, or generated rewrite that could overwrite another agent's work without first reviewing the exact diff.

## Git

Prefer small checkpoints.

Before a large refactor:
- inspect current state,
- explain intent,
- make focused changes,
- run validation.

Do not rewrite unrelated files.

## Living checkpoint

Treat `docs/development-checkpoint-2026-08-21.md` as the current living handoff document until it is explicitly replaced by a newer checkpoint file.

Whenever the user asks to save an intermediate state, record tomorrow's work, record the next task, pause for the day, or update the checkpoint:

- update the existing current checkpoint instead of only appending a new disconnected note,
- replace stale "next task" guidance with the latest priority,
- move newly completed work into the completed/current-state sections,
- keep remaining work, blockers, required user inputs, and important decisions current,
- update the checkpoint date and a short last-updated summary,
- preserve still-valid product decisions and remove or clearly mark superseded guidance,
- ensure another session can resume from the document without reconstructing the conversation.

If a new checkpoint file is created later, update this section to point to that file so there is always one unambiguous current handoff document.

## Source of truth

If instructions conflict:
1. security/privacy
2. `PROJECT_SPEC.md`
3. this `AGENTS.md`
4. current tested implementation
5. older brainstorming/context

If current official documentation proves a technical detail in the spec is stale, use the current official behavior and update the relevant documentation with the reason.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
