# MOOA Resume Development Checkpoint — 2026-08-17

## Current state

- Cloudflare Workers + OpenNext deployment is live for `mooaresume`.
- Latest deployment trigger commit is `73820fd` on `main`.
- Workers Build configuration: Build command `None`; Deploy command `npm run deploy`.
- Production callback URL: `https://mooaresume.jeonmeensoo.workers.dev/auth/callback`.
- Polar webhook URL: `https://mooaresume.jeonmeensoo.workers.dev/api/webhooks/polar`.
- Supabase and Polar are still being tested; Polar remains Sandbox until validation is complete.

## Completed

- OpenNext build/deploy flow and Worker service naming fixed.
- Worker bundle reduced enough for deployment.
- `esbuild` added for OpenNext bundling.
- Supabase production URL configuration updated from localhost.
- Google Cloud OAuth Web Client created and Supabase Google Provider configured.

## Remaining

1. Add Google login button to `/analysis/prepare` while retaining Magic Link.
2. Preserve `next=/analysis/prepare` so auth returns to the original screen.
3. Restore only the previous commit's font configuration after inspecting `layout.tsx` and `globals.css`.
4. Re-test auth, Polar Sandbox checkout, webhook, and result access.
5. Configure custom SMTP before production auth-email use.

## Important configuration

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must be in Cloudflare Workers Builds → Build Variables and secrets → Production, followed by a fresh build/deploy.
- Runtime secrets (`OPENAI_API_KEY`, Polar credentials, Supabase service-role key) belong in Production Runtime Variables/Secrets and must not be `NEXT_PUBLIC_*`.
- Supabase default email sending is testing-only; configure custom SMTP for production.

## Blocker

- Workspace file access tooling has intermittently failed, so Google button and font restoration are not yet applied. Do not mark them complete until code changes and validation are performed.
