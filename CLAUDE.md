# Claude Project Instructions

Read and follow `AGENTS.md`, `MOOA_RESUME_PROJECT_SPEC.md`, and `docs/agent-change-log.md` before making changes.

## Shared-work preservation

- Existing Codex, Claude, user, and unknown-origin changes are protected, including uncommitted work.
- Do not delete, replace, rename, refactor, or silently transform another implementation.
- Log every source/config/schema/prompt/UX/migration change in `docs/agent-change-log.md` with the affected files, reason, validation, rollback reference, and status.
- Build alternatives on a separate branch or as a clearly named mirror/variant while leaving the current version intact.
- Ask the user to choose before integrating a variant or removing the previous version.
- Before editing overlapping files, inspect Git status, relevant branches, and the shared change log.
- If a security or correctness fix must overlap protected work, record the intended change first and preserve a recoverable Git reference.
